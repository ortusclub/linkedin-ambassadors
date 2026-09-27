export const MEETING_MINUTES = 20;
export const MEETING_TIME_ZONE = "Asia/Manila";
export const MEETING_HOST = "info@linkedvelocity.com";
export type BusyPeriod = { start: Date; end: Date };
const MINUTE = 60000;
// Philippine time has no daylight-saving changes (UTC+8).
export function meetingSlots(now: Date, busy: BusyPeriod[]): string[] {
  const local = new Date(now.getTime() + 8 * 3600000);
  const firstDay = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  const slots: string[] = [];
  for (let day = 0; day < 14; day++) {
    const date = new Date(firstDay + day * 86400000);
    if ([0, 6].includes(date.getUTCDay())) continue;
    for (let minute = 9 * 60; minute + MEETING_MINUTES <= 17 * 60; minute += MEETING_MINUTES) {
      const start = firstDay + day * 86400000 + (minute - 8 * 60) * MINUTE;
      const end = start + MEETING_MINUTES * MINUTE;
      if (start < now.getTime() + 2 * 3600000) continue;
      if (busy.some(b => b.start.getTime() < end && b.end.getTime() > start)) continue;
      slots.push(new Date(start).toISOString());
    }
  }
  return slots;
}
const escapeICS = (value: string) => value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
export function meetingInvite(booking: { id: string; name: string; email: string; contact: string; startsAt: Date; createdAt: Date }) {
  // Folding by UTF-8 byte length keeps international names valid in calendar clients.
  const fold = (line: string) => { let result = "", bytes = 0; for (const c of line) { const size = Buffer.byteLength(c); if (bytes + size > 74) { result += "\r\n "; bytes = 1; } result += c; bytes += size; } return result; };
  const description = `20-minute onboarding call with ${booking.name}. The team will contact you via ${booking.contact || booking.email}. For changes, email ${MEETING_HOST}.`;
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//LinkedVelocity//Onboarding//EN", "METHOD:REQUEST", "BEGIN:VEVENT",
    `UID:${booking.id}@linkedvelocity.com`, `DTSTAMP:${stamp(booking.createdAt)}`, `DTSTART:${stamp(booking.startsAt)}`,
    `DTEND:${stamp(new Date(booking.startsAt.getTime() + MEETING_MINUTES * 60000))}`, "SEQUENCE:0", "STATUS:CONFIRMED",
    "SUMMARY:LinkedVelocity onboarding call", `DESCRIPTION:${escapeICS(description)}`,
    `ORGANIZER;CN=LinkedVelocity:mailto:${MEETING_HOST}`, `ATTENDEE;RSVP=TRUE:mailto:${booking.email}`,
    "END:VEVENT", "END:VCALENDAR", ""].map(fold).join("\r\n");
}
