import { NextRequest, NextResponse } from "next/server";
import { syncInboundBookings } from "@/lib/inbound-bookings";
export const maxDuration = 60;
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json(await syncInboundBookings()); }
  catch { return NextResponse.json({ error: "Booking sync failed." }, { status: 502 }); }
}
