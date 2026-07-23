import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { sendFastTrackInvite } from "@/services/email";
import { getCallMaps, pickCall } from "@/lib/calendar-calls";

// A few hours after signup, nudge ambassadors who aren't onboarded yet with the
// "skip the wait — send us your details" fast-track offer. Runs hourly; each person
// gets it once (fast_track_sent_at), only within a recent window so old dead leads
// aren't emailed. If they have a booked call, the copy references the date.

const HOUR = 60 * 60 * 1000;
const DELAY_HOURS = 3;      // wait this long after signup before nudging
const WINDOW_DAYS = 14;     // don't email signups older than this

function isAuthorized(req: NextRequest): boolean {
  if (req.headers.get("x-vercel-cron")) return true;
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

const firstNameOf = (full: string | null) => (full || "").trim().split(/\s+/)[0] || "";
const dateLabel = (iso: string) => new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

async function run(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);

  // Preview mode: send both variants to one address, write nothing. ?test=email@x
  const test = url.searchParams.get("test");
  if (test) {
    await sendFastTrackInvite(test, "Sample", dateLabel(new Date(Date.now() + 3 * 24 * HOUR).toISOString()));
    await sendFastTrackInvite(test, "Sample", null);
    return NextResponse.json({ ok: true, preview: true, sentTo: test, variants: ["with call date", "no call"] });
  }

  const now = Date.now();
  const eligible = await prisma.ambassadorApplication.findMany({
    where: {
      status: { notIn: ["onboarded", "rejected"] },
      // Already accepted = they've transferred their account (onboarded_at set),
      // even if their status field still lags at "approved". Never re-nudge those.
      onboardedAt: null,
      fastTrackSentAt: null,
      createdAt: { gte: new Date(now - WINDOW_DAYS * 24 * HOUR), lte: new Date(now - DELAY_HOURS * HOUR) },
    },
    select: { id: true, fullName: true, email: true, bookingEmail: true, outreachLog: true },
  });

  if (eligible.length === 0) return NextResponse.json({ ok: true, sent: 0, considered: 0 });

  const calls = await getCallMaps();
  let sent = 0;
  const failures: string[] = [];

  for (const a of eligible) {
    const { call, matchedEmail, viaName } = pickCall(calls, { email: a.email, bookingEmail: a.bookingEmail, fullName: a.fullName });
    const label = call && call.stage === "booked" && !call.cancelled && call.scheduledAt ? dateLabel(call.scheduledAt) : null;
    // Reach both inboxes when the booking email differs from the form email.
    const recipients = new Set<string>([a.email.toLowerCase()]);
    if (a.bookingEmail) recipients.add(a.bookingEmail.toLowerCase());
    if (matchedEmail) recipients.add(matchedEmail);
    try {
      await sendFastTrackInvite([...recipients], firstNameOf(a.fullName), label);
      // Log the touch on the card's outreach timeline + record a booking email
      // discovered by name-match so it's stored going forward.
      const touch = {
        ch: "email",
        text: `Fast-track setup invite emailed${label ? " (call booked)" : ""}`,
        by: "Auto",
        at: new Date().toISOString(),
      };
      const log = Array.isArray(a.outreachLog) ? (a.outreachLog as unknown[]) : [];
      const data: Prisma.AmbassadorApplicationUpdateInput = {
        fastTrackSentAt: new Date(),
        outreachLog: [...log, touch] as Prisma.InputJsonValue,
      };
      if (viaName && matchedEmail && !a.bookingEmail && matchedEmail !== a.email.toLowerCase()) data.bookingEmail = matchedEmail;
      await prisma.ambassadorApplication.update({ where: { id: a.id }, data });
      sent++;
    } catch (e) {
      failures.push(`${a.email}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({ ok: true, considered: eligible.length, sent, failures });
}

export async function GET(req: NextRequest) { return run(req); }
export async function POST(req: NextRequest) { return run(req); }
