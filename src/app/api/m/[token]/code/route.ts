import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { accountSignInCode } from "@/lib/owner-sign-in-code";

export const dynamic = "force-dynamic";

const schema = z.object({ applicationId: z.string().min(1) });
const normUrl = (u?: string | null) => (u || "").split("?")[0].replace(/\/+$/, "").toLowerCase().trim();

// Referrer self-serve authenticator code. The portal token proves the referrer; we only hand back
// a code for an account they actually referred, and only when codeForAccount deems it eligible
// (restricted, or an in-progress onboarding state — never a healthy live/rented account).
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const headers = { "Cache-Control": "no-store" };
  try {
    const { token } = await params;
    const me = await prisma.referrer.findUnique({ where: { token }, select: { slug: true } });
    if (!me) return NextResponse.json({ error: "Not found" }, { status: 404, headers });

    const { applicationId } = schema.parse(await req.json());
    const app = await prisma.ambassadorApplication.findUnique({ where: { id: applicationId }, select: { referredBy: true, linkedinUrl: true, email: true } });
    if (!app || (app.referredBy || "").trim().toLowerCase() !== me.slug.trim().toLowerCase()) {
      return NextResponse.json({ error: "We couldn't find that account under your referrals." }, { status: 404, headers });
    }

    // Resolve the linked LinkedIn account the same way the portal does: by profile URL, then by a
    // unique "Owner: <email>" line in the account notes.
    const accounts = await prisma.linkedInAccount.findMany({ where: { removedAt: null }, select: { id: true, linkedinUrl: true, loginEmail: true, notes: true } });
    const u = normUrl(app.linkedinUrl);
    const email = (app.email || "").toLowerCase();
    const byUrl = u ? accounts.find((a) => normUrl(a.linkedinUrl) === u) : undefined;
    const owners = accounts.filter((a) => (a.notes || "").match(/Owner:\s*(\S+@\S+)/)?.[1]?.replace(/\.$/, "")?.toLowerCase() === email);
    const acc = byUrl || (email && owners.length === 1 ? owners[0] : undefined);
    if (!acc || !acc.loginEmail) return NextResponse.json({ error: "No linked account with a login email yet. Ask the team." }, { status: 404, headers });

    const result = await accountSignInCode(acc.id, acc.loginEmail);
    return NextResponse.json({ code: result.code, expiresAt: result.expiresAt }, { headers });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid request." }, { status: 400, headers });
    const status = (error as { status?: number })?.status;
    const message = error instanceof Error ? error.message : "Couldn't get the code. Please try again.";
    return NextResponse.json({ error: message }, { status: typeof status === "number" && status >= 400 && status < 600 ? status : 500, headers });
  }
}
