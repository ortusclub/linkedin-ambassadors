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
  isTest: boolean;
  referralSource: string | null;
  vettingStartedAt: string | null;
  vettedAt: string | null;
  vettingInfo: { company?: string; website?: string; role?: string; useCase?: string; tools?: string } | null;
  vettingReview: string | null;
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [vetView, setVetView] = useState<Customer | null>(null);

  const setReview = async (id: string, review: string) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, vettingReview: review } : c)));
    setVetView((v) => (v && v.id === id ? { ...v, vettingReview: review } : v));
    await fetch("/api/admin/customers", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, vettingReview: review }) });
  };

  useEffect(() => {
    fetch("/api/admin/customers")
      .then((r) => r.json())
      .then((data) => setCustomers(data.customers || []))
      .finally(() => setLoading(false));
  }, []);

  const toggleTest = async (c: Customer) => {
    const next = !c.isTest;
    setCustomers((prev) => prev.map((x) => x.id === c.id ? { ...x, isTest: next } : x));
    const res = await fetch("/api/admin/customers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: c.id, isTest: next }),
    });
    if (!res.ok) {
      setCustomers((prev) => prev.map((x) => x.id === c.id ? { ...x, isTest: !next } : x));
      alert("Failed to update test flag");
    }
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
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Heard From</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Vetting</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Active Rentals</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Total Rentals</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Joined</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900 text-sm">
                    <span className="inline-flex items-center gap-2">
                      {c.fullName}
                      {c.isTest && <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700">TEST</span>}
                    </span>
                  </td>
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
                  <td className="px-4 py-3 text-sm text-gray-600">{c.referralSource || "—"}</td>
                  <td className="px-4 py-3 text-sm">
                    {c.vettedAt ? (
                      <button
                        onClick={() => setVetView(c)}
                        title="View vetting answers"
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium cursor-pointer ${
                          c.vettingReview === "verified" ? "bg-green-100 text-green-700 hover:bg-green-200" :
                          c.vettingReview === "flagged" ? "bg-red-100 text-red-700 hover:bg-red-200" :
                          "bg-amber-100 text-amber-700 hover:bg-amber-200"
                        }`}
                      >{c.vettingReview === "verified" ? "✓ Verified" : c.vettingReview === "flagged" ? "⚠ Flagged" : "● Needs review"}</button>
                    ) : c.vettingStartedAt ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-600" title={`Opened the vetting form ${new Date(c.vettingStartedAt).toLocaleDateString()} but didn't finish`}>⏳ Started, didn&apos;t finish</span>
                    ) : (
                      <span className="text-xs text-gray-400">Not vetted</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.activeRentals}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.totalRentals}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(c.createdAt)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => toggleTest(c)}
                      className={`mr-1 inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${c.isTest ? "bg-purple-100 text-purple-700 hover:bg-purple-200" : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"}`}
                      title="Toggle test flag — test customers are hidden from live dashboard numbers"
                    >
                      {c.isTest ? "Test" : "Mark test"}
                    </button>
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

      {vetView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setVetView(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Vetting — {vetView.fullName}</h2>
                <p className="text-xs text-gray-500">{vetView.email}{vetView.vettedAt ? ` · vetted ${formatDate(vetView.vettedAt)}` : ""}</p>
              </div>
              <button onClick={() => setVetView(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
            </div>
            <dl className="space-y-3 text-sm">
              {[
                ["Company", vetView.vettingInfo?.company],
                ["Website / LinkedIn", vetView.vettingInfo?.website],
                ["Role", vetView.vettingInfo?.role],
                ["Use case", vetView.vettingInfo?.useCase],
                ["Tools", vetView.vettingInfo?.tools || "—"],
              ].map(([label, val]) => (
                <div key={label as string}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</dt>
                  <dd className="text-gray-800">
                    {label === "Website / LinkedIn" && val ? (
                      <a href={String(val).startsWith("http") ? String(val) : `https://${val}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{val}</a>
                    ) : (val || "—")}
                  </dd>
                </div>
              ))}
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Use policy</dt>
                <dd className="text-green-700">✓ Agreed (responsible for own + team's use)</dd>
              </div>
            </dl>

            <div className="mt-5 border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                Your review {vetView.vettingReview === "verified" ? "— ✓ Verified" : vetView.vettingReview === "flagged" ? "— ⚠ Flagged" : "— pending your check"}
              </p>
              <p className="text-xs text-gray-500 mb-3">Check their company/LinkedIn looks legit, then mark it. (Doesn&apos;t affect their access — it&apos;s your record.)</p>
              <div className="flex gap-2">
                <button onClick={() => setReview(vetView.id, "verified")} className="flex-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700">✓ Verify</button>
                <button onClick={() => setReview(vetView.id, "flagged")} className="flex-1 rounded-lg bg-red-500 px-3 py-2 text-sm font-semibold text-white hover:bg-red-600">⚠ Flag</button>
                {vetView.vettingReview !== "pending" && (
                  <button onClick={() => setReview(vetView.id, "pending")} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">Reset</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
