"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Stats {
  totalAccounts: number;
  availableAccounts: number;
  rentedAccounts: number;
  activeRentals: number;
  totalCustomers: number;
  mrr: number;
}

interface RecentRental {
  id: string;
  createdAt: string;
  user: { fullName: string; email: string; isTest?: boolean };
  linkedinAccount: { linkedinName: string; monthlyPrice: string | number };
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentRentals, setRecentRentals] = useState<RecentRental[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeTest, setIncludeTest] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/admin/stats?includeTest=${includeTest ? "1" : "0"}`)
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        setStats(data.stats);
        setRecentRentals(data.recentRentals || []);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [includeTest]);

  if (loading || !stats) {
    return <div className="grid gap-4 md:grid-cols-4">{[1, 2, 3, 4].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200" />)}</div>;
  }

  const statCards = [
    { label: "Monthly Revenue", value: formatCurrency(stats.mrr), color: "text-green-600" },
    { label: "Active Rentals", value: stats.activeRentals, color: "text-blue-600" },
    { label: "Available Accounts", value: stats.availableAccounts, color: "text-gray-900" },
    { label: "Total Customers", value: stats.totalCustomers, color: "text-gray-900" },
  ];

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">A snapshot of your marketplace — revenue, active rentals, available profiles and customer count at a glance.</p>
        </div>
        <div className="flex flex-shrink-0 items-center rounded-lg border border-gray-200 bg-white p-0.5 text-sm">
          <button
            onClick={() => setIncludeTest(false)}
            className={`rounded-md px-3 py-1 font-medium transition-colors ${!includeTest ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-800"}`}
          >Live</button>
          <button
            onClick={() => setIncludeTest(true)}
            className={`rounded-md px-3 py-1 font-medium transition-colors ${includeTest ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-800"}`}
          >All (incl. test)</button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="py-4">
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-gray-500">Inventory</p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total accounts</span>
                <span className="font-medium">{stats.totalAccounts}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Available</span>
                <span className="font-medium text-green-600">{stats.availableAccounts}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Rented</span>
                <span className="font-medium text-blue-600">{stats.rentedAccounts}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Utilization</span>
                <span className="font-medium">
                  {stats.totalAccounts > 0
                    ? Math.round((stats.rentedAccounts / stats.totalAccounts) * 100)
                    : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-gray-500">Recent Rentals</p>
            <div className="mt-3 space-y-2">
              {recentRentals.length === 0 ? (
                <p className="text-sm text-gray-400">No rentals yet</p>
              ) : (
                recentRentals.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex justify-between text-sm">
                    <span className="text-gray-600 truncate">
                      {r.user.fullName}
                      {r.user.isTest && <span className="ml-1 rounded bg-purple-100 px-1 py-0.5 text-[9px] font-semibold text-purple-700 align-middle">TEST</span>}
                      {" → "}{r.linkedinAccount.linkedinName}
                    </span>
                    <span className="text-gray-400 flex-shrink-0 ml-2">{formatDate(r.createdAt)}</span>
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
