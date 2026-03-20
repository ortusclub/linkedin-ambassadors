import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSession } from "@/lib/auth";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).optional(),
  fullName: z.string().min(1),
  contactMethod: z.enum(["whatsapp", "telegram"]).optional(),
  contactHandle: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, fullName, contactMethod, contactHandle } = registerSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = password ? await hashPassword(password) : null;
    const contactNumber = contactHandle ? `${contactMethod || "whatsapp"}:${contactHandle}` : null;
    const user = await prisma.user.create({
      data: { email, passwordHash, fullName, contactNumber },
    });

    // Don't create session here — user will verify email first
    try { await createSession(user.id); } catch {}

    return NextResponse.json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues.map(i => i.message).join(", ") }, { status: 400 });
    }
    console.error("Registration error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
