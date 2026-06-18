import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { grantRentalAccess } from "@/lib/rental-access";
import { sendAccessReadyEmail } from "@/services/email";

// Auto-grant GoLogin access for paid-but-not-yet-active rentals (status
// "pending_access"). The share only works once the renter has set up GoLogin on
// their email, so we keep retrying on a schedule until it succeeds — then flip the
// rental to active and email them "you're live". No manual Grant click needed.
// Bounded by accessGrantAttempts so a renter who never sets up GoLogin doesn't loop
// forever (it then sits pending for manual handling). Manual Grant stays as override.
const MAX_ATTEMPTS = 48; // ~24h at a 30-min cadence

export async function POST(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pending = await prisma.rental.findMany({
    where: {
      status: "pending_access",
      paused: false,
      accessGrantAttempts: { lt: MAX_ATTEMPTS },
      linkedinAccount: { gologinProfileId: { not: null } },
    },
    include: {
      user: { select: { email: true } },
      linkedinAccount: { select: { linkedinName: true } },
    },
  });

  let granted = 0;
  let stillPending = 0;
  for (const r of pending) {
    await prisma.rental.update({ where: { id: r.id }, data: { accessGrantAttempts: { increment: 1 } } });
    try {
      await grantRentalAccess(r.id); // shares profile + sets status "active" + accessGrantedAt
      try { await sendAccessReadyEmail(r.user.email, r.linkedinAccount.linkedinName); } catch (e) { console.error("ready email", r.id, e); }
      granted++;
    } catch {
      // Renter hasn't set up GoLogin yet (or share not possible) — retry next run.
      stillPending++;
    }
  }

  return NextResponse.json({ ok: true, processed: pending.length, granted, stillPending });
}
