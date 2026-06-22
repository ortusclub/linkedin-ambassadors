"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface Ambassador {
  id: string | null;
  fullName: string;
  email: string;
  accountCount: number;
  owedMonthly: number;
  paymentMethod: string | null;
}

export default function AdminPayoutsPage() {
  const [ambassadors, setAmbassadors] = useState<Ambassador[]>([]);
  const [totalOwed, setTotalOwed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/balances")
      .then((r) => r.json())
      .then((data) => {
        setAmbassadors(data.ambassadors || []);
        setTotalOwed(data.totalOwed || 0);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = ambassadors.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return a.fullName.toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
  });

  if (loading) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-200" />)}</div>;
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Ambassador Payouts</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">What you owe each ambassador for the accounts they&apos;ve shared. Pay via their chosen method (PayPal, Wise, GCash or bank transfer).</p>
        </div>
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-2 flex-shrink-0">
          <span className="text-sm text-green-700">Owed / month: </span>
          <span className="text-lg font-bold text-green-800">${totalOwed.toFixed(2)}</span>
        </div>
      </div>

      {ambassadors.length > 0 && (
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="font-medium text-gray-900">No ambassador payouts due yet</p>
            <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
              Your accounts are currently company-owned (Ortus), so there&apos;s nothing to pay out.
              This fills in automatically as external ambassadors share their accounts.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Ambassador</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Accounts Shared</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Owed / month</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Payment Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((a) => (
                <tr key={a.email} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-sm">{a.fullName}</div>
                    <div className="text-xs text-gray-500">{a.email}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{a.accountCount}</td>
                  <td className="px-4 py-3 font-semibold text-sm text-gray-900">{a.owedMonthly > 0 ? `$${a.owedMonthly.toFixed(2)}` : <span className="font-normal text-gray-400">TBC</span>}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{a.paymentMethod || <span className="text-gray-400">Not set</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
