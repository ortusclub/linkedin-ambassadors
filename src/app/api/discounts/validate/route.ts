import { NextResponse } from "next/server";
import { lookupDiscount, discountLabel } from "@/lib/discounts";

// Renter enters a voucher code at checkout; confirm it's valid and return what it does.
// Does NOT consume a redemption — that happens when the rental is actually created.
export async function POST(req: Request) {
  try {
    const { code } = await req.json();
    const result = await lookupDiscount(code);
    if (!result.ok || !result.discount) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 200 });
    }
    return NextResponse.json({
      ok: true,
      discount: result.discount,
      label: discountLabel(result.discount),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not check that code." }, { status: 200 });
  }
}
