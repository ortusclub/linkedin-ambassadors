"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

interface Account {
  id: string;
  linkedinName: string;
  status: string;
  notes: string | null;
}

export default function AdminRentalsPage() {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [addForm, setAddForm] = useState({ userEmail: "", linkedinAccountId: "", startDate: new Date().toISOString().split("T")[0], endDate: "", autoRenew: true });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  useEffect(() => {
    fetch("/api/admin/rentals")
      .then((r) => r.json())
      .then((data) => setRentals(data.rentals || []))
      .finally(() => setLoading(false));
  }, []);

  const openAddModal = () => {
    setShowAdd(true);
    setAddError("");
    fetch("/api/admin/accounts?status=available")
      .then((r) => r.json())
      .then((data) => setAccounts(data.accounts || []))
      .catch(() => {});
  };

  const handleAdd = async () => {
    if (!addForm.userEmail || !addForm.linkedinAccountId) {
      setAddError("Please fill in customer email and select an account.");
      return;
    }
    setAdding(true);
    setAddError("");

    const res = await fetch("/api/admin/rentals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...addForm,
        endDate: addForm.endDate || undefined,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setAddError(data.error || "Failed to create rental");
      setAdding(false);
      return;
    }

    setShowAdd(false);
    setAdding(false);
    setAddForm({ userEmail: "", linkedinAccountId: "", startDate: new Date().toISOString().split("T")[0], endDate: "", autoRenew: true });

    // Refresh
    fetch("/api/admin/rentals")
      .then((r) => r.json())
      .then((d) => setRentals(d.rentals || []));
  };

  const statusVariant = (s: string) => {
    const map: Record<string, "success" | "danger" | "warning" | "default"> = {
      active: "success",
      payment_failed: "danger",
      cancelled: "default",
      expired: "default",
    };
    return map[s] || "default";
  };

  const getAccountLabel = (a: Account) => {
    const email = (a.notes || "").match(/Profile email:\s*(\S+@\S+?\.\S+?)[\s.]/)?.[1];
    return email || a.linkedinName;
  };

  if (loading) return <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-200" />)}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">All Rentals</h2>
        <Button onClick={openAddModal}>Add Rental</Button>
      </div>

      {rentals.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-gray-500">No rentals yet</CardContent></Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Account</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Started</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Expires</th>
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

      {/* Add Rental Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAdd(false)}>
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Rental</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Email</label>
                <input
                  type="email"
                  value={addForm.userEmail}
                  onChange={(e) => setAddForm(f => ({ ...f, userEmail: e.target.value }))}
                  placeholder="customer@email.com"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
                <select
                  value={addForm.linkedinAccountId}
                  onChange={(e) => setAddForm(f => ({ ...f, linkedinAccountId: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Select an available account...</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{getAccountLabel(a)}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={addForm.startDate}
                    onChange={(e) => setAddForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input
                    type="date"
                    value={addForm.endDate}
                    onChange={(e) => setAddForm(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={addForm.autoRenew}
                  onChange={(e) => setAddForm(f => ({ ...f, autoRenew: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                Auto-renew
              </label>
              {addError && <p className="text-sm text-red-600">{addError}</p>}
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={adding}>
                {adding ? "Creating..." : "Create Rental"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
