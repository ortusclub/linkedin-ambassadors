import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { sendReengageNudge, sendReengageFollowup } from "@/services/email";

// Re-engage renter signups who created an account but never rented. Runs daily.
// Email 1 (nudge) goes out once, 1–90 days after signup; Email 2 (softer follow-up) 3 days
// after Email 1 if they still haven't rented. Both are one-way (noreply@). Stops the moment
// they rent anything. Each stage is tracked on the user (reengage_nudge_at / _followup_at).
//
// Targeting deliberately excludes non-renter signups the data can't cleanly separate:
//  - ambassadors (they exist in ambassador_applications by email)
//  - account owners (their email/name matches a linkedin_accounts row)
//  - test accounts, and telegram/placeholder emails
//  - a hardcoded SUPPRESS list for known edge cases the above can't catch — e.g. field
//    marketers (in `referrers`, which has no email to join on) and renters who signed up
//    a second time under a different email. Add to it as edge cases surface.

const DELAY_DAYS = 1;         // wait this long after signup before the first nudge
const WINDOW_DAYS = 90;       // don't nudge signups older than this
const FOLLOWUP_DAYS = 3;      // gap between nudge and follow-up

// Lowercase emails to never re-engage (marketers, duplicate-email renters, etc.).
const SUPPRESS = [
  "jhasmintonelada@yahoo.com",   // field marketer (Jhasmin)
  "will.rodosky@joincovent.com", // existing renter under a different email
];

function isAuthorized(req: NextRequest): boolean {
  if (req.headers.get("x-vercel-cron")) return true;
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

const firstNameOf = (full: string | null) => (full || "").trim().split(/\s+/)[0] || "";

type Row = { id: string; email: string; fullName: string | null };

// Shared eligibility: renter signup, not test, never rented, not an ambassador/owner, not suppressed.
const eligibleBase = Prisma.sql`
  u.role = 'customer' AND COALESCE(u.is_test, false) = false
  AND u.email NOT LIKE '%telegram.local' AND u.email NOT LIKE '%@renter.linkedvelocity.com'
  AND LOWER(u.email) NOT IN (${Prisma.join(SUPPRESS)})
  AND NOT EXISTS (SELECT 1 FROM rentals r WHERE r.user_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM ambassador_applications a WHERE LOWER(a.email) = LOWER(u.email))
  AND NOT EXISTS (
    SELECT 1 FROM linkedin_accounts la
    WHERE LOWER(COALESCE(la.login_email, '')) = LOWER(u.email)
       OR LOWER(COALESCE(la.work_email, '')) = LOWER(u.email)
       OR LOWER(COALESCE(la.linkedin_name, '')) = LOWER(u.full_name)
  )`;

async function run(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Preview: send both templates to one address, write nothing. ?test=email@x
  const test = new URL(req.url).searchParams.get("test");
  if (test) {
    await sendReengageNudge(test, "Sample");
    await sendReengageFollowup(test, "Sample");
    return NextResponse.json({ ok: true, preview: true, sentTo: test, variants: ["nudge", "followup"] });
  }

  const result = { nudged: 0, followedUp: 0, failures: [] as string[] };

  // Email 1 — nudge (once, DELAY_DAYS..WINDOW_DAYS after signup, still no rental).
  const nudgeTargets = await prisma.$queryRaw<Row[]>`
    SELECT u.id, u.email, u.full_name AS "fullName"
    FROM users u
    WHERE ${eligibleBase}
      AND u.reengage_nudge_at IS NULL
      AND u.created_at < now() - (${DELAY_DAYS} * INTERVAL '1 day')
      AND u.created_at > now() - (${WINDOW_DAYS} * INTERVAL '1 day')`;
  for (const u of nudgeTargets) {
    try {
      await sendReengageNudge(u.email, firstNameOf(u.fullName));
      await prisma.user.update({ where: { id: u.id }, data: { reengageNudgeAt: new Date() } });
      result.nudged++;
    } catch (e) {
      result.failures.push(`nudge ${u.email}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Email 2 — follow-up (FOLLOWUP_DAYS after the nudge, still no rental, not yet followed up).
  const followupTargets = await prisma.$queryRaw<Row[]>`
    SELECT u.id, u.email, u.full_name AS "fullName"
    FROM users u
    WHERE ${eligibleBase}
      AND u.reengage_nudge_at IS NOT NULL
      AND u.reengage_nudge_at < now() - (${FOLLOWUP_DAYS} * INTERVAL '1 day')
      AND u.reengage_followup_at IS NULL`;
  for (const u of followupTargets) {
    try {
      await sendReengageFollowup(u.email, firstNameOf(u.fullName));
      await prisma.user.update({ where: { id: u.id }, data: { reengageFollowupAt: new Date() } });
      result.followedUp++;
    } catch (e) {
      result.failures.push(`followup ${u.email}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({ ok: true, ...result, consideredNudge: nudgeTargets.length, consideredFollowup: followupTargets.length });
}

export async function GET(req: NextRequest) { return run(req); }
export async function POST(req: NextRequest) { return run(req); }
