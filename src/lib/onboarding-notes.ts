// Parse the free-text onboarding notes (application adminNotes + account notes) that the
// self-service / phone hand-off flows accumulate into clean, dated sections of check/bullet
// items — so the pipeline panel can render them as a tidy list instead of a wall of text.
// Anything it doesn't recognise falls back to the raw text, so nothing is ever hidden.

export type NoteKind = "check" | "bullet" | "warn";
export type NoteItem = { kind: NoteKind; text: string };
export type NoteSection = { label: string | null; date: string | null; items: NoteItem[] };
export type ParsedNotes = { sections: NoteSection[]; existingAccount: boolean; fallback: string | null };

const ISO_RE = /\d{4}-\d{2}-\d{2}T[\d:.]+Z/;

function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).replace(", ", " · ");
}

// Map a segment's body text to structured fact items by matching the known phrases the
// onboarding flows write. Order here is the order items render in.
function facts(body: string): NoteItem[] {
  const t = (re: RegExp) => re.test(body);
  const out: NoteItem[] = [];
  if (t(/owner on a phone/i)) out.push({ kind: "bullet", text: "Owner on a phone — LV completes the GoLogin sign-in" });
  if (t(/referrer has no PC/i)) out.push({ kind: "bullet", text: "Referrer has no PC — LV creates the proxy + GoLogin and signs in" });
  if (t(/owner consent/i)) out.push({ kind: "check", text: "Owner consent recorded" });
  if (t(/minimum[- ]age/i)) out.push({ kind: "check", text: "LinkedIn minimum age confirmed (16+, or older where required)" });
  if (t(/have a physical government ID/i)) out.push({ kind: "check", text: t(/name.*match.*ID/i) ? "Has a physical government ID · name matches ID" : "Has a physical government ID" });
  else if (t(/did NOT confirm a physical government ID/i)) out.push({ kind: "warn", text: "No physical government ID confirmed" });
  if (t(/login saved on the account/i)) out.push({ kind: "check", text: "Login saved on the account" });
  if (t(/Login reported successful|Login confirmed|Self-service login reported/i)) out.push({ kind: "check", text: "Login confirmed" });
  else if (t(/Login not yet confirmed|Awaiting owner login confirmation/i)) out.push({ kind: "bullet", text: "Login not yet confirmed" });
  if (t(/password saved/i)) out.push({ kind: "check", text: "Password saved" });
  else if (t(/password NOT captured/i)) out.push({ kind: "warn", text: "Password not captured" });
  if (t(/2FA key (provided|saved)/i)) out.push({ kind: "check", text: "2FA key provided" });
  else if (t(/2FA (NOT provided|still needs)/i)) out.push({ kind: "warn", text: "2FA not provided — team to set up" });
  return out;
}

const SEG_RE = /(?=(?:^|\n)\s*(?:PHONE HAND-OFF|Self-service onboarding|Self-service login reported|Login reported successful|2FA key saved by referrer))/i;

export function parseOnboardingNotes(raw: string | null | undefined): ParsedNotes {
  const text0 = (raw || "").trim();
  if (!text0) return { sections: [], existingAccount: false, fallback: null };

  const existingAccount = /\[Existing account submission\]/i.test(text0);
  let text = text0
    .replace(/\[Existing account submission\][^]*?(?=(?:\n|^)\s*(?:Self-service|PHONE HAND-OFF|Owner:|Login reported)|$)/i, "")
    .replace(/Owner photo:\s*https?:\/\/\S+/gi, "")
    .replace(/^Owner:\s*\S+@\S+\.?\s*/i, "") // email already shown in the Applicant card
    .trim();

  const sections: NoteSection[] = [];
  const chunks = text.split(SEG_RE).map((s) => s.trim()).filter(Boolean);
  for (const c of chunks) {
    const iso = c.match(ISO_RE)?.[0] || null;
    let label: string | null = null;
    if (/^PHONE HAND-OFF/i.test(c)) label = "Phone hand-off";
    else if (/^Self-service/i.test(c) || /^Login reported/i.test(c)) label = "Self-service";
    else if (/^2FA key saved/i.test(c)) label = "2FA";
    const items = facts(c);
    if (items.length) { sections.push({ label, date: fmtDate(iso), items }); continue; }
    // Unrecognised chunk: keep its text as a plain bullet (date stripped) so nothing is lost.
    const clean = c.replace(ISO_RE, "").replace(/\s{2,}/g, " ").trim().replace(/^[;:.\s]+/, "");
    if (clean) sections.push({ label, date: fmtDate(iso), items: [{ kind: "bullet", text: clean }] });
  }

  // Nothing recognised as onboarding notes (e.g. a hand-typed team note) → show it verbatim.
  if (!sections.length) return { sections: [], existingAccount, fallback: text0 };
  return { sections, existingAccount, fallback: null };
}
