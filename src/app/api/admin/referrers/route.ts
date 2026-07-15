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

    // The slug doubles as the referral CODE, so make it unique — name + 4 digits
    // (e.g. "lewis-4823") — not a bare first name, so a manually-typed code maps to
    // exactly one referrer even if two share a name.
    const base = slugify(name) || "ref";
    let slug = "";
    do { slug = `${base}-${Math.floor(1000 + Math.random() * 9000)}`; } while (await prisma.referrer.findUnique({ where: { slug } }));

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
