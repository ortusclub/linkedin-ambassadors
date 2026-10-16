import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDepositAddress } from "@/lib/wallet";
import { resolveViewUser } from "@/lib/view-as";

export async function GET(req: NextRequest) {
  try {
    const { user } = await resolveViewUser(req); // admin ?view_as=<id> sees the renter's deposit address (read-only)

    // Check if user already has a deposit address
    let deposit = await prisma.depositAddress.findUnique({
      where: { userId: user.id },
    });

    if (!deposit) {
      // Get next derivation index
      const last = await prisma.depositAddress.findFirst({
        orderBy: { derivationIndex: "desc" },
      });
      const nextIndex = last ? last.derivationIndex + 1 : 0;

      // Derive address from HD wallet
      const { address } = getDepositAddress(nextIndex);

      deposit = await prisma.depositAddress.create({
        data: {
          userId: user.id,
          address,
          derivationIndex: nextIndex,
        },
      });
    }

    return NextResponse.json({
      address: deposit.address,
      network: "Base",
      token: "USDC",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Deposit address error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
