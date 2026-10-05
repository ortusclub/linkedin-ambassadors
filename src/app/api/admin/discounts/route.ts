import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const TYPES = ["percent", "fixed", "flat"];

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
    if (!Number.isFinite(value) || value <= 0) {
      return NextResponse.json({ error: "Enter a value greater than 0." }, { status: 400 });
    }
    if (type === "percent" && value > 100) {
      return NextResponse.json({ error: "Percentage cannot exceed 100." }, { status: 400 });
    }

    const existing = await prisma.discountCode.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json({ error: "That code already exists." }, { status: 400 });
    }

    const created = await prisma.discountCode.create({
      data: {
        code,
        type,
        value,
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
