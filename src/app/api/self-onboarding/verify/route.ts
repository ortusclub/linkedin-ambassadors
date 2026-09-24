import { NextResponse } from "next/server";
import { z } from "zod";
import { sendVerificationCode } from "@/services/email";
import { issueChallenge, verifyChallenge, issuePermit, randomCode } from "@/lib/self-onboarding-gate";

export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });

const sendSchema = z.object({ action: z.literal("send"), email: z.string().email() });
const checkSchema = z.object({ action: z.literal("check"), email: z.string().email(), challenge: z.string().min(1), code: z.string().min(4).max(8) });

// Email-verification gate for the public DIY onboarding page. Send a code, then check it —
// only on success does the client get a `permit` that /api/self-onboarding/start requires.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body?.action === "send") {
      const parsed = sendSchema.safeParse(body);
      if (!parsed.success) return json({ error: "Enter a valid email." }, 400);
      const code = randomCode();
      const challenge = issueChallenge(parsed.data.email, code);
      await sendVerificationCode(parsed.data.email, code);
      return json({ challenge });
    }
    if (body?.action === "check") {
      const parsed = checkSchema.safeParse(body);
      if (!parsed.success) return json({ error: "Enter the 6-digit code." }, 400);
      if (!verifyChallenge(parsed.data.challenge, parsed.data.email, parsed.data.code.trim())) {
        return json({ error: "That code isn't right or has expired. Request a new one." }, 400);
      }
      return json({ permit: issuePermit(parsed.data.email) });
    }
    return json({ error: "Invalid request." }, 400);
  } catch {
    return json({ error: "Verification is temporarily unavailable. Please try again." }, 500);
  }
}
