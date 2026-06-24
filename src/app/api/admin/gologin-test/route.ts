import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { shareProfile, unshareProfile } from "@/services/gologin";

// Admin-only test endpoint for validating GoLogin email share/unshare.
// Safe: only touches the GoLogin profile you pass in. No DB writes.
export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { profileId, email, action, token, shareId, method, path, body } = await req.json();
    const overrideToken = typeof token === "string" && token.trim() ? token.trim() : undefined;

    // TEMP probe: call any GoLogin API path server-side to map the public share-link API.
    if (action === "raw") {
      if (!path) return NextResponse.json({ error: "path required" }, { status: 400 });
      const res = await fetch(`https://api.gologin.com${path}`, {
        method: method || "GET",
        headers: {
          Authorization: `Bearer ${overrideToken || process.env.GOLOGIN_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await res.text();
      let parsed: unknown; try { parsed = JSON.parse(text); } catch { parsed = text; }
      return NextResponse.json({ ok: res.ok, status: res.status, body: parsed });
    }

    if (action === "share") {
      if (!profileId || !email) {
        return NextResponse.json({ error: "profileId and email are required to share" }, { status: 400 });
      }
      const result = await shareProfile(profileId, email, overrideToken);
      const newShareId = Array.isArray(result) ? result[0]?.id : result?.id;
      return NextResponse.json({ ok: true, action, result, shareId: newShareId });
    }
    if (action === "unshare") {
      if (!shareId) {
        return NextResponse.json({ error: "shareId is required to revoke — copy it from a Grant result" }, { status: 400 });
      }
      const result = await unshareProfile(shareId, overrideToken);
      return NextResponse.json({ ok: true, action, result });
    }
    return NextResponse.json({ error: "action must be 'share' or 'unshare'" }, { status: 400 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    if (msg === "Forbidden" || msg === "Unauthorized") {
      return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
