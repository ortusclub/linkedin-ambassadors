import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { computePaymentsDue } from "@/lib/payment-schedule";
import { sendPaymentsDueDigest } from "@/services/email";

const DIGEST_TO = process.env.PAYMENTS_DIGEST_EMAIL || "milee@linkedvelocity.com";

// GET: the payments-due overview for the admin panel.
export async function GET() {
  try {
    await requireAdmin();
    const data = await computePaymentsDue();
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: email the current payments-due digest to Milee on demand.
export async function POST() {
  try {
    await requireAdmin();
    const data = await computePaymentsDue();
    await sendPaymentsDueDigest(DIGEST_TO, data);
    return NextResponse.json({ ok: true, to: DIGEST_TO });
  } catch (error) {
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Forbidden" ? 403 : 401 });
    }
    console.error("Payments-due email error:", error);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
