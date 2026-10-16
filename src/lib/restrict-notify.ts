import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto-creds";
import { accountIssueMessage } from "@/lib/account-issue-message";
import { includeIssueLoginDetails } from "@/lib/issue-login-details";
import { createAccountCodeLink } from "@/lib/account-code-link";
import { onboardingMailRequest } from "@/services/onboarding-mail";
import { formatName } from "@/lib/utils";

// Notify the account OWNER (ambassador) + REFERRER that an account was marked restricted.
// Composes the same "restricted" payment-suspension message the manual Issue tool sends
// (login block + per-account 2FA code link), emails whichever of the two has an email on
// file, and appends an "Auto-notified …" line to the account notes as the tracking record.
//
// Idempotent per open restriction: it skips a recipient already auto-notified since the
// account's current `restrictedAt`, so it is safe to call from every restrict path AND to
// re-run as a backfill without double-sending. Never throws — returns a result the caller
// can log; email failures must not break the restrict action that triggered this.
const ACCOUNT_CODE_URL = "https://linkedvelocity.com/account-code";
const SLACK_MS = 2 * 60 * 60 * 1000; // notes are stamped at send time, a bit after restrictedAt

export type RestrictNotifyResult = {
  ok: boolean;
  sent: Array<{ recipient: "ambassador" | "referrer"; to: string }>;
  skipped: Array<{ recipient: string; reason: string }>;
  error?: string;
};

// Has this role already been auto-notified for the current restriction? Looks for an
// "[<iso>] Auto-notified <role> …" notes line stamped on/after the open restriction began.
function alreadyNotified(notes: string, role: "ambassador" | "referrer", sinceMs: number): boolean {
  const re = new RegExp(`\\[([^\\]]+)\\]\\s*Auto-notified ${role} `, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(notes))) {
    const t = Date.parse(m[1]);
    if (!isNaN(t) && t >= sinceMs - SLACK_MS) return true;
  }
  return false;
}

export async function notifyRestrictionOwnerReferrer(id: string): Promise<RestrictNotifyResult> {
  const empty = { ok: false as const, sent: [], skipped: [] as RestrictNotifyResult["skipped"] };
  const account = await prisma.linkedInAccount.findUnique({
    where: { id },
    select: { linkedinName: true, linkedinUrl: true, notes: true, loginEmail: true, accountPassword: true, personalEmail: true, twoFactorReceivedAt: true, restrictedAt: true, selfServiceOnboarding: { select: { applicationId: true } } },
  });
  if (!account) return { ...empty, error: "Account not found" };
  if (!account.restrictedAt) return { ...empty, error: "Account is not currently restricted" };

  // Resolve the one linked application (same matching as the inventory/pipeline routes).
  const owner = (account.notes || "").match(/Owner:\s*(\S+@\S+)/)?.[1]?.replace(/\.$/, "");
  const apps = await prisma.ambassadorApplication.findMany({ select: { id: true, email: true, linkedinUrl: true, referredBy: true } });
  const norm = (s: string | null) => (s || "").toLowerCase().replace(/^https?:\/\/(www\.)?/, "").split("?")[0].replace(/\/+$/, "");
  const matched = account.selfServiceOnboarding ? apps.filter((a) => a.id === account.selfServiceOnboarding!.applicationId) : apps.filter((a) => norm(account.linkedinUrl) && norm(a.linkedinUrl) === norm(account.linkedinUrl));
  const candidates = matched.length ? matched : apps.filter((a) => owner && a.email.toLowerCase() === owner.toLowerCase());
  if (candidates.length !== 1) return { ...empty, error: "No unique linked application", skipped: [{ recipient: "both", reason: "no unique ambassador application linked" }] };
  const app = candidates[0];

  const ref = app.referredBy ? await prisma.referrer.findFirst({ where: { slug: { equals: app.referredBy, mode: "insensitive" } }, select: { email: true, name: true, contacts: true } }) : null;
  const refContacts = (Array.isArray(ref?.contacts) ? ref.contacts : []) as Array<{ method?: string; handle?: string }>;
  const referrerEmail = ref?.email || refContacts.find((c) => c.method?.toLowerCase() === "email")?.handle || "";

  const name = formatName(account.linkedinName) || "the account owner";
  const referralPartner = ref?.name || null;
  const password = decryptSecret(account.accountPassword);
  const codeLink = await createAccountCodeLink(id).catch(() => "");
  const link = codeLink || ACCOUNT_CODE_URL;
  const restrictedMs = new Date(account.restrictedAt).getTime();
  const stamp = new Date(account.restrictedAt).toISOString();
  const notes = account.notes || "";

  // Build the recipient set, dropping any already notified for THIS restriction.
  const recipients: Array<{ recipient: "ambassador" | "referrer"; to: string }> = [];
  const skipped: RestrictNotifyResult["skipped"] = [];
  if (z.string().email().safeParse(app.email).success) {
    if (alreadyNotified(notes, "ambassador", restrictedMs)) skipped.push({ recipient: "ambassador", reason: "already notified for this restriction" });
    else recipients.push({ recipient: "ambassador", to: app.email });
  } else {
    skipped.push({ recipient: "ambassador", reason: "no owner email on file" });
  }
  if (z.string().email().safeParse(referrerEmail).success) {
    if (alreadyNotified(notes, "referrer", restrictedMs)) skipped.push({ recipient: "referrer", reason: "already notified for this restriction" });
    else recipients.push({ recipient: "referrer", to: referrerEmail });
  } else {
    skipped.push({ recipient: "referrer", reason: "no referrer email on file" });
  }

  const sent: RestrictNotifyResult["sent"] = [];
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

  return { ok: true, sent, skipped };
}
