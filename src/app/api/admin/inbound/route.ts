import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// List inbound leads (Telegram messagers, call bookings) for the admin Inbound tab.
export async function GET() {
  try {
    await requireAdmin();
    const leads = await prisma.inboundLead.findMany({ orderBy: { lastContactAt: "desc" } });
    return NextResponse.json({ leads });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    if (msg === "Forbidden" || msg === "Unauthorized") {
      return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Edit a lead's status or notes (admin-only).
export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
    const { id, status, notes } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const data: { status?: string; notes?: string } = {};
    if (typeof status === "string") data.status = status;
    if (typeof notes === "string") data.notes = notes;
    const lead = await prisma.inboundLead.update({ where: { id }, data });
    return NextResponse.json({ ok: true, lead });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    if (msg === "Forbidden" || msg === "Unauthorized") {
      return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
