import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { emailAction, updateEmailSetup } from "@/lib/onboarding-email";
import { EmailSetupError } from "@/lib/onboarding-email-policy";
import { onboardingSummary } from "@/lib/self-service-onboarding";

export async function POST(req: Request, context: { params: Promise<{ token: string; id: string }> }) {
  const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
  try {
    if (req.headers.get("origin") && req.headers.get("origin") !== new URL(req.url).origin) throw new EmailSetupError("Request origin not allowed.", 403);
    const { token, id } = await context.params;
    if (!z.string().uuid().safeParse(id).success) throw new EmailSetupError("Invalid onboarding reference.");
    const me = await prisma.referrer.findUnique({ where: { token } });
    if (!me?.active) throw new EmailSetupError("Referral portal unavailable.", 404);
    const input = emailAction.safeParse(await req.json());
    if (!input.success) throw new EmailSetupError("Check the email details and consent confirmation.");
    await updateEmailSetup(id, me.id, input.data);
    return NextResponse.json({ session: await onboardingSummary(id, me.id) }, { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof EmailSetupError ? error.message : "Email setup could not be saved. Please retry." }, { status: error instanceof EmailSetupError ? error.status : 500, headers });
  }
}
