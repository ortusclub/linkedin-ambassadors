"use client";

// Payouts II — money we pay OUT to the ambassador who supplies each account,
// per account, regardless of whether the account is currently rented. This is a
// SEPARATE set of payments from the renter money coming IN (that lives on the
// Inventory page). Rows expand (inventory-style) to reveal login email, password
// and live 2FA. Split into: Payment overdue / Payment made / Payment not
// applicable. Data comes from /api/admin/payouts-ii.

import { useEffect, useMemo, useState } from "react";

const F_SANS = "var(--font-sans),system-ui,sans-serif";
const F_GRO = "var(--font-grotesk),system-ui,sans-serif";

const peso = (n: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(n);
const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const agoLabel = (iso: string | null | undefined) => {
  if (!iso) return "never";
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
};
const ageLabel = (m: number | null | undefined) => {
  if (!m || m <= 0) return "";
  const y = Math.floor(m / 12), mo = m % 12;
  return y > 0 ? `${y}y${mo ? ` ${mo}m` : ""}` : `${mo}m`;
};

const SETUP_FEE = 1000;
type Bucket = "setup" | "overdue" | "due" | "paid" | "na";
interface Row {
  id: string;
  linkedinName: string;
  linkedinUrl: string | null;
  location: string | null;
  connectionCount: number | null;
  accountAgeMonths: number | null;
  loginEmail: string | null;
  accountPassword: string | null;
  twoFactor: string | null;
  gologinProfileId: string | null;
  gologinShareLink: string | null;
  status: string;
  monthlyPrice: string | number;
  bucket: Bucket;
  reason: string;
  overdue: boolean;
  daysLate: number;
  ownerName: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  contactChannel: string | null;
  paymentMethod: string | null;
  paymentDetail: string | null;
  monthlyAmount: number;
  lastPaidAt: string | null;
  lastPaidAmount: number | null;
  nextDueISO: string | null;
  setupAmount: number;
  totalPaid: number;
}

const CHIP: Record<Bucket, { bg: string; fg: string }> = {
  setup: { bg: "var(--blue-chip-bg,#eaf1ff)", fg: "var(--blue-chip-text,#2b5fd0)" },
  overdue: { bg: "var(--st-cancel-bg,#fdecea)", fg: "var(--st-cancel-fg,#c0392b)" },
  due: { bg: "var(--warn-badge-bg,#fef3e2)", fg: "var(--warn-badge-text,#b7791f)" },
  paid: { bg: "var(--st-active-bg,#e6f6ec)", fg: "var(--st-active-fg,#1a8a4a)" },
  na: { bg: "var(--warn-badge-bg,#f1f1f2)", fg: "var(--warn-badge-text,#6b7280)" },
};

// Masked password with reveal + click-to-copy (mirrors Inventory's PasswordField).
function PasswordField({ password }: { password: string | null }) {
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  if (!password) return <span style={{ color: "var(--muted,#999)" }}>—</span>;
  const copy = () => { navigator.clipboard?.writeText(password); setCopied(true); setTimeout(() => setCopied(false), 1200); };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <code onClick={copy} title="Click to copy" style={{ cursor: "pointer", font: `600 13px ui-monospace,monospace`, color: "var(--fg,#111)" }}>
        {shown ? password : "•".repeat(Math.min(password.length, 12))}
      </code>
      <button onClick={() => setShown((s) => !s)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 13 }} title={shown ? "Hide" : "Reveal"}>👁</button>
      {copied && <span style={{ font: `600 11px ${F_SANS}`, color: "var(--st-active-fg,#1a8a4a)" }}>copied</span>}
    </span>
  );
}

// Live 2FA: stored key (click-copy) + current 6-digit code + countdown.
function TwoFactor({ accountId }: { accountId: string }) {
  type S = { status: "loading" | "none" | "error" } | { status: "invalid"; secret: string } | { status: "ok"; secret: string; code: string; expiresIn: number };
  const [state, setState] = useState<S>({ status: "loading" });
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/admin/accounts/${accountId}/totp`);
        if (!res.ok) { if (alive) setState({ status: "error" }); return; }
        const d = await res.json();
        if (!alive) return;
        if (d.configured === false) setState({ status: "none" });
        else if (d.invalid) setState({ status: "invalid", secret: d.secret || "" });
        else setState({ status: "ok", secret: d.secret || "", code: d.code, expiresIn: d.expiresIn });
      } catch { if (alive) setState({ status: "error" }); }
    };
    load();
    const t = setInterval(load, 10000);
    return () => { alive = false; clearInterval(t); };
  }, [accountId]);

  if (state.status !== "ok") {
    if (state.status === "invalid") return <span style={{ color: "var(--muted,#999)", font: `600 12px ${F_SANS}` }} title={state.secret}>key stored (not a live code)</span>;
    const label = state.status === "loading" ? "…" : state.status === "none" ? "not set" : "error";
    return <span style={{ color: "var(--muted,#999)" }}>{label}</span>;
  }
  const copyKey = () => navigator.clipboard?.writeText(state.secret);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <code onClick={copyKey} title="Click to copy key" style={{ cursor: "pointer", font: `600 12px ui-monospace,monospace`, color: "var(--muted,#777)" }}>{state.secret}</code>
      <code style={{ font: `700 15px ui-monospace,monospace`, letterSpacing: 1, color: "var(--fg,#111)" }}>{state.code.slice(0, 3)} {state.code.slice(3)}</code>
      <span style={{ font: `600 11px ${F_SANS}`, color: "var(--muted,#999)" }}>{state.expiresIn}s</span>
    </span>
  );
}

const D = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
    <span style={{ font: `700 10.5px ${F_SANS}`, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--muted,#9aa0a6)" }}>{label}</span>
    <span style={{ font: `500 13.5px ${F_SANS}`, color: "var(--fg,#111)" }}>{children}</span>
  </div>
);

// Two-click "Mark paid": first click arms (Confirm?), second click posts.
function MarkPaidButton({ r, onMarkPaid }: { r: Row; onMarkPaid: (r: Row) => Promise<void> }) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const label = r.bucket === "setup" ? `Mark ₱${SETUP_FEE} setup paid` : "Mark paid";
  return (
    <span onClick={(e) => e.stopPropagation()} style={{ display: "inline-flex" }}>
      <button
        disabled={busy}
        onClick={async () => {
          if (!armed) { setArmed(true); setTimeout(() => setArmed(false), 3000); return; }
          setBusy(true);
          try { await onMarkPaid(r); } finally { setBusy(false); setArmed(false); }
        }}
        style={{
          font: `700 12px ${F_SANS}`, padding: "6px 12px", borderRadius: 8, cursor: "pointer",
          border: `1px solid ${armed ? "var(--st-active-fg,#1a8a4a)" : "var(--border,#d9d9de)"}`,
          background: armed ? "var(--st-active-fg,#1a8a4a)" : "var(--card,#fff)",
          color: armed ? "#fff" : "var(--fg,#333)", whiteSpace: "nowrap",
        }}
      >
        {busy ? "Saving…" : armed ? "Confirm ✓" : label}
      </button>
    </span>
  );
}

function AccountRow({ r, onMarkPaid }: { r: Row; onMarkPaid: (r: Row) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const chip = CHIP[r.bucket];
  const conn = r.connectionCount != null ? `${r.connectionCount}${r.connectionCount >= 100 ? "+" : ""}` : "";
  const dueLabel = r.overdue && r.nextDueISO ? `${fmtDate(r.nextDueISO)} · ${r.daysLate}d late` : fmtDate(r.nextDueISO);
  const canMark = r.bucket === "setup" || r.bucket === "overdue" || r.bucket === "due";
  // Something's wrong: a payment is being asked for on an account we can't log
  // into (no credentials) or can't run (no GoLogin profile/share).
  const payable = r.bucket === "setup" || r.bucket === "overdue" || r.bucket === "due";
  const missingCreds = payable && (!r.loginEmail || !r.accountPassword);
  const missingGologin = payable && !r.gologinProfileId && !r.gologinShareLink;
  const flagColor = missingCreds ? "var(--st-cancel-fg,#c0392b)" : missingGologin ? "var(--warn-badge-text,#b7791f)" : null;
  return (
    <div style={{ border: flagColor ? `1px solid ${flagColor}` : "1px solid var(--border,#e8e8ea)", borderLeft: flagColor ? `4px solid ${flagColor}` : undefined, borderRadius: 12, background: "var(--card,#fff)", overflow: "hidden" }}>
      <button onClick={() => setOpen((o) => !o)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
        <span style={{ color: "var(--muted,#aaa)", transform: open ? "rotate(90deg)" : "none", transition: "transform .15s", fontSize: 12 }}>▶</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ font: `700 15px ${F_GRO}`, color: "var(--fg,#111)" }}>{r.linkedinName}</span>
            {conn && <span style={{ font: `600 12px ${F_SANS}`, color: "var(--muted,#888)" }}>{conn}</span>}
            {ageLabel(r.accountAgeMonths) && <span style={{ font: `600 12px ${F_SANS}`, color: "var(--muted,#888)" }}>⏳ {ageLabel(r.accountAgeMonths)}</span>}
          </div>
          <div style={{ font: `500 12.5px ${F_SANS}`, color: "var(--muted,#8a9099)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {r.ownerName ? `owner: ${r.ownerName}` : "no owner on file"}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 16px", marginTop: 6, font: `500 12px ${F_SANS}`, color: "var(--muted,#8a9099)" }}>
            <span>Next: <b style={{ color: r.overdue ? "var(--st-cancel-fg,#c0392b)" : "var(--fg,#444)" }}>{r.nextDueISO ? fmtDate(r.nextDueISO) : "—"}{r.overdue && r.daysLate ? ` (${r.daysLate}d late)` : ""}</b></span>
            <span>Last: <b style={{ color: "var(--fg,#444)" }}>{r.lastPaidAt ? fmtDate(r.lastPaidAt) : "none"}</b></span>
            <span>Total: <b style={{ color: "var(--fg,#444)" }}>{peso(r.totalPaid)}</b></span>
            <span>Method: <b style={{ color: r.paymentMethod ? "var(--fg,#444)" : "var(--st-cancel-fg,#c0392b)" }}>{r.paymentMethod || "not set"}</b></span>
          </div>
        </div>
        {r.bucket === "setup"
          ? <span style={{ font: `600 13px ${F_SANS}`, color: "var(--fg,#333)" }}>{peso(r.setupAmount)} one-time</span>
          : r.monthlyAmount > 0 && <span style={{ font: `600 13px ${F_SANS}`, color: "var(--fg,#333)" }}>{peso(r.monthlyAmount)}/mo</span>}
        {missingCreds && <span title="No login email/password stored — cannot access this account" style={{ font: `800 11px ${F_SANS}`, padding: "4px 10px", borderRadius: 999, background: "var(--st-cancel-fg,#c0392b)", color: "#fff", whiteSpace: "nowrap" }}>⚠ QUERY · no login</span>}
        {!missingCreds && missingGologin && <span title="No GoLogin profile or share link — cannot run this account" style={{ font: `800 11px ${F_SANS}`, padding: "4px 10px", borderRadius: 999, background: "var(--warn-badge-text,#b7791f)", color: "#fff", whiteSpace: "nowrap" }}>⚠ QUERY · no GoLogin</span>}
        {canMark && <MarkPaidButton r={r} onMarkPaid={onMarkPaid} />}
        <span style={{ font: `700 11px ${F_SANS}`, padding: "4px 10px", borderRadius: 999, background: chip.bg, color: chip.fg, whiteSpace: "nowrap" }}>{r.reason}</span>
      </button>
      {open && (
        <div style={{ borderTop: "1px solid var(--border,#eee)", padding: "16px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 16, background: "var(--panel,#fafafa)" }}>
          {/* Payout (money OUT to ambassador) */}
          <D label="Owner (ambassador)">{r.ownerName || "—"}</D>
          <D label="Payment method">{r.paymentMethod || <span style={{ color: "var(--st-cancel-fg,#c0392b)" }}>not set</span>}{r.paymentDetail ? ` · ${r.paymentDetail}` : ""}</D>
          <D label="Monthly payout">{r.monthlyAmount > 0 ? peso(r.monthlyAmount) : "—"}</D>
          <D label="Last payment">{r.lastPaidAt ? `${r.lastPaidAmount != null ? peso(r.lastPaidAmount) + " · " : ""}${fmtDate(r.lastPaidAt)}` : "none yet"}</D>
          <D label="Next payment due">{r.nextDueISO ? <span style={{ color: r.overdue ? "var(--st-cancel-fg,#c0392b)" : "var(--fg,#111)" }}>{dueLabel}</span> : "—"}</D>
          <D label="Total paid (to owner)">{peso(r.totalPaid)}</D>
          {/* Ambassador contact details (personal — not the account login) */}
          <D label="Contact email">{r.ownerEmail || <span style={{ color: "var(--st-cancel-fg,#c0392b)" }}>not set</span>}</D>
          <D label="Contact number">{r.ownerPhone ? `${r.ownerPhone}${r.contactChannel ? ` · ${r.contactChannel}` : ""}` : <span style={{ color: "var(--st-cancel-fg,#c0392b)" }}>not set</span>}</D>
          {/* Credentials (admin only) */}
          <D label="Login email">{r.loginEmail || "—"}</D>
          <D label="Password"><PasswordField password={r.accountPassword} /></D>
          <D label="2FA (key + code)"><TwoFactor accountId={r.id} /></D>
          <D label="GoLogin">{r.gologinProfileId ? `profile ${r.gologinProfileId.slice(0, 8)}…` : r.gologinShareLink ? <a href={r.gologinShareLink} target="_blank" rel="noreferrer" style={{ color: "var(--link,#0a66c2)" }}>share link ↗</a> : <span style={{ color: "var(--st-cancel-fg,#c0392b)" }}>none</span>}</D>
          <D label="LinkedIn">{r.linkedinUrl ? <a href={r.linkedinUrl} target="_blank" rel="noreferrer" style={{ color: "var(--link,#0a66c2)" }}>profile ↗</a> : "—"}</D>
        </div>
      )}
    </div>
  );
}

interface OwnerGroup { key: string; ownerName: string | null; method: string | null; rows: Row[]; combined: number; earliestDue: number }

const dueMs = (iso: string | null) => (iso ? new Date(iso).getTime() : Infinity);

// Group a section's rows by owner so all of one person's accounts sit together
// and can be paid in a single transfer. Accounts with no owner each stand alone.
// `byDue` orders groups (and rows within a group) by soonest next-due first — so
// the most-overdue / soonest-due accounts float to the top.
function groupByOwner(rows: Row[], byDue: boolean): OwnerGroup[] {
  const map = new Map<string, OwnerGroup>();
  for (const r of rows) {
    const key = r.ownerEmail || `solo:${r.id}`;
    if (!map.has(key)) map.set(key, { key, ownerName: r.ownerName, method: r.paymentMethod, rows: [], combined: 0, earliestDue: Infinity });
    const g = map.get(key)!;
    g.rows.push(r);
    g.combined += r.monthlyAmount;
    g.earliestDue = Math.min(g.earliestDue, dueMs(r.nextDueISO));
  }
  const groups = [...map.values()];
  for (const g of groups) g.rows.sort((a, b) => dueMs(a.nextDueISO) - dueMs(b.nextDueISO));
  if (byDue) groups.sort((a, b) => a.earliestDue - b.earliestDue);        // soonest due / most overdue first
  else groups.sort((a, b) => b.rows.length - a.rows.length || b.combined - a.combined); // multi-account owners first
  return groups;
}

// Order for the "not applicable" reason sub-groups.
const REASON_ORDER = ["Restricted", "Inaccessible", "Company-owned · no ambassador", "No monthly rate set"];
function groupByReason(rows: Row[]): { reason: string; rows: Row[] }[] {
  const map = new Map<string, Row[]>();
  for (const r of rows) { if (!map.has(r.reason)) map.set(r.reason, []); map.get(r.reason)!.push(r); }
  const groups = [...map.entries()].map(([reason, rs]) => ({ reason, rows: rs.sort((a, b) => (a.ownerName || "").localeCompare(b.ownerName || "")) }));
  const pri = (x: string) => { const i = REASON_ORDER.indexOf(x); return i === -1 ? 999 : i; };
  groups.sort((a, b) => pri(a.reason) - pri(b.reason) || b.rows.length - a.rows.length || a.reason.localeCompare(b.reason));
  return groups;
}

function Section({ title, tone, note, rows, byDue, setup, byReason, onMarkPaid }: { title: string; tone: string; note: string; rows: Row[]; byDue?: boolean; setup?: boolean; byReason?: boolean; onMarkPaid: (r: Row) => Promise<void> }) {
  // Setup fee is one-time per ambassador → count it once per owner group, not per account.
  const groups = groupByOwner(rows, !!byDue);
  const reasonGroups = byReason ? groupByReason(rows) : [];
  const total = setup
    ? groups.length * SETUP_FEE
    : rows.reduce((s, r) => s + (r.bucket === "na" ? 0 : r.monthlyAmount), 0);
  return (
    <section style={{ marginTop: 30 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: tone }} />
        <h2 style={{ font: `700 17px ${F_GRO}`, margin: 0, color: "var(--fg,#111)" }}>{title}</h2>
        <span style={{ font: `700 13px ${F_SANS}`, color: "var(--muted,#888)" }}>{rows.length}</span>
        {total > 0 && <span style={{ font: `700 13px ${F_SANS}`, color: tone }}>{peso(total)}{setup ? "" : "/mo"}</span>}
        <span style={{ font: `500 12.5px ${F_SANS}`, color: "var(--muted,#9aa0a6)" }}>{note}</span>
      </div>
      {rows.length === 0 ? (
        <p style={{ font: `500 13px ${F_SANS}`, color: "var(--muted,#999)", margin: "8px 0 0" }}>None.</p>
      ) : byReason ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 12 }}>
          {reasonGroups.map((g) => (
            <div key={g.reason}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ font: `700 13px ${F_SANS}`, color: "var(--fg,#444)" }}>{g.reason}</span>
                <span style={{ font: `700 11px ${F_SANS}`, padding: "1px 8px", borderRadius: 999, background: "var(--warn-badge-bg,#f1f1f2)", color: "var(--warn-badge-text,#6b7280)" }}>{g.rows.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {g.rows.map((r) => <AccountRow key={r.id} r={r} onMarkPaid={onMarkPaid} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 12 }}>
          {groups.map((g) => {
            const multi = g.rows.length > 1;
            return (
              <div key={g.key} style={multi ? { border: `1px solid var(--border,#e3e3e6)`, borderRadius: 14, padding: "10px 10px 12px", background: "var(--panel,#f7f7f8)" } : undefined}>
                {multi && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "2px 6px 10px" }}>
                    <span style={{ font: `700 14px ${F_GRO}`, color: "var(--fg,#111)" }}>{g.ownerName || "No ambassador"}</span>
                    <span style={{ font: `700 12px ${F_SANS}`, padding: "2px 9px", borderRadius: 999, background: "var(--blue-chip-bg,#eaf1ff)", color: "var(--blue-chip-text,#2b5fd0)" }}>{g.rows.length} accounts</span>
                    {setup
                      ? <span style={{ font: `700 13px ${F_SANS}`, color: tone }}>pay once · {peso(SETUP_FEE)}</span>
                      : g.combined > 0 && <span style={{ font: `700 13px ${F_SANS}`, color: tone }}>pay all · {peso(g.combined)}/mo</span>}
                    {g.method && <span style={{ font: `500 12px ${F_SANS}`, color: "var(--muted,#8a9099)" }}>via {g.method}</span>}
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {g.rows.map((r) => <AccountRow key={r.id} r={r} onMarkPaid={onMarkPaid} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function PayoutsIIPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [onboarding, setOnboarding] = useState<{ count: number; names: string[] }>({ count: 0, names: [] });
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");

  const load = async () => {
    try {
      const res = await fetch("/api/admin/payouts-ii");
      if (!res.ok) { setError(true); return; }
      const d = await res.json();
      setRows(d.rows || []);
      setOnboarding(d.onboarding || { count: 0, names: [] });
    } catch { setError(true); }
  };
  useEffect(() => { load(); }, []);

  const onMarkPaid = async (r: Row) => {
    const res = await fetch("/api/admin/payouts-ii/mark", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId: r.id, kind: r.bucket === "setup" ? "setup" : "monthly" }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(`Could not record payment: ${d.error || res.status}`);
      return;
    }
    await load(); // refresh so the row moves to Paid and last-paid / total / next-due update
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows || [];
    return (rows || []).filter((r) =>
      [r.linkedinName, r.ownerName, r.ownerEmail, r.loginEmail, r.ownerPhone].some((v) => (v || "").toLowerCase().includes(q))
    );
  }, [rows, query]);
  const hasCreds = (r: Row) => !!r.loginEmail && !!r.accountPassword;
  const hasGologin = (r: Row) => !!r.gologinProfileId || !!r.gologinShareLink;
  const setupAll = useMemo(() => filtered.filter((r) => r.bucket === "setup"), [filtered]);
  const setupNoCreds = useMemo(() => setupAll.filter((r) => !hasCreds(r)), [setupAll]);
  const setupNoGologin = useMemo(() => setupAll.filter((r) => hasCreds(r) && !hasGologin(r)), [setupAll]);
  const setup = useMemo(() => setupAll.filter((r) => hasCreds(r) && hasGologin(r)), [setupAll]);
  const overdue = useMemo(() => filtered.filter((r) => r.bucket === "overdue"), [filtered]);
  const due = useMemo(() => filtered.filter((r) => r.bucket === "due"), [filtered]);
  const paid = useMemo(() => filtered.filter((r) => r.bucket === "paid"), [filtered]);
  const na = useMemo(() => filtered.filter((r) => r.bucket === "na"), [filtered]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "8px 4px 60px" }}>
      <h1 style={{ font: `800 28px ${F_GRO}`, margin: "0 0 6px", color: "var(--fg,#111)" }}>Payouts II</h1>
      <p style={{ font: `500 14px ${F_SANS}`, color: "var(--muted,#777)", margin: "0 0 4px", maxWidth: 680 }}>
        What we pay <strong>out</strong> to each account&apos;s ambassador — paid every month whether or not
        the account is rented. (Renter payments coming <em>in</em> are separate; they live on Inventory.)
        Click any row for last paid, next due, method, total paid, and the login credentials.
      </p>
      {onboarding.count > 0 && (
        <p style={{ font: `500 13px ${F_SANS}`, color: "var(--muted,#777)", margin: "10px 0 0" }}>
          {onboarding.count} account{onboarding.count === 1 ? " is" : "s are"} still being onboarded, so nothing is owed yet
          — {onboarding.names.join(", ")}. They live on <a href="/admin/onboarding" style={{ color: "var(--link,#0a66c2)" }}>Onboarding</a>.
        </p>
      )}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search account name, owner, email or number…"
        style={{ width: "100%", boxSizing: "border-box", marginTop: 14, padding: "11px 14px", borderRadius: 10, border: "1px solid var(--border,#dcdce0)", background: "var(--card,#fff)", color: "var(--fg,#111)", font: `500 14px ${F_SANS}`, outline: "none" }}
      />
      {query && rows && <p style={{ font: `500 12.5px ${F_SANS}`, color: "var(--muted,#888)", margin: "8px 2px 0" }}>{filtered.length} of {rows.length} accounts match “{query}”.</p>}

      {error && <p style={{ color: "var(--st-cancel-fg,#b00)", font: `600 14px ${F_SANS}` }}>Failed to load.</p>}
      {!rows && !error && <p style={{ font: `500 14px ${F_SANS}`, color: "var(--muted,#888)" }}>Loading…</p>}
      {rows && (
        <>
          {setupNoCreds.length > 0 && (
            <Section title="⚠ Initial payment due — NO CREDENTIALS (check)" tone="var(--st-cancel-fg,#c0392b)" note="setup fee showing due but no login stored — verify before paying" rows={setupNoCreds} byDue setup onMarkPaid={onMarkPaid} />
          )}
          {setupNoGologin.length > 0 && (
            <Section title="⚠ Initial payment due — NO GOLOGIN (check)" tone="var(--warn-badge-text,#b7791f)" note="has login but no GoLogin profile/share — account can't be run, verify before paying" rows={setupNoGologin} byDue setup onMarkPaid={onMarkPaid} />
          )}
          <Section title="Initial payment due" tone="var(--blue-chip-text,#2b5fd0)" note="one-time ₱1,000 setup fee · soonest due first" rows={setup} byDue setup onMarkPaid={onMarkPaid} />
          <Section title="Payment overdue" tone="var(--st-cancel-fg,#c0392b)" note="monthly due / on hold · most overdue first" rows={overdue} byDue onMarkPaid={onMarkPaid} />
          <Section title="Payment due" tone="var(--warn-badge-text,#b7791f)" note="monthly coming up · soonest due first" rows={due} byDue onMarkPaid={onMarkPaid} />
          <Section title="Paid this cycle" tone="var(--st-active-fg,#1a8a4a)" note="already settled this month" rows={paid} onMarkPaid={onMarkPaid} />
          <Section title="Payment not applicable" tone="#9aa0a6" note="grouped by reason" rows={na} byReason onMarkPaid={onMarkPaid} />
        </>
      )}
    </div>
  );
}
