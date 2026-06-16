"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  paymentDetails: string;
}

const PAYMENT_OPTIONS = [
  { value: "crypto_wallet", label: "Crypto Wallet" },
  { value: "usdc", label: "USDC" },
  { value: "paypal", label: "PayPal" },
  { value: "wise", label: "Wise" },
  { value: "bank_transfer", label: "Bank Transfer" },
];

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPayment, setSavingPayment] = useState<string | null>(null);
  const [editingDetails, setEditingDetails] = useState<Customer | null>(null);
  const [detailsText, setDetailsText] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/customers")
      .then((r) => r.json())
      .then((data) => setCustomers(data.customers || []))
      .finally(() => setLoading(false));
  }, []);

  const handlePaymentChange = async (email: string, paymentMethod: string) => {
    setSavingPayment(email);
    const res = await fetch("/api/admin/customers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, paymentMethod }),
    });
    if (res.ok) {
      setCustomers((prev) =>
        prev.map((c) => c.email === email ? { ...c, paymentMethod } : c)
      );
    }
    setSavingPayment(null);
  };

  const handleDetailsSave = async () => {
    if (!editingDetails) return;
    setSavingDetails(true);
    const res = await fetch("/api/admin/customers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: editingDetails.email, paymentDetails: detailsText }),
    });
    if (res.ok) {
      setCustomers((prev) =>
        prev.map((c) => c.email === editingDetails.email ? { ...c, paymentDetails: detailsText } : c)
      );
    }
    setSavingDetails(false);
    setEditingDetails(null);
  };

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
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Payment Details</th>
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
                    <select
                      value={c.paymentMethod}
                      onChange={(e) => handlePaymentChange(c.email, e.target.value)}
                      disabled={savingPayment === c.email}
                      className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 bg-white hover:border-gray-300 focus:border-blue-500 focus:outline-none disabled:opacity-50"
                    >
                      {PAYMENT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 max-w-[150px] truncate">{c.paymentDetails || "—"}</span>
                      <button
                        onClick={() => { setEditingDetails(c); setDetailsText(c.paymentDetails || ""); }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
                      >
                        Edit
                      </button>
                    </div>
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

      {/* Edit Payment Details Modal */}
      {editingDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditingDetails(null)}>
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Payment Details</h3>
            <p className="text-sm text-gray-500 mb-4">{editingDetails.fullName} ({editingDetails.email})</p>
            <textarea
              value={detailsText}
              onChange={(e) => setDetailsText(e.target.value)}
              rows={5}
              placeholder="e.g. Bank: HSBC, Account: 12345678, Sort Code: 12-34-56, Name: John Smith"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 mb-4"
            />
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setEditingDetails(null)}>Cancel</Button>
              <Button onClick={handleDetailsSave} disabled={savingDetails}>
                {savingDetails ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
