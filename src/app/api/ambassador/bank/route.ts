import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const bankSchema = z.object({
  applicationId: z.string().min(1),
  paymentMethod: z.enum(["usdc", "paypal", "wise"]),
  bankName: z.string().optional(),
  bankAccountName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankRoutingNumber: z.string().optional(),
  bankSortCode: z.string().optional(),
  usdcWalletAddress: z.string().optional(),
  usdcNetwork: z.string().optional(),
  paypalEmail: z.string().optional(),
  wiseEmail: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = bankSchema.parse(body);

    const application = await prisma.ambassadorApplication.findUnique({
      where: { id: data.applicationId },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    if (application.status !== "approved") {
      return NextResponse.json({ error: "Application is not approved" }, { status: 400 });
    }

    await prisma.ambassadorApplication.update({
      where: { id: data.applicationId },
      data: {
        paymentMethod: data.paymentMethod,
        bankName: data.bankName,
        bankAccountName: data.bankAccountName,
        bankAccountNumber: data.bankAccountNumber,
        bankRoutingNumber: data.bankRoutingNumber,
        bankSortCode: data.bankSortCode,
        usdcWalletAddress: data.usdcWalletAddress,
        usdcNetwork: data.usdcNetwork,
        paypalEmail: data.paypalEmail,
        wiseEmail: data.wiseEmail,
        status: "onboarded",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Bank details error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
