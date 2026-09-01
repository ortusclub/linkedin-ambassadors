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

type Bucket = "initial" | "processing" | "rejected" | "onboarded" | "unreachable";
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
  adminNotes: string | null;
  applicationNotes: string | null;
  referredBy: string | null;
  referralSource: string | null;
  industry: string | null;
  poc: string | null;
  linkedinEmail: string | null;
  bookingEmail: string | null;
  accountFreshness: string | null;
  ownerStatus: string | null;
  paymentMethod: string | null;
  paymentDetails: string | null;
  payoutName: string | null;
  verifiedAt: string | null;
  setupPaidAt: string | null;
  personalEmail: string | null;
  hasPassword: boolean;
  has2fa: boolean;
  gologinProfileId: string | null;
  accountRestrictedAt: string | null;
  monthlyPrice: number | null;
  ambassadorPayment: number | null;
  accountNotes: string | null;
}

// The dropdown offers the four stages only — the finer sub-statuses (contacted /
// approved / on hold / unreachable) still exist in the data and still drive the
// section a row lands in, but they can't be picked by hand. "Processing" writes
// `reviewing`, the neutral in-flight status.
const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "pending", label: "Initial" },
  { value: "reviewing", label: "Processing" },
  { value: "rejected", label: "Rejected" },
  { value: "onboarded", label: "Onboarded" },
];

// A row already sitting on one of the retired sub-statuses gets a read-only entry
// showing where it actually is, so the select never renders blank.
const LEGACY_LABEL: Partial<Record<Status, string>> = {
  contacted: "Processing · contacted",
  approved: "Processing · approved",
  on_hold: "Processing · on hold",
  unreachable: "Unreachable",
};

const SECTIONS: { key: Bucket; title: string; tone: string; note: string }[] = [
  { key: "initial", title: "Initial", tone: "var(--blue-chip-text,#2b5fd0)", note: "brand-new applications — nobody has picked these up yet" },
  { key: "processing", title: "Processing", tone: "var(--warn-badge-text,#b7791f)", note: "in flight — being reviewed, chased, approved or waiting on a GoLogin" },
  { key: "rejected", title: "Rejected", tone: "var(--st-cancel-fg,#c0392b)", note: "turned down — kept for the record" },
  { key: "onboarded", title: "Onboarded", tone: "var(--st-active-fg,#1a8a4a)", note: "set up — any without a GoLogin sit at the bottom, badged" },
  { key: "unreachable", title: "Unreachable", tone: "var(--muted2,#9aa0a6)", note: "never got a reply — parked out of the way, not part of the working pipeline" },
];

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const ageDays = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));

// One labelled detail cell. Anything missing shows a muted dash rather than being
// hidden, so a blank field reads as "we don't have this" instead of vanishing.
function D({ label, children }: { label: string; children?: React.ReactNode }) {
  const empty = children === null || children === undefined || children === "" || children === false;
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ font: `700 10px ${F_SANS}`, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted2,#9aa0a6)", marginBottom: 3 }}>{label}</div>
      <div style={{ font: `600 13px ${F_SANS}`, color: empty ? "var(--muted2,#b6bbc2)" : "var(--fg,#111)", wordBreak: "break-word" }}>{empty ? "—" : children}</div>
    </div>
  );
}

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
      {!STATUS_OPTIONS.some((o) => o.value === r.status) && (
        <option value={r.status} disabled>{LEGACY_LABEL[r.status] || r.status}</option>
      )}
      {STATUS_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function ApplicantRow({ r, onChange, busy, open, onToggle }: { r: Row; onChange: (s: Status) => void; busy: boolean; open: boolean; onToggle: () => void }) {
  const blocked = r.status === "onboarded" && !r.hasGologin;
  return (
    <div style={{ border: `1px solid ${blocked ? "var(--warn-badge-text,#b7791f)" : "var(--border,#e3e3e6)"}`, borderRadius: 12, background: "var(--card,#fff)", overflow: "hidden" }}>
    <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
      {/* Clicking the body opens the full detail; the dropdown sits outside it so
          changing status never toggles the row. */}
      <div onClick={onToggle} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }} style={{ flex: "1 1 260px", minWidth: 0, cursor: "pointer" }}>
        <span style={{ font: `600 11px ${F_SANS}`, color: "var(--muted2,#9aa0a6)", marginRight: 6 }}>{open ? "▾" : "▸"}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ font: `700 14.5px ${F_GRO}`, color: "var(--fg,#111)" }}>{r.fullName?.trim() || "—"}</span>
          {r.connectionCount != null && <span style={{ font: `600 11.5px ${F_SANS}`, color: "var(--muted,#8a9099)" }}>{r.connectionCount}+</span>}
          {r.linkedinUrl && <a href={r.linkedinUrl.startsWith("http") ? r.linkedinUrl : `https://${r.linkedinUrl}`} target="_blank" rel="noreferrer" style={{ font: `600 11.5px ${F_SANS}`, color: "var(--link,#0a66c2)" }}>profile ↗</a>}
          {!r.hasGologin && <span title="No GoLogin profile or share link on the linked account — it can't be run until one is added" style={{ font: `800 10px ${F_SANS}`, padding: "2px 8px", borderRadius: 999, background: "var(--warn-badge-bg,#fef3e2)", color: "var(--warn-badge-text,#b7791f)", whiteSpace: "nowrap" }}>⚠ No GoLogin found</span>}
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
    {open && (
      <div style={{ borderTop: "1px solid var(--border,#eee)", background: "var(--panel,#fafafa)", padding: "16px 16px 18px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 16 }}>
          {/* Who they are + how to reach them */}
          <D label="Full name">{r.fullName?.trim()}</D>
          <D label="Contact email">{r.email ? <a href={`mailto:${r.email}`} style={{ color: "var(--link,#0a66c2)" }}>{r.email}</a> : null}</D>
          <D label="Contact number">{r.contactNumber}</D>
          <D label="Contact channel">{r.contactChannel}</D>
          <D label="Location">{r.location}</D>
          <D label="Industry">{r.industry}</D>
          <D label="Referred by">{r.referredBy}</D>
          <D label="Referral source">{r.referralSource}</D>
          <D label="Point of contact">{r.poc}</D>
          <D label="Booking email">{r.bookingEmail}</D>
          {/* The account we hold for them */}
          <D label="Account">{r.accountName}</D>
          <D label="Account status">{r.accountRestrictedAt ? `${r.accountStatus || "—"} · restricted` : r.accountStatus}</D>
          <D label="Login email">{r.loginEmail}</D>
          <D label="Personal email (on account)">{r.personalEmail}</D>
          <D label="LinkedIn email (applied with)">{r.linkedinEmail}</D>
          <D label="Password stored">{r.hasPassword ? "Yes" : null}</D>
          <D label="2FA stored">{r.has2fa ? "Yes" : null}</D>
          <D label="GoLogin">{r.gologinShareLink ? <a href={r.gologinShareLink} target="_blank" rel="noreferrer" style={{ color: "var(--link,#0a66c2)" }}>share link ↗</a> : r.gologinProfileId ? `profile ${r.gologinProfileId.slice(0, 8)}…` : null}</D>
          <D label="LinkedIn profile">{r.linkedinUrl ? <a href={r.linkedinUrl.startsWith("http") ? r.linkedinUrl : `https://${r.linkedinUrl}`} target="_blank" rel="noreferrer" style={{ color: "var(--link,#0a66c2)" }}>profile ↗</a> : null}</D>
          <D label="Connections">{r.connectionCount != null ? r.connectionCount : null}</D>
          <D label="Account freshness">{r.accountFreshness}</D>
          {/* Money + dates */}
          <D label="Rent price">{r.monthlyPrice ? `$${r.monthlyPrice}/mo` : null}</D>
          <D label="Ambassador payout">{r.ambassadorPayment ? `₱${r.ambassadorPayment}/mo` : null}</D>
          <D label="Payment method">{r.paymentMethod}</D>
          <D label="Payout handle">{r.paymentDetails}</D>
          <D label="Payout name">{r.payoutName}</D>
          <D label="Applied">{fmtDate(r.createdAt)}</D>
          <D label="Verified">{r.verifiedAt ? fmtDate(r.verifiedAt) : null}</D>
          <D label="Onboarded">{r.onboardedAt ? fmtDate(r.onboardedAt) : null}</D>
          <D label="Setup fee paid">{r.setupPaidAt ? fmtDate(r.setupPaidAt) : null}</D>
          <D label="Owner status">{r.ownerStatus}</D>
        </div>
        {(r.accountIssue || r.adminNotes || r.applicationNotes || r.accountNotes) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border,#eee)" }}>
            {r.accountIssue && <Note label="Login issue" tone="var(--st-cancel-fg,#c0392b)">{r.accountIssue}</Note>}
            {r.adminNotes && <Note label="Admin notes">{r.adminNotes}</Note>}
            {r.applicationNotes && <Note label="Application notes">{r.applicationNotes}</Note>}
            {r.accountNotes && <Note label="Account notes">{r.accountNotes}</Note>}
          </div>
        )}
      </div>
    )}
    </div>
  );
}

function Note({ label, tone, children }: { label: string; tone?: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ font: `700 10px ${F_SANS}`, letterSpacing: ".06em", textTransform: "uppercase", color: tone || "var(--muted2,#9aa0a6)", marginBottom: 3 }}>{label}</div>
      <div style={{ font: `500 12.5px/1.55 ${F_SANS}`, color: tone || "var(--fg,#444)", whiteSpace: "pre-wrap" }}>{children}</div>
    </div>
  );
}

export default function OnboardingPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setExpanded((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });

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
      [r.fullName, r.email, r.contactNumber, r.accountName, r.loginEmail, r.personalEmail, r.linkedinEmail].some((v) => (v || "").toLowerCase().includes(q))
    );
  }, [rows, query]);

  const bucketed = useMemo(() => {
    const m: Record<Bucket, Row[]> = { initial: [], processing: [], rejected: [], onboarded: [], unreachable: [] };
    for (const r of filtered) m[r.bucket].push(r);
    // Oldest application first in the working sections — the ones waiting longest
    // need attention first. Onboarded reads newest-first, most recent wins on top.
    m.initial.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
    m.processing.sort((a, b) => Number(a.hasGologin) - Number(b.hasGologin) || +new Date(a.createdAt) - +new Date(b.createdAt));
    m.rejected.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    m.onboarded.sort((a, b) => Number(b.hasGologin) - Number(a.hasGologin) || +new Date(b.onboardedAt || b.createdAt) - +new Date(a.onboardedAt || a.createdAt));
    m.unreachable.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    return m;
  }, [filtered]);

  const needsGologin = useMemo(() => bucketed.onboarded.filter((r) => !r.hasGologin).length, [bucketed]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "8px 4px 60px" }}>
      <h1 style={{ font: `800 28px ${F_GRO}`, margin: "0 0 6px", color: "var(--fg,#111)" }}>Onboarding</h1>
      <p style={{ font: `500 14px ${F_SANS}`, color: "var(--muted,#777)", margin: "0 0 4px", maxWidth: 720 }}>
        Every ambassador application, from signup to a working account. Click any row for the full record —
        contact details, referrer, login email, GoLogin and payout info. Use the dropdown to move someone to
        the next stage. An account <strong>can&apos;t be run without a GoLogin</strong>, so onboarded rows
        missing one are badged and sorted to the bottom.
      </p>

      {needsGologin > 0 && (
        <div style={{ marginTop: 14, padding: "11px 14px", borderRadius: 12, background: "var(--warn-badge-bg,#fef3e2)", border: "1px solid var(--warn-badge-text,#b7791f)", font: `600 13px ${F_SANS}`, color: "var(--warn-badge-text,#b7791f)" }}>
          ⚠ {needsGologin} onboarded application{needsGologin === 1 ? " has" : "s have"} no GoLogin — sorted to the bottom of Onboarded and badged, since the account can&apos;t be run without one.
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
                <ApplicantRow key={r.id} r={r} busy={busy === r.id} open={expanded.has(r.id)} onToggle={() => toggle(r.id)} onChange={(st) => setStatus(r, st)} />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
