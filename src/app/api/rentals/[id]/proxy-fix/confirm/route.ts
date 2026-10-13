import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { sendProxyEscalation } from "@/services/email";

// The renter answers "Is everything working?" after an automatic swap. Yes → close the case.
// No → escalate to the team (our automatic check can't tell if LinkedIn loads inside GoLogin,
// so the renter's answer is the real confirmation).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const { working } = await req.json();

    const rental = await prisma.rental.findFirst({
      where: { id, userId: user.id },
      include: { linkedinAccount: { select: { linkedinName: true } } },
    });
    if (!rental) return NextResponse.json({ error: "Rental not found" }, { status: 404 });

    const swap = await prisma.proxySwap.findFirst({
      where: { rentalId: rental.id, status: "swapped" },
      orderBy: { createdAt: "desc" },
    });
    if (!swap) return NextResponse.json({ error: "No swap awaiting confirmation." }, { status: 409 });

    if (working === true) {
      await prisma.proxySwap.update({ where: { id: swap.id }, data: { status: "confirmed", resolvedAt: new Date() } });
      return NextResponse.json({ status: "done", ticketRef: swap.ticketRef });
    }

    await prisma.proxySwap.update({ where: { id: swap.id }, data: { status: "escalated", escalationReason: "renter_still_broken" } });
    try { await sendProxyEscalation({ ticketRef: swap.ticketRef, accountName: rental.linkedinAccount.linkedinName || "(account)", renterEmail: user.email, reason: "renter_still_broken" }); }
    catch (e) { console.error("proxy-fix/confirm: escalation email failed", swap.ticketRef, e instanceof Error ? e.message : e); }
    return NextResponse.json({ status: "escalated", ticketRef: swap.ticketRef });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("proxy-fix/confirm error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
