import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { syncInboundBookings } from "@/lib/inbound-bookings";
export const maxDuration = 60;
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    return NextResponse.json(await syncInboundBookings(req.nextUrl.searchParams.get("preview") === "1"));
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "Unauthorized" || msg === "Forbidden") return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 403 });
    return NextResponse.json({ error: "Booking sync failed. Please try again later." }, { status: 502 });
  }
}
