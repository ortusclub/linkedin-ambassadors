import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const RATE = 500;
const isConverted = (s: string) => s === "approved" || s === "onboarded";

// Public marketer portal data, keyed by the secret token in the URL. Returns the
// referrer's own figures, a PII-free competitive board (counts only), and the
// referrer's own signup feed (names, no email/number — never other marketers').
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const me = await prisma.referrer.findUnique({ where: { token } });
  if (!me) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [referrers, apps, payouts] = await Promise.all([
    prisma.referrer.findMany({ select: { slug: true, name: true } }),
    prisma.ambassadorApplication.findMany({
      orderBy: { createdAt: "desc" },
      select: { fullName: true, referredBy: true, status: true, createdAt: true },
    }),
    prisma.payout.findMany({ where: { referrerId: me.id }, orderBy: { createdAt: "desc" } }),
  ]);

  const nameBySlug = new Map(referrers.map((r) => [r.slug, r.name]));
  const counts = new Map<string, { signups: number; converted: number }>();
  for (const a of apps) {
    const slug = (a.referredBy || "").trim();
    if (!slug) continue;
    const c = counts.get(slug) || { signups: 0, converted: 0 };
    c.signups++;
    if (isConverted(a.status)) c.converted++;
    counts.set(slug, c);
  }

  // Competitive board — counts only, no money, no PII.
  const board = [...counts.entries()]
    .map(([slug, c]) => ({ name: nameBySlug.get(slug) || slug, signups: c.signups, converted: c.converted, isMe: slug === me.slug }))
    .sort((a, b) => b.signups - a.signups || b.converted - a.converted);
  if (!board.some((b) => b.isMe)) board.push({ name: me.name, signups: 0, converted: 0, isMe: true });

  const mine = counts.get(me.slug) || { signups: 0, converted: 0 };

  // Activity feed — this marketer's own signups only, names only (no email/number).
  const activity = apps
    .filter((a) => (a.referredBy || "").trim() === me.slug)
    .slice(0, 15)
    .map((a) => ({
      kind: isConverted(a.status) ? "converted" : "signup",
      name: a.fullName,
      referrer: null,
      mine: true,
      date: a.createdAt,
    }));

  return NextResponse.json({
    me: {
      name: me.name,
      slug: me.slug,
      contactMethod: me.contactMethod,
      contactHandle: me.contactHandle,
      paymentMethod: me.paymentMethod,
      paymentDetails: me.paymentDetails,
      assignedDay: me.assignedDay,
      assignedLocation: me.assignedLocation,
    },
    stats: { signups: mine.signups, converted: mine.converted, commission: mine.converted * RATE, rate: RATE },
    board,
    activity,
    payouts: payouts.map((p) => ({
      id: p.id,
      type: p.type,
      description: p.description,
      amount: Number(p.amount),
      method: p.method,
      reference: p.reference,
      paidAt: p.paidAt,
      confirmedAt: p.confirmedAt,
    })),
  });
}

// Marketer self-edits their own contact + payment details.
export async function PATCH(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const me = await prisma.referrer.findUnique({ where: { token } });
  if (!me) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.referrer.update({
    where: { id: me.id },
    data: {
      contactMethod: typeof body.contactMethod === "string" ? body.contactMethod : me.contactMethod,
      contactHandle: typeof body.contactHandle === "string" ? body.contactHandle : me.contactHandle,
      paymentMethod: typeof body.paymentMethod === "string" ? body.paymentMethod : me.paymentMethod,
      paymentDetails: typeof body.paymentDetails === "string" ? body.paymentDetails : me.paymentDetails,
    },
  });
  return NextResponse.json({
    ok: true,
    me: {
      contactMethod: updated.contactMethod,
      contactHandle: updated.contactHandle,
      paymentMethod: updated.paymentMethod,
      paymentDetails: updated.paymentDetails,
    },
  });
}
