"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

interface Rental {
  id: string;
  status: string;
  startDate: string;
  currentPeriodEnd: string | null;
  autoRenew: boolean;
  user: { id: string; fullName: string; email: string };
  linkedinAccount: { id: string; linkedinName: string; connectionCount: number; notes: string | null };
}

export default function AdminRentalsPage() {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/rentals")
      .then((r) => r.json())
      .then((data) => setRentals(data.rentals || []))
      .finally(() => setLoading(false));
  }, []);

  const statusVariant = (s: string) => {
    const map: Record<string, "success" | "danger" | "warning" | "default"> = {
      active: "success",
      payment_failed: "danger",
      cancelled: "default",
      expired: "default",
    };
    return map[s] || "default";
  };

  if (loading) return <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-200" />)}</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">All Rentals</h2>

      {rentals.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-gray-500">No rentals yet</CardContent></Card>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Account</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Started</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Next Billing</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Auto-Renew</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rentals.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 text-sm">{r.user.fullName}</p>
                    <p className="text-xs text-gray-500">{r.user.email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{(r.linkedinAccount.notes || "").match(/Profile email:\s*(\S+@\S+?\.\S+?)[\s.]/)?.[1] || r.linkedinAccount.linkedinName}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(r.status)}>{r.status.replace("_", " ")}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(r.startDate)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {r.currentPeriodEnd ? formatDate(r.currentPeriodEnd) : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{r.autoRenew ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
