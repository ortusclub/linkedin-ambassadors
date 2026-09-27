import * as ical from "node-ical";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { MEETING_HOST, meetingInvite, meetingSlots, type BusyPeriod } from "@/lib/meeting-time";

export async function calendarBusy(now: Date): Promise<BusyPeriod[]> {
  const url = process.env.CALENDAR_ICAL_URL;
  // Standalone scheduling remains available when no external calendar is connected.
  if (!url) return [];
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("Calendar unavailable");
  const feed = await response.text();
  if (!feed.includes("BEGIN:VCALENDAR")) throw new Error("Calendar unavailable");
  const end = new Date(now.getTime() + 15 * 86400000);
  const busy: BusyPeriod[] = [];
  for (const event of Object.values(ical.sync.parseICS(feed))) {
    if (!event || event.type !== "VEVENT" || !event.start || event.status === "CANCELLED" || event.transparency === "TRANSPARENT") continue;
    for (const instance of ical.expandRecurringEvent(event, { from: now, to: end, expandOngoing: true })) {
      busy.push({ start: instance.start, end: instance.end });
    }
  }
  return busy;
}
export async function availableMeetings(now = new Date(), excludeId?: string) {
  const busy = await calendarBusy(now);
  const imported = await prisma.inboundBooking.findMany({ where: { ...(excludeId ? { key: { not: excludeId } } : {}), cancelled: false, scheduledAt: { gte: new Date(now.getTime() - 1800000) } }, select: { scheduledAt: true, eventId: true } });
  busy.push(...imported.map(b => ({ start: b.scheduledAt, end: new Date(b.scheduledAt.getTime() + 1800000) })));
  const booked = await prisma.scheduledMeeting.findMany({ where: { ...(excludeId ? { id: { not: excludeId } } : {}), host: MEETING_HOST, startsAt: { gte: new Date(now.getTime() - 1800000) } }, select: { startsAt: true } });
  return meetingSlots(now, [...busy, ...booked.map(b => ({ start: b.startsAt, end: new Date(b.startsAt.getTime() + 1800000) }))]);
}
export async function sendMeetingInvitation(id: string) {
  const booking = await prisma.scheduledMeeting.findUniqueOrThrow({ where: { id } });
  if (booking.inviteSentAt) return;
  if (!process.env.RESEND_API_KEY) throw new Error("Invitation delivery unavailable");
  const when = booking.startsAt.toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "full", timeStyle: "short" });
  const content = Buffer.from(meetingInvite(booking)).toString("base64");
  const result = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: process.env.RESEND_FROM_EMAIL || "LinkedVelocity <noreply@linkedvelocity.com>",
    to: [...new Set([booking.email, booking.host])], replyTo: booking.host,
    subject: booking.sequence > 0 ? "Updated: your LinkedVelocity onboarding call" : "Your 30-minute LinkedVelocity onboarding call",
    text: `${booking.sequence > 0 ? "Your onboarding call has been rescheduled. This invitation replaces the previous time.\n\n" : ""}Your onboarding call is booked for ${when} (Philippine time / Asia/Manila).\n\nDuration: 30 minutes.\nWe will contact you using the WhatsApp, Telegram or phone details you provided in your application.\n\nOpen the attached calendar invitation to add the meeting to your calendar.\nFor changes or cancellation, reply to this email.`,
    attachments: [{ filename: "onboarding.ics", content, contentType: "text/calendar; charset=utf-8; method=REQUEST" }],
  }, { idempotencyKey: `meeting-invitation/${booking.id}/${booking.sequence}` });
  if (result.error) throw new Error("Invitation delivery failed");
  await prisma.scheduledMeeting.updateMany({ where: { id, sequence: booking.sequence }, data: { inviteSentAt: new Date() } });
}
export async function retryMeetingInvitations() {
  const pending = await prisma.scheduledMeeting.findMany({ where: { inviteSentAt: null, startsAt: { gt: new Date() } }, select: { id: true }, take: 20 });
  const results = await Promise.allSettled(pending.map(b => sendMeetingInvitation(b.id)));
  return { sent: results.filter(r => r.status === "fulfilled").length, pending: results.filter(r => r.status === "rejected").length };
}
