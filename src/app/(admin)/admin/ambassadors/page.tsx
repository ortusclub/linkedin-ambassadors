"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatCurrency } from "@/lib/utils";
import { isLikelyTestEmail } from "@/lib/test-mode";

interface Application {
  id: string;
  fullName: string;
  email: string;
  linkedinEmail: string | null;
  contactNumber: string | null;
  linkedinUrl: string;
  connectionCount: number | null;
  industry: string | null;
  location: string | null;
  notes: string | null;
  status: string;
  offeredAmount: string | number | null;
  adminNotes: string | null;
  createdAt: string;
}

export default function AdminAmbassadorsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [editing, setEditing] = useState<string | null>(null);
  const [offerAmount, setOfferAmount] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [sheets, setSheets] = useState<{ open: boolean; url?: string; configured?: boolean }>({ open: false });

  const openSheets = async () => {
    setSheets({ open: true });
    try {
      const res = await fetch("/api/admin/ambassadors/export-url");
      const data = await res.json();
      setSheets({ open: true, url: data.url, configured: data.configured });
    } catch {
      setSheets({ open: true, configured: false });
    }
  };

  useEffect(() => {
    fetch("/api/admin/ambassadors")
      .then((r) => r.json())
      .then((data) => setApplications(data.applications || []))
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id: string, status: string, extra?: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/ambassadors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, ...extra }),
    });
    if (res.ok) {
      const data = await res.json();
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...data.application } : a))
      );
      setEditing(null);
      // Automatically switch to the new status tab
      setFilter(status === "reviewing" ? "pending" : status);
    }
  };

  const statusVariant = (s: string) => {
    const map: Record<string, "default" | "info" | "success" | "warning" | "danger"> = {
      pending: "warning",
      reviewing: "info",
      approved: "success",
      rejected: "danger",
    };
    return map[s] || "default";
  };

  const filteredRaw = filter
    ? filter === "pending"
      ? applications.filter((a) => a.status === "pending" || a.status === "reviewing")
      : applications.filter((a) => a.status === filter)
    : applications;

  // Group a person's submissions together (same Owner Email = same POC), most-recent
  // owner first so new submitters surface at the top.
  const lastSeen = new Map<string, number>();
  filteredRaw.forEach((a) => {
    const t = new Date(a.createdAt).getTime();
    lastSeen.set(a.email, Math.max(lastSeen.get(a.email) ?? 0, t));
  });
  const filtered = [...filteredRaw].sort((a, b) => {
    if (a.email !== b.email) return (lastSeen.get(b.email)! - lastSeen.get(a.email)!);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (loading) return <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-200" />)}</div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Submissions</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">New ambassador applications. Review each one and set it to Accepted or Rejected — accepting automatically creates the profile in your inventory.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={openSheets}>Google Sheets</Button>
          <p className="text-sm text-gray-500 whitespace-nowrap">{applications.length} total</p>
        </div>
      </div>

      {sheets.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSheets({ open: false })}>
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Submissions to Google Sheets</h3>
            {sheets.configured === false ? (
              <div className="text-sm text-gray-600 space-y-2">
                <p>Live sync isn&apos;t set up yet. Add an env var <code className="rounded bg-gray-100 px-1">RENTALS_EXPORT_KEY</code> (any long random string) in Vercel, redeploy, then come back here to get your sheet link.</p>
                <p>This is the same key used by the Rentals and Inventory exports.</p>
              </div>
            ) : sheets.url ? (
              <div className="text-sm text-gray-600 space-y-3">
                <p>In a Google Sheet, paste this into cell <strong>A1</strong> — it auto-pulls the live submissions (refreshes about hourly):</p>
                <div className="rounded-lg bg-gray-900 p-3">
                  <code className="block break-all text-xs text-green-300">=IMPORTDATA(&quot;{sheets.url}&quot;)</code>
                </div>
                <button
                  onClick={() => navigator.clipboard?.writeText(`=IMPORTDATA("${sheets.url}")`)}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                >Copy formula</button>
                <p className="text-xs text-amber-600">⚠️ Anyone with this link can see the submissions data — keep the sheet (and link) private.</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Loading…</p>
            )}
            <div className="mt-5 flex justify-end">
              <Button variant="outline" onClick={() => setSheets({ open: false })}>Close</Button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 flex gap-2">
        {[
          { value: "pending", label: "Received" },
          { value: "approved", label: "Accepted" },
          { value: "rejected", label: "Rejected" },
          { value: "", label: "All" },
        ].map((s) => (
          <button
            key={s.value}
            onClick={() => setFilter(s.value)}
            className={`rounded-full px-3 py-1 text-sm ${
              filter === s.value
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {s.label} <span className="opacity-70 text-xs ml-0.5">{s.value === "pending" ? applications.filter((a) => a.status === "pending" || a.status === "reviewing").length : s.value ? applications.filter((a) => a.status === s.value).length : applications.length}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-gray-500">No valuations found</CardContent></Card>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  <th colSpan={2} className="px-4 pt-3 pb-1 text-left">👤 Owner (POC)</th>
                  <th colSpan={5} className="px-4 pt-3 pb-1 text-left border-l border-gray-200">🔗 LinkedIn Account</th>
                  <th colSpan={2} className="px-4 pt-3 pb-1 text-left border-l border-gray-200">📋 Review</th>
                </tr>
                <tr>
                  <th className="px-4 pb-3 pt-1 text-left text-xs font-medium uppercase text-gray-500">Owner Email</th>
                  <th className="px-4 pb-3 pt-1 text-left text-xs font-medium uppercase text-gray-500">Contact</th>
                  <th className="px-4 pb-3 pt-1 text-left text-xs font-medium uppercase text-gray-500 border-l border-gray-200">Account Name</th>
                  <th className="px-4 pb-3 pt-1 text-left text-xs font-medium uppercase text-gray-500">LinkedIn URL</th>
                  <th className="px-4 pb-3 pt-1 text-left text-xs font-medium uppercase text-gray-500">Login Email</th>
                  <th className="px-4 pb-3 pt-1 text-left text-xs font-medium uppercase text-gray-500">Connections</th>
                  <th className="px-4 pb-3 pt-1 text-left text-xs font-medium uppercase text-gray-500">Location</th>
                  <th className="px-4 pb-3 pt-1 text-left text-xs font-medium uppercase text-gray-500 border-l border-gray-200">Status</th>
                  <th className="px-4 pb-3 pt-1 text-left text-xs font-medium uppercase text-gray-500">Applied</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((app) => {
                  const offer = app.offeredAmount
                    ? formatCurrency(typeof app.offeredAmount === "string" ? parseFloat(app.offeredAmount) : app.offeredAmount)
                    : null;
                  return (
                    <tr key={app.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        <span className="inline-flex items-center gap-1.5">
                          {app.email}
                          {isLikelyTestEmail(app.email) && <span className="rounded bg-purple-100 px-1 py-0.5 text-[9px] font-semibold text-purple-700">TEST</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{app.contactNumber || "—"}</td>
                      <td className="px-4 py-3 border-l border-gray-100">
                        <a href={app.linkedinUrl.startsWith("http") ? app.linkedinUrl : `https://${app.linkedinUrl}`} target="_blank" rel="noopener noreferrer" className="font-medium text-gray-900 hover:text-blue-600">
                          {app.fullName}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <a href={app.linkedinUrl.startsWith("http") ? app.linkedinUrl : `https://${app.linkedinUrl}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                          {app.linkedinUrl.replace("https://www.linkedin.com/in/", "").replace("https://linkedin.com/in/", "").replace(/\/$/, "") || "—"}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{app.linkedinEmail && app.linkedinEmail !== app.email ? app.linkedinEmail : <span className="text-gray-400">Same as owner</span>}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {app.connectionCount ? app.connectionCount.toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{app.location || app.industry || "—"}</td>
                      <td className="px-4 py-3 border-l border-gray-100">
                        <select
                          value={app.status}
                          onChange={(e) => updateStatus(app.id, e.target.value)}
                          className={`rounded-full px-3 py-1 text-xs font-semibold border-0 cursor-pointer appearance-none text-center ${
                            (app.status === "pending" || app.status === "reviewing") ? "bg-yellow-100 text-yellow-800" :
                            app.status === "approved" ? "bg-green-100 text-green-800" :
                            app.status === "rejected" ? "bg-red-100 text-red-800" :
                            "bg-gray-100 text-gray-800"
                          }`}
                        >
                          <option value="pending">Received</option>
                          <option value="approved">Accepted</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(app.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Offer modal */}
          {editing && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditing(null)}>
              <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Make Offer</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Offer ($)</label>
                    <input
                      type="number"
                      value={offerAmount}
                      onChange={(e) => setOfferAmount(e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="e.g. 25"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes</label>
                    <input
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="Internal notes..."
                    />
                  </div>
                </div>
                <div className="mt-6 flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                  <Button
                    onClick={() =>
                      updateStatus(editing, "approved", {
                        offeredAmount: parseFloat(offerAmount),
                        adminNotes,
                      })
                    }
                  >
                    Approve with Offer
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
