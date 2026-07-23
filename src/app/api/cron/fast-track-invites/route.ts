import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendFastTrackInvite } from "@/services/email";
import { getCallsByEmail } from "@/lib/calendar-calls";

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
      fastTrackSentAt: null,
      createdAt: { gte: new Date(now - WINDOW_DAYS * 24 * HOUR), lte: new Date(now - DELAY_HOURS * HOUR) },
    },
    select: { id: true, fullName: true, email: true, bookingEmail: true },
  });

  if (eligible.length === 0) return NextResponse.json({ ok: true, sent: 0, considered: 0 });

  const calls = await getCallsByEmail();
  let sent = 0;
  const failures: string[] = [];

  for (const a of eligible) {
    const call = calls.get(a.email.toLowerCase()) || (a.bookingEmail ? calls.get(a.bookingEmail.toLowerCase()) : null);
    const label = call && call.stage === "booked" && !call.cancelled && call.scheduledAt ? dateLabel(call.scheduledAt) : null;
    try {
      await sendFastTrackInvite(a.email, firstNameOf(a.fullName), label);
      await prisma.ambassadorApplication.update({ where: { id: a.id }, data: { fastTrackSentAt: new Date() } });
      sent++;
    } catch (e) {
      failures.push(`${a.email}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({ ok: true, considered: eligible.length, sent, failures });
}

export async function GET(req: NextRequest) { return run(req); }
export async function POST(req: NextRequest) { return run(req); }
