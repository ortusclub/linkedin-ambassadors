import { NextResponse } from "next/server";
import { z } from "zod";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  source: z.enum(["web", "electron"]).optional(),
});

const MAX_ATTEMPTS = 5;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, code, source } = schema.parse(body);
    const emailLower = email.toLowerCase();

    const entry = await prisma.verificationCode.findUnique({
      where: { email: emailLower },
    });

    if (!entry) {
      return NextResponse.json(
        { error: "No verification code found. Please request a new one." },
        { status: 400 }
      );
    }

    if (entry.expiresAt.getTime() < Date.now()) {
      await prisma.verificationCode.delete({ where: { email: emailLower } });
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    if (entry.attempts >= MAX_ATTEMPTS) {
      await prisma.verificationCode.delete({ where: { email: emailLower } });
      return NextResponse.json(
        { error: "Too many incorrect attempts. Please request a new code." },
        { status: 429 }
      );
    }

    const valid = await compare(code, entry.codeHash);
    if (!valid) {
      await prisma.verificationCode.update({
        where: { email: emailLower },
        data: { attempts: { increment: 1 } },
      });
      return NextResponse.json(
        { error: "Incorrect code. Please try again." },
        { status: 401 }
      );
    }

    await prisma.verificationCode.delete({ where: { email: emailLower } });

    let user = await prisma.user.findUnique({
      where: { email: emailLower },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: emailLower,
          fullName: emailLower.split("@")[0],
          role: "customer",
          status: "active",
          emailVerified: new Date(),
        },
      });
    } else if (!user.emailVerified) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
    }

    if (source === "web") {
      await createSession(user.id, user.role === "admin");

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
      });
    } else {
      const { v4: uuid } = await import("uuid");
      const token = uuid();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await prisma.session.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
        },
      });

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
        token,
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Verify-code error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
