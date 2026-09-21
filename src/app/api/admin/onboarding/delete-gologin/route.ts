import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { deleteProfile, tokenForAccount } from "@/services/gologin";

// Manual "Delete GoLogin" button on the pipeline / account editor. Removes the
// GoLogin browser profile (using the token for whichever GoLogin account hosts it)
// and clears the profile id + share link off the account. The proxy assignment is
// left in place so re-running "Create GoLogin" reuses it. Confirmed in the UI first.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { accountId } = await req.json().catch(() => ({}));
    if (!accountId || typeof accountId !== "string") {
      return NextResponse.json({ error: "accountId is required" }, { status: 400 });
    }

    const acct = await prisma.linkedInAccount.findUnique({
      where: { id: accountId },
      select: { id: true, gologinProfileId: true, gologinShareLink: true, gologinAccount: true },
    });
    if (!acct) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    let deleted = false;
    let warning: string | null = null;
    if (acct.gologinProfileId) {
      try {
        await deleteProfile(acct.gologinProfileId, tokenForAccount(acct.gologinAccount));
        deleted = true;
      } catch (e) {
        // If GoLogin says it's already gone (404), treat it as deleted and still clear
        // the DB. Any other error we surface but still clear the stale reference.
        const msg = e instanceof Error ? e.message : String(e);
        if (/404/.test(msg)) deleted = true;
        else warning = `GoLogin profile could not be removed remotely (${msg}). The reference has been cleared locally.`;
      }
    }

    await prisma.linkedInAccount.update({
      where: { id: accountId },
      data: { gologinProfileId: null, gologinShareLink: null },
    });

    return NextResponse.json({ ok: true, deleted, warning });
  } catch (e) {
    if (e instanceof Error && (e.message === "Forbidden" || e.message === "Unauthorized")) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}
