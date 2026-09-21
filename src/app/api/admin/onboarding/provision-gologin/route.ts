import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { provisionAccount } from "@/lib/provision-account";

// Manual "Create GoLogin" button on the pipeline. Runs the same provisioning the
// cron does for ONE account: link/create the GoLogin profile, assign an available
// proxy of the right tier (never buys — flags if none free), and create the public
// share link. Everything is stored on the account. Idempotent: re-running only fills
// whatever is still missing.
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { accountId } = await req.json().catch(() => ({}));
    if (!accountId || typeof accountId !== "string") {
      return NextResponse.json({ error: "accountId is required" }, { status: 400 });
    }
    const result = await provisionAccount(accountId);
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    if (e instanceof Error && (e.message === "Forbidden" || e.message === "Unauthorized")) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}
