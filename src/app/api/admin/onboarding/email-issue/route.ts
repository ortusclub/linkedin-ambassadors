import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { onboardingMailRequest } from "@/services/onboarding-mail";
import { onboardingEmailFrom } from "@/lib/onboarding-email-policy";

// Email the REFERRER (marketer) a guided fix for a common onboarding problem, so
// they can walk their ambassador through it. One button per issue on the pipeline.
// More issues will be added over time — add a new entry to ISSUES and a button.
export const dynamic = "force-dynamic";

type IssueKey = "email_not_primary" | "twofa_not_set" | "email_not_added";

// Each template is written to the referrer, about `${name}`, and includes the exact
// LinkedVelocity login email `${lvEmail}` so they know which address to work with.
const ISSUES: Record<IssueKey, { label: string; subject: (n: string) => string; body: (n: string, lv: string) => string }> = {
  email_not_added: {
    label: "LV email not added to the account",
    subject: (n) => `Action needed: add our email to ${n}'s LinkedIn`,
    body: (n, lv) =>
      `Hi,\n\nWe're setting up ${n}'s LinkedIn account on LinkedVelocity, but our email address doesn't seem to be on the account yet. Could you ask ${n} to add it? It only takes a minute:\n\n` +
      `1. Log in to LinkedIn and go to Settings & Privacy → Sign in & security → Email addresses.\n` +
      `2. Click "Add email address" and enter:  ${lv}\n` +
      `3. LinkedIn sends a confirmation link to that address — we receive it on our side and will confirm it (or forward it to you).\n` +
      `4. Once it's confirmed, please set it as the PRIMARY email (see next step below).\n\n` +
      `Reply to this email once it's added and we'll take it from there.\n\nThanks,\nThe LinkedVelocity team`,
  },
  email_not_primary: {
    label: "LV email not set as primary",
    subject: (n) => `Action needed: make our email primary on ${n}'s LinkedIn`,
    body: (n, lv) =>
      `Hi,\n\nOur email is on ${n}'s LinkedIn account, but it isn't set as the PRIMARY email yet — we need it to be primary so the account can be managed properly. Could you ask ${n} to switch it over?\n\n` +
      `1. Log in to LinkedIn → Settings & Privacy → Sign in & security → Email addresses.\n` +
      `2. Find  ${lv}  in the list (make sure it shows as "confirmed").\n` +
      `3. Click "Make primary" next to it.\n\n` +
      `That's it. Reply once it's done and we'll verify on our side.\n\nThanks,\nThe LinkedVelocity team`,
  },
  twofa_not_set: {
    label: "2FA not set up",
    subject: (n) => `Action needed: turn on 2FA for ${n}'s LinkedIn`,
    body: (n) =>
      `Hi,\n\nWe need two-step verification (2FA) turned on for ${n}'s LinkedIn account, using an authenticator app, and we need the secret key so we can generate codes on our side. Could you help ${n} set it up?\n\n` +
      `1. Log in to LinkedIn → Settings & Privacy → Sign in & security → Two-step verification → turn it ON.\n` +
      `2. Choose "Authenticator app".\n` +
      `3. When LinkedIn shows the QR code, tap "Can't scan the QR code?" (or "Enter key manually") to reveal the SECRET KEY — a long string of letters/numbers.\n` +
      `4. Send us that secret key (and the backup codes LinkedIn gives you). That's what we need — not a one-time 6-digit code.\n\n` +
      `Reply with the secret key and we'll finish the setup.\n\nThanks,\nThe LinkedVelocity team`,
  },
};

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { id, issue, loginEmail, ambassadorName, referrerSlug } = await req.json().catch(() => ({}));
    if (!id || typeof id !== "string") return NextResponse.json({ error: "application id is required" }, { status: 400 });
    if (!(issue in ISSUES)) return NextResponse.json({ error: "Unknown issue" }, { status: 400 });
    const tpl = ISSUES[issue as IssueKey];

    // Resolve the referrer email from the application's referredBy slug (authoritative —
    // don't trust a client-supplied recipient). Fall back to a passed slug.
    const app = await prisma.ambassadorApplication.findUnique({
      where: { id },
      select: { fullName: true, referredBy: true, outreachLog: true, onboardingFix: true },
    });
    if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });
    const slug = (app.referredBy || referrerSlug || "").trim();
    if (!slug) return NextResponse.json({ error: "This applicant has no referrer to email." }, { status: 400 });

    const referrer = await prisma.referrer.findFirst({
      where: { OR: [{ slug: { equals: slug, mode: "insensitive" } }, { name: { equals: slug, mode: "insensitive" } }] },
      select: { name: true, email: true, token: true },
    });
    if (!referrer?.email) {
      return NextResponse.json({ error: `Referrer "${slug}" has no email set — add one on the Referrals page first.` }, { status: 400 });
    }

    const name = (ambassadorName || app.fullName || "your ambassador").toString().trim();
    const lv = (loginEmail || "the LinkedVelocity email we gave you").toString().trim();
    const subject = tpl.subject(name);

    // Raise this as a fix on the referrer's portal so it appears there with an
    // "I've fixed it" button — clicking it flags the pipeline row for a recheck.
    // Map the email issue → the portal fix issue (merge, don't clobber other open ones).
    const FIX_FOR: Record<IssueKey, "email_added" | "email_primary" | "twofa"> = {
      email_not_added: "email_added",
      email_not_primary: "email_primary",
      twofa_not_set: "twofa",
    };
    const fixIssue = FIX_FOR[issue as IssueKey];
    const prevFix = app.onboardingFix as { issues?: string[]; raisedAt?: string } | null;
    const mergedIssues = Array.from(new Set([...(prevFix?.issues || []), fixIssue]));
    await prisma.ambassadorApplication.update({
      where: { id },
      data: { onboardingFix: { issues: mergedIssues, state: "open", raisedAt: prevFix?.raisedAt || new Date().toISOString() } },
    });

    // One-tap "done" link — opening it marks the fix as done and flags the account for
    // a re-check on our side, so the referrer doesn't have to log into the portal.
    const base = process.env.NEXT_PUBLIC_APP_URL || "https://linkedvelocity.com";
    const doneLink = `${base}/m/${referrer.token}/fixed?app=${id}`;
    const text =
      tpl.body(name, lv) +
      `\n\n— When it's done —\n` +
      `Once you've sorted it, just click here and we'll mark it as fixed and re-check the account for you:\n${doneLink}\n`;

    await onboardingMailRequest(
      "/emails",
      { from: onboardingEmailFrom(), to: [referrer.email], subject, text },
      `onboarding-issue-${id}-${issue}-${Date.now()}`,
    );

    // Log it to the outreach trail so the touch is visible on the pipeline row.
    const log = Array.isArray(app.outreachLog) ? (app.outreachLog as unknown[]) : [];
    await prisma.ambassadorApplication.update({
      where: { id },
      data: {
        outreachLog: [...log, { ch: "email", text: `Emailed referrer (${slug}) re: ${tpl.label}`, by: "Pipeline", at: new Date().toISOString() }] as unknown as object,
      },
    });

    return NextResponse.json({ ok: true, to: referrer.email, issueLabel: tpl.label });
  } catch (e) {
    if (e instanceof Error && (e.message === "Forbidden" || e.message === "Unauthorized")) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}
