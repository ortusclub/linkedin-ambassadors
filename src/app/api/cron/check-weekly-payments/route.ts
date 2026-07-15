import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { fetchIncomingUsdt } from "@/lib/tron-payments";
import { weeklyBilling, weeklyDueState, confirmWeeklyPayment } from "@/lib/rental-tracker";

// Daily pass that confirms off-platform weekly rental payments straight from the
// TRON blockchain. For each active rental carrying a [weekly $X due YYYY-MM-DD]
// marker, once its due day has arrived we look for an incoming USDT transfer of
// that exact amount to the shared receiving wallet. A match rolls the due date
// forward one week and stamps the tx — so the admin badge flips to paid on its
// own. No exchange/Binance involved; just public chain data.
//
// Cheap by design: it only calls the chain for a rental on/after its payment day,
// and keeps checking daily (so a late payer is still caught) until the payment
// lands and the due date advances past today.

const DAY = 24 * 60 * 60 * 1000;
// How many days before the due date a payment still counts (renters pay "in
// advance for the week ahead", so allow paying a little early).
const GRACE_DAYS = 2;
// Amount tolerance (USDT) to absorb any rounding.
const AMOUNT_EPS = 0.01;

function isAuthorized(req: NextRequest): boolean {
  if (req.headers.get("x-vercel-cron")) return true;
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

// Midnight-UTC ms for a YYYY-MM-DD string.
const dayMs = (ymd: string) => Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10));
const ymdOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);

async function run(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = Date.now();
  const todayMs = dayMs(ymdOf(now));
  const result = { checked: 0, confirmed: 0, waiting: 0, confirmations: [] as unknown[] };

  try {
    const rentals = await prisma.rental.findMany({
      where: { status: "active" },
      include: { user: { select: { fullName: true } }, linkedinAccount: { select: { linkedinName: true } } },
    });

    // Pull the wallet's recent incoming USDT once, reuse across rentals.
    const oldestDue = rentals
      .map((r) => weeklyBilling(r.notes))
      .filter(Boolean)
      .map((b) => dayMs(b!.nextDue) - GRACE_DAYS * DAY)
      .sort((a, b) => a - b)[0];
    const transfers = oldestDue !== undefined ? await fetchIncomingUsdt(undefined, { sinceTs: oldestDue }) : [];
    const consumed = new Set<string>(); // don't let two rentals claim the same tx

    for (const r of rentals) {
      const b = weeklyBilling(r.notes);
      if (!b) continue;
      result.checked++;

      const dueMs = dayMs(b.nextDue);
      // Only look once the payment day has arrived.
      if (todayMs < dueMs) continue;

      const windowStart = dueMs - GRACE_DAYS * DAY;
      const match = transfers
        .filter((t) => !consumed.has(t.txId) && t.ts >= windowStart && Math.abs(t.amount - b.amount) < AMOUNT_EPS)
        .sort((a, c) => c.ts - a.ts)[0];

      if (!match) {
        result.waiting++;
        continue;
      }

      consumed.add(match.txId);
      const paidDate = ymdOf(match.ts);
      const newNotes = confirmWeeklyPayment(r.notes, paidDate, match.txId);

      // Advance the badge AND record the payment so it shows in /admin/transactions.
      // Idempotent: skip the ledger row if this tx was already recorded.
      await prisma.$transaction(async (dbtx) => {
        await dbtx.rental.update({ where: { id: r.id }, data: { notes: newNotes } });
        const already = await dbtx.transaction.findFirst({ where: { txHash: match.txId } });
        if (!already) {
          await dbtx.transaction.create({
            data: {
              userId: r.userId,
              type: "rental_payment",
              amount: new Prisma.Decimal(match.amount),
              txHash: match.txId,
              rentalId: r.id,
              description: `Weekly USDT (TRC-20) · ${r.linkedinAccount.linkedinName} · ${r.user.fullName}`,
            },
          });
        }
      });

      const next = weeklyBilling(newNotes)?.nextDue;
      result.confirmed++;
      result.confirmations.push({
        renter: r.user.fullName,
        account: r.linkedinAccount.linkedinName,
        amount: match.amount,
        paidDate,
        txId: match.txId,
        from: match.from,
        nextDue: next,
        status: next ? weeklyDueState(next, new Date(now)).label : undefined,
      });
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Weekly payment check error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) { return run(req); }
export async function POST(req: NextRequest) { return run(req); }
