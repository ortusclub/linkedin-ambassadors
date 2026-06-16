"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { paymentMethod, paymentStatus, accessStatus, isManualGrant } from "@/lib/rental-tracker";

interface Rental {
  id: string;
  status: string;
  startDate: string;
  currentPeriodEnd: string | null;
  autoRenew: boolean;
  paused: boolean;
  usdcPayment: boolean;
  accessGrantedAt: string | null;
  accessRevokedAt: string | null;
  notes: string | null;
  campaignGoal: string | null;
  renterAccountsLive: number;
  gologinShareIds: { email: string; shareId: string }[];
  user: { id: string; fullName: string; email: string; contactNumber: string | null; company: string | null; industry: string | null; createdAt: string };
  linkedinAccount: { id: string; linkedinName: string; connectionCount: number; gologinProfileId: string | null; notes: string | null };
}

interface Account {
  id: string;
  linkedinName: string;
  status: string;
  notes: string | null;
}

function fmt(d: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

const PAY_BADGE: Record<string, string> = {
  Paid: "bg-green-100 text-green-700",
  Pending: "bg-blue-100 text-blue-700",
  Overdue: "bg-red-100 text-red-700",
  Expired: "bg-gray-100 text-gray-500",
  Cancelled: "bg-gray-100 text-gray-500",
};
const ACCESS_BADGE: Record<string, string> = {
  Granted: "bg-green-100 text-green-700",
  Paused: "bg-amber-100 text-amber-700",
  Revoked: "bg-red-100 text-red-700",
  "Not granted": "bg-gray-100 text-gray-500",
};

export default function AdminRentalsPage() {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [addForm, setAddForm] = useState({ userEmail: "", linkedinAccountId: "", startDate: new Date().toISOString().split("T")[0], endDate: "", autoRenew: true });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [accessBusy, setAccessBusy] = useState<string | null>(null);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [sheets, setSheets] = useState<{ open: boolean; url?: string; configured?: boolean }>({ open: false });

  const refreshRentals = () =>
    fetch("/api/admin/rentals").then((r) => r.json()).then((d) => setRentals(d.rentals || []));

  const handleAccess = async (rentalId: string, action: "grant" | "revoke" | "end", manualGrant = false) => {
    if (action === "end" && !window.confirm("End this rental permanently? This cuts the renter's GoLogin access and marks the rental cancelled (no resume).")) return;
    // Access was shared manually (no system-tracked share), so we can mark it
    // paused but can't auto-cut it — the admin must also remove it in GoLogin.
    if (action === "revoke" && manualGrant && !window.confirm("This access was granted manually, so there's no stored share for us to revoke automatically. We'll mark it Paused here — but you must ALSO remove the share in GoLogin yourself. Continue?")) return;
    setAccessBusy(rentalId);
    try {
      const res = await fetch(`/api/admin/rentals/${rentalId}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) alert(`Failed: ${data.error || "unknown error"}`);
      await refreshRentals();
    } catch (e) {
      alert("Request failed: " + (e instanceof Error ? e.message : ""));
    } finally {
      setAccessBusy(null);
    }
  };

  // Permanently delete a rental record (for test/junk rentals).
  const handleDeleteRental = async (id: string) => {
    if (!window.confirm("Permanently delete this rental record? This removes it from the tracker and frees the account. (For test/junk rentals — use 'End' for a real cancellation.)")) return;
    setAccessBusy(id);
    try {
      const res = await fetch(`/api/admin/rentals/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert("Failed: " + (d.error || res.status));
      } else {
        setRentals((prev) => prev.filter((r) => r.id !== id));
      }
    } finally {
      setAccessBusy(null);
    }
  };

  // Inline-edit tracker fields. company/industry live on the user; notes/campaignGoal on the rental.
  const USER_FIELDS = new Set(["company", "industry"]);
  const saveField = async (r: Rental, field: "company" | "industry" | "notes" | "campaignGoal", value: string) => {
    const current =
      field === "company" ? (r.user.company || "") :
      field === "industry" ? (r.user.industry || "") :
      field === "campaignGoal" ? (r.campaignGoal || "") : (r.notes || "");
    if (value === current) return;
    setSavingField(`${r.id}:${field}`);
    try {
      await fetch("/api/admin/rentals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: r.id, [field]: value || null }),
      });
      setRentals((prev) => prev.map((x) => {
        if (x.id !== r.id) return x;
        if (USER_FIELDS.has(field)) return { ...x, user: { ...x.user, [field]: value || null } };
        return { ...x, [field]: value || null };
      }));
    } catch {
      alert("Failed to save");
    } finally {
      setSavingField(null);
    }
  };

  useEffect(() => {
    fetch("/api/admin/rentals").then((r) => r.json()).then((data) => setRentals(data.rentals || [])).finally(() => setLoading(false));
  }, []);

  const openAddModal = () => {
    setShowAdd(true);
    setAddError("");
    fetch("/api/admin/accounts?status=available").then((r) => r.json()).then((data) => setAccounts(data.accounts || [])).catch(() => {});
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
      body: JSON.stringify({ ...addForm, endDate: addForm.endDate || undefined }),
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
    refreshRentals();
  };

  const getAccountLabel = (a: Account) => {
    const email = (a.notes || "").match(/Profile email:\s*(\S+@\S+?\.\S+?)[\s.]/)?.[1];
    return email || a.linkedinName;
  };

  const downloadCsv = () => {
    const headers = ["Renter / Company", "Contact Name", "Email", "Phone / Telegram", "Industry", "Accounts Rented", "Account(s) Used", "Billing Start Date", "Next Billing Date", "Auto-Renew", "Payment Method", "Payment Status", "Campaign Goal", "Notes"];
    const cell = (v: unknown) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const d = (s: string | null) => (s ? new Date(s).toISOString().slice(0, 10) : "");
    const rows = rentals.map((r) => [
      r.user.company || r.user.fullName, r.user.fullName, r.user.email, r.user.contactNumber || "",
      r.user.industry || "", String(r.renterAccountsLive), r.linkedinAccount.linkedinName,
      d(r.startDate), d(r.currentPeriodEnd), r.autoRenew ? "Yes" : "No", paymentMethod(r), paymentStatus(r),
      r.campaignGoal || "", r.notes || "",
    ]);
    const csv = [headers, ...rows].map((row) => row.map(cell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `linkedvelocity-rentals-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const openSheets = async () => {
    setSheets({ open: true });
    try {
      const res = await fetch("/api/admin/rentals/export-url");
      const data = await res.json();
      setSheets({ open: true, url: data.url, configured: data.configured });
    } catch {
      setSheets({ open: true, configured: false });
    }
  };

  if (loading) return <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-200" />)}</div>;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Rentals &amp; Contracts</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Live tracker of every rental, matching the internal Renters sheet. Editable Company, Industry, Campaign Goal &amp; Notes save automatically. Download CSV / Google Sheets exports use the same column order.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={downloadCsv}>Download CSV</Button>
          <Button variant="outline" onClick={openSheets}>Google Sheets</Button>
          <Button onClick={openAddModal}>Add Rental</Button>
        </div>
      </div>

      {rentals.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-gray-500">No rentals yet</CardContent></Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-3 py-3">Renter / Company</th>
                <th className="px-3 py-3">Industry</th>
                <th className="px-3 py-3">Account(s)</th>
                <th className="px-3 py-3 text-center">Accts</th>
                <th className="px-3 py-3">Billing</th>
                <th className="px-3 py-3 text-center">Auto-Renew</th>
                <th className="px-3 py-3">Payment</th>
                <th className="px-3 py-3 min-w-[170px]">Campaign Goal</th>
                <th className="px-3 py-3 min-w-[180px]">Notes</th>
                <th className="px-3 py-3">Access</th>
                <th className="px-3 py-3">Live</th>
                <th className="px-3 py-3">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 align-top">
              {rentals.map((r) => {
                const pay = paymentStatus(r);
                const acc = accessStatus(r);
                return (
                  <tr key={r.id} className="hover:bg-gray-50/60">
                    <td className="px-3 py-3">
                      <input
                        defaultValue={r.user.company || ""}
                        placeholder="Company…"
                        onBlur={(e) => saveField(r, "company", e.target.value.trim())}
                        className="w-32 rounded border border-transparent bg-transparent px-1.5 py-0.5 text-sm font-medium text-gray-900 hover:border-gray-200 focus:border-blue-400 focus:bg-white focus:outline-none"
                      />
                      {savingField === `${r.id}:company` && <span className="ml-1 text-[10px] text-gray-400">saving…</span>}
                      <p className="text-xs text-gray-600 whitespace-nowrap mt-0.5">{r.user.fullName}</p>
                      <p className="text-xs text-gray-500">{r.user.email}</p>
                      {r.user.contactNumber && <p className="text-xs text-gray-400">{r.user.contactNumber}</p>}
                    </td>
                    <td className="px-3 py-3">
                      <input
                        defaultValue={r.user.industry || ""}
                        placeholder="—"
                        onBlur={(e) => saveField(r, "industry", e.target.value.trim())}
                        className="w-28 rounded border border-transparent bg-transparent px-1.5 py-1 text-sm hover:border-gray-200 focus:border-blue-400 focus:bg-white focus:outline-none"
                      />
                      {savingField === `${r.id}:industry` && <span className="ml-1 text-[10px] text-gray-400">saving…</span>}
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-gray-800 whitespace-nowrap">{(r.linkedinAccount.notes || "").match(/Profile email:\s*(\S+@\S+?\.\S+?)[\s.]/)?.[1] || r.linkedinAccount.linkedinName}</p>
                      {r.linkedinAccount.gologinProfileId && (
                        <p className="font-mono text-[10px] text-gray-400" title="GoLogin profile ID">{r.linkedinAccount.gologinProfileId}</p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center font-semibold text-gray-700">{r.renterAccountsLive}</td>
                    <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">
                      <p>Start: {fmt(r.startDate)}</p>
                      <p>Next: {fmt(r.currentPeriodEnd)}</p>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${r.autoRenew ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{r.autoRenew ? "Yes" : "No"}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${PAY_BADGE[pay]}`}>{pay}</span>
                      <p className="mt-1 text-xs text-gray-500">{paymentMethod(r)}</p>
                    </td>
                    <td className="px-3 py-3">
                      <textarea
                        defaultValue={r.campaignGoal || ""}
                        placeholder="Campaign goal…"
                        rows={2}
                        onBlur={(e) => saveField(r, "campaignGoal", e.target.value.trim())}
                        className="w-40 resize-y rounded border border-gray-200 bg-white px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                      />
                      {savingField === `${r.id}:campaignGoal` && <span className="ml-1 text-[10px] text-gray-400">saving…</span>}
                    </td>
                    <td className="px-3 py-3">
                      <textarea
                        defaultValue={r.notes || ""}
                        placeholder="Issues, internal notes…"
                        rows={2}
                        onBlur={(e) => saveField(r, "notes", e.target.value.trim())}
                        className="w-44 resize-y rounded border border-gray-200 bg-white px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                      />
                      {savingField === `${r.id}:notes` && <span className="ml-1 text-[10px] text-gray-400">saving…</span>}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${ACCESS_BADGE[acc]}`}>{acc}</span>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">{fmt(r.accessGrantedAt)}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-1.5">
                        {acc === "Paused" ? (
                          <button onClick={() => handleAccess(r.id, "grant")} disabled={accessBusy === r.id} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50 whitespace-nowrap">{accessBusy === r.id ? "…" : "Resume"}</button>
                        ) : acc === "Granted" ? (
                          <button onClick={() => handleAccess(r.id, "revoke", isManualGrant(r))} disabled={accessBusy === r.id} className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50 whitespace-nowrap">{accessBusy === r.id ? "…" : "Pause"}</button>
                        ) : (
                          <button onClick={() => handleAccess(r.id, "grant")} disabled={accessBusy === r.id} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap">{accessBusy === r.id ? "…" : "Grant"}</button>
                        )}
                        {(r.status === "active" || r.status === "payment_failed" || r.status === "pending_access") && (
                          <button onClick={() => handleAccess(r.id, "end")} disabled={accessBusy === r.id} className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 whitespace-nowrap">End</button>
                        )}
                        <button onClick={() => handleDeleteRental(r.id)} disabled={accessBusy === r.id} className="inline-flex items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 whitespace-nowrap" title="Permanently delete this rental record">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Google Sheets connect modal */}
      {sheets.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSheets({ open: false })}>
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect to Google Sheets</h3>
            {sheets.configured === false ? (
              <div className="text-sm text-gray-600 space-y-2">
                <p>Live sync isn&apos;t set up yet. Add an env var <code className="rounded bg-gray-100 px-1">RENTALS_EXPORT_KEY</code> (any long random string) in Vercel, redeploy, then come back here to get your sheet link.</p>
                <p>In the meantime, use <strong>Download CSV</strong> and import the file into Sheets.</p>
              </div>
            ) : sheets.url ? (
              <div className="text-sm text-gray-600 space-y-3">
                <p>In a Google Sheet, paste this into cell <strong>A1</strong> — it auto-pulls the live tracker (refreshes about hourly):</p>
                <div className="rounded-lg bg-gray-900 p-3">
                  <code className="block break-all text-xs text-green-300">=IMPORTDATA(&quot;{sheets.url}&quot;)</code>
                </div>
                <button
                  onClick={() => navigator.clipboard?.writeText(`=IMPORTDATA("${sheets.url}")`)}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                >Copy formula</button>
                <p className="text-xs text-amber-600">⚠️ Anyone with this link can see the tracker data — keep the sheet (and link) private.</p>
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

      {/* Add Rental Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAdd(false)}>
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Rental</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Email</label>
                <input type="email" value={addForm.userEmail} onChange={(e) => setAddForm(f => ({ ...f, userEmail: e.target.value }))} placeholder="customer@email.com" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
                <select value={addForm.linkedinAccountId} onChange={(e) => setAddForm(f => ({ ...f, linkedinAccountId: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  <option value="">Select an available account...</option>
                  {accounts.map((a) => (<option key={a.id} value={a.id}>{getAccountLabel(a)}</option>))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input type="date" value={addForm.startDate} onChange={(e) => setAddForm(f => ({ ...f, startDate: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input type="date" value={addForm.endDate} onChange={(e) => setAddForm(f => ({ ...f, endDate: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={addForm.autoRenew} onChange={(e) => setAddForm(f => ({ ...f, autoRenew: e.target.checked }))} className="rounded border-gray-300" />
                Auto-renew
              </label>
              {addError && <p className="text-sm text-red-600">{addError}</p>}
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={adding}>{adding ? "Creating..." : "Create Rental"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
