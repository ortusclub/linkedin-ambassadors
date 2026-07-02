"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatNumber } from "@/lib/utils";
import { isCompanyEmail } from "@/lib/company";

interface Account {
  id: string;
  linkedinName: string;
  linkedinHeadline: string | null;
  linkedinUrl: string | null;
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
  restrictedAt: string | null;
  verificationProof: string | null;
  linkedinVerified: boolean;
  removedAt: string | null;
  rentals: Array<{ lockedPrice: string | number | null; currentPeriodEnd: string | null; autoRenew: boolean; user: { fullName: string; email: string } }>;
}

const F_SANS = "var(--font-sans),system-ui,sans-serif";
const F_GRO = "var(--font-grotesk),system-ui,sans-serif";
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmt = (d: string | null) => { if (!d) return "—"; const x = new Date(d); return `${MON[x.getMonth()]} ${x.getDate()}, ${x.getFullYear()}`; };
const fmtS = (d: string | null) => { if (!d) return ""; const x = new Date(d); return `${MON[x.getMonth()]} ${x.getDate()}`; };

const displayStatus = (s: string) => (s === "available" ? "Available" : s === "rented" ? "Rented" : s === "removed" ? "Removed" : "Offline");
const GROUPS: { key: string; hint: string; dot: string }[] = [
  { key: "Available", hint: "live & rentable, no one on it", dot: "var(--st-active-fg)" },
  { key: "Rented", hint: "currently rented by a customer", dot: "var(--blue-chip-text)" },
  { key: "Offline", hint: "temporarily not rentable", dot: "var(--neutral-chip-text)" },
  { key: "Removed", hint: "taken out of inventory", dot: "var(--st-cancel-fg)" },
];
const statusChip = (disp: string): React.CSSProperties => {
  const m: Record<string, [string, string]> = { Available: ["var(--st-active-bg)", "var(--st-active-fg)"], Rented: ["var(--blue-chip-bg)", "var(--blue-chip-text)"], Offline: ["var(--neutral-chip-bg)", "var(--neutral-chip-text)"], Removed: ["var(--st-cancel-bg)", "var(--st-cancel-fg)"] };
  const [bg, fg] = m[disp] || m.Offline;
  return { background: bg, color: fg };
};
// combine admin restriction (restrictedAt) + auto health check into one pill
function healthOf(a: Account): { label: string; bg: string; fg: string; note: string } {
  if (a.restrictedAt) return { label: "Recovering", bg: "var(--st-unreach-bg)", fg: "var(--st-unreach-fg)", note: `restricted ${fmtS(a.restrictedAt)}` };
  const h = a.linkedinAccountHealth;
  if (h === "checking") return { label: "Checking…", bg: "var(--blue-chip-bg)", fg: "var(--blue-chip-text)", note: "" };
  if (h === "active") return { label: "Active", bg: "var(--st-active-bg)", fg: "var(--st-active-fg)", note: a.healthCheckedAt ? `checked ${fmtS(a.healthCheckedAt)}` : "" };
  if (h === "restricted" || h === "not_found") return { label: h === "not_found" ? "Not found" : "Restricted", bg: "var(--st-cancel-bg)", fg: "var(--st-cancel-fg)", note: a.healthCheckedAt ? `checked ${fmtS(a.healthCheckedAt)}` : "" };
  if (h === "unknown" || h === "rate_limited" || h === "error") return { label: "Unknown", bg: "var(--warn-badge-bg)", fg: "var(--warn-badge-text)", note: "" };
  return { label: "Unchecked", bg: "var(--neutral-chip-bg)", fg: "var(--neutral-chip-text)", note: "not yet checked" };
}
const profileEmailOf = (a: Account) => (a.notes || "").match(/Profile email:\s*(\S+@\S+?\.\S+?)[\s.]/)?.[1] || null;
const ownerOf = (a: Account) => { const notes = a.notes || ""; if (notes.includes("[SHOWCASE]")) return "Dummy"; if ([profileEmailOf(a), a.ownerEmail].some((e) => isCompanyEmail(e))) return "Ortus"; return a.ownerEmail || "—"; };
// A rented account should be health-checked weekly — flag it if the last check is >7 days old (or never).
const checkDue = (a: Account) => a.status === "rented" && !a.restrictedAt && (!a.healthCheckedAt || Date.now() - new Date(a.healthCheckedAt).getTime() > 7 * 86400000);

const GRID = "minmax(0,1fr) 150px 100px 172px 168px";

export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [savingProof, setSavingProof] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [sheetConfigured, setSheetConfigured] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);
  // import
  const [showImport, setShowImport] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);

  const load = () => fetch("/api/admin/accounts").then((r) => r.json()).then((d) => setAccounts(d.accounts || []));
  useEffect(() => {
    load().finally(() => setLoading(false));
    fetch("/api/admin/accounts/export-url").then((r) => r.json()).then((d) => { setSheetConfigured(!!d.configured); setSheetUrl(d.url || null); }).catch(() => setSheetConfigured(false));
  }, []);

  const copyFormula = () => { if (!sheetUrl) return; navigator.clipboard?.writeText(`=IMPORTDATA("${sheetUrl}")`); setCopied(true); setTimeout(() => setCopied(false), 1800); };

  const patch = async (id: string, body: Record<string, unknown>) => fetch(`/api/admin/accounts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  const toggleForRent = async (a: Account) => {
    if (a.status === "rented") return;
    const next = a.status === "available" ? "unavailable" : "available";
    setAccounts((prev) => prev.map((x) => (x.id === a.id ? { ...x, status: next, listed: next === "available" } : x)));
    await patch(a.id, { status: next, listed: next === "available" });
  };
  const toggleVerified = async (a: Account) => {
    setAccounts((prev) => prev.map((x) => (x.id === a.id ? { ...x, linkedinVerified: !a.linkedinVerified } : x)));
    const res = await patch(a.id, { linkedinVerified: !a.linkedinVerified });
    if (!res.ok) setAccounts((prev) => prev.map((x) => (x.id === a.id ? { ...x, linkedinVerified: a.linkedinVerified } : x)));
  };
  const saveProof = async (a: Account, value: string) => {
    if (value === (a.verificationProof || "")) return;
    setSavingProof(a.id);
    try { await patch(a.id, { verificationProof: value || null }); setAccounts((prev) => prev.map((x) => (x.id === a.id ? { ...x, verificationProof: value || null } : x))); }
    finally { setSavingProof(null); }
  };
  // Manual health mark — for when you've verified the account yourself (in GoLogin).
  const markHealth = async (a: Account, health: string) => {
    setAccounts((prev) => prev.map((x) => (x.id === a.id ? { ...x, linkedinAccountHealth: health, healthCheckedAt: new Date().toISOString() } : x)));
    await patch(a.id, { linkedinAccountHealth: health });
  };
  const checkHealth = async (id: string) => {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, linkedinAccountHealth: "checking" } : a)));
    const res = await fetch(`/api/admin/accounts/${id}/check-health`, { method: "POST" });
    if (res.ok) { const d = await res.json(); setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, linkedinAccountHealth: d.health, healthCheckedAt: d.checkedAt } : a))); }
    else setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, linkedinAccountHealth: "error" } : a)));
  };
  const setRestricted = async (a: Account, restricted: boolean) => {
    if (restricted && !confirm("Mark this account as restricted? The renter will see 'Restricted — recovering it' and access is paused.")) return;
    if (!restricted && !confirm("Mark this account as recovered? The renter's downtime will be credited and access restored.")) return;
    setBusy(a.id);
    try {
      const res = await fetch(`/api/admin/accounts/${a.id}/restricted`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ restricted }) });
      if (res.ok) { const d = await res.json(); setAccounts((prev) => prev.map((x) => (x.id === a.id ? { ...x, restrictedAt: restricted ? (d.restrictedAt || new Date().toISOString()) : null } : x))); if (!restricted && d.creditedDays) alert(`Recovered. Credited ~${d.creditedDays} day(s) of downtime to the renter.`); }
    } finally { setBusy(null); }
  };
  const handleDelete = async (a: Account) => {
    if (!confirm(`Remove ${a.linkedinName} from inventory? This can't be undone.`)) return;
    setBusy(a.id);
    try { const res = await fetch(`/api/admin/accounts/${a.id}`, { method: "DELETE" }); if (res.ok) setAccounts((prev) => prev.filter((x) => x.id !== a.id)); else alert("Failed to remove account"); }
    finally { setBusy(null); }
  };

  // ── CSV import (unchanged logic) ──
  const csvTemplate = `Account Email,LinkedIn Name,LinkedIn URL,Connections,Industry,Location,Sales Navigator,Account Opened,Rental Price,Ambassador Payment,Status,Profile Photo URL,GoLogin Share Link
mikka@example.com,Mikka Aloria,https://www.linkedin.com/in/mikka-aloria/,5000,Technology,London,no,2020-01-15,50,25,available,https://example.com/photo.jpg,https://app.gologin.com/share/abc123`;
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = (ev) => setCsvText((ev.target?.result as string) || ""); reader.readAsText(file); };
  const parseCsvLine = (line: string): string[] => { const r: string[] = []; let cur = "", q = false; for (const ch of line) { if (ch === '"') q = !q; else if (ch === "," && !q) { r.push(cur.trim()); cur = ""; } else cur += ch; } r.push(cur.trim()); return r; };
  const handleCsvImport = async () => {
    if (!csvText.trim()) return;
    setImporting(true); setImportResult(null);
    const lines = csvText.trim().split("\n");
    const firstLine = lines[0].toLowerCase().trim();
    const isHeaderRow = firstLine.includes("account email") || firstLine.includes("linkedin name") || firstLine.includes("email");
    const headerCols = isHeaderRow ? parseCsvLine(lines[0]).map((c) => c.trim().toLowerCase()) : [];
    const dataLines = isHeaderRow ? lines.slice(1) : lines;
    const colIndex = (name: string) => headerCols.findIndex((h) => h.includes(name));
    const getCol = (cols: string[], name: string, fb: number) => { const idx = isHeaderRow ? colIndex(name) : fb; return idx >= 0 && idx < cols.length ? cols[idx]?.trim() : ""; };
    let success = 0, failed = 0;
    for (const line of dataLines) {
      if (!line.trim()) continue;
      const cols = parseCsvLine(line);
      const accountEmail = getCol(cols, "account email", 0) || getCol(cols, "email", 0);
      const accountOpened = getCol(cols, "account opened", 7) || getCol(cols, "opened", 7);
      let ageM: number | undefined;
      if (accountOpened) { const o = new Date(accountOpened); if (!isNaN(o.getTime())) { const n = new Date(); ageM = (n.getFullYear() - o.getFullYear()) * 12 + (n.getMonth() - o.getMonth()); } }
      const status = getCol(cols, "status", 10);
      try {
        const res = await fetch("/api/admin/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
          linkedinName: getCol(cols, "linkedin name", 1) || getCol(cols, "name", 1) || accountEmail?.split("@")[0] || "Unknown",
          linkedinUrl: getCol(cols, "linkedin url", 2) || getCol(cols, "url", 2) || undefined,
          connectionCount: parseInt(getCol(cols, "connections", 3)) || 0,
          industry: getCol(cols, "industry", 4) || undefined,
          location: getCol(cols, "location", 5) || undefined,
          hasSalesNav: ["yes", "true"].includes((getCol(cols, "sales nav", 6) || "").toLowerCase()),
          accountAgeMonths: ageM || undefined,
          monthlyPrice: parseFloat(getCol(cols, "rental price", 8) || getCol(cols, "rental", 8)) || 0,
          ambassadorPayment: parseFloat(getCol(cols, "ambassador payment", 9) || getCol(cols, "ambassador", 9) || getCol(cols, "payout", 9)) || 0,
          profilePhotoUrl: getCol(cols, "photo", 11) || getCol(cols, "image", 11) || undefined,
          gologinShareLink: getCol(cols, "gologin", 12) || getCol(cols, "share link", 12) || undefined,
          notes: `Ambassador account. Owner: admin. Profile email: ${accountEmail || ""}.`,
          status: ["under_review", "available", "unavailable", "rented", "maintenance", "retired"].includes(status?.trim().toLowerCase()) ? status.trim().toLowerCase() : "under_review",
        }) });
        if (res.ok) success++; else failed++;
      } catch { failed++; }
    }
    setImportResult({ success, failed }); setImporting(false); load();
  };

  const counts = useMemo(() => ({
    all: accounts.length,
    Available: accounts.filter((a) => displayStatus(a.status) === "Available").length,
    Rented: accounts.filter((a) => displayStatus(a.status) === "Rented").length,
    Offline: accounts.filter((a) => displayStatus(a.status) === "Offline").length,
    Removed: accounts.filter((a) => displayStatus(a.status) === "Removed").length,
    recovering: accounts.filter((a) => a.restrictedAt).length,
    checksDue: accounts.filter(checkDue).length,
  }), [accounts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts.filter((a) => {
      if (filter !== "all" && displayStatus(a.status) !== filter) return false;
      if (!q) return true;
      return `${a.linkedinName} ${a.linkedinHeadline || ""} ${a.ownerEmail || ""} ${a.location || ""} ${a.industry || ""} ${a.proxyHost || ""}`.toLowerCase().includes(q);
    });
  }, [accounts, filter, search]);

  const toggle = (id: string) => setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allExpanded = filtered.length > 0 && filtered.every((a) => expanded.has(a.id));
  const expandAll = () => setExpanded(allExpanded ? new Set() : new Set(filtered.map((a) => a.id)));

  const labelCss: React.CSSProperties = { font: `600 10px ${F_SANS}`, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--label)" };
  const chip = (active: boolean): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 13px", borderRadius: 999, cursor: "pointer", font: `600 12.5px ${F_SANS}`, color: "var(--text)", border: "1px solid", borderColor: active ? "var(--chip-active-border)" : "var(--card-border)", background: active ? "var(--chip-active-bg)" : "transparent" });
  const secBtn: React.CSSProperties = { font: `600 12.5px ${F_SANS}`, color: "var(--btn-secondary-fg)", background: "var(--btn-secondary-bg)", border: "1px solid var(--btn-secondary-border)", padding: "7px 13px", borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap" };
  const outBtn = (color: string): React.CSSProperties => ({ font: `600 12px ${F_SANS}`, color, background: "transparent", border: `1px solid ${color}`, padding: "7px 13px", borderRadius: 8, cursor: "pointer" });
  const modalInput: React.CSSProperties = { width: "100%", background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: 9, padding: "9px 12px", font: `500 13px ${F_SANS}`, color: "var(--input-fg)", outline: "none" };
  const DField = ({ label, children, span }: { label: string; children: React.ReactNode; span?: number }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0, gridColumn: span ? `span ${span}` : undefined }}>
      <span style={labelCss}>{label}</span>
      <span style={{ font: `500 13px ${F_SANS}`, color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{children}</span>
    </div>
  );

  if (loading) return <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{[1, 2, 3].map((i) => <div key={i} style={{ height: 64, borderRadius: 14, background: "var(--card)", border: "1px solid var(--card-border)" }} />)}</div>;

  const CHIPS: [string, string, number, string | null][] = [["all", "All", counts.all, null], ["Available", "Available", counts.Available, "var(--st-active-fg)"], ["Rented", "Rented", counts.Rented, "var(--blue-chip-text)"], ["Offline", "Offline", counts.Offline, "var(--neutral-chip-text)"], ["Removed", "Removed", counts.Removed, "var(--st-cancel-fg)"]];

  return (
    <div>
      {/* title + actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ maxWidth: 640 }}>
          <h1 style={{ font: `600 30px/1 ${F_GRO}`, color: "var(--text)", margin: "0 0 8px", letterSpacing: "-.02em" }}>Inventory</h1>
          <p style={{ font: `500 13.5px/1.5 ${F_SANS}`, color: "var(--muted)", margin: 0 }}>Every LinkedIn account we own — status, who&apos;s renting it, price, and the technical + verification detail behind each one.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flex: "none", alignItems: "center", flexWrap: "wrap" }}>
          <Link href="/admin/accounts/new" style={{ font: `600 13px ${F_SANS}`, color: "#fff", background: "var(--btn-primary-bg)", padding: "9px 16px", borderRadius: 10, textDecoration: "none" }}>+ Add Account</Link>
          <button onClick={() => setShowImport(true)} style={{ font: `600 13px ${F_SANS}`, color: "var(--btn-secondary-fg)", background: "var(--btn-secondary-bg)", border: "1px solid var(--btn-secondary-border)", padding: "9px 15px", borderRadius: 10, cursor: "pointer" }}>Import CSV</button>
          {sheetConfigured && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--sheets-bg)", border: "1px solid var(--sheets-border)", padding: "6px 8px 6px 14px", borderRadius: 12 }}>
              <span style={{ font: `600 13px ${F_SANS}`, color: "var(--sheets-fg)" }}>Live Google Sheets</span>
              <button onClick={copyFormula} style={{ font: `600 12.5px ${F_SANS}`, color: "#fff", background: "var(--sheets-btn-bg)", border: "none", padding: "8px 14px", borderRadius: 9, cursor: "pointer", whiteSpace: "nowrap" }}>{copied ? "Copied ✓" : "Copy formula"}</button>
            </div>
          )}
        </div>
      </div>

      {/* summary */}
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ font: `600 22px ${F_GRO}`, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{counts.all}</span>
          <span style={{ font: `600 12px ${F_SANS}`, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--label)" }}>accounts</span>
        </div>
        <span style={{ width: 1, height: 20, background: "var(--divider)" }} />
        {[["var(--st-active-fg)", `${counts.Available} available`], ["var(--blue-chip-text)", `${counts.Rented} rented`], ["var(--st-unreach-fg)", `${counts.recovering} recovering`], ["var(--warn-badge-text)", `${counts.checksDue} checks due`]].map(([dot, txt]) => (
          <span key={txt} style={{ display: "inline-flex", alignItems: "center", gap: 6, font: `500 12.5px ${F_SANS}`, color: "var(--muted)" }}><span style={{ width: 7, height: 7, borderRadius: 999, background: dot }} />{txt}</span>
        ))}
      </div>

      {/* chips + search */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {CHIPS.map(([key, lbl, n, dot]) => (
            <button key={key} onClick={() => setFilter(key)} style={chip(filter === key)}>
              {dot && <span style={{ width: 7, height: 7, borderRadius: 999, background: dot }} />}
              {lbl}<span style={{ color: "var(--muted)" }}>{n}</span>
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, role, location, industry…" style={{ width: 280, maxWidth: "50vw", ...modalInput }} />
          <button onClick={expandAll} style={{ ...secBtn, padding: "9px 14px", borderRadius: 9 }}>{allExpanded ? "Collapse all" : "Expand all"}</button>
        </div>
      </div>

      {/* groups */}
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 44, textAlign: "center", background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 14, font: `500 13.5px ${F_SANS}`, color: "var(--muted)" }}>No accounts match.</div>
        ) : GROUPS.map((g) => {
          const rows = filtered.filter((a) => displayStatus(a.status) === g.key);
          if (rows.length === 0) return null;
          return (
            <div key={g.key}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                <span style={{ width: 9, height: 9, borderRadius: 999, background: g.dot }} />
                <span style={{ font: `700 12px ${F_SANS}`, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--text)" }}>{g.key}</span>
                <span style={{ font: `600 11px ${F_SANS}`, color: "var(--muted)", background: "var(--tag-bg)", padding: "2px 9px", borderRadius: 999 }}>{rows.length}</span>
                <span style={{ font: `500 12px ${F_SANS}`, color: "var(--muted2)" }}>{g.hint}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {rows.map((a) => {
                  const open = expanded.has(a.id);
                  const h = healthOf(a);
                  const rented = a.status === "rented" && a.rentals?.[0];
                  const locked = rented && a.rentals[0].lockedPrice != null && Number(a.rentals[0].lockedPrice) > 0;
                  const priceVal = locked ? Number(a.rentals[0].lockedPrice) : Number(a.monthlyPrice);
                  const forRentOn = a.status === "available" || a.status === "rented";
                  return (
                    <div key={a.id} style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 14, overflow: "hidden", boxShadow: "var(--card-shadow)" }}>
                      {/* primary row */}
                      <div onClick={() => toggle(a.id)} style={{ display: "grid", gridTemplateColumns: GRID, gap: 16, alignItems: "center", padding: "15px 18px", cursor: "pointer", userSelect: "none" }}>
                        <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 12 }}>
                          <span style={{ font: `600 12px ${F_SANS}`, color: "var(--muted)", width: 12, textAlign: "center", flex: "none", transform: open ? "rotate(90deg)" : "none", transition: "transform .18s" }}>▸</span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4 }}>
                              <span style={{ font: `600 14px ${F_SANS}`, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.linkedinName}</span>
                              <button onClick={(e) => { e.stopPropagation(); toggleVerified(a); }} title="LinkedIn verified — click to toggle"
                                style={{ font: `600 10px ${F_SANS}`, padding: "2px 8px", borderRadius: 6, whiteSpace: "nowrap", border: "none", cursor: "pointer", ...(a.linkedinVerified ? { background: "var(--verified-bg, var(--blue-chip-bg))", color: "var(--verified-fg, var(--blue-chip-text))" } : { background: "var(--neutral-chip-bg)", color: "var(--neutral-chip-text)" }) }}>{a.linkedinVerified ? "✓ Verified" : "Verify"}</button>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, font: `500 11.5px ${F_SANS}`, color: "var(--muted)" }}>
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.linkedinHeadline || "—"}</span>
                              {a.location && <><span style={{ color: "var(--muted2)" }}>·</span><span style={{ whiteSpace: "nowrap" }}>{a.location}</span></>}
                              {a.connectionCount > 0 && <><span style={{ color: "var(--muted2)" }}>·</span><span style={{ whiteSpace: "nowrap" }}>{formatNumber(a.connectionCount)}</span></>}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-start" }}>
                          <span style={{ font: `600 11px ${F_SANS}`, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap", background: h.bg, color: h.fg }}>{h.label}</span>
                          {h.note && <span style={{ font: `500 10.5px ${F_SANS}`, color: "var(--muted2)" }}>{h.note}</span>}
                          {checkDue(a) && <span title="Rented account — last health check is over a week old" style={{ font: `600 10px ${F_SANS}`, padding: "2px 8px", borderRadius: 999, whiteSpace: "nowrap", background: "var(--warn-badge-bg)", color: "var(--warn-badge-text)" }}>⏱ Check due</span>}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={{ font: `600 15px ${F_GRO}`, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{priceVal > 0 ? `$${priceVal.toFixed(0)}` : "TBC"}</span>
                          <span style={{ font: `500 10px ${F_SANS}`, color: locked ? "var(--warn-badge-text)" : "var(--label)" }}>{locked ? "🔒 locked rate" : "/mo"}</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                          <span style={{ font: `500 13px ${F_SANS}`, color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rented ? a.rentals[0].user.fullName : "No renter"}</span>
                          <span style={{ font: `500 11px ${F_SANS}`, color: rented && a.rentals[0].autoRenew ? "var(--st-active-fg)" : "var(--muted2)" }}>{rented ? `${fmtS(a.rentals[0].currentPeriodEnd)} · ${a.rentals[0].autoRenew ? "auto-renews" : "no auto-renew"}` : "available"}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10 }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                            <button onClick={() => toggleForRent(a)} disabled={a.status === "rented"} style={{ position: "relative", width: 38, height: 22, borderRadius: 999, border: "none", cursor: a.status === "rented" ? "not-allowed" : "pointer", padding: 0, background: forRentOn ? "var(--sheets-btn-bg)" : "var(--toggle-off)", opacity: a.status === "rented" ? 0.6 : 1 }}>
                              <span style={{ position: "absolute", top: 3, left: forRentOn ? 19 : 3, width: 16, height: 16, borderRadius: 999, background: "#fff", transition: "left .15s", display: "block" }} />
                            </button>
                            <span style={{ font: `500 9.5px ${F_SANS}`, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted2)" }}>For rent</span>
                          </div>
                          <Link href={`/admin/accounts/${a.id}`} style={secBtn}>Edit</Link>
                        </div>
                      </div>

                      {/* detail */}
                      {open && (
                        <div style={{ padding: "4px 18px 18px 42px", borderTop: "1px solid var(--divider)" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr 1fr", gap: "16px 22px", paddingTop: 16 }}>
                            <DField label="Account email">{profileEmailOf(a) || "—"}</DField>
                            <DField label="LinkedIn profile">{a.linkedinUrl ? <a href={a.linkedinUrl.startsWith("http") ? a.linkedinUrl : `https://${a.linkedinUrl}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--link)" }}>↗ Open profile</a> : "—"}</DField>
                            <DField label="GoLogin share">
                              {a.gologinShareLink ? <a href={a.gologinShareLink} target="_blank" rel="noopener noreferrer" style={{ color: "var(--link)" }}>↗ Open link</a> : <span style={{ color: "var(--muted2)" }}>—</span>}
                              {a.gologinProfileId && <span style={{ display: "block", font: `500 11px ${F_GRO}`, color: "var(--muted2)", overflow: "hidden", textOverflow: "ellipsis" }}>ID {a.gologinProfileId}</span>}
                            </DField>
                            <DField label="Proxy">{a.proxyHost ? `${a.proxyHost}:${a.proxyPort || ""}` : "None"}</DField>
                            <DField label="Owner">{ownerOf(a)}</DField>
                            <DField label="Age · Sales Nav · Listed">{`${a.accountAgeMonths ? `${Math.floor(a.accountAgeMonths / 12)}y ${a.accountAgeMonths % 12}m` : "—"} · SN ${a.hasSalesNav ? "Yes" : "No"} · Listed ${a.listed ? "Yes" : "No"}`}</DField>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: "span 2", minWidth: 0 }}>
                              <span style={labelCss}>Verification proof (private){savingProof === a.id ? " · saving…" : ""}</span>
                              <textarea defaultValue={a.verificationProof || ""} placeholder="Proof links / notes…" onBlur={(e) => saveProof(a, e.target.value.trim())} style={{ width: "100%", minHeight: 52, resize: "vertical", ...modalInput, font: `500 12.5px ${F_SANS}` }} />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8, gridColumn: "span 2" }}>
                              <span style={labelCss}>Health actions</span>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {a.restrictedAt ? (
                                  <button onClick={() => setRestricted(a, false)} disabled={busy === a.id} style={outBtn("var(--st-active-fg)")}>Mark recovered</button>
                                ) : (
                                  <>
                                    <button onClick={() => markHealth(a, "active")} disabled={busy === a.id} title="You've verified it's working (e.g. opened it in GoLogin) — mark it Active, stamped today" style={outBtn("var(--st-active-fg)")}>✓ Mark active</button>
                                    <button onClick={() => setRestricted(a, true)} disabled={busy === a.id} style={outBtn("var(--danger)")}>Mark restricted</button>
                                  </>
                                )}
                                <button onClick={() => checkHealth(a.id)} title="Best-effort automated public check. LinkedIn blocks logged-out checks, so this is usually 'Unknown' — verify in GoLogin and use Mark active / Mark restricted instead." style={secBtn}>↻ Re-check (auto)</button>
                                <button onClick={() => handleDelete(a)} disabled={busy === a.id} style={{ ...outBtn("var(--danger)"), marginLeft: "auto" }}>🗑 Delete</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Import CSV modal */}
      {showImport && (
        <div onClick={() => setShowImport(false)} style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", background: "rgba(0,0,0,.5)", padding: "6vh 16px" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 640, background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 16, padding: 24, maxHeight: "88vh", overflowY: "auto", boxShadow: "0 20px 60px -20px rgba(0,0,0,.6)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h2 style={{ font: `600 18px ${F_GRO}`, color: "var(--text)", margin: 0 }}>Import accounts from CSV</h2>
              <button onClick={() => setShowImport(false)} style={{ font: "400 22px/1 sans-serif", color: "var(--muted)", background: "none", border: "none", cursor: "pointer" }}>×</button>
            </div>
            <p style={{ font: `500 12.5px ${F_SANS}`, color: "var(--muted)", margin: "0 0 12px" }}>Upload a CSV or paste rows below. Each row creates an account with &ldquo;Under review&rdquo; status.</p>
            <input type="file" accept=".csv" onChange={handleFileUpload} style={{ font: `500 12.5px ${F_SANS}`, color: "var(--muted)", marginBottom: 12 }} />
            <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} placeholder={csvTemplate} rows={7} style={{ width: "100%", resize: "vertical", ...modalInput, font: `500 12px ${F_GRO}` }} />
            {importResult && <p style={{ font: `600 13px ${F_SANS}`, color: importResult.failed ? "var(--warn-badge-text)" : "var(--st-active-fg)", margin: "12px 0 0" }}>Imported {importResult.success} · {importResult.failed} failed</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
              <button onClick={() => { setCsvText(csvTemplate); }} style={secBtn}>Load template</button>
              <button onClick={handleCsvImport} disabled={importing || !csvText.trim()} style={{ font: `600 13px ${F_SANS}`, color: "#fff", background: "var(--btn-primary-bg)", border: "none", padding: "9px 16px", borderRadius: 10, cursor: "pointer", opacity: importing || !csvText.trim() ? 0.5 : 1 }}>{importing ? "Importing…" : "Import"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
