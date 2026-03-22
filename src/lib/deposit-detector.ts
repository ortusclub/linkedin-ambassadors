import { prisma } from "@/lib/prisma";
import { ethers } from "ethers";
import { getBaseProvider, getUsdcContract, getChildWallet, getTreasuryAddress, getTreasuryWallet, formatUsdc, parseUsdc } from "@/lib/wallet";

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
      }
    } catch (error) {
      console.error(`Error checking deposit for ${deposit.address}:`, error);
    }
  }

  return results;
}

// Minimum ETH needed in a child address to execute a USDC transfer
const SWEEP_GAS_AMOUNT = ethers.parseEther("0.0005");

export async function sweepDeposits() {
  const deposits = await prisma.depositAddress.findMany();
  const provider = getBaseProvider();
  const usdc = getUsdcContract(provider);
  const treasury = getTreasuryAddress();
  const treasuryWallet = getTreasuryWallet();
  const results: { address: string; amount: string; txHash: string }[] = [];

  for (const deposit of deposits) {
    try {
      const balance: bigint = await usdc.balanceOf(deposit.address);

      if (balance > BigInt(0)) {
        // Send gas ETH from treasury to child address if needed
        const childEthBalance = await provider.getBalance(deposit.address);
        if (childEthBalance < SWEEP_GAS_AMOUNT) {
          const gasTx = await treasuryWallet.sendTransaction({
            to: deposit.address,
            value: SWEEP_GAS_AMOUNT - childEthBalance,
          });
          await gasTx.wait();
        }

        const childWallet = getChildWallet(deposit.derivationIndex);
        const usdcWithSigner = getUsdcContract(childWallet);

        const tx = await usdcWithSigner.transfer(treasury, balance);
        const receipt = await tx.wait();

        await prisma.$transaction(async (tx) => {
          await tx.transaction.create({
            data: {
              userId: deposit.userId,
              type: "sweep",
              amount: formatUsdc(balance),
              txHash: receipt.hash,
              description: `Swept ${formatUsdc(balance)} USDC to treasury`,
            },
          });

          // Reset last seen balance since funds have been swept
          await tx.depositAddress.update({
            where: { id: deposit.id },
            data: { lastSeenBalance: 0 },
          });
        });

        results.push({
          address: deposit.address,
          amount: formatUsdc(balance),
          txHash: receipt.hash,
        });
      }
    } catch (error) {
      console.error(`Error sweeping ${deposit.address}:`, error);
    }
  }

  return results;
}
