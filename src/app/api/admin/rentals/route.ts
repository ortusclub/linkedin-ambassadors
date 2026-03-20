import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

export async function GET() {
  try {
    await requireAdmin();

    const rentals = await prisma.rental.findMany({
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        linkedinAccount: {
          select: { id: true, linkedinName: true, connectionCount: true, notes: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ rentals });
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
