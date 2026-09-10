"use client";

// Pipeline — one card per ambassador, signup → working, paid account.
// ---------------------------------------------------------------------------
// This is the single-record merge of Applications + Onboarding + Payouts. Every
// mechanism the three old tabs run is wired here to the SAME endpoints, so the
// data can never diverge:
//   • application + payout + workflow + outreach  → PATCH /api/admin/ambassadors/{id}
//   • account fields + credentials                → PATCH /api/admin/accounts/{accountId}
//   • stage dropdown (guarded onboarding/onboard) → POST  /api/admin/onboarding/status
//   • payments (log / proof / notified / ack)     → PATCH /api/admin/ambassadors/{id}
//                                                     (addMonthlyPayout / updateMonthlyPayout)
//   • payments-due digest email                   → POST  /api/admin/payments-due
//
// Data spine = /api/admin/onboarding (account-joined). We overlay the call
// state, onboardingStartedAt/paidAt/verifiedAt and the monthlyPayouts ledger
// from /api/admin/ambassadors, merged by id. The old Applications, Onboarding,
// Ambassadors and Payouts tabs are untouched.
//
// Three lenses on the same cards:
//   • By stage        — Initial / Processing / Accepted / Onboarded / Unreachable / Rejected
//   • By next action  — what to do next (blocked / message / awaiting / chase / decide / setup / live / closed)
//   • Onboarded · payments — live accounts only, with the money surface

import { useEffect, useMemo, useState } from "react";
import { currencyConfigFor, formatMoney } from "@/lib/referral-currency";
import { formatName } from "@/lib/utils";
import { isLikelyTestEmail } from "@/lib/test-mode";

const F_SANS = "var(--font-sans),system-ui,sans-serif";
const F_GRO = "var(--font-grotesk),system-ui,sans-serif";

type Status = "pending" | "reviewing" | "approved" | "rejected" | "onboarding" | "onboarded" | "unreachable" | "contacted" | "on_hold";
type Stage = "initial" | "processing" | "accepted" | "onboarded" | "unreachable" | "rejected";
type Mode = "stage" | "action" | "live";
type Touch = { ch: string; text: string; by?: string; at: string };
type Payout = {
  paidAt: string; amount: number; kind?: "setup" | "monthly"; method?: string | null;
  proofUrl?: string | null; note?: string | null; accountId?: string | null; by?: string;
  notified?: boolean; notifiedAt?: string | null; acknowledged?: boolean; acknowledgedAt?: string | null;
};

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
  reason: string;
  hasGologin: boolean;
  hasLogin: boolean;
  accountId: string | null;
  accountName: string | null;
  accountStatus: string | null;
  loginEmail: string | null;
  gologinShareLink: string | null;
  gologinProfileId: string | null;
  connectionCount: number | null;
  adminNotes: string | null;
  applicationNotes: string | null;
  accountNotes: string | null;
  referredBy: string | null;
  payoutCurrency: string | null;
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
  linkedinVerified: boolean;
  setupPaidAt: string | null;
  personalEmail: string | null;
  workEmail: string | null;
  hasPassword: boolean;
  has2fa: boolean;
  accountPassword: string | null;
  twoFactor: string | null;
  proxyHost: string | null;
  proxyPort: number | null;
  proxyUsername: string | null;
  proxyPassword: string | null;
  proxyLocation: string | null;
  accountRestrictedAt: string | null;
  monthlyPrice: number | null;
  ambassadorPayment: number | null;
  outreachLog: Touch[] | null;
  nextFollowUp: string | null;
  callOutcome: string | null;
  // ---- overlaid from /api/admin/ambassadors ----
  onboardingStartedAt: string | null;
  paidAt: string | null;
  monthlyPayouts: Payout[] | null;
  call: { stage: "none" | "booked" | "done"; scheduledAt: string | null; meetLink: string | null } | null;
}

// ---------------------------------------------------------------------------
// Status ↔ stage. We keep the real 9-value backend enum (shared with the other
// tabs) and fold it into the 6 stage groups shown here.
const stageOf = (r: Row): Stage => {
  if (r.status === "rejected") return "rejected";
  if (r.status === "unreachable") return "unreachable";
  if (r.status === "onboarded") return "onboarded";
  if (r.status === "approved") return "accepted";
  if (r.status === "reviewing" || r.status === "onboarding" || r.status === "on_hold") return "processing";
  return "initial"; // pending, contacted
};
// "Payment-relevant" = Level 2 (approved — logged in, at the payout stage) and Onboarded
// (paid & earning). A setup fee is owed from Level 2 on, so these belong in the payments
// view. Level 1 (still warming up, not logged in) is not.
const isLive = (r: Row) => r.status === "approved" || r.status === "onboarded";

const STAGE_GROUPS: { key: Stage; label: string; dot: string; note: string }[] = [
  { key: "initial", label: "Initial", dot: "var(--blue-chip-text,#1a56db)", note: "new leads and awaiting reply — not started" },
  { key: "processing", label: "Level 1", dot: "var(--warn-badge-text,#b7791f)", note: "onboarding started — warming up, not logged in yet" },
  { key: "accepted", label: "Level 2", dot: "var(--st-conv-fg,#6d28d9)", note: "logged in — setup fee due the next day (24h after login)" },
  { key: "onboarded", label: "Onboarded", dot: "var(--st-active-fg,#188038)", note: "paid & earning" },
  { key: "unreachable", label: "Unreachable", dot: "var(--st-unreach-fg,#c0392b)", note: "chased, no reply" },
  { key: "rejected", label: "Rejected", dot: "var(--st-cancel-fg,#c0392b)", note: "not a fit" },
];

// By next action -------------------------------------------------------------
type ActionKey = "blocked" | "message" | "awaiting" | "noreply" | "replied" | "setup" | "live" | "closed";
const ACTION_GROUPS: { key: ActionKey; label: string; dot: string; note: string }[] = [
  { key: "blocked", label: "Blocked — fix the account", dot: "var(--st-cancel-fg,#c0392b)", note: "restricted, no GoLogin or a login issue" },
  { key: "message", label: "Needs first message", dot: "var(--st-unreach-fg,#c0392b)", note: "signed up, nobody has reached out" },
  { key: "awaiting", label: "Awaiting reply", dot: "var(--warn-badge-text,#b7791f)", note: "messaged once — give it a nudge" },
  { key: "noreply", label: "No response — chase", dot: "var(--st-unreach-fg,#c0392b)", note: "2+ touches, still nothing back" },
  { key: "replied", label: "Replied — decide", dot: "var(--blue-chip-text,#1a56db)", note: "they came back — accept or reject" },
  { key: "setup", label: "Warm-up & setup", dot: "var(--st-conv-fg,#6d28d9)", note: "accepted — run the workflow" },
  { key: "live", label: "Live", dot: "var(--st-active-fg,#188038)", note: "onboarded and earning" },
  { key: "closed", label: "Closed", dot: "var(--muted2,#9aa0a6)", note: "rejected or not a fit" },
];
// Why an account can't earn, most-terminal first. Uses data we already have:
//   removed  → the ambassador pulled their account back (withdrawn)
//   retired  → LinkedIn permanently restricted it (inaccessible)
//   restricted (restrictedAt) → temporarily flagged by LinkedIn, may recover
//   setup    → no GoLogin yet, or a login issue we need to fix
type BlockKind = "withdrawn" | "retired" | "restricted" | "setup";
// A GoLogin is only EXPECTED from Level 2 onward ("GoLogin ready, verifying") and when
// onboarded. Initial / awaiting-reply / Level-1-warm-up leads don't have one yet by
// design, so a missing GoLogin there is normal — not a problem to flag.
const needsGologin = (r: Row) => r.status === "approved" || r.status === "onboarded";
const missingGologin = (r: Row) => needsGologin(r) && !!r.accountId && !r.hasGologin;
const blockKind = (r: Row): BlockKind | null => {
  // A restriction can be recorded on the account (status / restrictedAt) OR — for a
  // lead with no linked account yet — as a keyword on the application's accountIssue.
  const issue = (r.accountIssue || "").toLowerCase();
  if (r.accountStatus === "removed" || issue.includes("withdrawn")) return "withdrawn";
  if (r.accountStatus === "retired" || issue.includes("permanent")) return "retired";
  if (r.accountRestrictedAt || issue.includes("restricted")) return "restricted";
  if (r.accountIssue || missingGologin(r)) return "setup";
  return null;
};
const isBlocked = (r: Row) => blockKind(r) !== null;
const REPLY_CH: Record<string, 1> = { reply: 1, booked: 1, done: 1 };
const actionBucket = (r: Row): ActionKey => {
  if (r.status === "rejected") return "closed";
  if (r.status === "onboarded") return "live";
  if (isBlocked(r)) return "blocked";
  if (r.status === "approved" || r.status === "onboarding") return "setup";
  const log = r.outreachLog || [];
  const outbound = log.filter((t) => !REPLY_CH[t.ch] && t.ch !== "note");
  if (log.some((t) => REPLY_CH[t.ch])) return "replied";
  if (r.status === "unreachable" || outbound.length >= 2) return "noreply";
  if (outbound.length === 1) return "awaiting";
  return "message";
};

// Live (payments) ------------------------------------------------------------
type LiveKey = "due" | "restricted" | "setup" | "ok" | "retired" | "withdrawn";
const LIVE_GROUPS: { key: LiveKey; label: string; dot: string; note: string }[] = [
  { key: "due", label: "Payment due", dot: "var(--warn-badge-text,#b7791f)", note: "setup fee or a monthly payout owed now" },
  { key: "restricted", label: "Restricted — check", dot: "var(--st-cancel-fg,#c0392b)", note: "flagged by LinkedIn — may recover; don't pay yet" },
  { key: "setup", label: "Blocked — setup", dot: "var(--st-unreach-fg,#c0392b)", note: "no GoLogin or a login issue — fix before paying" },
  { key: "ok", label: "Up to date", dot: "var(--st-active-fg,#188038)", note: "nothing owed right now" },
  { key: "retired", label: "Permanently restricted", dot: "var(--st-cancel-fg,#c0392b)", note: "heard from LinkedIn — inaccessible, won't come back" },
  { key: "withdrawn", label: "Withdrawn — account pulled", dot: "var(--muted2,#9aa0a6)", note: "ambassador took their account back" },
];
const setupPaid = (r: Row) => (r.monthlyPayouts || []).some((p) => p.kind === "setup") || !!r.setupPaidAt || !!r.paidAt;

// Formatting -----------------------------------------------------------------
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");
const fmtDateTime = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "");
const ageDays = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
const initialsOf = (name: string) => { const p = (name || "?").trim().split(/\s+/); return (p.length > 1 ? p[0][0] + p[1][0] : name.slice(0, 2)).toUpperCase() || "?"; };
const liHref = (u: string) => (u.startsWith("http") ? u : `https://${u}`);
const cfgOf = (r: Row) => currencyConfigFor(r.payoutCurrency, r.referredBy);
const monthlyAmt = (r: Row) => (r.ambassadorPayment && r.ambassadorPayment > 0 ? r.ambassadorPayment : cfgOf(r).monthlyAmount);
const totalPaid = (r: Row) => (r.monthlyPayouts || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);

const TOUCH: Record<string, [string, string, string]> = {
  whatsapp: ["WhatsApp", "--green-chip-bg,#e6f4ea", "--green-chip-text,#188038"],
  viber: ["Viber", "--st-conv-bg,#efe8fd", "--st-conv-fg,#6d28d9"],
  telegram: ["Telegram", "--blue-chip-bg,#e8f0fe", "--blue-chip-text,#1a56db"],
  email: ["Email", "--blue-chip-bg,#e8f0fe", "--blue-chip-text,#1a56db"],
  call: ["Call", "--st-unreach-bg,#fdecea", "--st-unreach-fg,#c0392b"],
  text: ["Text", "--st-conv-bg,#efe8fd", "--st-conv-fg,#6d28d9"],
  reply: ["Reply", "--st-replied-bg,#e6f4ea", "--st-replied-fg,#188038"],
  booked: ["Booked", "--st-conv-bg,#efe8fd", "--st-conv-fg,#6d28d9"],
  done: ["Call", "--st-active-bg,#e6f4ea", "--st-active-fg,#188038"],
  note: ["Note", "--tag-bg,#f1f1f2", "--muted,#6b7280"],
};
const touchLabel = (ch: string) => (TOUCH[ch] || TOUCH.note)[0];
const touchChipStyle = (ch: string): React.CSSProperties => {
  const c = TOUCH[ch] || TOUCH.note;
  return { font: `600 9.5px ${F_SANS}`, letterSpacing: ".04em", textTransform: "uppercase", padding: "4px 0", borderRadius: 6, flex: "none", width: 72, textAlign: "center", background: `var(${c[1]})`, color: `var(${c[2]})` };
};
const messagingChannel = (r: Row): "viber" | "telegram" | "whatsapp" => {
  const c = `${r.contactChannel || ""} ${r.contactNumber || ""}`.toLowerCase();
  if (c.includes("viber")) return "viber";
  if (c.includes("telegram") || c.includes("tg")) return "telegram";
  return "whatsapp";
};
const lastTouchAt = (log: Touch[] | null) => (log && log.length ? fmtDateTime(log[log.length - 1].at) : "");
const touchCount = (log: Touch[] | null) => (log || []).filter((t) => t.ch !== "note").length;

// Warm-up window before we log in: 3 days established, 1 week fresh.
const holdDays = (r: Row) => (r.accountFreshness === "fresh" ? 7 : 3);
const loginDueMs = (r: Row): number | null => (r.onboardingStartedAt ? new Date(r.onboardingStartedAt).getTime() + holdDays(r) * 86400000 : null);
const eligibleMs = (r: Row): number | null => (r.onboardedAt ? new Date(r.onboardedAt).getTime() + 86400000 : null);

// Status pill / dropdown vocabulary (all real backend statuses).
const STATUS_STYLE: Record<Status, [string, string]> = {
  pending: ["--blue-chip-bg,#e8f0fe", "--blue-chip-text,#1a56db"],
  contacted: ["--blue-chip-bg,#e8f0fe", "--blue-chip-text,#1a56db"],
  reviewing: ["--warn-badge-bg,#fef3e2", "--warn-badge-text,#b7791f"],
  on_hold: ["--warn-badge-bg,#fef3e2", "--warn-badge-text,#b7791f"],
  onboarding: ["--warn-badge-bg,#fef3e2", "--warn-badge-text,#b7791f"],
  approved: ["--st-conv-bg,#efe8fd", "--st-conv-fg,#6d28d9"],
  onboarded: ["--st-active-bg,#e6f4ea", "--st-active-fg,#188038"],
  unreachable: ["--st-unreach-bg,#fdecea", "--st-unreach-fg,#c0392b"],
  rejected: ["--st-cancel-bg,#fdecea", "--st-cancel-fg,#c0392b"],
};
const STAGE_ACCENT: Record<Stage, string> = {
  initial: "var(--blue-chip-text,#1a56db)",
  processing: "var(--warn-badge-text,#b7791f)",
  accepted: "var(--st-conv-fg,#6d28d9)",
  onboarded: "var(--st-active-fg,#188038)",
  unreachable: "var(--st-unreach-fg,#c0392b)",
  rejected: "var(--st-cancel-fg,#c0392b)",
};
const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "pending", label: "Initial" },
  { value: "contacted", label: "Awaiting reply" },
  { value: "onboarding", label: "Level 1" },
  { value: "approved", label: "Level 2" },
  { value: "onboarded", label: "Onboarded" },
  { value: "reviewing", label: "Level 1 · review" },
  { value: "on_hold", label: "Level 1 · hold" },
  { value: "unreachable", label: "Unreachable" },
  { value: "rejected", label: "Rejected" },
];
const ACCOUNT_STATUS_OPTIONS = ["under_review", "available", "rented", "unavailable", "maintenance", "under_construction", "retired"];
const OWNER_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Auto" }, { value: "active", label: "Active" }, { value: "waiting_us", label: "Waiting on us" },
  { value: "waiting_them", label: "Waiting on them" }, { value: "offline", label: "Offline" }, { value: "onboarding", label: "Onboarding" },
  { value: "paused", label: "Paused" }, { value: "lost", label: "Lost" },
];

const labelCss: React.CSSProperties = { font: `700 10px ${F_SANS}`, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--label,#7c8597)" };
const inputCss: React.CSSProperties = { width: "100%", boxSizing: "border-box", background: "var(--input-bg,#fff)", border: "1px solid var(--input-border,#dcdce0)", borderRadius: 8, padding: "7px 9px", font: `500 13px ${F_SANS}`, color: "var(--text,#111)", outline: "none" };
const btnSec: React.CSSProperties = { font: `600 12px ${F_SANS}`, color: "var(--btn-secondary-fg,#333)", background: "var(--btn-secondary-bg,#fff)", border: "1px solid var(--btn-secondary-border,#dcdce0)", padding: "7px 12px", borderRadius: 8, cursor: "pointer" };
const btnPrimary: React.CSSProperties = { font: `600 12px ${F_SANS}`, color: "#fff", background: "var(--sheets-btn-bg,#1a56db)", border: "none", padding: "8px 13px", borderRadius: 8, cursor: "pointer" };

export default function AdminPipelinePage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState(false);
  const [mode, setMode] = useState<Mode>("stage");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pocFilter, setPocFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [flagged, setFlagged] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [dueInfo, setDueInfo] = useState<{ emails: Set<string>; items: { email: string; amount: number; currency: "PHP" | "USD"; kind: string; blocked: boolean }[] } | null>(null);
  const [emailState, setEmailState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const toggle = (id: string) => setOpen((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const load = async () => {
    try {
      const [onb, amb, due] = await Promise.all([
        fetch("/api/admin/onboarding", { cache: "no-store" }).then((r) => (r.ok ? r.json() : { rows: [] })),
        fetch("/api/admin/ambassadors", { cache: "no-store" }).then((r) => (r.ok ? r.json() : { applications: [] })),
        fetch("/api/admin/payments-due", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      const overlay = new Map<string, Pick<Row, "onboardingStartedAt" | "paidAt" | "verifiedAt" | "monthlyPayouts" | "call">>();
      for (const a of (amb.applications || [])) {
        overlay.set(a.id, {
          onboardingStartedAt: a.onboardingStartedAt ?? null,
          paidAt: a.paidAt ?? null,
          verifiedAt: a.verifiedAt ?? null,
          monthlyPayouts: Array.isArray(a.monthlyPayouts) ? a.monthlyPayouts : null,
          call: a.call ? { stage: a.call.stage, scheduledAt: a.call.scheduledAt ?? null, meetLink: a.call.meetLink ?? null } : null,
        });
      }
      const merged: Row[] = (onb.rows || []).map((r: Row) => {
        const o = overlay.get(r.id);
        return {
          ...r,
          onboardingStartedAt: o?.onboardingStartedAt ?? null,
          paidAt: o?.paidAt ?? r.setupPaidAt ?? null,
          verifiedAt: o?.verifiedAt ?? r.verifiedAt ?? null,
          monthlyPayouts: o?.monthlyPayouts ?? null,
          call: o?.call ?? null,
        };
      });
      setRows(merged);
      if (due) {
        const raw = [...(due.setup || []), ...(due.monthly || [])] as { email?: string; amount?: number; currency?: string; kind?: string; blocked?: boolean }[];
        const items = raw.map((d) => ({ email: (d.email || "").toLowerCase(), amount: Number(d.amount) || 0, currency: (d.currency === "USD" ? "USD" : "PHP") as "PHP" | "USD", kind: d.kind || "", blocked: !!d.blocked }));
        const emails = new Set(items.filter((i) => !i.blocked && i.email).map((i) => i.email));
        setDueInfo({ emails, items });
      }
    } catch { setError(true); }
  };
  useEffect(() => { load(); }, []);

  // ---- mutations (all reuse existing endpoints) ----
  const patchApp = async (id: string, patch: Record<string, unknown>, reload = false) => {
    setRows((prev) => (prev ? prev.map((r) => (r.id === id ? { ...r, ...patch } : r)) : prev));
    try { await fetch(`/api/admin/ambassadors/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }); } catch {}
    if (reload) await load();
  };
  const patchAccount = async (id: string, accountId: string, patch: Record<string, unknown>, reload = false) => {
    setRows((prev) => (prev ? prev.map((r) => (r.id === id ? { ...r, ...patch } : r)) : prev));
    try { await fetch(`/api/admin/accounts/${accountId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }); } catch {}
    if (reload) await load();
  };
  const setStage = async (r: Row, status: Status) => {
    setBusy(r.id);
    try {
      const res = await fetch("/api/admin/onboarding/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: r.id, status }) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); alert(typeof d.error === "string" ? d.error : `Could not update status (${res.status}).`); return; }
      await load();
    } finally { setBusy(null); }
  };
  const workflow = async (id: string, patch: Record<string, unknown>) => { setBusy(id); try { await patchApp(id, patch, true); } finally { setBusy(null); } };
  // Change stage keeping the model consistent: Level 2 (approved) ALWAYS means logged in,
  // so stamp onboardedAt when moving there; Level 1 (onboarding) means not logged in yet,
  // so clear it. Everything else goes through the guarded status route.
  const changeStatus = (r: Row, status: Status) => {
    if (status === "approved") return workflow(r.id, { status: "approved", ...(r.onboardedAt ? {} : { onboardedAt: new Date().toISOString() }) });
    if (status === "onboarding") return workflow(r.id, { status: "onboarding", onboardedAt: null });
    return setStage(r, status);
  };
  const logTouch = async (id: string, ch: string, text: string, by: string) => {
    const body = text || (({ whatsapp: "WhatsApp message sent", viber: "Viber message sent", telegram: "Telegram message sent", email: "Email sent", call: "Call attempted — no answer", text: "Text message sent", note: "Note added" } as Record<string, string>)[ch] || "Note added");
    setBusy(id);
    setRows((prev) => (prev ? prev.map((r) => (r.id === id ? { ...r, outreachLog: [...(r.outreachLog || []), { ch, text: body, by: by || "You", at: new Date().toISOString() }] } : r)) : prev));
    try {
      const res = await fetch(`/api/admin/ambassadors/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ addTouch: { ch, text: body, by: by || undefined } }) });
      if (res.ok) { const d = await res.json(); if (d.application?.outreachLog) setRows((prev) => (prev ? prev.map((r) => (r.id === id ? { ...r, outreachLog: d.application.outreachLog } : r)) : prev)); }
    } catch {} finally { setBusy(null); }
  };
  // Payments — same ledger the Owners tab writes.
  const logPayment = async (r: Row, kind: "setup" | "monthly") => {
    const cfg = cfgOf(r);
    const amount = kind === "setup" ? cfg.setupAmount : monthlyAmt(r);
    const payout: Record<string, unknown> = { amount, kind, method: r.paymentMethod || undefined };
    if (kind === "setup" && r.accountId) payout.accountId = r.accountId;
    const patch: Record<string, unknown> = { addMonthlyPayout: payout };
    // Logging the setup fee records it but does NOT advance to Onboarded yet — that
    // happens once the receipt/proof is attached (see updatePayout).
    if (kind === "setup") patch.paidAt = new Date().toISOString();
    await workflow(r.id, patch);
  };
  const updatePayout = async (r: Row, index: number, patch: { proofUrl?: string | null; notified?: boolean; acknowledged?: boolean }) => {
    // No auto-advance — moving to Onboarded is an explicit "Mark onboarded" step so
    // logging a payment or attaching a receipt never surprises you by jumping stages.
    await workflow(r.id, { updateMonthlyPayout: { index, ...patch } });
  };
  const emailDue = async () => {
    setEmailState("sending");
    try { const res = await fetch("/api/admin/payments-due", { method: "POST" }); setEmailState(res.ok ? "sent" : "error"); }
    catch { setEmailState("error"); }
    setTimeout(() => setEmailState("idle"), 2600);
  };

  // ---- filtering / grouping ----
  // Payments view = anyone whose money clock has started (logged in or onboarded).
  // Stage/action views = everyone not yet fully onboarded — so a logged-in Level-2
  // (approved) person shows in BOTH: still "Accepted" in the pipeline, and "Payment
  // due" for their setup fee.
  const scoped = useMemo(() => (rows || []).filter((r) => (mode === "live" ? isLive(r) : r.status !== "onboarded")), [rows, mode]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scoped.filter((r) => {
      if (flagged && !isBlocked(r)) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (pocFilter !== "all") { const p = (r.poc || "").trim(); if (pocFilter === "__unassigned" ? p !== "" : p !== pocFilter) return false; }
      if (!q) return true;
      return [r.fullName, r.email, r.contactNumber, r.accountName, r.loginEmail, r.personalEmail, r.linkedinEmail, r.referredBy, r.poc,
        ...(r.outreachLog || []).map((t) => t.text)].some((v) => (v || "").toLowerCase().includes(q));
    });
  }, [scoped, query, flagged, statusFilter, pocFilter]);

  const pocChips = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of scoped) counts.set((r.poc || "").trim(), (counts.get((r.poc || "").trim()) || 0) + 1);
    const named = [...counts.entries()].filter(([k]) => k).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    return { named, unassigned: counts.get("") || 0, total: scoped.length };
  }, [scoped]);

  const groups = useMemo(() => {
    const defs = mode === "stage" ? STAGE_GROUPS : mode === "live" ? LIVE_GROUPS : ACTION_GROUPS;
    // "Owes money" = setup fee not yet paid (they've logged in — the fee is due), OR a
    // monthly cycle has come due per the payments-due feed. An unacknowledged-but-paid
    // payout is NOT a debt, so it does not count here.
    const liveKey = (r: Row): LiveKey => blockKind(r) ?? ((!setupPaid(r) || (dueInfo?.emails.has((r.email || "").toLowerCase()) ?? false)) ? "due" : "ok");
    const keyOf = mode === "stage" ? (r: Row) => stageOf(r) : mode === "live" ? liveKey : (r: Row) => actionBucket(r);
    return defs
      .map((d) => ({ ...d, items: filtered.filter((r) => keyOf(r) === d.key).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)) }))
      .filter((g) => g.items.length > 0);
  }, [filtered, mode, dueInfo]);

  // ---- header / strip metrics (from the full scoped set, ignoring filters) ----
  const metrics = useMemo(() => {
    const all = rows || [];
    // Level = the ambassador's real STATUS, not whether they've logged in. A Level-2
    // (approved) person who has logged in is still Level 2 (warming up / verifying)
    // until their setup fee is paid — they must keep counting here.
    const lvl1 = all.filter((r) => ["pending", "contacted", "reviewing", "onboarding", "on_hold"].includes(r.status));
    const lvl2 = all.filter((r) => r.status === "approved");
    const earning = all.filter((r) => r.status === "onboarded");          // fully onboarded = live/earning
    const earningOk = earning.filter((r) => !isBlocked(r));
    const inPayments = all.filter(isLive);                                 // logged in or onboarded (the payments view)
    const noGologin = all.filter(missingGologin).length;
    const issues = all.filter(isBlocked).length;
    const monthly = earningOk.reduce((s, r) => s + monthlyAmt(r), 0);
    const setupsDue = inPayments.filter((r) => !isBlocked(r) && !setupPaid(r)).length;   // logged in, setup fee not yet paid
    const liveBlocked = inPayments.filter(isBlocked).length;
    return {
      total: all.length, live: earningOk.length, monthly, noGologin, issues,
      lvl1: lvl1.filter((r) => !isBlocked(r)).length, lvl1Blocked: lvl1.filter(isBlocked).length,
      lvl2: lvl2.filter((r) => !isBlocked(r)).length, lvl2Blocked: lvl2.filter(isBlocked).length,
      onboardedTotal: earning.length, setupsDue, liveBlocked,
    };
  }, [rows]);

  const chips = useMemo(() => {
    const opts = STATUS_OPTIONS.filter((s) => (mode === "live" ? s.value === "onboarded" : s.value !== "onboarded"));
    return [{ value: "all", label: "All", count: scoped.length, dot: null as string | null }].concat(
      opts.map((s) => ({ value: s.value, label: s.label, count: scoped.filter((r) => r.status === s.value).length, dot: `var(${STATUS_STYLE[s.value][1]})` }))
    ).filter((c) => c.value === "all" || c.count > 0);
  }, [scoped, mode]);

  // What's actually owed, money and count from the SAME source: only people visible
  // and payable here (logged in / onboarded, not blocked). Feed items (monthly + any
  // server-side setup) count only if their owner is one of those; then add setup fees
  // for visible people the feed didn't already bill. Blocked accounts never count —
  // that's why a server "due" total for a blocked account no longer shows as phantom money.
  const dueAgg = (() => {
    let php = 0, usd = 0; const people = new Set<string>();
    const visible = new Map<string, Row>();
    for (const r of (rows || [])) if (isLive(r) && !isBlocked(r)) visible.set((r.email || "").toLowerCase(), r);
    const feedSetupEmails = new Set<string>();
    for (const it of (dueInfo?.items || [])) {
      if (it.blocked || !visible.has(it.email)) continue;
      if (it.currency === "USD") usd += it.amount; else php += it.amount;
      people.add(it.email);
      if (it.kind === "setup") feedSetupEmails.add(it.email);
    }
    for (const [em, r] of visible) {
      if (!setupPaid(r) && !feedSetupEmails.has(em)) { const cfg = cfgOf(r); if (cfg.currency === "USD") usd += cfg.setupAmount; else php += cfg.setupAmount; people.add(em); }
    }
    return { php, usd, count: people.size };
  })();
  const dueLabel = dueInfo ? ([dueAgg.php ? formatMoney(dueAgg.php, "PHP") : "", dueAgg.usd ? formatMoney(dueAgg.usd, "USD") : ""].filter(Boolean).join(" + ") || "₱0") : "…";
  const dueCount = dueAgg.count;
  const anyOpen = open.size > 0;

  const modeBtn = (m: Mode): React.CSSProperties => ({ font: `600 12.5px ${F_SANS}`, padding: "7px 14px", borderRadius: 8, cursor: "pointer", border: "none", background: mode === m ? "var(--sheets-btn-bg,#1a56db)" : "transparent", color: mode === m ? "#fff" : "var(--muted,#777)" });

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: "8px 4px 60px" }}>
      {/* title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ maxWidth: 700 }}>
          <h1 style={{ font: `800 28px ${F_GRO}`, margin: "0 0 6px", color: "var(--fg,#111)" }}>Pipeline</h1>
          <p style={{ font: `500 13.5px/1.55 ${F_SANS}`, color: "var(--muted,#777)", margin: 0 }}>
            Every ambassador from signup to a working, paid account — one card each. Applications, onboarding and payouts in a single
            record. An account <b style={{ color: "var(--fg,#333)" }}>can&apos;t run without a GoLogin</b>, so those are badged.
          </p>
        </div>
        <div style={{ textAlign: "right", flex: "none" }}>
          <div style={{ font: `600 13px ${F_SANS}`, color: "var(--muted,#777)" }}>{metrics.total} in pipeline · {metrics.live} live</div>
          <div style={{ font: `600 13px ${F_SANS}`, color: "var(--muted2,#9aa0a6)", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{formatMoney(metrics.monthly, "PHP")}/mo committed</div>
        </div>
      </div>

      {/* health strip */}
      <div style={{ display: "flex", alignItems: "stretch", flexWrap: "wrap", background: "var(--card,#fff)", border: "1px solid var(--card-border,#e3e3e6)", borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
        {(mode === "live"
          ? [
              { label: "Setup fees outstanding", value: formatMoney(metrics.setupsDue * 1000, "PHP"), hint: `${metrics.setupsDue} unpaid`, color: metrics.setupsDue ? "var(--warn-badge-text,#b7791f)" : "var(--fg,#111)" },
              { label: "Monthly commitment", value: `${formatMoney(metrics.monthly, "PHP")}/mo`, hint: "earning accounts only", color: "var(--fg,#111)" },
              { label: "Blocked — can't pay", value: String(metrics.liveBlocked), hint: metrics.liveBlocked === 1 ? "1 account on hold" : `${metrics.liveBlocked} accounts on hold`, color: metrics.liveBlocked ? "var(--st-cancel-fg,#c0392b)" : "var(--fg,#111)" },
            ]
          : [
              { label: "Level 1 · warm-up", value: String(metrics.lvl1), hint: metrics.lvl1Blocked ? `not logged in · ${metrics.lvl1Blocked} blocked` : "warming up, not logged in", color: "var(--blue-chip-text,#1a56db)" },
              { label: "Level 2 · logged in", value: String(metrics.lvl2), hint: metrics.lvl2Blocked ? `payout stage · ${metrics.lvl2Blocked} blocked` : "logged in — payout stage", color: "var(--st-conv-fg,#6d28d9)" },
              { label: "Live accounts", value: String(metrics.live), hint: metrics.onboardedTotal > metrics.live ? `earning · ${metrics.onboardedTotal - metrics.live} blocked` : "onboarded and earning", color: "var(--st-active-fg,#188038)" },
              { label: "No GoLogin", value: String(metrics.noGologin), hint: "can't be run", color: metrics.noGologin ? "var(--warn-badge-text,#b7791f)" : "var(--fg,#111)" },
              { label: "Problem accounts", value: String(metrics.issues), hint: "GoLogin / login / restricted", color: metrics.issues ? "var(--st-cancel-fg,#c0392b)" : "var(--fg,#111)" },
            ]
        ).map((s, i) => (
          <div key={i} style={{ flex: "1 1 150px", padding: "13px 18px", borderRight: "1px solid var(--divider,#eee)" }}>
            <div style={{ ...labelCss, marginBottom: 5 }}>{s.label}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ font: `700 18px ${F_GRO}`, color: s.color, fontVariantNumeric: "tabular-nums" }}>{s.value}</span>
              <span style={{ font: `500 11.5px ${F_SANS}`, color: "var(--muted,#8a9099)" }}>{s.hint}</span>
            </div>
          </div>
        ))}
        {mode === "live" && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 18px", flex: "none" }}>
            <div>
              <span style={{ font: `700 15px ${F_GRO}`, color: "var(--fg,#111)", fontVariantNumeric: "tabular-nums" }}>{dueLabel}</span>
              <div style={{ font: `600 11.5px ${F_SANS}`, color: "var(--link,#0a66c2)", whiteSpace: "nowrap" }}>due now · {dueCount} payout{dueCount === 1 ? "" : "s"}</div>
            </div>
            <button onClick={emailDue} disabled={emailState === "sending"} style={{ ...btnPrimary, background: "var(--st-active-fg,#188038)", whiteSpace: "nowrap" }}>
              {emailState === "sent" ? "Sent ✓" : emailState === "error" ? "Failed — retry" : emailState === "sending" ? "Sending…" : "✉ Email Milee"}
            </button>
          </div>
        )}
      </div>

      {/* mode + hint */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ display: "inline-flex", background: "var(--band,#f1f1f2)", border: "1px solid var(--card-border,#e3e3e6)", borderRadius: 10, padding: 3 }}>
          <button onClick={() => { setMode("stage"); setStatusFilter("all"); setPocFilter("all"); }} style={modeBtn("stage")}>By stage</button>
          <button onClick={() => { setMode("action"); setStatusFilter("all"); setPocFilter("all"); }} style={modeBtn("action")}>By next action</button>
          <button onClick={() => { setMode("live"); setStatusFilter("all"); setPocFilter("all"); }} style={modeBtn("live")}>Onboarded · payments</button>
        </div>
        <span style={{ font: `500 12px ${F_SANS}`, color: "var(--muted2,#9aa0a6)" }}>
          {mode === "stage" ? "Pipeline stage — onboarded people live in the payments view" : mode === "live" ? "Onboarded only — log payments, proof and acknowledgement here" : "What to do next — onboarded people live in the payments view"}
        </span>
      </div>

      {/* status chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 }}>
        {chips.map((c) => (
          <button key={c.value} onClick={() => setStatusFilter(c.value)} style={{ display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer", font: `600 12px ${F_SANS}`, padding: "7px 12px", borderRadius: 999, border: "1px solid", borderColor: statusFilter === c.value ? "transparent" : "var(--input-border,#dcdce0)", background: statusFilter === c.value ? "var(--chip-active-bg,#eaf1ff)" : "transparent", color: statusFilter === c.value ? "var(--chip-active-text,#1a56db)" : "var(--muted,#555)" }}>
            {c.dot && <span style={{ width: 6, height: 6, borderRadius: 999, background: c.dot }} />}
            {c.label}
            <span style={{ font: `700 10.5px ${F_GRO}`, fontVariantNumeric: "tabular-nums", padding: "1px 5px", borderRadius: 5, background: "var(--band,#f1f1f2)", color: "var(--muted,#888)" }}>{c.count}</span>
          </button>
        ))}
      </div>

      {/* PoC filter chips */}
      {pocChips.named.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 7, marginBottom: 12 }}>
          <span style={{ ...labelCss, marginRight: 2 }}>PoC</span>
          {[{ key: "all", label: "All", count: pocChips.total }, ...pocChips.named.map(([k, n]) => ({ key: k, label: formatName(k), count: n })), ...(pocChips.unassigned ? [{ key: "__unassigned", label: "Unassigned", count: pocChips.unassigned }] : [])].map((c) => (
            <button key={c.key} onClick={() => setPocFilter(c.key)} style={{ display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer", font: `600 12px ${F_SANS}`, padding: "6px 12px", borderRadius: 999, border: "1px solid", borderColor: pocFilter === c.key ? "transparent" : "var(--input-border,#dcdce0)", background: pocFilter === c.key ? "var(--chip-active-bg,#eaf1ff)" : "transparent", color: pocFilter === c.key ? "var(--chip-active-text,#1a56db)" : "var(--muted,#555)" }}>
              {c.label}
              <span style={{ font: `700 10.5px ${F_GRO}`, fontVariantNumeric: "tabular-nums", padding: "1px 5px", borderRadius: 5, background: "var(--band,#f1f1f2)", color: "var(--muted,#888)" }}>{c.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* search + toggles */}
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 22, flexWrap: "wrap" }}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, contact, account, referrer or POC…" style={{ ...inputCss, flex: "1 1 280px", padding: "11px 14px", font: `500 13.5px ${F_SANS}` }} />
        <button onClick={() => setFlagged((f) => !f)} style={{ ...btnSec, whiteSpace: "nowrap", padding: "11px 15px", ...(flagged ? { background: "var(--warn-badge-bg,#fef3e2)", color: "var(--warn-badge-text,#b7791f)", borderColor: "var(--warn-badge-text,#b7791f)" } : {}) }}>⚠ Problems only</button>
        <button onClick={() => setOpen(anyOpen ? new Set() : new Set(filtered.map((r) => r.id)))} style={{ ...btnSec, whiteSpace: "nowrap", padding: "11px 15px" }}>{anyOpen ? "Collapse all" : "Expand all"}</button>
      </div>

      {error && <p style={{ color: "var(--st-cancel-fg,#b00)", font: `600 14px ${F_SANS}` }}>Failed to load.</p>}
      {!rows && !error && <p style={{ font: `500 14px ${F_SANS}`, color: "var(--muted,#888)" }}>Loading…</p>}

      {rows && groups.map((g) => (
        <GroupSection key={g.key} title={g.label} tone={g.dot} note={g.note} count={g.items.length}
          subtotal={mode === "live" ? formatMoney(g.items.filter((r) => !isBlocked(r)).reduce((s, r) => s + monthlyAmt(r), 0), "PHP") + "/mo" : ""}>
          {g.items.map((r) => (
            <Card key={r.id} r={r} busy={busy === r.id} open={open.has(r.id)} onToggle={() => toggle(r.id)}
              patchApp={patchApp} patchAccount={patchAccount} setStage={changeStatus} workflow={workflow}
              logTouch={logTouch} logPayment={logPayment} updatePayout={updatePayout} onFilterText={setQuery} />
          ))}
        </GroupSection>
      ))}
      {rows && groups.length === 0 && (
        <div style={{ padding: 44, textAlign: "center", background: "var(--card,#fff)", border: "1px solid var(--card-border,#e3e3e6)", borderRadius: 14, font: `500 13.5px ${F_SANS}`, color: "var(--muted,#888)" }}>Nobody matches these filters.</div>
      )}
    </div>
  );
}

function GroupSection({ title, tone, note, count, subtotal, children }: { title: string; tone: string; note: string; count: number; subtotal?: string; children: React.ReactNode }) {
  const [closed, setClosed] = useState(false);
  return (
    <section style={{ marginTop: 26 }}>
      <div onClick={() => setClosed((c) => !c)} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap", borderBottom: "1px solid var(--divider,#eee)", paddingBottom: 8, cursor: "pointer", userSelect: "none" }}>
        <span style={{ font: `600 11px ${F_SANS}`, color: "var(--muted2,#9aa0a6)", width: 10, display: "inline-block", transform: closed ? "none" : "rotate(90deg)", transition: "transform .15s" }}>▸</span>
        <span style={{ width: 9, height: 9, borderRadius: 999, background: tone }} />
        <h2 style={{ font: `700 16px ${F_GRO}`, margin: 0, color: "var(--fg,#111)" }}>{title}</h2>
        <span style={{ font: `700 12px ${F_GRO}`, padding: "2px 8px", borderRadius: 7, background: "var(--band,#f1f1f2)", color: "var(--muted,#888)" }}>{count}</span>
        <span style={{ font: `500 12.5px ${F_SANS}`, color: "var(--muted2,#9aa0a6)", flex: 1 }}>{note}</span>
        {subtotal && <span style={{ font: `600 13px ${F_GRO}`, color: "var(--muted,#888)", fontVariantNumeric: "tabular-nums" }}>{subtotal}</span>}
      </div>
      {!closed && <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>{children}</div>}
    </section>
  );
}

// -- shared small pieces -----------------------------------------------------
function D({ label, children }: { label: string; children?: React.ReactNode }) {
  const empty = children === null || children === undefined || children === "" || children === false;
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ ...labelCss, marginBottom: 3 }}>{label}</div>
      <div style={{ font: `600 13px ${F_SANS}`, color: empty ? "var(--muted2,#b6bbc2)" : "var(--fg,#111)", wordBreak: "break-word" }}>{empty ? "—" : children}</div>
    </div>
  );
}
function Edit({ label, value, onSave, placeholder, numeric, hint, secret, openHref }: { label: string; value: string | number | null; onSave: (v: string | number | null) => void; placeholder?: string; numeric?: boolean; hint?: string; secret?: boolean; openHref?: string | null }) {
  const [reveal, setReveal] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
      <span style={labelCss}>{label}{hint && <span style={{ color: "var(--muted2,#9aa0a6)", textTransform: "none", letterSpacing: 0, fontWeight: 500 }}> · {hint}</span>}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <input defaultValue={value == null ? "" : String(value)} placeholder={placeholder} inputMode={numeric ? "numeric" : undefined} type={secret && !reveal ? "password" : "text"}
          onClick={(e) => e.stopPropagation()}
          onBlur={(e) => {
            const raw = e.target.value.trim();
            if (raw === (value == null ? "" : String(value))) return;
            onSave(numeric ? (raw === "" ? null : (parseInt(raw.replace(/[^0-9]/g, ""), 10) || null)) : (raw === "" ? null : raw));
          }} style={inputCss} />
        {openHref && <a href={liHref(openHref)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} title="Open link" style={{ font: `600 12px ${F_SANS}`, color: "var(--link,#0a66c2)", flex: "none", textDecoration: "none" }}>↗</a>}
        {secret && <span onClick={(e) => { e.stopPropagation(); setReveal((s) => !s); }} style={{ font: `600 11.5px ${F_SANS}`, color: "var(--muted,#8a97ad)", cursor: "pointer", flex: "none" }}>{reveal ? "Hide" : "Show"}</span>}
      </div>
    </div>
  );
}
function EditSelect({ label, value, options, onSave }: { label: string; value: string; options: { value: string; label: string }[]; onSave: (v: string) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
      <span style={labelCss}>{label}</span>
      <select value={value} onClick={(e) => e.stopPropagation()} onChange={(e) => onSave(e.target.value)} style={{ ...inputCss, cursor: "pointer" }}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
function SectionLabel({ children, num }: { children: React.ReactNode; num?: number }) {
  return <div style={{ ...labelCss, marginBottom: 10 }}>{num ? `${num} · ` : ""}{children}</div>;
}
function Note({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ ...labelCss, marginBottom: 3 }}>{label}</div>
      <div style={{ font: `500 12.5px/1.55 ${F_SANS}`, color: "var(--fg,#444)", whiteSpace: "pre-wrap" }}>{children}</div>
    </div>
  );
}

const GRID4: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "12px 14px" };

function Card({ r, busy, open, onToggle, patchApp, patchAccount, setStage, workflow, logTouch, logPayment, updatePayout, onFilterText }: {
  r: Row; busy: boolean; open: boolean; onToggle: () => void;
  onFilterText: (t: string) => void;
  patchApp: (id: string, patch: Record<string, unknown>, reload?: boolean) => void;
  patchAccount: (id: string, accountId: string, patch: Record<string, unknown>, reload?: boolean) => void;
  setStage: (r: Row, s: Status) => void;
  workflow: (id: string, patch: Record<string, unknown>) => void;
  logTouch: (id: string, ch: string, text: string, by: string) => Promise<void>;
  logPayment: (r: Row, kind: "setup" | "monthly") => Promise<void>;
  updatePayout: (r: Row, index: number, patch: { proofUrl?: string | null; notified?: boolean; acknowledged?: boolean }) => Promise<void>;
}) {
  const stage = stageOf(r);
  const live = isLive(r);                    // logged in or onboarded — payment surface applies
  const onboarded = r.status === "onboarded"; // fully onboarded — workflow finished
  const blocked = isBlocked(r);
  const accent = STAGE_ACCENT[stage];
  const acctSave = (patch: Record<string, unknown>, reload = false) => { if (r.accountId) patchAccount(r.id, r.accountId, patch, reload); };
  const st = STATUS_STYLE[r.status];

  return (
    <div style={{ border: `1px solid ${blocked ? "var(--warn-badge-text,#b7791f)" : "var(--card-border,#e3e3e6)"}`, borderLeft: `3px solid ${accent}`, borderRadius: 12, background: "var(--card,#fff)", overflow: "hidden" }}>
      {/* header */}
      <div style={{ padding: "12px 15px", display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
        <div onClick={onToggle} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }} style={{ flex: "1 1 320px", minWidth: 0, cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span style={{ font: `600 11px ${F_SANS}`, color: "var(--muted2,#9aa0a6)", width: 10, flex: "none", marginTop: 12, transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }}>▸</span>
          <div style={{ width: 38, height: 38, borderRadius: 11, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", font: `600 14px ${F_GRO}`, background: "var(--avatar-bg,#eef)", color: "var(--avatar-fg,#557)" }}>{initialsOf(r.fullName)}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ font: `700 16px ${F_GRO}`, color: "var(--fg,#111)" }}>{formatName(r.fullName) || "—"}</span>
              {r.linkedinUrl && <a href={liHref(r.linkedinUrl)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ font: `600 11px ${F_SANS}`, color: "var(--link,#0a66c2)", background: "var(--link-bg,#eaf1ff)", padding: "3px 8px", borderRadius: 6 }}>↗ profile</a>}
              {r.linkedinVerified && <span style={{ font: `700 10px ${F_SANS}`, padding: "2px 8px", borderRadius: 999, background: "var(--blue-chip-bg,#e8f0fe)", color: "var(--blue-chip-text,#1a56db)" }}>✓ Verified</span>}
              {r.accountStatus === "removed" && <span title="Ambassador pulled their account back" style={{ font: `700 10px ${F_SANS}`, padding: "2px 8px", borderRadius: 999, background: "var(--neutral-bg,#eef1f5)", color: "var(--muted,#647189)" }}>↩ Withdrawn</span>}
              {r.accountStatus === "retired" && <span title="LinkedIn permanently restricted — inaccessible" style={{ font: `700 10px ${F_SANS}`, padding: "2px 8px", borderRadius: 999, background: "var(--st-cancel-bg,#fdecea)", color: "var(--st-cancel-fg,#c0392b)" }}>⛔ Permanently restricted</span>}
              {r.accountRestrictedAt && r.accountStatus !== "retired" && r.accountStatus !== "removed" && <span title={`Restricted ${fmtDate(r.accountRestrictedAt)} — flagged by LinkedIn, may recover`} style={{ font: `700 10px ${F_SANS}`, padding: "2px 8px", borderRadius: 999, background: "var(--st-cancel-bg,#fdecea)", color: "var(--st-cancel-fg,#c0392b)" }}>⚠ Restricted</span>}
              {missingGologin(r) && r.accountStatus !== "removed" && r.accountStatus !== "retired" && <span title="No GoLogin — account can't be run until one is added" style={{ font: `700 10px ${F_SANS}`, padding: "2px 8px", borderRadius: 999, background: "var(--warn-badge-bg,#fef3e2)", color: "var(--warn-badge-text,#b7791f)" }}>⚠ No GoLogin</span>}
              {r.accountIssue && !r.accountRestrictedAt && r.accountStatus !== "retired" && r.accountStatus !== "removed" && <span title={r.accountIssue} style={{ font: `700 10px ${F_SANS}`, padding: "2px 8px", borderRadius: 999, background: "var(--st-cancel-bg,#fdecea)", color: "var(--st-cancel-fg,#c0392b)" }}>⚠ {r.accountIssue.length > 22 ? "login issue" : r.accountIssue}</span>}
              {isLikelyTestEmail(r.email) && <span style={{ font: `700 9px ${F_SANS}`, letterSpacing: ".05em", padding: "2px 6px", borderRadius: 5, background: "var(--test-bg,#fde68a)", color: "var(--test-fg,#92400e)" }}>TEST</span>}
            </div>
            <div style={{ font: `500 12.5px ${F_SANS}`, color: "var(--muted,#8a9099)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {r.email}{r.contactNumber ? ` · ${r.contactNumber}` : ""}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 14px", marginTop: 4, font: `500 12px ${F_SANS}`, color: "var(--muted2,#9aa0a6)" }}>
              <span>Applied <b style={{ color: "var(--fg,#444)" }}>{fmtDate(r.createdAt)}</b> ({ageDays(r.createdAt)}d)</span>
              {r.onboardedAt && <span>Logged in <b style={{ color: "var(--fg,#444)" }}>{fmtDate(r.onboardedAt)}</b></span>}
              {(() => {
                if (!r.accountId) return <span>Account <b style={{ color: "var(--st-cancel-fg,#c0392b)" }}>none linked</b></span>;
                const an = r.accountName ? formatName(r.accountName) : "";
                const differs = !!an && an.trim().toLowerCase() !== (formatName(r.fullName) || "").trim().toLowerCase();
                return differs ? <span>Account <b style={{ color: "var(--fg,#444)" }}>{an}</b></span> : null;
              })()}
              <span>PoC <b style={{ color: r.poc ? "var(--fg,#444)" : "var(--muted2,#9aa0a6)" }}>{r.poc || "—"}</b></span>
              {r.referredBy && <span>Referrer <b role="button" title="Filter by this referrer" onClick={(e) => { e.stopPropagation(); onFilterText(r.referredBy!); }} style={{ color: "var(--link,#0a66c2)", cursor: "pointer" }}>{r.referredBy}</b></span>}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flex: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <select value={r.status} disabled={busy} onClick={(e) => e.stopPropagation()} onChange={(e) => setStage(r, e.target.value as Status)}
              style={{ font: `600 11.5px ${F_SANS}`, padding: "4px 9px", borderRadius: 7, border: "none", cursor: busy ? "wait" : "pointer", outline: "none", background: `var(${st[0]})`, color: `var(${st[1]})` }}>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {r.reason && <span style={{ font: `500 11px ${F_SANS}`, color: "var(--muted2,#9aa0a6)", whiteSpace: "nowrap" }}>{r.reason}</span>}
            {live && <span style={{ font: `600 13px ${F_GRO}`, color: "var(--fg,#111)", fontVariantNumeric: "tabular-nums" }}>{formatMoney(monthlyAmt(r), cfgOf(r).currency)}/mo</span>}
          </div>
        </div>
      </div>

      {open && (
        <div style={{ borderTop: "1px solid var(--divider,#eee)", background: "var(--panel,#fafafa)", padding: "16px" }}>
          {/* workflow rail — until fully onboarded (stability check lives here) */}
          {!onboarded && (
            <WorkflowRail r={r} busy={busy} workflow={workflow} />
          )}

          {/* BLOCK 1 — applicant & payout */}
          <SectionLabel num={1}>Applicant &amp; payout</SectionLabel>
          <div style={{ ...GRID4, marginBottom: 20 }}>
            <Edit label="Contact number / handle" value={r.contactNumber} placeholder="phone / handle" onSave={(v) => patchApp(r.id, { contactNumber: v })} />
            <Edit label="Contact channel" value={r.contactChannel} placeholder="Viber / Telegram / WhatsApp" onSave={(v) => patchApp(r.id, { contactChannel: v })} />
            <Edit label="Location" value={r.location} placeholder="city / country" onSave={(v) => patchApp(r.id, { location: v })} />
            <Edit label="Industry" value={r.industry} placeholder="—" onSave={(v) => patchApp(r.id, { industry: v })} />
            <Edit label="LinkedIn URL" value={r.linkedinUrl} placeholder="linkedin.com/in/…" onSave={(v) => patchApp(r.id, { linkedinUrl: v })} />
            <Edit label="LinkedIn email (applied with)" value={r.linkedinEmail} placeholder="same as owner" onSave={(v) => patchApp(r.id, { linkedinEmail: v })} />
            <Edit label="Booking email" value={r.bookingEmail} placeholder="if booked with another email" onSave={(v) => patchApp(r.id, { bookingEmail: v })} />
            <Edit label="Connections" value={r.connectionCount} numeric placeholder="e.g. 500" onSave={(v) => patchApp(r.id, { connectionCount: v })} />
            <Edit label="Referred by" value={r.referredBy} placeholder="marketer code" onSave={(v) => patchApp(r.id, { referredBy: v })} />
            <Edit label="Referral source" value={r.referralSource} placeholder="flyer / FB / referral" onSave={(v) => patchApp(r.id, { referralSource: v })} />
            <Edit label="POC" hint="who owns this" value={r.poc} placeholder="type a name…" onSave={(v) => patchApp(r.id, { poc: v ?? "" })} />
            <Edit label="Payout method" value={r.paymentMethod} placeholder="Wise / PayPal / GCash" onSave={(v) => patchApp(r.id, { paymentMethod: v })} />
            <Edit label="Payout handle / account no." value={r.paymentDetails} placeholder="email / number / account" onSave={(v) => patchApp(r.id, { paymentDetails: v })} />
            <Edit label="Payout name" value={r.payoutName} placeholder="name on the account" onSave={(v) => patchApp(r.id, { payoutName: v })} />
            <EditSelect label="Payout currency" value={r.payoutCurrency || ""} options={[{ value: "", label: "Auto" }, { value: "PHP", label: "PHP ₱" }, { value: "USD", label: "USD $" }]} onSave={(v) => patchApp(r.id, { payoutCurrency: v || null })} />
            <EditSelect label="Owner status" value={r.ownerStatus || ""} options={OWNER_STATUS_OPTIONS} onSave={(v) => patchApp(r.id, { ownerStatus: v || null })} />
            <Edit label="Account issue" value={r.accountIssue} placeholder="login problem, restriction…" onSave={(v) => patchApp(r.id, { accountIssue: v })} />
          </div>

          {/* BLOCK 2 — account & credentials */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 12, flexWrap: "wrap" }}>
            <SectionLabel num={2}>Account &amp; credentials</SectionLabel>
            {!r.accountId ? (
              <span style={{ font: `600 11px ${F_SANS}`, color: "var(--muted2,#9aa0a6)" }}>no account linked</span>
            ) : !r.hasGologin ? (
              <span style={{ font: `600 11px ${F_SANS}`, color: needsGologin(r) ? "var(--warn-badge-text,#b7791f)" : "var(--muted,#8a97ad)" }}>{needsGologin(r) ? "⚠ No GoLogin — this account cannot be run" : "GoLogin not added yet"}</span>
            ) : r.gologinShareLink ? (
              <a href={liHref(r.gologinShareLink)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ font: `600 11px ${F_SANS}`, color: "var(--link,#0a66c2)", background: "var(--link-bg,#eaf1ff)", padding: "3px 9px", borderRadius: 6 }}>↗ Open GoLogin</a>
            ) : (
              <span style={{ font: `600 11px ${F_SANS}`, color: "var(--muted,#8a97ad)" }}>GoLogin {r.gologinProfileId ? r.gologinProfileId.slice(0, 10) + "…" : "ready"}</span>
            )}
          </div>
          <RestrictionControl r={r} onAccount={acctSave} onApp={(patch) => patchApp(r.id, patch)} />
          {r.accountId ? (
            <div style={{ background: "var(--inset,#fafbfc)", border: `1px solid ${missingGologin(r) ? "var(--warn-badge-text,#b7791f)" : "var(--divider,#eee)"}`, borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
              <div style={GRID4}>
                <Edit label="Login email (work)" value={r.loginEmail} placeholder="klabber address we sign in with" onSave={(v) => acctSave({ loginEmail: v })} />
                <Edit label="Personal email (on account)" value={r.personalEmail} placeholder="ambassador's own" onSave={(v) => acctSave({ personalEmail: v })} />
                <Edit label="Work / recovery email" value={r.workEmail} placeholder="recovery email on the account" onSave={(v) => acctSave({ workEmail: v })} />
                <Edit label="GoLogin share link" value={r.gologinShareLink} openHref={r.gologinShareLink} placeholder="https://app.gologin.com/share/…" onSave={(v) => acctSave({ gologinShareLink: v }, true)} />
                <Edit label="Password" value={r.accountPassword} secret placeholder="set account password" onSave={(v) => acctSave({ accountPassword: v })} />
                <Edit label="2FA / TOTP" hint="backup code / secret" value={r.twoFactor} secret placeholder="2FA secret / backup" onSave={(v) => acctSave({ twoFactor: v })} />
                <Edit label="Proxy host" value={r.proxyHost} placeholder="1.2.3.4" onSave={(v) => acctSave({ proxyHost: v })} />
                <Edit label="Proxy port" value={r.proxyPort} numeric placeholder="8000" onSave={(v) => acctSave({ proxyPort: v })} />
                <Edit label="Proxy username" value={r.proxyUsername} onSave={(v) => acctSave({ proxyUsername: v })} />
                <Edit label="Proxy password" value={r.proxyPassword} secret onSave={(v) => acctSave({ proxyPassword: v })} />
                <Edit label="Proxy location" value={r.proxyLocation} placeholder="City, Country" onSave={(v) => acctSave({ proxyLocation: v })} />
                <EditSelect label="Account status" value={r.accountStatus || "under_review"} options={ACCOUNT_STATUS_OPTIONS.map((s) => ({ value: s, label: s.replace(/_/g, " ") }))} onSave={(v) => acctSave({ status: v }, true)} />
                <Edit label="Rent price ($/mo)" value={r.monthlyPrice} numeric placeholder="e.g. 50" onSave={(v) => acctSave({ monthlyPrice: v ?? 0 })} />
                <Edit label="Ambassador payout /mo" value={r.ambassadorPayment} numeric placeholder="amount" onSave={(v) => acctSave({ ambassadorPayment: v ?? 0 })} />
                <EditSelect label="LinkedIn verified" value={r.linkedinVerified ? "yes" : "no"} options={[{ value: "no", label: "No" }, { value: "yes", label: "✓ Yes" }]} onSave={(v) => acctSave({ linkedinVerified: v === "yes" }, true)} />
                <D label="Restricted">{r.accountRestrictedAt ? `Restricted · ${fmtDate(r.accountRestrictedAt)}` : "No"}</D>
              </div>
            </div>
          ) : (
            <div style={{ background: "var(--inset,#fafbfc)", border: "1px dashed var(--divider,#ddd)", borderRadius: 12, padding: 16, marginBottom: 20, font: `500 12.5px ${F_SANS}`, color: "var(--muted,#888)" }}>
              No account linked yet — link one on Inventory once they&apos;ve handed over the login (matched by LinkedIn URL or an “Owner: email” note), then GoLogin, proxy, 2FA and pricing open up here.
            </div>
          )}

          {/* BLOCK 3 — outreach log */}
          <SectionLabel num={3}>Outreach log</SectionLabel>
          <OutreachLog r={r} busy={busy} onLog={logTouch} onSetFollowUp={(iso) => patchApp(r.id, { nextFollowUp: iso })} onDelete={(at) => patchApp(r.id, { removeTouch: at }, true)} />

          {(r.adminNotes || r.applicationNotes || r.accountNotes) && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
              {r.adminNotes && <Note label="Admin notes">{r.adminNotes}</Note>}
              {r.applicationNotes && <Note label="Application notes">{r.applicationNotes}</Note>}
              {r.accountNotes && <Note label="Account notes">{r.accountNotes}</Note>}
            </div>
          )}

          {/* BLOCK 4 — payments (onboarded only) */}
          {live && <PaymentBlock r={r} busy={busy} workflow={workflow} logPayment={logPayment} updatePayout={updatePayout} />}

          {/* decision / live bar */}
          {!live ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, paddingTop: 14, marginTop: 16, borderTop: "1px solid var(--divider,#eee)", flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {r.status !== "approved" && r.status !== "onboarding" && <button onClick={() => workflow(r.id, { status: "onboarding" })} disabled={busy} title="They've agreed — start onboarding (Level 1 warm-up)" style={{ ...btnPrimary, background: "var(--st-active-fg,#188038)" }}>✓ Accept → Level 1</button>}
                {r.status !== "rejected" && <button onClick={() => workflow(r.id, { status: "rejected" })} disabled={busy} style={{ font: `600 12px ${F_SANS}`, color: "var(--danger,#c0392b)", background: "transparent", border: "1px solid var(--danger-border,#e6b4ad)", padding: "8px 13px", borderRadius: 8, cursor: "pointer" }}>Reject</button>}
              </div>
              <span style={{ font: `500 11.5px ${F_SANS}`, color: "var(--muted2,#9aa0a6)" }}>Accepting reveals the inventory profile · other states from the status dropdown</span>
            </div>
          ) : onboarded ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 14, marginTop: 16, borderTop: "1px solid var(--divider,#eee)" }}>
              <span style={{ font: `500 11.5px ${F_SANS}`, color: "var(--muted,#8a9099)" }}>Onboarding complete — warm-up and setup are done. Use the status dropdown to move them back into the pipeline.</span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

// -- workflow rail (pre-onboarded): 4 sequential step cards -------------------
function WorkflowRail({ r, busy, workflow }: { r: Row; busy: boolean; workflow: (id: string, patch: Record<string, unknown>) => void }) {
  const accepted = r.status === "approved" || r.status === "onboarding";
  const started = !!r.onboardingStartedAt;
  const loginDue = loginDueMs(r);
  const loginOver = loginDue !== null && Date.now() >= loginDue;
  const verified = !!r.verifiedAt;
  const gated = !accepted;

  type Step = { label: string; title: string; sub: string; done: boolean; render: (isNext: boolean) => React.ReactNode };
  const stepCard = (label: string, title: string, sub: string, isNext: boolean, body: React.ReactNode) => (
    <div style={{ flex: "1 1 190px", minWidth: 180, background: "var(--card,#fff)", border: `1px solid ${isNext ? "var(--sheets-btn-bg,#1a56db)" : "var(--divider,#eee)"}`, borderRadius: 10, padding: "11px 12px" }}>
      <div style={{ ...labelCss, marginBottom: 4 }}>{label}</div>
      <div style={{ font: `600 12.5px ${F_SANS}`, color: "var(--fg,#111)", marginBottom: 3 }}>{title}</div>
      <div style={{ font: `500 11px ${F_SANS}`, color: "var(--muted,#8a97ad)", marginBottom: 8, minHeight: 15 }}>{sub}</div>
      {body}
    </div>
  );
  const doneBadge = (text: string) => <span style={{ font: `600 11.5px ${F_SANS}`, color: "var(--st-active-fg,#188038)", background: "var(--st-active-bg,#e6f4ea)", padding: "6px 10px", borderRadius: 7, display: "inline-block" }}>✓ {text}</span>;

  const steps: Step[] = [
    {
      label: "Step 1", title: "Start warm-up", sub: r.accountFreshness === "fresh" ? "fresh · 1 week" : "established · 3 days", done: started,
      render: (isNext) => started ? doneBadge("Warm-up started")
        : gated ? <span style={{ font: `500 11px ${F_SANS}`, color: "var(--muted2,#9aa0a6)" }}>accept first</span>
          : (<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button onClick={() => workflow(r.id, { status: "onboarding", onboardingStartedAt: new Date().toISOString(), accountFreshness: "established" })} disabled={busy} style={{ ...btnPrimary, width: "100%", background: isNext ? "var(--sheets-btn-bg,#1a56db)" : "var(--btn-secondary-bg,#fff)", color: isNext ? "#fff" : "var(--btn-secondary-fg,#333)", border: isNext ? "none" : "1px solid var(--btn-secondary-border,#dcdce0)" }}>Established · 3d</button>
              <button onClick={() => workflow(r.id, { status: "onboarding", onboardingStartedAt: new Date().toISOString(), accountFreshness: "fresh" })} disabled={busy} style={{ ...btnSec, width: "100%" }}>Fresh · 1wk</button>
            </div>),
    },
    {
      // Logging in moves them to LEVEL 2 (approved) and stamps the login — it does NOT
      // mark them Onboarded (that's the paid/earning end state). They stay in the by-stage
      // view under Level 2 and the setup fee falls due 24h later.
      label: "Step 2", title: "Mark logged in", sub: r.onboardedAt ? `logged in ${fmtDate(r.onboardedAt)}` : started ? (loginOver ? "warm-up done — log in" : `due ${loginDue ? fmtDate(new Date(loginDue).toISOString()) : "—"}`) : "once they hand over the login", done: !!r.onboardedAt,
      render: (isNext) => r.onboardedAt
        ? (<div style={{ display: "flex", flexDirection: "column", gap: 5 }}>{doneBadge("Logged in")}<span onClick={() => workflow(r.id, { onboardedAt: null })} style={{ font: `500 10.5px ${F_SANS}`, color: "var(--muted,#8a97ad)", cursor: "pointer" }}>undo</span></div>)
        : (<button onClick={() => workflow(r.id, { status: "approved", onboardedAt: new Date().toISOString() })} disabled={busy || !started} style={{ ...btnPrimary, width: "100%", background: isNext && started ? "var(--sheets-btn-bg,#1a56db)" : "var(--btn-secondary-bg,#fff)", color: isNext && started ? "#fff" : "var(--muted2,#9aa0a6)", border: isNext && started ? "none" : "1px solid var(--divider,#eee)", cursor: started ? "pointer" : "not-allowed" }}>✓ Logged in → Level 2</button>),
    },
    {
      label: "Step 3", title: "Stability check", sub: "account good to go — not restricted", done: verified,
      render: (isNext) => verified ? (<div style={{ display: "flex", flexDirection: "column", gap: 5 }}>{doneBadge("Account OK")}<span onClick={() => workflow(r.id, { verifiedAt: null })} style={{ font: `500 10.5px ${F_SANS}`, color: "var(--muted,#8a97ad)", cursor: "pointer" }}>undo</span></div>)
        : <button onClick={() => workflow(r.id, { verifiedAt: new Date().toISOString() })} disabled={busy} style={{ ...btnPrimary, width: "100%", background: isNext ? "var(--sheets-btn-bg,#1a56db)" : "var(--btn-secondary-bg,#fff)", color: isNext ? "#fff" : "var(--btn-secondary-fg,#333)", border: isNext ? "none" : "1px solid var(--btn-secondary-border,#dcdce0)" }}>✓ Account OK</button>,
    },
    {
      label: "Step 4", title: "Setup fee", sub: `${formatMoney(cfgOf(r).setupAmount, cfgOf(r).currency)} · 24h after login`, done: setupPaid(r),
      render: () => setupPaid(r) ? doneBadge("Paid") : <span style={{ font: `500 11px ${F_SANS}`, color: "var(--muted2,#9aa0a6)" }}>log it in payments once live</span>,
    },
  ];
  let unlocked = true;

  return (
    <div style={{ background: "var(--inset,#fafbfc)", border: "1px solid var(--divider,#eee)", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
      <div style={{ marginBottom: 12 }}>
        <SectionLabel>Workflow</SectionLabel>
      </div>
      <div style={{ display: "flex", alignItems: "stretch", gap: 8, flexWrap: "wrap" }}>
        {steps.map((s, i) => {
          const isNext = !s.done && unlocked && !gated;
          if (!s.done) unlocked = false;
          return <div key={i} style={{ flex: "1 1 190px", minWidth: 180 }}>{stepCard(s.label, s.title, s.sub, isNext, s.render(isNext))}</div>;
        })}
      </div>
    </div>
  );
}

// -- payment block (onboarded) -----------------------------------------------
function PaymentBlock({ r, busy, workflow, logPayment, updatePayout }: {
  r: Row; busy: boolean;
  workflow: (id: string, patch: Record<string, unknown>) => void;
  logPayment: (r: Row, kind: "setup" | "monthly") => Promise<void>;
  updatePayout: (r: Row, index: number, patch: { proofUrl?: string | null; notified?: boolean; acknowledged?: boolean }) => Promise<void>;
}) {
  const [okPay, setOkPay] = useState<{ setup: boolean; monthly: boolean }>({ setup: false, monthly: false });
  const cfg = cfgOf(r);
  const pays = r.monthlyPayouts || [];
  const setupDone = setupPaid(r);
  const verified = !!r.verifiedAt;

  const schedRow = (key: "setup" | "monthly", title: string, sub: string, done: boolean, onLog: () => void, logLabel: string, confirm?: { ok: boolean; onToggle: () => void; label: string }) => {
    const ok = confirm ? confirm.ok : okPay[key];
    const onToggle = confirm ? confirm.onToggle : () => setOkPay((p) => ({ ...p, [key]: !p[key] }));
    const confirmText = confirm ? confirm.label : (ok ? "● Ok to pay" : "○ Confirm ok to pay");
    return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, background: "var(--inset,#fafbfc)", border: "1px solid var(--divider,#eee)", borderRadius: 11, padding: "12px 14px", flexWrap: "wrap" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ font: `600 14px ${F_SANS}`, color: "var(--fg,#111)" }}>{title}</div>
        <div style={{ font: `500 12px ${F_SANS}`, color: "var(--muted,#8a97ad)", marginTop: 2 }}>{sub}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
        {done ? <span style={{ font: `700 11.5px ${F_SANS}`, color: "var(--st-active-fg,#188038)", background: "var(--st-active-bg,#e6f4ea)", padding: "8px 12px", borderRadius: 8 }}>✓ Paid</span>
          : (<>
              <button onClick={onToggle} style={{ font: `700 11.5px ${F_SANS}`, padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer", whiteSpace: "nowrap", background: ok ? "var(--st-active-bg,#e6f4ea)" : "var(--warn-badge-bg,#fef3e2)", color: ok ? "var(--st-active-fg,#188038)" : "var(--warn-badge-text,#b7791f)" }}>{confirmText}</button>
              <button onClick={onLog} disabled={busy || !ok} style={{ font: `600 12px ${F_SANS}`, padding: "8px 13px", borderRadius: 8, border: "1px solid var(--divider,#ddd)", cursor: ok ? "pointer" : "not-allowed", whiteSpace: "nowrap", opacity: ok ? 1 : 0.55, background: ok ? "var(--btn-dark-bg,#111)" : "transparent", color: ok ? "#fff" : "var(--muted2,#9aa0a6)" }}>{logLabel}</button>
            </>)}
      </div>
    </div>
    );
  };

  return (
    <div style={{ marginTop: 20 }}>
      <SectionLabel num={4}>Payment schedule</SectionLabel>
      {!verified && <div style={{ font: `500 11.5px ${F_SANS}`, color: "var(--warn-badge-text,#b7791f)", marginBottom: 8 }}>⚠ Stability check not done yet — confirm the account is good to go (Step 3) before paying.</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 18 }}>
        {schedRow(
          "setup",
          `Setup fee · ${formatMoney(cfg.setupAmount, cfg.currency)}`,
          setupDone ? `Paid ${fmtDate(pays.find((p) => p.kind === "setup")?.paidAt || r.paidAt)}` : `Due 24h after login · ${r.onboardedAt ? "logged in " + fmtDate(r.onboardedAt) : "not logged in yet"}`,
          setupDone, () => logPayment(r, "setup"), `+ Log ${formatMoney(cfg.setupAmount, cfg.currency)}`,
          // Setup fee ok-to-pay is gated by the Step 3 "Account OK" (stability) check.
          { ok: verified, onToggle: () => workflow(r.id, { verifiedAt: verified ? null : new Date().toISOString() }), label: verified ? "● Account OK" : "○ Mark account OK" }
        )}
        {schedRow(
          "monthly",
          `Monthly · ${formatMoney(monthlyAmt(r), cfg.currency)}/mo`,
          "On the 1st, after one full month of service",
          false, () => logPayment(r, "monthly"), `+ Log ${formatMoney(monthlyAmt(r), cfg.currency)}`
        )}
      </div>

      {setupDone && r.status !== "onboarded" && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "var(--st-active-bg,#e6f4ea)", border: "1px solid var(--st-active-fg,#188038)", borderRadius: 11, padding: "10px 14px", marginBottom: 18, flexWrap: "wrap" }}>
          <span style={{ font: `500 12px ${F_SANS}`, color: "var(--st-active-fg,#188038)" }}>Setup fee paid. Finish attaching the receipt and details, then mark them onboarded.</span>
          <button onClick={() => workflow(r.id, { status: "onboarded" })} style={{ ...btnPrimary, background: "var(--st-active-fg,#188038)", flex: "none" }}>✓ Mark onboarded</button>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={labelCss}>Payment record</span>
        <span style={{ font: `500 12px ${F_SANS}`, color: "var(--muted,#8a97ad)" }}>Total paid <b style={{ color: "var(--st-active-fg,#188038)" }}>{formatMoney(totalPaid(r), cfg.currency)}</b></span>
      </div>
      <div style={{ border: "1px solid var(--divider,#eee)", borderRadius: 11, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 108px 116px 128px", gap: 10, padding: "9px 14px", background: "var(--band,#f6f7f8)", borderBottom: "1px solid var(--divider,#eee)" }}>
          {["Date", "Payment", "Proof", "Notified", "Acknowledged"].map((h) => <span key={h} style={{ font: `700 9px ${F_SANS}`, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--muted2,#9aa0a6)" }}>{h}</span>)}
        </div>
        {pays.length ? pays.map((p, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "100px 1fr 108px 116px 128px", gap: 10, alignItems: "center", padding: "11px 14px", borderBottom: "1px solid var(--divider,#eee)" }}>
            <span style={{ font: `500 12px ${F_SANS}`, color: "var(--fg,#444)", whiteSpace: "nowrap" }}>{fmtDate(p.paidAt)}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ font: `600 12.5px ${F_SANS}`, color: "var(--fg,#111)" }}>{formatMoney(Number(p.amount) || 0, cfg.currency)} <span style={{ fontWeight: 500, color: "var(--muted,#8a97ad)" }}>· {p.kind === "setup" ? "Setup fee" : "Monthly"}</span></div>
              {p.by && <div style={{ font: `500 11px ${F_SANS}`, color: "var(--muted2,#9aa0a6)" }}>by {p.by}</div>}
            </div>
            <ToggleChip on={!!p.proofUrl} onLabel="↗ Receipt" offLabel="+ Attach" href={p.proofUrl || undefined}
              onClick={() => { const url = prompt("Paste the proof-of-payment link (receipt / screenshot URL):"); if (url && url.trim()) updatePayout(r, i, { proofUrl: url.trim() }); }} />
            <ToggleChip on={!!p.notified} onLabel="Notified" offLabel="Mark notified" onClick={() => updatePayout(r, i, { notified: !p.notified })} />
            <ToggleChip on={!!p.acknowledged} green onLabel={p.acknowledgedAt ? `Ack ${fmtDate(p.acknowledgedAt)}` : "Acknowledged"} offLabel="Awaiting ack" onClick={() => updatePayout(r, i, { acknowledged: !p.acknowledged })} />
          </div>
        )) : <div style={{ padding: 16, textAlign: "center", font: `500 12.5px ${F_SANS}`, color: "var(--muted,#8a97ad)" }}>No payments logged yet.</div>}
      </div>
    </div>
  );
}

function ToggleChip({ on, onLabel, offLabel, onClick, href, green }: { on: boolean; onLabel: string; offLabel: string; onClick: () => void; href?: string; green?: boolean }) {
  const style: React.CSSProperties = { font: `600 11.5px ${F_SANS}`, padding: "5px 9px", borderRadius: 7, border: "none", cursor: "pointer", textAlign: "center", whiteSpace: "nowrap", background: on ? (green ? "var(--st-active-bg,#e6f4ea)" : "var(--blue-chip-bg,#e8f0fe)") : "var(--tag-bg,#f1f1f2)", color: on ? (green ? "var(--st-active-fg,#188038)" : "var(--blue-chip-text,#1a56db)") : "var(--muted,#8a97ad)" };
  if (on && href) return <a href={href} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ ...style, display: "inline-block", textDecoration: "none" }}>{onLabel}</a>;
  return <button onClick={(e) => { e.stopPropagation(); onClick(); }} style={style}>{on ? onLabel : offLabel}</button>;
}

// Set the account's earning/restriction state in one tap. Maps to the fields the rest
// of the app already uses: restrictedAt (temporary), status retired (permanent), status
// removed (withdrawn). "Active" clears the restriction and puts it back in-hand.
function RestrictionControl({ r, onAccount, onApp }: { r: Row; onAccount: (patch: Record<string, unknown>, reload?: boolean) => void; onApp: (patch: Record<string, unknown>) => void }) {
  const hasAcct = !!r.accountId;
  const issue = (r.accountIssue || "").toLowerCase();
  const restrictIssue = issue.includes("withdrawn") || issue.includes("permanent") || issue.includes("restricted");
  const current: "active" | "restricted" | "retired" | "withdrawn" =
    r.accountStatus === "removed" || issue.includes("withdrawn") ? "withdrawn"
      : r.accountStatus === "retired" || issue.includes("permanent") ? "retired"
        : r.accountRestrictedAt || issue.includes("restricted") ? "restricted"
          : "active";
  // With a linked account, restriction lives on the account (status / restrictedAt);
  // without one, flag it on the application's accountIssue so a lead can be marked
  // restricted at Initial/Level 1 before an account exists.
  const dead = r.accountStatus === "retired" || r.accountStatus === "removed";
  const undead = dead ? { status: "unavailable" } : {};
  const apply = (key: "active" | "restricted" | "retired" | "withdrawn") => {
    if (hasAcct) {
      const patch: Record<string, unknown> = key === "active" ? { restrictedAt: null, ...undead } : key === "restricted" ? { restrictedAt: new Date().toISOString(), ...undead } : key === "retired" ? { status: "retired", restrictedAt: new Date().toISOString() } : { status: "removed" };
      if (key === "active" && restrictIssue) patch.accountIssue = null; // also lift a restriction note
      onAccount(patch, true);
    } else {
      onApp({ accountIssue: key === "active" ? null : key === "restricted" ? "Restricted" : key === "retired" ? "Permanently restricted" : "Withdrawn" });
    }
  };
  const opts: { key: "active" | "restricted" | "retired" | "withdrawn"; label: string; tone: [string, string] }[] = [
    { key: "active", label: "Active", tone: ["--st-active-bg,#e6f4ea", "--st-active-fg,#188038"] },
    { key: "restricted", label: "Restricted", tone: ["--st-cancel-bg,#fdecea", "--st-cancel-fg,#c0392b"] },
    { key: "retired", label: "Permanently restricted", tone: ["--st-cancel-bg,#fdecea", "--st-cancel-fg,#c0392b"] },
    { key: "withdrawn", label: "Withdrawn", tone: ["--neutral-bg,#eef1f5", "--muted,#647189"] },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
      <span style={labelCss}>Restriction</span>
      {opts.map((o) => {
        const on = current === o.key;
        return (
          <button key={o.key} onClick={(e) => { e.stopPropagation(); apply(o.key); }}
            style={{ font: `600 11.5px ${F_SANS}`, padding: "5px 11px", borderRadius: 999, cursor: "pointer", whiteSpace: "nowrap", border: "1px solid", borderColor: on ? "transparent" : "var(--input-border,#dcdce0)", background: on ? `var(${o.tone[0]})` : "transparent", color: on ? `var(${o.tone[1]})` : "var(--muted,#647189)" }}>
            {on ? "● " : ""}{o.label}
          </button>
        );
      })}
    </div>
  );
}

function OutreachLog({ r, busy, onLog, onSetFollowUp, onDelete }: { r: Row; busy: boolean; onLog: (id: string, ch: string, text: string, by: string) => Promise<void>; onSetFollowUp: (iso: string | null) => void; onDelete: (at: string) => void }) {
  const [draft, setDraft] = useState("");
  const [by, setBy] = useState("");
  const log = r.outreachLog;
  const chan = messagingChannel(r);
  const send = async (ch: string) => { await onLog(r.id, ch, draft.trim(), by.trim()); setDraft(""); };
  const followVal = r.nextFollowUp ? new Date(r.nextFollowUp).toISOString().slice(0, 10) : "";
  return (
    <div style={{ border: "1px solid var(--divider,#e3e3e6)", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 14px", background: "var(--band,#f6f7f8)", borderBottom: "1px solid var(--divider,#e3e3e6)", flexWrap: "wrap" }}>
        <span style={{ font: `500 11.5px ${F_SANS}`, color: "var(--muted,#777)" }}>{touchCount(log)} {touchCount(log) === 1 ? "touch" : "touches"} · last {lastTouchAt(log) || "—"}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, font: `500 11.5px ${F_SANS}`, color: "var(--muted,#777)" }}>Next <input type="date" value={followVal} onChange={(e) => onSetFollowUp(e.target.value ? new Date(e.target.value).toISOString() : null)} style={{ ...inputCss, width: "auto", padding: "4px 7px", cursor: "pointer" }} /></span>
          <span style={{ font: `500 11.5px ${F_SANS}`, color: "var(--muted,#777)" }}>Handler <b style={{ color: "var(--fg,#333)" }}>{r.poc || "—"}</b></span>
        </div>
      </div>
      <div style={{ padding: "8px 14px" }}>
        {log && log.length ? [...log].reverse().map((t, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "6px 0" }}>
            <span style={touchChipStyle(t.ch)}>{touchLabel(t.ch)}</span>
            <span style={{ flex: 1, font: `500 12.5px ${F_SANS}`, color: "var(--text2,#333)", lineHeight: 1.4 }}>{t.text}</span>
            <span style={{ font: `500 11px ${F_SANS}`, color: "var(--muted2,#9aa0a6)", whiteSpace: "nowrap" }}>{(t.by ? t.by + " · " : "") + fmtDateTime(t.at)}</span>
            <span onClick={() => { if (confirm("Delete this outreach entry?")) onDelete(t.at); }} title="Delete entry" style={{ font: `600 13px ${F_SANS}`, color: "var(--muted2,#9aa0a6)", cursor: "pointer", flex: "none", lineHeight: 1.2 }}>×</span>
          </div>
        )) : <span style={{ font: `500 12.5px ${F_SANS}`, color: "var(--muted,#777)" }}>No outreach logged yet.</span>}
      </div>
      <div style={{ padding: "2px 14px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="What did you say? — logged with the touch (optional)" style={{ ...inputCss, flex: 1, minWidth: 220 }} />
          <input value={by} onChange={(e) => setBy(e.target.value)} placeholder="Who sent it?" style={{ ...inputCss, width: 150, flex: "none" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
          <span style={{ font: `600 10.5px ${F_SANS}`, color: "var(--muted2,#9aa0a6)" }}>LOG</span>
          {[chan, "email", "text", "note"].map((ch) => <button key={ch} onClick={() => send(ch)} disabled={busy} style={btnSec}>+ {touchLabel(ch)}</button>)}
        </div>
      </div>
    </div>
  );
}
