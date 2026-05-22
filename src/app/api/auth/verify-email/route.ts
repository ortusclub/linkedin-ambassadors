import { NextResponse } from "next/server";
import { z } from "zod";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendVerificationCode } from "@/services/email";

const schema = z.object({
  email: z.string().email(),
});

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = schema.parse(body);
    const emailLower = email.toLowerCase();

    const existing = await prisma.verificationCode.findUnique({
      where: { email: emailLower },
    });

    if (existing) {
      const codeCreatedAt = existing.expiresAt.getTime() - CODE_TTL_MS;
      const sinceCreated = Date.now() - codeCreatedAt;
      if (sinceCreated < RESEND_COOLDOWN_MS) {
        const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - sinceCreated) / 1000);
        return NextResponse.json(
          { error: `Please wait ${waitSeconds} seconds before requesting a new code` },
          { status: 429 }
        );
      }
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await hash(code, 10);
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);

    await prisma.verificationCode.upsert({
      where: { email: emailLower },
      create: { email: emailLower, codeHash, expiresAt, attempts: 0 },
      update: { codeHash, expiresAt, attempts: 0 },
    });

    await sendVerificationCode(email, code);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Verify-email error:", error);
    return NextResponse.json(
      { error: "Failed to send verification code" },
      { status: 500 }
    );
  }
}
