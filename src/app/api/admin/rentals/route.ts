import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

export async function GET() {
  try {
    await requireAdmin();

    const rentals = await prisma.rental.findMany({
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            contactNumber: true,
            company: true,
            createdAt: true,
          },
        },
        linkedinAccount: {
          select: {
            id: true,
            linkedinName: true,
            connectionCount: true,
            gologinProfileId: true,
            notes: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // How many accounts each renter currently has (active or pending_access).
    const liveCounts = new Map<string, number>();
    for (const r of rentals) {
      if (r.status === "active" || r.status === "pending_access") {
        liveCounts.set(r.userId, (liveCounts.get(r.userId) || 0) + 1);
      }
    }
    const enriched = rentals.map((r) => ({
      ...r,
      renterAccountsLive: liveCounts.get(r.userId) || 0,
    }));

    return NextResponse.json({ rentals: enriched });
  } catch (error) {
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const createRentalSchema = z.object({
  userEmail: z.string().email(),
  linkedinAccountId: z.string().uuid(),
  startDate: z.string(),
  endDate: z.string().optional(),
  autoRenew: z.boolean().default(true),
});

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json();
    const data = createRentalSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { email: data.userEmail } });
    if (!user) {
      return NextResponse.json({ error: "User not found with that email" }, { status: 404 });
    }

    const account = await prisma.linkedInAccount.findUnique({ where: { id: data.linkedinAccountId } });
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const rental = await prisma.rental.create({
      data: {
        userId: user.id,
        linkedinAccountId: data.linkedinAccountId,
        status: "active",
        startDate: new Date(data.startDate),
        currentPeriodEnd: data.endDate ? new Date(data.endDate) : new Date(new Date(data.startDate).getTime() + 30 * 24 * 60 * 60 * 1000),
        autoRenew: data.autoRenew,
      },
    });

    // Update account status to rented
    await prisma.linkedInAccount.update({
      where: { id: data.linkedinAccountId },
      data: { status: "rented" },
    });

    return NextResponse.json({ rental }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues.map(i => i.message).join(", ") }, { status: 400 });
    }
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Forbidden" ? 403 : 401 });
    }
    console.error("Create rental error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Edit tracker fields: rental Notes (campaign goal / issues) and the renter's Company.
const patchSchema = z.object({
  id: z.string().uuid(),
  notes: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
});

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const data = patchSchema.parse(await req.json());

    const rental = await prisma.rental.findUnique({
      where: { id: data.id },
      select: { id: true, userId: true },
    });
    if (!rental) {
      return NextResponse.json({ error: "Rental not found" }, { status: 404 });
    }

    if (data.notes !== undefined) {
      await prisma.rental.update({ where: { id: data.id }, data: { notes: data.notes } });
    }
    if (data.company !== undefined) {
      await prisma.user.update({ where: { id: rental.userId }, data: { company: data.company } });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues.map(i => i.message).join(", ") }, { status: 400 });
    }
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Forbidden" ? 403 : 401 });
    }
    console.error("Patch rental error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
