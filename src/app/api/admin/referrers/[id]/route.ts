import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function authError(error: unknown) {
  if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
    return NextResponse.json({ error: error.message }, { status: error.message === "Forbidden" ? 403 : 401 });
  }
  return null;
}

// Admin edits a referrer — their contact + payout details (so the team can pay them
// even if the marketer didn't fill their own portal), plus name/type.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const str = (v: unknown) => (typeof v === "string" ? v : undefined);
    const referrer = await prisma.referrer.update({
      where: { id },
      data: {
        name: body.name?.trim() ? body.name.trim() : undefined,
        type: body.type === "marketer" || body.type === "ambassador" ? body.type : undefined,
        contactMethod: str(body.contactMethod),
        contactHandle: str(body.contactHandle),
        paymentMethod: str(body.paymentMethod),
        paymentDetails: str(body.paymentDetails),
      },
    });
    return NextResponse.json({ referrer });
  } catch (error) {
    return authError(error) ?? NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.referrer.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authError(error) ?? NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
