import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

// Returns the tokenized submissions CSV export URL for Google Sheets (admin-only).
// Shares the RENTALS_EXPORT_KEY secret; only revealed to authed admins.
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const key = process.env.RENTALS_EXPORT_KEY;
    if (!key) {
      return NextResponse.json({ configured: false });
    }
    const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    const url = `${origin}/api/admin/ambassadors/export?key=${encodeURIComponent(key)}`;
    return NextResponse.json({ configured: true, url });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    if (msg === "Forbidden" || msg === "Unauthorized") {
      return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
