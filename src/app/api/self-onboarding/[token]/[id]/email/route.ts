import { NextResponse } from "next/server";
import { emailAction, updateEmailSetup } from "@/lib/onboarding-email";
import { EmailSetupError } from "@/lib/onboarding-email-policy";
import { onboardingSummary, resolveSelfSession, OnboardingError } from "@/lib/self-service-onboarding";

// DIY mirror of the email-setup route, scoped to the token's own session only.
export async function POST(req: Request, context: { params: Promise<{ token: string; id: string }> }) {
  const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
  try {
    if (req.headers.get("origin") && req.headers.get("origin") !== new URL(req.url).origin) throw new EmailSetupError("Request origin not allowed.", 403);
    const { token, id } = await context.params;
    const { sessionId, referrerId } = await resolveSelfSession(token);
    if (id !== sessionId) throw new EmailSetupError("Not found.", 404);
    const input = emailAction.safeParse(await req.json());
    if (!input.success) throw new EmailSetupError("Check the email details and consent confirmation.");
    await updateEmailSetup(sessionId, referrerId, input.data);
    return NextResponse.json({ session: await onboardingSummary(sessionId, referrerId) }, { headers });
  } catch (error) {
    const known = error instanceof EmailSetupError || error instanceof OnboardingError;
    return NextResponse.json({ error: known ? (error as Error).message : "Email setup could not be saved. Please retry." }, { status: known ? (error as { status: number }).status : 500, headers });
  }
}
