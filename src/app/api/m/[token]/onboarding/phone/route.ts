import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkPhoneVerification, PhoneVerificationError, sendPhoneVerification } from "@/lib/phone-verification";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ token: string }> };
const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("send"), phone: z.string().max(40) }),
  z.object({ action: z.literal("check"), phone: z.string().max(40), code: z.string().max(10) }),
]);

export async function POST(req: Request, context: Context) {
  try {
    const origin = req.headers.get("origin");
    if (origin && origin !== new URL(req.url).origin) return NextResponse.json({ error: "Request origin not allowed." }, { status: 403 });
    const { token } = await context.params;
    const referrer = await prisma.referrer.findUnique({ where: { token }, select: { id: true, active: true } });
    if (!referrer?.active) return NextResponse.json({ error: "This referral portal is not available." }, { status: 404 });
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
