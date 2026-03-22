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

      if (onChainBalance > BigInt(0)) {
        // Sum previous deposits and sweeps for this address to avoid double-crediting.
        // If detect runs twice before a sweep, the on-chain balance hasn't changed,
        // so we subtract what we've already credited (minus what's been swept).
        const previousDeposits = await prisma.transaction.aggregate({
          where: {
            userId: deposit.userId,
            type: "deposit",
            description: { contains: deposit.address },
          },
          _sum: { amount: true },
        });

        const previousSweeps = await prisma.transaction.aggregate({
          where: {
            userId: deposit.userId,
            type: "sweep",
            description: { contains: deposit.address },
          },
          _sum: { amount: true },
        });

        const credited = parseUsdc(String(previousDeposits._sum.amount ?? "0"));
        const swept = parseUsdc(String(previousSweeps._sum.amount ?? "0"));
        // After a sweep, the on-chain balance resets to 0, so swept amounts
        // no longer count against what we've credited
        const alreadyCredited = credited - swept;
        const newAmount = onChainBalance - (alreadyCredited > BigInt(0) ? alreadyCredited : BigInt(0));

        if (newAmount > BigInt(0)) {
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
          });

          results.push({ userId: deposit.userId, amount, address: deposit.address });
        }
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

        await prisma.transaction.create({
          data: {
            userId: deposit.userId,
            type: "sweep",
            amount: formatUsdc(balance),
            txHash: receipt.hash,
            description: `Swept ${formatUsdc(balance)} USDC to treasury`,
          },
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
