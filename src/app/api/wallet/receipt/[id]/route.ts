import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { buildReceiptPdf } from "@/lib/receipt-pdf";

export const dynamic = "force-dynamic";

// PDF receipt for one of the customer's own credit top-ups.
export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await context.params;
    const t = await prisma.transaction.findFirst({
      where: { id, userId: user.id, type: "deposit" },
      select: { id: true, amount: true, txHash: true, createdAt: true },
    });
    if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const me = await prisma.user.findUnique({ where: { id: user.id }, select: { fullName: true, email: true } });

    const pdf = buildReceiptPdf({
      receiptNo: t.id.slice(0, 8).toUpperCase(),
      dateISO: t.createdAt.toISOString(),
      customerName: me?.fullName || "Customer",
      customerEmail: me?.email || "",
      amountUsd: `$${Number(t.amount).toFixed(2)}`,
      method: t.txHash ? "Crypto (USDC)" : "Card",
      reference: t.txHash || t.id,
    });

    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="LinkedVelocity-receipt-${t.id.slice(0, 8)}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
