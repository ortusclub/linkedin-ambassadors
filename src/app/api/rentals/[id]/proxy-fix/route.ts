import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { fixAccountProxy } from "@/lib/fix-account-proxy";
import { sendProxyEscalation } from "@/services/email";

// Renter taps "Proxy not working? Report it". We log the report, try an automatic swap, and
// return the result: "swapped" (renter now confirms it works) or "escalated" (team emailed).
// A restricted account is NOT a proxy problem — those go through the replacement flow.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const rental = await prisma.rental.findFirst({
      where: { id, userId: user.id },
      include: { linkedinAccount: { select: { id: true, linkedinName: true, restrictedAt: true, proxyHost: true, proxyPort: true } } },
    });
    if (!rental) return NextResponse.json({ error: "Rental not found" }, { status: 404 });
    if (!["active", "payment_failed"].includes(rental.status)) {
      return NextResponse.json({ error: "This rental isn't active." }, { status: 409 });
    }
    const acct = rental.linkedinAccount;
    if (acct.restrictedAt) {
      return NextResponse.json({ error: "This account is restricted — use Replace, not proxy fix." }, { status: 409 });
    }

    // Don't start a second swap while one is still open for this rental.
    const open = await prisma.proxySwap.findFirst({
      where: { rentalId: rental.id, status: { in: ["fixing", "swapped"] } },
      orderBy: { createdAt: "desc" },
    });
    if (open) {
      return NextResponse.json({ status: open.status, ticketRef: open.ticketRef });
    }

    const ticketRef = `LV-${Date.now().toString(36).toUpperCase()}`;
    const swap = await prisma.proxySwap.create({
      data: {
        rentalId: rental.id,
        linkedinAccountId: acct.id,
        userId: user.id,
        ticketRef,
        status: "fixing",
        oldProxyHost: acct.proxyHost,
        oldProxyPort: acct.proxyPort,
      },
    });

    const escalate = async (reason: string) => {
      await prisma.proxySwap.update({ where: { id: swap.id }, data: { status: "escalated", escalationReason: reason } });
      try { await sendProxyEscalation({ ticketRef, accountName: acct.linkedinName || "(account)", renterEmail: user.email, reason }); }
      catch (e) { console.error("proxy-fix: escalation email failed", ticketRef, e instanceof Error ? e.message : e); }
      return NextResponse.json({ status: "escalated", ticketRef, reason });
    };

    let result;
    try {
      result = await fixAccountProxy(rental.id);
    } catch (e) {
      console.error("proxy-fix: fixAccountProxy threw", rental.id, e instanceof Error ? e.message : e);
      return escalate("error");
    }

    if (result.outcome === "swapped") {
      await prisma.proxySwap.update({
        where: { id: swap.id },
        data: { status: "swapped", newProxyHost: result.newProxyHost, newProxyPort: result.newProxyPort },
      });
      return NextResponse.json({ status: "swapped", ticketRef });
    }

    return escalate(result.outcome === "no_proxy" ? "no_proxy_available" : "verify_failed");
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("proxy-fix error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
