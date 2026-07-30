"use client";

import { useCallback, useEffect, useState } from "react";

const F_SANS = "var(--font-sans),system-ui,sans-serif";
const F_GRO = "var(--font-grotesk),system-ui,sans-serif";

// Ambassador payouts are in PHP. Setup fee is a one-time ₱1,000; recurring is ₱500/mo.
const peso = (n: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(n);
const SETUP_FEE = 1000;
const fmtDate = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;

// Roll a date forward to the next business day (Mon–Fri) if it lands on a weekend, so a
// payment is never scheduled for a Saturday or Sunday. Mirrors lib/payment-schedule.
const nextBusinessDay = (d: Date): Date => {
  const r = new Date(d);
  const day = r.getDay(); // 0 = Sun, 6 = Sat
  if (day === 6) r.setDate(r.getDate() + 2);
  else if (day === 0) r.setDate(r.getDate() + 1);
  return r;
};

// Setup fee is due N days after onboarding: 3 for an established account, 1 week for a
// fresh one — rolled to the next business day so it always lands on a weekday.
const setupDueDate = (onboardedAt: string | null, freshness: string | null): Date | null => {
  if (!onboardedAt) return null;
  const d = new Date(onboardedAt);
  d.setDate(d.getDate() + (freshness === "fresh" ? 7 : 3));
  return nextBusinessDay(d);
};

// Monthly ₱500 is paid on the 1st, after one full month of service. The first payment is
// the 1st on/after the one-month anniversary; each later payment (idx, 0-based) +1 month.
const monthlyDueDate = (onboardedAt: string | null, idx: number): Date | null => {
  if (!onboardedAt) return null;
  const o = new Date(onboardedAt);
  const anchor = new Date(o.getFullYear(), o.getMonth() + 1, o.getDate());
  const firstMonth = anchor.getDate() === 1 ? anchor.getMonth() : anchor.getMonth() + 1;
  return new Date(anchor.getFullYear(), firstMonth + idx, 1);
};

const isOverdue = (d: Date | null) => !!d && d.getTime() < Date.now();

// Relative "when" for the payments-due rows: overdue / today / in N days, with a tone
// that drives the pill colour (red overdue, amber if imminent, neutral further out).
const DAY_MS = 86400000;
const relWhen = (iso: string): { label: string; tone: "over" | "soon" | "later" } => {
  const d = new Date(iso); d.setHours(0, 0, 0, 0);
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  const n = Math.round((d.getTime() - t0.getTime()) / DAY_MS);
  if (n < 0) return { label: "overdue", tone: "over" };
  if (n === 0) return { label: "today", tone: "soon" };
  if (n === 1) return { label: "in 1 day", tone: "soon" };
  return { label: `in ${n} days`, tone: n <= 2 ? "soon" : "later" };
};
const WHEN_TONE: Record<"over" | "soon" | "later", { bg: string; fg: string }> = {
  over: { bg: "var(--st-cancel-bg)", fg: "var(--st-cancel-fg)" },
  soon: { bg: "var(--warn-badge-bg)", fg: "var(--warn-badge-text)" },
  later: { bg: "var(--neutral-chip-bg)", fg: "var(--neutral-chip-text)" },
};

// Owner relationship status, derived from the application's pipeline status. The four
// buckets mirror the design's Active / Onboarding / Paused / Lost.
type OwnerStatus = "active" | "onboarding" | "paused" | "lost";
// Fallback when no status has been set manually — inferred from the pipeline status.
const deriveStatus = (s: string | null): OwnerStatus => {
  if (s === "onboarded") return "active";
  if (s === "on_hold") return "paused";
  if (s === "rejected" || s === "unreachable") return "lost";
  return "onboarding";
};
const STATUS_META: Record<OwnerStatus, { label: string; bg: string; fg: string }> = {
  active: { label: "Active", bg: "var(--st-active-bg)", fg: "var(--st-active-fg)" },
  onboarding: { label: "Onboarding", bg: "var(--blue-chip-bg)", fg: "var(--blue-chip-text)" },
  paused: { label: "Paused", bg: "var(--warn-badge-bg)", fg: "var(--warn-badge-text)" },
  lost: { label: "Lost", bg: "var(--st-cancel-bg)", fg: "var(--st-cancel-fg)" },
};
const STATUS_OPTIONS: OwnerStatus[] = ["active", "onboarding", "paused", "lost"];
const CHANNEL_OPTIONS = ["", "WhatsApp", "Telegram", "Messenger", "Email", "Viber", "SMS"];
const toDateInput = (d: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : "");

const ACCOUNT_ST: Record<string, { bg: string; fg: string }> = {
  available: { bg: "var(--st-active-bg)", fg: "var(--st-active-fg)" },
  rented: { bg: "var(--blue-chip-bg)", fg: "var(--blue-chip-text)" },
  unavailable: { bg: "var(--st-cancel-bg)", fg: "var(--st-cancel-fg)" },
  maintenance: { bg: "var(--warn-badge-bg)", fg: "var(--warn-badge-text)" },
};
const acctStyle = (s: string) => ACCOUNT_ST[s] || { bg: "var(--neutral-chip-bg)", fg: "var(--neutral-chip-text)" };

// Required fields for a complete owner record — payout destination, a way to reach them,
// and the login credentials we hold per profile. Returns the human labels still empty.
const missingFields = (o: Owner): string[] => {
  const m: string[] = [];
  if (!o.paymentMethod) m.push("Payout method");
  if (!o.paymentDetails) m.push("Payout details");
  if (!o.payoutName) m.push("Registered name");
  if (!o.contactNumber) m.push("Best contact");
  o.accounts.forEach((a) => {
    const who = o.accounts.length > 1 ? `${a.linkedinName}: ` : "";
    if (!a.linkedinUrl) m.push(`${who}LinkedIn URL`);
    if (!a.loginEmail) m.push(`${who}Account email`);
    if (!a.accountPassword) m.push(`${who}Password`);
    if (!a.twoFactor) m.push(`${who}2FA`);
  });
  return m;
};

interface OwnerAccount {
  id: string;
  linkedinName: string;
  status: string;
  linkedinUrl: string | null;
  monthlyPrice: string | number;
  ambassadorPayment: string | number;
  loginEmail: string | null;
  accountPassword: string | null;
  twoFactor: string | null;
  workEmail: string | null;
}

interface MonthlyPayout {
  paidAt: string;
  amount: number;
  note?: string | null;
  by?: string | null;
  kind?: "setup" | "monthly" | null;
  method?: string | null;
  proofUrl?: string | null;
  notified?: boolean | null;
  notifiedAt?: string | null;
  acknowledged?: boolean | null;
  acknowledgedAt?: string | null;
}

interface DueItem {
  kind: "setup" | "monthly";
  name: string;
  email: string;
  method: string | null;
  details: string | null;
  amount: number;
  dueDate: string;
  overdue: boolean;
  blocked: string | null;
}
interface MarketerDue { name: string; count: number; amount: number; }
interface PaymentsDue {
  setup: DueItem[];
  monthly: DueItem[];
  upcoming: DueItem[];
  marketers: MarketerDue[];
  totalDueNow: number;
  horizonDays: number;
}

interface Owner {
  email: string;
  fullName: string;
  contactNumber: string | null;
  joinedAt: string | null;
  accountCount: number;
  monthlyPayout: number;
  applicationId: string | null;
  applicationStatus: string | null;
  ownerStatus: string | null;
  contactChannel: string | null;
  accountIssue: string | null;
  paymentMethod: string | null;
  paymentDetails: string | null;
  payoutName: string | null;
  setupFeePaidAt: string | null;
  monthlyPayouts: MonthlyPayout[];
  onboardedAt: string | null;
  verifiedAt: string | null;
  accountFreshness: string | null;
  accounts: OwnerAccount[];
}

// Manually-set owner status wins; otherwise fall back to the pipeline-derived one.
const resolveStatus = (o: Owner): OwnerStatus =>
  o.ownerStatus && o.ownerStatus in STATUS_META ? (o.ownerStatus as OwnerStatus) : deriveStatus(o.applicationStatus);

const labelCss: React.CSSProperties = { font: `600 10px ${F_SANS}`, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--label)" };
const inputCss: React.CSSProperties = { width: "100%", minWidth: 0, background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: 9, padding: "9px 11px", font: `500 13px ${F_SANS}`, color: "var(--input-fg)", outline: "none" };
const darkBtn: React.CSSProperties = { font: `600 12.5px ${F_SANS}`, color: "#fff", background: "var(--sheets-btn-bg)", border: "none", padding: "9px 15px", borderRadius: 9, cursor: "pointer", whiteSpace: "nowrap" };
// Pay buttons are locked until the account is confirmed Active — no paying a paused/lost owner.
const disabledBtn: React.CSSProperties = { font: `600 12.5px ${F_SANS}`, color: "var(--muted2)", background: "transparent", border: "1px solid var(--divider)", padding: "9px 15px", borderRadius: 9, cursor: "not-allowed", whiteSpace: "nowrap", opacity: 0.7 };
const activeOkStyle: React.CSSProperties = { font: `600 11.5px ${F_SANS}`, padding: "6px 12px", borderRadius: 999, background: "var(--st-active-bg)", color: "var(--st-active-fg)", whiteSpace: "nowrap" };
const confirmActiveStyle: React.CSSProperties = { font: `600 11.5px ${F_SANS}`, padding: "6px 12px", borderRadius: 999, background: "var(--warn-badge-bg)", color: "var(--warn-badge-text)", border: "none", cursor: "pointer", whiteSpace: "nowrap" };
const issueStyle: React.CSSProperties = { font: `600 11.5px ${F_SANS}`, padding: "6px 12px", borderRadius: 999, background: "var(--st-cancel-bg)", color: "var(--st-cancel-fg)", border: "none", cursor: "pointer", whiteSpace: "nowrap" };
const flagBtnStyle: React.CSSProperties = { font: `600 11px ${F_SANS}`, padding: "5px 9px", borderRadius: 8, background: "transparent", color: "var(--muted)", border: "1px solid var(--divider)", cursor: "pointer", whiteSpace: "nowrap" };

// Uncontrolled save-on-blur field. Module scope so it never remounts mid-edit.
function Editable({
  initial, onSave, placeholder, type = "text", mono = false,
}: {
  initial: string | null;
  onSave: (v: string | null) => void;
  placeholder?: string;
  type?: "text" | "password";
  mono?: boolean;
}) {
  return (
    <input
      type={type}
      defaultValue={initial ?? ""}
      placeholder={placeholder}
      onBlur={(e) => { const v = e.target.value.trim(); if (v !== (initial ?? "")) onSave(v || null); }}
      style={{ ...inputCss, fontFamily: mono ? "ui-monospace,SFMono-Regular,Menlo,monospace" : undefined }}
    />
  );
}

function CopyBtn({ value }: { value: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <button type="button"
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
      style={{ flex: "none", font: `600 12px ${F_SANS}`, color: "var(--muted)", background: "transparent", border: "none", cursor: "pointer", padding: "0 4px" }}
      title="Copy">{copied ? "✓" : "Copy"}</button>
  );
}

// One line of the audit pill pair (Notified / Acknowledged), clickable to toggle.
function TogglePill({ on, onLabel, offLabel, onBg, onFg, onClick }: {
  on: boolean; onLabel: string; offLabel: string; onBg: string; onFg: string; onClick?: () => void;
}) {
  const bg = on ? onBg : "var(--neutral-chip-bg)";
  const fg = on ? onFg : "var(--neutral-chip-text)";
  return (
    <button type="button" onClick={onClick} disabled={!onClick}
      style={{ font: `600 11px ${F_SANS}`, padding: "5px 10px", borderRadius: 8, background: bg, color: fg, border: "none", cursor: onClick ? "pointer" : "default", whiteSpace: "nowrap", textAlign: "center" }}>
      {on ? onLabel : offLabel}
    </button>
  );
}

const PAY_GRID = "104px 1fr 128px 132px 140px 26px";

export default function AdminOwnersPage() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  // "Ok to pay" is a check-right-before-you-pay confirmation, independent per row
  // (setup vs monthly). Session-only — you re-verify the account before each payout.
  const [okToPay, setOkToPay] = useState<Set<string>>(new Set());
  const [due, setDue] = useState<PaymentsDue | null>(null);
  const [emailState, setEmailState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [sheetCopied, setSheetCopied] = useState(false);

  const load = useCallback(() => {
    fetch("/api/admin/payments-due").then((r) => r.json()).then((d) => setDue(d)).catch(() => {});
    return fetch("/api/admin/owners")
      .then((r) => r.json())
      .then((data) => setOwners(data.owners || []))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch("/api/admin/owners/export-url").then((r) => r.json())
      .then((d) => { if (d.configured) setSheetUrl(d.url); }).catch(() => {});
  }, []);

  const copySheetFormula = () => {
    if (!sheetUrl) return;
    navigator.clipboard.writeText(`=IMPORTDATA("${sheetUrl}")`);
    setSheetCopied(true);
    setTimeout(() => setSheetCopied(false), 2000);
  };

  const emailMilee = async () => {
    setEmailState("sending");
    try { const r = await fetch("/api/admin/payments-due", { method: "POST" }); setEmailState(r.ok ? "sent" : "error"); }
    catch { setEmailState("error"); }
    setTimeout(() => setEmailState("idle"), 3500);
  };

  const toggle = (email: string) => setExpanded((p) => { const n = new Set(p); if (n.has(email)) n.delete(email); else n.add(email); return n; });
  const toggleReveal = (key: string) => setRevealed((p) => { const n = new Set(p); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  const toggleOkToPay = (key: string) => setOkToPay((p) => { const n = new Set(p); if (n.has(key)) n.delete(key); else n.add(key); return n; });

  const patchAccount = async (accountId: string, data: Record<string, unknown>) => {
    await fetch(`/api/admin/accounts/${accountId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    load();
  };
  const patchOwner = async (applicationId: string | null, data: Record<string, unknown>) => {
    if (!applicationId) { alert("No application record linked to this owner — can't save."); return; }
    await fetch(`/api/admin/ambassadors/${applicationId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    load();
  };

  const q = query.trim().toLowerCase();
  const shown = owners.filter((o) => !q || `${o.fullName} ${o.email} ${o.payoutName || ""} ${o.paymentMethod || ""} ${o.accounts.map((a) => a.linkedinName).join(" ")} ${resolveStatus(o)}`.toLowerCase().includes(q));
  const totalMonthly = owners.reduce((s, o) => s + o.monthlyPayout, 0);
  const allOpen = shown.length > 0 && shown.every((o) => expanded.has(o.email));
  const toggleAll = () => setExpanded(allOpen ? new Set() : new Set(shown.map((o) => o.email)));

  return (
    <div>
      {/* title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ maxWidth: 720 }}>
          <h1 style={{ font: `600 30px/1 ${F_GRO}`, color: "var(--text)", margin: "0 0 8px", letterSpacing: "-.02em" }}>Account owners</h1>
          <p style={{ font: `500 13.5px/1.5 ${F_SANS}`, color: "var(--muted)", margin: 0 }}>
            Onboarded ambassadors who supply profiles. Expand an owner for their status, credentials, payout method, and the full payment record — proof of each payout and whether they&apos;ve acknowledged it.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flex: "none" }}>
          {sheetUrl && (
            <button type="button" onClick={copySheetFormula}
              title="Paste into cell A1 of a blank Google Sheet to mirror this view live (auto-syncs, no manual export)"
              style={{ ...darkBtn, display: "inline-flex", alignItems: "center", gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
              {sheetCopied ? "Copied ✓" : "Copy Sheets link"}
            </button>
          )}
          <div style={{ textAlign: "right" }}>
            <div style={{ font: `600 13px ${F_SANS}`, color: "var(--muted)" }}>{owners.length} owner{owners.length !== 1 ? "s" : ""}</div>
            {totalMonthly > 0 && <div style={{ font: `600 13px ${F_SANS}`, color: "var(--muted2)", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{peso(totalMonthly)}/mo total</div>}
          </div>
        </div>
      </div>

      {/* payments due */}
      {due && (() => {
        // Every dated payout — due now AND coming up within the horizon — as a row,
        // sorted soonest-first, each with a relative "in N days" pill.
        const rows = [...due.setup, ...due.monthly, ...due.upcoming].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
        const overdueCount = rows.filter((r) => r.overdue).length;
        const blockedCount = rows.filter((r) => r.blocked).length;
        const dueNowCount = due.setup.length + due.monthly.length + due.marketers.length;
        const upcomingCount = due.upcoming.length;
        const nothing = rows.length === 0 && due.marketers.length === 0;
        // Subtitle mirrors the design: call out overdue/ due-now money, else the upcoming count.
        let subtitle: React.ReactNode;
        if (nothing) subtitle = "Nothing due right now.";
        else if (dueNowCount === 0 && upcomingCount > 0) {
          const kinds = new Set(due.upcoming.map((u) => u.kind));
          const noun = kinds.size === 1 ? (kinds.has("setup") ? "setup fee" : "monthly payout") : "payment";
          subtitle = `Nothing overdue — ${upcomingCount} ${noun}${upcomingCount !== 1 ? "s" : ""} coming up this week.`;
        } else {
          subtitle = <><strong style={{ color: "var(--text)" }}>{peso(due.totalDueNow)}</strong> due now across {dueNowCount} payout{dueNowCount !== 1 ? "s" : ""}{overdueCount > 0 ? ` · ${overdueCount} overdue` : ""}{blockedCount > 0 ? ` · ${blockedCount} blocked (can't log in)` : ""}{upcomingCount > 0 ? `, ${upcomingCount} coming up` : ""}.</>;
        }
        return (
          <div style={{ background: "var(--warn-bg)", border: "1px solid var(--warn-border)", borderRadius: 16, padding: "18px 22px", marginBottom: 22 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: nothing ? 0 : 14 }}>
              <div>
                <div style={{ font: `600 15px ${F_GRO}`, color: "var(--text)", marginBottom: 3 }}>Payments due</div>
                <div style={{ font: `500 13px ${F_SANS}`, color: "var(--muted)" }}>{subtitle}</div>
              </div>
              <button type="button" onClick={emailMilee} disabled={emailState === "sending"} style={{ ...darkBtn, flex: "none", opacity: emailState === "sending" ? 0.6 : 1 }}>
                {emailState === "sending" ? "Sending…" : emailState === "sent" ? "✓ Sent to Milee" : emailState === "error" ? "Failed — retry" : "✉ Email Milee"}
              </button>
            </div>
            {!nothing && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {rows.map((i, idx) => {
                  const w = relWhen(i.dueDate);
                  return (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: 14, background: "var(--card)", border: "1px solid var(--divider)", borderRadius: 11, padding: "11px 14px", opacity: i.blocked ? 0.75 : 1 }}>
                      <span style={{ font: `700 11px ${F_SANS}`, padding: "5px 11px", borderRadius: 999, whiteSpace: "nowrap", flex: "none", textAlign: "center", minWidth: 74, background: WHEN_TONE[w.tone].bg, color: WHEN_TONE[w.tone].fg }}>{w.label}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ font: `600 13.5px ${F_SANS}`, color: "var(--text)" }}>{i.name}</div>
                        <div style={{ font: `500 12px ${F_SANS}`, color: "var(--muted)" }}>{i.kind === "setup" ? "Setup fee" : "Monthly"} · {fmtDate(i.dueDate)}</div>
                      </div>
                      {i.blocked && <span title={`Can't log in: ${i.blocked}`} style={{ font: `600 10.5px ${F_SANS}`, padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap", flex: "none", background: "var(--st-cancel-bg)", color: "var(--st-cancel-fg)" }}>⚠ can&apos;t pay · {i.blocked}</span>}
                      <span style={{ font: `700 15px ${F_GRO}`, color: i.blocked ? "var(--muted2)" : "var(--text)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", textDecoration: i.blocked ? "line-through" : "none" }}>{peso(i.amount)}</span>
                    </div>
                  );
                })}
                {due.marketers.map((m, idx) => (
                  <div key={`mk-${idx}`} style={{ display: "flex", alignItems: "center", gap: 14, background: "var(--card)", border: "1px solid var(--divider)", borderRadius: 11, padding: "11px 14px" }}>
                    <span style={{ font: `700 11px ${F_SANS}`, padding: "5px 11px", borderRadius: 999, whiteSpace: "nowrap", flex: "none", textAlign: "center", minWidth: 74, background: "var(--st-active-bg)", color: "var(--st-active-fg)" }}>ready</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ font: `600 13.5px ${F_SANS}`, color: "var(--text)" }}>{m.name}</div>
                      <div style={{ font: `500 12px ${F_SANS}`, color: "var(--muted)" }}>Marketer · {m.count} signup{m.count !== 1 ? "s" : ""}</div>
                    </div>
                    <span style={{ font: `700 15px ${F_GRO}`, color: "var(--text)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{peso(m.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* search + expand all */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search owner, email, payout method or profile…" style={{ ...inputCss, flex: 1, minWidth: 220, padding: "10px 13px" }} />
        <button type="button" onClick={toggleAll} style={{ font: `600 12.5px ${F_SANS}`, color: "var(--btn-secondary-fg)", background: "var(--btn-secondary-bg)", border: "1px solid var(--btn-secondary-border)", padding: "10px 15px", borderRadius: 9, cursor: "pointer", whiteSpace: "nowrap" }}>
          {allOpen ? "Collapse all" : "Expand all"}
        </button>
      </div>

      {/* cards */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{[1, 2, 3].map((i) => <div key={i} style={{ height: 74, borderRadius: 16, background: "var(--card)", border: "1px solid var(--card-border)" }} />)}</div>
      ) : shown.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 16, font: `500 13.5px ${F_SANS}`, color: "var(--muted)" }}>
          {owners.length === 0 ? "No onboarded account owners yet." : "No owners match your search."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {shown.map((owner) => {
            const open = expanded.has(owner.email);
            const st = STATUS_META[resolveStatus(owner)];
            const missing = missingFields(owner);
            const setupPaid = fmtDate(owner.setupFeePaidAt);
            const monthlyOnly = owner.monthlyPayouts.filter((p) => p.kind !== "setup");
            const monthlyCount = monthlyOnly.length;
            const setupDue = setupDueDate(owner.onboardedAt, owner.accountFreshness);
            const nextMonthlyDue = monthlyDueDate(owner.onboardedAt, monthlyCount);
            const monthlyAmt = owner.monthlyPayout || 500;
            const hasSetupRecord = owner.monthlyPayouts.some((p) => p.kind === "setup");
            const totalPaid = owner.monthlyPayouts.reduce((s, p) => s + (Number(p.amount) || 0), 0) + (owner.setupFeePaidAt && !hasSetupRecord ? SETUP_FEE : 0);

            // A login problem (persisted) blocks payout on all rows; otherwise each
            // row has its own "ok to pay" confirm that you tick right before paying.
            const issue = owner.accountIssue;
            const flagIssue = () => { const r = prompt("What's wrong with the account? (e.g. restricted, wrong password, other) — this blocks payouts until resolved."); if (r && r.trim()) patchOwner(owner.applicationId, { accountIssue: r.trim() }); };
            const canPay = (row: "setup" | "monthly") => okToPay.has(`${owner.email}:${row}`) && !issue;
            const payNote = (row: "setup" | "monthly") => {
              const key = `${owner.email}:${row}`;
              if (issue) return <button type="button" onClick={() => patchOwner(owner.applicationId, { accountIssue: null })} title="Clear once the account logs in again" style={issueStyle}>⚠ Can&apos;t log in: {issue} · resolve</button>;
              return (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  {okToPay.has(key) ? (
                    <button type="button" onClick={() => toggleOkToPay(key)} title="Checked & ok to pay — click to un-confirm" style={{ ...activeOkStyle, border: "none", cursor: "pointer" }}>● Ok to pay</button>
                  ) : (
                    <button type="button" onClick={() => toggleOkToPay(key)} title="Check the account logs in, then click to confirm it's ok to pay" style={confirmActiveStyle}>○ Confirm ok to pay</button>
                  )}
                  <button type="button" onClick={flagIssue} title="Flag a login problem (restricted / wrong password / etc.) — blocks payout" style={flagBtnStyle}>⚑ Issue</button>
                </span>
              );
            };
            const markSetupPaid = () => patchOwner(owner.applicationId, { paidAt: new Date().toISOString(), ...(hasSetupRecord ? {} : { addMonthlyPayout: { amount: SETUP_FEE, kind: "setup" } }) });
            const attachProof = (index: number) => { const url = prompt("Paste the proof-of-payment link (receipt / screenshot URL):"); if (url && url.trim()) patchOwner(owner.applicationId, { updateMonthlyPayout: { index, proofUrl: url.trim() } }); };

            return (
              <div key={owner.email} style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 16, overflow: "hidden", boxShadow: "var(--card-shadow)" }}>
                {/* header */}
                <div onClick={() => toggle(owner.email)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "18px 22px", cursor: "pointer", userSelect: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 13, minWidth: 0 }}>
                    <span style={{ font: `600 12px ${F_SANS}`, color: "var(--muted)", width: 12, textAlign: "center", transform: open ? "rotate(90deg)" : "none", transition: "transform .18s ease" }}>▸</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 11, flexWrap: "wrap", marginBottom: 3 }}>
                        <span style={{ font: `600 19px ${F_GRO}`, color: "var(--text)", letterSpacing: "-.01em" }}>{owner.fullName}</span>
                        <span style={{ font: `700 11px ${F_SANS}`, padding: "4px 11px", borderRadius: 999, whiteSpace: "nowrap", background: st.bg, color: st.fg }}>{st.label}</span>
                        <span style={{ font: `700 11px ${F_SANS}`, padding: "4px 10px", borderRadius: 999, whiteSpace: "nowrap", background: "var(--st-active-bg)", color: "var(--st-active-fg)" }}>Has account · {owner.accountCount}</span>
                        {missing.length > 0 && (
                          <span title={`Missing: ${missing.join(", ")}`} style={{ font: `700 11px ${F_SANS}`, padding: "4px 10px", borderRadius: 999, whiteSpace: "nowrap", background: "var(--st-cancel-bg)", color: "var(--st-cancel-fg)" }}>⚠ Missing {missing.length} field{missing.length !== 1 ? "s" : ""}</span>
                        )}
                      </div>
                      <span onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(owner.email); setCopiedEmail(owner.email); setTimeout(() => setCopiedEmail((c) => (c === owner.email ? null : c)), 1400); }} title="Click to copy" style={{ font: `500 13px ${F_SANS}`, color: "var(--muted)", cursor: "pointer", userSelect: "text" }}>{owner.email}{copiedEmail === owner.email && <span style={{ color: "var(--st-active-fg)", marginLeft: 6, fontWeight: 600 }}>· Copied ✓</span>}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flex: "none" }}>
                    <div style={{ font: `600 16px ${F_GRO}`, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{owner.monthlyPayout > 0 ? `${peso(owner.monthlyPayout)}/mo` : "TBC"}</div>
                    <div style={{ font: `500 12px ${F_SANS}`, marginTop: 2, color: setupPaid ? "var(--muted2)" : "var(--warn-badge-text)" }}>{setupPaid ? `Setup paid${monthlyCount > 0 ? ` · ${monthlyCount} mo paid` : ""}` : "Setup due"}</div>
                  </div>
                </div>

                {open && (
                  <div style={{ borderTop: "1px solid var(--divider)", padding: "20px 22px" }}>
                    {/* ACCOUNT */}
                    <div style={{ ...labelCss, marginBottom: 12 }}>Account</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px 20px", marginBottom: 26 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                        <span style={labelCss}>Owner status</span>
                        <select defaultValue={resolveStatus(owner)} onClick={(e) => e.stopPropagation()} onChange={(e) => patchOwner(owner.applicationId, { ownerStatus: e.target.value })}
                          style={{ ...inputCss, cursor: "pointer", fontWeight: 600 }}>
                          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                        </select>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                        <span style={labelCss}>Date acquired</span>
                        <input type="date" defaultValue={toDateInput(owner.onboardedAt)} onClick={(e) => e.stopPropagation()}
                          onBlur={(e) => { const v = e.target.value; if (v && v !== toDateInput(owner.onboardedAt)) patchOwner(owner.applicationId, { onboardedAt: `${v}T00:00:00.000Z` }); }}
                          style={inputCss} />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                        <span style={labelCss}>Best contact</span>
                        <div style={{ display: "flex", gap: 8 }}>
                          <select defaultValue={owner.contactChannel || ""} onClick={(e) => e.stopPropagation()} onChange={(e) => patchOwner(owner.applicationId, { contactChannel: e.target.value || null })}
                            style={{ ...inputCss, width: 130, flex: "none", cursor: "pointer", fontWeight: 600 }}>
                            {CHANNEL_OPTIONS.map((c) => <option key={c} value={c}>{c || "— channel —"}</option>)}
                          </select>
                          <Editable initial={owner.contactNumber} placeholder="handle / number" onSave={(v) => patchOwner(owner.applicationId, { contactNumber: v })} />
                        </div>
                      </div>
                    </div>

                    {/* PAYOUT */}
                    <div style={{ ...labelCss, marginBottom: 12 }}>Payout</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 20px", marginBottom: 26 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, gridColumn: "1 / -1" }}>
                        <span style={labelCss}>Registered name (exact name on the GCash / bank account)</span>
                        <Editable initial={owner.payoutName} placeholder="e.g. Juan D. Dela Cruz" onSave={(v) => patchOwner(owner.applicationId, { payoutName: v })} />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                        <span style={labelCss}>Method (GCash / bank / etc.)</span>
                        <Editable initial={owner.paymentMethod} placeholder="e.g. GCash" onSave={(v) => patchOwner(owner.applicationId, { paymentMethod: v })} />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                        <span style={labelCss}>Account number / details</span>
                        <Editable initial={owner.paymentDetails} placeholder="e.g. 0917 123 4567" mono onSave={(v) => patchOwner(owner.applicationId, { paymentDetails: v })} />
                      </div>
                    </div>

                    {/* PAYMENT SCHEDULE */}
                    <div style={{ ...labelCss, marginBottom: 12 }}>Payment schedule</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 26 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, background: "var(--band)", border: "1px solid var(--divider)", borderRadius: 12, padding: "14px 16px" }}>
                        <div>
                          <div style={{ font: `600 14.5px ${F_SANS}`, color: "var(--text)" }}>Setup fee · {peso(SETUP_FEE)}</div>
                          {setupPaid ? (
                            <div style={{ font: `500 12.5px ${F_SANS}`, color: "var(--muted)", marginTop: 2 }}>Paid {setupPaid}</div>
                          ) : setupDue ? (
                            <div style={{ font: `500 12.5px ${F_SANS}`, color: isOverdue(setupDue) ? "var(--st-cancel-fg)" : "var(--muted)", marginTop: 2 }}>
                              Due {fmtDate(setupDue)}{isOverdue(setupDue) ? " · overdue" : ""} <span style={{ color: "var(--muted2)" }}>· {owner.accountFreshness === "fresh" ? "fresh, +1 week" : "established, +3 days"}</span>
                            </div>
                          ) : (
                            <div style={{ font: `500 12.5px ${F_SANS}`, color: "var(--muted2)", marginTop: 2 }}>Set an onboarding date to schedule this</div>
                          )}
                          {!setupPaid && (
                            <select value={owner.accountFreshness || "established"} onClick={(e) => e.stopPropagation()} onChange={(e) => patchOwner(owner.applicationId, { accountFreshness: e.target.value })}
                              style={{ marginTop: 6, background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: 7, padding: "5px 8px", font: `500 12px ${F_SANS}`, color: "var(--text)", cursor: "pointer", outline: "none" }}>
                              <option value="established">Established (setup +3 days)</option>
                              <option value="fresh">Fresh / new (setup +1 week)</option>
                            </select>
                          )}
                        </div>
                        {setupPaid ? (
                          <button type="button" onClick={() => patchOwner(owner.applicationId, { paidAt: null })} style={{ font: `600 12.5px ${F_SANS}`, color: "var(--muted)", background: "transparent", border: "1px solid var(--btn-secondary-border)", padding: "9px 14px", borderRadius: 9, cursor: "pointer" }}>Clear</button>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "none" }}>
                            {payNote("setup")}
                            <button type="button" onClick={canPay("setup") ? markSetupPaid : undefined} disabled={!canPay("setup")} style={canPay("setup") ? darkBtn : disabledBtn}>Mark paid</button>
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, background: "var(--band)", border: "1px solid var(--divider)", borderRadius: 12, padding: "14px 16px" }}>
                        <div>
                          <div style={{ font: `600 14.5px ${F_SANS}`, color: "var(--text)" }}>Monthly · {peso(monthlyAmt)}/mo</div>
                          <div style={{ font: `500 12.5px ${F_SANS}`, color: isOverdue(nextMonthlyDue) ? "var(--st-cancel-fg)" : "var(--muted)", marginTop: 2 }}>
                            {nextMonthlyDue ? `${monthlyCount > 0 ? `${monthlyCount} logged · next` : "First payment"} due ${fmtDate(nextMonthlyDue)}${isOverdue(nextMonthlyDue) ? " · overdue" : ""}` : "Set an onboarding date to schedule this"}
                          </div>
                          <div style={{ font: `500 11px ${F_SANS}`, color: "var(--muted2)", marginTop: 2 }}>On the 1st, after one full month of service</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "none" }}>
                          {payNote("monthly")}
                          <button type="button" onClick={canPay("monthly") ? () => patchOwner(owner.applicationId, { addMonthlyPayout: { amount: monthlyAmt, kind: "monthly", method: owner.paymentMethod } }) : undefined} disabled={!canPay("monthly")} style={canPay("monthly") ? darkBtn : disabledBtn}>+ Log {peso(monthlyAmt)}</button>
                        </div>
                      </div>
                    </div>

                    {/* PAYMENT RECORD */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <span style={labelCss}>Payment record</span>
                      <span style={{ font: `500 12px ${F_SANS}`, color: "var(--muted)" }}>Total paid: <strong style={{ fontWeight: 700, color: "var(--st-active-fg)" }}>{peso(totalPaid)}</strong></span>
                    </div>
                    <div style={{ border: "1px solid var(--divider)", borderRadius: 12, overflow: "hidden", marginBottom: 26 }}>
                      <div style={{ display: "grid", gridTemplateColumns: PAY_GRID, gap: 12, padding: "10px 16px", background: "var(--band)", borderBottom: "1px solid var(--divider)" }}>
                        {["Date", "Payment", "Proof", "Notified", "Acknowledged", ""].map((h, i) => <span key={i} style={{ font: `700 9.5px ${F_SANS}`, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--label)" }}>{h}</span>)}
                      </div>
                      {owner.monthlyPayouts.length === 0 && !(owner.setupFeePaidAt && !hasSetupRecord) ? (
                        <div style={{ padding: 16, textAlign: "center", font: `500 12.5px ${F_SANS}`, color: "var(--muted)" }}>No payments logged yet.</div>
                      ) : (
                        <>
                          {owner.monthlyPayouts.map((p, i) => (
                            <div key={i} style={{ display: "grid", gridTemplateColumns: PAY_GRID, gap: 12, alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--divider)" }}>
                              <span style={{ font: `500 12.5px ${F_SANS}`, color: "var(--text2)", whiteSpace: "nowrap" }}>{fmtDate(p.paidAt)}</span>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ font: `600 13px ${F_SANS}`, color: "var(--text)" }}>{peso(Number(p.amount) || 0)} <span style={{ fontWeight: 500, color: "var(--muted)" }}>· {p.kind === "setup" ? "Setup fee" : "Monthly"}</span></div>
                                <div style={{ font: `500 11.5px ${F_SANS}`, color: "var(--muted2)" }}>{p.method ? `via ${p.method}` : p.by ? `by ${p.by}` : "—"}</div>
                              </div>
                              {p.proofUrl ? (
                                <a href={p.proofUrl} target="_blank" rel="noreferrer" style={{ font: `600 12px ${F_SANS}`, color: "var(--link)", background: "var(--link-bg)", padding: "5px 10px", borderRadius: 8, textAlign: "center", whiteSpace: "nowrap" }}>↗ Receipt</a>
                              ) : (
                                <button type="button" onClick={() => attachProof(i)} style={{ font: `600 12px ${F_SANS}`, color: "var(--muted)", background: "var(--neutral-chip-bg)", border: "1px dashed var(--input-border)", padding: "5px 10px", borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap" }}>+ Attach</button>
                              )}
                              <TogglePill on={!!p.notified} onLabel="Notified" offLabel="Mark notified" onBg="var(--blue-chip-bg)" onFg="var(--blue-chip-text)" onClick={() => patchOwner(owner.applicationId, { updateMonthlyPayout: { index: i, notified: !p.notified } })} />
                              <TogglePill on={!!p.acknowledged} onLabel={p.acknowledgedAt ? `Ack ${fmtDate(p.acknowledgedAt)}` : "Acknowledged"} offLabel="Awaiting ack" onBg="var(--st-active-bg)" onFg="var(--st-active-fg)" onClick={() => patchOwner(owner.applicationId, { updateMonthlyPayout: { index: i, acknowledged: !p.acknowledged } })} />
                              <button type="button" onClick={() => patchOwner(owner.applicationId, { removeMonthlyPayout: i })} title="Remove" style={{ font: `600 13px ${F_SANS}`, color: "var(--muted2)", background: "transparent", border: "none", cursor: "pointer" }}>✕</button>
                            </div>
                          ))}
                          {owner.setupFeePaidAt && !hasSetupRecord && (
                            <div style={{ display: "grid", gridTemplateColumns: PAY_GRID, gap: 12, alignItems: "center", padding: "12px 16px" }}>
                              <span style={{ font: `500 12.5px ${F_SANS}`, color: "var(--text2)", whiteSpace: "nowrap" }}>{fmtDate(owner.setupFeePaidAt)}</span>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ font: `600 13px ${F_SANS}`, color: "var(--text)" }}>{peso(SETUP_FEE)} <span style={{ fontWeight: 500, color: "var(--muted)" }}>· Setup fee</span></div>
                                <div style={{ font: `500 11.5px ${F_SANS}`, color: "var(--muted2)" }}>{owner.paymentMethod ? `via ${owner.paymentMethod}` : "—"}</div>
                              </div>
                              <span style={{ font: `500 12px ${F_SANS}`, color: "var(--muted2)", textAlign: "center" }}>—</span>
                              <span style={{ font: `500 12px ${F_SANS}`, color: "var(--muted2)", textAlign: "center" }}>—</span>
                              <span style={{ font: `500 12px ${F_SANS}`, color: "var(--muted2)", textAlign: "center" }}>—</span>
                              <span />
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* PROFILE & CREDENTIALS */}
                    <div style={{ ...labelCss, marginBottom: 12 }}>Profile{owner.accounts.length !== 1 ? "s" : ""} &amp; credentials</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {owner.accounts.map((acc) => {
                        const pwKey = `${acc.id}:pw`, tfKey = `${acc.id}:tf`;
                        return (
                          <div key={acc.id} style={{ background: "var(--band)", border: "1px solid var(--divider)", borderRadius: 12, padding: 18 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 16, flexWrap: "wrap" }}>
                              <span style={{ font: `600 16px ${F_GRO}`, color: "var(--text)" }}>{acc.linkedinName}</span>
                              <span style={{ font: `600 11px ${F_SANS}`, padding: "3px 9px", borderRadius: 7, background: acctStyle(acc.status).bg, color: acctStyle(acc.status).fg }}>{acc.status}</span>
                              {Number(acc.ambassadorPayment) > 0 && <span style={{ font: `500 13px ${F_SANS}`, color: "var(--muted)" }}>{peso(Number(acc.ambassadorPayment))}/mo</span>}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                              <span style={labelCss}>LinkedIn URL</span>
                              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <Editable initial={acc.linkedinUrl} placeholder="https://linkedin.com/in/…" mono onSave={(v) => patchAccount(acc.id, { linkedinUrl: v })} />
                                {acc.linkedinUrl && <a href={acc.linkedinUrl} target="_blank" rel="noreferrer" style={{ flex: "none", font: `600 13px ${F_SANS}`, color: "var(--link)" }}>Open</a>}
                              </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 20px" }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                                <span style={labelCss}>Monthly payout (₱)</span>
                                <input type="number" defaultValue={Number(acc.ambassadorPayment) || ""} placeholder="500"
                                  onBlur={(e) => { const n = e.target.value === "" ? 0 : Number(e.target.value); if (!Number.isNaN(n) && n !== Number(acc.ambassadorPayment)) patchAccount(acc.id, { ambassadorPayment: n }); }}
                                  style={inputCss} />
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                                <span style={labelCss}>Account email (their login)</span>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <Editable initial={acc.loginEmail} placeholder="account@email.com" mono onSave={(v) => patchAccount(acc.id, { loginEmail: v })} />
                                  <CopyBtn value={acc.loginEmail} />
                                </div>
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                                <span style={labelCss}>Work email (klabber.co we added)</span>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <Editable initial={acc.workEmail} placeholder="name@klabber.co" mono onSave={(v) => patchAccount(acc.id, { workEmail: v })} />
                                  <CopyBtn value={acc.workEmail} />
                                </div>
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                                <span style={labelCss}>Password</span>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <Editable initial={acc.accountPassword} placeholder="•••••••" mono type={revealed.has(pwKey) ? "text" : "password"} onSave={(v) => patchAccount(acc.id, { accountPassword: v })} />
                                  <button type="button" onClick={() => toggleReveal(pwKey)} style={{ flex: "none", font: `600 12px ${F_SANS}`, color: "var(--muted)", background: "transparent", border: "none", cursor: "pointer", padding: "0 4px" }}>{revealed.has(pwKey) ? "Hide" : "Show"}</button>
                                  <CopyBtn value={acc.accountPassword} />
                                </div>
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, gridColumn: "1 / -1" }}>
                                <span style={labelCss}>2FA (backup code / secret)</span>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <Editable initial={acc.twoFactor} placeholder="2FA / recovery" mono type={revealed.has(tfKey) ? "text" : "password"} onSave={(v) => patchAccount(acc.id, { twoFactor: v })} />
                                  <button type="button" onClick={() => toggleReveal(tfKey)} style={{ flex: "none", font: `600 12px ${F_SANS}`, color: "var(--muted)", background: "transparent", border: "none", cursor: "pointer", padding: "0 4px" }}>{revealed.has(tfKey) ? "Hide" : "Show"}</button>
                                  <CopyBtn value={acc.twoFactor} />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
