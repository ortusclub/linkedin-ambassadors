import { NextResponse } from "next/server";
import { z } from "zod";
import { sendVerificationCode } from "@/services/email";

// In-memory verification code store
// Key: email, Value: { code, expiresAt }
const verificationCodes = new Map<
  string,
  { code: string; expiresAt: number; attempts: number }
>();

// Clean up expired codes periodically
setInterval(() => {
  const now = Date.now();
  for (const [email, entry] of verificationCodes) {
    if (entry.expiresAt < now) {
      verificationCodes.delete(email);
    }
  }
}, 60_000);

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
    if (existing && existing.expiresAt - 9 * 60 * 1000 > Date.now()) {
      // Code was created less than 60 seconds ago
      return NextResponse.json(
        { error: "Please wait before requesting a new code" },
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
