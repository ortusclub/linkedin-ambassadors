import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public, minimal lookup: given a ?ref= referral code, return the referrer's display
// name and type (e.g. "ortus") so the signup form can adapt — e.g. show the Ortus note
// and dual-currency pricing. Never exposes token or contact details.
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("ref")?.trim() || "";
  const norm = raw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!norm) return NextResponse.json({ referrer: null });
  const r = await prisma.referrer.findUnique({
    where: { slug: norm },
    select: { name: true, type: true, active: true },
  });
  if (!r || !r.active) return NextResponse.json({ referrer: null });
  return NextResponse.json({ referrer: { name: r.name, type: r.type } });
}
