import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { shareProfile, unshareProfile } from "@/services/gologin";

// Admin-only test endpoint for validating GoLogin email share/unshare.
// Safe: only touches the GoLogin profile you pass in. No DB writes.
export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { profileId, email, action } = await req.json();
    if (!profileId || !email || (action !== "share" && action !== "unshare")) {
      return NextResponse.json(
        { error: "profileId, email, and action ('share' or 'unshare') are required" },
        { status: 400 }
      );
    }
    const result =
      action === "share"
        ? await shareProfile(profileId, email)
        : await unshareProfile(profileId, email);
    return NextResponse.json({ ok: true, action, result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    if (msg === "Forbidden" || msg === "Unauthorized") {
      return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
