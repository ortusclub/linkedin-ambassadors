"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

interface Customer {
  id: string;
  fullName: string;
  email: string;
  contactNumber: string | null;
  status: string;
  createdAt: string;
  activeRentals: number;
  totalRentals: number;
  paymentMethod: string;
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/customers")
      .then((r) => r.json())
      .then((data) => setCustomers(data.customers || []))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (c: Customer) => {
    if (!window.confirm(`Permanently delete ${c.fullName} (${c.email}) and ALL their data — rentals, transactions, sessions? This can't be undone.`)) return;
    setDeleting(c.id);
    try {
      const res = await fetch("/api/admin/customers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id }),
      });
      if (res.ok) {
        setCustomers((prev) => prev.filter((x) => x.id !== c.id));
      } else {
        const d = await res.json().catch(() => ({}));
        alert("Failed: " + (d.error || res.status));
      }
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-200" />)}</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">LinkedVelocity Accounts</h2>
      <p className="mt-1 mb-6 max-w-2xl text-sm text-gray-500">Customers who rent LinkedIn profiles — your demand side. Manage their details and see how many rentals each one has.</p>

      {customers.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-gray-500">No clapper accounts yet</CardContent></Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Payment Method</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Active Rentals</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Total Rentals</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Joined</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900 text-sm">{c.fullName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {c.contactNumber ? (
                      <span className="inline-flex items-center gap-1">
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${c.contactNumber.startsWith("telegram:") ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-600"}`}>
                          {c.contactNumber.startsWith("telegram:") ? "TG" : "WA"}
                        </span>
                        <span className="text-xs">{c.contactNumber.replace(/^(whatsapp|telegram):/, "")}</span>
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={c.status === "active" ? "success" : "danger"}>{c.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-700">{c.paymentMethod}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.activeRentals}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.totalRentals}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(c.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(c)}
                      disabled={deleting === c.id}
                      className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 whitespace-nowrap"
                      title="Permanently delete this customer + all their data"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      {deleting === c.id ? "Deleting…" : "Delete"}
                    </button>
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
