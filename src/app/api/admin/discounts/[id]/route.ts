import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Toggle active (or edit note / limits).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();

    const data: { active?: boolean; note?: string } = {};
    if (typeof body.active === "boolean") data.active = body.active;
    if (typeof body.note === "string") data.note = body.note.slice(0, 200);

    const updated = await prisma.discountCode.update({ where: { id }, data });
    return NextResponse.json({ ok: true, active: updated.active });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Update discount error:", error);
    return NextResponse.json({ error: "Could not update discount code" }, { status: 500 });
  }
}

// Delete a code outright (history isn't needed once removed).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.discountCode.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Delete discount error:", error);
    return NextResponse.json({ error: "Could not delete discount code" }, { status: 500 });
  }
}
