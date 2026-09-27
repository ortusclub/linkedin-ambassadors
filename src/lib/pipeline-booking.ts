import type { Prisma } from "@/generated/prisma/client";
import type { Booking } from "@/lib/inbound-bookings";

export async function recordPipelineBooking(tx: Prisma.TransactionClient, booking: Booking) {
  const matches = await tx.ambassadorApplication.findMany({ where: { OR: [
    { email: { equals: booking.email, mode: "insensitive" } },
    { bookingEmail: { equals: booking.email, mode: "insensitive" } },
  ] }, select: { id: true }, take: 2 });
  // Never guess which profile a shared booking email belongs to.
  if (matches.length !== 1) return;
  const id = `booking:${booking.key}:${booking.fingerprint}`;
  const when = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Belgrade" }).format(booking.scheduledAt);
  const entry = JSON.stringify([{ id, ch: "note", by: "Meeting scheduler", at: new Date().toISOString(),
    text: `${booking.cancelled ? "Meeting cancelled" : "Meeting booked / updated"}: ${when} (Europe/Belgrade).`,
    bookingKey: booking.key, scheduledAt: booking.scheduledAt.toISOString(), cancelled: booking.cancelled }]);
  await tx.$executeRaw`UPDATE ambassador_applications SET outreach_log = COALESCE(outreach_log, '[]'::jsonb) || ${entry}::jsonb, updated_at = NOW() WHERE id = ${matches[0].id}::uuid AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(outreach_log, '[]'::jsonb)) item WHERE item->>'id' = ${id})`;
}
