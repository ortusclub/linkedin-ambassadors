"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";

interface Account {
  id: string;
  linkedinName: string;
  linkedinHeadline: string | null;
  connectionCount: number;
  industry: string | null;
  status: string;
  gologinProfileId: string | null;
  notes: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  proxyHost: string | null;
  proxyPort: number | null;
  rentals: Array<{
    user: { fullName: string; email: string };
  }>;
}

export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const [opening, setOpening] = useState<string | null>(null);
  const [openProfiles, setOpenProfiles] = useState<Set<string>>(new Set());
  const [closing, setClosing] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === accounts.length && accounts.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(accounts.map((a) => a.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Are you sure you want to remove ${selected.size} account${selected.size > 1 ? "s" : ""}? This cannot be undone.`)) return;
    setBulkDeleting(true);
    const results = await Promise.all(
      Array.from(selected).map((id) =>
        fetch(`/api/admin/accounts/${id}`, { method: "DELETE" }).then((r) => r.ok ? id : null)
      )
    );
    const deleted = new Set(results.filter(Boolean));
    setAccounts((prev) => prev.filter((a) => !deleted.has(a.id)));
    setSelected(new Set());
    setBulkDeleting(false);
  };

  useEffect(() => {
    const params = filter ? `?status=${filter}` : "";
    fetch(`/api/admin/accounts${params}`)
      .then((r) => r.json())
      .then((data) => setAccounts(data.accounts || []))
      .finally(() => setLoading(false));

    // Fetch active browser sessions once on load
    fetch("/api/admin/browser/active")
      .then((r) => r.json())
      .then((data) => {
        if (data.active) setOpenProfiles(new Set(data.active));
      })
      .catch(() => {});
  }, [filter]);

  const handleOpen = async (accountId: string, accountName: string) => {
    setOpening(accountId);
    try {
      const res = await fetch("/api/admin/browser/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, accountName }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to open browser");
      } else {
        setOpenProfiles((prev) => new Set(prev).add(accountId));
      }
    } catch {
      alert("Failed to open browser");
    } finally {
      setOpening(null);
    }
  };

  const handleClose = async (profileId: string) => {
    setClosing(profileId);
    try {
      const res = await fetch("/api/admin/browser/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId }),
      });
      const data = await res.json();
      if (res.ok) {
        setOpenProfiles((prev) => {
          const next = new Set(prev);
          next.delete(profileId);
          return next;
        });
      } else {
        alert(data.error || "Failed to close browser");
      }
    } catch {
      alert("Failed to close browser");
    } finally {
      setClosing(null);
    }
  };

  const handleDelete = async (accountId: string) => {
    if (!confirm("Are you sure you want to remove this account? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/accounts/${accountId}`, { method: "DELETE" });
    if (res.ok) {
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    } else {
      alert("Failed to remove account");
    }
  };

  const handleApprove = async (accountId: string) => {
    const res = await fetch(`/api/admin/accounts/${accountId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "available" }),
    });
    if (res.ok) {
      setAccounts((prev) =>
        prev.map((a) => a.id === accountId ? { ...a, status: "available" } : a)
      );
    }
  };

  const statusVariant = (s: string) => {
    const map: Record<string, "success" | "info" | "warning" | "danger" | "default"> = {
      under_review: "warning",
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
        <h2 className="text-2xl font-bold text-gray-900">LinkedIn Accounts</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => { window.location.href = "klabber://open"; }}>Open Klabber App</Button>
          <Link href="/admin/accounts/new">
            <Button>Add Account</Button>
          </Link>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        {["", "under_review", "available", "rented", "unavailable", "maintenance", "retired"].map((s) => (
          <button
            key={s}
            onClick={() => { setFilter(s); setLoading(true); }}
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

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-200" />)}</div>
      ) : accounts.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-gray-500">No accounts found</CardContent></Card>
      ) : (
        <div>
        {selected.size > 0 && (
          <div className="mb-3 flex items-center justify-between rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <span className="text-sm font-medium text-red-800">{selected.size} account{selected.size > 1 ? "s" : ""} selected</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setSelected(new Set())} className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100">
                Clear
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {bulkDeleting ? "Removing..." : `Remove ${selected.size} Account${selected.size > 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        )}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selected.size > 0 && selected.size === accounts.length}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Connections</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Industry</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Owner</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Current Renter</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Proxy</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {accounts.map((a) => (
                <tr key={a.id} className={`hover:bg-gray-50 ${selected.has(a.id) ? "bg-red-50/50" : ""}`}>
                  <td className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selected.has(a.id)}
                      onChange={() => toggleSelect(a.id)}
                      className="rounded border-gray-300 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{a.linkedinName}</p>
                      {a.linkedinHeadline && (
                        <p className="text-xs text-gray-500 truncate max-w-xs">{a.linkedinHeadline}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(a.status)}>{a.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatNumber(a.connectionCount)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{a.industry || "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {a.ownerEmail || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {a.rentals[0]?.user.fullName || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {a.proxyHost ? (
                      <span className="text-xs font-mono">{a.proxyHost}:{a.proxyPort}</span>
                    ) : (
                      <span className="text-gray-400">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    {a.status === "under_review" && (
                      <button
                        onClick={() => handleApprove(a.id)}
                        className="text-sm text-green-600 hover:text-green-800 font-medium"
                      >
                        Approve
                      </button>
                    )}
                    <button
                      onClick={() => { window.location.href = "klabber://open"; }}
                      className="text-sm text-green-600 hover:text-green-800 font-medium"
                    >
                      Open App
                    </button>
                    <Link href={`/admin/accounts/${a.id}`} className="text-sm text-blue-600 hover:text-blue-800">
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="text-sm text-red-600 hover:text-red-800 font-medium"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      )}
    </div>
  );
}
