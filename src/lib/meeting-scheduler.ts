import * as ical from "node-ical";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { MEETING_HOST, meetingInvite, meetingTitle, meetingDescription, meetingSlots, type BusyPeriod } from "@/lib/meeting-time";

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
  const booking = await prisma.scheduledMeeting.findUniqueOrThrow({ where: { id }, include: { application: { select: { linkedinUrl: true, linkedinEmail: true } } } });
  if (booking.inviteSentAt) return;
  if (!process.env.RESEND_API_KEY) throw new Error("Invitation delivery unavailable");
  const when = booking.startsAt.toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "full", timeStyle: "short" });
  // A text/calendar alternative lets calendar clients treat this as an invitation,
  // rather than an ordinary email with a downloadable file. SMTP preserves MIME.
  const transport = nodemailer.createTransport({
    host: "smtp.resend.com", port: 465, secure: true,
    auth: { user: "resend", pass: process.env.RESEND_API_KEY },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000,
  });
  const result = await transport.sendMail({
    from: { name: "LinkedVelocity", address: MEETING_HOST },
    to: [...new Set([booking.email, booking.host])], replyTo: booking.host,
    subject: `${booking.sequence > 0 ? "Updated: " : ""}${meetingTitle(booking)}`,
    text: `${booking.sequence > 0 ? "Your onboarding call has been rescheduled. This invitation replaces the previous time; accept the update to move the existing calendar event.\n\n" : ""}Your onboarding call is booked for ${when} (Philippine time / Asia/Manila). Your calendar will display it in your own time zone.\n\n${meetingDescription(booking)}\n\nAccept this calendar invitation to add or update the meeting. If your mail app does not show invitation controls, open the attached .ics file.`,
    icalEvent: { filename: "onboarding.ics", method: "REQUEST", content: meetingInvite(booking) },
    headers: { "Resend-Idempotency-Key": `meeting-invitation/${booking.id}/${booking.sequence}` },
    messageId: `<meeting-${booking.id}-${booking.sequence}@linkedvelocity.com>`,
    date: booking.updatedAt,
  });
  if (result.rejected.length) throw new Error("Invitation delivery failed");
  await prisma.scheduledMeeting.updateMany({ where: { id, sequence: booking.sequence }, data: { inviteSentAt: new Date() } });
}
export async function retryMeetingInvitations() {
  const pending = await prisma.scheduledMeeting.findMany({ where: { inviteSentAt: null, startsAt: { gt: new Date() } }, select: { id: true }, take: 20 });
  const results = await Promise.allSettled(pending.map(b => sendMeetingInvitation(b.id)));
  return { sent: results.filter(r => r.status === "fulfilled").length, pending: results.filter(r => r.status === "rejected").length };
}
