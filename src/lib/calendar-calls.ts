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

let cache: { at: number; map: Map<string, CallInfo> } | null = null;

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

function allMatches(block: string, key: string): string[] {
  const re = new RegExp("^" + key + "(?:;[^:\\n]*)?:(.*)$", "gmi");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(block))) out.push(m[1].trim());
  return out;
}

function emailFromAttendee(line: string): string | null {
  const m = line.match(/mailto:([^\s;,]+@[^\s;,]+)/i);
  return m ? m[1].toLowerCase() : null;
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

/** Map of lowercased guest email -> their call info, from info@'s calendar. */
export async function getCallsByEmail(): Promise<Map<string, CallInfo>> {
  const url = process.env.CALENDAR_ICAL_URL;
  if (!url) return new Map();
  if (cache && Date.now() - cache.at < TTL_MS) return cache.map;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return cache?.map ?? new Map();
    const text = unfold(await res.text());
    const blocks = text.split("BEGIN:VEVENT").slice(1).map((b) => b.split("END:VEVENT")[0]);
    const map = new Map<string, CallInfo>();
    const now = Date.now();

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
      const guests = allMatches(block, "ATTENDEE")
        .map(emailFromAttendee)
        .filter((e): e is string => !!e && e !== OWNER_EMAIL);
      for (const email of guests) {
        const existing = map.get(email);
        if (!existing || isBetter(info, existing)) map.set(email, info);
      }
    }

    cache = { at: Date.now(), map };
    return map;
  } catch {
    return cache?.map ?? new Map();
  }
}
