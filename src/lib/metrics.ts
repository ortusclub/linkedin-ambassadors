import { prisma } from "@/lib/prisma";
import { isCompanyEmail } from "@/lib/company";

// The headline run-rate metrics, the same way the dashboard shows them. Kept here so the
// daily snapshot (/api/cron/snapshot-metrics) and the live dashboard compute them
// identically. NB: the live /api/admin/stats route mirrors this formula inline (it needs
// the underlying lists for its activity feed) — keep the two in sync if the formula changes.
export type CoreMetrics = {
  mrr: number; netProfit: number; payouts: number; activeRentals: number;
  totalCustomers: number; totalAccounts: number; availableAccounts: number;
  rentedAccounts: number; offlineAccounts: number; restrictedAccounts: number; utilization: number;
};

// A real (sellable) inventory account: not a showcase/dummy, not a leftover test account.
function isRealAccount(a: { notes: string | null; linkedinName: string }) {
  return !(a.notes || "").includes("[SHOWCASE]") && !a.linkedinName.toUpperCase().includes("(TEST)");
}
const profileEmailOf = (notes: string | null) =>
  (notes || "").match(/Profile email:\s*(\S+@\S+\.\S+)/i)?.[1]?.replace(/[.\s]+$/, "") || null;

// Live (non-test) figures — what "Live" mode on the dashboard shows.
export async function computeCoreMetrics(): Promise<CoreMetrics> {
  const [inventoryAccounts, totalCustomers, activeRentalsList] = await Promise.all([
    prisma.linkedInAccount.findMany({
      where: { status: { notIn: ["removed", "retired"] } },
      select: { status: true, notes: true, linkedinName: true, restrictedAt: true },
    }),
    prisma.user.count({ where: { role: "customer", status: "active", isTest: false, rentals: { some: {} } } }),
    prisma.rental.findMany({
      where: { status: "active", user: { isTest: false } },
      select: { lockedPrice: true, linkedinAccount: { select: { monthlyPrice: true, ambassadorPayment: true, notes: true } } },
    }),
  ]);

  const realAccounts = inventoryAccounts.filter(isRealAccount);
  const totalAccounts = realAccounts.length;
  const availableAccounts = realAccounts.filter((a) => a.status === "available").length;
  const offlineAccounts = realAccounts.filter((a) => a.status === "unavailable" || a.status === "maintenance").length;
  const restrictedAccounts = realAccounts.filter((a) => a.restrictedAt).length;

  const activeRentals = activeRentalsList.length;
  const rentedAccounts = activeRentals;
  const mrr = activeRentalsList.reduce((s, r) => s + Number(r.lockedPrice ?? r.linkedinAccount.monthlyPrice ?? 0), 0);
  const payouts = activeRentalsList.reduce((s, r) => {
    const email = profileEmailOf(r.linkedinAccount.notes);
    const isExternalAmbassador = email ? !isCompanyEmail(email) : false;
    return s + (isExternalAmbassador ? Number(r.linkedinAccount.ambassadorPayment ?? 0) : 0);
  }, 0);
  const netProfit = mrr - payouts;
  const utilization = totalAccounts > 0 ? Math.round((rentedAccounts / totalAccounts) * 100) : 0;

  return { mrr, netProfit, payouts, activeRentals, totalCustomers, totalAccounts, availableAccounts, rentedAccounts, offlineAccounts, restrictedAccounts, utilization };
}
