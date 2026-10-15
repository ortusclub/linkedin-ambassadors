import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// Place a short-term hold (1 or 2 days) on an account so it drops out of every catalogue and the
// normal checkout while reserved. Admin-initiated ("hold for someone"); self-serve reserves on the
// unlisted catalogues hit their own endpoint. DELETE releases early.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const { days, heldFor } = (await req.json()) as { days?: number; heldFor?: string };
    const d = days === 2 ? 2 : 1; // cap at 2 days
    const account = await prisma.linkedInAccount.findUnique({ where: { id }, select: { id: true } });
    if (!account) return NextResponse.json({ error: "not found" }, { status: 404 });
    const now = new Date();
    const heldUntil = new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
    await prisma.linkedInAccount.update({
      where: { id },
      data: { heldUntil, heldFor: (heldFor || "").trim().slice(0, 200) || null, heldBy: admin.fullName || admin.email, heldAt: now },
    });
    return NextResponse.json({ ok: true, heldUntil });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const code = msg === "Forbidden" ? 403 : msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.linkedInAccount.update({
      where: { id },
      data: { heldUntil: null, heldFor: null, heldBy: null, heldAt: null },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const code = msg === "Forbidden" ? 403 : msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
