import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { cookies, headers } from "next/headers";

async function getUser() {
  // First try Bearer token (from Electron app)
  const headerList = await headers();
  const authHeader = headerList.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });
    if (session && session.expiresAt > new Date()) {
      return session.user;
    }
  }

  // Fall back to cookie-based auth
  return requireAuth();
}

export async function GET() {
  try {
    const user = await getUser();

    // Find LinkedIn accounts that belong to this ambassador
    // Ambassador accounts have notes containing the user's email
    const accounts = await prisma.linkedInAccount.findMany({
      where: {
        notes: { contains: user.email },
      },
      select: {
        id: true,
        linkedinName: true,
        linkedinHeadline: true,
        linkedinUrl: true,
        profilePhotoUrl: true,
        connectionCount: true,
        status: true,
        monthlyPrice: true,
        gologinProfileId: true,
        notes: true,
        createdAt: true,
        rentals: {
          where: { status: "active" },
          select: { id: true, startDate: true, currentPeriodEnd: true },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ accounts });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
