import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canShowRentalShareLink } from "@/lib/rental-dashboard-access";
import { requireAuth } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto-creds";
import { monthlyRentalPrice } from "@/lib/account-pricing";

export async function GET() {
  try {
    const user = await requireAuth();

    const rentals = await prisma.rental.findMany({
      where: { userId: user.id },
      include: {
        linkedinAccount: {
          select: {
            id: true,
            linkedinName: true,
            linkedinHeadline: true,
            linkedinUrl: true,
            loginEmail: true,
            accountPassword: true,
            twoFactor: true,
            profilePhotoUrl: true,
            connectionCount: true,
            linkedinVerified: true,
            accountAgeMonths: true,
            hasSalesNav: true,
            gologinShareLink: true,
            restrictedAt: true,
            permanentlyRestricted: true,
            restrictionLog: true,
            twoFactorResetNeeded: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Open proxy-fix cases (renter self-serve): surface the latest unresolved swap per rental
    // so the dashboard can show the confirm step (status "swapped") or the escalation card
    // (status "escalated"). Resolved/confirmed cases aren't surfaced. Proxy creds never leave here.
    const openSwaps = await prisma.proxySwap.findMany({
      where: { userId: user.id, status: { in: ["swapped", "escalated"] } },
      orderBy: { createdAt: "desc" },
      select: { rentalId: true, status: true, ticketRef: true, createdAt: true },
    });
    const swapByRental = new Map<string, { status: string; ticketRef: string; openedAt: string }>();
    for (const s of openSwaps) {
      if (!swapByRental.has(s.rentalId)) swapByRental.set(s.rentalId, { status: s.status, ticketRef: s.ticketRef, openedAt: s.createdAt.toISOString() });
    }

    // Show a "recovered" note on the dashboard only while it's still fresh, then let it fade.
    const RECOVERY_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

    // Tiered credential access: a renter flagged with credentialAccess also gets the login
    // password (and a live 2FA code via /api/rentals/[id]/signin-code) for every account they
    // rent. Default OFF — the password never leaves the server for a normal renter.
    const credAccess = user.credentialAccess === true;

    // Renter-facing: surface the sign-in email as accountEmail (loginEmail is the
    // address we log into the account with), and drop the raw field name. The password is
    // pulled out of the spread so it is only ever added back for a credential-access renter.
    // Only hand back the password for accounts they CURRENTLY rent — never for an expired or
    // cancelled rental still in the list.
    const current = new Set(["active", "pending_access", "payment_failed"]);
    const shaped = rentals.map((r) => {
      const { loginEmail, accountPassword, twoFactor, accountAgeMonths, hasSalesNav, restrictionLog, ...account } = r.linkedinAccount;
      const ready = canShowRentalShareLink(r);
      const showCreds = credAccess && current.has(r.status);
      // The 2FA secret key (TOTP seed) — e.g. to paste into HeyReach so it can answer LinkedIn's
      // 2-step checks itself. Only exposed to credential-access renters, and only if it's a
      // usable base32 seed (same validity check as the live-code route).
      const seed = (decryptSecret(twoFactor) || "").replace(/\s/g, "");
      const twoFactorSecret = showCreds && /^[A-Z2-7]{16,}={0,6}$/i.test(seed) ? seed : undefined;
      // What the renter actually pays: their locked rate, else the account's current tier price.
      const price = Number(
        r.lockedPrice ?? monthlyRentalPrice({ connectionCount: account.connectionCount, accountAgeMonths, hasSalesNav, linkedinVerified: account.linkedinVerified })
      );
      // Recently recovered from a restriction (and not restricted now): surface a short note
      // that explains the credited (pushed-out) renewal date. Fades after RECOVERY_WINDOW_MS.
      let recovery: { at: string; creditedDays: number } | null = null;
      if (!account.restrictedAt && Array.isArray(restrictionLog)) {
        const log = restrictionLog as Array<{ at?: string; event?: string; creditedDays?: number }>;
        const rec = [...log].reverse().find((e) => e?.event === "recovered" && e?.at);
        if (rec?.at && Date.now() - new Date(rec.at).getTime() <= RECOVERY_WINDOW_MS) {
          recovery = { at: rec.at, creditedDays: typeof rec.creditedDays === "number" ? rec.creditedDays : 0 };
        }
      }
      return {
        ...r,
        gologinShareIds: undefined,
        gologinShareLinkId: undefined,
        gologinShareLinkUrl: ready ? r.gologinShareLinkUrl : null,
        credentialAccess: showCreds,
        price,
        recovery,
        proxyFix: swapByRental.get(r.id) ?? null,
        linkedinAccount: {
          ...account,
          gologinShareLink: ready ? account.gologinShareLink : null,
          accountEmail: loginEmail,
          accountPassword: showCreds ? decryptSecret(accountPassword) : undefined,
          twoFactorSecret,
        },
      };
    });

    return NextResponse.json({ rentals: shaped });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
