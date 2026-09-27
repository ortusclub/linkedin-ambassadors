// The public guide accepts only an existing owner email. No arbitrary forwarding target.
export const normalizeProfile = (s: string | null) => (s || "").trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, "").split("?")[0].replace(/\/+$/, "");
type Account = { id: string; loginEmail: string | null; personalEmail: string | null; linkedinUrl: string | null; notes: string | null; selfServiceOnboarding: { applicationId: string } | null };
type App = { id: string; email: string; linkedinUrl: string | null };
export function ownerMatches(account: Account, apps: App[], destination: string) {
  const norm = (s: string | null) => (s || "").trim().toLowerCase();
  const owner = account.notes?.match(/Owner:\s*(\S+@\S+)/)?.[1]?.replace(/\.$/, "") || "";
  const linked = account.selfServiceOnboarding
    ? apps.filter(a => a.id === account.selfServiceOnboarding!.applicationId)
    : apps.filter(a => normalizeProfile(account.linkedinUrl) && normalizeProfile(a.linkedinUrl) === normalizeProfile(account.linkedinUrl));
  const candidates = linked.length ? linked : apps.filter(a => owner && norm(a.email) === norm(owner));
  if (candidates.length > 1) return false;
  // A saved personal account email is also an owner address, but never the LV login inbox.
  return norm(destination) !== norm(account.loginEmail) &&
    (norm(account.personalEmail) === norm(destination) || (candidates.length === 1 && norm(candidates[0].email) === norm(destination)));
}

// Never forward sign-in, reset-password, or 2FA challenges from the shared inbox.
// Return only the email-address confirmation link/code, not the original message.
export function emailConfirmation(subject: string, content: string): string | null {
  if (/password|sign[ -]?in|log[ -]?in|two[ -]?(?:step|factor)|2fa|security alert/i.test(subject)) return null;
  if (!/(?:confirm|verify|verification).{0,35}(?:e-?mail|address)|(?:e-?mail|address).{0,35}(?:confirm|verify|verification)/i.test(subject)) return null;
  for (const raw of content.match(/https:\/\/[^\s<>"']+/gi) || []) {
    try {
      const u = new URL(raw.replaceAll("&amp;", "&").replace(/[).,;]+$/, ""));
      if (/(^|\.)linkedin\.com$/i.test(u.hostname) && !u.username && !u.password &&
        /^\/(?:comm\/)?psettings\/email\/confirm\/?$/.test(u.pathname)) return `Confirm your LinkedVelocity email address:\n${u.href}`;
    } catch { /* malformed URL */ }
  }
  const code = content.match(/(?:verification|confirmation|verify|confirm)(?:\s+(?:code|email|address|is|your))*\s*[:\-]?\s*(\d{6})\b/i)?.[1];
  return code ? `Your LinkedIn email-address confirmation code: ${code}` : null;
}
