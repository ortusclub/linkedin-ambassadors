import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RENTABLE_WHERE } from "@/lib/public-inventory";
import { reservableCatalogue } from "@/lib/reservable-catalogues";

// Self-serve reserve from an unlisted catalogue (Agent360, and later Will Cura). The slug is the
// gate — only catalogues in RESERVABLE_CATALOGUES can reserve. Places a 1–2 day hold so the account
// drops out of every catalogue + normal checkout; the viewer rents it via the direct rent link.
export async function POST(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const cat = reservableCatalogue(key);
  if (!cat) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { accountId, days } = (await req.json()) as { accountId?: string; days?: number };
  if (!accountId) return NextResponse.json({ error: "accountId required" }, { status: 400 });
  const d = days === 2 ? 2 : 1;

  // Must be genuinely rentable AND not already held (by anyone). Doubles as the "someone beat you
  // to it" guard — if it's held or no longer available, the reserve fails.
  const account = await prisma.linkedInAccount.findFirst({
    where: { ...RENTABLE_WHERE, id: accountId, heldUntil: null },
    select: { id: true },
  });
  if (!account) return NextResponse.json({ error: "unavailable" }, { status: 409 });

  const now = new Date();
  const heldUntil = new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
  await prisma.linkedInAccount.update({
    where: { id: accountId },
    data: { heldUntil, heldFor: cat.label, heldBy: `reserve:${cat.tag}`, heldAt: now },
  });
  return NextResponse.json({ ok: true, heldUntil });
}

// Release a reserve this catalogue placed (never an admin hold or another catalogue's).
export async function DELETE(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const cat = reservableCatalogue(key);
  if (!cat) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { accountId } = (await req.json()) as { accountId?: string };
  if (!accountId) return NextResponse.json({ error: "accountId required" }, { status: 400 });

  const res = await prisma.linkedInAccount.updateMany({
    where: { id: accountId, heldBy: `reserve:${cat.tag}` },
    data: { heldUntil: null, heldFor: null, heldBy: null, heldAt: null },
  });
  return NextResponse.json({ ok: true, released: res.count });
}
