import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { submittedApplicationsWhere } from "@/lib/application-ownership";
import { meetingApplication } from "@/lib/meeting-token";
import { verifyPermit } from "@/lib/self-onboarding-gate";
import { availableMeetings, calendarBusy, sendMeetingInvitation } from "@/lib/meeting-scheduler";
import { MEETING_HOST, MEETING_MINUTES, MEETING_TIME_ZONE, meetingSlots } from "@/lib/meeting-time";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
async function applicationAccess(req: Request) {
  const requestedId = new URL(req.url).searchParams.get("applicationId");
  if (requestedId) {
    const user = await requireAuth();
    const owned = await prisma.ambassadorApplication.findFirst({ where: { id: requestedId, ...submittedApplicationsWhere(user) }, select: { id: true } });
    return { id: owned?.id || null, authenticated: true };
  }
  return { id: meetingApplication(req.headers.get("authorization")?.replace(/^Bearer /, "") || ""), authenticated: false };
}
const view = (booking: { id: string; startsAt: Date; inviteSentAt: Date | null; sequence?: number }) => ({ sequence: booking.sequence || 0, id: booking.id, startsAt: booking.startsAt, invitationSent: !!booking.inviteSentAt });
export async function GET(req: Request) {
  try {
    const { id } = await applicationAccess(req);
    if (!id) return json({ error: "Application unavailable. Please sign in or use a current booking link." }, 401);
    const app = await prisma.ambassadorApplication.findUnique({ where: { id }, select: { id: true } });
    if (!app) return json({ error: "Application not found." }, 404);
    const booking = await prisma.scheduledMeeting.findUnique({ where: { applicationId: id } });
    return json({ slots: booking && !new URL(req.url).searchParams.has("reschedule") ? [] : await availableMeetings(new Date(), booking?.id), booking: booking ? view(booking) : null, duration: MEETING_MINUTES, timeZone: MEETING_TIME_ZONE });
  } catch (error) { return json({ error: error instanceof Error && error.message === "Unauthorized" ? "Please sign in." : "We couldn't check the calendar. Please try again shortly." }, error instanceof Error && error.message === "Unauthorized" ? 401 : 503); }
}
const schema = z.object({ startsAt: z.string().datetime(), permit: z.string().optional(), sequence: z.number().int().nonnegative().optional() });
export async function POST(req: Request) { return saveMeeting(req, false); }
export async function PUT(req: Request) { return saveMeeting(req, true); }
async function saveMeeting(req: Request, reschedule: boolean) {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) return json({ error: "Request origin not allowed." }, 403);
  try {
    const { id, authenticated } = await applicationAccess(req);
    if (!id) return json({ error: "Application unavailable. Please sign in or use a current booking link." }, 401);
    const body = schema.safeParse(await req.json());
    if (!body.success) return json({ error: "Choose a time and verify your email." }, 400);
    const app = await prisma.ambassadorApplication.findUnique({ where: { id } });
    if (!app) return json({ error: "Application not found." }, 404);
    if (!authenticated && !verifyPermit(body.data.permit || "", app.email)) return json({ error: "Please verify your application email again." }, 403);
    const existing = await prisma.scheduledMeeting.findUnique({ where: { applicationId: id } });
    let booking = existing;
    if (reschedule && !booking) return json({ error: "No meeting is booked yet." }, 404);
    if (!booking || reschedule) {
      const now = new Date();
      const externalBusy = await calendarBusy(now);
      booking = await prisma.$transaction(async tx => {
        // Shared lock + unique host/time constraint prevent competing bookings.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(27192020)`;
        const duplicate = await tx.scheduledMeeting.findUnique({ where: { applicationId: id } });
        if (duplicate && !reschedule) return duplicate;
        if (reschedule && (!duplicate || body.data.sequence !== duplicate.sequence)) throw new Error("STALE_BOOKING");
        if (reschedule && duplicate?.startsAt.toISOString() === body.data.startsAt) return duplicate;

        const booked = await tx.scheduledMeeting.findMany({ where: { ...(duplicate ? { id: { not: duplicate.id } } : {}), host: MEETING_HOST, startsAt: { gte: new Date(now.getTime() - 1800000) } } });
        if (booked.some(b => b.email.toLowerCase() === app.email.toLowerCase())) throw new Error("ALREADY_BOOKED");
        const imported = await tx.inboundBooking.findMany({ where: { ...(duplicate ? { key: { not: duplicate.id } } : {}), cancelled: false, scheduledAt: { gte: new Date(now.getTime() - 1800000) } }, select: { scheduledAt: true, eventId: true } });
        const slots = meetingSlots(new Date(), [...externalBusy, ...imported.map(b => ({ start: b.scheduledAt, end: new Date(b.scheduledAt.getTime() + 1800000) })), ...booked.map(b => ({ start: b.startsAt, end: new Date(b.startsAt.getTime() + 1800000) }))]);
        if (!slots.includes(body.data.startsAt)) throw new Error("SLOT_TAKEN");
        const created = duplicate && reschedule ? await tx.scheduledMeeting.update({ where: { id: duplicate.id }, data: { startsAt: new Date(body.data.startsAt), sequence: { increment: 1 }, inviteSentAt: null } }) : await tx.scheduledMeeting.create({ data: { applicationId: id, name: app.fullName, email: app.email, contact: app.contactNumber || "", host: MEETING_HOST, startsAt: new Date(body.data.startsAt) } });
        const when = created.startsAt.toLocaleString("en-PH", { timeZone: MEETING_TIME_ZONE, dateStyle: "medium", timeStyle: "short" });
        const entry = JSON.stringify([{ id: `meeting:${created.id}:${created.sequence}`, ch: "note", by: "Meeting scheduler", at: new Date().toISOString(), text: `30-minute onboarding meeting ${reschedule ? "rescheduled" : "booked"}: ${when} (Philippine time).`, bookingKey: created.id, scheduledAt: created.startsAt.toISOString(), cancelled: false }]);
        await tx.$executeRaw`UPDATE ambassador_applications SET outreach_log = COALESCE(outreach_log, '[]'::jsonb) || ${entry}::jsonb, updated_at = NOW() WHERE id = ${id}::uuid`;
        const priorInbound = duplicate ? await tx.inboundBooking.findUnique({ where: { key: duplicate.id } }) : null;
        if (priorInbound) {
          await tx.inboundBooking.update({ where: { key: created.id }, data: { scheduledAt: created.startsAt, fingerprint: `${created.id}:${created.sequence}` } });
          await tx.inboundLead.update({ where: { id: priorInbound.leadId }, data: { firstContactAt: created.startsAt, followUpDate: created.startsAt } });
        } else {
          const lead = await tx.inboundLead.create({ data: { channel: "call", contact: `meeting:${created.id}`, name: app.fullName, phone: app.contactNumber, companyEmail: app.email, source: "LinkedVelocity onboarding booking", status: "Booked Call", stage: "warm", firstContactAt: created.startsAt, followUpDate: created.startsAt, message: `30-minute onboarding call. Application: ${app.id}` } });
          await tx.inboundBooking.create({ data: { key: created.id, eventId: `${created.id}@linkedvelocity.com`, email: app.email, leadId: lead.id, scheduledAt: created.startsAt, fingerprint: `${created.id}:${created.sequence}` } });
        }
        return created;
      });
    }
    try { await sendMeetingInvitation(booking.id); booking = { ...booking, inviteSentAt: new Date() }; } catch { /* Durable pending invitation is retried by the booking cron. */ }
    return json({ booking: view(booking) });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") return json({ error: "Please sign in." }, 401);
    if (error instanceof Error && error.message === "STALE_BOOKING") return json({ error: "This booking changed. Refresh it before rescheduling." }, 409);
    if (error instanceof Error && error.message === "SLOT_TAKEN") return json({ error: "That time is no longer available. Choose another time." }, 409);
    if (error instanceof Error && error.message === "ALREADY_BOOKED") return json({ error: "You already have an upcoming call. Contact info@linkedvelocity.com to change it." }, 409);
    return json({ error: "We couldn't book that time. Please try again." }, 503);
  }
}
