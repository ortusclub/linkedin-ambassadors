import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

    const applications = await prisma.ambassadorApplication.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Enrich with current contact number from user profiles
    const emails = [...new Set(applications.map(a => a.email))];
    const users = emails.length > 0
      ? await prisma.user.findMany({
          where: { email: { in: emails } },
          select: { email: true, contactNumber: true },
        })
      : [];
    const contactMap = new Map(users.map(u => [u.email, u.contactNumber]));

    const enriched = applications.map(a => ({
      ...a,
      contactNumber: contactMap.get(a.email) || a.contactNumber,
    }));

    return NextResponse.json({ applications: enriched });
  } catch (error) {
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
