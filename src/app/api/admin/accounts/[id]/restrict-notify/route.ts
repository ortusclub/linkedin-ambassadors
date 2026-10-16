import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto-creds";
import { accountIssueMessage } from "@/lib/account-issue-message";
import { includeIssueLoginDetails } from "@/lib/issue-login-details";
import { createAccountCodeLink } from "@/lib/account-code-link";
import { onboardingMailRequest } from "@/services/onboarding-mail";
import { formatName } from "@/lib/utils";

// Auto-notify the account owner + referrer when an account is marked restricted. Composes the
// same "restricted" payment-suspension message the manual Issue tool sends (login block + the
// per-account 2FA code link), emails whichever of the two has an email on file, logs each send
// into account notes, and dedupes on the current restriction timestamp so re-confirming the
// same restriction can't double-send. Credentials go out only when a password is saved.
const ACCOUNT_CODE_URL = "https://linkedvelocity.com/account-code";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const account = await prisma.linkedInAccount.findUnique({
      where: { id },
      select: { linkedinName: true, linkedinUrl: true, notes: true, loginEmail: true, accountPassword: true, personalEmail: true, twoFactorReceivedAt: true, restrictedAt: true, selfServiceOnboarding: { select: { applicationId: true } } },
    });
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    // Resolve the one linked application (same matching as the manual Issue email route).
    const owner = (account.notes || "").match(/Owner:\s*(\S+@\S+)/)?.[1]?.replace(/\.$/, "");
    const apps = await prisma.ambassadorApplication.findMany({ select: { id: true, email: true, linkedinUrl: true, referredBy: true } });
    const norm = (s: string | null) => (s || "").toLowerCase().replace(/^https?:\/\/(www\.)?/, "").split("?")[0].replace(/\/+$/, "");
    const matched = account.selfServiceOnboarding ? apps.filter(a => a.id === account.selfServiceOnboarding!.applicationId) : apps.filter(a => norm(account.linkedinUrl) && norm(a.linkedinUrl) === norm(account.linkedinUrl));
    const candidates = matched.length ? matched : apps.filter(a => owner && a.email.toLowerCase() === owner.toLowerCase());
    if (candidates.length !== 1) return NextResponse.json({ error: "A unique ambassador application must be linked before emailing." }, { status: 400 });
    const app = candidates[0];

    const ref = app.referredBy ? await prisma.referrer.findFirst({ where: { slug: { equals: app.referredBy, mode: "insensitive" } }, select: { email: true, name: true, contacts: true } }) : null;
    const refContacts = (Array.isArray(ref?.contacts) ? ref.contacts : []) as Array<{ method?: string; handle?: string }>;
    const referrerEmail = ref?.email || refContacts.find(c => c.method?.toLowerCase() === "email")?.handle || "";

    const name = formatName(account.linkedinName) || "the account owner";
    const referralPartner = ref?.name || null;
    const password = decryptSecret(account.accountPassword);
    const codeLink = await createAccountCodeLink(id).catch(() => "");
    const link = codeLink || ACCOUNT_CODE_URL;
    const stamp = account.restrictedAt ? new Date(account.restrictedAt).toISOString() : new Date().toISOString();

    const recipients: Array<{ recipient: "ambassador" | "referrer"; to: string }> = [];
    if (z.string().email().safeParse(app.email).success) recipients.push({ recipient: "ambassador", to: app.email });
    if (z.string().email().safeParse(referrerEmail).success) recipients.push({ recipient: "referrer", to: referrerEmail });

    const sent: Array<{ recipient: string; to: string }> = [];
    const skipped: Array<{ recipient: string; reason: string }> = [];
    if (!recipients.some(r => r.recipient === "ambassador")) skipped.push({ recipient: "ambassador", reason: "no owner email on file" });
    if (!recipients.some(r => r.recipient === "referrer")) skipped.push({ recipient: "referrer", reason: "no referrer email on file" });

    for (const { recipient, to } of recipients) {
      const base = accountIssueMessage(name, recipient, "restricted", "", account.linkedinUrl, referralPartner, { original: account.personalEmail, lv: account.loginEmail, twoFactorReceivedAt: account.twoFactorReceivedAt ? account.twoFactorReceivedAt.toISOString() : null });
      const text = (password && account.loginEmail)
        ? includeIssueLoginDetails(base.text, account.loginEmail, password, link, recipient === "referrer" ? name : undefined)
        : base.text.replaceAll(ACCOUNT_CODE_URL, link);
      await onboardingMailRequest("/emails", { from: process.env.RESEND_FROM_EMAIL || "LinkedVelocity <info@linkedvelocity.com>", reply_to: process.env.ADMIN_NOTIFICATION_EMAIL || "info@linkedvelocity.com", to: [to], subject: base.subject, text }, `restrict-notify-${id}-${recipient}-${stamp}`);
      const entry = `[${new Date().toISOString()}] Auto-notified ${recipient} (${to}) of restriction${password ? " with login details" : ""}: ${base.subject}.`;
      await prisma.$executeRaw`UPDATE linkedin_accounts SET notes = concat_ws(E'\n', nullif(notes, ''), ${entry}::text), updated_at = NOW() WHERE id = ${id}::uuid`;
      sent.push({ recipient, to });
    }

    return NextResponse.json({ ok: true, sent, skipped });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send notifications";
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500 });
  }
}
