import { prisma } from "@/lib/prisma";
import { getBaseProvider, getUsdcContract, getChildWallet, getTreasuryAddress, formatUsdc } from "@/lib/wallet";

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
        const amount = formatUsdc(onChainBalance);

        // Credit user balance
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
    } catch (error) {
      console.error(`Error checking deposit for ${deposit.address}:`, error);
    }
  }

  return results;
}

export async function sweepDeposits() {
  const deposits = await prisma.depositAddress.findMany();
  const usdc = getUsdcContract(getBaseProvider());
  const treasury = getTreasuryAddress();
  const results: { address: string; amount: string; txHash: string }[] = [];

  for (const deposit of deposits) {
    try {
      const balance: bigint = await usdc.balanceOf(deposit.address);

      if (balance > BigInt(0)) {
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
