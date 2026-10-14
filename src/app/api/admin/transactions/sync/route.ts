import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { reconcileStripe } from "@/services/stripe-reconcile";

// "Check Stripe" — admin-triggered reconciliation. Report-only: it lists any charge
// Stripe collected that our ledger doesn't account for. It writes nothing; the amount-
// based match is reliable enough to ALERT on but not to auto-post the messy legacy
// entries without risking a double-count, so posting stays a deliberate manual step.
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = (await req.json().catch(() => ({}))) as { sinceDays?: number };
    const result = await reconcileStripe({
      sinceDays: Math.min(Math.max(body.sinceDays || 60, 1), 365),
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && /unauthorized|forbidden/i.test(error.message)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("stripe sync error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
