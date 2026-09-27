import { NextRequest, NextResponse } from "next/server";
import { retryMeetingInvitations } from "@/lib/meeting-scheduler";
import { syncInboundBookings } from "@/lib/inbound-bookings";
export const maxDuration = 60;
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { const invitations = await retryMeetingInvitations(); return NextResponse.json({ ...(process.env.CALENDAR_ICAL_URL ? await syncInboundBookings() : { calendarSync: "not configured" }), invitations }); }
  catch { return NextResponse.json({ error: "Booking sync failed." }, { status: 502 }); }
}
