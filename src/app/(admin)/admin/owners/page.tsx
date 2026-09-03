"use client";

import { useCallback, useEffect, useState } from "react";
import { formatName } from "@/lib/utils";
import { type Currency, currencyConfig, formatMoney } from "@/lib/referral-currency";

const F_SANS = "var(--font-sans),system-ui,sans-serif";
const F_GRO = "var(--font-grotesk),system-ui,sans-serif";

// Ambassador payouts follow the referrer's currency (PH ₱1,000 setup / ₱500 mo; non-PH
// USD $16 / $8 — see lib/referral-currency). Per-owner amounts use the owner's own
// currency (a per-owner `money()` helper); totals below are split by currency.
// Totals span owners of different currencies, which can't be summed — render each present.
const fmtByCur = (rec: Record<Currency, number>) =>
  (["PHP", "USD"] as Currency[]).filter((c) => rec[c] > 0).map((c) => formatMoney(rec[c], c)).join(" · ") || formatMoney(0, "PHP");
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

// Setup fee is due 24h after we log into the account (onboardedAt = the login moment),
// rolled to the next business day. The 3-day/1-week warm-up happens before login, so it
// no longer factors into the setup date.
const setupDueDate = (onboardedAt: string | null): Date | null => {
  if (!onboardedAt) return null;
  const d = new Date(onboardedAt);
  d.setDate(d.getDate() + 1);
  return nextBusinessDay(d);
};
// Warm-up window before we log in: 3 days established, 1 week fresh, from onboarding start.
const loginDueDate = (onboardingStartedAt: string | null, freshness: string | null): Date | null => {
  if (!onboardingStartedAt) return null;
  const d = new Date(onboardingStartedAt);
  d.setDate(d.getDate() + (freshness === "fresh" ? 7 : 3));
  return nextBusinessDay(d);
};

// Monthly ₱500 begins the first FULL month after the setup fee is PAID, on a 15th-of-
// month cutoff (paid 1st–15th → next month; 16th–end → the month after), then the 1st
// of every month (next business day). idx (0-based) advances by a month. Manila time
// so the cutoff matches the team's wall clock. Null until the setup fee is paid.
const monthlyDueDate = (setupPaidAt: string | null, idx: number): Date | null => {
  if (!setupPaidAt) return null;
  const m = new Date(new Date(setupPaidAt).getTime() + 8 * 3600 * 1000);
  const add = m.getUTCDate() <= 15 ? 1 : 2;
  return nextBusinessDay(new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + add + idx, 1, 12)));
};
// The setup-paid date that anchors the monthly schedule: the "setup" payout entry, else legacy.
const setupPaidAtOf = (o: { monthlyPayouts: MonthlyPayout[]; setupFeePaidAt: string | null }): string | null => {
  const s = o.monthlyPayouts.find((p) => p.kind === "setup" && p.paidAt);
  return s?.paidAt || o.setupFeePaidAt || null;
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
// Owner stage: Active (live & working) / Waiting on us (our move to finish
// setup) / Waiting on them (blocked on the owner — creds / 2FA / restriction) /
// Paused / Lost. All five are set by hand via the Status dropdown; when none is
// set we auto-suggest one (a blocker → Waiting on them, a live account →
// Active, else Waiting on us), but a manual pick always wins.
type OwnerStatus = "active" | "waiting_us" | "waiting_them" | "paused" | "lost";
const MANUAL_STATUSES: OwnerStatus[] = ["active", "waiting_us", "waiting_them", "paused", "lost"];
const STATUS_META: Record<OwnerStatus, { label: string; bg: string; fg: string }> = {
  active: { label: "Active", bg: "var(--st-active-bg)", fg: "var(--st-active-fg)" },
  waiting_us: { label: "Waiting on us", bg: "var(--warn-badge-bg)", fg: "var(--warn-badge-text)" },
  waiting_them: { label: "Waiting on them", bg: "var(--st-unreach-bg)", fg: "var(--st-unreach-fg)" },
  paused: { label: "Paused", bg: "var(--neutral-chip-bg)", fg: "var(--neutral-chip-text)" },
  lost: { label: "Lost", bg: "var(--st-cancel-bg)", fg: "var(--st-cancel-fg)" },
};
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
  restrictedAt: string | null;
}

interface MonthlyPayout {
  paidAt: string;
  amount: number;
  note?: string | null;
  accountId?: string | null;
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
  currency: Currency;
  dueDate: string;
  overdue: boolean;
  blocked: string | null;
}
interface MarketerDue { name: string; count: number; amount: number; currency: Currency; }
interface PaymentsDue {
  setup: DueItem[];
  monthly: DueItem[];
  upcoming: DueItem[];
  marketers: MarketerDue[];
  totalDueNow: number;
  totalsByCurrency: Record<Currency, number>;
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
  onboardingStartedAt: string | null;
  onboardedAt: string | null;
  verifiedAt: string | null;
  accountFreshness: string | null;
  referredBy: string | null;
  accounts: OwnerAccount[];
}

// Manually-set owner status wins; otherwise fall back to the pipeline-derived one.
// A profile counts as live once its account is available or rented.
const hasLiveAccount = (o: Owner): boolean => o.accounts.some((a) => a.status === "available" || a.status === "rented");
// Auto-suggested stage when nothing is set by hand: a login/account blocker →
// waiting on the owner, a live account → Active, otherwise the ball's on us.
const autoStatus = (o: Owner): OwnerStatus => (o.accountIssue ? "waiting_them" : hasLiveAccount(o) ? "active" : "waiting_us");
const isManualStatus = (o: Owner): boolean => !!o.ownerStatus && (MANUAL_STATUSES as string[]).includes(o.ownerStatus);
// Manual status always wins over the auto suggestion.
const resolveStatus = (o: Owner): OwnerStatus => (isManualStatus(o) ? (o.ownerStatus as OwnerStatus) : autoStatus(o));

// A restricted account (LinkedIn restricted the profile) is put ON HOLD — we don't
// pay its setup fee or its monthly while it's down, so it drops out of the amounts
// we owe this owner until it recovers (clear the flag to bring it back).
const isRestricted = (a: { restrictedAt?: string | null }) => !!a.restrictedAt;
// What the owner is actually paid monthly = only their live (non-held) accounts.
const payableMonthly = (o: Owner) => o.accounts.reduce((s, a) => s + (isRestricted(a) ? 0 : Number(a.ambassadorPayment || 0)), 0);

// Setup fees are one-off, ₱1,000 per account under an owner. We work out each
// account's own setup state — paid / due / on-hold — so a grouped owner shows the
// truth per account (paid stays paid even if the account is later restricted; an
// unpaid restricted account is on hold, not "owed"). Attribution: a setup payout
// tagged with an accountId marks THAT account paid; older untagged payouts (and the
// legacy single paidAt flag) are matched to accounts positionally, in order.
type SetupState = "paid" | "due" | "hold";
const setupBreakdown = (o: Owner) => {
  const setupPayouts = o.monthlyPayouts.filter((p) => p.kind === "setup");
  const paidIds = new Set<string>();
  let legacyPaid = 0;
  for (const p of setupPayouts) {
    if (p.accountId && o.accounts.some((a) => a.id === p.accountId)) paidIds.add(p.accountId);
    else legacyPaid++;
  }
  // Legacy single-flag owners (paid before the structured record existed).
  if (o.setupFeePaidAt && setupPayouts.length === 0) legacyPaid += 1;

  const state = new Map<string, SetupState>();
  for (const a of o.accounts) if (paidIds.has(a.id)) state.set(a.id, "paid");
  for (const a of o.accounts) { // spread remaining legacy-paid slots over untagged accounts in order
    if (state.has(a.id)) continue;
    if (legacyPaid > 0) { state.set(a.id, "paid"); legacyPaid--; }
  }
  for (const a of o.accounts) if (!state.has(a.id)) state.set(a.id, isRestricted(a) ? "hold" : "due");

  let paidN = 0, dueN = 0, holdN = 0;
  for (const a of o.accounts) { const s = state.get(a.id); if (s === "paid") paidN++; else if (s === "due") dueN++; else holdN++; }
  const nextDue = o.accounts.find((a) => state.get(a.id) === "due") || null;
  return { state, paidN, dueN, holdN, total: o.accounts.length, restrictedCount: holdN, nextDueName: nextDue?.linkedinName || null, nextDueId: nextDue?.id || null };
};

// The stage the owner rolls up under — the onboarding pipeline, so pre-onboarded
// accounts (accepted / warming up) are visible before they go live, and finished ones
// land in Active. Paused/Lost is the terminal bucket (manual override wins).
type Stage = "accepted" | "onboarding" | "active" | "inactive";
const stageOf = (o: Owner): Stage => {
  const m = o.ownerStatus; // manual override
  if (m === "paused" || m === "lost") return "inactive";
  // Active = we've actually PAID (setup fee logged) — or the account is live/rented,
  // or a manual "active" override. Logging in alone is NOT active: a logged-in owner
  // we haven't paid yet stays under Onboarding until the setup fee is marked paid.
  if (m === "active" || !!setupPaidAtOf(o) || hasLiveAccount(o)) return "active";
  if (o.onboardedAt || o.applicationStatus === "onboarding" || o.onboardingStartedAt) return "onboarding"; // logged in / warming up, not yet paid
  return "accepted";                                          // agreed, not started
};
const GROUP_DEFS: { key: Stage; label: string; dot: string; note: string }[] = [
  { key: "accepted", label: "Accepted", dot: "var(--warn-badge-text)", note: "agreed — not started" },
  { key: "onboarding", label: "Onboarding", dot: "var(--st-replied-fg)", note: "warming up / logged in · awaiting setup payment" },
  { key: "active", label: "Active", dot: "var(--st-active-fg)", note: "paid — earning" },
  { key: "inactive", label: "Paused / Lost", dot: "var(--st-cancel-fg)", note: "no longer active" },
];

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
  const [stage, setStage] = useState<"all" | Stage>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  // "Ok to pay" is a check-right-before-you-pay confirmation, independent per row
  // (setup vs monthly). Session-only — you re-verify the account before each payout.
  const [okToPay, setOkToPay] = useState<Set<string>>(new Set());
  // Per-profile credential rows and per-stage group sections are independently
  // collapsible. Groups default open; profile credential drawers default closed.
  const [profileOpen, setProfileOpen] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [due, setDue] = useState<PaymentsDue | null>(null);
  const [dueOpen, setDueOpen] = useState(false);
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
  const toggleProfile = (key: string) => setProfileOpen((p) => { const n = new Set(p); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  const toggleGroup = (key: string) => setCollapsedGroups((p) => { const n = new Set(p); if (n.has(key)) n.delete(key); else n.add(key); return n; });

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
  const stageCounts: Record<"all" | Stage, number> = { all: owners.length, accepted: 0, onboarding: 0, active: 0, inactive: 0 };
  for (const o of owners) stageCounts[stageOf(o)]++;
  const STAGE_CHIPS: { key: "all" | Stage; label: string; dot: string | null }[] = [
    { key: "all", label: "All owners", dot: null },
    ...GROUP_DEFS.map((g) => ({ key: g.key, label: g.label, dot: g.dot })),
  ];
  const shown = owners.filter(
    (o) =>
      (stage === "all" || stageOf(o) === stage) &&
      (!q || `${o.fullName} ${o.email} ${o.payoutName || ""} ${o.paymentMethod || ""} ${o.accounts.map((a) => a.linkedinName).join(" ")} ${resolveStatus(o)}`.toLowerCase().includes(q))
  );
  // Group the visible owners under their stage, following the action-first order.
  const groups = GROUP_DEFS.map((g) => ({ ...g, owners: shown.filter((o) => stageOf(o) === g.key) })).filter((g) => g.owners.length > 0);
  // Only Active owners actually cost us monthly — Offline/Paused/Lost aren't being
  // paid — and within an owner, restricted (on-hold) accounts drop out.
  // Monthly commitment + outstanding setup fees, split by owner currency (₱ can't be
  // summed with $). setupsOutstanding is the plain unpaid COUNT (for the hint).
  const totalMonthly: Record<Currency, number> = { PHP: 0, USD: 0 };
  for (const o of owners) if (resolveStatus(o) === "active") totalMonthly[currencyConfig(o.referredBy).currency] += payableMonthly(o);
  const totalMonthlySum = totalMonthly.PHP + totalMonthly.USD;
  const setupOutAmt: Record<Currency, number> = { PHP: 0, USD: 0 };
  let setupsOutstanding = 0;
  for (const o of owners) {
    const n = setupBreakdown(o).dueN;
    if (n > 0) { setupsOutstanding += n; setupOutAmt[currencyConfig(o.referredBy).currency] += n * currencyConfig(o.referredBy).setupAmount; }
  }
  const blockedCount = owners.filter((o) => o.accountIssue || o.accounts.some(isRestricted)).length;
  const heldAccountCount = owners.reduce((s, o) => s + o.accounts.filter(isRestricted).length, 0);
  const profileCount = owners.reduce((s, o) => s + o.accounts.length, 0);
  const allOpen = shown.length > 0 && shown.every((o) => expanded.has(o.email));
  const toggleAll = () => setExpanded(allOpen ? new Set() : new Set(shown.map((o) => o.email)));

  return (
    <div>
      {/* title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ maxWidth: 720 }}>
          <h1 style={{ font: `600 30px/1 ${F_GRO}`, color: "var(--text)", margin: "0 0 8px", letterSpacing: "-.02em" }}>Account owners</h1>
          <p style={{ font: `500 13.5px/1.5 ${F_SANS}`, color: "var(--muted)", margin: 0 }}>
            Ambassadors who supply profiles, grouped by onboarding stage — Accepted and Onboarding (warming up) sit above Active so you can see accounts before they go live. Expand an owner for their status, credentials, payout method, and the full payment record — proof of each payout and whether they&apos;ve acknowledged it.
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
            <div style={{ font: `600 13px ${F_SANS}`, color: "var(--muted)" }}>{owners.length} owner{owners.length !== 1 ? "s" : ""} · {profileCount} profile{profileCount !== 1 ? "s" : ""}</div>
            {totalMonthlySum > 0 && <div style={{ font: `600 13px ${F_SANS}`, color: "var(--muted2)", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{fmtByCur(totalMonthly)}/mo · active</div>}
          </div>
        </div>
      </div>

      {/* money strip + payments-due detail */}
      {due && (() => {
        // Every dated payout — due now AND coming up within the horizon — as a row,
        // sorted soonest-first, each with a relative "in N days" pill.
        const rows = [...due.setup, ...due.monthly, ...due.upcoming].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
        const overdueCount = rows.filter((r) => r.overdue).length;
        const blockedDueCount = rows.filter((r) => r.blocked).length;
        const dueNowCount = due.setup.length + due.monthly.length + due.marketers.length;
        const upcomingCount = due.upcoming.length;
        const nothing = rows.length === 0 && due.marketers.length === 0;
        // Three compact figures across the top, mirroring the design's money strip.
        const strip = [
          { label: "Setup fees outstanding", value: fmtByCur(setupOutAmt), hint: `${setupsOutstanding} unpaid`, color: setupsOutstanding ? "var(--warn-badge-text)" : "var(--text)" },
          { label: "Monthly commitment", value: `${fmtByCur(totalMonthly)}/mo`, hint: "active owners only", color: "var(--text)" },
          { label: "Blocked — can't pay", value: String(blockedCount), hint: heldAccountCount > 0 ? `${heldAccountCount} account${heldAccountCount !== 1 ? "s" : ""} on hold` : "login / restriction issues", color: blockedCount ? "var(--st-cancel-fg)" : "var(--text)" },
        ];
        let dueLine: React.ReactNode;
        if (nothing) dueLine = "Nothing due right now";
        else if (dueNowCount === 0 && upcomingCount > 0) dueLine = `${upcomingCount} coming up this week`;
        else dueLine = <><strong style={{ color: "var(--text)" }}>{fmtByCur(due.totalsByCurrency)}</strong> due now · {dueNowCount} payout{dueNowCount !== 1 ? "s" : ""}{overdueCount > 0 ? ` · ${overdueCount} overdue` : ""}{blockedDueCount > 0 ? ` · ${blockedDueCount} blocked` : ""}</>;
        return (
          <div style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 14, overflow: "hidden", marginBottom: 20, boxShadow: "var(--card-shadow)" }}>
            <div style={{ display: "flex", alignItems: "stretch", flexWrap: "wrap" }}>
              {strip.map((s, i) => (
                <div key={i} style={{ flex: "1 1 180px", padding: "14px 18px", borderRight: "1px solid var(--divider)" }}>
                  <div style={{ font: `700 9.5px ${F_SANS}`, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--label)", marginBottom: 5 }}>{s.label}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ font: `600 19px/1 ${F_GRO}`, color: s.color, fontVariantNumeric: "tabular-nums" }}>{s.value}</span>
                    <span style={{ font: `500 11.5px ${F_SANS}`, color: "var(--muted)" }}>{s.hint}</span>
                  </div>
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 18px", flex: "none" }}>
                {!nothing && (
                  <button type="button" onClick={() => setDueOpen((o) => !o)} title="Show what's due now" style={{ display: "inline-flex", alignItems: "center", gap: 7, font: `600 12.5px ${F_SANS}`, color: "var(--link)", background: "transparent", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
                    <span style={{ font: `600 10px ${F_SANS}`, transform: dueOpen ? "rotate(90deg)" : "none", transition: "transform .18s" }}>▸</span>{dueLine}
                  </button>
                )}
                <button type="button" onClick={emailMilee} disabled={emailState === "sending"} style={{ ...darkBtn, flex: "none", opacity: emailState === "sending" ? 0.6 : 1 }}>
                  {emailState === "sending" ? "Sending…" : emailState === "sent" ? "✓ Sent to Milee" : emailState === "error" ? "Failed — retry" : "✉ Email Milee"}
                </button>
              </div>
            </div>
            {!nothing && dueOpen && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "14px 16px 16px", borderTop: "1px solid var(--divider)" }}>
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
                      <span style={{ font: `700 15px ${F_GRO}`, color: i.blocked ? "var(--muted2)" : "var(--text)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", textDecoration: i.blocked ? "line-through" : "none" }}>{formatMoney(i.amount, i.currency)}</span>
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
                    <span style={{ font: `700 15px ${F_GRO}`, color: "var(--text)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{formatMoney(m.amount, m.currency)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* stage filter chips */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {STAGE_CHIPS.map((c) => {
          const on = stage === c.key;
          return (
            <button key={c.key} type="button" onClick={() => setStage(c.key)}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", font: `600 12.5px ${F_SANS}`, padding: "8px 14px", borderRadius: 999, border: "1px solid", background: on ? "var(--blue-chip-bg)" : "transparent", color: on ? "var(--blue-chip-text)" : "var(--muted)", borderColor: on ? "transparent" : "var(--btn-secondary-border)" }}>
              {c.dot && <span style={{ width: 7, height: 7, borderRadius: 999, flex: "none", background: c.dot }} />}
              {c.label}
              <span style={{ font: `700 11px ${F_GRO}`, fontVariantNumeric: "tabular-nums", padding: "1px 6px", borderRadius: 6, background: "var(--band)", color: "var(--muted)" }}>{stageCounts[c.key]}</span>
            </button>
          );
        })}
      </div>

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
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          {groups.map((g) => {
            const gCollapsed = collapsedGroups.has(g.key);
            const subtotalByCur: Record<Currency, number> = { PHP: 0, USD: 0 };
            for (const o of g.owners) subtotalByCur[currencyConfig(o.referredBy).currency] += payableMonthly(o);
            const subtotal = subtotalByCur.PHP + subtotalByCur.USD;
            return (
              <div key={g.key}>
                {/* group header */}
                <div onClick={() => toggleGroup(g.key)} style={{ display: "flex", alignItems: "center", gap: 11, padding: "0 4px 11px", cursor: "pointer", userSelect: "none", borderBottom: "1px solid var(--divider)", marginBottom: 14 }}>
                  <span style={{ font: `600 11px ${F_SANS}`, color: "var(--muted2)", width: 11, transition: "transform .18s ease", transform: gCollapsed ? "none" : "rotate(90deg)" }}>▸</span>
                  <span style={{ width: 8, height: 8, borderRadius: 999, flex: "none", background: g.dot }} />
                  <span style={{ font: `600 15px ${F_GRO}`, color: "var(--text)" }}>{g.label}</span>
                  <span style={{ font: `700 11px ${F_GRO}`, fontVariantNumeric: "tabular-nums", padding: "2px 8px", borderRadius: 7, background: "var(--band)", color: "var(--muted)" }}>{g.owners.length}</span>
                  <span style={{ font: `500 12px ${F_SANS}`, color: "var(--muted2)", flex: 1 }}>{g.note}</span>
                  <span style={{ font: `600 13px ${F_GRO}`, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{subtotal > 0 ? `${fmtByCur(subtotalByCur)}/mo` : "—"}</span>
                </div>
                {!gCollapsed && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {g.owners.map((owner) => {
            const open = expanded.has(owner.email);
            const missing = missingFields(owner);
            const setupPaid = fmtDate(owner.setupFeePaidAt);
            const monthlyOnly = owner.monthlyPayouts.filter((p) => p.kind !== "setup");
            const monthlyCount = monthlyOnly.length;
            const setupDue = setupDueDate(owner.onboardedAt);
            const nextMonthlyDue = monthlyDueDate(setupPaidAtOf(owner), monthlyCount);
            // Payout currency follows the referrer who signed this owner up (PH ₱ / non-PH USD).
            const cfg = currencyConfig(owner.referredBy);
            const money = (n: number) => formatMoney(n, cfg.currency);
            const setupFee = cfg.setupAmount;
            const ownerMonthly = payableMonthly(owner);
            const monthlyAmt = ownerMonthly || cfg.monthlyAmount;
            const hasSetupRecord = owner.monthlyPayouts.some((p) => p.kind === "setup");
            const totalPaid = owner.monthlyPayouts.reduce((s, p) => s + (Number(p.amount) || 0), 0) + (owner.setupFeePaidAt && !hasSetupRecord ? setupFee : 0);

            // Setup fees: one ₱1,000 per account under this owner. A grouped POC brings
            // several accounts, each earning its own setup, logged on the day it's paid.
            // A restricted account is ON HOLD (paid stays paid; unpaid+held = on hold),
            // so "some accounts can't pay" is per-account, not all-or-nothing.
            const setup = setupBreakdown(owner);
            const setupStateById = setup.state;
            const setupsPaidCount = setup.paidN;
            const setupHoldN = setup.holdN;   // unpaid + restricted → setup on hold
            const setupsRemaining = setup.dueN; // still payable now (unpaid & live)
            const multiSetup = owner.accounts.length > 1;
            const nextSetupName = setup.nextDueName;
            const nextSetupId = setup.nextDueId;
            // Accounts restricted at all (drives the monthly hold — a paid setup doesn't
            // un-restrict the account, it just means that one-off fee is already settled).
            const heldAcctCount = owner.accounts.filter(isRestricted).length;
            // A single-account owner whose one account is on hold: hide pay controls.
            const singleHeld = !multiSetup && heldAcctCount > 0 && setupsPaidCount === 0;
            const allHeld = owner.accounts.length > 0 && heldAcctCount === owner.accounts.length;

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
            const singleAcctId = owner.accounts[0]?.id || null;
            const singleAcctName = owner.accounts[0]?.linkedinName || null;
            const markSetupPaid = () => patchOwner(owner.applicationId, { paidAt: new Date().toISOString(), ...(hasSetupRecord ? {} : { addMonthlyPayout: { amount: setupFee, kind: "setup", ...(singleAcctId ? { accountId: singleAcctId, note: `Setup — ${singleAcctName}` } : {}) } }) });
            // Log the next unpaid setup fee (multi-account owners) — dated now, tagged
            // with the account it covers. Stamp paidAt on the first so the digest agrees.
            const logSetup = () => patchOwner(owner.applicationId, {
              addMonthlyPayout: { amount: setupFee, kind: "setup", method: owner.paymentMethod, note: nextSetupName ? `Setup — ${nextSetupName}` : "Setup fee", ...(nextSetupId ? { accountId: nextSetupId } : {}) },
              ...(setupsPaidCount === 0 ? { paidAt: new Date().toISOString() } : {}),
            });
            const attachProof = (index: number) => { const url = prompt("Paste the proof-of-payment link (receipt / screenshot URL):"); if (url && url.trim()) patchOwner(owner.applicationId, { updateMonthlyPayout: { index, proofUrl: url.trim() } }); };

            return (
              <div key={owner.email} style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderLeft: `3px solid ${g.dot}`, borderRadius: 14, overflow: "hidden", boxShadow: "var(--card-shadow)" }}>
                {/* header */}
                <div onClick={() => toggle(owner.email)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "15px 18px", cursor: "pointer", userSelect: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <span style={{ font: `600 11px ${F_SANS}`, color: "var(--muted2)", width: 11, flex: "none", textAlign: "center", transform: open ? "rotate(90deg)" : "none", transition: "transform .18s ease" }}>▸</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: 2 }}>
                        <span style={{ font: `600 16px ${F_GRO}`, color: "var(--text)", letterSpacing: "-.01em" }}>{formatName(owner.fullName)}</span>
                        <span style={{ font: `600 11px ${F_SANS}`, padding: "4px 9px", borderRadius: 7, whiteSpace: "nowrap", background: "var(--st-active-bg)", color: "var(--st-active-fg)" }}>{owner.accountCount} profile{owner.accountCount !== 1 ? "s" : ""}</span>
                        {/* Pre-onboarded stage: show where the account sits before it goes live. */}
                        {(() => {
                          const st = stageOf(owner);
                          if (st === "accepted") return <span style={{ font: `600 11px ${F_SANS}`, padding: "4px 9px", borderRadius: 7, whiteSpace: "nowrap", background: "var(--warn-badge-bg)", color: "var(--warn-badge-text)" }}>Accepted · not started</span>;
                          if (st === "onboarding") {
                            // Already logged in (onboardedAt set) but not yet paid → the warm-up /
                            // log-in-due window is behind us; show the login instead of "warming up".
                            if (owner.onboardedAt) return <span style={{ font: `600 11px ${F_SANS}`, padding: "4px 9px", borderRadius: 7, whiteSpace: "nowrap", background: "var(--blue-chip-bg)", color: "var(--blue-chip-text)" }}>Logged in · {fmtDate(owner.onboardedAt)}</span>;
                            const ld = loginDueDate(owner.onboardingStartedAt, owner.accountFreshness);
                            const over = ld ? isOverdue(ld) : false;
                            return <span style={{ font: `600 11px ${F_SANS}`, padding: "4px 9px", borderRadius: 7, whiteSpace: "nowrap", background: over ? "var(--warn-badge-bg)" : "var(--blue-chip-bg)", color: over ? "var(--warn-badge-text)" : "var(--blue-chip-text)" }}>{over ? "Log-in due" : `Warming up · ${owner.accountFreshness || "established"}`}{ld ? ` · ${fmtDate(ld)}` : ""}</span>;
                          }
                          return null;
                        })()}
                        {missing.length > 0 && (
                          <span title={`Missing: ${missing.join(", ")}`} style={{ font: `600 11px ${F_SANS}`, padding: "4px 9px", borderRadius: 7, whiteSpace: "nowrap", background: "var(--st-cancel-bg)", color: "var(--st-cancel-fg)" }}>⚠ {missing.length} missing</span>
                        )}
                        {owner.accountIssue && (
                          <span title={`Can't log in: ${owner.accountIssue}`} style={{ font: `600 11px ${F_SANS}`, padding: "4px 9px", borderRadius: 7, whiteSpace: "nowrap", background: "var(--st-cancel-bg)", color: "var(--st-cancel-fg)" }}>⚠ {owner.accountIssue}</span>
                        )}
                        {heldAcctCount > 0 && (
                          <span title={`${heldAcctCount} account${heldAcctCount !== 1 ? "s" : ""} restricted — on hold, not being paid monthly`} style={{ font: `600 11px ${F_SANS}`, padding: "4px 9px", borderRadius: 7, whiteSpace: "nowrap", background: "var(--st-unreach-bg)", color: "var(--st-unreach-fg)" }}>⏸ {heldAcctCount} on hold</span>
                        )}
                      </div>
                      <span onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(owner.email); setCopiedEmail(owner.email); setTimeout(() => setCopiedEmail((c) => (c === owner.email ? null : c)), 1400); }} title="Click to copy" style={{ font: `500 13px ${F_SANS}`, color: "var(--muted)", cursor: "pointer", userSelect: "text" }}>{owner.email}{copiedEmail === owner.email && <span style={{ color: "var(--st-active-fg)", marginLeft: 6, fontWeight: 600 }}>· Copied ✓</span>}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flex: "none" }}>
                    <div style={{ font: `600 16px ${F_GRO}`, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{ownerMonthly > 0 ? `${money(ownerMonthly)}/mo` : allHeld ? "On hold" : "TBC"}</div>
                    <div style={{ font: `500 12px ${F_SANS}`, marginTop: 2, color: (setupsRemaining > 0 && owner.onboardedAt && isOverdue(setupDue)) ? "var(--warn-badge-text)" : "var(--muted2)" }}>{(multiSetup
                      ? `${setupsPaidCount}/${setup.total} setups paid`
                      : setupsPaidCount > 0 ? "Setup paid" : heldAcctCount > 0 ? "Setup on hold" : !owner.onboardedAt ? "Setup pending" : isOverdue(setupDue) ? "Setup due" : "Setup scheduled")
                      + (setupsPaidCount > 0 && monthlyCount > 0 && !multiSetup ? ` · ${monthlyCount} mo paid` : "")
                      + (setupHoldN > 0 ? ` · ${setupHoldN} on hold` : "")}</div>
                  </div>
                </div>

                {open && (
                  <div style={{ borderTop: "1px solid var(--divider)", padding: "18px" }}>
                    {/* account + payout, one grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px 18px", marginBottom: 22 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                        <span style={labelCss}>Owner status</span>
                        <select value={isManualStatus(owner) ? (owner.ownerStatus as string) : "auto"} onClick={(e) => e.stopPropagation()} onChange={(e) => patchOwner(owner.applicationId, { ownerStatus: e.target.value === "auto" ? null : e.target.value })}
                          style={{ ...inputCss, cursor: "pointer", fontWeight: 600 }}>
                          <option value="auto">Auto · {STATUS_META[autoStatus(owner)].label}</option>
                          {MANUAL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                        </select>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                        <span style={labelCss}>Logged-in date</span>
                        <input type="date" defaultValue={toDateInput(owner.onboardedAt)} onClick={(e) => e.stopPropagation()}
                          onBlur={(e) => { const v = e.target.value; if (v && v !== toDateInput(owner.onboardedAt)) patchOwner(owner.applicationId, { onboardedAt: `${v}T00:00:00.000Z` }); }}
                          style={inputCss} />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                        <span style={labelCss}>Best contact</span>
                        <div style={{ display: "flex", gap: 8 }}>
                          <select defaultValue={owner.contactChannel || ""} onClick={(e) => e.stopPropagation()} onChange={(e) => patchOwner(owner.applicationId, { contactChannel: e.target.value || null })}
                            style={{ ...inputCss, width: 118, flex: "none", cursor: "pointer", fontWeight: 600 }}>
                            {CHANNEL_OPTIONS.map((c) => <option key={c} value={c}>{c || "— channel —"}</option>)}
                          </select>
                          <Editable initial={owner.contactNumber} placeholder="handle / number" onSave={(v) => patchOwner(owner.applicationId, { contactNumber: v })} />
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                        <span style={labelCss}>Registered name (on the account)</span>
                        <Editable initial={owner.payoutName} placeholder="e.g. Juan D. Dela Cruz" onSave={(v) => patchOwner(owner.applicationId, { payoutName: v })} />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                        <span style={labelCss}>Payout method</span>
                        <Editable initial={owner.paymentMethod} placeholder="e.g. GCash" onSave={(v) => patchOwner(owner.applicationId, { paymentMethod: v })} />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                        <span style={labelCss}>Account number</span>
                        <Editable initial={owner.paymentDetails} placeholder="e.g. 0917 123 4567" mono onSave={(v) => patchOwner(owner.applicationId, { paymentDetails: v })} />
                      </div>
                    </div>

                    {/* PAYMENT SCHEDULE */}
                    <div style={{ ...labelCss, marginBottom: 12 }}>Payment schedule</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 26 }}>
                      {multiSetup ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, background: "var(--band)", border: "1px solid var(--divider)", borderRadius: 12, padding: "14px 16px" }}>
                          <div>
                            <div style={{ font: `600 14.5px ${F_SANS}`, color: "var(--text)" }}>Setup fees · {money(setupFee)} × {setup.total}</div>
                            <div style={{ font: `500 12.5px ${F_SANS}`, color: setupsRemaining > 0 ? "var(--muted)" : "var(--muted2)", marginTop: 2 }}>
                              {setupsPaidCount} of {setup.total} paid{setupsRemaining > 0 ? ` · ${setupsRemaining} due${nextSetupName ? ` (next: ${nextSetupName})` : ""}` : ""}{setupHoldN > 0 ? ` · ${setupHoldN} on hold` : ""}
                            </div>
                            <div style={{ font: `500 11px ${F_SANS}`, color: "var(--muted2)", marginTop: 2 }}>One {money(setupFee)} per account — log each on the day you pay it{setupHoldN > 0 ? " · restricted accounts excluded until they recover" : ""}</div>
                          </div>
                          {setupsRemaining > 0 ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "none" }}>
                              {payNote("setup")}
                              <button type="button" onClick={canPay("setup") ? logSetup : undefined} disabled={!canPay("setup")} style={canPay("setup") ? darkBtn : disabledBtn}>+ Log {money(setupFee)}{nextSetupName ? ` · ${nextSetupName.split(" ")[0]}` : ""}</button>
                            </div>
                          ) : setupHoldN > 0 ? (
                            <span style={{ font: `600 11.5px ${F_SANS}`, padding: "6px 12px", borderRadius: 999, background: "var(--st-unreach-bg)", color: "var(--st-unreach-fg)", flex: "none", whiteSpace: "nowrap" }}>⏸ {setupHoldN} on hold{setupsPaidCount > 0 ? `, ${setupsPaidCount} paid` : ""}</span>
                          ) : (
                            <span style={{ font: `600 12.5px ${F_SANS}`, color: "var(--st-active-fg)", flex: "none" }}>All setups paid ✓</span>
                          )}
                        </div>
                      ) : singleHeld ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, background: "var(--band)", border: "1px solid var(--divider)", borderRadius: 12, padding: "14px 16px" }}>
                          <div>
                            <div style={{ font: `600 14.5px ${F_SANS}`, color: "var(--text)" }}>Setup fee · {money(setupFee)}</div>
                            <div style={{ font: `500 12.5px ${F_SANS}`, color: "var(--st-unreach-fg)", marginTop: 2 }}>On hold — account restricted, not being paid</div>
                            <div style={{ font: `500 11px ${F_SANS}`, color: "var(--muted2)", marginTop: 2 }}>Clear the restriction below to resume</div>
                          </div>
                          <span style={{ font: `600 11.5px ${F_SANS}`, padding: "6px 12px", borderRadius: 999, background: "var(--st-unreach-bg)", color: "var(--st-unreach-fg)", flex: "none", whiteSpace: "nowrap" }}>⏸ On hold</span>
                        </div>
                      ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, background: "var(--band)", border: "1px solid var(--divider)", borderRadius: 12, padding: "14px 16px" }}>
                        <div>
                          <div style={{ font: `600 14.5px ${F_SANS}`, color: "var(--text)" }}>Setup fee · {money(setupFee)}</div>
                          {setupPaid ? (
                            <div style={{ font: `500 12.5px ${F_SANS}`, color: "var(--muted)", marginTop: 2 }}>Paid {setupPaid}</div>
                          ) : setupDue ? (
                            <div style={{ font: `500 12.5px ${F_SANS}`, color: isOverdue(setupDue) ? "var(--st-cancel-fg)" : "var(--muted)", marginTop: 2 }}>
                              Due {fmtDate(setupDue)}{isOverdue(setupDue) ? " · overdue" : ""} <span style={{ color: "var(--muted2)" }}>· 24h after login</span>
                            </div>
                          ) : (
                            <div style={{ font: `500 12.5px ${F_SANS}`, color: "var(--muted2)", marginTop: 2 }}>Scheduled 24h after login — mark logged in first</div>
                          )}
                          {/* Log-in marker: recording a successful login schedules the setup fee 24h
                              later. It does NOT make the owner active — that only happens once the
                              setup fee is marked paid below. */}
                          {!setupPaid && (
                            owner.onboardedAt ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 7 }}>
                                <span style={{ font: `600 11.5px ${F_SANS}`, padding: "3px 9px", borderRadius: 999, background: "var(--st-active-bg)", color: "var(--st-active-fg)", whiteSpace: "nowrap" }}>✓ Logged in {fmtDate(owner.onboardedAt)}</span>
                                <button type="button" onClick={(e) => { e.stopPropagation(); patchOwner(owner.applicationId, { onboardedAt: null }); }} title="Undo — we haven't actually logged in yet" style={{ font: `600 11px ${F_SANS}`, color: "var(--muted)", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>undo</button>
                              </div>
                            ) : (
                              <button type="button" onClick={(e) => { e.stopPropagation(); patchOwner(owner.applicationId, { onboardedAt: new Date().toISOString() }); }} title="Record that we've logged into the account. Schedules the setup fee 24h later — does NOT mark them active/paid." style={{ font: `600 12px ${F_SANS}`, color: "var(--text)", background: "transparent", border: "1px solid var(--btn-secondary-border)", padding: "7px 12px", borderRadius: 9, cursor: "pointer", marginTop: 7 }}>✓ Mark logged in</button>
                            )
                          )}
                          {!setupPaid && !owner.onboardedAt && (
                            <select value={owner.accountFreshness || "established"} onClick={(e) => e.stopPropagation()} onChange={(e) => patchOwner(owner.applicationId, { accountFreshness: e.target.value })}
                              style={{ marginTop: 6, background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: 7, padding: "5px 8px", font: `500 12px ${F_SANS}`, color: "var(--text)", cursor: "pointer", outline: "none" }}
                              title="Warm-up track before we log in — drives the log-in-due date, not the setup fee">
                              <option value="established">Established · 3-day warm-up</option>
                              <option value="fresh">Fresh / new · 1-week warm-up</option>
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
                      )}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, background: "var(--band)", border: "1px solid var(--divider)", borderRadius: 12, padding: "14px 16px" }}>
                        <div>
                          <div style={{ font: `600 14.5px ${F_SANS}`, color: "var(--text)" }}>Monthly · {allHeld ? money(0) : money(monthlyAmt)}/mo</div>
                          {allHeld ? (
                            <div style={{ font: `500 12.5px ${F_SANS}`, color: "var(--st-unreach-fg)", marginTop: 2 }}>On hold — {owner.accounts.length === 1 ? "account restricted" : "all accounts restricted"}, not being paid</div>
                          ) : (
                            <div style={{ font: `500 12.5px ${F_SANS}`, color: isOverdue(nextMonthlyDue) ? "var(--st-cancel-fg)" : "var(--muted)", marginTop: 2 }}>
                              {nextMonthlyDue ? `${monthlyCount > 0 ? `${monthlyCount} logged · next` : "First payment"} due ${fmtDate(nextMonthlyDue)}${isOverdue(nextMonthlyDue) ? " · overdue" : ""}` : "Set an onboarding date to schedule this"}
                            </div>
                          )}
                          <div style={{ font: `500 11px ${F_SANS}`, color: "var(--muted2)", marginTop: 2 }}>On the 1st, after one full month of service{!allHeld && heldAcctCount > 0 ? ` · ${heldAcctCount} on hold, excluded` : ""}</div>
                        </div>
                        {allHeld ? (
                          <span style={{ font: `600 11.5px ${F_SANS}`, padding: "6px 12px", borderRadius: 999, background: "var(--st-unreach-bg)", color: "var(--st-unreach-fg)", flex: "none", whiteSpace: "nowrap" }}>⏸ On hold</span>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "none" }}>
                            {payNote("monthly")}
                            <button type="button" onClick={canPay("monthly") ? () => patchOwner(owner.applicationId, { addMonthlyPayout: { amount: monthlyAmt, kind: "monthly", method: owner.paymentMethod } }) : undefined} disabled={!canPay("monthly")} style={canPay("monthly") ? darkBtn : disabledBtn}>+ Log {money(monthlyAmt)}</button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* PAYMENT RECORD */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <span style={labelCss}>Payment record</span>
                      <span style={{ font: `500 12px ${F_SANS}`, color: "var(--muted)" }}>Total paid: <strong style={{ fontWeight: 700, color: "var(--st-active-fg)" }}>{money(totalPaid)}</strong></span>
                    </div>
                    <div style={{ border: "1px solid var(--divider)", borderRadius: 12, overflow: "hidden", marginBottom: 26 }}>
                      <div style={{ display: "grid", gridTemplateColumns: PAY_GRID, gap: 12, padding: "10px 16px", background: "var(--band)", borderBottom: "1px solid var(--divider)" }}>
                        {["Date", "Payment", "Proof", "Notified", "Acknowledged", ""].map((h, i) => <span key={i} style={{ font: `700 9.5px ${F_SANS}`, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--label)" }}>{h}</span>)}
                      </div>
                      {owner.monthlyPayouts.length === 0 && !(owner.setupFeePaidAt && !hasSetupRecord) ? (
                        <div style={{ padding: 16, textAlign: "center", font: `500 12.5px ${F_SANS}`, color: "var(--muted)" }}>No payments logged yet.</div>
                      ) : (
                        <>
                          {owner.monthlyPayouts.map((p, i) => {
                            // Which account this payout covered (setup fees are per-account).
                            const forName = p.accountId ? (owner.accounts.find((a) => a.id === p.accountId)?.linkedinName || null) : (p.note && p.note.startsWith("Setup — ") ? p.note.slice("Setup — ".length) : null);
                            return (
                            <div key={i} style={{ display: "grid", gridTemplateColumns: PAY_GRID, gap: 12, alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--divider)" }}>
                              <span style={{ font: `500 12.5px ${F_SANS}`, color: "var(--text2)", whiteSpace: "nowrap" }}>{fmtDate(p.paidAt)}</span>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ font: `600 13px ${F_SANS}`, color: "var(--text)" }}>{money(Number(p.amount) || 0)} <span style={{ fontWeight: 500, color: "var(--muted)" }}>· {p.kind === "setup" ? "Setup fee" : "Monthly"}{forName ? ` · ${forName}` : ""}</span></div>
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
                            );
                          })}
                          {owner.setupFeePaidAt && !hasSetupRecord && (
                            <div style={{ display: "grid", gridTemplateColumns: PAY_GRID, gap: 12, alignItems: "center", padding: "12px 16px" }}>
                              <span style={{ font: `500 12.5px ${F_SANS}`, color: "var(--text2)", whiteSpace: "nowrap" }}>{fmtDate(owner.setupFeePaidAt)}</span>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ font: `600 13px ${F_SANS}`, color: "var(--text)" }}>{money(setupFee)} <span style={{ fontWeight: 500, color: "var(--muted)" }}>· Setup fee</span></div>
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

                    {/* PROFILES & CREDENTIALS — one collapsible row per account */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <span style={labelCss}>Profile{owner.accounts.length !== 1 ? "s" : ""} &amp; credentials</span>
                      <span style={{ font: `500 12px ${F_SANS}`, color: "var(--muted2)" }}>{owner.accounts.length > 1 ? `${owner.accounts.length} accounts under this owner · open one for credentials` : "open for credentials"}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {owner.accounts.map((acc) => {
                        const pwKey = `${acc.id}:pw`, tfKey = `${acc.id}:tf`;
                        const pOpen = profileOpen.has(acc.id);
                        const held = isRestricted(acc);
                        const setupState = setupStateById.get(acc.id) || "due";
                        // Setup chip: paid wins (a paid setup stays paid even if the account
                        // is later restricted); otherwise on-hold, then — for an unpaid account —
                        // pending (not logged in yet) / scheduled (logged in, due date not reached)
                        // / amber due (due date reached).
                        const setupChip = setupState === "paid"
                          ? { bg: "var(--st-active-bg)", fg: "var(--st-active-fg)", label: "✓ setup paid" }
                          : held
                          ? { bg: "var(--st-unreach-bg)", fg: "var(--st-unreach-fg)", label: "⏸ on hold" }
                          : !owner.onboardedAt
                          ? { bg: "var(--blue-chip-bg)", fg: "var(--blue-chip-text)", label: "setup pending" }
                          : !isOverdue(setupDue)
                          ? { bg: "var(--blue-chip-bg)", fg: "var(--blue-chip-text)", label: "setup scheduled" }
                          : { bg: "var(--warn-badge-bg)", fg: "var(--warn-badge-text)", label: "setup due" };
                        const toggleRestricted = () => patchAccount(acc.id, { restrictedAt: held ? null : new Date().toISOString() });
                        return (
                          <div key={acc.id} style={{ background: "var(--band)", border: "1px solid var(--divider)", borderLeft: held ? "3px solid var(--st-unreach-fg)" : "1px solid var(--divider)", borderRadius: 12, overflow: "hidden" }}>
                            <div onClick={() => toggleProfile(acc.id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 14px", cursor: "pointer", userSelect: "none" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                                <span style={{ font: `600 10px ${F_SANS}`, color: "var(--muted2)", width: 10, flex: "none", transition: "transform .18s ease", transform: pOpen ? "rotate(90deg)" : "none" }}>▸</span>
                                <span style={{ font: `600 14px ${F_GRO}`, color: "var(--text)" }}>{acc.linkedinName}</span>
                                <span style={{ font: `600 11px ${F_SANS}`, padding: "3px 9px", borderRadius: 7, whiteSpace: "nowrap", background: acctStyle(acc.status).bg, color: acctStyle(acc.status).fg }}>{acc.status}</span>
                                {held && <span title="Restricted — on hold, excluded from this owner's payouts" style={{ font: `600 11px ${F_SANS}`, padding: "3px 9px", borderRadius: 7, whiteSpace: "nowrap", background: "var(--st-unreach-bg)", color: "var(--st-unreach-fg)" }}>restricted</span>}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 14, flex: "none" }}>
                                {acc.loginEmail && <span style={{ font: `500 12px ${F_SANS}`, color: "var(--muted)" }}>{acc.loginEmail}</span>}
                                {Number(acc.ambassadorPayment) > 0 && <span style={{ font: `600 13px ${F_GRO}`, color: held ? "var(--muted2)" : "var(--text2)", fontVariantNumeric: "tabular-nums", textDecoration: held ? "line-through" : "none" }}>{money(Number(acc.ambassadorPayment))}/mo</span>}
                                <button type="button" onClick={(e) => { e.stopPropagation(); toggleRestricted(); }} title={held ? "Account recovered — clear the hold and resume paying" : "Restricted by LinkedIn — put this account on hold (stops its setup + monthly)"} style={{ font: `600 10.5px ${F_SANS}`, padding: "5px 9px", borderRadius: 8, whiteSpace: "nowrap", cursor: "pointer", border: "1px solid var(--divider)", background: "transparent", color: held ? "var(--st-active-fg)" : "var(--muted)" }}>{held ? "✓ Resume" : "⚑ Restrict"}</button>
                                <span style={{ font: `600 11px ${F_SANS}`, padding: "3px 9px", borderRadius: 7, whiteSpace: "nowrap", background: setupChip.bg, color: setupChip.fg }}>{setupChip.label}</span>
                              </div>
                            </div>
                            {pOpen && (
                              <div style={{ padding: "0 14px 14px" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                                  <span style={labelCss}>LinkedIn URL</span>
                                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <Editable initial={acc.linkedinUrl} placeholder="https://linkedin.com/in/…" mono onSave={(v) => patchAccount(acc.id, { linkedinUrl: v })} />
                                    {acc.linkedinUrl && <a href={acc.linkedinUrl} target="_blank" rel="noreferrer" style={{ flex: "none", font: `600 13px ${F_SANS}`, color: "var(--link)" }}>Open</a>}
                                  </div>
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 18px" }}>
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
                            )}
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
          })}
        </div>
      )}
    </div>
  );
}
