import { NextResponse } from "next/server";
import { z } from "zod";
import { sendVerificationCode } from "@/services/email";

// In-memory verification code store, persisted on globalThis to survive hot reloads
// Key: email, Value: { code, expiresAt, attempts }
type CodeEntry = { code: string; expiresAt: number; attempts: number };

const globalForCodes = globalThis as typeof globalThis & {
  __verificationCodes?: Map<string, CodeEntry>;
  __verificationCleanup?: ReturnType<typeof setInterval>;
};

if (!globalForCodes.__verificationCodes) {
  globalForCodes.__verificationCodes = new Map<string, CodeEntry>();
}

const verificationCodes = globalForCodes.__verificationCodes;

// Clean up expired codes periodically
if (typeof globalForCodes.__verificationCleanup === "undefined") {
  (globalForCodes as Record<string, unknown>).__verificationCleanup = setInterval(() => {
    const now = Date.now();
    for (const [email, entry] of verificationCodes) {
      if (entry.expiresAt < now) {
        verificationCodes.delete(email);
      }
    }
  }, 60_000);
}

// Export for use by verify-code route
export { verificationCodes };

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = schema.parse(body);

    // Rate limit: don't allow re-sending within 60 seconds
    const existing = verificationCodes.get(email.toLowerCase());
    const codeCreatedAt = existing ? existing.expiresAt - 10 * 60 * 1000 : 0;
    const secondsSinceCreated = Math.floor((Date.now() - codeCreatedAt) / 1000);
    if (existing && secondsSinceCreated < 60) {
      const waitSeconds = 60 - secondsSinceCreated;
      return NextResponse.json(
        { error: `Please wait ${waitSeconds} seconds before requesting a new code` },
        { status: 429 }
      );
    }

    // Generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));

    // Store with 10-minute expiry
    verificationCodes.set(email.toLowerCase(), {
      code,
      expiresAt: Date.now() + 10 * 60 * 1000,
      attempts: 0,
    });

    // Send the email
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
