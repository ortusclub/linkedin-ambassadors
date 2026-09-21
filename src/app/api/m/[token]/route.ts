import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isReferralEarned, referralCommissionAmount } from "@/lib/referrals";
import { currencyConfig } from "@/lib/referral-currency";

export const dynamic = "force-dynamic";

// The commission rate + currency are per-referrer (PH = ₱500, non-PH = USD) — see
// lib/referral-currency. A signup only counts (and pays) once the referred account
// is onboarded AND confirmed "ok to pay" (verifiedAt) with no login issue — see
// lib/referrals. Being merely accepted/onboarded is NOT enough; we confirm the
// account is good first.

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
      select: { id: true, fullName: true, referredBy: true, referralSource: true, status: true, verifiedAt: true, accountIssue: true, onboardingFix: true, onboardedAt: true, onboardingMethod: true, onboardingVerified: true, paidAt: true, createdAt: true, selfServiceOnboarding: { select: { state: true } } },
    }),
    prisma.payout.findMany({ where: { referrerId: me.id }, orderBy: { createdAt: "desc" } }),
  ]);

  const nameBySlug = new Map(referrers.map((r) => [r.slug, r.name]));
  const counts = new Map<string, { signups: number; converted: number; commission: number }>();
  for (const a of apps) {
    const slug = (a.referredBy || "").trim();
    if (!slug) continue;
    const c = counts.get(slug) || { signups: 0, converted: 0, commission: 0 };
    c.signups++;
    if (isReferralEarned(a)) {
      c.converted++;
      c.commission += referralCommissionAmount(a, currencyConfig(slug).referralTiers);
    }
    counts.set(slug, c);
  }

  // Competitive board — counts only, no money, no PII. Only real referrers appear:
  // an unknown/typo'd code (someone typing a nickname into the referral field) must
  // not surface as a phantom "person" on everyone's leaderboard.
  const board = [...counts.entries()]
    .filter(([slug]) => nameBySlug.has(slug))
    .map(([slug, c]) => ({
      name: nameBySlug.get(slug)!, signups: c.signups, converted: c.converted,
      lifetimeEarnings: `${currencyConfig(slug).symbol}${c.commission.toLocaleString("en-US")}`,
      isMe: slug === me.slug,
    }))
    .sort((a, b) => b.signups - a.signups || b.converted - a.converted);
  if (!board.some((b) => b.isMe)) board.push({ name: me.name, signups: 0, converted: 0, lifetimeEarnings: `${currencyConfig(me.slug).symbol}0`, isMe: true });

  const mine = counts.get(me.slug) || { signups: 0, converted: 0, commission: 0 };
  const cfg = currencyConfig(me.slug);

  // Activity feed — this marketer's own signups only, names only (no email/number).
  const activity = apps
    .filter((a) => (a.referredBy || "").trim() === me.slug)
    .slice(0, 15)
    .map((a) => ({
      kind: isReferralEarned(a) ? "converted" : "signup",
      name: a.fullName,
      referrer: null,
      mine: true,
      date: a.createdAt,
    }));

  // Rich per-signup status for the "Your onboardings" tab: where they're stuck,
  // who's running it, the path, the fee, and whether the referrer can act.
  const money = (n: number) => `${cfg.symbol}${n.toLocaleString("en-US")}`;
  const t = cfg.referralTiers;
  const range = (lo: number, hi: number) => `${money(lo)}–${money(hi)}`;
  const signups = apps
    .filter((a) => (a.referredBy || "").trim() === me.slug)
    .slice(0, 25)
    .map((a) => {
      const isDiy = a.referralSource === "self-service";
      const method = a.onboardingMethod; // "computer" | "phone" | null
      const state = a.selfServiceOnboarding?.state || null;
      const paid = !!a.paidAt;
      const onboarded = a.status === "onboarded" || !!a.onboardedAt;
      const amount = referralCommissionAmount(a, t);
      const whoLabel = method === "phone" ? "LV ran it" : (method === "computer" || (isDiy && (onboarded || state === "handed_off"))) ? "You ran it" : isDiy ? "You ran it" : "Form only";
      const path = method === "computer" ? `Guided · computer${a.onboardingVerified ? " · verified" : ""}`
        : method === "phone" ? "Guided · phone hand-off"
        : isDiy ? "Guided" : "Form only";
      // A LinkedIn restriction only matters to the referrer WHILE THEY'RE ONBOARDING —
      // i.e. a DIY onboarding still in their hands (not yet onboarded, handed off, or paid).
      // Once it's with us or done, a restriction is an account-health issue for the team, not
      // something the referrer acts on, so it must not surface here. Paid stays Paid always.
      const inProgressDiy = isDiy && !paid && !onboarded && state !== "handed_off";
      const restricted = inProgressDiy && !!a.accountIssue;
      let pill: { text: string; tone: "green" | "blue" | "amber" | "red" }, line: string, sub: string, progress: number, action: "resume" | "onboard" | "clear" | null = null, fee: string, kind: "action" | "blocked" | "waiting" | "paid";
      if (paid) {
        kind = "paid"; pill = { text: "Paid", tone: "green" }; progress = 6;
        line = "Done — account is live"; sub = "Setup fee paid and your commission is in."; fee = `${money(amount)} paid`;
      } else if (onboarded) {
        kind = "waiting"; pill = { text: "Verifying", tone: "blue" }; progress = 5;
        line = "Our team is verifying the account"; sub = "Nothing for you to do — the check releases payment."; fee = `${money(amount)} pending`;
      } else if (state === "handed_off") {
        kind = "waiting"; pill = { text: "Verifying", tone: "blue" }; progress = 4;
        line = "You handed the sign-in to us"; sub = "Our team does the GoLogin sign-in, then verifies."; fee = `${money(amount)} pending`;
      } else if (restricted) {
        kind = "blocked"; pill = { text: "Restricted", tone: "red" }; progress = 5; action = "clear";
        line = "LinkedIn locked the account";
        sub = "They need to clear it on their own phone — usually scanning a QR code — then you can finish the sign-in. Nothing pays out until it's done.";
        fee = `${money(amount)} on completion`;
      } else if (isDiy) {
        kind = "action"; pill = { text: "Resume", tone: "amber" }; progress = 3; action = "resume";
        line = "Left off mid-onboarding"; sub = "Pick up where you left off while they're still with you."; fee = range(t.phone.base, t.computer.verified);
      } else {
        kind = "action"; pill = { text: "No call booked", tone: "amber" }; progress = 1; action = "onboard";
        line = "Form in — not onboarded yet"; sub = "They filled your form. Onboard them now, or get a call booked."; fee = money(t.referral);
      }
      // Post-sign-in fixes the team raised for this signup (email not primary / 2FA not set).
      const rawFix = a.onboardingFix as { issues?: ("email_primary" | "twofa")[]; state?: "open" | "referrer_done" } | null;
      const fix = rawFix?.issues?.length ? { issues: rawFix.issues, state: rawFix.state === "referrer_done" ? "referrer_done" : "open" } : null;
      return { id: a.id, name: a.fullName, date: a.createdAt, whoLabel, pill, line, sub, path, fee, progress, action, kind, fix };
    });

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
    stats: { signups: mine.signups, converted: mine.converted, commission: mine.commission, rate: cfg.rate },
    config: {
      currency: cfg.currency,
      symbol: cfg.symbol,
      offer: cfg.offer,
      referralTiers: cfg.referralTiers,
      payoutMethods: cfg.payoutMethods,
      defaultPayoutMethod: cfg.defaultPayoutMethod,
    },
    board,
    activity,
    signups,
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

  // The referrer marks a raised fix as done from their portal, so the team knows to recheck.
  // Only their own referred signups, and only a fix that's actually open.
  if (body.action === "fixDone" && typeof body.applicationId === "string") {
    const app = await prisma.ambassadorApplication.findUnique({ where: { id: body.applicationId }, select: { referredBy: true, onboardingFix: true } });
    if (!app || (app.referredBy || "").trim() !== me.slug) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const fix = app.onboardingFix as { issues?: string[]; state?: string; raisedAt?: string } | null;
    if (fix?.issues?.length) {
      await prisma.ambassadorApplication.update({ where: { id: body.applicationId }, data: { onboardingFix: { ...fix, state: "referrer_done", doneAt: new Date().toISOString() } } });
    }
    return NextResponse.json({ ok: true });
  }

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
