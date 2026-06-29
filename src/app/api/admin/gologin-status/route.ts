import { NextResponse } from "next/server";

// READ-ONLY GoLogin plan/quota check (klabber + master). CRON_SECRET protected.
// No mutations — just reports plan expiry and share usage so we can confirm a renewal.
export const dynamic = "force-dynamic";
const API = "https://api.gologin.com";

async function ws(id: string, token?: string) {
  if (!token) return { error: "no token" };
  const r = await fetch(`${API}/workspaces/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) return { status: r.status, error: (await r.text()).slice(0, 120) };
  const b = (await r.json()) as Record<string, unknown>;
  return {
    name: b.name, planName: b.planName,
    activeSharesCount: b.activeSharesCount, planSharesMax: b.planSharesMax,
    profilesCount: b.profilesCount, planProfilesMax: b.planProfilesMax,
    planExpiresAt: b.planExpiresAt, isUnpaid: b.isUnpaid,
  };
}

export async function GET(req: Request) {
  if (new URL(req.url).searchParams.get("secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    klabber: await ws("69c1f7df88b94e048876f1d8", process.env.GOLOGIN_API_TOKEN_KLABBER),
    master: await ws("68654b73cd7edf1e3ed6d13f", process.env.GOLOGIN_API_TOKEN),
  });
}
