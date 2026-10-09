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
      const { loginEmail, accountPassword, accountAgeMonths, hasSalesNav, restrictionLog, ...account } = r.linkedinAccount;
      const ready = canShowRentalShareLink(r);
      const showCreds = credAccess && current.has(r.status);
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
        linkedinAccount: {
          ...account,
          gologinShareLink: ready ? account.gologinShareLink : null,
          accountEmail: loginEmail,
          accountPassword: showCreds ? decryptSecret(accountPassword) : undefined,
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
