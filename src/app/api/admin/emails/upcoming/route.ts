import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { buildRenewalForecast } from "@/lib/renewal-forecast";

// Scheduled/upcoming renewal emails — a forecast projected from each rental's renewal cadence,
// with the real rendered content. Nothing is queued; the daily cron generates these, and some
// are conditional (marked), so this is "what's expected to go out" not a guaranteed queue.
export async function GET() {
  try {
    await requireAdmin();
    const events = await buildRenewalForecast(new Date());
    return NextResponse.json({ events });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg === "Unauthorized" || msg === "Forbidden") {
      return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 401 });
    }
    console.error("admin emails upcoming error:", msg);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
