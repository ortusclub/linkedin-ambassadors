import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";

// GET /api/vetting — has this renter completed vetting?
export async function GET() {
  try {
    const user = await requireAuth();
    const u = await prisma.user.findUnique({
      where: { id: user.id },
      select: { vettedAt: true, vettingInfo: true },
    });
    return NextResponse.json({ vetted: !!u?.vettedAt, info: u?.vettingInfo ?? null });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/vetting — save the renter's vetting answers + record their agreement.
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const b = await req.json().catch(() => ({}));

    // Renter opened the vetting form — stamp once (for drop-off tracking). No-op if already started/vetted.
    if (b.action === "start") {
      const u = await prisma.user.findUnique({ where: { id: user.id }, select: { vettingStartedAt: true } });
      if (!u?.vettingStartedAt) {
        await prisma.user.update({ where: { id: user.id }, data: { vettingStartedAt: new Date() } });
      }
      return NextResponse.json({ ok: true });
    }

    if (!b.agreed) {
      return NextResponse.json({ error: "Please agree to the rules to continue." }, { status: 400 });
    }

    // Renter now just confirms the ground rules (no company/role form). Keep any
    // optional fields if a client still sends them, but they are not required.
    const info = {
      company: String(b.company || "").trim(),
      website: String(b.website || "").trim(),
      role: String(b.role || "").trim(),
      useCase: String(b.useCase || "").trim(),
      tools: String(b.tools || "").trim(),
      agreedToRules: true,
      agreedToUsePolicy: true,
    };

    await prisma.user.update({
      where: { id: user.id },
      data: { vettedAt: new Date(), vettingInfo: info as unknown as Prisma.InputJsonValue, vettingReview: "pending" },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
