import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

export const REMINDER_HOURS = [4, 24, 72, 168];
const HOUR = 60 * 60 * 1000;
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
export function onboardingReminderEmail(email: string, accountName: string) {
  const login = "https://linkedvelocity.com/login?redirect=%2Fdashboard%23shared-accounts";
  return {
    from: "LinkedVelocity <info@linkedvelocity.com>", to: email, replyTo: "info@linkedvelocity.com",
    subject: "Your account setup is saved — continue whenever you're ready",
    text: `Your setup for ${accountName} is saved. You can return and complete onboarding at any time.\n\nSign in to LinkedVelocity with ${email}: ${login}\n\nOn your dashboard, scroll down to Accounts I'm Renting Out. You'll see the accounts you're setting up there. Click Continue setup beside the account to return to the wizard and pick up where you left off.\n\nIf you were already signed in when you started, use that LinkedVelocity login email (shown above), even if the LinkedIn account has a different email.\n\nNeed help? Reply to this email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;line-height:1.6;color:#111827"><h2>Pick up where you left off</h2><p>Your setup for <strong>${escape(accountName)}</strong> is saved. You can return and complete onboarding at any time.</p><p>Sign in to LinkedVelocity with <strong>${escape(email)}</strong>.</p><p><a href="${login}" style="display:inline-block;background:#008f48;color:white;padding:12px 20px;border-radius:8px;text-decoration:none">Sign in and continue setup →</a></p><ol><li>Open your dashboard.</li><li>Scroll down to <strong>Accounts I'm Renting Out</strong> to see the accounts you're setting up.</li><li>Click <strong>Continue setup</strong> beside the account to reopen the wizard with your saved progress.</li></ol><p>If you were already signed in when you started, use that LinkedVelocity login email (shown above), even if the LinkedIn account has a different email.</p><p>Need help? Just reply to this email.</p></div>`,
  };
}

export async function sendOnboardingReminders(now = new Date()) {
  const key = (process.env.MEETING_SMTP_API_KEY || process.env.RESEND_API_KEY)?.trim();
  if (!key) throw new Error("Reminder email delivery is not configured");
  const eligible = {
    publicToken: { not: null }, state: { in: ["reserved", "needs_help", "ready"] },
    lastActivityAt: { lte: new Date(now.getTime() - 4 * HOUR) },
    createdAt: { gte: new Date(now.getTime() - 30 * 24 * HOUR) },
    OR: REMINDER_HOURS.map((hours, reminderCount) => ({ reminderCount, reminderSentAt: reminderCount === 0 ? null : { lte: new Date(now.getTime() - 20 * HOUR) }, lastActivityAt: { lte: new Date(now.getTime() - hours * HOUR) } })),
    application: { status: { in: ["pending", "reviewing", "approved", "onboarding"] as ("pending" | "reviewing" | "approved" | "onboarding")[] }, OR: [{ submittedBy: { is: null } }, { submittedBy: { is: { status: "active" as const, isTest: false } } }] },
  };
  const due = await prisma.selfServiceOnboarding.findMany({ where: { ...eligible, AND: [{ OR: [{ reminderClaimedAt: null }, { reminderClaimedAt: { lt: new Date(now.getTime() - HOUR) } }] }] }, select: { id: true, reminderCount: true }, orderBy: { lastActivityAt: "asc" }, take: 40 });
  const mailer = new Resend(key);
  const result = { sent: 0, failed: 0 };
  for (const { id, reminderCount } of due) {
    const claim = await prisma.selfServiceOnboarding.updateMany({ where: { id, ...eligible, reminderCount, AND: [{ OR: [{ reminderClaimedAt: null }, { reminderClaimedAt: { lt: new Date(now.getTime() - HOUR) } }] }] }, data: { reminderClaimedAt: now } });
    if (!claim.count) continue;
    try {
      // Recheck after claiming: a returning or completed session must not be nudged.
      const session = await prisma.selfServiceOnboarding.findFirst({ where: { id, ...eligible }, select: { email: true, application: { select: { fullName: true, submittedBy: { select: { email: true } } } } } });
      if (!session) { await prisma.selfServiceOnboarding.update({ where: { id }, data: { reminderClaimedAt: null } }); continue; }
      const email = session.application.submittedBy?.email || session.email;
      const response = await mailer.emails.send(onboardingReminderEmail(email, session.application.fullName), { idempotencyKey: `onboarding-reminder/${id}/${reminderCount}` });
      if (response.error || !response.data?.id) throw new Error("Reminder was not accepted");
      await prisma.selfServiceOnboarding.update({ where: { id }, data: { reminderSentAt: now, reminderCount: { increment: 1 }, reminderClaimedAt: null } });
      result.sent++;
    } catch { result.failed++; /* Keep the lease; a later run retries with the same provider idempotency key. */ }
  }
  return result;
}
