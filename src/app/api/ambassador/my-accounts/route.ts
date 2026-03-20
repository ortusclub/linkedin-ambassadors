import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { cookies, headers } from "next/headers";
import { z } from "zod";

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
        ambassadorPayment: true,
        gologinProfileId: true,
        notes: true,
        proxyHost: true,
        proxyPort: true,
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

const updateSchema = z.object({
  id: z.string().uuid(),
  linkedinName: z.string().min(1).optional(),
  linkedinHeadline: z.string().optional(),
  linkedinUrl: z.string().optional(),
  industry: z.string().optional(),
  location: z.string().optional(),
  connectionCount: z.number().int().optional(),
  profilePhotoUrl: z.string().optional(),
  status: z.enum(["available", "unavailable"]).optional(),
});

export async function PATCH(req: Request) {
  try {
    const user = await getUser();
    const body = await req.json();
    const data = updateSchema.parse(body);

    // Verify the account belongs to this user
    const account = await prisma.linkedInAccount.findUnique({
      where: { id: data.id },
      select: { notes: true },
    });

    if (!account || !account.notes?.includes(user.email)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { id, ...updateData } = data;
    const filtered = Object.fromEntries(
      Object.entries(updateData).filter(([, v]) => v !== undefined)
    );

    const updated = await prisma.linkedInAccount.update({
      where: { id },
      data: filtered,
    });

    return NextResponse.json({ account: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
