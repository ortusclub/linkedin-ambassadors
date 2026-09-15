import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkPhoneVerification, PhoneVerificationError, sendPhoneVerification } from "@/lib/phone-verification";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ slug: string }> };
const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("send"), phone: z.string().max(40) }),
  z.object({ action: z.literal("check"), phone: z.string().max(40), code: z.string().max(10) }),
]);

// Owner-side mobile verification, keyed to the referrer's public slug. The token it
// mints is bound to the referrer id, matching what reserveOnboarding asserts on submit.
export async function POST(req: Request, context: Context) {
  try {
    const origin = req.headers.get("origin");
    if (origin && origin !== new URL(req.url).origin) return NextResponse.json({ error: "Request origin not allowed." }, { status: 403 });
    const { slug } = await context.params;
    const referrer = await prisma.referrer.findUnique({ where: { slug }, select: { id: true, active: true } });
    if (!referrer?.active) return NextResponse.json({ error: "This onboarding link is not available." }, { status: 404 });
    const parsed = input.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Check the mobile number and try again." }, { status: 400 });
    if (parsed.data.action === "send") {
      await sendPhoneVerification(parsed.data.phone);
      return NextResponse.json({ sent: true });
    }
    const verificationToken = await checkPhoneVerification(parsed.data.phone, parsed.data.code, referrer.id);
    return NextResponse.json({ verified: true, verificationToken });
  } catch (error) {
    if (error instanceof PhoneVerificationError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Mobile verification is temporarily unavailable." }, { status: 500 });
  }
}
