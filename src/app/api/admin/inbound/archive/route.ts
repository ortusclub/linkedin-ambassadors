import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const [leads, owners, bookings] = await Promise.all([
      prisma.inboundLeadArchive.findMany({ orderBy: { firstContactAt: "desc" } }),
      prisma.user.findMany({ where: { role: "admin" }, select: { email: true, fullName: true }, orderBy: { fullName: "asc" } }),
      prisma.$queryRaw`SELECT key, lead_id AS "leadId", scheduled_at AS "scheduledAt", cancelled FROM inbound_bookings_archive ORDER BY scheduled_at DESC`,
    ]);
    return NextResponse.json({ leads, owners, bookings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: message === "Forbidden" || message === "Unauthorized" ? message : "Could not load archived contacts." }, { status: message === "Forbidden" ? 403 : message === "Unauthorized" ? 401 : 500 });
  }
}
