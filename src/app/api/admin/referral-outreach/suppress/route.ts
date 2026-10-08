import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Do-not-contact list for referral outreach. POST adds/updates (with a reason); DELETE removes.
const postSchema = z.object({ email: z.string().trim().email(), reason: z.string().trim().max(500).optional() });
const delSchema = z.object({ email: z.string().trim().email() });

function authStatus(msg: string) { return msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500; }

export async function POST(req: Request) {
  try {
    const user = await requireAdmin();
    const { email, reason } = postSchema.parse(await req.json());
    const key = email.toLowerCase();
    await prisma.outreachSuppression.upsert({
      where: { email: key },
      update: { reason: reason || null, createdBy: user.fullName || user.email },
      create: { email: key, reason: reason || null, createdBy: user.fullName || user.email },
    });
    return NextResponse.json({ ok: true, email: key });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    const msg = error instanceof Error ? error.message : "Could not update";
    return NextResponse.json({ error: msg }, { status: authStatus(msg) });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const { email } = delSchema.parse(await req.json());
    await prisma.outreachSuppression.deleteMany({ where: { email: email.toLowerCase() } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    const msg = error instanceof Error ? error.message : "Could not update";
    return NextResponse.json({ error: msg }, { status: authStatus(msg) });
  }
}
