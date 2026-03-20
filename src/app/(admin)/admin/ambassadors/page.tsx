"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatCurrency } from "@/lib/utils";

interface Application {
  id: string;
  fullName: string;
  email: string;
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
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [offerAmount, setOfferAmount] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

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
    }
  };

  const statusVariant = (s: string) => {
    const map: Record<string, "default" | "info" | "success" | "warning" | "danger"> = {
      pending: "warning",
      reviewing: "info",
      approved: "success",
      rejected: "danger",
      onboarded: "success",
    };
    return map[s] || "default";
  };

  const filtered = filter
    ? applications.filter((a) => a.status === filter)
    : applications;

  if (loading) return <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-200" />)}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Valuations</h2>
        <p className="text-sm text-gray-500">{applications.length} total</p>
      </div>

      <div className="mb-4 flex gap-2">
        {["", "pending", "reviewing", "approved", "rejected", "onboarded"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1 text-sm ${
              filter === s
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-gray-500">No valuations found</CardContent></Card>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Applicant</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">LinkedIn</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Connections</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Offer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Applied</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((app) => {
                  const offer = app.offeredAmount
                    ? formatCurrency(typeof app.offeredAmount === "string" ? parseFloat(app.offeredAmount) : app.offeredAmount)
                    : null;
                  return (
                    <tr key={app.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{app.fullName}</p>
                        <p className="text-xs text-gray-500">{app.email}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{app.contactNumber || "—"}</td>
                      <td className="px-4 py-3">
                        <a
                          href={app.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 truncate block max-w-[180px]"
                        >
                          {app.linkedinUrl.replace("https://www.linkedin.com/in/", "").replace(/\/$/, "")}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {app.connectionCount ? app.connectionCount.toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{app.location || app.industry || "—"}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{offer ? `${offer}/mo` : "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(app.status)}>{app.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(app.createdAt)}</td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {app.status === "pending" && (
                          <button
                            onClick={() => updateStatus(app.id, "reviewing")}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Review
                          </button>
                        )}
                        {app.status === "reviewing" && (
                          <>
                            <button
                              onClick={() => {
                                setEditing(app.id);
                                setOfferAmount(app.offeredAmount?.toString() || "");
                                setAdminNotes(app.adminNotes || "");
                              }}
                              className="text-sm text-green-600 hover:text-green-800 font-medium"
                            >
                              Make Offer
                            </button>
                            <button
                              onClick={() => updateStatus(app.id, "rejected")}
                              className="text-sm text-red-600 hover:text-red-800 font-medium"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {app.status === "approved" && (
                          <button
                            onClick={() => updateStatus(app.id, "onboarded")}
                            className="text-sm text-green-600 hover:text-green-800 font-medium"
                          >
                            Mark Onboarded
                          </button>
                        )}
                      </td>
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
