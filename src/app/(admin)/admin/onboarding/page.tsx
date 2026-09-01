"use client";

// Onboarding — the pipeline view of every ambassador application, from a fresh
// signup through to a fully working account. Four sections: Initial (brand new),
// Processing (everything in flight), Rejected, and Onboarded (done) pinned to the
// bottom. An application only reaches Onboarded once the account behind it has a
// GoLogin — without one the account can't be run, so it stays in Processing with a
// "needs GoLogin" flag no matter what its status column says.
//
// Each row's dropdown writes the real AmbassadorStatus, so this page and the
// Applications page always agree.

import { useEffect, useMemo, useState } from "react";

const F_SANS = "var(--font-sans),system-ui,sans-serif";
const F_GRO = "var(--font-grotesk),system-ui,sans-serif";

type Bucket = "initial" | "processing" | "rejected" | "onboarded";
type Status = "pending" | "reviewing" | "approved" | "rejected" | "onboarded" | "unreachable" | "contacted" | "on_hold";

interface Row {
  id: string;
  fullName: string;
  email: string;
  contactNumber: string | null;
  contactChannel: string | null;
  linkedinUrl: string | null;
  location: string | null;
  status: Status;
  createdAt: string;
  onboardedAt: string | null;
  accountIssue: string | null;
  bucket: Bucket;
  reason: string;
  hasGologin: boolean;
  hasLogin: boolean;
  accountId: string | null;
  accountName: string | null;
  accountStatus: string | null;
  loginEmail: string | null;
  gologinShareLink: string | null;
  connectionCount: number | null;
}

// The dropdown offers every real status, grouped so the common next step is obvious.
const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "pending", label: "Initial · new application" },
  { value: "reviewing", label: "Processing · in review" },
  { value: "contacted", label: "Processing · contacted" },
  { value: "approved", label: "Processing · approved" },
  { value: "on_hold", label: "Processing · on hold" },
  { value: "unreachable", label: "Processing · unreachable" },
  { value: "onboarded", label: "Onboarded · done" },
  { value: "rejected", label: "Rejected" },
];

const SECTIONS: { key: Bucket; title: string; tone: string; note: string }[] = [
  { key: "initial", title: "Initial", tone: "var(--blue-chip-text,#2b5fd0)", note: "brand-new applications — nobody has picked these up yet" },
  { key: "processing", title: "Processing", tone: "var(--warn-badge-text,#b7791f)", note: "in flight — being reviewed, chased, approved or waiting on a GoLogin" },
  { key: "rejected", title: "Rejected", tone: "var(--st-cancel-fg,#c0392b)", note: "turned down — kept for the record" },
  { key: "onboarded", title: "Onboarded", tone: "var(--st-active-fg,#1a8a4a)", note: "fully set up — account exists and has a GoLogin we can run" },
];

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const ageDays = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));

function StatusPicker({ r, onChange, busy }: { r: Row; onChange: (s: Status) => void; busy: boolean }) {
  return (
    <select
      value={r.status}
      disabled={busy}
      onChange={(e) => onChange(e.target.value as Status)}
      title="Move this application to another stage — writes the real application status"
      style={{
        font: `600 12px ${F_SANS}`, padding: "7px 10px", borderRadius: 9,
        border: "1px solid var(--border,#dcdce0)", background: "var(--card,#fff)",
        color: "var(--fg,#111)", cursor: busy ? "wait" : "pointer", maxWidth: 210,
      }}
    >
      {STATUS_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function ApplicantRow({ r, onChange, busy }: { r: Row; onChange: (s: Status) => void; busy: boolean }) {
  const blocked = r.bucket === "processing" && r.status === "onboarded";
  return (
    <div style={{ border: `1px solid ${blocked ? "var(--warn-badge-text,#b7791f)" : "var(--border,#e3e3e6)"}`, borderRadius: 12, background: "var(--card,#fff)", padding: "12px 14px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
      <div style={{ flex: "1 1 260px", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ font: `700 14.5px ${F_GRO}`, color: "var(--fg,#111)" }}>{r.fullName?.trim() || "—"}</span>
          {r.connectionCount != null && <span style={{ font: `600 11.5px ${F_SANS}`, color: "var(--muted,#8a9099)" }}>{r.connectionCount}+</span>}
          {r.linkedinUrl && <a href={r.linkedinUrl.startsWith("http") ? r.linkedinUrl : `https://${r.linkedinUrl}`} target="_blank" rel="noreferrer" style={{ font: `600 11.5px ${F_SANS}`, color: "var(--link,#0a66c2)" }}>profile ↗</a>}
          {!r.hasGologin && <span title="No GoLogin profile or share link — the account can't be run, so onboarding isn't finished" style={{ font: `800 10px ${F_SANS}`, padding: "2px 8px", borderRadius: 999, background: "var(--warn-badge-bg,#fef3e2)", color: "var(--warn-badge-text,#b7791f)", whiteSpace: "nowrap" }}>⚠ needs GoLogin</span>}
          {r.accountIssue && <span title={r.accountIssue} style={{ font: `800 10px ${F_SANS}`, padding: "2px 8px", borderRadius: 999, background: "var(--st-cancel-bg,#fdecea)", color: "var(--st-cancel-fg,#c0392b)", whiteSpace: "nowrap" }}>⚠ login issue</span>}
        </div>
        <div style={{ font: `500 12.5px ${F_SANS}`, color: "var(--muted,#8a9099)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {r.email}{r.contactNumber ? ` · ${r.contactNumber}${r.contactChannel ? ` (${r.contactChannel})` : ""}` : ""}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 14px", marginTop: 4, font: `500 12px ${F_SANS}`, color: "var(--muted2,#9aa0a6)" }}>
          <span>Applied: <b style={{ color: "var(--fg,#444)" }}>{fmtDate(r.createdAt)}</b> ({ageDays(r.createdAt)}d ago)</span>
          {r.onboardedAt && <span>Onboarded: <b style={{ color: "var(--fg,#444)" }}>{fmtDate(r.onboardedAt)}</b></span>}
          <span>Account: <b style={{ color: r.accountId ? "var(--fg,#444)" : "var(--st-cancel-fg,#c0392b)" }}>{r.accountName || "none linked"}</b></span>
          {r.gologinShareLink && <a href={r.gologinShareLink} target="_blank" rel="noreferrer" style={{ color: "var(--link,#0a66c2)" }}>GoLogin ↗</a>}
        </div>
      </div>
      <span style={{ font: `600 11px ${F_SANS}`, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap", background: "var(--tag-bg,#f1f1f2)", color: "var(--muted,#6b7280)" }}>{r.reason}</span>
      <StatusPicker r={r} onChange={onChange} busy={busy} />
    </div>
  );
}

export default function OnboardingPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/admin/onboarding", { cache: "no-store" });
      if (!res.ok) { setError(true); return; }
      const d = await res.json();
      setRows(d.rows || []);
    } catch { setError(true); }
  };
  useEffect(() => { load(); }, []);

  const setStatus = async (r: Row, status: Status) => {
    setBusy(r.id);
    try {
      const res = await fetch("/api/admin/onboarding/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: r.id, status }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(typeof d.error === "string" ? d.error : `Could not update status (${res.status}).`);
        return;
      }
      await load();
    } finally {
      setBusy(null);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows || [];
    return (rows || []).filter((r) =>
      [r.fullName, r.email, r.contactNumber, r.accountName, r.loginEmail].some((v) => (v || "").toLowerCase().includes(q))
    );
  }, [rows, query]);

  const bucketed = useMemo(() => {
    const m: Record<Bucket, Row[]> = { initial: [], processing: [], rejected: [], onboarded: [] };
    for (const r of filtered) m[r.bucket].push(r);
    // Oldest application first in the working sections — the ones waiting longest
    // need attention first. Onboarded reads newest-first, most recent wins on top.
    m.initial.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
    m.processing.sort((a, b) => Number(a.hasGologin) - Number(b.hasGologin) || +new Date(a.createdAt) - +new Date(b.createdAt));
    m.rejected.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    m.onboarded.sort((a, b) => +new Date(b.onboardedAt || b.createdAt) - +new Date(a.onboardedAt || a.createdAt));
    return m;
  }, [filtered]);

  const needsGologin = useMemo(() => bucketed.processing.filter((r) => r.status === "onboarded").length, [bucketed]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "8px 4px 60px" }}>
      <h1 style={{ font: `800 28px ${F_GRO}`, margin: "0 0 6px", color: "var(--fg,#111)" }}>Onboarding</h1>
      <p style={{ font: `500 14px ${F_SANS}`, color: "var(--muted,#777)", margin: "0 0 4px", maxWidth: 720 }}>
        Every ambassador application, from signup to a working account. An application only counts as
        <strong> onboarded once its account has a GoLogin</strong> — without one the account can&apos;t be run,
        so it stays in Processing. Use each row&apos;s dropdown to move someone to the next stage.
      </p>

      {needsGologin > 0 && (
        <div style={{ marginTop: 14, padding: "11px 14px", borderRadius: 12, background: "var(--warn-badge-bg,#fef3e2)", border: "1px solid var(--warn-badge-text,#b7791f)", font: `600 13px ${F_SANS}`, color: "var(--warn-badge-text,#b7791f)" }}>
          ⚠ {needsGologin} application{needsGologin === 1 ? " is" : "s are"} marked onboarded but {needsGologin === 1 ? "has" : "have"} no GoLogin — shown in Processing until one is added.
        </div>
      )}

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search name, email, number or account…"
        style={{ width: "100%", boxSizing: "border-box", marginTop: 14, padding: "11px 14px", borderRadius: 10, border: "1px solid var(--border,#dcdce0)", background: "var(--card,#fff)", color: "var(--fg,#111)", font: `500 14px ${F_SANS}`, outline: "none" }}
      />
      {query && rows && <p style={{ font: `500 12.5px ${F_SANS}`, color: "var(--muted,#888)", margin: "8px 2px 0" }}>{filtered.length} of {rows.length} applications match “{query}”.</p>}

      {error && <p style={{ color: "var(--st-cancel-fg,#b00)", font: `600 14px ${F_SANS}` }}>Failed to load.</p>}
      {!rows && !error && <p style={{ font: `500 14px ${F_SANS}`, color: "var(--muted,#888)" }}>Loading…</p>}

      {rows && SECTIONS.map((s) => (
        <section key={s.key} style={{ marginTop: 30 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: s.tone }} />
            <h2 style={{ font: `700 17px ${F_GRO}`, margin: 0, color: "var(--fg,#111)" }}>{s.title}</h2>
            <span style={{ font: `700 13px ${F_SANS}`, color: "var(--muted,#888)" }}>{bucketed[s.key].length}</span>
            <span style={{ font: `500 12.5px ${F_SANS}`, color: "var(--muted2,#9aa0a6)" }}>{s.note}</span>
          </div>
          {bucketed[s.key].length === 0 ? (
            <p style={{ font: `500 13px ${F_SANS}`, color: "var(--muted,#999)", margin: "8px 0 0" }}>None.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
              {bucketed[s.key].map((r) => (
                <ApplicantRow key={r.id} r={r} busy={busy === r.id} onChange={(st) => setStatus(r, st)} />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
