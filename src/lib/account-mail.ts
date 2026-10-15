import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { onboardingMailRequest } from "@/services/onboarding-mail";
import { emailSetupConfig, linkedinSender, forwardedText } from "@/lib/onboarding-email-policy";

// Mirrors the (unexported) shape used by forwardOnboardingEmail in lib/onboarding-email.ts.
const incomingEmail = z.object({
  id: z.string(),
  from: z.string(),
  to: z.array(z.string()),
  created_at: z.string(),
  subject: z.string(),
  text: z.string().nullable(),
  html: z.string().nullable(),
});

export type MailType =
  | "new_login" | "location_change" | "password_changed" | "email_changed"
  | "name_changed" | "photo_changed" | "restriction" | "email_verify" | "other";
export type MailSeverity = "benign" | "review" | "danger";

const has = (s: string, re: RegExp) => re.test(s);

// Classify a captured LinkedIn security email by subject (+ body as a tiebreaker). No "our
// actions" log exists, so severity is a pure type heuristic: benign = log only, review = needs a
// look, danger = restriction/takeover. "New sign-in" is benign UNLESS it signals a new
// device/location, which bumps it to review.
//
// Returns null when the subject isn't a recognised account-security event. LinkedIn sends a flood
// of non-security mail from the same linkedin.com domain (invitations, messages, job alerts,
// digests, "people you may know") — those must NOT be logged here. Capture only trusts this
// classifier or a dedicated security sender (see isSecuritySender), never "from linkedin.com".
export function classifyAccountMail(subject: string, body: string): { type: MailType; severity: MailSeverity; location?: string } | null {
  const s = (subject || "").toLowerCase();
  const b = (body || "").toLowerCase();
  const location = extractLocation(body);
  const newPlace = has(s, /new (device|location|place)/) || has(b, /new (device|location|place)|didn.?t recognize|don.?t recognize|was this you/);

  if (has(s, /restrict|account (has been|was) (restricted|suspended)|we.?ve restricted|temporarily restricted|unusual activity on your account/)) return { type: "restriction", severity: "danger", location };
  if (has(s, /password (was|has been)? ?(changed|reset|updated)|you changed your password|reset your password/)) return { type: "password_changed", severity: "review", location };
  if (has(s, /email address (was|has been)? ?(changed|added|updated)|you (added|changed) (a new )?email|primary email/)) return { type: "email_changed", severity: "review", location };
  if (has(s, /confirm your email|verify your email|email verification|confirm this email|please verify it.?s you|verification code|security code|one-?time (code|pin)/)) return { type: "email_verify", severity: "benign", location };
  // Sign-in alerts: only the account-security phrasing, so notification mail ("…just signed in to
  // post") can't trip it.
  if (has(s, /new sign-?in|new sign in to|a new sign|signed in to your (linkedin )?account|we noticed a (new )?(login|sign-?in)|recent login to your account/)) return { type: newPlace ? "location_change" : "new_login", severity: newPlace ? "review" : "benign", location };
  if (has(s, /signing in from a new|signed in from a new (device|location|place)/)) return { type: "location_change", severity: "review", location };
  if (has(s, /you changed your name|your name (was|has been) (changed|updated)/)) return { type: "name_changed", severity: "benign", location };
  if (has(s, /you changed your (profile )?photo|your profile photo (was|has been)|new profile picture/)) return { type: "photo_changed", severity: "benign", location };
  return null;
}

// True when the sender is LinkedIn's dedicated account-security channel (security-noreply@ and the
// like). Mail from here is always worth logging even if the subject doesn't match a known pattern.
export function isSecuritySender(from: string): boolean {
  const address = (from.match(/<([^<>]+)>\s*$/)?.[1] || from).trim().toLowerCase();
  const [local, domain] = address.split("@");
  if (!/^(?:[a-z0-9-]+\.)*linkedin\.com$/.test(domain || "")) return false;
  return /(?:^|[.-])(account-)?security(-noreply)?$|^password-noreply$/.test(local || "");
}

// Best-effort location label from a LinkedIn sign-in email body (e.g. "Location: Lagos, NG").
function extractLocation(body: string): string | undefined {
  const m = body.match(/location[:\s]+([A-Z][A-Za-z .'-]+(?:,\s*[A-Za-z .'-]+){0,2})/)
    || body.match(/\bnear\s+([A-Z][A-Za-z .'-]+(?:,\s*[A-Za-z .'-]+){1,2})/);
  return m ? m[1].trim().replace(/\s+/g, " ").slice(0, 80) : undefined;
}

// Resolve an inbound recipient address to the LinkedInAccount it belongs to. The account's
// loginEmail IS the address LinkedIn mails; fall back to the onboarding email-setup → session.
async function resolveAccountId(toAddr: string): Promise<string | null> {
  const byLogin = await prisma.linkedInAccount.findFirst({
    where: { loginEmail: { equals: toAddr, mode: "insensitive" } },
    select: { id: true },
  });
  if (byLogin) return byLogin.id;
  const setup = await prisma.onboardingEmailSetup.findUnique({
    where: { address: toAddr },
    select: { session: { select: { accountId: true } } },
  });
  return setup?.session?.accountId ?? null;
}

// Capture one inbound LinkedIn email as an AccountMailEvent. Additive + idempotent: deduped by
// emailId, no-ops when the recipient isn't one of our account addresses or isn't from LinkedIn.
// Never throws to the caller's critical path — the webhook wraps it in try/catch anyway.
export async function captureAccountMail(emailId: string): Promise<{ stored: boolean; reason?: string }> {
  const cfg = emailSetupConfig();
  if (!cfg.ready) return { stored: false, reason: "not_ready" };

  const existing = await prisma.accountMailEvent.findUnique({ where: { emailId }, select: { id: true } });
  if (existing) return { stored: false, reason: "duplicate" };

  const msg = incomingEmail.parse(await onboardingMailRequest(`/emails/receiving/${encodeURIComponent(emailId)}`));
  if (msg.to.length !== 1) return { stored: false, reason: "fanout" };
  const toAddr = msg.to[0].trim().toLowerCase();
  const domain = toAddr.split("@")[1] || "";
  if (!cfg.domains.includes(domain)) return { stored: false, reason: "foreign_domain" };
  if (!linkedinSender(msg.from)) return { stored: false, reason: "not_linkedin" };

  const accountId = await resolveAccountId(toAddr);
  if (!accountId) return { stored: false, reason: "no_account" };

  const bodyText = forwardedText(msg.text, msg.html);
  // Log only genuine account-security mail: a recognised security subject, or anything from the
  // dedicated security sender. Everything else from linkedin.com (invitations, messages, job
  // alerts, digests) is skipped so the log stays signal, not an inbox mirror.
  const cls = classifyAccountMail(msg.subject, bodyText);
  if (!cls && !isSecuritySender(msg.from)) return { stored: false, reason: "not_security" };
  const { type, severity, location } = cls ?? { type: "other" as MailType, severity: "review" as MailSeverity, location: extractLocation(bodyText) };
  const status = severity === "benign" ? "logged" : "needs_review";

  await prisma.accountMailEvent.create({
    data: {
      emailId,
      linkedinAccountId: accountId,
      receivedAt: new Date(msg.created_at),
      fromAddr: msg.from.slice(0, 320),
      toAddr,
      subject: (msg.subject || "").slice(0, 500),
      bodyText,
      type,
      severity,
      status,
      locationLabel: location ?? null,
    },
  });
  return { stored: true };
}
