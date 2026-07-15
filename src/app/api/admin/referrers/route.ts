import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { randomBytes } from "crypto";

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function authError(error: unknown) {
  if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
    return NextResponse.json({ error: error.message }, { status: error.message === "Forbidden" ? 403 : 401 });
  }
  return null;
}

export async function GET() {
  try {
    await requireAdmin();
    const referrers = await prisma.referrer.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ referrers });
  } catch (error) {
    return authError(error) ?? NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const name = (body.name || "").trim();
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    // Unique slug from the name (append -2, -3… on collision).
    const base = slugify(name) || "referrer";
    let slug = base;
    for (let i = 2; await prisma.referrer.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;

    const token = randomBytes(18).toString("base64url");
    const referrer = await prisma.referrer.create({
      data: {
        slug,
        token,
        name,
        type: body.type === "ambassador" ? "ambassador" : "marketer",
        channel: body.channel?.trim() || null,
        contactMethod: body.contactMethod || null,
        contactHandle: body.contactHandle?.trim() || null,
        assignedDay: body.assignedDay?.trim() || null,
        assignedLocation: body.assignedLocation?.trim() || null,
      },
    });
    return NextResponse.json({ referrer }, { status: 201 });
  } catch (error) {
    return authError(error) ?? NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
