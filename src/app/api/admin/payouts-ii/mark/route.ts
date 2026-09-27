import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { currencyConfigFor } from "@/lib/referral-currency";

// Record an ambassador payout as made. Payout history lives on the owner's
// ambassadorApplication (monthlyPayouts JSON + paidAt for the one-time setup
// fee), so this resolves the account's owner and appends to that ledger. The
// Payouts II page re-fetches after, so the row moves to Paid, last-payment date
// and total update, and the next due date advances. Admin-only.
export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const accountId: string = body.accountId;
    const kind: "setup" | "monthly" = body.kind === "setup" ? "setup" : "monthly";
    if (!accountId) return NextResponse.json({ error: "accountId required" }, { status: 400 });

    const account = await prisma.linkedInAccount.findUnique({
      where: { id: accountId },
      select: { notes: true, linkedinUrl: true, ambassadorPayment: true, status: true, restrictedAt: true, gologinShareLink: true, twoFactorResetNeeded: true },
    });
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    // Resolve the owner email (notes "Owner:" first, else match by LinkedIn URL).
    let ownerEmail = (account.notes || "").match(/Owner:\s*(\S+@\S+)/)?.[1]?.replace(/\.$/, "") || "";
    if (!ownerEmail && account.linkedinUrl) {
      const app = await prisma.ambassadorApplication.findFirst({
        where: { OR: [{ linkedinUrl: account.linkedinUrl }, { linkedinUrl: account.linkedinUrl.replace(/\/$/, "") }] },
        select: { email: true },
      });
      ownerEmail = app?.email || "";
    }
    if (!ownerEmail) return NextResponse.json({ error: "No ambassador owner on file for this account" }, { status: 400 });

    const app = await prisma.ambassadorApplication.findFirst({
      where: { email: { equals: ownerEmail, mode: "insensitive" } },
      select: { id: true, monthlyPayouts: true, paidAt: true, createdAt: true, diyTier: true, payoutCurrency: true, referredBy: true },
    });
    if (!app) return NextResponse.json({ error: "No ambassador application for owner" }, { status: 400 });

    const amount = kind === "setup" ? currencyConfigFor(app.payoutCurrency, app.referredBy, app).setupAmount : Number(account.ambassadorPayment || 0);
    const nowISO = new Date().toISOString();
    const entries = Array.isArray(app.monthlyPayouts) ? [...(app.monthlyPayouts as unknown[])] : [];
    entries.push({ kind, amount, paidAt: nowISO });

    await prisma.ambassadorApplication.update({
      where: { id: app.id },
      data: {
        monthlyPayouts: entries as never,
        ...(kind === "setup" && !app.paidAt ? { paidAt: new Date() } : {}),
      },
    });

    // Paying the setup fee releases the account into inventory: an under-construction
    // account that's otherwise ready (provisioned, not restricted, no 2FA reset) flips to
    // Available. If it isn't ready we don't move it — we tell the admin why instead.
    let movedToAvailable = false;
    let moveBlockedReason: string | null = null;
    if (kind === "setup" && account.status === "under_construction") {
      if (account.restrictedAt) moveBlockedReason = "it's currently restricted";
      else if (account.twoFactorResetNeeded) moveBlockedReason = "its 2FA still needs resetting";
      else if (!account.gologinShareLink) moveBlockedReason = "it has no GoLogin access link yet";
      else {
        await prisma.linkedInAccount.update({ where: { id: accountId }, data: { status: "available", listed: true } });
        movedToAvailable = true;
      }
    }

    return NextResponse.json({ ok: true, kind, amount, paidAt: nowISO, movedToAvailable, moveBlockedReason });
  } catch (error) {
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
