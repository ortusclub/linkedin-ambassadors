import { prisma } from "@/lib/prisma";
import { ethers } from "ethers";
import { getBaseProvider, getUsdcContract, getUsdtContract, getChildWallet, getTreasuryAddress, getTreasuryWallet, formatUsdc, parseUsdc } from "@/lib/wallet";
import { sendTopUpNotification, sendTopUpConfirmation } from "@/services/email";

// Persist broadcast hashes so a timeout can be reconciled before any later credit/sweep.
const pendingPrefix = "Pending treasury sweep:";
async function reconcilePendingSweeps(assertActive: () => Promise<void>): Promise<Set<string>> {
  const pending = await prisma.transaction.findMany({ where: { type: "sweep", description: { startsWith: pendingPrefix } } });
  if (pending.length && (await getBaseProvider().getNetwork()).chainId !== BigInt(8453)) throw new Error("Deposit sweeps require Base mainnet");
  const blocked = new Set<string>();
  for (const entry of pending) {
    const [token, depositId] = (entry.description || "").slice(pendingPrefix.length).split(":");
    if (!depositId) continue;
    try {
      if (!entry.txHash) { blocked.add(depositId); continue; }
      const receipt = await getBaseProvider().getTransactionReceipt(entry.txHash);
      if (!receipt) { blocked.add(depositId); continue; }
      await assertActive();
      await prisma.$transaction(async tx => {
        await tx.transaction.update({ where: { id: entry.id }, data: { description: receipt.status === 1
          ? `Swept ${entry.amount} ${token} to treasury` : `Failed ${token} sweep (reverted)` } });
        if (receipt.status === 1 && token === "USDC") await tx.depositAddress.update({ where: { id: depositId }, data: { lastSeenBalance: 0 } });
      });
    } catch { blocked.add(depositId); }
  }
  return blocked;
}

export async function detectDeposits(assertActive: () => Promise<void> = async () => {}) {
  const blocked = await reconcilePendingSweeps(assertActive);
  const deposits = await prisma.depositAddress.findMany({
    include: { user: true },
  });

  const usdc = getUsdcContract(getBaseProvider());
  const results: { userId: string; amount: string; address: string }[] = [];

  for (const deposit of deposits) {
    if (blocked.has(deposit.id)) continue;
    try {
      const onChainBalance: bigint = await usdc.balanceOf(deposit.address);
      const lastSeen = parseUsdc(String(deposit.lastSeenBalance));

      // Only credit the difference between current on-chain balance and what we last saw
      if (onChainBalance > lastSeen) {
        const newAmount = onChainBalance - lastSeen;
        const amount = formatUsdc(newAmount);

        await assertActive();
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

export async function sweepDeposits(depositId?: string, onFailure?: (token: string) => void, assertActive: () => Promise<void> = async () => {}) {
  const blocked = await reconcilePendingSweeps(assertActive);
  const deposits = await prisma.depositAddress.findMany({ where: depositId ? { id: depositId } : undefined });
  const provider = getBaseProvider();
  const treasury = getTreasuryAddress();
  if (!process.env.TREASURY_WALLET_ADDRESS || !ethers.isAddress(treasury) || treasury === ethers.ZeroAddress) throw new Error("Configure the treasury destination before sweeping");
  const treasuryWallet = getTreasuryWallet();
  if (treasuryWallet.address.toLowerCase() !== treasury.toLowerCase()) throw new Error("Treasury signer does not match destination");
  const started = Date.now();
  const tokens = [
    { symbol: "USDC", contract: getUsdcContract, resetsLastSeen: true },
    { symbol: "USDT", contract: getUsdtContract, resetsLastSeen: false },
  ] as const;
  const results: { address: string; amount: string; txHash: string; token: string }[] = [];

  if ((await provider.getNetwork()).chainId !== BigInt(8453)) {
    throw new Error("Deposit sweeps require Base mainnet");
  }

  for (const deposit of deposits) {
    if (blocked.has(deposit.id)) { onFailure?.("pending transaction"); continue; }
    for (const token of tokens) {
      try {
        if (Date.now() - started > 120_000) return results;
        const balance: bigint = await token.contract(provider).balanceOf(deposit.address);

        if (balance > BigInt(0)) {
          // Never move USDC that the detector has not yet credited.
          if (token.resetsLastSeen && balance > parseUsdc(String(deposit.lastSeenBalance))) {
            throw new Error("USDC is awaiting deposit credit; retry after the scheduled check");
          }
          const [latestNonce, pendingNonce] = await Promise.all([provider.getTransactionCount(deposit.address, "latest"), provider.getTransactionCount(deposit.address, "pending")]);
          if (latestNonce !== pendingNonce) throw new Error("Deposit wallet has a pending transaction");
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
            const [latest, pending] = await Promise.all([provider.getTransactionCount(treasury, "latest"), provider.getTransactionCount(treasury, "pending")]);
            if (latest !== pending) throw new Error("Treasury has a pending transaction");
            await assertActive();
            const gasTx = await treasuryWallet.sendTransaction({
              to: deposit.address,
              value: SWEEP_GAS_AMOUNT - childEthBalance,
            });
            const gasReceipt = await gasTx.wait(1, 45_000);
            if (!gasReceipt || gasReceipt.status !== 1) throw new Error("Gas funding failed");
          }

          const tokenWithSigner = token.contract(childWallet);

          await assertActive();
          const tx = await tokenWithSigner.transfer(treasury, balance);
          const journal = await prisma.transaction.create({ data: {
            userId: deposit.userId, type: "sweep", amount: formatUsdc(balance), txHash: tx.hash,
            description: `${pendingPrefix}${token.symbol}:${deposit.id}`,
          } });
          const receipt = await tx.wait(1, 45_000);
          if (!receipt || receipt.status !== 1) throw new Error("Token sweep failed");

          await prisma.$transaction(async (tx) => {
            await tx.transaction.update({
              where: { id: journal.id },
              data: {
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
        onFailure?.(token.symbol);
        console.error(`Error sweeping ${token.symbol} at ${deposit.address}:`, error);
      }
    }
  }

  return results;
}
