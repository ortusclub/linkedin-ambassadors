import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const TYPES = ["percent", "fixed", "flat", "tiered"];

interface TierInput { verified?: boolean; minConnections?: number; price?: number }
function cleanTiers(raw: unknown): { tiers?: { verified: boolean; minConnections: number; price: number }[]; error?: string } {
  if (!Array.isArray(raw) || raw.length === 0) return { error: "Add at least one pricing tier." };
  const tiers = [];
  for (const t of raw as TierInput[]) {
    const price = Number(t.price);
    const minConnections = Number(t.minConnections ?? 0);
    if (!Number.isFinite(price) || price < 0) return { error: "Every tier needs a price of 0 or more." };
    if (!Number.isFinite(minConnections) || minConnections < 0) return { error: "Tier connection thresholds must be 0 or more." };
    tiers.push({ verified: !!t.verified, minConnections: Math.round(minConnections), price: Math.round(price * 100) / 100 });
  }
  return { tiers };
}

export async function GET() {
  try {
    await requireAdmin();
    const codes = await prisma.discountCode.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({
      codes: codes.map((c) => ({
        id: c.id,
        code: c.code,
        type: c.type,
        value: Number(c.value),
        tiers: c.tiers ?? null,
        active: c.active,
        maxRedemptions: c.maxRedemptions,
        timesRedeemed: c.timesRedeemed,
        expiresAt: c.expiresAt,
        note: c.note,
        createdAt: c.createdAt,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("List discounts error:", error);
    return NextResponse.json({ error: "Could not load discount codes" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();

    const code: string = (body.code || "").toString().trim().toUpperCase();
    const type: string = TYPES.includes(body.type) ? body.type : "percent";
    const value = Number(body.value);
    const maxRedemptions = Number(body.maxRedemptions);
    const expiresAt: string | undefined = body.expiresAt; // yyyy-mm-dd
    const note: string | undefined = body.note ? String(body.note).slice(0, 200) : undefined;

    if (!code || !/^[A-Z0-9_-]{3,40}$/.test(code)) {
      return NextResponse.json(
        { error: "Code must be 3–40 characters: letters, numbers, - or _." },
        { status: 400 }
      );
    }

    // Tiered codes carry a price book instead of a single value; others need a positive value.
    let tiersJson: { verified: boolean; minConnections: number; price: number }[] | null = null;
    let storedValue = value;
    if (type === "tiered") {
      const r = cleanTiers(body.tiers);
      if (r.error) return NextResponse.json({ error: r.error }, { status: 400 });
      tiersJson = r.tiers!;
      storedValue = 0; // unused for tiered
    } else {
      if (!Number.isFinite(value) || value <= 0) {
        return NextResponse.json({ error: "Enter a value greater than 0." }, { status: 400 });
      }
      if (type === "percent" && value > 100) {
        return NextResponse.json({ error: "Percentage cannot exceed 100." }, { status: 400 });
      }
    }

    const existing = await prisma.discountCode.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json({ error: "That code already exists." }, { status: 400 });
    }

    const created = await prisma.discountCode.create({
      data: {
        code,
        type,
        value: storedValue,
        tiers: tiersJson ?? undefined,
        note,
        maxRedemptions: Number.isFinite(maxRedemptions) && maxRedemptions > 0 ? Math.round(maxRedemptions) : null,
        expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59`) : null,
      },
    });

    return NextResponse.json({ code: { ...created, value: Number(created.value) } });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Create discount error:", error);
    return NextResponse.json({ error: "Could not create discount code" }, { status: 500 });
  }
}
