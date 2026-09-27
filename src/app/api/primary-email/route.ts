import { NextResponse } from "next/server";
import { z } from "zod";
import { EmailSetupError } from "@/lib/onboarding-email-policy";
import { startPrimaryRecovery, verifyPrimaryRecovery, primaryRecoveryStatus, completePrimaryRecovery } from "@/lib/primary-email-recovery";
export const runtime = "nodejs";
export const maxDuration = 60;
const token = z.string().regex(/^[a-f0-9]{64}$/);
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), email: z.string().trim().email().max(254).transform(s => s.toLowerCase()), consent: z.literal(true) }),
  z.object({ action: z.literal("verify"), token, code: z.string().regex(/^\d{6}$/) }),
  z.object({ action: z.literal("status"), token }),
  z.object({ action: z.literal("complete"), token, confirmed: z.literal(true) }),
]);
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
export async function POST(req: Request) {
  try {
    if (req.headers.get("origin") !== new URL(req.url).origin) return json({ error: "Please open the guide on this website to continue." }, 403);
    if (Number(req.headers.get("content-length") || 0) > 2000) return json({ error: "Request too large" }, 413);
    const raw = await req.text();
    if (raw.length > 2000) return json({ error: "Request too large" }, 413);
    const input = schema.parse(JSON.parse(raw));
    if (input.action === "start") {
      // Vercel supplies/overwrites this header; do not trust a user-supplied X-Forwarded-For.
      const ip = req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || "unknown";
      return json(await startPrimaryRecovery(input.email, ip));
    }
    if (input.action === "verify") return json(await verifyPrimaryRecovery(input.token, input.code));
    if (input.action === "complete") return json(await completePrimaryRecovery(input.token));
    return json(await primaryRecoveryStatus(input.token));
  } catch (error) {
    if (error instanceof EmailSetupError) return json({ error: error.message }, error.status);
    if (error instanceof z.ZodError || error instanceof SyntaxError) return json({ error: "Check your email, consent, and six-digit code." }, 400);
    return json({ error: "We could not complete that step. Please try again or book a call with our team." }, 503);
  }
}
