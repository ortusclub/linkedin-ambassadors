"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface OwnerAccount {
  id: string;
  linkedinName: string;
  status: string;
  monthlyPrice: string | number;
}

interface Owner {
  email: string;
  fullName: string;
  joinedAt: string | null;
  accountCount: number;
  accounts: OwnerAccount[];
}

export default function AdminOwnersPage() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/owners")
      .then((r) => r.json())
      .then((data) => setOwners(data.owners || []))
      .finally(() => setLoading(false));
  }, []);

  const statusVariant = (s: string) => {
    const map: Record<string, "success" | "info" | "warning" | "danger" | "default"> = {
      available: "success",
      rented: "info",
      unavailable: "danger",
      maintenance: "warning",
      retired: "default",
    };
    return map[s] || "default";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Owners</h2>
        <p className="text-sm text-gray-500">{owners.length} ambassador{owners.length !== 1 ? "s" : ""} with accounts</p>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-200" />)}</div>
      ) : owners.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-gray-500">No owners found</CardContent></Card>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Owner</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Accounts</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Their Accounts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {owners.map((owner) => (
                <tr key={owner.email} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{owner.fullName}</p>
                    {owner.joinedAt && (
                      <p className="text-xs text-gray-400">Joined {new Date(owner.joinedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{owner.email}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{owner.accountCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {owner.accounts.map((account) => (
                        <span key={account.id} className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2 py-1 text-xs">
                          <span className="font-medium text-gray-700">{account.linkedinName}</span>
                          <Badge variant={statusVariant(account.status)} className="text-[10px] px-1.5 py-0">{account.status}</Badge>
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
