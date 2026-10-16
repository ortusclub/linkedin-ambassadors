import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { offboardingLeft, type Offboarding, type SharedWithRenter } from "@/lib/offboarding";

// Drive the end-of-rental lockdown checklist. Actions: start (open it), shared (toggle what the
// renter had), tick (a manual lockdown step), close (finish — only when nothing's left).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const { action, key, on, done } = (await req.json()) as { action?: string; key?: string; on?: boolean; done?: boolean };
    const who = admin.fullName || admin.email;
    const now = new Date().toISOString();

    const acc = await prisma.linkedInAccount.findUnique({ where: { id }, select: { offboarding: true, proxyHost: true } });
    if (!acc) return NextResponse.json({ error: "not found" }, { status: 404 });
    const ob: Offboarding = { ...((acc.offboarding as Offboarding) || {}) };

    if (action === "start") {
      ob.open = true;
      ob.shared = { gologin: true, totp: false, password: false, workEmail: false, ...(ob.shared || {}) };
      ob.ticks = ob.ticks || {};
      ob.openedBy = who; ob.openedAt = now; ob.closedAt = null; ob.closedBy = null;
      // Mark the account as needing rotation while the lockdown is open (the Rotate flag).
      await prisma.linkedInAccount.update({ where: { id }, data: { offboarding: ob, twoFactorResetNeeded: true } });
    } else if (action === "shared") {
      if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });
      ob.shared = { ...(ob.shared || {}), [key as keyof SharedWithRenter]: !!on };
      await prisma.linkedInAccount.update({ where: { id }, data: { offboarding: ob } });
    } else if (action === "tick") {
      if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });
      ob.ticks = { ...(ob.ticks || {}), [key]: !!done };
      await prisma.linkedInAccount.update({ where: { id }, data: { offboarding: ob } });
    } else if (action === "close") {
      // Can only close when nothing's left (required manual done + auto conditions pass).
      const shareRows = await prisma.rental.findMany({ where: { linkedinAccountId: id }, select: { gologinShareIds: true, status: true, isShadow: true } });
      const gologinShared = shareRows.some((r) => Array.isArray(r.gologinShareIds) && (r.gologinShareIds as unknown[]).length > 0);
      const hasActiveRental = shareRows.some((r) => !r.isShadow && ["active", "pending_access", "payment_failed"].includes(r.status));
      const left = offboardingLeft({ gologinShared, hasActiveRental, proxyHost: acc.proxyHost }, ob);
      if (left > 0) return NextResponse.json({ error: `Finish ${left} more to close out` }, { status: 409 });
      // Close: clear the Rotate flag + the renter link, and reset the rental-ready manual ticks so
      // the next cycle starts clean. (Auto rental-ready items recompute on their own.)
      ob.open = false; ob.closedBy = who; ob.closedAt = now;
      await prisma.linkedInAccount.update({
        where: { id },
        data: { offboarding: ob, twoFactorResetNeeded: false, rentalReadyChecklist: {} },
      });
    } else {
      return NextResponse.json({ error: "unknown action" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const code = msg === "Forbidden" ? 403 : msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
