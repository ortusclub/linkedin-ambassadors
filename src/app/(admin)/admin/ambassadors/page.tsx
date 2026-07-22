"use client";

import { useEffect, useMemo, useState } from "react";
import { isLikelyTestEmail } from "@/lib/test-mode";

interface Application {
  id: string;
  fullName: string;
  email: string;
  linkedinEmail: string | null;
  bookingEmail?: string | null;
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
  call?: {
    stage: "none" | "booked" | "done";
    scheduledAt: string | null;
    meetLink: string | null;
    channel: string | null;
    title: string | null;
    cancelled: boolean;
  } | null;
  poc?: string | null;
  outreachLog?: { ch: string; text: string; by?: string; at: string }[] | null;
  nextFollowUp?: string | null;
  callOutcome?: string | null;
  onboardedAt?: string | null;
  accountFreshness?: string | null;
  paidAt?: string | null;
  marketerPaidAt?: string | null;
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

// call stage (booked/done/none) — sourced live from info@'s Google Calendar
const CALL_BUCKET: Record<string, { label: string; bg: string; fg: string }> = {
  none: { label: "No call yet", bg: "var(--neutral-chip-bg)", fg: "var(--neutral-chip-text)" },
  booked: { label: "Call booked", bg: "var(--blue-chip-bg)", fg: "var(--blue-chip-text)" },
  done: { label: "Call done", bg: "var(--st-active-bg)", fg: "var(--st-active-fg)" },
  no_show: { label: "No-show", bg: "var(--st-cancel-bg)", fg: "var(--st-cancel-fg)" },
};
const CALL_CHIPS: [string, string, string | null][] = [
  ["all", "All", null], ["none", "No call yet", "var(--neutral-chip-text)"],
  ["booked", "Call booked", "var(--blue-chip-text)"], ["done", "Call done", "var(--st-active-fg)"],
  ["no_show", "No-show", "var(--st-cancel-fg)"],
];
// call outcome (manual no-show) overrides the calendar-derived stage
const callBucketOf = (a: Application): string => a.callOutcome === "no_show" ? "no_show" : (a.call?.stage || "none");

const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const fmtDateTime = (iso: string | null) => iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
const initialsOf = (name: string) => { const p = (name || "?").trim().split(/\s+/); return (p.length > 1 ? p[0][0] + p[1][0] : name.slice(0, 2)).toUpperCase() || "?"; };
const liHref = (url: string) => (url.startsWith("http") ? url : `https://${url}`);
const liShort = (url: string) => { const h = url.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, "").replace(/[/?].*$/, ""); return h ? `in/${h.length > 18 ? h.slice(0, 18) + "…" : h}` : "profile"; };

// outreach touch channels: [label, bg var, fg var]
const TOUCH: Record<string, [string, string, string]> = {
  whatsapp: ["WhatsApp", "--green-chip-bg", "--green-chip-text"],
  email: ["Email", "--blue-chip-bg", "--blue-chip-text"],
  call: ["Call", "--st-unreach-bg", "--st-unreach-fg"],
  text: ["Text", "--st-conv-bg", "--st-conv-fg"],
  reply: ["Reply", "--st-replied-bg", "--st-replied-fg"],
  booked: ["Booked", "--blue-chip-bg", "--blue-chip-text"],
  done: ["Call", "--st-active-bg", "--st-active-fg"],
  note: ["Note", "--neutral-chip-bg", "--neutral-chip-text"],
};
const touchLabel = (ch: string) => (TOUCH[ch] || TOUCH.note)[0];
const touchChipStyle = (ch: string): React.CSSProperties => {
  const c = TOUCH[ch] || TOUCH.note;
  return { font: `600 9.5px ${F_SANS}`, letterSpacing: ".04em", textTransform: "uppercase", padding: "4px 0", borderRadius: 6, flex: "none", width: 66, textAlign: "center", background: `var(${c[1]})`, color: `var(${c[2]})` };
};
const callSummary = (a: Application): string => {
  if (a.callOutcome === "no_show") return "No-show";
  const c = a.call;
  if (!c || c.stage === "none") return "No call booked";
  if (c.stage === "booked") return `Booked · ${fmtDateTime(c.scheduledAt)}`;
  return c.scheduledAt ? `Completed · ${fmtDate(c.scheduledAt)}` : "Completed";
};
const lastTouchAt = (a: Application): string => {
  const log = a.outreachLog;
  return log && log.length ? fmtDateTime(log[log.length - 1].at) : "";
};
// a "touch" is an actual outreach contact — notes are annotations, not touches
const touchCount = (a: Application): number => (a.outreachLog || []).filter((t) => t.ch !== "note").length;
// stability-check hold: 3 days for established accounts, 1 week for fresh ones
const holdDays = (a: Application): number => (a.accountFreshness === "fresh" ? 7 : 3);
const eligibleMs = (a: Application): number | null => a.onboardedAt ? new Date(a.onboardedAt).getTime() + holdDays(a) * 86400000 : null;

export default function AdminAmbassadorsPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [callFilter, setCallFilter] = useState("all");
  const [marketer, setMarketer] = useState("all");
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [byDraft, setByDraft] = useState<Record<string, string>>({});
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [sheetConfigured, setSheetConfigured] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

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

  const deleteApp = async (a: Application) => {
    if (!confirm(`Delete the signup from ${a.fullName || a.email}? This can't be undone.`)) return;
    setApps((prev) => prev.filter((x) => x.id !== a.id));
    try { await fetch(`/api/admin/ambassadors/${a.id}`, { method: "DELETE" }); } catch {}
  };

  const logTouch = async (id: string, ch: string) => {
    const draft = (noteDraft[id] || "").trim();
    const by = (byDraft[id] || "").trim();
    const text = draft || (({ whatsapp: "WhatsApp message sent", email: "Email sent", call: "Call attempted — no answer", text: "Text message sent", note: "Note added" } as Record<string, string>)[ch] || "Note added");
    setBusy(id);
    setNoteDraft((d) => ({ ...d, [id]: "" }));
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, outreachLog: [...(a.outreachLog || []), { ch, text, by: by || "You", at: new Date().toISOString() }] } : a)));
    try {
      const res = await fetch(`/api/admin/ambassadors/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ addTouch: { ch, text, by: by || undefined } }) });
      if (res.ok) { const d = await res.json(); if (d.application) setApps((prev) => prev.map((a) => (a.id === id ? { ...a, ...d.application } : a))); }
    } finally { setBusy(null); }
  };

  const savePoc = async (id: string, poc: string) => {
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, poc } : a)));
    try { await fetch(`/api/admin/ambassadors/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ poc }) }); } catch {}
  };

  const saveField = async (id: string, patch: Record<string, unknown>) => {
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    try { await fetch(`/api/admin/ambassadors/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }); } catch {}
  };

  const setOutcome = async (id: string, outcome: string | null) => {
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, callOutcome: outcome } : a)));
    try { await fetch(`/api/admin/ambassadors/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ callOutcome: outcome }) }); } catch {}
  };

  const markOnboarded = async (id: string, freshness: string) => {
    const onboardedAt = new Date().toISOString();
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status: "onboarded", onboardedAt, accountFreshness: freshness } : a)));
    try {
      const res = await fetch(`/api/admin/ambassadors/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "onboarded", onboardedAt, accountFreshness: freshness }) });
      if (res.ok) { const d = await res.json(); if (d.application) setApps((prev) => prev.map((a) => (a.id === id ? { ...a, ...d.application } : a))); }
    } catch {}
  };
  const clearOnboarded = async (id: string) => {
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, onboardedAt: null, accountFreshness: null } : a)));
    try { await fetch(`/api/admin/ambassadors/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ onboardedAt: null, accountFreshness: null }) }); } catch {}
  };
  const setPaid = async (id: string, field: "paidAt" | "marketerPaidAt", value: string | null) => {
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
    try { await fetch(`/api/admin/ambassadors/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: value }) }); } catch {}
  };
  const copyFormula = () => { if (!sheetUrl) return; navigator.clipboard?.writeText(`=IMPORTDATA("${sheetUrl}")`); setCopied(true); setTimeout(() => setCopied(false), 1800); };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: apps.length };
    for (const a of apps) { const b = bucketOf(a.status); c[b] = (c[b] || 0) + 1; }
    return c;
  }, [apps]);

  const callCounts = useMemo(() => {
    const c: Record<string, number> = { all: apps.length };
    for (const a of apps) { const b = callBucketOf(a); c[b] = (c[b] || 0) + 1; }
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
      if (callFilter !== "all" && callBucketOf(a) !== callFilter) return false;
      if (marketer !== "all" && (a.referredBy || "").trim() !== marketer) return false;
      if (!q) return true;
      return `${a.fullName} ${a.email} ${a.contactNumber || ""} ${a.linkedinUrl} ${a.referredBy || ""}`.toLowerCase().includes(q);
    });
    const lastSeen = new Map<string, number>();
    rows.forEach((a) => { const t = new Date(a.createdAt).getTime(); lastSeen.set(a.email, Math.max(lastSeen.get(a.email) ?? 0, t)); });
    return [...rows].sort((a, b) => (a.email !== b.email ? lastSeen.get(b.email)! - lastSeen.get(a.email)! : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }, [apps, filter, callFilter, marketer, query]);

  const toggle = (id: string) => setCollapsed((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allCollapsed = filtered.length > 0 && filtered.every((a) => collapsed.has(a.id));
  const collapseAll = () => setCollapsed(allCollapsed ? new Set() : new Set(filtered.map((a) => a.id)));

  const labelCss: React.CSSProperties = { font: `600 10px ${F_SANS}`, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--label)" };
  const chipStyle = (active: boolean): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 13px", borderRadius: 999, cursor: "pointer", font: `600 12.5px ${F_SANS}`, color: "var(--text)", border: "1px solid", borderColor: active ? "var(--chip-active-border)" : "var(--card-border)", background: active ? "var(--chip-active-bg)" : "transparent" });
  const secBtn: React.CSSProperties = { font: `600 12.5px ${F_SANS}`, color: "var(--btn-secondary-fg)", background: "var(--btn-secondary-bg)", border: "1px solid var(--btn-secondary-border)", padding: "8px 14px", borderRadius: 9, cursor: "pointer" };
  // Inline-editable detail field — saves on blur. Called as {editField(...)} (not <EditField/>)
  // so it stays plain JSX and the uncontrolled input isn't remounted on re-render.
  const editField = (id: string, field: string, label: string, value: string | number | null, opts?: { placeholder?: string; numeric?: boolean; notNull?: boolean }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
      <span style={labelCss}>{label}</span>
      <input
        defaultValue={value == null ? "" : String(value)}
        placeholder={opts?.placeholder}
        inputMode={opts?.numeric ? "numeric" : undefined}
        onBlur={(e) => {
          const raw = e.target.value.trim();
          if (raw === (value == null ? "" : String(value))) return;
          const v = opts?.numeric
            ? (raw === "" ? null : (parseInt(raw.replace(/[^0-9]/g, ""), 10) || null))
            : (raw === "" ? (opts?.notNull ? "" : null) : raw);
          saveField(id, { [field]: v });
        }}
        style={{ width: "100%", background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: 8, padding: "7px 9px", font: `500 13px ${F_SANS}`, color: "var(--text)", outline: "none" }}
      />
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

      {/* filter chips: status + call stage */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ ...labelCss, width: 48, flex: "none" }}>Status</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {CHIPS.map(([key, lbl, dot]) => (
              <button key={key} onClick={() => setFilter(key)} style={chipStyle(filter === key)}>
                {dot && <span style={{ width: 7, height: 7, borderRadius: 999, background: dot }} />}
                {lbl}<span style={{ color: "var(--muted)" }}>{counts[key] || 0}</span>
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ ...labelCss, width: 48, flex: "none" }}>Call</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {CALL_CHIPS.map(([key, lbl, dot]) => (
              <button key={key} onClick={() => setCallFilter(key)} style={chipStyle(callFilter === key)}>
                {dot && <span style={{ width: 7, height: 7, borderRadius: 999, background: dot }} />}
                {lbl}<span style={{ color: "var(--muted)" }}>{callCounts[key] || 0}</span>
              </button>
            ))}
          </div>
        </div>
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
          const cs = callBucketOf(a);
          const onboarded = !!a.onboardedAt;
          const accepted = a.status === "approved" || a.status === "onboarded";
          const elig = eligibleMs(a);
          const ready = elig !== null && Date.now() >= elig;
          const fullyPaid = !!a.paidAt;
          const payStage = !onboarded ? "Agreed · awaiting transfer" : fullyPaid ? "Paid" : ready ? "Ready to pay" : "In hold";
          const payPill = !onboarded ? { bg: "var(--warn-badge-bg)", fg: "var(--warn-badge-text)" } : (fullyPaid || ready) ? { bg: "var(--st-active-bg)", fg: "var(--st-active-fg)" } : { bg: "var(--blue-chip-bg)", fg: "var(--blue-chip-text)" };
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
                    <span onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(a.email); setCopiedEmail(a.email); setTimeout(() => setCopiedEmail((c) => (c === a.email ? null : c)), 1400); }} title="Click to copy" style={{ font: `500 13px ${F_SANS}`, color: "var(--muted)", cursor: "pointer", userSelect: "text" }}>{a.email}{copiedEmail === a.email && <span style={{ color: "var(--st-active-fg)", marginLeft: 6, fontWeight: 600 }}>· Copied ✓</span>}</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14, flex: "none" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 7 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {cs !== "none" && (
                        <span style={{ font: `600 12px ${F_SANS}`, padding: "5px 13px", borderRadius: 999, whiteSpace: "nowrap", background: CALL_BUCKET[cs].bg, color: CALL_BUCKET[cs].fg }}>{CALL_BUCKET[cs].label}</span>
                      )}
                      <span style={{ font: `600 12px ${F_SANS}`, padding: "5px 13px", borderRadius: 999, whiteSpace: "nowrap", background: b.bg, color: b.fg }}>{b.label}</span>
                    </div>
                    <span style={{ font: `500 12px ${F_SANS}`, color: "var(--date-color)" }}>Applied {fmtDate(a.createdAt)}</span>
                  </div>
                  <span style={{ font: `600 13px ${F_SANS}`, color: "var(--muted)", width: 14, textAlign: "center", transform: open ? "rotate(90deg)" : "none", transition: "transform .18s" }}>▸</span>
                </div>
              </div>

              {open && (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "18px 24px", padding: "20px 22px" }}>
                    {editField(a.id, "contactNumber", "Contact", a.contactNumber, { placeholder: "Phone / WhatsApp" })}
                    {editField(a.id, "linkedinEmail", "Login email", a.linkedinEmail, { placeholder: "Same as owner" })}
                    {editField(a.id, "bookingEmail", "Booking email", a.bookingEmail ?? null, { placeholder: "If they booked with another email" })}
                    {editField(a.id, "connectionCount", "Connections", a.connectionCount ?? null, { numeric: true, placeholder: "e.g. 500" })}
                    {editField(a.id, "location", "Location", a.location ?? a.industry ?? null, { placeholder: "City / country" })}
                    {editField(a.id, "linkedinUrl", "LinkedIn URL", a.linkedinUrl, { placeholder: "linkedin.com/in/…", notNull: true })}
                    {editField(a.id, "referralSource", "Heard from", a.referralSource, { placeholder: "Flyer / FB / referral" })}
                    {editField(a.id, "referredBy", "Referred by", a.referredBy, { placeholder: "Marketer name" })}
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
                      <span style={labelCss}>POC <span style={{ color: "var(--muted2)", textTransform: "none", letterSpacing: 0 }}>· who owns this</span></span>
                      <input defaultValue={a.poc || ""} onBlur={(e) => { const v = e.target.value.trim(); if (v !== (a.poc || "")) savePoc(a.id, v); }} placeholder="Type a name…" style={{ width: "100%", background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: 8, padding: "7px 9px", font: `600 13px ${F_SANS}`, color: "var(--text)", outline: "none" }} />
                    </div>
                  </div>
                  {/* outreach & call */}
                  <div style={{ padding: "0 22px 18px" }}>
                    <div style={{ border: "1px solid var(--divider)", borderRadius: 12, overflow: "hidden" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px", background: "var(--band)", borderBottom: "1px solid var(--divider)" }}>
                        <span style={{ font: `700 10px ${F_SANS}`, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--label)" }}>Outreach &amp; call — what we&apos;ve done to push them to a call</span>
                        <span style={{ font: `500 12px ${F_SANS}`, color: "var(--muted)" }}>Handler: <strong style={{ fontWeight: 700, color: "var(--text2)" }}>{a.poc || "—"}</strong></span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px 20px", padding: "14px 16px", borderBottom: "1px solid var(--divider)" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}><span style={labelCss}>Call</span><span style={{ font: `600 13.5px ${F_SANS}`, color: "var(--text)" }}>{callSummary(a)}</span></div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}><span style={labelCss}>Touches</span><span style={{ font: `500 13.5px ${F_SANS}`, color: "var(--text)" }}>{touchCount(a)} touch{touchCount(a) === 1 ? "" : "es"}</span></div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}><span style={labelCss}>Last contact</span><span style={{ font: `500 13.5px ${F_SANS}`, color: "var(--text)" }}>{lastTouchAt(a) || "—"}</span></div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}><span style={labelCss}>Next follow-up</span><span style={{ font: `500 13.5px ${F_SANS}`, color: "var(--text)" }}>{a.nextFollowUp ? fmtDate(a.nextFollowUp) : "—"}</span></div>
                      </div>
                      <div style={{ padding: "12px 16px" }}>
                        {a.outreachLog && a.outreachLog.length ? [...a.outreachLog].reverse().map((t, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "7px 0" }}>
                            <span style={touchChipStyle(t.ch)}>{touchLabel(t.ch)}</span>
                            <span style={{ flex: 1, font: `500 13px ${F_SANS}`, color: "var(--text2)", lineHeight: 1.4 }}>{t.text}</span>
                            <span style={{ font: `500 11.5px ${F_SANS}`, color: "var(--muted2)", whiteSpace: "nowrap" }}>{(t.by ? t.by + " · " : "") + fmtDateTime(t.at)}</span>
                          </div>
                        )) : <span style={{ font: `500 13px ${F_SANS}`, color: "var(--muted)" }}>No outreach logged yet — reach out and log the first touch.</span>}
                      </div>
                      <div style={{ padding: "0 16px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <input value={noteDraft[a.id] || ""} onChange={(e) => setNoteDraft((d) => ({ ...d, [a.id]: e.target.value }))} placeholder="What did you say? — logged with the touch (optional)" style={{ flex: 1, minWidth: 220, background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: 8, padding: "8px 11px", font: `500 12.5px ${F_SANS}`, color: "var(--input-fg)", outline: "none" }} />
                          <input value={byDraft[a.id] || ""} onChange={(e) => setByDraft((d) => ({ ...d, [a.id]: e.target.value }))} placeholder="Who sent it?" style={{ width: 150, flex: "none", background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: 8, padding: "8px 11px", font: `500 12.5px ${F_SANS}`, color: "var(--input-fg)", outline: "none" }} />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ font: `600 11px ${F_SANS}`, color: "var(--muted2)" }}>Log:</span>
                          {(["whatsapp", "email", "call", "text", "note"] as const).map((ch) => (
                            <button key={ch} onClick={() => logTouch(a.id, ch)} disabled={busy === a.id} style={{ ...secBtn, padding: "7px 12px", font: `600 12px ${F_SANS}` }}>+ {touchLabel(ch)}</button>
                          ))}
                          <span style={{ width: 1, height: 18, background: "var(--divider)", margin: "0 2px" }} />
                          <span style={{ font: `600 11px ${F_SANS}`, color: "var(--muted2)" }}>Call:</span>
                          {a.callOutcome === "no_show" ? (
                            <button onClick={() => setOutcome(a.id, null)} style={{ ...secBtn, padding: "7px 12px", font: `600 12px ${F_SANS}` }}>Clear no-show</button>
                          ) : (
                            <button onClick={() => setOutcome(a.id, "no_show")} style={{ font: `600 12px ${F_SANS}`, color: "var(--st-cancel-fg)", background: "var(--st-cancel-bg)", border: "none", padding: "7px 12px", borderRadius: 8, cursor: "pointer" }}>Mark no-show</button>
                          )}
                          {a.call && a.call.stage !== "none" && a.call.meetLink && <a href={a.call.meetLink} target="_blank" rel="noopener noreferrer" style={{ marginLeft: "auto", font: `600 12px ${F_SANS}`, color: "var(--link)", background: "var(--link-bg)", padding: "7px 13px", borderRadius: 8 }}>Join Meet ↗</a>}
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* onboarding & payout — shown once they've agreed (Accepted) */}
                  {accepted && (
                    <div style={{ padding: "0 22px 18px" }}>
                      <div style={{ border: "1px solid var(--divider)", borderRadius: 12, overflow: "hidden" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px", background: "var(--band)", borderBottom: "1px solid var(--divider)" }}>
                          <span style={{ font: `700 10px ${F_SANS}`, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--label)" }}>Onboarding &amp; payout</span>
                          <span style={{ font: `600 11.5px ${F_SANS}`, padding: "3px 11px", borderRadius: 999, whiteSpace: "nowrap", background: payPill.bg, color: payPill.fg }}>{payStage}</span>
                        </div>
                        {!onboarded ? (
                          <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <span style={{ font: `500 13px ${F_SANS}`, color: "var(--muted)" }}>Agreed — waiting on the account transfer (login / 2FA). Once it&apos;s in hand, mark it onboarded to start the hold:</span>
                            <button onClick={() => markOnboarded(a.id, "established")} disabled={busy === a.id} style={{ ...secBtn, padding: "8px 13px", font: `600 12px ${F_SANS}` }}>Onboarded · established (3-day)</button>
                            <button onClick={() => markOnboarded(a.id, "fresh")} disabled={busy === a.id} style={{ ...secBtn, padding: "8px 13px", font: `600 12px ${F_SANS}` }}>Onboarded · fresh (1-week)</button>
                          </div>
                        ) : (
                          <>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px 20px", padding: "14px 16px", borderBottom: "1px solid var(--divider)" }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}><span style={labelCss}>Onboarded</span><span style={{ font: `500 13.5px ${F_SANS}`, color: "var(--text)" }}>{fmtDate(a.onboardedAt!)}</span></div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}><span style={labelCss}>Hold</span><span style={{ font: `500 13.5px ${F_SANS}`, color: "var(--text)" }}>{holdDays(a)}-day · {a.accountFreshness || "established"}</span></div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}><span style={labelCss}>Pay-eligible</span><span style={{ font: `500 13.5px ${F_SANS}`, color: "var(--text)" }}>{elig ? fmtDate(new Date(elig).toISOString()) : "—"}</span></div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}><span style={labelCss}>Check</span><span style={{ font: `600 13.5px ${F_SANS}`, color: ready ? "var(--st-active-fg)" : "var(--warn-badge-text)" }}>{ready ? "Cleared ✓" : "In hold"}</span></div>
                            </div>
                            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                <span style={{ font: `600 12.5px ${F_SANS}`, color: "var(--text)", minWidth: 160 }}>Ambassador payout</span>
                                {a.paidAt ? (
                                  <>
                                    <span style={{ font: `600 12px ${F_SANS}`, color: "var(--st-active-fg)" }}>Paid · {fmtDate(a.paidAt)}</span>
                                    <button onClick={() => setPaid(a.id, "paidAt", null)} style={{ ...secBtn, padding: "5px 10px", font: `600 11.5px ${F_SANS}` }}>Undo</button>
                                  </>
                                ) : (
                                  <>
                                    <span style={{ font: `500 12.5px ${F_SANS}`, color: ready ? "var(--st-active-fg)" : "var(--muted)" }}>{ready ? "Ready to pay" : `Hold until ${elig ? fmtDate(new Date(elig).toISOString()) : "—"}`}</span>
                                    {ready && <button onClick={() => setPaid(a.id, "paidAt", new Date().toISOString())} style={{ font: `600 12px ${F_SANS}`, color: "#fff", background: "var(--sheets-btn-bg)", border: "none", padding: "6px 12px", borderRadius: 8, cursor: "pointer" }}>Mark paid</button>}
                                  </>
                                )}
                              </div>
                              {a.referredBy && (
                                <span style={{ font: `500 11.5px ${F_SANS}`, color: "var(--muted2)" }}>Marketer commission for {a.referredBy} is tracked on the Referrals page.</span>
                              )}
                              <button onClick={() => clearOnboarded(a.id)} style={{ font: `500 11.5px ${F_SANS}`, color: "var(--muted2)", background: "transparent", border: "none", padding: "2px 0", cursor: "pointer", textDecoration: "underline", alignSelf: "flex-start" }}>Undo onboarded</button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
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
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <span style={{ font: `500 12px ${F_SANS}`, color: "var(--muted2)" }}>Accepting creates the inventory profile</span>
                      <button onClick={() => deleteApp(a)} title="Delete this signup" style={{ font: `600 12px ${F_SANS}`, color: "var(--danger)", background: "transparent", border: "1px solid var(--danger-border)", padding: "7px 12px", borderRadius: 8, cursor: "pointer" }}>Delete</button>
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
}
