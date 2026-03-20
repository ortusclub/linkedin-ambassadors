import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const { paymentMethod, bankName, bankAccountName, bankAccountNumber, bankRoutingNumber, bankSortCode, usdcWalletAddress, usdcNetwork, paypalEmail, wiseEmail } = body;

    // Find the ambassador application for this user
    const app = await prisma.ambassadorApplication.findFirst({
      where: { email: user.email },
      orderBy: { updatedAt: "desc" },
    });

    if (!app) {
      return NextResponse.json({ error: "No ambassador application found" }, { status: 404 });
    }

    const updated = await prisma.ambassadorApplication.update({
      where: { id: app.id },
      data: {
        paymentMethod,
        bankName: bankName || null,
        bankAccountName: bankAccountName || null,
        bankAccountNumber: bankAccountNumber || null,
        bankRoutingNumber: bankRoutingNumber || null,
        bankSortCode: bankSortCode || null,
        usdcWalletAddress: usdcWalletAddress || null,
        usdcNetwork: usdcNetwork || null,
        paypalEmail: paypalEmail || null,
        wiseEmail: wiseEmail || null,
      },
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

    return NextResponse.json({ paymentDetails: updated });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
