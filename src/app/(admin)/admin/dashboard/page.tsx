"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Stats {
  netProfit: number;
  mrr: number;
  payouts: number;
  activeRentals: number;
  totalCustomers: number;
  newCustomers30d: number;
  renewalsDue30d: number;
  vettingStarted: number;
  vettingDropped: number;
  atRisk: number;
  totalAccounts: number;
  availableAccounts: number;
  rentedAccounts: number;
  offlineAccounts: number;
  restrictedAccounts: number;
  utilization: number;
  appsToReview: number;
}

interface Activity {
  type: "rental" | "signup" | "submission" | "restricted";
  label: string;
  date: string;
  isTest: boolean;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeTest, setIncludeTest] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/admin/stats?includeTest=${includeTest ? "1" : "0"}`)
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        setStats(data.stats);
        setActivity(data.recentActivity || []);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [includeTest]);

  if (loading || !stats) {
    return <div className="grid gap-4 md:grid-cols-4">{[1, 2, 3, 4].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200" />)}</div>;
  }

  const margin = stats.mrr > 0 ? Math.round((stats.netProfit / stats.mrr) * 100) : 0;

  // Action items derived from the stats — only show rows that actually need attention.
  const attention: { label: string; tone: "warn" | "info" }[] = [];
  if (stats.restrictedAccounts > 0) attention.push({ label: `${stats.restrictedAccounts} account${stats.restrictedAccounts > 1 ? "s" : ""} restricted — recovering (access & billing paused)`, tone: "warn" });
  if (stats.renewalsDue30d > 0) attention.push({ label: `${stats.renewalsDue30d} renewal${stats.renewalsDue30d > 1 ? "s" : ""} due in the next 30 days`, tone: "info" });
  if (stats.atRisk > 0) attention.push({ label: `${stats.atRisk} rental${stats.atRisk > 1 ? "s" : ""} at-risk (auto-renew off or payment failed)`, tone: "warn" });
  if (stats.availableAccounts > 0) attention.push({ label: `${stats.availableAccounts} account${stats.availableAccounts > 1 ? "s" : ""} idle (available, not earning)`, tone: "info" });
  if (stats.appsToReview > 0) attention.push({ label: `${stats.appsToReview} ambassador application${stats.appsToReview > 1 ? "s" : ""} to review`, tone: "info" });
  if (stats.offlineAccounts > 0) attention.push({ label: `${stats.offlineAccounts} account${stats.offlineAccounts > 1 ? "s" : ""} offline`, tone: "warn" });

  const Tile = ({ label, value, sub, color }: { label: string; value: React.ReactNode; sub?: React.ReactNode; color?: string }) => (
    <div className="rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`mt-1.5 text-2xl font-bold leading-none ${color || "text-gray-900"}`}>{value}</p>
      {sub && <p className="mt-2 text-[11px] leading-snug text-gray-500">{sub}</p>}
    </div>
  );

  const Band = ({ title, grid, children }: { title: string; grid: string; children: React.ReactNode }) => (
    <div className="mt-6">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</p>
      <div className={`grid gap-3 ${grid}`}>{children}</div>
    </div>
  );

  const activityIcon = (t: Activity["type"]) =>
    t === "restricted" ? "🟠" : t === "rental" ? "🔵" : t === "signup" ? "🟢" : "🟣";

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">How the business is doing — money, demand, and supply at a glance.</p>
        </div>
        <div className="flex flex-shrink-0 items-center rounded-lg border border-gray-200 bg-white p-0.5 text-sm">
          <button onClick={() => setIncludeTest(false)} className={`rounded-md px-3 py-1 font-medium transition-colors ${!includeTest ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-800"}`}>Live</button>
          <button onClick={() => setIncludeTest(true)} className={`rounded-md px-3 py-1 font-medium transition-colors ${includeTest ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-800"}`}>All (incl. test)</button>
        </div>
      </div>

      <Band title="💰 Money" grid="grid-cols-2 lg:grid-cols-4">
        <Tile label="Net Profit / mo" value={formatCurrency(stats.netProfit)} sub={`${margin}% margin`} color="text-green-600" />
        <Tile label="Monthly Revenue" value={formatCurrency(stats.mrr)} sub="recurring, money in" color="text-gray-900" />
        <Tile label="Ambassador Payouts" value={formatCurrency(stats.payouts)} sub="money out" color="text-gray-900" />
        <Tile label="Active Rentals" value={stats.activeRentals} sub="live now" color="text-blue-600" />
      </Band>

      <Band title="🧑‍💻 Demand — renters" grid="grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <Tile label="Customers" value={stats.totalCustomers} sub={`renting ${stats.activeRentals} accounts`} />
        <Tile label="New (30d)" value={stats.newCustomers30d} sub="new this month" />
        <Tile label="Renewals ≤30d" value={stats.renewalsDue30d} sub="coming up" />
        <Tile label="At-risk" value={stats.atRisk} sub="may churn" color={stats.atRisk > 0 ? "text-amber-600" : "text-gray-900"} />
        <Tile
          label="Vetting drop-off"
          value={`${stats.vettingDropped}/${stats.vettingStarted}`}
          sub={stats.vettingStarted > 0 ? `${Math.round((stats.vettingDropped / stats.vettingStarted) * 100)}% opened, didn't finish` : "opened form, didn't finish"}
          color={stats.vettingDropped > 0 ? "text-amber-600" : "text-gray-900"}
        />
      </Band>

      <Band title="🗂 Supply — accounts & ambassadors" grid="grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <Tile label="Total Accounts" value={stats.totalAccounts} sub={`${stats.availableAccounts} avail · ${stats.rentedAccounts} rented · ${stats.offlineAccounts} offline`} />
        <Tile label="Restricted" value={stats.restrictedAccounts} sub="recovering · access & billing paused" color={stats.restrictedAccounts > 0 ? "text-orange-600" : "text-gray-900"} />
        <Tile
          label="Utilization"
          value={`${stats.utilization}%`}
          sub={<span className="mt-1 inline-block h-1.5 w-full max-w-[120px] overflow-hidden rounded-full bg-gray-200 align-middle"><span className="block h-full rounded-full bg-blue-500" style={{ width: `${stats.utilization}%` }} /></span>}
        />
        <Tile label="Idle (available)" value={stats.availableAccounts} sub="not earning" color={stats.availableAccounts > 0 ? "text-amber-600" : "text-gray-900"} />
        <Tile label="Apps to Review" value={stats.appsToReview} sub="ambassador applications" />
      </Band>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm font-semibold text-gray-900">⚠️ Needs attention</p>
            <div className="mt-3 space-y-2">
              {attention.length === 0 ? (
                <p className="text-sm text-gray-400">All clear — nothing needs you right now. 🎉</p>
              ) : (
                attention.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${a.tone === "warn" ? "bg-amber-500" : "bg-blue-400"}`} />
                    <span className="text-gray-600">{a.label}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <p className="text-sm font-semibold text-gray-900">Recent activity</p>
            <div className="mt-3 space-y-2">
              {activity.length === 0 ? (
                <p className="text-sm text-gray-400">No activity yet</p>
              ) : (
                activity.map((a, i) => (
                  <div key={i} className="flex justify-between gap-2 text-sm">
                    <span className="truncate text-gray-600">
                      <span className="mr-1.5">{activityIcon(a.type)}</span>
                      {a.label}
                      {a.isTest && <span className="ml-1 rounded bg-purple-100 px-1 py-0.5 text-[9px] font-semibold text-purple-700 align-middle">TEST</span>}
                    </span>
                    <span className="flex-shrink-0 text-gray-400">{formatDate(a.date)}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
