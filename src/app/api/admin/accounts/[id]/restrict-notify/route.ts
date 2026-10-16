import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { notifyRestrictionOwnerReferrer } from "@/lib/restrict-notify";

// Manual trigger for the owner + referrer restriction notice (the "email the owner and
// referrer now" confirm on the inventory page). The actual compose/send/log + idempotency
// lives in notifyRestrictionOwnerReferrer, which also fires automatically from every path
// that marks an account restricted — this route just exposes it for a manual re-send.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const result = await notifyRestrictionOwnerReferrer(id);
    if (!result.ok && result.error) {
      const status = result.error === "Account not found" ? 404 : result.error === "No unique linked application" ? 400 : 500;
      return NextResponse.json({ error: result.error, skipped: result.skipped }, { status });
    }
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send notifications";
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500 });
  }
}
