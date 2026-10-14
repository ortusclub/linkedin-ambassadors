"use client";

// Inventory v2 — parallel preview route (/admin/inventory-v2), built to the
// "Inventory v2" design mock. Dense operator TABLE + KPI tiles + LV-PoC pills +
// filter bar + daily-check mode + grouped rows + tabbed expanded detail
// (Overview / Sign-in & credentials). Reads the live /api/admin/inventory-v2
// endpoint and reuses the same action endpoints as the live inventory, so this is
// real data and real writes. The live /admin/accounts page is untouched until this
// is blessed and promoted (same play as pipeline-new → pipeline).
//
// Colours are the mock's literal light palette (not the CSS-var theme) so it looks
// exactly like the approved design when shown to Sam. Theming is a promotion-time task.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { tierPricing } from "@/lib/account-pricing";
import { formatName } from "@/lib/utils";
import { isCompanyEmail } from "@/lib/company";
import { currencyConfigFor, formatMoney } from "@/lib/referral-currency";
import { sortAccountsByLastUpdated } from "@/lib/account-notes";
import { IssueActions } from "@/components/admin/issue-actions";
import { ambassadorIssueContact } from "@/lib/issue-contacts";

type Touch = { ch: string; text: string; by: string; at: string; [k: string]: unknown };
type ConnPoint = { at: string; count: number; note?: "rented" | "returned" | string };
type RestrictEvent = { at: string; event: "restricted" | "recovered"; note?: string; creditedDays?: number };

interface Account {
  id: string;
  linkedinName: string;
  linkedinHeadline: string | null;
  linkedinUrl: string | null;
  connectionCount: number;
  industry: string | null;
  location: string | null;
  status: string;
  notes: string | null;
  loginEmail: string | null;
  personalEmail: string | null;
  workEmail: string | null;
  accountPassword: string | null;
  gologinShareLink: string | null;
  gologinProfileId: string | null;
  monthlyPrice: string | number;
  ambassadorPayment: string | number;
  hasSalesNav: boolean;
  listed: boolean;
  linkedinVerified: boolean;
  accountAgeMonths: number | null;
  linkedinJoinedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  ownerUpdatedAt: string | null;
  restrictedAt: string | null;
  warmupStartedAt: string | null;
  healthCheckedAt: string | null;
  linkedinAccountHealth: string | null;
  twoFactorResetNeeded: boolean;
  twoFactorReceivedAt: string | null;
  trialEndsAt: string | null;
  inventoryPool?: string | null;
  shadowRenter: string | null;
  connectionHistory: ConnPoint[] | null;
  restrictionLog: RestrictEvent[] | null;
  // derived by /api/admin/inventory-v2
  earnedTotal: number;
  utilisation: number;
  // owner-resolved
  ownerName: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  contactChannel: string | null;
  ownerApplicationId: string | null;
  ownerReferredBy: string | null;
  ownerPayoutCurrency: string | null;
  ownerStatus: string | null;
  ownerPoc: string | null;
  ownerOnboarded: boolean;
  ownerOnboardedAt: string | null;
  ownerSetupPaidAt: string | null;
  ownerOutreachLog: Touch[] | null;
  ownerNextFollowUp: string | null;
  ownerReferralSource: string | null;
  profilePhotoUrl: string | null;
  profileScreenshotUrl: string | null;
  issueReferrerName: string | null;
  issueEmailFrom: string;
  issueAmbassadorEmail: string | null;
  issueReferrerContact: { email?: string | null; whatsapp?: string | null; telegram?: string | null; viber?: string | null } | null;
  rentals: Array<{ lockedPrice: string | number | null; currentPeriodEnd: string | null; status: string; user: { id: string; fullName: string; email: string } }>;
}

// ── palette (mock literals) ──
const INK = "#0b1220", SUB = "#5b6779", MUT = "#8a93a3", LINE = "#e3e6ec", LINE2 = "#eef0f4", BG = "#eef0f4";
const BLUE = "#2563eb", GREEN = "#12a150", GREEND = "#0f7a3d", RED = "#dc2626", REDD = "#b91c1c", AMBER = "#92400e";
const F = "'Plus Jakarta Sans',system-ui,sans-serif", G = "'Space Grotesk',system-ui,sans-serif";

const isDummy = (a: Account) => (a.notes || "").includes("[SHOWCASE]");
const checkDue = (a: Account) => !isDummy(a) && a.status === "rented" && !a.restrictedAt && (!a.healthCheckedAt || Date.now() - new Date(a.healthCheckedAt).getTime() > 7 * 86400000);

function canonicalStatus(a: Account): string {
  if (a.status === "retired") return "Permanently restricted/Inaccessible";
  if (a.status === "removed") return "Removed";
  if (a.status !== "rented" && a.ownerApplicationId && !a.ownerSetupPaidAt) return "Initial";
  if (a.restrictedAt || a.status === "maintenance") return "Maintenance";
  if (a.status === "rented") return "Rented";
  if (a.ownerApplicationId && !a.ownerOnboarded) return "Construction";
  if (a.status === "construction_immature" || a.status === "under_construction") return a.ownerOnboarded ? "Construction" : "Initial";
  if (a.status === "available") return a.twoFactorResetNeeded ? "Maintenance" : "Available";
  if (a.status === "trial") return "Trial";
  if (!a.loginEmail || !isCompanyEmail(a.loginEmail) || !a.accountPassword) return "Initial";
  return a.ownerOnboarded ? "Construction" : "Initial";
}

const GROUPS: { key: string; title: string; note: string; dot: string }[] = [
  { key: "Available", title: "Available", note: "live & rentable", dot: GREEN },
  { key: "Trial", title: "Trial", note: "3-day hold", dot: AMBER },
  { key: "Rented", title: "Rented", note: "with a customer", dot: BLUE },
  { key: "Construction", title: "Construction", note: "warming up", dot: "#b45309" },
  { key: "Maintenance", title: "Restricted / Maintenance", note: "needs attention", dot: "#64748b" },
  { key: "Initial", title: "Initial / pipeline", note: "not yet in inventory", dot: MUT },
  { key: "Permanently restricted/Inaccessible", title: "Permanently restricted", note: "retired", dot: RED },
  { key: "Showcase", title: "Showcase", note: "demo accounts", dot: AMBER },
];

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtD = (d: string | null) => { if (!d) return "—"; const x = new Date(d); return `${MON[x.getMonth()]} ${x.getDate()}`; };
const fmtDY = (d: string | null) => { if (!d) return "—"; const x = new Date(d); return `${MON[x.getMonth()]} ${x.getDate()}, ${x.getFullYear()}`; };
const relDays = (d: string | null) => { if (!d) return "—"; const n = Math.floor((Date.now() - new Date(d).getTime()) / 86400000); return n <= 0 ? "today" : n === 1 ? "1d ago" : `${n}d ago`; };
const ageStr = (a: Account) => { const m = a.accountAgeMonths; if (m == null) return "—"; const y = Math.floor(m / 12), mm = m % 12; return y ? `${y}y${mm ? ` ${mm}m` : ""}` : `${mm}m`; };
const money = (n: number) => (n % 1 === 0 ? `$${n}` : `$${n.toFixed(2)}`);

const CC: Record<string, string> = { philippines: "PH", "united states": "US", usa: "US", us: "US", india: "IN", "united kingdom": "UK", uk: "UK", canada: "CA", australia: "AU", singapore: "SG", nigeria: "NG", germany: "DE" };
function countryOf(loc: string | null): string {
  if (!loc) return "—";
  const last = loc.split(",").pop()!.trim().toLowerCase();
  return CC[last] || CC[loc.trim().toLowerCase()] || last.slice(0, 2).toUpperCase();
}

const SHADOW_NAMES: Record<string, string> = { "info@ortus.solutions": "Ortus", "info@apexstrategy.io": "Apex" };
const shadowName = (email: string | null): string => (email ? (SHADOW_NAMES[email.trim().toLowerCase()] || email.split("@")[0]) : "");

const priceOf = (a: Account): number => {
  const locked = a.rentals[0]?.lockedPrice;
  if (locked != null && Number(locked) > 0) return Number(locked);
  const mp = Number(a.monthlyPrice);
  if (mp > 0) return mp;
  return tierPricing(a.connectionCount, a.accountAgeMonths, a.hasSalesNav, a.linkedinVerified).monthly;
};

// avatar colour from a string
const AV = ["#2563eb", "#7c3aed", "#0891b2", "#db2777", "#ea580c", "#059669", "#4f46e5"];
const colorOf = (s: string) => AV[[...s].reduce((h, c) => (h + c.charCodeAt(0)) | 0, 0) % AV.length];
const iniOf = (s: string) => (s || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("") || "?";

function Totp({ accountId }: { accountId: string }) {
  type S = { status: "loading" | "none" | "error" } | { status: "ok"; code: string; expiresIn: number; period: number };
  const [s, setS] = useState<S>({ status: "loading" });
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let alive = true; let timer: ReturnType<typeof setInterval>;
    const load = async () => {
      try {
        const res = await fetch(`/api/admin/accounts/${accountId}/totp`, { cache: "no-store" });
        if (!alive) return;
        if (!res.ok) return setS({ status: "error" });
        const d = await res.json();
        if (d.configured === false || d.invalid) return setS({ status: "none" });
        setS({ status: "ok", code: d.code, expiresIn: d.expiresIn, period: d.period });
      } catch { if (alive) setS({ status: "error" }); }
    };
    load();
    timer = setInterval(() => setS((p) => { if (p.status !== "ok") return p; const n = p.expiresIn - 1; if (n <= 0) { load(); return { ...p, expiresIn: 0 }; } return { ...p, expiresIn: n }; }), 1000);
    return () => { alive = false; clearInterval(timer); };
  }, [accountId]);
  if (s.status !== "ok") {
    const label = s.status === "loading" ? "…" : s.status === "none" ? "No 2FA key set" : "2FA unavailable";
    return <div style={{ background: INK, borderRadius: 14, padding: "14px 16px", font: `500 13px ${F}`, color: "#a7b0bf" }}>{label}</div>;
  }
  const pretty = `${s.code.slice(0, 3)} ${s.code.slice(3)}`;
  const pct = Math.round((s.expiresIn / s.period) * 100);
  return (
    <div style={{ background: INK, borderRadius: 14, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={{ font: `500 12px ${F}`, color: "#a7b0bf" }}>Type into LinkedIn · new code in {s.expiresIn}s</span>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ font: `700 30px ${G}`, letterSpacing: ".06em", color: "#fff", fontVariantNumeric: "tabular-nums" }}>{pretty}</span>
        <button onClick={() => { navigator.clipboard?.writeText(s.code); setCopied(true); setTimeout(() => setCopied(false), 1200); }} style={{ marginLeft: "auto", border: "none", background: "#fff", color: INK, borderRadius: 9, padding: "8px 14px", font: `700 13px ${F}`, cursor: "pointer" }}>{copied ? "Copied ✓" : "Copy code"}</button>
      </div>
      <span style={{ height: 4, borderRadius: 4, background: "#1f2a3c", overflow: "hidden", display: "block" }}><span style={{ display: "block", height: "100%", width: `${pct}%`, background: "#34d399", transition: "width 1s linear" }} /></span>
    </div>
  );
}

function Copyable({ value }: { value: string | null }) {
  const [c, setC] = useState(false);
  if (!value) return <span style={{ color: MUT }}>—</span>;
  return (
    <span style={{ display: "inline-flex", alignItems: "flex-start", gap: 6, minWidth: 0 }}>
      <span style={{ minWidth: 0, font: `600 13.5px/1.45 ${F}`, color: INK, overflowWrap: "anywhere" }}>{value}</span>
      <button onClick={() => { navigator.clipboard?.writeText(value); setC(true); setTimeout(() => setC(false), 1200); }} title="Copy" style={{ flex: "none", border: "none", background: "none", padding: "0 2px", color: c ? GREEND : "#a3abb8", font: `600 12px ${F}`, cursor: "pointer" }}>{c ? "✓" : "⧉"}</button>
    </span>
  );
}

const Lbl = ({ children }: { children: React.ReactNode }) => <span style={{ font: `700 10.5px ${F}`, letterSpacing: ".07em", textTransform: "uppercase", color: MUT }}>{children}</span>;
const Card = ({ children, span, pad = "12px 14px" }: { children: React.ReactNode; span?: number; pad?: string }) => <div style={{ background: "#fff", border: `1px solid #e6e9ee`, borderRadius: 12, padding: pad, display: "flex", flexDirection: "column", gap: 10, minWidth: 0, gridColumn: span ? `span ${span}` : undefined }}>{children}</div>;

export default function InventoryV2Page() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState(""), [cty, setCty] = useState("all"), [renter, setRenter] = useState("all");
  const [ver, setVer] = useState("all"), [conn, setConn] = useState("all"), [supply, setSupply] = useState("all");
  const [sort, setSort] = useState("upd");
  const [poc, setPoc] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<Record<string, "overview" | "signin" | "owner">>({});
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [checkMode, setCheckMode] = useState(false);
  const [hideDone, setHideDone] = useState(false);
  const [connDraft, setConnDraft] = useState<Record<string, string>>({});
  const [bannerOpen, setBannerOpen] = useState(true);
  const [sheetFormula, setSheetFormula] = useState<string | null>(null);
  const [copiedFormula, setCopiedFormula] = useState(false);

  const load = () => fetch("/api/admin/inventory-v2").then((r) => r.json()).then((d) => setAccounts(d.accounts || [])).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  useEffect(() => { fetch("/api/admin/accounts/export-url").then((r) => r.json()).then((d) => { if (d.url) setSheetFormula(`=IMPORTDATA("${d.url}")`); }).catch(() => {}); }, []);
  const copyFormula = () => { if (!sheetFormula) return; navigator.clipboard?.writeText(sheetFormula); setCopiedFormula(true); setTimeout(() => setCopiedFormula(false), 1400); };
  const patchApp = async (appId: string, body: Record<string, unknown>) => { const res = await fetch(`/api/admin/ambassadors/${appId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); if (res.ok) await load(); return res; };

  const patch = async (id: string, body: Record<string, unknown>, reload = true) => {
    setBusy(id);
    try { const res = await fetch(`/api/admin/accounts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); if (res.ok && reload) await load(); return res; }
    finally { setBusy(null); }
  };
  // Optimistic: update the row instantly and fire the write in the background, so the
  // ✓/✕ buttons respond on the first click instead of waiting on a full refetch.
  const setRestricted = (a: Account, restricted: boolean) => {
    const now = new Date().toISOString();
    setAccounts((p) => p.map((x) => (x.id === a.id ? { ...x, restrictedAt: restricted ? now : null, healthCheckedAt: now, linkedinAccountHealth: restricted ? x.linkedinAccountHealth : "active" } : x)));
    fetch(`/api/admin/accounts/${a.id}/restricted`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ restricted }) }).catch(() => load());
  };
  const markActive = (a: Account) => {
    const now = new Date().toISOString();
    setAccounts((p) => p.map((x) => (x.id === a.id ? { ...x, linkedinAccountHealth: "active", healthCheckedAt: now } : x)));
    fetch(`/api/admin/accounts/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ linkedinAccountHealth: "active", healthCheckedAt: now }) }).catch(() => load());
  };
  const recheck = async (a: Account) => { setBusy(a.id); try { await fetch(`/api/admin/accounts/${a.id}/check-health`, { method: "POST" }); await load(); } finally { setBusy(null); } };
  const trial = async (a: Account) => { setBusy(a.id); try { await fetch(`/api/admin/accounts/${a.id}/trial`, { method: "POST" }); await load(); } finally { setBusy(null); } };
  const toggleRent = async (a: Account) => {
    if (a.status === "rented" || a.status === "trial") return;
    const next = a.status === "available" ? "unavailable" : "available";
    if (next === "available" && a.twoFactorResetNeeded) { alert("Rotate the 2FA code before making this available again (it was exposed to the last renter)."); return; }
    setAccounts((p) => p.map((x) => (x.id === a.id ? { ...x, status: next, listed: next === "available" } : x)));
    await patch(a.id, { status: next, listed: next === "available" });
  };
  const saveConn = async (a: Account, raw: string) => {
    const n = parseInt((raw || "").replace(/[^0-9]/g, ""), 10);
    if (Number.isNaN(n) || n === a.connectionCount) return;
    setAccounts((p) => p.map((x) => (x.id === a.id ? { ...x, connectionCount: n } : x)));
    await patch(a.id, { connectionCount: n }, false);
  };

  const withGroup = useMemo(() => accounts.map((a) => ({ a, g: isDummy(a) ? "Showcase" : canonicalStatus(a) })), [accounts]);

  const pocCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const { a } of withGroup) { const p = (a.ownerPoc || "").trim(); if (p) m.set(p, (m.get(p) || 0) + 1); }
    return [...m.entries()].sort((x, y) => y[1] - x[1]);
  }, [withGroup]);

  const renterOpts = useMemo(() => {
    const m = new Map<string, string>();
    for (const { a } of withGroup) { const r = a.rentals[0]?.user; if (r) m.set(r.id, r.fullName || r.email); }
    return [...m.entries()];
  }, [withGroup]);

  const countryOpts = useMemo(() => {
    const m = new Map<string, number>();
    for (const { a } of withGroup) { const c = countryOf(a.location); m.set(c, (m.get(c) || 0) + 1); }
    return [...m.entries()].sort((x, y) => y[1] - x[1]);
  }, [withGroup]);

  const connBucket = (n: number) => (n < 50 ? "0" : n < 100 ? "1" : n < 500 ? "2" : n < 1000 ? "3" : "4");

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return withGroup.filter(({ a }) => {
      if (groupFilter !== "all" && (isDummy(a) ? "Showcase" : canonicalStatus(a)) !== groupFilter) return false;
      if (poc !== "all" && (a.ownerPoc || "").trim() !== poc) return false;
      if (cty !== "all" && countryOf(a.location) !== cty) return false;
      if (renter !== "all" && a.rentals[0]?.user?.id !== renter) return false;
      if (ver === "v" && !a.linkedinVerified) return false;
      if (ver === "u" && a.linkedinVerified) return false;
      if (conn !== "all" && connBucket(a.connectionCount) !== conn) return false;
      if (supply === "offer" && !(canonicalStatus(a) === "Available" && !a.shadowRenter)) return false;
      if (supply === "shadow" && !a.shadowRenter) return false;
      if (ql) { const hay = [a.linkedinName, a.loginEmail, a.ownerName, a.rentals[0]?.user?.fullName, a.location, a.industry].join(" ").toLowerCase(); if (!hay.includes(ql)) return false; }
      return true;
    }).map((x) => x.a);
  }, [withGroup, groupFilter, poc, cty, renter, ver, conn, supply, q]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    if (sort === "upd") return sortAccountsByLastUpdated(arr, "newest");
    if (sort === "price") arr.sort((x, y) => priceOf(y) - priceOf(x));
    else if (sort === "conn") arr.sort((x, y) => y.connectionCount - x.connectionCount);
    else if (sort === "age") arr.sort((x, y) => (y.accountAgeMonths || 0) - (x.accountAgeMonths || 0));
    else if (sort === "name") arr.sort((x, y) => (x.linkedinName || "").localeCompare(y.linkedinName || ""));
    return arr;
  }, [filtered, sort]);

  const grouped = useMemo(() => {
    const m = new Map<string, Account[]>();
    for (const a of sorted) { const g = isDummy(a) ? "Showcase" : canonicalStatus(a); (m.get(g) || m.set(g, []).get(g)!).push(a); }
    return GROUPS.map((g) => ({ ...g, rows: m.get(g.key) || [] })).filter((g) => g.rows.length);
  }, [sorted]);

  // Daily check: in-scope = rented, not dummy, not restricted. "done" = health checked today.
  const checkScope = useMemo(() => accounts.filter((a) => a.status === "rented" && !isDummy(a) && !a.restrictedAt), [accounts]);
  const isDoneToday = (a: Account) => !!a.healthCheckedAt && new Date(a.healthCheckedAt).toDateString() === new Date().toDateString();
  const dcDone = checkScope.filter(isDoneToday).length, dcTotal = checkScope.length;

  const tiles = useMemo(() => {
    const count = (k: string) => withGroup.filter(({ g }) => g === k).length;
    const avail = count("Available"), rented = count("Rented");
    const totalEarn = accounts.reduce((s, a) => s + (a.earnedTotal || 0), 0);
    const avgUtil = accounts.length ? Math.round((accounts.reduce((s, a) => s + (a.utilisation || 0), 0) / accounts.length) * 100) : 0;
    return [
      { key: "Available", label: "Available", n: avail, sub: "ready to offer", dot: GREEN, subFg: GREEND },
      { key: "Rented", label: "Rented", n: rented, sub: `${checkScope.length} to check`, dot: BLUE, subFg: SUB },
      { key: "Construction", label: "Construction", n: count("Construction"), sub: "warming up", dot: "#b45309", subFg: SUB },
      { key: "Maintenance", label: "Restricted / Maint.", n: count("Maintenance"), sub: "needs attention", dot: "#64748b", subFg: REDD },
      { key: "__earn", label: "Earned, all-time", n: Math.round(totalEarn), sub: "gross collected", dot: "#7c3aed", subFg: SUB, money: true },
      { key: "__util", label: "Avg utilisation", n: avgUtil, sub: "rented share, lifetime", dot: GREEN, subFg: SUB, pct: true },
    ];
  }, [withGroup, accounts, checkScope.length]);

  const totalShown = sorted.length;
  const hasFilters = q || cty !== "all" || renter !== "all" || ver !== "all" || conn !== "all" || supply !== "all" || poc !== "all" || groupFilter !== "all";
  const clearAll = () => { setQ(""); setCty("all"); setRenter("all"); setVer("all"); setConn("all"); setSupply("all"); setPoc("all"); setGroupFilter("all"); };

  const inp: React.CSSProperties = { border: `1px solid #dde1e8`, background: "#fff", borderRadius: 10, padding: "9px 10px", font: `600 13px ${F}`, color: INK, outline: "none" };
  const headCols = "minmax(0,2.2fr) 78px 64px minmax(0,1.3fr) 104px minmax(0,1.2fr) 100px 92px 52px 56px 16px";

  if (loading) return <div style={{ padding: 28, font: `500 14px ${F}`, color: SUB, background: BG, minHeight: "100vh" }}>Loading inventory…</div>;

  return (
    <div style={{ minHeight: "100vh", background: BG, padding: "24px 24px 80px", margin: "-24px", fontFamily: F }}>
      <div style={{ maxWidth: 1360, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ font: `700 30px ${G}`, color: INK, margin: "0 0 4px", letterSpacing: "-.01em" }}>Inventory <span style={{ font: `700 12px ${F}`, color: "#fff", background: BLUE, borderRadius: 999, padding: "3px 9px", verticalAlign: "middle" }}>v2 preview</span></h1>
            <p style={{ font: `500 14px ${F}`, color: SUB, margin: 0 }}>Every account we own, what state it&apos;s in, and who&apos;s on it.</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Link href="/admin/accounts" style={{ border: `1px solid #dde1e8`, background: "#fff", color: INK, borderRadius: 10, padding: "8px 12px", font: `600 12.5px ${F}`, textDecoration: "none" }}>← Live inventory</Link>
            {sheetFormula && <button onClick={copyFormula} title="Copy the IMPORTDATA formula for the live Google Sheet" style={{ border: "1px solid #cdebd9", background: "#f4fbf7", color: GREEND, borderRadius: 10, padding: "8px 12px", font: `700 12.5px ${F}`, cursor: "pointer", whiteSpace: "nowrap" }}>{copiedFormula ? "Copied ✓" : "Sheets formula"}</button>}
            <Link href="/admin/accounts" title="CSV import lives on the live Inventory tab" style={{ border: "1px solid #dde1e8", background: "#fff", color: INK, borderRadius: 10, padding: "8px 12px", font: `600 12.5px ${F}`, textDecoration: "none" }}>Import CSV</Link>
            <label style={{ position: "relative", display: "flex", alignItems: "center", gap: 6, border: "1px solid #dde1e8", background: "#fff", color: INK, borderRadius: 10, padding: "8px 12px", font: `600 12.5px ${F}`, cursor: "pointer", whiteSpace: "nowrap" }}>Catalogue ↗<span style={{ font: `600 10px ${F}`, color: MUT }}>▾</span>
              <select defaultValue="" onChange={(e) => { if (e.target.value === "with") window.open("/catalogue", "_blank"); else if (e.target.value === "without") window.open("/catalogue?pricing=off", "_blank"); e.target.value = ""; }} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}><option value="">Open catalogue…</option><option value="with">With pricing</option><option value="without">Without pricing</option></select>
            </label>
            <Link href="/admin/accounts/new" style={{ border: "none", background: INK, color: "#fff", borderRadius: 10, padding: "9px 14px", font: `700 12.5px ${F}`, textDecoration: "none" }}>+ Add account</Link>
          </div>
        </div>

        {/* rotate reminder banner */}
        {bannerOpen && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "9px 14px", font: `500 13px/1.45 ${F}`, color: "#7f1d1d" }}>
            <span style={{ flex: "none", width: 20, height: 20, borderRadius: "50%", background: RED, color: "#fff", display: "grid", placeItems: "center", font: `800 11px ${F}` }}>!</span>
            <span style={{ flex: 1 }}>When a rental or trial ends, rotate <b>both</b> the 2FA key and the GoLogin share link before re-renting. Accounts that still need it are flagged <b>🔑 Rotate</b>.</span>
            <button onClick={() => setBannerOpen(false)} style={{ flex: "none", border: "none", background: "none", color: REDD, font: `700 12px ${F}`, cursor: "pointer" }}>Hide</button>
          </div>
        )}

        {/* KPI tiles */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
          {tiles.map((t) => {
            const active = groupFilter === t.key;
            const clickable = !t.key.startsWith("__");
            return (
              <button key={t.key} onClick={() => clickable && setGroupFilter(active ? "all" : t.key)} style={{ textAlign: "left", cursor: clickable ? "pointer" : "default", background: "#fff", border: `1.5px solid ${active ? INK : "#e9ecf1"}`, borderRadius: 14, padding: "13px 15px", display: "flex", flexDirection: "column", gap: 3, boxShadow: active ? "0 4px 14px rgba(16,24,40,.10)" : "0 1px 2px rgba(16,24,40,.04), 0 6px 14px rgba(16,24,40,.035)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 7, font: `700 11px ${F}`, letterSpacing: ".06em", textTransform: "uppercase", color: SUB, whiteSpace: "nowrap" }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: t.dot }} />{t.label}</span>
                <span style={{ font: `700 26px ${G}`, color: INK }}>{t.money ? money(t.n) : t.pct ? `${t.n}%` : t.n}</span>
                <span style={{ font: `600 12px ${F}`, color: t.subFg, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.sub}</span>
              </button>
            );
          })}
        </div>

        {/* PoC pills + filter bar */}
        <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 14, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10, boxShadow: "0 1px 2px rgba(16,24,40,.04)" }}>
          {pocCounts.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ font: `700 11px ${F}`, letterSpacing: ".07em", textTransform: "uppercase", color: MUT, marginRight: 4 }}>LV PoC</span>
              <button onClick={() => setPoc("all")} style={{ border: `1.5px solid ${poc === "all" ? INK : "#e3e6ec"}`, background: poc === "all" ? "#f3f5f8" : "#fff", borderRadius: 999, padding: "5px 12px", font: `700 12.5px ${F}`, color: INK, cursor: "pointer" }}>All</button>
              {pocCounts.map(([name, n]) => (
                <button key={name} onClick={() => setPoc(poc === name ? "all" : name)} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", border: `1.5px solid ${poc === name ? INK : "#e3e6ec"}`, background: poc === name ? "#f3f5f8" : "#fff", borderRadius: 999, padding: "4px 11px 4px 4px", font: `700 12.5px ${F}`, color: INK, whiteSpace: "nowrap" }}>
                  <span style={{ width: 22, height: 22, borderRadius: "50%", background: colorOf(name), color: "#fff", font: `700 10px ${F}`, display: "flex", alignItems: "center", justifyContent: "center" }}>{iniOf(name)}</span>{name}
                  <span style={{ font: `700 11px ${G}`, color: SUB, background: BG, borderRadius: 999, padding: "1px 7px" }}>{n}</span>
                </button>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", borderTop: `1px solid ${LINE2}`, paddingTop: 10 }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, renter, location, industry…" style={{ flex: 1, minWidth: 220, border: `1px solid #dde1e8`, background: "#f8f9fb", borderRadius: 10, padding: "9px 12px", font: `500 13.5px ${F}`, color: INK, outline: "none" }} />
            <select value={cty} onChange={(e) => setCty(e.target.value)} style={inp}><option value="all">Any country</option>{countryOpts.map(([c, n]) => <option key={c} value={c}>{c} ({n})</option>)}</select>
            <select value={renter} onChange={(e) => setRenter(e.target.value)} style={inp}><option value="all">Any renter</option>{renterOpts.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
            <select value={ver} onChange={(e) => setVer(e.target.value)} style={inp}><option value="all">Verified + unverified</option><option value="v">Verified only</option><option value="u">Unverified only</option></select>
            <select value={conn} onChange={(e) => setConn(e.target.value)} style={inp}><option value="all">Any connections</option><option value="0">&lt; 50</option><option value="1">50–100</option><option value="2">100–500</option><option value="3">500–999</option><option value="4">1k+</option></select>
            <select value={supply} onChange={(e) => setSupply(e.target.value)} style={inp}><option value="all">All supply</option><option value="offer">Available to offer</option><option value="shadow">Shadow</option></select>
            <select value={sort} onChange={(e) => setSort(e.target.value)} style={inp}><option value="upd">Last updated</option><option value="price">Price, high → low</option><option value="conn">Connections, most first</option><option value="age">Age, oldest first</option><option value="name">Name A–Z</option></select>
            {hasFilters && <button onClick={clearAll} style={{ border: "none", background: "none", color: BLUE, font: `700 12.5px ${F}`, cursor: "pointer", whiteSpace: "nowrap" }}>Clear filters</button>}
          </div>
        </div>

        {/* daily-check sticky bar */}
        {checkMode && (
          <div style={{ position: "sticky", top: 10, zIndex: 5, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", background: INK, color: "#fff", borderRadius: 12, padding: "10px 14px", boxShadow: "0 10px 30px rgba(11,18,32,.2)" }}>
            <span style={{ font: `700 13.5px ${F}`, whiteSpace: "nowrap" }}>Daily check</span>
            <div style={{ flex: "1 1 200px", display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <span style={{ flex: 1, height: 6, borderRadius: 6, background: "#273246", overflow: "hidden", display: "block" }}><span style={{ display: "block", height: "100%", width: `${dcTotal ? (dcDone / dcTotal) * 100 : 0}%`, background: "#34d399", transition: "width .3s" }} /></span>
              <span style={{ font: `700 13px ${G}`, whiteSpace: "nowrap" }}>{dcDone} / {dcTotal}</span>
            </div>
            <span style={{ font: `500 12px ${F}`, color: "#a7b0bf", whiteSpace: "nowrap" }}>Type connections + Enter · tick ✓ or ✕ for health</span>
            <button onClick={() => setHideDone((h) => !h)} style={{ border: "1px solid #2a3344", background: hideDone ? "#1f2a3c" : "transparent", color: "#fff", borderRadius: 8, padding: "6px 11px", font: `700 12px ${F}`, cursor: "pointer" }}>{hideDone ? "Show done" : "Hide done"}</button>
            <button onClick={() => setCheckMode(false)} style={{ border: "none", background: "#fff", color: INK, borderRadius: 8, padding: "6px 12px", font: `700 12px ${F}`, cursor: "pointer" }}>Done</button>
          </div>
        )}

        {/* counts + controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 4px -4px", font: `500 12.5px ${F}`, color: SUB, flexWrap: "wrap" }}>
          <span><b style={{ color: INK, fontFamily: G }}>{totalShown}</b> of {accounts.length} accounts</span>
          {!checkMode && <button onClick={() => setCheckMode(true)} style={{ display: "flex", alignItems: "center", gap: 7, border: `1.5px solid ${INK}`, background: "#fff", color: INK, borderRadius: 999, padding: "5px 12px", font: `700 12.5px ${F}`, cursor: "pointer" }}>✓ Start daily check<span style={{ font: `700 11px ${G}`, color: SUB, background: BG, borderRadius: 999, padding: "1px 7px" }}>{dcTotal - dcDone} left</span></button>}
          <button onClick={() => setCollapsed((c) => (c.size ? new Set() : new Set(grouped.map((g) => g.key))))} style={{ marginLeft: "auto", border: "none", background: "none", color: BLUE, font: `700 12.5px ${F}`, cursor: "pointer" }}>{collapsed.size ? "Expand all" : "Collapse all"}</button>
        </div>

        {/* table */}
        <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 14, overflow: "auto", boxShadow: "0 1px 2px rgba(16,24,40,.04), 0 8px 24px rgba(16,24,40,.04)" }}>
          <div style={{ minWidth: 1360 }}>
            <div style={{ display: "grid", gridTemplateColumns: headCols, gap: 12, alignItems: "center", padding: "10px 16px", borderBottom: `1px solid ${LINE2}`, background: "#fafbfc", font: `700 10.5px ${F}`, letterSpacing: ".07em", textTransform: "uppercase", color: MUT }}>
              <span>Account</span><span>Conn.</span><span>Age</span><span>Flags</span><span>Price</span><span>Renter</span><span>LV PoC</span><span>Health</span><span>Rent</span><span></span><span></span>
            </div>
            {grouped.length === 0 && <div style={{ padding: 40, textAlign: "center", font: `500 13.5px ${F}`, color: MUT }}>No accounts match.</div>}
            {grouped.map((g) => {
              const gOpen = !collapsed.has(g.key);
              const rows = checkMode && hideDone ? g.rows.filter((r) => !isDoneToday(r)) : g.rows;
              return (
                <div key={g.key}>
                  <button onClick={() => setCollapsed((c) => { const n = new Set(c); n.has(g.key) ? n.delete(g.key) : n.add(g.key); return n; })} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, border: "none", background: "#f6f7f9", borderBottom: `1px solid ${LINE2}`, padding: "9px 16px", cursor: "pointer", textAlign: "left" }}>
                    <span style={{ font: `700 12px ${F}`, color: MUT, display: "inline-block", transform: gOpen ? "rotate(90deg)" : "none", transition: "transform .15s" }}>›</span>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: g.dot }} />
                    <span style={{ font: `700 13.5px ${F}`, color: INK }}>{g.title}</span>
                    <span style={{ font: `700 11.5px ${G}`, color: SUB, background: "#e9ecf1", borderRadius: 999, padding: "1px 8px" }}>{g.rows.length}</span>
                    <span style={{ font: `500 12px ${F}`, color: MUT }}>{g.note}</span>
                  </button>
                  {gOpen && (() => {
                    type Item = { client: { name: string; count: number; mrr: number; next: string | null } } | { row: Account };
                    const items: Item[] = [];
                    if (g.key === "Rented") {
                      const byClient = new Map<string, Account[]>();
                      for (const rr of rows) { const id = rr.rentals[0]?.user?.id || "__none"; const arr = byClient.get(id) || []; arr.push(rr); byClient.set(id, arr); }
                      for (const rs of byClient.values()) {
                        const u = rs[0].rentals[0]?.user;
                        items.push({ client: { name: u ? (u.fullName || u.email) : "Shadow / no renter", count: rs.length, mrr: rs.reduce((s, x) => s + priceOf(x), 0), next: rs.map((x) => x.rentals[0]?.currentPeriodEnd).filter(Boolean).sort()[0] || null } });
                        for (const rr of rs) items.push({ row: rr });
                      }
                    } else {
                      for (const rr of rows) items.push({ row: rr });
                    }
                    return items.map((it) => {
                      if ("client" in it) {
                        const c = it.client;
                        return (
                          <div key={`c-${g.key}-${c.name}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px 7px 28px", background: "#f5f8ff", borderBottom: "1px solid #e6edfb" }}>
                            <span style={{ flex: "none", width: 22, height: 22, borderRadius: "50%", background: colorOf(c.name), color: "#fff", font: `700 10px ${F}`, display: "flex", alignItems: "center", justifyContent: "center" }}>{iniOf(c.name)}</span>
                            <span style={{ font: `700 13px ${F}`, color: INK }}>{c.name}</span>
                            <span style={{ font: `700 11px ${G}`, color: BLUE, background: "#e3ebfd", borderRadius: 999, padding: "1px 8px" }}>{c.count}</span>
                            <span style={{ font: `600 12px ${F}`, color: SUB }}>${c.mrr}/mo</span>
                            {c.next && <span style={{ font: `600 12px ${F}`, color: MUT }}>next {fmtD(c.next)}</span>}
                          </div>
                        );
                      }
                      const r = it.row;
                      const st = canonicalStatus(r);
                    const edge = st === "Available" ? GREEN : st === "Rented" ? BLUE : st === "Maintenance" ? RED : st === "Construction" ? "#b45309" : "transparent";
                    const rentOn = r.listed && r.status === "available";
                    const price = priceOf(r);
                    const rn = r.rentals[0]?.user;
                    const isOpen = open.has(r.id);
                    const curTab = tab[r.id] || "overview";
                    const done = isDoneToday(r);
                    const flags: { l: string; bg: string; fg: string; tip?: string }[] = [];
                    if (r.restrictedAt) flags.push({ l: "⚠ Restricted", bg: "#fee2e2", fg: REDD });
                    if (r.twoFactorResetNeeded) flags.push({ l: "🔑 Rotate", bg: "#fee2e2", fg: REDD, tip: "2FA was exposed to the last renter — rotate before re-renting" });
                    if (r.shadowRenter) flags.push({ l: `◑ Shadow · ${shadowName(r.shadowRenter)}`, bg: "#e8f0fe", fg: BLUE, tip: `Shadow-held by ${shadowName(r.shadowRenter)} — still available to rent` });
                    if (r.inventoryPool === "ortus") flags.push({ l: "◆ Ortus", bg: "#ede9fe", fg: "#6d28d9" });
                    if (r.inventoryPool === "apex") flags.push({ l: "◆ Apex", bg: "#e0f2fe", fg: "#0369a1" });
                    if (r.warmupStartedAt) flags.push({ l: "🔥 Warming", bg: "#fef3c7", fg: AMBER });
                    if (checkDue(r)) flags.push({ l: "⏱ Check due", bg: "#fef3c7", fg: AMBER });
                    const cW = Math.min(100, Math.round((r.connectionCount / 1000) * 100));
                    return (
                      <div key={r.id} style={{ borderBottom: `1px solid ${LINE2}` }}>
                        <div onClick={() => setOpen((o) => { const n = new Set(o); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n; })} style={{ display: "grid", gridTemplateColumns: headCols, gap: 12, alignItems: "center", padding: "10px 16px", cursor: "pointer", boxShadow: `inset 3px 0 0 ${edge}` }}>
                          {/* account */}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                              <span style={{ font: `700 14px/1.3 ${F}`, color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{formatName(r.linkedinName)}</span>
                              {r.linkedinUrl && <a href={r.linkedinUrl.startsWith("http") ? r.linkedinUrl : `https://${r.linkedinUrl}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} title="LinkedIn" style={{ flex: "none", padding: "2px 7px", borderRadius: 7, background: "#e8f0fe", color: "#0a66c2", font: `800 11.5px ${F}`, textDecoration: "none" }}>in ↗</a>}
                              {r.linkedinVerified && <span title="Verified" style={{ flex: "none", font: `800 10px ${F}`, color: BLUE, background: "#e8f0fe", borderRadius: 6, padding: "2px 5px" }}>✓</span>}
                              <span title={r.location || ""} style={{ flex: "none", font: `700 10.5px ${F}`, padding: "2px 6px", borderRadius: 6, background: "#f1f3f6", color: SUB }}>{countryOf(r.location)}</span>
                              {isDummy(r) && <span style={{ flex: "none", font: `800 9.5px ${F}`, padding: "2px 6px", borderRadius: 5, background: "#fef3c7", color: AMBER }}>DUMMY</span>}
                            </div>
                            <div style={{ font: `500 12px ${F}`, color: SUB, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.linkedinHeadline || r.loginEmail || r.industry || "—"}</div>
                          </div>
                          {/* conn — always editable, boxed (saves on blur / Enter) */}
                          <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            <input defaultValue={r.connectionCount} key={`c-${r.id}-${r.connectionCount}`} onChange={(e) => setConnDraft((d) => ({ ...d, [r.id]: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} onBlur={() => connDraft[r.id] != null && saveConn(r, connDraft[r.id])} inputMode="numeric" title="Connection count — saves on blur / Enter" style={{ width: 72, border: `1.5px solid ${connDraft[r.id] != null && connDraft[r.id] !== String(r.connectionCount) ? BLUE : "#dde1e8"}`, background: "#fff", borderRadius: 8, padding: "5px 8px", font: `700 13.5px ${G}`, color: INK, outline: "none" }} />
                            <span style={{ height: 3, width: 64, borderRadius: 3, background: LINE2, overflow: "hidden", display: "block" }}><span style={{ display: "block", height: "100%", width: `${cW}%`, background: BLUE }} /></span>
                          </div>
                          {/* age */}
                          <span style={{ font: `700 15px ${G}`, color: INK, whiteSpace: "nowrap" }}>{ageStr(r)}</span>
                          {/* flags */}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, minWidth: 0 }}>
                            {flags.length === 0 ? <span style={{ font: `700 11px ${F}`, padding: "2px 8px", borderRadius: 999, background: "#ecfdf3", color: GREEND }}>✓ ok</span> : flags.map((f, i) => <span key={i} title={f.tip} style={{ font: `700 11px ${F}`, padding: "2px 8px", borderRadius: 999, background: f.bg, color: f.fg, whiteSpace: "nowrap", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>{f.l}</span>)}
                          </div>
                          {/* price */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                            <span style={{ font: `700 14px ${G}`, color: INK }}>${price}<span style={{ font: `500 11px ${F}`, color: MUT }}>/mo</span></span>
                            <span style={{ font: `600 10.5px ${F}`, color: MUT, whiteSpace: "nowrap" }}>{r.hasSalesNav ? "SalesNav" : r.linkedinVerified ? "verified" : "standard"}</span>
                          </div>
                          {/* renter */}
                          <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                            <span style={{ font: `600 13px ${F}`, color: rn ? INK : r.shadowRenter ? BLUE : MUT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{rn ? (rn.fullName || rn.email) : r.shadowRenter ? shadowName(r.shadowRenter) : "—"}</span>
                            {rn ? <span style={{ font: `600 11px ${F}`, color: SUB, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>next {fmtD(r.rentals[0]?.currentPeriodEnd || null)}</span> : r.shadowRenter ? <span style={{ font: `600 11px ${F}`, color: MUT, whiteSpace: "nowrap" }}>shadow · yields on rent</span> : null}
                          </div>
                          {/* poc */}
                          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                            {r.ownerPoc ? <><span style={{ flex: "none", width: 22, height: 22, borderRadius: "50%", background: colorOf(r.ownerPoc), color: "#fff", font: `700 10px ${F}`, display: "flex", alignItems: "center", justifyContent: "center" }}>{iniOf(r.ownerPoc)}</span><span style={{ font: `600 12.5px ${F}`, color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.ownerPoc}</span></> : <span style={{ font: `600 12.5px ${F}`, color: MUT }}>—</span>}
                          </div>
                          {/* health — always-on quick actions */}
                          <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-start" }}>
                            <div style={{ display: "flex", gap: 4 }}>
                              <button onClick={() => markActive(r)} disabled={busy === r.id} title="Healthy — mark active" style={{ width: 32, height: 28, borderRadius: 8, border: `1.5px solid ${GREEN}`, background: !r.restrictedAt && r.linkedinAccountHealth === "active" ? "#dcfce7" : "#fff", color: GREEND, font: `800 13px ${F}`, cursor: "pointer" }}>✓</button>
                              <button onClick={() => setRestricted(r, true)} disabled={busy === r.id} title="Restricted" style={{ width: 32, height: 28, borderRadius: 8, border: `1.5px solid ${RED}`, background: r.restrictedAt ? "#fee2e2" : "#fff", color: REDD, font: `800 12px ${F}`, cursor: "pointer" }}>✕</button>
                            </div>
                            <span title={r.healthCheckedAt ? `Last checked ${fmtDY(r.healthCheckedAt)}` : "Never health-checked"} style={{ font: `600 10px ${F}`, color: r.restrictedAt ? REDD : done ? GREEND : (!r.healthCheckedAt || Date.now() - new Date(r.healthCheckedAt).getTime() > 2 * 86400000) ? AMBER : SUB, whiteSpace: "nowrap" }}>{r.restrictedAt ? "restricted" : r.healthCheckedAt ? (done ? "✓ today" : relDays(r.healthCheckedAt)) : "never checked"}</span>
                          </div>
                          {/* rent toggle */}
                          <div onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => toggleRent(r)} disabled={r.status === "rented" || r.status === "trial"} title={rentOn ? "Listed for rent" : "Not listed"} style={{ position: "relative", width: 36, height: 20, borderRadius: 999, border: "none", cursor: r.status === "rented" || r.status === "trial" ? "not-allowed" : "pointer", padding: 0, background: rentOn ? GREEN : "#cbd2dc", opacity: r.status === "rented" || r.status === "trial" ? 0.5 : 1 }}><span style={{ position: "absolute", top: 2, left: rentOn ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .15s" }} /></button>
                          </div>
                          {/* trial */}
                          <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", justifyContent: "flex-end" }}>
                            {canonicalStatus(r) === "Available" && !r.shadowRenter && <button onClick={() => trial(r)} disabled={busy === r.id} style={{ border: `1px solid #dde1e8`, background: "#fff", color: INK, borderRadius: 8, padding: "5px 10px", font: `700 12px ${F}`, cursor: "pointer", whiteSpace: "nowrap" }}>Trial</button>}
                          </div>
                          <span style={{ font: `700 14px ${F}`, color: MUT, display: "inline-block", transform: isOpen ? "rotate(90deg)" : "none", transition: "transform .15s" }}>›</span>
                        </div>

                        {isOpen && <ExpandedDetail r={r} tab={curTab} setTab={(t) => setTab((m) => ({ ...m, [r.id]: t }))} busy={busy === r.id} price={price} markActive={() => markActive(r)} setRestricted={(v) => setRestricted(r, v)} recheck={() => recheck(r)} patch={patch} patchApp={patchApp} reload={load} />}
                      </div>
                    );
                  }); })()}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Expanded detail: Overview / Sign-in tabs ──
function ExpandedDetail({ r, tab, setTab, busy, price, markActive, setRestricted, recheck, patch, patchApp, reload }: {
  r: Account; tab: "overview" | "signin" | "owner"; setTab: (t: "overview" | "signin" | "owner") => void; busy: boolean; price: number;
  markActive: () => void; setRestricted: (v: boolean) => void; recheck: () => void;
  patch: (id: string, body: Record<string, unknown>, reload?: boolean) => Promise<Response | undefined>;
  patchApp: (appId: string, body: Record<string, unknown>) => Promise<Response | undefined>; reload: () => void;
}) {
  const [note, setNote] = useState("");
  const [who, setWho] = useState("");
  const [joined, setJoined] = useState(r.linkedinJoinedAt ? r.linkedinJoinedAt.slice(0, 7) : "");
  const [connVal, setConnVal] = useState(String(r.connectionCount));
  const hist = Array.isArray(r.connectionHistory) ? r.connectionHistory.filter((p) => typeof p.count === "number" && !p.note) : [];
  const restr = Array.isArray(r.restrictionLog) ? r.restrictionLog : [];
  const rCnt = restr.filter((e) => e.event === "restricted").length;
  // sparkline from the last up-to-12 points
  const pts = hist.slice(-12);
  const spark = (() => {
    if (pts.length < 2) return { line: "", area: "", d30: null as number | null };
    const vals = pts.map((p) => p.count); const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1;
    const X = (i: number) => (i / (pts.length - 1)) * 240; const Y = (v: number) => 44 - ((v - min) / range) * 40 + 2;
    const line = pts.map((p, i) => `${X(i).toFixed(1)},${Y(p.count).toFixed(1)}`).join(" ");
    const area = `0,48 ${line} 240,48`;
    const cutoff = Date.now() - 30 * 86400000;
    const old = [...hist].reverse().find((p) => new Date(p.at).getTime() <= cutoff);
    const d30 = old ? r.connectionCount - old.count : null;
    return { line, area, d30 };
  })();

  // composed timeline
  const events = useMemo(() => {
    const ev: { at: string; t: string; s?: string; dot: string }[] = [];
    if (r.ownerSetupPaidAt) ev.push({ at: r.ownerSetupPaidAt, t: "Setup fee paid", dot: GREEN });
    if (r.ownerOnboardedAt) ev.push({ at: r.ownerOnboardedAt, t: "Onboarded", dot: BLUE });
    for (const e of restr) ev.push({ at: e.at, t: e.event === "restricted" ? "Restricted" : "Recovered", s: e.note || (e.creditedDays ? `+${e.creditedDays}d credit` : undefined), dot: e.event === "restricted" ? RED : GREEN });
    for (const p of (r.connectionHistory || [])) if (p.note) ev.push({ at: p.at, t: p.note === "rented" ? "Rented out" : "Returned", s: `${p.count} connections`, dot: p.note === "rented" ? BLUE : MUT });
    return ev.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
  }, [r, restr]);

  const Tab = ({ k, l }: { k: "overview" | "signin" | "owner"; l: string }) => <button onClick={() => setTab(k)} style={{ border: "none", cursor: "pointer", borderRadius: 7, padding: "6px 12px", whiteSpace: "nowrap", font: `700 12px ${F}`, background: tab === k ? "#fff" : "transparent", color: tab === k ? INK : SUB, boxShadow: tab === k ? "0 1px 3px rgba(0,0,0,.1)" : "none" }}>{l}</button>;
  const rn = r.rentals[0]?.user;

  return (
    <div onClick={(e) => e.stopPropagation()} style={{ position: "sticky", left: 0, width: "calc(100vw - 96px)", maxWidth: 1328, padding: "4px 16px 14px", background: "#fafbfc", cursor: "default" }}>
      <div style={{ display: "flex", gap: 3, background: BG, borderRadius: 10, padding: 3, margin: "4px 0 12px", width: "max-content" }}>
        <Tab k="overview" l="Overview" /><Tab k="signin" l="Sign-in & credentials" /><Tab k="owner" l="Owner & activity" />
      </div>

      {tab === "overview" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 10 }}>
            <Card span={2}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><Lbl>Connections</Lbl><span style={{ marginLeft: "auto", font: `600 11px ${F}`, color: MUT }}>recent</span></div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 14 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: "none" }}>
                  <span style={{ font: `700 24px ${G}`, color: INK }}>{r.connectionCount}</span>
                  {spark.d30 != null && <span style={{ font: `700 12px ${F}`, color: spark.d30 >= 0 ? GREEND : REDD }}>{spark.d30 >= 0 ? "+" : ""}{spark.d30} / 30d</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {spark.line ? <svg viewBox="0 0 240 48" preserveAspectRatio="none" style={{ width: "100%", height: 48, display: "block" }}><polygon points={spark.area} fill="#e8f0fe" /><polyline points={spark.line} fill="none" stroke={BLUE} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" /></svg> : <span style={{ font: `500 12px ${F}`, color: MUT }}>No history yet — fills as checks are logged.</span>}
                </div>
              </div>
            </Card>
            <Card><Lbl>Restrictions</Lbl><span style={{ font: `700 24px ${G}`, color: rCnt ? REDD : INK }}>{rCnt}</span><span style={{ font: `600 12px ${F}`, color: SUB }}>{r.restrictedAt ? "currently restricted" : rCnt ? "recovered" : "clean record"}</span></Card>
            <Card><Lbl>Earned, all-time</Lbl><span style={{ font: `700 24px ${G}`, color: INK }}>{money(Math.round(r.earnedTotal || 0))}</span><span style={{ font: `600 12px ${F}`, color: SUB }}>gross collected</span></Card>
            <Card><Lbl>Utilisation</Lbl><span style={{ font: `700 24px ${G}`, color: INK }}>{Math.round((r.utilisation || 0) * 100)}%</span><span style={{ height: 4, borderRadius: 4, background: LINE2, overflow: "hidden", display: "block", margin: "2px 0" }}><span style={{ display: "block", height: "100%", width: `${Math.round((r.utilisation || 0) * 100)}%`, background: GREEN }} /></span><span style={{ font: `600 12px ${F}`, color: SUB }}>rented, lifetime</span></Card>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 10, marginTop: 10 }}>
            <Card>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><Lbl>History</Lbl><span style={{ font: `600 11px ${F}`, color: MUT }}>newest first</span></div>
              {events.length === 0 ? <span style={{ font: `500 12.5px ${F}`, color: MUT }}>No events recorded yet.</span> : <div style={{ display: "flex", flexDirection: "column" }}>{events.map((e, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "62px 14px minmax(0,1fr)", gap: 10 }}>
                  <span style={{ font: `600 11.5px/1.5 ${F}`, color: MUT, textAlign: "right", padding: "1px 0 12px" }}>{fmtD(e.at)}</span>
                  <span style={{ position: "relative", display: "flex", justifyContent: "center" }}><span style={{ position: "absolute", top: 0, bottom: 0, width: 2, background: LINE2 }} /><span style={{ position: "relative", marginTop: 5, width: 10, height: 10, borderRadius: "50%", background: e.dot, boxShadow: "0 0 0 3px #fff" }} /></span>
                  <div style={{ minWidth: 0, paddingBottom: 12 }}><div style={{ font: `700 13px/1.5 ${F}`, color: INK }}>{e.t}</div>{e.s && <div style={{ font: `500 12px/1.45 ${F}`, color: SUB }}>{e.s}</div>}</div>
                </div>
              ))}</div>}
            </Card>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
              <Card>
                <Lbl>Details</Lbl>
                <div style={{ display: "grid", gridTemplateColumns: "92px minmax(0,1fr)", gap: "5px 12px", font: `500 12.5px ${F}`, color: SUB }}>
                  <span>Location</span><b style={{ color: INK }}>{r.location || "—"}</b>
                  <span>Account age</span><b style={{ color: INK }}>{ageStr(r)}</b>
                  <span>In inventory</span><b style={{ color: INK }}>{fmtDY(r.createdAt)}</b>
                  <span>Renter</span><b style={{ color: INK }}>{rn ? (rn.fullName || rn.email) : "—"}</b>
                  <span>Rate</span><b style={{ color: INK }}>${price}/mo</b>
                  <span>Next billing</span><b style={{ color: INK }}>{fmtDY(r.rentals[0]?.currentPeriodEnd || null)}</b>
                  <span>Owner</span><b style={{ color: INK }}>{r.ownerName || "—"}</b>
                  <span>Ambassador</span><b style={{ color: INK }}>{Number(r.ambassadorPayment) > 0 ? `${formatMoney(Number(r.ambassadorPayment), currencyConfigFor(r.ownerPayoutCurrency, r.ownerReferredBy).currency)}/mo` : "—"}</b>
                </div>
              </Card>
              {r.twoFactorResetNeeded && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "11px 12px" }}>
                  <span style={{ font: `700 12px ${F}`, color: REDD }}>Rotate before re-renting</span>
                  <button onClick={() => patch(r.id, { twoFactorResetNeeded: false })} disabled={busy} style={{ display: "flex", alignItems: "flex-start", gap: 8, border: "none", background: "none", padding: 0, cursor: "pointer", textAlign: "left", font: `600 12.5px/1.35 ${F}`, color: INK }}>
                    <span style={{ flex: "none", width: 16, height: 16, borderRadius: 5, border: `1.5px solid ${RED}`, background: "#fff", marginTop: 1 }} /><span>Rotate the 2FA key, then clear this flag</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {tab === "signin" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 10, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
            <Card pad="14px">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Lbl>Sign-in &amp; credentials</Lbl>{r.gologinShareLink && <a href={r.gologinShareLink} target="_blank" rel="noreferrer" style={{ marginLeft: "auto", font: `700 12.5px ${F}`, color: BLUE, textDecoration: "none" }}>↗ Open GoLogin</a>}</div>
              <Totp accountId={r.id} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: `1px solid ${LINE2}`, paddingTop: 12 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><Lbl>Health actions</Lbl><span style={{ marginLeft: "auto", font: `600 11.5px ${F}`, color: r.restrictedAt ? REDD : GREEND }}>{r.restrictedAt ? "restricted" : r.linkedinAccountHealth === "active" ? "healthy" : (r.linkedinAccountHealth || "unchecked")}</span></div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {r.restrictedAt
                    ? <button onClick={() => setRestricted(false)} disabled={busy} style={{ border: `1.5px solid ${GREEN}`, background: "#f0fdf4", color: GREEND, borderRadius: 10, padding: "8px 14px", font: `700 13px ${F}`, cursor: "pointer" }}>✓ Mark recovered</button>
                    : <><button onClick={markActive} disabled={busy} style={{ border: `1.5px solid ${GREEN}`, background: "#fff", color: GREEND, borderRadius: 10, padding: "8px 14px", font: `700 13px ${F}`, cursor: "pointer" }}>✓ Mark active</button>
                       <button onClick={() => setRestricted(true)} disabled={busy} style={{ border: `1.5px solid ${RED}`, background: "#fff", color: REDD, borderRadius: 10, padding: "8px 14px", font: `700 13px ${F}`, cursor: "pointer" }}>Mark restricted</button></>}
                  <button onClick={recheck} disabled={busy} style={{ border: `1.5px solid ${LINE}`, background: "#fff", color: "#3b4657", borderRadius: 10, padding: "8px 14px", font: `700 13px ${F}`, cursor: "pointer" }}>↻ Re-check</button>
                </div>
              </div>
            </Card>
            <Card pad="14px">
              <Lbl>Chase an issue</Lbl>
              <IssueActions twoFactorReceivedAt={r.twoFactorReceivedAt} originalEmail={r.personalEmail} lvEmail={r.loginEmail} referralPartner={r.issueReferrerName} from={r.issueEmailFrom} accountId={r.id} profile={r.linkedinUrl} onSent={reload} name={formatName(r.linkedinName)} ambassador={ambassadorIssueContact(r.issueAmbassadorEmail, r.ownerPhone, r.contactChannel, r.location)} referrer={r.issueReferrerContact} />
            </Card>
          </div>
          <Card pad="14px">
            <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}><Lbl>Login email (work)</Lbl><Copyable value={r.loginEmail} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}><Lbl>Personal email</Lbl><Copyable value={r.personalEmail} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}><Lbl>Work / recovery email</Lbl><Copyable value={r.workEmail} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}><Lbl>Password</Lbl><Copyable value={r.accountPassword} /></div>
            {r.gologinProfileId && <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}><Lbl>GoLogin profile ID</Lbl><Copyable value={r.gologinProfileId} /></div>}
          </Card>
        </div>
      )}

      {tab === "owner" && (() => {
        const connLog = hist.map((p, i) => ({ at: p.at, count: p.count, delta: i > 0 ? p.count - hist[i - 1].count : null })).reverse().slice(0, 8);
        const rh = restr.slice().reverse().slice(0, 10);
        const touches = (r.ownerOutreachLog || []).slice().sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 10);
        const appId = r.ownerApplicationId;
        const saveOwnerConn = () => { const body: Record<string, unknown> = { linkedinJoinedAt: joined ? new Date(joined + "-01T00:00:00Z").toISOString() : null }; const n = parseInt(connVal.replace(/[^0-9]/g, ""), 10); if (!Number.isNaN(n)) body.connectionCount = n; patch(r.id, body); };
        const logTouch = (ch: string) => { if (!appId) return; patchApp(appId, { addTouch: { ch, text: note.trim() || undefined, by: who.trim() || undefined } }).then(() => setNote("")); };
        const connDirty = joined !== (r.linkedinJoinedAt ? r.linkedinJoinedAt.slice(0, 7) : "") || connVal !== String(r.connectionCount);
        const d30 = (() => { const cutoff = Date.now() - 30 * 86400000; const old = [...hist].reverse().find((p) => new Date(p.at).getTime() <= cutoff); return old ? r.connectionCount - old.count : null; })();
        const field = (label: string, value: string | null, copyable?: boolean) => (
          <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}><Lbl>{label}</Lbl>{copyable ? <Copyable value={value} /> : <span style={{ font: `600 13.5px/1.45 ${F}`, color: value ? INK : MUT, overflowWrap: "anywhere" }}>{value || "—"}</span>}</div>
        );
        const CHIP: Record<string, string> = { whatsapp: "WhatsApp", viber: "Viber", telegram: "Telegram", email: "Email", text: "Text", note: "Note" };
        return (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 10, alignItems: "start" }}>
            {/* account owner */}
            <Card pad="14px">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Lbl>Account owner</Lbl>{r.linkedinUrl && <a href={r.linkedinUrl.startsWith("http") ? r.linkedinUrl : `https://${r.linkedinUrl}`} target="_blank" rel="noreferrer" style={{ marginLeft: "auto", font: `700 12.5px ${F}`, color: BLUE, textDecoration: "none" }}>View profile ↗</a>}</div>
              <div style={{ background: "#f6f7f9", borderRadius: 12, padding: 12, display: "flex", gap: 14, alignItems: "center" }}>
                {r.profilePhotoUrl || r.profileScreenshotUrl
                  ? <img src={(r.profilePhotoUrl || r.profileScreenshotUrl)!} alt="" style={{ width: 64, height: 64, borderRadius: 12, objectFit: "cover", flex: "none" }} />
                  : <div style={{ width: 64, height: 64, borderRadius: 12, background: "#dfe5ee", color: SUB, display: "grid", placeItems: "center", font: `700 18px ${F}`, flex: "none" }}>{iniOf(r.linkedinName)}</div>}
                <span style={{ font: `500 12.5px/1.45 ${F}`, color: SUB }}>Profile photo{r.profilePhotoUrl ? " · edited saved" : r.profileScreenshotUrl ? " · onboarding original" : " not set"}. Upload/edit it on the live Inventory tab.</span>
              </div>
              {field("Full name", formatName(r.linkedinName), true)}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}>
                {field("Applied with (email)", r.ownerEmail || r.issueAmbassadorEmail, true)}
                {field("Contact number / handle", r.ownerPhone ? `${r.ownerPhone}${r.contactChannel ? ` · ${r.contactChannel}` : ""}` : null, true)}
                {field("Location", r.location)}
                {field("Connections", String(r.connectionCount))}
                {field("Found us via", r.ownerReferralSource)}
                {field("Referred by", r.ownerReferredBy)}
                {field("LV handler (PoC)", r.ownerPoc)}
                {field("Owner status", r.ownerStatus)}
              </div>
            </Card>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
              {/* connections editor + log */}
              <Card pad="14px">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Lbl>Connections</Lbl>{d30 != null && <span style={{ marginLeft: "auto", font: `700 12px ${F}`, color: d30 >= 0 ? GREEND : REDD }}>{d30 >= 0 ? "+" : ""}{d30} / 30d</span>}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4 }}><Lbl>Joined LinkedIn</Lbl><input type="month" value={joined} onChange={(e) => setJoined(e.target.value)} style={{ border: "1px solid #dde1e8", background: "#fff", borderRadius: 9, padding: "8px 10px", font: `500 13px ${F}`, color: INK, outline: "none", minWidth: 0 }} /></label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4 }}><Lbl>Connections now</Lbl><input value={connVal} onChange={(e) => setConnVal(e.target.value)} inputMode="numeric" style={{ border: "1px solid #dde1e8", background: "#fff", borderRadius: 9, padding: "8px 10px", font: `500 13px ${F}`, color: INK, outline: "none", minWidth: 0 }} /></label>
                </div>
                <button onClick={saveOwnerConn} disabled={busy || !connDirty} style={{ border: "1px solid #dde1e8", background: "#fff", color: INK, borderRadius: 9, padding: 8, font: `700 12.5px ${F}`, cursor: connDirty ? "pointer" : "default", opacity: connDirty ? 1 : 0.5 }}>{connDirty ? "Save to inventory" : "✓ Saved"}</button>
                {connLog.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 5, borderTop: `1px solid ${LINE2}`, paddingTop: 10 }}>{connLog.map((c, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "96px 56px minmax(0,1fr)", gap: 8, font: `500 12.5px ${F}`, color: SUB }}><span style={{ color: MUT }}>{fmtDY(c.at)}</span><b style={{ color: INK, fontFamily: G }}>{c.count}</b>{c.delta != null && c.delta !== 0 && <span style={{ color: c.delta > 0 ? GREEND : REDD, fontWeight: 600 }}>{c.delta > 0 ? "+" : ""}{c.delta}</span>}</div>
                ))}</div>}
              </Card>

              {/* restriction history */}
              <Card pad="14px">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Lbl>Restriction history</Lbl><span style={{ marginLeft: "auto", font: `700 12px ${F}`, color: rCnt ? REDD : GREEND }}>{rCnt ? `${rCnt} restriction${rCnt === 1 ? "" : "s"}` : "clean"}</span></div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={markActive} disabled={busy} style={{ flex: 1, border: "1px solid #bfe6cf", background: "#fff", color: GREEND, borderRadius: 9, padding: 8, font: `700 12.5px ${F}`, cursor: "pointer" }}>✓ Log active</button>
                  <button onClick={() => setRestricted(true)} disabled={busy} style={{ flex: 1, border: "1px solid #fecaca", background: "#fff", color: REDD, borderRadius: 9, padding: 8, font: `700 12.5px ${F}`, cursor: "pointer" }}>Log restricted</button>
                </div>
                {rh.length > 0 ? <div style={{ display: "flex", flexDirection: "column", gap: 5, borderTop: `1px solid ${LINE2}`, paddingTop: 10 }}>{rh.map((h, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "96px 86px minmax(0,1fr)", gap: 8, font: `500 12.5px ${F}`, color: SUB }}><span style={{ color: MUT }}>{fmtDY(h.at)}</span><b style={{ color: h.event === "recovered" ? GREEND : REDD }}>{h.event === "recovered" ? "Recovered" : "Restricted"}</b><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={h.note || ""}>{h.note || (h.creditedDays ? `+${h.creditedDays}d credit` : "—")}</span></div>
                ))}</div> : <span style={{ font: `500 12.5px ${F}`, color: MUT }}>Never restricted.</span>}
              </Card>

              {/* activity / notes */}
              <Card pad="14px">
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}><Lbl>Activity</Lbl><span style={{ font: `500 12.5px ${F}`, color: SUB }}>{touches.length} {touches.length === 1 ? "touch" : "touches"}</span>
                  <label style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, font: `600 12px ${F}`, color: SUB }}>Follow up<input type="date" value={r.ownerNextFollowUp ? new Date(r.ownerNextFollowUp).toISOString().slice(0, 10) : ""} onChange={(e) => appId && patchApp(appId, { nextFollowUp: e.target.value ? new Date(e.target.value).toISOString() : null })} disabled={!appId} style={{ border: "1px solid #dde1e8", background: "#fff", borderRadius: 9, padding: "6px 8px", font: `500 13px ${F}`, color: INK, outline: "none" }} /></label>
                </div>
                {appId ? <>
                  <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What happened? Logged with the date and your name" style={{ border: "1px solid #dde1e8", background: "#fff", borderRadius: 9, padding: "8px 10px", font: `500 13px ${F}`, color: INK, outline: "none" }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <input value={who} onChange={(e) => setWho(e.target.value)} placeholder="Who sent it?" style={{ border: "1px solid #dde1e8", background: "#fff", borderRadius: 9, padding: "8px 10px", font: `500 13px ${F}`, color: INK, outline: "none", width: 150 }} />
                    <Lbl>Log</Lbl>
                    {["whatsapp", "email", "text", "note"].map((ch) => <button key={ch} onClick={() => logTouch(ch)} disabled={busy} style={{ border: "1px solid #dde1e8", background: "#fff", color: "#3b4657", borderRadius: 9, padding: "7px 12px", font: `600 12.5px ${F}`, cursor: "pointer", whiteSpace: "nowrap" }}>+ {CHIP[ch]}</button>)}
                  </div>
                </> : <span style={{ font: `500 12px ${F}`, color: MUT }}>No ambassador application linked — activity log is for owner-linked accounts.</span>}
                {touches.length > 0 && <div style={{ display: "flex", flexDirection: "column", borderTop: `1px solid ${LINE2}` }}>{touches.map((t, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "84px minmax(0,1fr) auto 16px", gap: 12, alignItems: "start", padding: "10px 0", borderBottom: `1px solid #f6f7f9` }}>
                    <span style={{ justifySelf: "start", font: `700 10.5px ${F}`, letterSpacing: ".06em", textTransform: "uppercase", padding: "3px 9px", borderRadius: 7, background: BG, color: SUB }}>{CHIP[t.ch] || t.ch}</span>
                    <span style={{ font: `500 13px/1.45 ${F}`, color: INK }}>{t.text}</span>
                    <span style={{ font: `500 11.5px ${F}`, color: MUT, whiteSpace: "nowrap" }}>{t.by || "—"} · {fmtD(t.at)}</span>
                    <button onClick={() => appId && patchApp(appId, { removeTouch: t.at })} title="Delete" style={{ border: "none", background: "none", color: MUT, font: `700 13px ${F}`, cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>
                  </div>
                ))}</div>}
              </Card>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
