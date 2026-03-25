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
  location: string | null;
  status: string;
  gologinProfileId: string | null;
  notes: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  monthlyPrice: string | number;
  ambassadorPayment: string | number;
  hasSalesNav: boolean;
  listed: boolean;
  accountAgeMonths: number | null;
  createdAt: string;
  proxyHost: string | null;
  proxyPort: number | null;
  gologinShareLink: string | null;
  linkedinAccountHealth: string | null;
  healthCheckedAt: string | null;
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

  const [showImport, setShowImport] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);

  const csvTemplate = `Account Email,LinkedIn Name,LinkedIn URL,Connections,Industry,Location,Sales Navigator,Account Opened,Rental Price,Ambassador Payment,Status,Profile Photo URL,GoLogin Share Link
mikka@example.com,Mikka Aloria,https://www.linkedin.com/in/mikka-aloria/,5000,Technology,London,no,2020-01-15,50,25,available,https://example.com/photo.jpg,https://app.gologin.com/share/abc123`;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCsvText((ev.target?.result as string) || "");
    };
    reader.readAsText(file);
  };

  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === "," && !inQuotes) { result.push(current.trim()); current = ""; }
      else { current += ch; }
    }
    result.push(current.trim());
    return result;
  };

  const handleCsvImport = async () => {
    if (!csvText.trim()) return;
    setImporting(true);
    setImportResult(null);

    const lines = csvText.trim().split("\n");
    const firstLine = lines[0].toLowerCase().trim();
    const isHeaderRow = firstLine.includes("account email") || firstLine.includes("linkedin name") || firstLine.includes("email");
    const headerCols = isHeaderRow ? parseCsvLine(lines[0]).map(c => c.trim().toLowerCase()) : [];
    const dataLines = isHeaderRow ? lines.slice(1) : lines;

    // Column index mapping — supports any column order
    const colIndex = (name: string) => {
      const i = headerCols.findIndex(h => h.includes(name));
      return i >= 0 ? i : -1;
    };

    const defaultOrder = ["account email", "linkedin name", "linkedin url", "connections", "industry", "location", "sales nav", "account opened", "rental price", "ambassador payment", "status", "profile photo"];
    const getCol = (cols: string[], name: string, fallbackIdx: number) => {
      const idx = isHeaderRow ? colIndex(name) : fallbackIdx;
      return idx >= 0 && idx < cols.length ? cols[idx]?.trim() : "";
    };

    let success = 0;
    let failed = 0;

    for (const line of dataLines) {
      if (!line.trim()) continue;
      const cols = parseCsvLine(line);
      const accountEmail = getCol(cols, "account email", 0) || getCol(cols, "email", 0);
      const linkedinName = getCol(cols, "linkedin name", 1) || getCol(cols, "name", 1);
      const linkedinUrl = getCol(cols, "linkedin url", 2) || getCol(cols, "url", 2);
      const connections = getCol(cols, "connections", 3);
      const industry = getCol(cols, "industry", 4);
      const location = getCol(cols, "location", 5);
      const salesNav = getCol(cols, "sales nav", 6);
      const accountOpened = getCol(cols, "account opened", 7) || getCol(cols, "opened", 7);
      const rentalPrice = getCol(cols, "rental price", 8) || getCol(cols, "rental", 8);
      const ambassadorPayment = getCol(cols, "ambassador payment", 9) || getCol(cols, "ambassador", 9) || getCol(cols, "payout", 9);
      const status = getCol(cols, "status", 10);
      const photoUrl = getCol(cols, "photo", 11) || getCol(cols, "image", 11);
      const gologinShareLink = getCol(cols, "gologin", 12) || getCol(cols, "share link", 12);

      let accountAgeMonths: number | undefined;
      if (accountOpened) {
        const opened = new Date(accountOpened);
        if (!isNaN(opened.getTime())) {
          const now = new Date();
          accountAgeMonths = (now.getFullYear() - opened.getFullYear()) * 12 + (now.getMonth() - opened.getMonth());
        }
      }

      try {
        const res = await fetch("/api/admin/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            linkedinName: linkedinName || accountEmail?.split("@")[0] || "Unknown",
            linkedinUrl: linkedinUrl || undefined,
            connectionCount: parseInt(connections) || 0,
            industry: industry || undefined,
            location: location || undefined,
            hasSalesNav: salesNav?.toLowerCase() === "yes" || salesNav?.toLowerCase() === "true",
            accountAgeMonths: accountAgeMonths || undefined,
            monthlyPrice: parseFloat(rentalPrice) || 0,
            ambassadorPayment: parseFloat(ambassadorPayment) || 0,
            profilePhotoUrl: photoUrl || undefined,
            gologinShareLink: gologinShareLink || undefined,
            notes: `Ambassador account. Owner: admin. Profile email: ${accountEmail || ""}.`,
            status: (["under_review","available","unavailable","rented","maintenance","retired"].includes(status?.trim().toLowerCase()) ? status.trim().toLowerCase() : "under_review"),
          }),
        });
        if (res.ok) success++;
        else { const err = await res.json().catch(() => ({})); console.error("Import row failed:", err); failed++; }
      } catch (e) {
        console.error("Import row error:", e); failed++;
      }
    }

    setImportResult({ success, failed });
    setImporting(false);

    // Refresh the list
    const params = filter ? `?status=${filter}` : "";
    fetch(`/api/admin/accounts${params}`)
      .then((r) => r.json())
      .then((data) => setAccounts(data.accounts || []));
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
        <h2 className="text-2xl font-bold text-gray-900">Linked Accounts</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowImport(true)}>Import CSV</Button>
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
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
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
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Account</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Owner</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Location</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Connections</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Age</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">SN</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Listed</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Rental</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Payout</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Proxy</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">GoLogin Share</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Health</th>
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
                    <p className="text-sm font-medium text-gray-900">{(a.notes || "").match(/Profile email:\s*(\S+@\S+?\.\S+?)[\s.]/)?.[1] || a.linkedinName}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(a.status)}>{a.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{a.ownerEmail || "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{a.location || "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{a.connectionCount > 0 ? formatNumber(a.connectionCount) : "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{a.accountAgeMonths ? `${Math.floor(a.accountAgeMonths / 12)}y ${a.accountAgeMonths % 12}m` : "—"}</td>
                  <td className="px-4 py-3 text-xs">{a.hasSalesNav ? <span className="text-green-600 font-medium">Yes</span> : <span className="text-gray-400">No</span>}</td>
                  <td className="px-4 py-3 text-xs">{a.listed ? <span className="text-green-600 font-medium">Yes</span> : <span className="text-gray-400">No</span>}</td>
                  <td className="px-4 py-3 text-xs font-medium text-gray-900">
                    {Number(a.monthlyPrice) > 0 ? `$${Number(a.monthlyPrice).toFixed(0)}` : <span className="text-gray-400 font-normal">TBC</span>}
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-gray-900">
                    {Number(a.ambassadorPayment) > 0 ? `$${Number(a.ambassadorPayment).toFixed(0)}` : <span className="text-gray-400 font-normal">TBC</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {a.proxyHost ? <span className="font-mono">{a.proxyHost}:{a.proxyPort}</span> : <span className="text-gray-400">None</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {a.gologinShareLink ? (
                      <a href={a.gologinShareLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-medium">Link</a>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {a.linkedinAccountHealth === "active" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />Active
                        </span>
                      ) : a.linkedinAccountHealth === "restricted" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />Restricted
                        </span>
                      ) : a.linkedinAccountHealth === "not_found" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />Not Found
                        </span>
                      ) : a.linkedinAccountHealth === "checking" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />Checking...
                        </span>
                      ) : a.linkedinAccountHealth === "unknown" || a.linkedinAccountHealth === "rate_limited" || a.linkedinAccountHealth === "error" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2.5 py-0.5 text-xs font-semibold text-yellow-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />Unknown
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                          <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />Unchecked
                        </span>
                      )}
                      <button
                        onClick={async () => {
                          setAccounts((prev) => prev.map((acc) => acc.id === a.id ? { ...acc, linkedinAccountHealth: "checking" } : acc));
                          const res = await fetch(`/api/admin/accounts/${a.id}/check-health`, { method: "POST" });
                          if (res.ok) {
                            const data = await res.json();
                            setAccounts((prev) => prev.map((acc) => acc.id === a.id ? { ...acc, linkedinAccountHealth: data.health, healthCheckedAt: data.checkedAt } : acc));
                          } else {
                            setAccounts((prev) => prev.map((acc) => acc.id === a.id ? { ...acc, linkedinAccountHealth: "error" } : acc));
                          }
                        }}
                        className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
                        title="Check health"
                      >{a.linkedinAccountHealth === "checking" ? "..." : "↻"}</button>
                    </div>
                    {a.healthCheckedAt && (
                      <div className="text-[10px] text-gray-400 mt-0.5">{new Date(a.healthCheckedAt).toLocaleDateString()}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 justify-end">
                      {a.status === "under_review" && (
                        <button onClick={() => handleApprove(a.id)} className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700">Approve</button>
                      )}
                      <Link href={`/admin/accounts/${a.id}`} className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200">Edit</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      )}
      {/* CSV Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowImport(false)}>
          <div className="mx-4 w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Import Accounts from CSV</h3>
              <button onClick={() => setShowImport(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-3">Upload a CSV file or paste data below. Each row creates an account with "Under Review" status.</p>

              {/* File upload */}
              <div
                onClick={() => document.getElementById("csv-file-input")?.click()}
                className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-4 mb-4 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                <span className="text-sm text-gray-600 font-medium">{csvText ? "File loaded — click to replace" : "Click to upload CSV file"}</span>
              </div>
              <input id="csv-file-input" type="file" accept=".csv,.txt" onChange={handleFileUpload} style={{ display: "none" }} />

              <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Template</p>
                <pre className="text-xs text-gray-600 whitespace-pre-wrap break-all">{csvTemplate}</pre>
                <button
                  onClick={() => { navigator.clipboard.writeText(csvTemplate); }}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Copy template
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([csvTemplate], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "klabber-import-template.csv";
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="mt-2 ml-3 text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Download template
                </button>
              </div>
              <p className="text-xs text-gray-400 mb-1">
                <strong>Columns:</strong> Account Email, LinkedIn Name, LinkedIn URL, Connections, Industry, Location, Sales Navigator (yes/no), Account Opened (YYYY-MM-DD), Rental Price, Ambassador Payment, Status (available/under_review/unavailable), Profile Photo URL, GoLogin Share Link
              </p>
              <p className="text-xs text-gray-400">
                <strong>Profile photos:</strong> Use direct image URLs (Imgur, Cloudflare, etc).
              </p>
            </div>

            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={8}
              placeholder="CSV data will appear here when you upload a file, or paste directly..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-mono text-gray-700 mb-4"
            />

            {importResult && (
              <div className={`mb-4 rounded-lg p-3 text-sm ${importResult.failed === 0 ? "bg-green-50 text-green-700 border border-green-200" : "bg-yellow-50 text-yellow-700 border border-yellow-200"}`}>
                Imported {importResult.success} account{importResult.success !== 1 ? "s" : ""} successfully.
                {importResult.failed > 0 && ` ${importResult.failed} failed.`}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowImport(false)}>Cancel</Button>
              <Button onClick={handleCsvImport} disabled={importing || !csvText.trim()}>
                {importing ? "Importing..." : "Import Accounts"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
