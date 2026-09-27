import { NextResponse } from "next/server";
import { sendOnboardingReminders } from "@/lib/onboarding-reminders";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json(await sendOnboardingReminders()); }
  catch { return NextResponse.json({ error: "Reminder delivery unavailable" }, { status: 503 }); }
}
