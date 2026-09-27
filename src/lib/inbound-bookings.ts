import { createHash } from "node:crypto";
import * as ical from "node-ical";
import { bookingContact } from "@/lib/booking-contact";
import { prisma } from "@/lib/prisma";

const text = (value: unknown): string => typeof value === "string" ? value : value && typeof value === "object" && "val" in value ? String(value.val) : "";
export type Booking = { key: string; eventId: string; email: string; name: string; phone?: string; title: string; description: string; scheduledAt: Date; cancelled: boolean; fingerprint: string };
export function parseInboundBookings(feed: string, now = new Date()): Booking[] {
  if (!feed.includes("BEGIN:VCALENDAR")) throw new Error("Calendar feed is not valid iCalendar.");
  const events = ical.sync.parseICS(feed);
  const bookings: Booking[] = [];
  const cutoff = now.getTime() - 30 * 86400000;
  for (const event of Object.values(events)) {
    if (!event || event.type !== "VEVENT" || !event.uid || !event.start || event.rrule) continue;
    const title = text(event.summary);
    // Only the public appointment scheduler, never arbitrary meetings on the calendar.
    if (!/30\s*(?:min|minute)s?\s+with\s+LinkedVelocity/i.test(title)) continue;
    if (event.start.getTime() < cutoff) continue;
    const guests = Array.isArray(event.attendee) ? event.attendee : event.attendee ? [event.attendee] : [];
    for (const guest of guests) {
      const email = text(guest).replace(/^mailto:/i, "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || /@linkedvelocity\.com$/.test(email)) continue;
      const key = createHash("sha256").update(`${event.uid}\n${email}`).digest("hex");
      const cancelled = event.status === "CANCELLED";
      const description = text(event.description).slice(0, 10000);
      const contact = bookingContact(description, email);
      const name = contact.name || (typeof guest === "object" ? String(guest.params?.CN || email) : email);
      const fingerprint = createHash("sha256").update(JSON.stringify([event.start.toISOString(), cancelled, title, description, name, contact.phone])).digest("hex");
      bookings.push({ key, eventId: event.uid, email, name, phone: contact.phone, title, description, scheduledAt: event.start, cancelled, fingerprint });
    }
  }
  return bookings;
}

export async function syncInboundBookings(dryRun = false) {
  const url = process.env.CALENDAR_ICAL_URL;
  if (!url) throw new Error("Calendar feed is not configured.");
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error("Could not read the calendar feed.");
  const feed = await response.text();
  const bookings = parseInboundBookings(feed);
  const result = { found: bookings.length, created: 0, updated: 0, unchanged: 0, ambiguous: 0, skippedCancelled: 0, dryRun };
  if (dryRun) {
    const recentEventTitles = Object.values(ical.sync.parseICS(feed)).filter((e): e is ical.VEvent => !!e && e.type === "VEVENT" && !!e.start && e.start.getTime() >= Date.now() - 30 * 86400000).map(e => text(e.summary));
    return { ...result, recentEventTitles: [...new Set(recentEventTitles)].slice(0, 20) };
  }
  await prisma.$transaction(async tx => {
    // Avoid simultaneous manual and cron runs making duplicate contacts.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(27145000)`;
    const ardi = await tx.user.findFirst({ where: { email: "ardi@linkedvelocity.com", role: "admin" }, select: { email: true } });
    for (const booking of bookings) {
      const prior = await tx.inboundBooking.findUnique({ where: { key: booking.key } });
      if (prior?.fingerprint === booking.fingerprint) { result.unchanged++; continue; }
      let lead = prior ? await tx.inboundLead.findUnique({ where: { id: prior.leadId } }) : null;
      if (!lead) {
        const candidates = await tx.inboundLead.findMany({ where: { companyEmail: { equals: booking.email, mode: "insensitive" } }, take: 2 });
        if (candidates.length > 1) { result.ambiguous++; continue; }
        lead = candidates[0] || null;
      }
      if (!lead && booking.cancelled) { result.skippedCancelled++; continue; }
      const entry = { ts: new Date().toISOString(), channel: "booking", body: `${booking.cancelled ? "Call cancelled" : prior ? "Call booking updated" : "Call booked"}: ${booking.scheduledAt.toISOString()}\n${booking.title}${booking.description ? `\n${booking.description}` : ""}` };
      if (!lead) {
        lead = await tx.inboundLead.create({ data: { channel: "call", contact: `calendar:${booking.key}`, name: booking.name, phone: booking.phone, companyEmail: booking.email, source: "Google Calendar booking", status: "Booked Call", stage: "warm", firstContactAt: booking.scheduledAt, ownerEmail: ardi?.email || null, followUpDate: booking.scheduledAt, message: booking.description || booking.title } });
        result.created++;
      } else {
        // Keep manual outcomes and assignments. A cancelled call is not a lost customer.
        const status = ["new", "replied", "in conversation", "no response", "contacted", "booked call"].includes(lead.status.toLowerCase()) ? booking.cancelled ? "In Conversation" : "Booked Call" : lead.status;
        const followUpDate = !booking.cancelled ? booking.scheduledAt : prior && lead.followUpDate?.getTime() === prior.scheduledAt.getTime() ? null : lead.followUpDate;
        await tx.inboundLead.update({ where: { id: lead.id }, data: { status, followUpDate, ...(lead.name.trim().toLowerCase() === booking.email && booking.name !== booking.email ? { name: booking.name } : {}), ...(!lead.phone && booking.phone ? { phone: booking.phone } : {}) } });
        result.updated++;
      }
      const json = JSON.stringify([entry]);
      await tx.$executeRaw`UPDATE inbound_leads SET comms_log = ${json}::jsonb || COALESCE(comms_log, '[]'::jsonb) WHERE id = ${lead.id}::uuid`;
      const data = { leadId: lead.id, eventId: booking.eventId, email: booking.email, scheduledAt: booking.scheduledAt, cancelled: booking.cancelled, fingerprint: booking.fingerprint };
      await tx.inboundBooking.upsert({ where: { key: booking.key }, create: { key: booking.key, ...data }, update: data });
      if (lead.source === "Google Calendar booking") {
        const latest = await tx.inboundBooking.findFirst({ where: { leadId: lead.id }, orderBy: [{ cancelled: "asc" }, { scheduledAt: "desc" }] });
        if (latest) await tx.inboundLead.update({ where: { id: lead.id }, data: { firstContactAt: latest.scheduledAt } });
      }
    }
  }, { timeout: 45000 });
  return result;
}
