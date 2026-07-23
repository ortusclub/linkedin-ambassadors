/**
 * Ambassador call tracking, sourced live from info@'s Google Calendar iCal feed.
 *
 * Bookings are created by Google Calendar Appointment Scheduling ("30 min with
 * LinkedVelocity"). Each booking is a calendar event where the person who booked
 * is a guest, plus a Google Meet link. We read the read-only iCal feed, match
 * events to ambassador applications by the guest's email, and derive the call
 * stage. No database columns needed — the calendar is the source of truth.
 *
 * Set CALENDAR_ICAL_URL to the calendar's "Secret address in iCal format".
 */

export type CallStage = "none" | "booked" | "done";

export interface CallInfo {
  stage: CallStage;
  scheduledAt: string | null; // ISO
  meetLink: string | null;
  channel: string | null; // "WhatsApp" / "Telegram" / "Google Meet", when the form captured it
  title: string | null;
  cancelled: boolean;
}

const OWNER_EMAIL = "info@linkedvelocity.com";
const TTL_MS = 5 * 60 * 1000; // the iCal feed itself only refreshes every few hours

export interface CallMaps {
  byEmail: Map<string, CallInfo>;
  // name-key -> the call + the email that booked it. Only unambiguous names (a
  // name that resolves to a single booker) are kept, so we never guess wrong.
  byName: Map<string, { call: CallInfo; email: string }>;
}

let cache: { at: number; maps: CallMaps } | null = null;

// First+last name, lowercased and letters-only, for matching a signup to a call
// booked under a different email. Tolerant of middle names/initials.
export function nameKey(name: string | null | undefined): string | null {
  if (!name) return null;
  const toks = name.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
  if (toks.length === 0) return null;
  return toks.length === 1 ? toks[0] : `${toks[0]} ${toks[toks.length - 1]}`;
}

// iCal folds long lines by starting the continuation with a space/tab.
function unfold(ics: string): string {
  return ics.replace(/\r?\n[ \t]/g, "");
}

function parseICalDate(v: string): Date | null {
  const m = v.match(/(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?/);
  if (!m) return null;
  const [, y, mo, d, h = "0", mi = "0", s = "0"] = m;
  return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s));
}

function firstMatch(block: string, key: string): string | null {
  const re = new RegExp("^" + key + "(?:;[^:\\n]*)?:(.*)$", "mi");
  const m = block.match(re);
  return m ? m[1].trim() : null;
}

function emailFromAttendee(line: string): string | null {
  const m = line.match(/mailto:([^\s;,]+@[^\s;,]+)/i);
  return m ? m[1].toLowerCase() : null;
}

// Full ATTENDEE lines with their CN (common name) param and email, minus the owner.
function attendeeEntries(block: string): { email: string; name: string | null }[] {
  const re = /^ATTENDEE([^:\n]*):(.*)$/gim;
  const out: { email: string; name: string | null }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(block))) {
    const email = emailFromAttendee(m[2]);
    if (!email || email === OWNER_EMAIL) continue;
    const cn = m[1].match(/CN=("?)([^;":]+)\1/i);
    out.push({ email, name: cn ? cn[2].trim() : null });
  }
  return out;
}

function parseChannel(descRaw: string): string | null {
  const desc = descRaw.replace(/\\n/g, "\n").replace(/\\,/g, ",");
  const m = desc.match(/reach you[^\n]*\n\s*([A-Za-z][A-Za-z ]+)/i);
  if (!m) return null;
  return m[1].trim().split(/\s{2,}|<|\\/)[0].trim() || null;
}

// Prefer a live (non-cancelled) call; prefer an upcoming booking over a past one;
// otherwise keep the most recent.
function isBetter(a: CallInfo, b: CallInfo): boolean {
  if (a.cancelled !== b.cancelled) return !a.cancelled;
  const rank = (c: CallInfo) => (c.stage === "booked" ? 2 : c.stage === "done" ? 1 : 0);
  if (rank(a) !== rank(b)) return rank(a) > rank(b);
  return (a.scheduledAt || "") > (b.scheduledAt || "");
}

async function buildMaps(): Promise<CallMaps> {
  const url = process.env.CALENDAR_ICAL_URL;
  const empty: CallMaps = { byEmail: new Map(), byName: new Map() };
  if (!url) return empty;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`ical ${res.status}`);
  const text = unfold(await res.text());
  const blocks = text.split("BEGIN:VEVENT").slice(1).map((b) => b.split("END:VEVENT")[0]);
  const byEmail = new Map<string, CallInfo>();
  const now = Date.now();

  // Track which emails each name-key resolves to, so a name shared by two
  // different bookers is dropped (never matched) rather than guessed.
  const nameToCall = new Map<string, { call: CallInfo; email: string }>();
  const nameEmails = new Map<string, Set<string>>();

  for (const block of blocks) {
    const start = firstMatch(block, "DTSTART");
    const when = start ? parseICalDate(start) : null;
    const cancelled = (firstMatch(block, "STATUS") || "").toUpperCase() === "CANCELLED";
    const info: CallInfo = {
      stage: cancelled ? "none" : when && when.getTime() > now ? "booked" : "done",
      scheduledAt: when ? when.toISOString() : null,
      meetLink: firstMatch(block, "X-GOOGLE-CONFERENCE"),
      channel: parseChannel(firstMatch(block, "DESCRIPTION") || ""),
      title: firstMatch(block, "SUMMARY"),
      cancelled,
    };
    for (const { email, name } of attendeeEntries(block)) {
      const existing = byEmail.get(email);
      if (!existing || isBetter(info, existing)) byEmail.set(email, info);

      const nk = nameKey(name);
      if (nk) {
        if (!nameEmails.has(nk)) nameEmails.set(nk, new Set());
        nameEmails.get(nk)!.add(email);
        const cur = nameToCall.get(nk);
        if (!cur || isBetter(info, cur.call)) nameToCall.set(nk, { call: info, email });
      }
    }
  }

  // Keep only names that map to exactly one booker email.
  const byName = new Map<string, { call: CallInfo; email: string }>();
  for (const [nk, entry] of nameToCall) {
    if ((nameEmails.get(nk)?.size ?? 0) === 1) byName.set(nk, entry);
  }

  return { byEmail, byName };
}

/** Both lookup maps (by email, and by unambiguous name), cached briefly. */
export async function getCallMaps(): Promise<CallMaps> {
  if (!process.env.CALENDAR_ICAL_URL) return { byEmail: new Map(), byName: new Map() };
  if (cache && Date.now() - cache.at < TTL_MS) return cache.maps;
  try {
    const maps = await buildMaps();
    cache = { at: Date.now(), maps };
    return maps;
  } catch {
    return cache?.maps ?? { byEmail: new Map(), byName: new Map() };
  }
}

/** Map of lowercased guest email -> their call info, from info@'s calendar. */
export async function getCallsByEmail(): Promise<Map<string, CallInfo>> {
  return (await getCallMaps()).byEmail;
}

/**
 * Resolve a signup to its call: by form email, then a stored booking email, then
 * an unambiguous name match (covers people who booked under a different email).
 * Returns the matched email so callers can record a newly-discovered booking email.
 */
export function pickCall(
  maps: CallMaps,
  who: { email?: string | null; bookingEmail?: string | null; fullName?: string | null }
): { call: CallInfo | null; matchedEmail: string | null; viaName: boolean } {
  if (who.email) {
    const c = maps.byEmail.get(who.email.toLowerCase());
    if (c) return { call: c, matchedEmail: who.email.toLowerCase(), viaName: false };
  }
  if (who.bookingEmail) {
    const c = maps.byEmail.get(who.bookingEmail.toLowerCase());
    if (c) return { call: c, matchedEmail: who.bookingEmail.toLowerCase(), viaName: false };
  }
  const nk = nameKey(who.fullName);
  if (nk) {
    const hit = maps.byName.get(nk);
    if (hit) return { call: hit.call, matchedEmail: hit.email, viaName: true };
  }
  return { call: null, matchedEmail: null, viaName: false };
}
