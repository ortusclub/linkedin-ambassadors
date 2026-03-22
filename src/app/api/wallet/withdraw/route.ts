import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";
import { getBaseProvider, getTreasuryWallet, getTreasuryAddress, getUsdcContract, parseUsdc, formatUsdc } from "@/lib/wallet";

const schema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address"),
  amount: z.string().refine((v) => parseFloat(v) > 0, "Amount must be positive"),
});

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { address, amount } = schema.parse(body);
    const withdrawAmount = parseFloat(amount);

    // Check balance
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { usdcBalance: true },
    });

    if (!userData || parseFloat(userData.usdcBalance.toString()) < withdrawAmount) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    // Check treasury has enough USDC and ETH for gas
    const treasuryWallet = getTreasuryWallet();
    const usdc = getUsdcContract(getBaseProvider());
    const treasuryUsdc: bigint = await usdc.balanceOf(getTreasuryAddress());
    const treasuryEth = await getBaseProvider().getBalance(getTreasuryAddress());

    if (treasuryUsdc < parseUsdc(amount)) {
      console.error(`[WITHDRAW] Insufficient treasury USDC. Has ${formatUsdc(treasuryUsdc)}, needs ${amount}`);
      return NextResponse.json({ error: "Withdrawals are temporarily unavailable. Please try again later." }, { status: 503 });
    }

    if (treasuryEth < BigInt(100000000000000)) { // 0.0001 ETH
      console.error(`[WITHDRAW] Insufficient treasury ETH for gas`);
      return NextResponse.json({ error: "Withdrawals are temporarily unavailable. Please try again later." }, { status: 503 });
    }

    // Send USDC on-chain from treasury to user's address
    const usdcWithSigner = getUsdcContract(treasuryWallet);
    const tx = await usdcWithSigner.transfer(address, parseUsdc(amount));
    const receipt = await tx.wait();

    // Deduct balance and record transaction with tx hash
    await prisma.$transaction(async (dbTx) => {
      await dbTx.user.update({
        where: { id: user.id },
        data: { usdcBalance: { decrement: withdrawAmount } },
      });

      await dbTx.transaction.create({
        data: {
          userId: user.id,
          type: "refund",
          amount: -withdrawAmount,
          txHash: receipt.hash,
          description: `Withdrawal of ${amount} USDC to ${address}`,
        },
      });
    });

    return NextResponse.json({ success: true, txHash: receipt.hash });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    console.error("Withdraw error:", error);
    return NextResponse.json({ error: "Failed to process withdrawal. Please try again." }, { status: 500 });
  }
}
