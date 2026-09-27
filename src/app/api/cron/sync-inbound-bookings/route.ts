import { NextRequest, NextResponse } from "next/server";
import { retryMeetingInvitations, sendMeetingInvitation } from "@/lib/meeting-scheduler";
import { syncInboundBookings } from "@/lib/inbound-bookings";
export const maxDuration = 60;
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const meetingId = req.nextUrl.searchParams.get("meetingId");
  if (meetingId !== null) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(meetingId)) return NextResponse.json({ error: "Invalid meeting ID" }, { status: 400 });
    try {
      await sendMeetingInvitation(meetingId);
      return NextResponse.json({ invitationSent: true });
    } catch { return NextResponse.json({ error: "Invitation delivery failed." }, { status: 502 }); }
  }
  try { const invitations = await retryMeetingInvitations(); return NextResponse.json({ ...(process.env.CALENDAR_ICAL_URL ? await syncInboundBookings() : { calendarSync: "not configured" }), invitations }); }
  catch { return NextResponse.json({ error: "Booking sync failed." }, { status: 502 }); }
}
