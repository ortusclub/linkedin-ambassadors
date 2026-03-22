import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireAuth();
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        contactNumber: true,
        role: true,
        stripeCustomerId: true,
        paymentDetails: true,
        createdAt: true,
      },
    });

    // Get ambassador application for payment/bank details
    const ambassadorApp = await prisma.ambassadorApplication.findFirst({
      where: { email: user.email },
      orderBy: { updatedAt: "desc" },
      select: {
        paymentMethod: true,
        bankName: true,
        bankAccountName: true,
        bankAccountNumber: true,
        bankRoutingNumber: true,
        bankSortCode: true,
        usdcWalletAddress: true,
        usdcNetwork: true,
        paypalEmail: true,
        wiseEmail: true,
      },
    });

    return NextResponse.json({ user: fullUser, paymentDetails: ambassadorApp });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const { fullName, contactNumber } = body;

    const updateData: Record<string, string> = {};
    if (fullName !== undefined) updateData.fullName = fullName.trim();
    if (contactNumber !== undefined) updateData.contactNumber = contactNumber.trim() || null as unknown as string;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        contactNumber: true,
        role: true,
      },
    });

    return NextResponse.json({ user: updated });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
