import { NextResponse } from "next/server";
import { z } from "zod";
import { startPrimaryRecovery, verifyPrimaryRecovery } from "@/lib/primary-email-recovery";
import { ownerSignInCode } from "@/lib/owner-sign-in-code";
import { EmailSetupError } from "@/lib/onboarding-email-policy";
export const runtime = "nodejs";
const token = z.string().regex(/^[a-f0-9]{64}$/);
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), email: z.string().trim().email().max(254).transform(s => s.toLowerCase()), consent: z.literal(true) }),
  z.object({ action: z.literal("verify"), token, code: z.string().regex(/^\d{6}$/) }),
  z.object({ action: z.literal("code"), token }),
]);
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
export async function POST(req: Request) {
  try {
    if (req.headers.get("origin") !== new URL(req.url).origin) return json({ error: "Open the guide on this website to continue." }, 403);
    if (Number(req.headers.get("content-length") || 0) > 2000) return json({ error: "Request too large" }, 413);
    const raw = await req.text();
    if (raw.length > 2000) return json({ error: "Request too large" }, 413);
    const input = schema.parse(JSON.parse(raw));
    if (input.action === "start") return json(await startPrimaryRecovery(input.email, req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || "unknown", "restriction"));
    if (input.action === "verify") await verifyPrimaryRecovery(input.token, input.code);
    return json(await ownerSignInCode(input.token));
  } catch (error) {
    if (error instanceof EmailSetupError) return json({ error: error.message }, error.status);
    if (error instanceof z.ZodError || error instanceof SyntaxError) return json({ error: "Check your email, consent and six-digit verification code." }, 400);
    return json({ error: "We could not complete this step. Please try again or book a call." }, 503);
  }
}
