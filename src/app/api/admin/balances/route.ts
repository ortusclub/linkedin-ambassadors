import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// Ambassador payouts = what we owe the people who SUPPLIED accounts (not renters,
// not our own Ortus accounts, not showcase dummies). Grouped by owner, summing the
// monthly ambassador payment across their accounts.
export async function GET() {
  try {
    await requireAdmin();

    const accounts = await prisma.linkedInAccount.findMany({
      where: { status: { notIn: ["removed", "retired"] } },
      select: { notes: true, ambassadorPayment: true, linkedinName: true, status: true },
    });

    const byOwner = new Map<string, { email: string; accounts: string[]; owed: number }>();
    for (const a of accounts) {
      if ((a.notes || "").includes("[SHOWCASE]")) continue; // dummy
      const ownerEmail = (a.notes || "").match(/Owner:\s*(\S+@\S+)/)?.[1]?.replace(/\.$/, "");
      if (!ownerEmail) continue;
      if (ownerEmail.toLowerCase().endsWith("@ortus.solutions")) continue; // company-owned, not an ambassador
      const key = ownerEmail.toLowerCase();
      if (!byOwner.has(key)) byOwner.set(key, { email: ownerEmail, accounts: [], owed: 0 });
      const o = byOwner.get(key)!;
      o.accounts.push(a.linkedinName);
      o.owed += Number(a.ambassadorPayment || 0);
    }

    const emails = [...byOwner.keys()];
    const [users, apps] = emails.length
      ? await Promise.all([
          prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true, fullName: true, email: true, contactNumber: true } }),
          prisma.ambassadorApplication.findMany({ where: { email: { in: emails } }, select: { email: true, paymentMethod: true, paypalEmail: true, wiseEmail: true } }),
        ])
      : [[], []];

    const userMap = new Map(users.map((u) => [u.email.toLowerCase(), u]));
    const appMap = new Map(apps.map((a) => [a.email.toLowerCase(), a]));

    const ambassadors = [...byOwner.values()].map((o) => {
      const u = userMap.get(o.email.toLowerCase());
      const app = appMap.get(o.email.toLowerCase());
      const method = app?.paymentMethod || (app?.paypalEmail ? `PayPal: ${app.paypalEmail}` : app?.wiseEmail ? `Wise: ${app.wiseEmail}` : null);
      return {
        id: u?.id || null,
        fullName: u?.fullName || o.email,
        email: o.email,
        accountCount: o.accounts.length,
        owedMonthly: o.owed,
        paymentMethod: method,
      };
    }).sort((a, b) => b.owedMonthly - a.owedMonthly);

    const totalOwed = ambassadors.reduce((s, a) => s + a.owedMonthly, 0);

    return NextResponse.json({ ambassadors, totalOwed });
  } catch (error) {
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
