import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { meetingApplication } from "@/lib/meeting-token";
import { verifyPermit } from "@/lib/self-onboarding-gate";
import { availableMeetings, calendarBusy, sendMeetingInvitation } from "@/lib/meeting-scheduler";
import { MEETING_HOST, MEETING_MINUTES, MEETING_TIME_ZONE, meetingSlots } from "@/lib/meeting-time";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
const applicationId = (req: Request) => meetingApplication(req.headers.get("authorization")?.replace(/^Bearer /, "") || "");
const view = (booking: { id: string; startsAt: Date; inviteSentAt: Date | null }) => ({ id: booking.id, startsAt: booking.startsAt, invitationSent: !!booking.inviteSentAt });
export async function GET(req: Request) {
  const id = applicationId(req);
  if (!id) return json({ error: "Your booking link has expired. Please contact info@linkedvelocity.com." }, 401);
  try {
    const app = await prisma.ambassadorApplication.findUnique({ where: { id }, select: { id: true } });
    if (!app) return json({ error: "Application not found." }, 404);
    const booking = await prisma.scheduledMeeting.findUnique({ where: { applicationId: id } });
    return json({ slots: booking ? [] : await availableMeetings(), booking: booking ? view(booking) : null, duration: MEETING_MINUTES, timeZone: MEETING_TIME_ZONE });
  } catch { return json({ error: "We couldn't check the calendar. Please try again shortly." }, 503); }
}
const schema = z.object({ startsAt: z.string().datetime(), permit: z.string().min(1) });
export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) return json({ error: "Request origin not allowed." }, 403);
  const id = applicationId(req);
  if (!id) return json({ error: "Your booking link has expired. Please contact info@linkedvelocity.com." }, 401);
  try {
    const body = schema.safeParse(await req.json());
    if (!body.success) return json({ error: "Choose a time and verify your email." }, 400);
    const app = await prisma.ambassadorApplication.findUnique({ where: { id } });
    if (!app) return json({ error: "Application not found." }, 404);
    if (!verifyPermit(body.data.permit, app.email)) return json({ error: "Please verify your application email again." }, 403);
    const existing = await prisma.scheduledMeeting.findUnique({ where: { applicationId: id } });
    let booking = existing;
    if (!booking) {
      const now = new Date();
      const externalBusy = await calendarBusy(now);
      booking = await prisma.$transaction(async tx => {
        // Shared lock + unique host/time constraint prevent competing bookings.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(27192020)`;
        const duplicate = await tx.scheduledMeeting.findUnique({ where: { applicationId: id } });
        if (duplicate) return duplicate;
        const booked = await tx.scheduledMeeting.findMany({ where: { host: MEETING_HOST, startsAt: { gte: new Date(now.getTime() - 1200000) } } });
        if (booked.some(b => b.email.toLowerCase() === app.email.toLowerCase())) throw new Error("ALREADY_BOOKED");
        const imported = await tx.inboundBooking.findMany({ where: { cancelled: false, scheduledAt: { gte: new Date(now.getTime() - 1800000) } }, select: { scheduledAt: true, eventId: true } });
        const slots = meetingSlots(new Date(), [...externalBusy, ...imported.map(b => ({ start: b.scheduledAt, end: new Date(b.scheduledAt.getTime() + (b.eventId.endsWith("@linkedvelocity.com") ? 1200000 : 1800000)) })), ...booked.map(b => ({ start: b.startsAt, end: new Date(b.startsAt.getTime() + 1200000) }))]);
        if (!slots.includes(body.data.startsAt)) throw new Error("SLOT_TAKEN");
        const created = await tx.scheduledMeeting.create({ data: { applicationId: id, name: app.fullName, email: app.email, contact: app.contactNumber || "", host: MEETING_HOST, startsAt: new Date(body.data.startsAt) } });
        const when = created.startsAt.toLocaleString("en-PH", { timeZone: MEETING_TIME_ZONE, dateStyle: "medium", timeStyle: "short" });
        const entry = JSON.stringify([{ id: `meeting:${created.id}`, ch: "note", by: "Meeting scheduler", at: created.createdAt.toISOString(), text: `20-minute onboarding meeting booked: ${when} (Philippine time).`, bookingKey: created.id, scheduledAt: created.startsAt.toISOString(), cancelled: false }]);
        await tx.$executeRaw`UPDATE ambassador_applications SET outreach_log = COALESCE(outreach_log, '[]'::jsonb) || ${entry}::jsonb, updated_at = NOW() WHERE id = ${id}::uuid`;
        const lead = await tx.inboundLead.create({ data: { channel: "call", contact: `meeting:${created.id}`, name: app.fullName, phone: app.contactNumber, companyEmail: app.email, source: "LinkedVelocity onboarding booking", status: "Booked Call", stage: "warm", firstContactAt: created.startsAt, followUpDate: created.startsAt, message: `20-minute onboarding call. Application: ${app.id}` } });
        await tx.inboundBooking.create({ data: { key: created.id, eventId: `${created.id}@linkedvelocity.com`, email: app.email, leadId: lead.id, scheduledAt: created.startsAt, fingerprint: created.id } });
        return created;
      });
    }
    try { await sendMeetingInvitation(booking.id); booking = { ...booking, inviteSentAt: new Date() }; } catch { /* Durable pending invitation is retried by the booking cron. */ }
    return json({ booking: view(booking) });
  } catch (error) {
    if (error instanceof Error && error.message === "SLOT_TAKEN") return json({ error: "That time is no longer available. Choose another time." }, 409);
    if (error instanceof Error && error.message === "ALREADY_BOOKED") return json({ error: "You already have an upcoming call. Contact info@linkedvelocity.com to change it." }, 409);
    return json({ error: "We couldn't book that time. Please try again." }, 503);
  }
}
