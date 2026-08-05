import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { regeneratePublicShareLink, tokenForAccount } from "@/services/gologin";

// Regenerate an account's GoLogin public share link (deletes the old one, mints a
// fresh URL) and store it. Used to rotate a link that was exposed to a renter, or
// to fix a dead/"link not found" link. Runs server-side so it can use the right
// workspace token (master vs klabber).
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Admin session OR the shared CRON_SECRET bearer (lets tooling trigger it).
    const bearer = req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
    if (!bearer) await requireAdmin();
    const { id } = await params;
    const acc = await prisma.linkedInAccount.findUnique({
      where: { id },
      select: { linkedinName: true, gologinProfileId: true, gologinAccount: true },
    });
    if (!acc) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    if (!acc.gologinProfileId) return NextResponse.json({ error: "No GoLogin profile on this account" }, { status: 400 });

    const token = tokenForAccount(acc.gologinAccount);
    const link = await regeneratePublicShareLink(acc.gologinProfileId, undefined, token);
    await prisma.linkedInAccount.update({ where: { id }, data: { gologinShareLink: link.publicUrl } });

    return NextResponse.json({ ok: true, name: acc.linkedinName, shareLink: link.publicUrl });
  } catch (error) {
    if (error instanceof Error && /unauthorized|forbidden/i.test(error.message)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("share-link regenerate error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Something went wrong" }, { status: 500 });
  }
}
