"use client";

import { useEffect, useMemo, useState } from "react";
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
  referralSource: string | null;
  referredBy: string | null;
  status: string;
  offeredAmount: string | number | null;
  adminNotes: string | null;
  createdAt: string;
}

const F_SANS = "var(--font-sans),system-ui,sans-serif";
const F_GRO = "var(--font-grotesk),system-ui,sans-serif";

// DB status -> display bucket (contacted/pending/reviewing all fold into "In progress")
const bucketOf = (s: string): string => {
  if (["pending", "reviewing", "contacted"].includes(s)) return "in_progress";
  if (s === "unreachable") return "no_response";
  if (s === "on_hold") return "on_hold";
  if (s === "approved" || s === "onboarded") return "accepted";
  if (s === "rejected") return "rejected";
  return "in_progress";
};
const BUCKET: Record<string, { label: string; bg: string; fg: string }> = {
  in_progress: { label: "In progress", bg: "var(--blue-chip-bg)", fg: "var(--blue-chip-text)" },
  no_response: { label: "No response", bg: "var(--st-unreach-bg)", fg: "var(--st-unreach-fg)" },
  on_hold: { label: "On hold", bg: "var(--warn-badge-bg)", fg: "var(--warn-badge-text)" },
  accepted: { label: "Accepted", bg: "var(--st-active-bg)", fg: "var(--st-active-fg)" },
  rejected: { label: "Rejected", bg: "var(--st-cancel-bg)", fg: "var(--st-cancel-fg)" },
};
// filter chips (order + dot colour)
const CHIPS: [string, string, string | null][] = [
  ["all", "All", null], ["in_progress", "In progress", "var(--blue-chip-text)"], ["no_response", "No response", "var(--st-unreach-fg)"],
  ["on_hold", "On hold", "var(--warn-badge-text)"], ["accepted", "Accepted", "var(--st-active-fg)"], ["rejected", "Rejected", "var(--st-cancel-fg)"],
];
// action buttons -> DB status to set
const ACTIONS: { db: string; label: string; kind: "accept" | "reject" | "secondary" }[] = [
  { db: "approved", label: "✓ Accept", kind: "accept" },
  { db: "rejected", label: "Reject", kind: "reject" },
  { db: "reviewing", label: "In progress", kind: "secondary" },
  { db: "on_hold", label: "On hold", kind: "secondary" },
  { db: "unreachable", label: "No response", kind: "secondary" },
];

const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const initialsOf = (name: string) => { const p = (name || "?").trim().split(/\s+/); return (p.length > 1 ? p[0][0] + p[1][0] : name.slice(0, 2)).toUpperCase() || "?"; };
const liHref = (url: string) => (url.startsWith("http") ? url : `https://${url}`);
const liShort = (url: string) => { const h = url.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, "").replace(/[/?].*$/, ""); return h ? `in/${h.length > 18 ? h.slice(0, 18) + "…" : h}` : "profile"; };

export default function AdminAmbassadorsPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [marketer, setMarketer] = useState("all");
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [sheetConfigured, setSheetConfigured] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/admin/ambassadors").then((r) => r.json()).then((d) => setApps(d.applications || [])).finally(() => setLoading(false));
    fetch("/api/admin/ambassadors/export-url").then((r) => r.json()).then((d) => { setSheetConfigured(!!d.configured); setSheetUrl(d.url || null); }).catch(() => setSheetConfigured(false));
  }, []);

  const setStatus = async (id: string, db: string) => {
    setBusy(id);
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status: db } : a)));
    try {
      const res = await fetch(`/api/admin/ambassadors/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: db }) });
      if (res.ok) { const d = await res.json(); if (d.application) setApps((prev) => prev.map((a) => (a.id === id ? { ...a, ...d.application } : a))); }
    } finally { setBusy(null); }
  };
  const copyFormula = () => { if (!sheetUrl) return; navigator.clipboard?.writeText(`=IMPORTDATA("${sheetUrl}")`); setCopied(true); setTimeout(() => setCopied(false), 1800); };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: apps.length };
    for (const a of apps) { const b = bucketOf(a.status); c[b] = (c[b] || 0) + 1; }
    return c;
  }, [apps]);

  // Distinct marketers (from the referral tag) with their submission counts, busiest first.
  const marketers = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of apps) { const r = (a.referredBy || "").trim(); if (r) m.set(r, (m.get(r) || 0) + 1); }
    return [...m.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]));
  }, [apps]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    // group a person's submissions together, newest owner first
    const rows = apps.filter((a) => {
      if (filter !== "all" && bucketOf(a.status) !== filter) return false;
      if (marketer !== "all" && (a.referredBy || "").trim() !== marketer) return false;
      if (!q) return true;
      return `${a.fullName} ${a.email} ${a.contactNumber || ""} ${a.linkedinUrl} ${a.referredBy || ""}`.toLowerCase().includes(q);
    });
    const lastSeen = new Map<string, number>();
    rows.forEach((a) => { const t = new Date(a.createdAt).getTime(); lastSeen.set(a.email, Math.max(lastSeen.get(a.email) ?? 0, t)); });
    return [...rows].sort((a, b) => (a.email !== b.email ? lastSeen.get(b.email)! - lastSeen.get(a.email)! : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }, [apps, filter, marketer, query]);

  const toggle = (id: string) => setCollapsed((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allCollapsed = filtered.length > 0 && filtered.every((a) => collapsed.has(a.id));
  const collapseAll = () => setCollapsed(allCollapsed ? new Set() : new Set(filtered.map((a) => a.id)));

  const labelCss: React.CSSProperties = { font: `600 10px ${F_SANS}`, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--label)" };
  const chipStyle = (active: boolean): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 13px", borderRadius: 999, cursor: "pointer", font: `600 12.5px ${F_SANS}`, color: "var(--text)", border: "1px solid", borderColor: active ? "var(--chip-active-border)" : "var(--card-border)", background: active ? "var(--chip-active-bg)" : "transparent" });
  const secBtn: React.CSSProperties = { font: `600 12.5px ${F_SANS}`, color: "var(--btn-secondary-fg)", background: "var(--btn-secondary-bg)", border: "1px solid var(--btn-secondary-border)", padding: "8px 14px", borderRadius: 9, cursor: "pointer" };
  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
      <span style={labelCss}>{label}</span>
      <span style={{ font: `500 13.5px ${F_SANS}`, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis" }}>{children}</span>
    </div>
  );

  if (loading) return <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{[1, 2].map((i) => <div key={i} style={{ height: 90, borderRadius: 16, background: "var(--card)", border: "1px solid var(--card-border)" }} />)}</div>;

  return (
    <div>
      {/* title + sheets */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ maxWidth: 640 }}>
          <h1 style={{ font: `600 30px/1 ${F_GRO}`, color: "var(--text)", margin: "0 0 8px", letterSpacing: "-.02em" }}>Submissions</h1>
          <p style={{ font: `500 13.5px/1.5 ${F_SANS}`, color: "var(--muted)", margin: 0 }}>New ambassador applications. Review each one and set it to Accepted or Rejected — accepting automatically creates the profile in your inventory.</p>
        </div>
        {sheetConfigured && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--sheets-bg)", border: "1px solid var(--sheets-border)", padding: "6px 8px 6px 14px", borderRadius: 12, flex: "none" }}>
            <span style={{ font: `600 13px ${F_SANS}`, color: "var(--sheets-fg)" }}>Live Google Sheets</span>
            <button onClick={copyFormula} style={{ font: `600 12.5px ${F_SANS}`, color: "#fff", background: "var(--sheets-btn-bg)", border: "none", padding: "8px 14px", borderRadius: 9, cursor: "pointer", whiteSpace: "nowrap" }}>{copied ? "Copied ✓" : "Copy formula"}</button>
          </div>
        )}
      </div>

      {/* filter chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        {CHIPS.map(([key, lbl, dot]) => (
          <button key={key} onClick={() => setFilter(key)} style={chipStyle(filter === key)}>
            {dot && <span style={{ width: 7, height: 7, borderRadius: 999, background: dot }} />}
            {lbl}<span style={{ color: "var(--muted)" }}>{counts[key] || 0}</span>
          </button>
        ))}
      </div>

      {/* search + collapse */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, owner email, contact, LinkedIn or referral…" style={{ flex: 1, minWidth: 220, background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: 9, padding: "10px 13px", font: `500 13px ${F_SANS}`, color: "var(--input-fg)", outline: "none" }} />
        {marketers.length > 0 && (
          <select value={marketer} onChange={(e) => setMarketer(e.target.value)} title="Filter by the marketer who referred them" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: 9, padding: "10px 13px", font: `500 13px ${F_SANS}`, color: "var(--input-fg)", outline: "none", cursor: "pointer", maxWidth: 220 }}>
            <option value="all">All marketers ({marketers.reduce((s, [, n]) => s + n, 0)})</option>
            {marketers.map(([name, n]) => <option key={name} value={name}>{name} ({n})</option>)}
          </select>
        )}
        <button onClick={collapseAll} style={{ ...secBtn, whiteSpace: "nowrap", padding: "10px 15px" }}>{allCollapsed ? "Expand all" : "Collapse all"}</button>
      </div>

      {/* cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 16, font: `500 13.5px ${F_SANS}`, color: "var(--muted)" }}>No applications in this status.</div>
        ) : filtered.map((a) => {
          const b = BUCKET[bucketOf(a.status)];
          const open = !collapsed.has(a.id);
          return (
            <div key={a.id} style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 16, overflow: "hidden", boxShadow: "var(--card-shadow)" }}>
              {/* header */}
              <div onClick={() => toggle(a.id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "18px 22px", borderBottom: open ? "1px solid var(--divider)" : "none", cursor: "pointer", userSelect: "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 13, minWidth: 0 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", font: `600 16px ${F_GRO}`, background: "var(--avatar-bg)", color: "var(--avatar-fg)" }}>{initialsOf(a.fullName)}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ font: `600 17px ${F_GRO}`, color: "var(--text)", letterSpacing: "-.01em" }}>{a.fullName}</span>
                      <a href={liHref(a.linkedinUrl)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ display: "inline-flex", alignItems: "center", gap: 5, font: `600 12px ${F_SANS}`, color: "var(--link)", background: "var(--link-bg)", padding: "4px 10px", borderRadius: 7 }}>↗ {liShort(a.linkedinUrl)}</a>
                      {isLikelyTestEmail(a.email) && <span style={{ font: `700 9px ${F_SANS}`, letterSpacing: ".05em", padding: "2px 6px", borderRadius: 5, background: "var(--test-bg)", color: "var(--test-fg)" }}>TEST</span>}
                    </div>
                    <span style={{ font: `500 13px ${F_SANS}`, color: "var(--muted)" }}>{a.email}</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14, flex: "none" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 7 }}>
                    <span style={{ font: `600 12px ${F_SANS}`, padding: "5px 13px", borderRadius: 999, whiteSpace: "nowrap", background: b.bg, color: b.fg }}>{b.label}</span>
                    <span style={{ font: `500 12px ${F_SANS}`, color: "var(--date-color)" }}>Applied {fmtDate(a.createdAt)}</span>
                  </div>
                  <span style={{ font: `600 13px ${F_SANS}`, color: "var(--muted)", width: 14, textAlign: "center", transform: open ? "rotate(90deg)" : "none", transition: "transform .18s" }}>▸</span>
                </div>
              </div>

              {open && (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "18px 24px", padding: "20px 22px" }}>
                    <Field label="Contact">{a.contactNumber || "—"}</Field>
                    <Field label="Login email"><span style={{ color: a.linkedinEmail && a.linkedinEmail !== a.email ? "var(--text2)" : "var(--muted)" }}>{a.linkedinEmail && a.linkedinEmail !== a.email ? a.linkedinEmail : "Same as owner"}</span></Field>
                    <Field label="Connections">{a.connectionCount ? a.connectionCount.toLocaleString() : "—"}</Field>
                    <Field label="Location">{a.location || a.industry || "—"}</Field>
                    <Field label="LinkedIn URL"><a href={liHref(a.linkedinUrl)} target="_blank" rel="noopener noreferrer" style={{ color: "var(--link)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>{liShort(a.linkedinUrl)}</a></Field>
                    <Field label="Heard from">{a.referralSource || "—"}</Field>
                    <Field label="Referred by">{a.referredBy ? <span style={{ color: "var(--st-active-fg)", fontWeight: 600 }}>{a.referredBy}</span> : "—"}</Field>
                  </div>
                  {/* actions */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "14px 22px", borderTop: "1px solid var(--divider)", background: "var(--band)", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {ACTIONS.map((act) => (
                        <button key={act.db} onClick={() => setStatus(a.id, act.db)} disabled={busy === a.id}
                          style={act.kind === "accept"
                            ? { font: `600 12.5px ${F_SANS}`, color: "#fff", background: "var(--sheets-btn-bg)", border: "none", padding: "8px 16px", borderRadius: 9, cursor: "pointer" }
                            : act.kind === "reject"
                              ? { font: `600 12.5px ${F_SANS}`, color: "var(--danger)", background: "transparent", border: "1px solid var(--danger-border)", padding: "8px 14px", borderRadius: 9, cursor: "pointer" }
                              : secBtn}>{act.label}</button>
                      ))}
                    </div>
                    <span style={{ font: `500 12px ${F_SANS}`, color: "var(--muted2)" }}>Accepting creates the inventory profile</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
