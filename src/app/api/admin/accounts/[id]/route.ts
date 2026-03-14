import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  linkedinName: z.string().optional(),
  linkedinHeadline: z.string().optional(),
  linkedinUrl: z.string().optional(),
  connectionCount: z.number().int().optional(),
  industry: z.string().optional(),
  location: z.string().optional(),
  profileScreenshotUrl: z.string().optional(),
  profilePhotoUrl: z.string().optional(),
  proxyHost: z.string().optional(),
  proxyPort: z.number().int().optional(),
  proxyUsername: z.string().optional(),
  proxyPassword: z.string().optional(),
  accountAgeMonths: z.number().int().optional(),
  hasSalesNav: z.boolean().optional(),
  notes: z.string().optional(),
  status: z.enum(["available", "rented", "maintenance", "retired"]).optional(),
  gologinProfileId: z.string().optional(),
}).partial();

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const account = await prisma.linkedInAccount.findUnique({
      where: { id },
      include: {
        rentals: {
          include: { user: { select: { id: true, fullName: true, email: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!account) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ account });
  } catch (error) {
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const data = updateSchema.parse(body);

    const account = await prisma.linkedInAccount.update({
      where: { id },
      data,
    });

    return NextResponse.json({ account });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const account = await prisma.linkedInAccount.findUnique({ where: { id } });
    if (!account) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (account.status === "rented") {
      return NextResponse.json(
        { error: "Cannot delete a currently rented account" },
        { status: 400 }
      );
    }

    await prisma.linkedInAccount.update({
      where: { id },
      data: { status: "retired" },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
