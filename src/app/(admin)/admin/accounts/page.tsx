"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatNumber } from "@/lib/utils";

// LinkedIn 2FA for an account: shows the secret KEY plus the live TOTP code.
// The server computes the current code (so clock skew can't break it) and, on
// this admin-only page, also returns the raw key for copying into an app. The
// code counts down and auto-refreshes each 30s window. Mounts on card expand.
function TwoFactorCode({ accountId }: { accountId: string }) {
  type S =
    | { status: "loading" | "none" | "error" }
    | { status: "invalid"; secret: string }
    | { status: "ok"; secret: string; code: string; expiresIn: number; period: number };
  const [state, setState] = useState<S>({ status: "loading" });
  const [copied, setCopied] = useState<"key" | "code" | null>(null);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval> | undefined;
    const load = async () => {
      try {
        const res = await fetch(`/api/admin/accounts/${accountId}/totp`, { cache: "no-store" });
        if (!alive) return;
        if (!res.ok) { setState({ status: "error" }); return; }
        const d = await res.json();
        if (d.configured === false) setState({ status: "none" });
        else if (d.invalid) setState({ status: "invalid", secret: d.secret || "" });
        else setState({ status: "ok", secret: d.secret || "", code: d.code, expiresIn: d.expiresIn, period: d.period });
      } catch { if (alive) setState({ status: "error" }); }
    };
    load();
    timer = setInterval(() => {
      setState((s) => {
        if (s.status !== "ok") return s;
        const next = s.expiresIn - 1;
        if (next <= 0) { load(); return { ...s, expiresIn: 0 }; }
        return { ...s, expiresIn: next };
      });
    }, 1000);
    return () => { alive = false; if (timer) clearInterval(timer); };
  }, [accountId]);

  const copy = (text: string, which: "key" | "code") => { navigator.clipboard?.writeText(text); setCopied(which); setTimeout(() => setCopied(null), 1200); };
  const keyBtnStyle = { font: `600 12px ui-monospace, SFMono-Regular, Menlo, monospace`, letterSpacing: ".02em", color: "var(--text2)", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" as const, wordBreak: "break-all" as const, whiteSpace: "normal" as const };

  if (state.status !== "ok") {
    if (state.status === "invalid") {
      return (
        <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <button onClick={() => copy(state.secret, "key")} title="Stored value — not a valid authenticator key. Click to copy." style={keyBtnStyle}>{state.secret || "—"}</button>
          <span style={{ font: `600 10px sans-serif`, color: "var(--st-cancel-fg)" }}>⚠ not a valid key{copied === "key" ? " · copied" : ""}</span>
        </span>
      );
    }
    const label = state.status === "loading" ? "…" : state.status === "none" ? "Not set" : "Unavailable";
    return <span style={{ color: "var(--muted2)" }}>{label}</span>;
  }

  const pretty = `${state.code.slice(0, 3)} ${state.code.slice(3)}`;
  const low = state.expiresIn <= 5;
  return (
    <span style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
      {/* secret key */}
      <button onClick={() => copy(state.secret, "key")} title="Secret key — click to copy" style={keyBtnStyle}>{state.secret}</button>
      <span style={{ font: `500 9.5px sans-serif`, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted2)" }}>key{copied === "key" ? " · copied" : ""}</span>
      {/* live code + countdown */}
      <span style={{ display: "inline-flex", alignItems: "center", gap: 10, marginTop: 2 }}>
        <button onClick={() => copy(state.code, "code")} title="Current code — click to copy" style={{ font: `700 16px ui-monospace, SFMono-Regular, Menlo, monospace`, letterSpacing: ".08em", color: "var(--text)", background: "none", border: "none", padding: 0, cursor: "pointer", fontVariantNumeric: "tabular-nums" }}>{pretty}</button>
        <span title={`Refreshes in ${state.expiresIn}s`} style={{ font: `600 11px ui-monospace, monospace`, color: low ? "var(--st-cancel-fg)" : "var(--muted2)", fontVariantNumeric: "tabular-nums" }}>{state.expiresIn}s</span>
        {copied === "code" && <span style={{ font: `600 11px sans-serif`, color: "var(--st-active-fg)" }}>copied</span>}
      </span>
    </span>
  );
}

// Account password: masked by default, click the eye to reveal, click the value
// to copy. Admin-only inventory detail.
function PasswordField({ password }: { password: string | null }) {
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  if (!password) return <span style={{ color: "var(--muted2)" }}>—</span>;
  const copy = () => { navigator.clipboard?.writeText(password); setCopied(true); setTimeout(() => setCopied(false), 1200); };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      <button onClick={copy} title="Click to copy" style={{ font: `600 13px ui-monospace, SFMono-Regular, Menlo, monospace`, color: "var(--text2)", background: "none", border: "none", padding: 0, cursor: "pointer", wordBreak: "break-all", whiteSpace: "normal", textAlign: "left" }}>{shown ? password : "•".repeat(Math.min(password.length, 12))}</button>
      <button onClick={() => setShown((s) => !s)} title={shown ? "Hide" : "Reveal"} style={{ font: `500 12px sans-serif`, color: "var(--link)", background: "none", border: "none", padding: 0, cursor: "pointer", flex: "none" }}>{shown ? "🙈" : "👁"}</button>
      {copied && <span style={{ font: `600 11px sans-serif`, color: "var(--st-active-fg)", flex: "none" }}>copied</span>}
    </span>
  );
}

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
  workEmail: string | null;
  accountPassword: string | null;
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
  restrictionLog: Array<{ at: string; event: "restricted" | "recovered"; note?: string; creditedDays?: number }> | null;
  twoFactorResetNeeded: boolean;
  paymentLinkedAccountId: string | null;
  trialEndsAt: string | null;
  verificationProof: string | null;
  linkedinVerified: boolean;
  removedAt: string | null;
  paymentWallet: string | null;
  paymentNetwork: string | null;
  paymentDailyRate: string | number | null;
  paymentTermsLabel: string | null;
  manualPaidUntil: string | null;
  paymentTrackedFrom: string | null;
  paymentTelegramChatId: string | null;
  paymentWhatsapp: string | null;
  rentals: Array<{ lockedPrice: string | number | null; currentPeriodEnd: string | null; autoRenew: boolean; status: string; updatedAt: string | null; user: { fullName: string; email: string } }>;
  cryptoPayments?: Array<{ amount: string | number; paidAt: string }>;
}

const F_SANS = "var(--font-sans),system-ui,sans-serif";
const F_GRO = "var(--font-grotesk),system-ui,sans-serif";
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmt = (d: string | null) => { if (!d) return "—"; const x = new Date(d); return `${MON[x.getMonth()]} ${x.getDate()}, ${x.getFullYear()}`; };
const fmtS = (d: string | null) => { if (!d) return ""; const x = new Date(d); return `${MON[x.getMonth()]} ${x.getDate()}`; };
// Tiered rental pricing by connections + age (matches the public catalogue).
// Highest qualifying tier wins; the last is the floor. Returns weekly/monthly/daily.
const tierPricing = (conns: number, ageMonths: number | null, hasSalesNav?: boolean): { weekly: number; monthly: number; daily: number } => {
  const age = ageMonths || 0;
  const base =
    conns >= 2000 ? { weekly: 40, monthly: 150, daily: 8 }
    : conns >= 1000 && age >= 12 ? { weekly: 30, monthly: 110, daily: 6 }
    : conns >= 500 && age >= 12 ? { weekly: 20, monthly: 75, daily: 4 }
    : conns >= 100 && age >= 6 ? { weekly: 15, monthly: 50, daily: 3 }
    : { weekly: 13, monthly: 45, daily: 2.75 };
  // Sales Navigator add-on: +$70/mo, +$20/wk, +$4/day on top of the tier.
  if (hasSalesNav) return { weekly: base.weekly + 20, monthly: base.monthly + 70, daily: base.daily + 4 };
  return base;
};
const money = (n: number) => (n % 1 === 0 ? `$${n}` : `$${n.toFixed(2)}`);

// ── ONE status per account ───────────────────────────────────────────────
// The DB keeps its raw enum (available / rented / trial / under_review /
// maintenance / unavailable / retired / removed) PLUS a separate `restrictedAt`
// flag. Historically those surfaced as two competing labels (e.g. status
// "available" while the health pill said "Recovering"). canonicalStatus()
// collapses them into ONE label, shown identically in the inventory, the CSV
// export, and the filter chips. DB values are left untouched (billing reads
// them) — this is display-only.
const canonicalStatus = (a: { status: string; restrictedAt: string | null; twoFactorResetNeeded?: boolean }): string => {
  if (a.status === "rented") return "Rented";
  // A restricted account keeps its real lifecycle group (e.g. Maintenance) and just
  // shows a "Restricted" badge on the row — so it can be visibly both at once. The one
  // exception: an otherwise-"available" account gets pulled out of the rentable Available
  // group into Restricted, so a restricted account never reads as live-and-rentable.
  // Same idea for 2FA: an "available" account whose 2FA still needs rotating must
  // never read as live-and-rentable either, so it's pulled into Maintenance instead.
  if (a.status === "available") return a.twoFactorResetNeeded ? "Maintenance" : a.restrictedAt ? "Restricted" : "Available";
  if (a.status === "trial") return "Trial";
  if (a.status === "retired") return "Inaccessible";
  if (a.status === "removed") return "Removed";
  return "Maintenance"; // under_review / maintenance / unavailable / anything else
};
const GROUPS: { key: string; hint: string; dot: string }[] = [
  { key: "Available", hint: "live & rentable, no one on it", dot: "var(--st-active-fg)" },
  { key: "Trial", hint: "on a 3-day trial hold — held out of Available", dot: "var(--warn-badge-text)" },
  { key: "Rented", hint: "currently rented by a customer", dot: "var(--blue-chip-text)" },
  { key: "Restricted", hint: "LinkedIn-restricted — access paused while it recovers", dot: "var(--st-unreach-fg)" },
  { key: "Maintenance", hint: "temporarily off — being set up, vetted, or paused", dot: "var(--neutral-chip-text)" },
  { key: "Inaccessible", hint: "retired — can no longer be used", dot: "var(--st-cancel-fg)" },
  { key: "Removed", hint: "taken out of inventory", dot: "var(--st-cancel-fg)" },
  { key: "Showcase", hint: "public-catalogue demo accounts — not real inventory", dot: "var(--warn-badge-text)" },
];
const statusChip = (disp: string): React.CSSProperties => {
  const m: Record<string, [string, string]> = {
    Available: ["var(--st-active-bg)", "var(--st-active-fg)"],
    Trial: ["var(--warn-badge-bg)", "var(--warn-badge-text)"],
    Rented: ["var(--blue-chip-bg)", "var(--blue-chip-text)"],
    Restricted: ["var(--st-unreach-bg)", "var(--st-unreach-fg)"],
    Maintenance: ["var(--neutral-chip-bg)", "var(--neutral-chip-text)"],
    Inaccessible: ["var(--st-cancel-bg)", "var(--st-cancel-fg)"],
    Removed: ["var(--st-cancel-bg)", "var(--st-cancel-fg)"],
  };
  const [bg, fg] = m[disp] || m.Maintenance;
  return { background: bg, color: fg };
};
// Trial state for a row: null unless status=trial. `expired` once trialEndsAt has passed.
function trialInfo(a: Account): { expired: boolean; label: string } | null {
  if (a.status !== "trial") return null;
  const end = a.trialEndsAt ? new Date(a.trialEndsAt).getTime() : 0;
  const ms = end - Date.now();
  if (ms <= 0) return { expired: true, label: "Trial expired" };
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const left = d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
  return { expired: false, label: `${left} left` };
}
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
// Off-platform crypto rent: paid-up state from recorded on-chain payments vs the
// daily rate. Mirrors the maths in src/lib/crypto-payments.ts. Returns a single
// clear payment status + the supporting detail, for the inventory's Payment column.
type PayState = "settled" | "overdue" | "awaiting";
type PayInfo = { state: PayState; statusLabel: string; terms: string; dueLabel: string; lastLabel: string; network: string; address: string; manual: boolean };
function cryptoPayInfo(a: Account, all: Account[]): PayInfo | null {
  // paymentDailyRate/paymentTermsLabel double as the advertised rate on an
  // Available listing AND the terms of a live off-platform rental — only show
  // a payment chip for the latter, or an Available account with pricing set
  // reads as having an unpaid rental nobody actually owes.
  if (a.status !== "rented" && a.status !== "trial") return null;

  // One renter, one combined payment across two accounts: the secondary has no
  // wallet of its own (the cron skips it) — mirror the primary's already-computed
  // paid/overdue state instead of trying to split one balance across two ledgers.
  if (a.paymentLinkedAccountId) {
    const primary = all.find((x) => x.id === a.paymentLinkedAccountId);
    const base = primary ? cryptoPayInfo(primary, all) : null;
    if (!base) return null;
    return { ...base, terms: a.paymentTermsLabel ? `${a.paymentTermsLabel} — combined with ${primary!.linkedinName}` : `${base.terms} — combined with ${primary!.linkedinName}` };
  }

  const rate = Number(a.paymentDailyRate || 0);
  const auto = !!a.paymentWallet && rate > 0;     // on-chain scanned
  const address = a.paymentWallet || "";
  const network = a.paymentNetwork === "bsc" ? "BNB Chain" : a.paymentNetwork === "ethereum" ? "Ethereum" : a.paymentNetwork === "tron" ? "TRON" : (a.paymentNetwork || "");

  // Manual rentals (terms set, no daily rate): status is the admin-set paid-through
  // date — Unpaid until marked paid, no on-chain scan or auto-reminders.
  if (!auto) {
    if (!a.paymentTermsLabel) return null;
    const paid = a.manualPaidUntil ? new Date(a.manualPaidUntil).getTime() : 0;
    const settled = paid > Date.now();
    return {
      state: settled ? "settled" : "overdue",
      statusLabel: settled ? "Paid" : "Unpaid",
      terms: `${a.paymentTermsLabel} · manual`,
      dueLabel: settled ? `paid to ${fmtS(new Date(paid).toISOString())}` : "",
      lastLabel: "", network, address, manual: true,
    };
  }

  const terms = a.paymentTermsLabel || `$${rate.toFixed(2)}/day`;
  const payments = a.cryptoPayments || [];
  const total = payments.reduce((s, p) => s + Number(p.amount), 0);
  const last = payments[0];
  const lastLabel = last ? `last $${Number(last.amount).toFixed(2)} · ${fmtS(last.paidAt)}` : "no payments yet";

  if (!a.paymentTrackedFrom) {
    return { state: payments.length ? "settled" : "awaiting", statusLabel: payments.length ? "Settled" : "Awaiting payment", terms, dueLabel: "", lastLabel, network, address, manual: false };
  }
  const until = new Date(a.paymentTrackedFrom).getTime() + (total / rate) * 86400000;
  const overdue = until < Date.now();
  if (total === 0) {
    return { state: overdue ? "overdue" : "awaiting", statusLabel: overdue ? "Overdue" : "Awaiting 1st payment", terms, dueLabel: `due by ${fmtS(new Date(until).toISOString())}`, lastLabel, network, address, manual: false };
  }
  if (overdue) {
    const daysLate = Math.max(1, Math.ceil((Date.now() - until) / 86400000));
    return { state: "overdue", statusLabel: "Overdue", terms, dueLabel: `due ${fmtS(new Date(until).toISOString())} · ${daysLate}d late`, lastLabel, network, address, manual: false };
  }
  return { state: "settled", statusLabel: "Settled", terms, dueLabel: `paid to ${fmtS(new Date(until).toISOString())}`, lastLabel, network, address, manual: false };
}
const payChipCss = (state: PayState): React.CSSProperties => {
  const m: Record<PayState, [string, string]> = {
    settled: ["var(--st-active-bg)", "var(--st-active-fg)"],
    overdue: ["var(--st-cancel-bg)", "var(--st-cancel-fg)"],
    awaiting: ["var(--warn-badge-bg)", "var(--warn-badge-text)"],
  };
  const [bg, fg] = m[state];
  return { background: bg, color: fg };
};
const shortAddr = (s: string) => (s.length > 14 ? `${s.slice(0, 6)}…${s.slice(-5)}` : s);
const profileEmailOf = (a: Account) => (a.notes || "").match(/Profile email:\s*(\S+@\S+?\.\S+?)[\s.]/)?.[1] || null;
// A rented account should be health-checked weekly — flag it if the last check is >7 days old (or never).
const isDummy = (a: Account) => (a.notes || "").includes("[SHOWCASE]");
const checkDue = (a: Account) => !isDummy(a) && a.status === "rented" && !a.restrictedAt && (!a.healthCheckedAt || Date.now() - new Date(a.healthCheckedAt).getTime() > 7 * 86400000);
// "Handle with care" marker: was restricted at least once, and the most recent
// restriction was within the last RECENT_RESTRICT_DAYS. Persists AFTER recovery
// (unlike restrictedAt) so a freshly-recovered, still-fragile account stays flagged.
const RECENT_RESTRICT_DAYS = 45;
const recentRestrict = (a: Account): { times: number; daysAgo: number } | null => {
  const log = Array.isArray(a.restrictionLog) ? a.restrictionLog : [];
  const restricts = log.filter((e) => e.event === "restricted");
  if (!restricts.length) return null;
  const last = restricts.reduce((m, e) => (e.at > m ? e.at : m), restricts[0].at);
  const daysAgo = Math.floor((Date.now() - new Date(last).getTime()) / 86400000);
  if (daysAgo > RECENT_RESTRICT_DAYS) return null;
  return { times: restricts.length, daysAgo };
};
// dummies (public-catalogue showcase accounts) get their own group, not mixed with real inventory
const groupKey = (a: Account) => (isDummy(a) ? "Showcase" : canonicalStatus(a));

const GRID = "minmax(0,1fr) 132px 84px 150px 168px 214px";

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

  const markForTrial = async (a: Account) => {
    setBusy(a.id);
    try {
      const res = await fetch(`/api/admin/accounts/${a.id}/trial`, { method: "POST" });
      if (res.ok) await load(); else alert("Failed to start trial");
    } finally { setBusy(null); }
  };
  // Ends a trial — cancel early OR acknowledge an expired one; both return it to Available.
  const endTrial = async (a: Account) => {
    setBusy(a.id);
    try {
      const res = await fetch(`/api/admin/accounts/${a.id}/trial`, { method: "DELETE" });
      if (res.ok) await load(); else alert("Failed to end trial");
    } finally { setBusy(null); }
  };

  // Manual rentals: mark the current period paid (promotes trial → rented) or unpaid.
  const markManualPaid = async (a: Account, paid: boolean) => {
    setBusy(a.id);
    try {
      const res = await fetch(`/api/admin/accounts/${a.id}/manual-paid`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paid }) });
      if (res.ok) await load(); else alert("Failed to update payment");
    } finally { setBusy(null); }
  };

  const toggleForRent = async (a: Account) => {
    if (a.status === "rented") return;
    const next = a.status === "available" ? "unavailable" : "available";
    if (next === "available" && a.twoFactorResetNeeded) {
      alert("This account's 2FA was exposed to the last renter — rotate the code (Edit → 2FA Secret / Key) before making it available again.");
      return;
    }
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
  // Set account age from an "opened" month (YYYY-MM) → stores accountAgeMonths.
  const saveAge = async (a: Account, opened: string) => {
    let months: number | null = null;
    if (opened) {
      const [y, m] = opened.split("-").map(Number);
      if (y && m) { const now = new Date(); months = Math.max(0, (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m)); }
    }
    if (months === (a.accountAgeMonths ?? null)) return;
    setAccounts((prev) => prev.map((x) => (x.id === a.id ? { ...x, accountAgeMonths: months } : x)));
    await patch(a.id, { accountAgeMonths: months });
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
    // Optional note captured into the restriction history (e.g. what triggered it / how it was recovered).
    const note = (prompt(restricted ? "Optional: what triggered the restriction? (e.g. logged in + approved connections, geo mismatch)" : "Optional: how was it recovered? (e.g. ID verified via passport, new PH proxy)") || "").trim();
    setBusy(a.id);
    try {
      const res = await fetch(`/api/admin/accounts/${a.id}/restricted`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ restricted, note }) });
      if (res.ok) { const d = await res.json(); setAccounts((prev) => prev.map((x) => (x.id === a.id ? { ...x, restrictedAt: restricted ? (d.restrictedAt || new Date().toISOString()) : null, restrictionLog: (d.restrictionLog as Account["restrictionLog"]) ?? x.restrictionLog } : x))); if (!restricted && d.creditedDays) alert(`Recovered. Credited ~${d.creditedDays} day(s) of downtime to the renter.`); }
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

  const counts = useMemo(() => {
    const real = accounts.filter((a) => !isDummy(a));
    const c = (label: string) => real.filter((a) => canonicalStatus(a) === label).length;
    return {
      total: accounts.length, // "All" chip (everything)
      realTotal: real.length, // headline — sellable inventory, excludes dummies
      Available: c("Available"),
      Trial: c("Trial"),
      Rented: c("Rented"),
      Restricted: c("Restricted"),
      Maintenance: c("Maintenance"),
      Inaccessible: c("Inaccessible"),
      Removed: c("Removed"),
      Showcase: accounts.filter(isDummy).length,
      checksDue: accounts.filter(checkDue).length,
    };
  }, [accounts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = accounts.filter((a) => {
      if (filter !== "all" && groupKey(a) !== filter) return false;
      if (!q) return true;
      return `${a.linkedinName} ${a.linkedinHeadline || ""} ${a.ownerEmail || ""} ${a.location || ""} ${a.industry || ""} ${a.proxyHost || ""}`.toLowerCase().includes(q);
    });
    // Combined-billing pairs: keep a secondary right after its primary instead
    // of wherever createdAt happens to place it, so they read as one unit.
    const indexOf = new Map(accounts.map((a, i) => [a.id, i]));
    const anchor = (a: Account) => (a.paymentLinkedAccountId ? indexOf.get(a.paymentLinkedAccountId) ?? indexOf.get(a.id)! : indexOf.get(a.id)!);
    return [...base].sort((a, b) => {
      const rankA = anchor(a) + (a.paymentLinkedAccountId ? 0.5 : 0);
      const rankB = anchor(b) + (b.paymentLinkedAccountId ? 0.5 : 0);
      return rankA - rankB;
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

  const CHIPS: [string, string, number, string | null][] = [["all", "All", counts.total, null], ["Available", "Available", counts.Available, "var(--st-active-fg)"], ["Trial", "Trial", counts.Trial, "var(--warn-badge-text)"], ["Rented", "Rented", counts.Rented, "var(--blue-chip-text)"], ["Restricted", "Restricted", counts.Restricted, "var(--st-unreach-fg)"], ["Maintenance", "Maintenance", counts.Maintenance, "var(--neutral-chip-text)"], ["Inaccessible", "Inaccessible", counts.Inaccessible, "var(--st-cancel-fg)"], ["Removed", "Removed", counts.Removed, "var(--st-cancel-fg)"], ["Showcase", "Showcase", counts.Showcase, "var(--warn-badge-text)"]];

  return (
    <div>
      {/* Security reminder — rotate credentials when a rental ends */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "var(--st-cancel-bg)", border: "1px solid var(--st-cancel-fg)", borderRadius: 12, padding: "12px 16px", marginBottom: 18 }}>
        <span style={{ font: `600 15px ${F_SANS}`, flex: "none" }}>⚠️</span>
        <span style={{ font: `600 13px/1.5 ${F_SANS}`, color: "var(--st-cancel-fg)" }}>
          When a rental or trial ends, you MUST rotate BOTH the <b>2FA key</b> and the <b>GoLogin share link</b> before re-renting — the renter had both. Regenerate them (LinkedIn 2FA + a fresh GoLogin share link) and paste the new values so they can be updated.
        </span>
      </div>
      {/* title + actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ maxWidth: 640 }}>
          <h1 style={{ font: `600 30px/1 ${F_GRO}`, color: "var(--text)", margin: "0 0 8px", letterSpacing: "-.02em" }}>Inventory</h1>
          <p style={{ font: `500 13.5px/1.5 ${F_SANS}`, color: "var(--muted)", margin: 0 }}>Every LinkedIn account we own — status, who&apos;s renting it, price, and the technical + verification detail behind each one.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flex: "none", alignItems: "center", flexWrap: "wrap" }}>
          <Link href="/admin/accounts/new" style={{ font: `600 13px ${F_SANS}`, color: "#fff", background: "var(--btn-primary-bg)", padding: "9px 16px", borderRadius: 10, textDecoration: "none" }}>+ Add Account</Link>
          <a href="/catalogue" target="_blank" rel="noopener noreferrer" title="Public page — share with anyone. Shows available accounts WITH pricing." style={{ font: `600 13px ${F_SANS}`, color: "var(--btn-secondary-fg)", background: "var(--btn-secondary-bg)", border: "1px solid var(--btn-secondary-border)", padding: "9px 15px", borderRadius: 10, textDecoration: "none" }}>Show accounts (with pricing) ↗</a>
          <a href="/catalogue?pricing=off" target="_blank" rel="noopener noreferrer" title="Public page — share with anyone. Shows available accounts WITHOUT pricing." style={{ font: `600 13px ${F_SANS}`, color: "var(--btn-secondary-fg)", background: "var(--btn-secondary-bg)", border: "1px solid var(--btn-secondary-border)", padding: "9px 15px", borderRadius: 10, textDecoration: "none" }}>Show accounts (no pricing) ↗</a>
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
          <span style={{ font: `600 22px ${F_GRO}`, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{counts.realTotal}</span>
          <span style={{ font: `600 12px ${F_SANS}`, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--label)" }}>accounts</span>
        </div>
        <span style={{ width: 1, height: 20, background: "var(--divider)" }} />
        {[["var(--st-active-fg)", `${counts.Available} available`], ["var(--blue-chip-text)", `${counts.Rented} rented`], ["var(--st-unreach-fg)", `${counts.Restricted} restricted`], ["var(--warn-badge-text)", `${counts.checksDue} checks due`], ["var(--muted2)", `${counts.Showcase} showcase`]].map(([dot, txt]) => (
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
          const groupRows = filtered.filter((a) => groupKey(a) === g.key);
          // Within Maintenance: surface accounts that need a 2FA rotation first
          // (they're the ones blocking a re-list), restricted ones last (they're
          // not actionable until LinkedIn clears them) — everything else stays put.
          const rows = g.key !== "Maintenance" ? groupRows : [...groupRows].sort((a, b) => {
            const rank = (x: Account) => (x.twoFactorResetNeeded ? 0 : x.restrictedAt ? 2 : 1);
            return rank(a) - rank(b);
          });
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
                {rows.map((a, idx) => {
                  const open = expanded.has(a.id);
                  // Combined-billing pairs are pre-sorted adjacent (see `filtered`) —
                  // fuse the two cards into one visual block instead of two separate
                  // cards that merely mention each other.
                  const fusedWithNext = rows[idx + 1]?.paymentLinkedAccountId === a.id;
                  const fusedWithPrev = idx > 0 && a.paymentLinkedAccountId === rows[idx - 1].id;
                  const st = canonicalStatus(a);
                  const h = healthOf(a);
                  const ti = trialInfo(a);
                  const cp = cryptoPayInfo(a, accounts);
                  const linkedPrimary = a.paymentLinkedAccountId ? accounts.find((x) => x.id === a.paymentLinkedAccountId) : null;
                  const linkedSecondaries = accounts.filter((x) => x.paymentLinkedAccountId === a.id);
                  const activeRenter = a.rentals?.[0]?.user || null;
                  const renterName = activeRenter ? activeRenter.fullName.replace(/\s*\((?:Telegram|WhatsApp)\)\s*$/i, "") : null;
                  const channel = a.paymentTelegramChatId
                    ? { icon: "✈", label: "Telegram", handle: a.paymentTelegramChatId }
                    : a.paymentWhatsapp
                    ? { icon: "💬", label: "WhatsApp", handle: a.paymentWhatsapp }
                    : null;
                  const rented = a.status === "rented" && a.rentals?.[0];
                  // Stripe rental whose charge failed: still "rented", but the
                  // renter owes the (flat monthly) locked price. Show who + how much.
                  const rentalRow = a.rentals?.[0];
                  const overdue = !!rentalRow && rentalRow.status === "payment_failed";
                  const overdueAmt = overdue ? (rentalRow!.lockedPrice != null && Number(rentalRow!.lockedPrice) > 0 ? Number(rentalRow!.lockedPrice) : Number(a.monthlyPrice)) : 0;
                  const overdueDays = overdue && rentalRow!.updatedAt ? Math.max(0, Math.floor((Date.now() - new Date(rentalRow!.updatedAt).getTime()) / 86400000)) : 0;
                  const locked = rented && a.rentals[0].lockedPrice != null && Number(a.rentals[0].lockedPrice) > 0;
                  const priceVal = locked ? Number(a.rentals[0].lockedPrice) : Number(a.monthlyPrice);
                  const forRentOn = a.status === "available" || a.status === "rented";
                  const fuseBorder = "1.5px solid var(--blue-chip-text)";
                  return (
                    <div key={a.id} style={{
                      background: fusedWithNext || fusedWithPrev ? "var(--blue-chip-bg)" : "var(--card)",
                      border: fusedWithNext || fusedWithPrev ? fuseBorder : "1px solid var(--card-border)",
                      borderTop: fusedWithPrev ? "none" : undefined,
                      borderBottom: fusedWithNext ? "none" : undefined,
                      borderTopLeftRadius: fusedWithPrev ? 0 : 14, borderTopRightRadius: fusedWithPrev ? 0 : 14,
                      borderBottomLeftRadius: fusedWithNext ? 0 : 14, borderBottomRightRadius: fusedWithNext ? 0 : 14,
                      marginTop: fusedWithPrev ? -10 : 0,
                      overflow: "hidden", boxShadow: "var(--card-shadow)", position: "relative",
                    }}>
                      {fusedWithNext && (
                        <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 18px", background: "var(--blue-chip-bg)", borderBottom: `1px dashed var(--blue-chip-text)`, font: `700 10.5px ${F_SANS}`, letterSpacing: ".03em", color: "var(--blue-chip-text)" }}>
                          🔗 SAME RENTER — ONE COMBINED PAYMENT{a.paymentTelegramChatId ? ` · ✈ ${a.paymentTelegramChatId}` : a.paymentWhatsapp ? ` · 💬 ${a.paymentWhatsapp}` : ""}
                        </div>
                      )}
                      {/* primary row */}
                      <div onClick={() => toggle(a.id)} style={{ display: "grid", gridTemplateColumns: GRID, gap: 16, alignItems: "center", padding: "15px 18px", cursor: "pointer", userSelect: "none" }}>
                        <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 12 }}>
                          <span style={{ font: `600 12px ${F_SANS}`, color: "var(--muted)", width: 12, textAlign: "center", flex: "none", transform: open ? "rotate(90deg)" : "none", transition: "transform .18s" }}>▸</span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4 }}>
                              <span style={{ font: `600 14px ${F_SANS}`, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.linkedinName}</span>
                              {isDummy(a) && <span title="Showcase / demo account — not real inventory" style={{ font: `700 9px ${F_SANS}`, letterSpacing: ".06em", padding: "2px 7px", borderRadius: 5, flex: "none", background: "var(--warn-badge-bg)", color: "var(--warn-badge-text)" }}>DUMMY</span>}
                              <button onClick={(e) => { e.stopPropagation(); toggleVerified(a); }} title="LinkedIn verified — click to toggle"
                                style={{ font: `600 10px ${F_SANS}`, padding: "2px 8px", borderRadius: 6, whiteSpace: "nowrap", border: "none", cursor: "pointer", ...(a.linkedinVerified ? { background: "var(--verified-bg, var(--blue-chip-bg))", color: "var(--verified-fg, var(--blue-chip-text))" } : { background: "var(--neutral-chip-bg)", color: "var(--neutral-chip-text)" }) }}>{a.linkedinVerified ? "✓ Verified" : "Verify"}</button>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, font: `500 11.5px ${F_SANS}`, color: "var(--muted)" }}>
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.linkedinHeadline || "—"}</span>
                              {a.location && <><span style={{ color: "var(--muted2)" }}>·</span><span style={{ whiteSpace: "nowrap" }}>{a.location}</span></>}
                              {a.connectionCount > 0 && <><span style={{ color: "var(--muted2)" }}>·</span><span style={{ whiteSpace: "nowrap" }}>{formatNumber(a.connectionCount)}</span></>}
                              {a.accountAgeMonths != null && <><span style={{ color: "var(--muted2)" }}>·</span><span style={{ whiteSpace: "nowrap" }} title="Account age">⏳ {a.accountAgeMonths >= 12 ? `${Math.floor(a.accountAgeMonths / 12)}y${a.accountAgeMonths % 12 ? ` ${a.accountAgeMonths % 12}m` : ""}` : `${a.accountAgeMonths}m`}</span></>}
                            </div>
                            <div style={{ marginTop: 3, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                              {profileEmailOf(a) && <span style={{ font: `500 11px ${F_GRO}`, color: "var(--muted2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>✉ {profileEmailOf(a)}</span>}
                              {a.linkedinUrl && (
                                <a href={a.linkedinUrl.startsWith("http") ? a.linkedinUrl : `https://${a.linkedinUrl}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} title={a.linkedinUrl} style={{ font: `600 11px ${F_SANS}`, color: "var(--link)", textDecoration: "none", whiteSpace: "nowrap", flex: "none" }}>↗ LinkedIn</a>
                              )}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-start" }}>
                          <span style={{ font: `600 11px ${F_SANS}`, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap", ...statusChip(st) }}>{st}</span>
                          {a.restrictedAt && st !== "Restricted" && <span title={`LinkedIn-restricted — ${fmtS(a.restrictedAt)}`} style={{ font: `600 10px ${F_SANS}`, padding: "2px 8px", borderRadius: 999, whiteSpace: "nowrap", background: "var(--st-cancel-bg)", color: "var(--st-cancel-fg)" }}>⚠ Restricted</span>}
                          {!a.restrictedAt && (() => { const rr = recentRestrict(a); return rr ? <span title={`Restricted ${rr.times}× — most recent ${rr.daysAgo === 0 ? "today" : `${rr.daysAgo}d ago`}. Recovered but still fragile — go easy: no activity bursts, verify the proxy is clean PH residential.`} style={{ font: `600 10px ${F_SANS}`, padding: "2px 8px", borderRadius: 999, whiteSpace: "nowrap", background: "var(--warn-badge-bg)", color: "var(--warn-badge-text)" }}>⚠ Recently restricted{rr.times > 1 ? ` ${rr.times}×` : ""}</span> : null; })()}
                          {h.note && <span style={{ font: `500 10.5px ${F_SANS}`, color: "var(--muted2)" }}>{h.note}</span>}
                          {checkDue(a) && <span title="Rented account — last health check is over a week old" style={{ font: `600 10px ${F_SANS}`, padding: "2px 8px", borderRadius: 999, whiteSpace: "nowrap", background: "var(--warn-badge-bg)", color: "var(--warn-badge-text)" }}>⏱ Check due</span>}
                          {a.twoFactorResetNeeded && <span title="The last renter had this account's 2FA code — rotate it before making this account available again" style={{ font: `600 10px ${F_SANS}`, padding: "2px 8px", borderRadius: 999, whiteSpace: "nowrap", background: "var(--st-cancel-bg)", color: "var(--st-cancel-fg)" }}>🔑 2FA reset needed</span>}
                          {linkedPrimary && <span title={`This account's own payment status mirrors ${linkedPrimary.linkedinName} — same renter, one combined payment`} style={{ font: `600 10px ${F_SANS}`, padding: "2px 8px", borderRadius: 999, whiteSpace: "nowrap", background: "var(--blue-chip-bg)", color: "var(--blue-chip-text)" }}>🔗 combined with {linkedPrimary.linkedinName}</span>}
                          {linkedSecondaries.length > 0 && <span title={`${linkedSecondaries.map((s) => s.linkedinName).join(", ")} pays together with this account — check them as one`} style={{ font: `600 10px ${F_SANS}`, padding: "2px 8px", borderRadius: 999, whiteSpace: "nowrap", background: "var(--blue-chip-bg)", color: "var(--blue-chip-text)" }}>🔗 combined with {linkedSecondaries.map((s) => s.linkedinName).join(", ")}</span>}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          {locked ? (
                            <>
                              <span style={{ font: `600 15px ${F_GRO}`, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{priceVal > 0 ? `$${priceVal.toFixed(0)}` : "TBC"}</span>
                              <span style={{ font: `500 10px ${F_SANS}`, color: "var(--warn-badge-text)" }}>🔒 locked rate</span>
                            </>
                          ) : (() => {
                            const t = tierPricing(a.connectionCount, a.accountAgeMonths, a.hasSalesNav);
                            return (
                              <>
                                <span style={{ font: `600 15px ${F_GRO}`, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{money(t.monthly)}<span style={{ font: `500 10px ${F_SANS}`, color: "var(--label)" }}>/mo</span>{a.hasSalesNav && <span style={{ font: `700 9px ${F_SANS}`, color: "#0A66C2", marginLeft: 4 }}>+SN</span>}</span>
                                <span style={{ font: `500 10.5px ${F_SANS}`, color: "var(--muted2)", whiteSpace: "nowrap" }}>{money(t.weekly)}/wk · {money(t.daily)}/day</span>
                              </>
                            );
                          })()}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                          <span title={activeRenter?.email || undefined} style={{ font: `600 13px ${F_SANS}`, color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {renterName || (ti ? "On trial" : channel ? "Off-platform renter" : (a.status === "rented" || a.status === "trial") ? "Rented — no renter on file" : "No renter")}
                          </span>
                          {channel && (
                            <span title={`${channel.label}: ${channel.handle}`} style={{ font: `500 10.5px ${F_SANS}`, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{channel.icon} {channel.label} · {channel.handle}</span>
                          )}
                          {ti ? (
                            <span style={{ font: `600 11px ${F_SANS}`, color: ti.expired ? "var(--st-cancel-fg)" : "var(--warn-badge-text)" }}>{ti.expired ? "⏱ Trial expired" : `⏱ ${ti.label}`}</span>
                          ) : rented ? (
                            <span style={{ font: `500 11px ${F_SANS}`, color: a.rentals[0].autoRenew ? "var(--st-active-fg)" : "var(--muted2)" }}>{fmtS(a.rentals[0].currentPeriodEnd)} · {a.rentals[0].autoRenew ? "auto-renews" : "no auto-renew"}</span>
                          ) : (
                            <span style={{ font: `500 11px ${F_SANS}`, color: "var(--muted2)" }}>{a.status === "rented" ? "rented (off-platform)" : a.status}</span>
                          )}
                          {overdue && (
                            <span title={`Stripe charge failed${rentalRow!.updatedAt ? ` on ${fmtS(rentalRow!.updatedAt)}` : ""} — renter owes the locked monthly price`} style={{ font: `700 11px ${F_SANS}`, color: "var(--st-cancel-fg)", whiteSpace: "nowrap" }}>⚠ Overdue ${overdueAmt.toFixed(0)}{overdueDays > 0 ? ` · ${overdueDays}d late` : " · just failed"}</span>
                          )}
                        </div>
                        {/* Payment column */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                          {cp ? (
                            <>
                              <span style={{ display: "flex", alignItems: "center", gap: 5, alignSelf: "flex-start" }}>
                                <span title={cp.manual ? "Manual — you confirm payments (assumed overdue until marked paid)" : "Payment status — from on-chain payments checked daily"} style={{ font: `700 9.5px ${F_SANS}`, letterSpacing: ".05em", textTransform: "uppercase", padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap", ...payChipCss(cp.state) }}>{cp.statusLabel}</span>
                                {cp.manual && <span title="Manually tracked" style={{ font: `700 8.5px ${F_SANS}`, letterSpacing: ".06em", color: "var(--muted)", border: "1px solid var(--card-border)", borderRadius: 4, padding: "1px 5px", whiteSpace: "nowrap" }}>MANUAL</span>}
                              </span>
                              <span style={{ font: `600 11.5px ${F_SANS}`, color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cp.terms}{cp.network ? ` · ${cp.network}` : ""}</span>
                              {cp.dueLabel && <span style={{ font: `500 10.5px ${F_SANS}`, whiteSpace: "nowrap", color: cp.state === "overdue" ? "var(--st-cancel-fg)" : "var(--muted2)" }}>{cp.dueLabel}</span>}
                              {cp.address && <span title={`Expecting payment into ${cp.address}`} onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(cp.address); }} style={{ font: `500 10px ${F_GRO}`, color: "var(--muted2)", whiteSpace: "nowrap", cursor: "copy" }}>⌖ {shortAddr(cp.address)}</span>}
                              {cp.lastLabel && <span style={{ font: `500 10px ${F_SANS}`, color: "var(--muted2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cp.lastLabel}</span>}
                              {cp.manual && (
                                <button onClick={(e) => { e.stopPropagation(); markManualPaid(a, cp.state !== "settled"); }} disabled={busy === a.id} style={{ ...outBtn(cp.state === "settled" ? "var(--muted)" : "var(--st-active-fg)"), padding: "4px 9px", font: `600 10.5px ${F_SANS}`, marginTop: 2, alignSelf: "flex-start" }}>
                                  {cp.state === "settled" ? "Mark unpaid" : "✓ Mark paid"}
                                </button>
                              )}
                            </>
                          ) : (
                            <span style={{ font: `500 11px ${F_SANS}`, color: "var(--muted2)" }}>{rented ? "on-platform" : "—"}</span>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10 }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                            <button onClick={() => toggleForRent(a)} disabled={a.status === "rented" || a.status === "trial"} title={a.status === "trial" ? "On trial — cancel the trial to change availability" : undefined} style={{ position: "relative", width: 38, height: 22, borderRadius: 999, border: "none", cursor: a.status === "rented" || a.status === "trial" ? "not-allowed" : "pointer", padding: 0, background: forRentOn ? "var(--sheets-btn-bg)" : "var(--toggle-off)", opacity: a.status === "rented" || a.status === "trial" ? 0.6 : 1 }}>
                              <span style={{ position: "absolute", top: 3, left: forRentOn ? 19 : 3, width: 16, height: 16, borderRadius: 999, background: "#fff", transition: "left .15s", display: "block" }} />
                            </button>
                            <span style={{ font: `500 9.5px ${F_SANS}`, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted2)" }}>For rent</span>
                          </div>
                          {a.status === "available" && !isDummy(a) && (
                            <button onClick={() => markForTrial(a)} disabled={busy === a.id} title="Put this account on a 3-day trial hold (removes it from Available)" style={secBtn}>⏱ Trial</button>
                          )}
                          {ti && (ti.expired
                            ? <button onClick={() => endTrial(a)} disabled={busy === a.id} title="Trial has ended — return the account to Available" style={outBtn("var(--st-active-fg)")}>Mark available</button>
                            : <button onClick={() => endTrial(a)} disabled={busy === a.id} title="End this trial early and return to Available" style={secBtn}>Cancel trial</button>
                          )}
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
                            <DField label="Work email (klabber)">{a.workEmail || "—"}</DField>
                            <DField label="Password"><PasswordField password={a.accountPassword} /></DField>
                            <DField label="2FA (key + code)"><TwoFactorCode accountId={a.id} /></DField>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                              <span style={labelCss}>Account opened (sets age)</span>
                              <input type="month" defaultValue={a.accountAgeMonths != null ? (() => { const d = new Date(); d.setMonth(d.getMonth() - a.accountAgeMonths); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; })() : ""} onBlur={(e) => saveAge(a, e.target.value)} style={{ ...modalInput, font: `500 12.5px ${F_SANS}` }} />
                              <span style={{ font: `500 11px ${F_GRO}`, color: "var(--muted2)" }}>{a.accountAgeMonths ? `Age ${Math.floor(a.accountAgeMonths / 12)}y ${a.accountAgeMonths % 12}m` : "Age not set"} · SN {a.hasSalesNav ? "Yes" : "No"} · Listed {a.listed ? "Yes" : "No"}</span>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: "span 2", minWidth: 0 }}>
                              <span style={labelCss}>Notes (private){savingProof === a.id ? " · saving…" : ""}</span>
                              <textarea defaultValue={a.verificationProof || ""} placeholder="Notes — restriction reasons, verification/proof links, anything about this account…" onBlur={(e) => saveProof(a, e.target.value.trim())} style={{ width: "100%", minHeight: 52, resize: "vertical", ...modalInput, font: `500 12.5px ${F_SANS}` }} />
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
                              {Array.isArray(a.restrictionLog) && a.restrictionLog.length > 0 && (() => {
                                const log = [...a.restrictionLog].sort((x, y) => y.at.localeCompare(x.at));
                                const times = log.filter((e) => e.event === "restricted").length;
                                return (
                                  <div style={{ marginTop: 4, border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", background: "var(--card2, var(--bg2))" }}>
                                    <div style={{ font: `700 11px ${F_GRO}`, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>
                                      Restriction history{times > 1 ? ` · restricted ${times}×` : ""}
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                                      {log.map((e, i) => (
                                        <div key={i} style={{ display: "flex", gap: 8, alignItems: "baseline", font: `500 12px ${F_SANS}` }}>
                                          <span title={new Date(e.at).toLocaleString()} style={{ color: "var(--muted2)", whiteSpace: "nowrap", minWidth: 52 }}>{fmtS(e.at)}</span>
                                          <span style={{ color: e.event === "restricted" ? "var(--st-cancel-fg)" : "var(--st-active-fg)", fontWeight: 700, whiteSpace: "nowrap" }}>{e.event === "restricted" ? "⚠ Restricted" : "✓ Recovered"}</span>
                                          <span style={{ color: "var(--fg)", minWidth: 0 }}>{e.note || ""}{e.creditedDays ? `${e.note ? " · " : ""}credited ${e.creditedDays}d` : ""}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })()}
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
