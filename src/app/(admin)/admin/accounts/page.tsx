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

  const statusVariant = (s: string) => {
    const map: Record<string, "success" | "info" | "warning" | "default"> = {
      available: "success",
      rented: "info",
      maintenance: "warning",
      retired: "default",
    };
    return map[s] || "default";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">LinkedIn Accounts</h2>
        <Link href="/admin/accounts/new">
          <Button>Add Account</Button>
        </Link>
      </div>

      <div className="mb-4 flex gap-2">
        {["", "available", "rented", "maintenance", "retired"].map((s) => (
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
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Connections</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Industry</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Current Renter</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">GoLogin</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {accounts.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
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
                    {a.rentals[0]?.user.fullName || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {a.gologinProfileId ? (
                      <Badge variant="success">Linked</Badge>
                    ) : (
                      <Badge variant="default">None</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    {openProfiles.has(a.id) ? (
                      <button
                        onClick={() => handleClose(a.id)}
                        disabled={closing === a.id}
                        className="text-sm text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                      >
                        {closing === a.id ? "Saving & Closing..." : "Close"}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpen(a.id, a.linkedinName)}
                        disabled={opening === a.id}
                        className="text-sm text-green-600 hover:text-green-800 font-medium disabled:opacity-50"
                      >
                        {opening === a.id ? "Opening..." : "Open"}
                      </button>
                    )}
                    <Link href={`/admin/accounts/${a.id}`} className="text-sm text-blue-600 hover:text-blue-800">
                      Edit
                    </Link>
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
