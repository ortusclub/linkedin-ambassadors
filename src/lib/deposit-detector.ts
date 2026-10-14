import { prisma } from "@/lib/prisma";
import { ethers } from "ethers";
import { getBaseProvider, getUsdcContract, getUsdtContract, getChildWallet, getTreasuryAddress, getTreasuryWallet, formatUsdc, parseUsdc } from "@/lib/wallet";
import { sendTopUpNotification, sendTopUpConfirmation } from "@/services/email";

export async function detectDeposits() {
  const deposits = await prisma.depositAddress.findMany({
    include: { user: true },
  });

  const usdc = getUsdcContract(getBaseProvider());
  const results: { userId: string; amount: string; address: string }[] = [];

  for (const deposit of deposits) {
    try {
      const onChainBalance: bigint = await usdc.balanceOf(deposit.address);
      const lastSeen = parseUsdc(String(deposit.lastSeenBalance));

      // Only credit the difference between current on-chain balance and what we last saw
      if (onChainBalance > lastSeen) {
        const newAmount = onChainBalance - lastSeen;
        const amount = formatUsdc(newAmount);

        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: deposit.userId },
            data: { usdcBalance: { increment: amount } },
          });

          await tx.transaction.create({
            data: {
              userId: deposit.userId,
              type: "deposit",
              amount: amount,
              description: `USDC deposit detected at ${deposit.address}`,
            },
          });

          // Update last seen balance to current on-chain balance
          await tx.depositAddress.update({
            where: { id: deposit.id },
            data: { lastSeenBalance: formatUsdc(onChainBalance) },
          });
        });

        results.push({ userId: deposit.userId, amount, address: deposit.address });

        // Confirm to the customer (non-blocking)
        try {
          await sendTopUpConfirmation({
            email: deposit.user.email,
            amount,
            method: "crypto",
          });
        } catch (e) {
          console.error("Failed to send top-up confirmation:", e);
        }

        // Notify admin of the new crypto top-up (non-blocking)
        try {
          await sendTopUpNotification({
            customerEmail: deposit.user.email,
            customerName: deposit.user.fullName,
            amount,
            method: "crypto",
          });
        } catch (e) {
          console.error("Failed to send top-up notification:", e);
        }
      }
    } catch (error) {
      console.error(`Error checking deposit for ${deposit.address}:`, error);
    }
  }

  return results;
}

// Minimum ETH needed in a child address to execute a token transfer
const SWEEP_GAS_AMOUNT = ethers.parseEther("0.0005");

export async function sweepDeposits() {
  const deposits = await prisma.depositAddress.findMany();
  const provider = getBaseProvider();
  const treasury = getTreasuryAddress();
  const treasuryWallet = getTreasuryWallet();
  const tokens = [
    { symbol: "USDC", contract: getUsdcContract, resetsLastSeen: true },
    { symbol: "USDT", contract: getUsdtContract, resetsLastSeen: false },
  ] as const;
  const results: { address: string; amount: string; txHash: string; token: string }[] = [];

  if ((await provider.getNetwork()).chainId !== BigInt(8453)) {
    throw new Error("Deposit sweeps require Base mainnet");
  }

  for (const deposit of deposits) {
    for (const token of tokens) {
      try {
        const balance: bigint = await token.contract(provider).balanceOf(deposit.address);

        if (balance > BigInt(0)) {
          const childWallet = getChildWallet(deposit.derivationIndex);
          if (childWallet.address.toLowerCase() !== deposit.address.toLowerCase()) {
            throw new Error("Derived wallet does not match deposit address");
          }
          if (treasury.toLowerCase() === deposit.address.toLowerCase()) {
            throw new Error("Cannot sweep a deposit to itself");
          }

          // Send gas ETH from treasury to child address if needed
          const childEthBalance = await provider.getBalance(deposit.address);
          if (childEthBalance < SWEEP_GAS_AMOUNT) {
            const gasTx = await treasuryWallet.sendTransaction({
              to: deposit.address,
              value: SWEEP_GAS_AMOUNT - childEthBalance,
            });
            const gasReceipt = await gasTx.wait();
            if (!gasReceipt || gasReceipt.status !== 1) throw new Error("Gas funding failed");
          }

          const tokenWithSigner = token.contract(childWallet);

          const tx = await tokenWithSigner.transfer(treasury, balance);
          const receipt = await tx.wait();
          if (!receipt || receipt.status !== 1) throw new Error("Token sweep failed");

          await prisma.$transaction(async (tx) => {
            await tx.transaction.create({
              data: {
                userId: deposit.userId,
                type: "sweep",
                amount: formatUsdc(balance),
                txHash: receipt.hash,
                description: `Swept ${formatUsdc(balance)} ${token.symbol} to treasury`,
              },
            });

            // This tracker belongs exclusively to the USDC deposit detector.
            if (token.resetsLastSeen) {
              await tx.depositAddress.update({
                where: { id: deposit.id },
                data: { lastSeenBalance: 0 },
              });
            }
          });

          results.push({
            address: deposit.address,
            amount: formatUsdc(balance),
            txHash: receipt.hash,
            token: token.symbol,
          });
        }
      } catch (error) {
        console.error(`Error sweeping ${token.symbol} at ${deposit.address}:`, error);
      }
    }
  }

  return results;
}
