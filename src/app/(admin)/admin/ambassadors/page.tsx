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

  if (loading) return <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-200" />)}</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Ambassador Applications</h2>

      {applications.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-gray-500">No applications yet</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <Card key={app.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">{app.fullName}</h3>
                      <Badge variant={statusVariant(app.status)}>{app.status}</Badge>
                      {app.offeredAmount && (
                        <Badge variant="info">
                          Offer: {formatCurrency(typeof app.offeredAmount === "string" ? parseFloat(app.offeredAmount) : app.offeredAmount)}/mo
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {app.email}
                      {app.contactNumber && <span className="ml-3">{app.contactNumber}</span>}
                    </p>
                    <a
                      href={app.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {app.linkedinUrl}
                    </a>
                    <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-500">
                      {app.connectionCount && <span>{app.connectionCount.toLocaleString()} connections</span>}
                      {app.industry && <span>{app.industry}</span>}
                      {app.location && <span>{app.location}</span>}
                      <span>Applied {formatDate(app.createdAt)}</span>
                    </div>
                    {app.notes && (
                      <p className="mt-2 text-sm text-gray-600 italic">&quot;{app.notes}&quot;</p>
                    )}
                    {app.adminNotes && (
                      <p className="mt-1 text-sm text-gray-500">Admin: {app.adminNotes}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    {app.status === "pending" && (
                      <Button size="sm" onClick={() => updateStatus(app.id, "reviewing")}>
                        Start Review
                      </Button>
                    )}
                    {app.status === "reviewing" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => {
                            setEditing(app.id);
                            setOfferAmount(app.offeredAmount?.toString() || "");
                            setAdminNotes(app.adminNotes || "");
                          }}
                        >
                          Make Offer
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => updateStatus(app.id, "rejected")}>
                          Reject
                        </Button>
                      </>
                    )}
                    {app.status === "approved" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(app.id, "onboarded")}>
                        Mark Onboarded
                      </Button>
                    )}
                  </div>
                </div>

                {/* Offer form */}
                {editing === app.id && (
                  <div className="mt-4 rounded-lg bg-gray-50 p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
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
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          updateStatus(app.id, "approved", {
                            offeredAmount: parseFloat(offerAmount),
                            adminNotes,
                          })
                        }
                      >
                        Approve with Offer
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
