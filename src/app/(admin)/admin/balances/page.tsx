"use client";

import { useEffect, useMemo, useState } from "react";

const F_SANS = "var(--font-sans),system-ui,sans-serif";
const F_GRO = "var(--font-grotesk),system-ui,sans-serif";
const SETUP_FEE = 1000;

const peso = (n: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(n);
const fmtDate = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// "N days ago" style label for the last-paid column.
const DAY_MS = 86400000;
const agoLabel = (iso: string | null): string => {
  if (!iso) return "first payout";
  const days = Math.round((Date.now() - new Date(iso).getTime()) / DAY_MS);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
};
// Relative "when" for a due date, driving the group pill tone.
const relWhen = (iso: string): { label: string; soon: boolean } => {
  const d = new Date(iso); d.setHours(0, 0, 0, 0);
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  const n = Math.round((d.getTime() - t0.getTime()) / DAY_MS);
  if (n < 0) return { label: "overdue", soon: true };
  if (n === 0) return { label: "today", soon: true };
  if (n === 1) return { label: "in 1 day", soon: true };
  return { label: `in ${n} days`, soon: n <= 4 };
};

// Business-day + due-date helpers (mirror lib/payment-schedule; duplicated so this
// client page doesn't import the server module that pulls in Prisma).
const nextBusinessDay = (d: Date): Date => {
  const r = new Date(d);
  const day = r.getDay();
  if (day === 6) r.setDate(r.getDate() + 2);
  else if (day === 0) r.setDate(r.getDate() + 1);
  return r;
};
const setupDueDate = (onboardedAt: string | null, freshness: string | null): Date | null => {
  if (!onboardedAt) return null;
  const d = new Date(onboardedAt);
  d.setDate(d.getDate() + (freshness === "fresh" ? 7 : 3));
  return nextBusinessDay(d);
};
const firstMonthlyDue = (onboardedAt: string | null): Date | null => {
  if (!onboardedAt) return null;
  const o = new Date(onboardedAt);
  const anchor = new Date(o.getFullYear(), o.getMonth() + 1, o.getDate());
  const firstMonth = anchor.getDate() === 1 ? anchor.getMonth() : anchor.getMonth() + 1;
  return new Date(anchor.getFullYear(), firstMonth, 1);
};

interface OwnerAccount { status: string; ambassadorPayment: string | number; }
interface MonthlyPayout { paidAt: string; amount: number; kind?: "setup" | "monthly" | null; }
interface Owner {
  email: string; fullName: string; accountCount: number; monthlyPayout: number;
  ownerStatus: string | null; accountIssue: string | null;
  paymentMethod: string | null; paymentDetails: string | null;
  setupFeePaidAt: string | null; monthlyPayouts: MonthlyPayout[];
  onboardedAt: string | null; accountFreshness: string | null; accounts: OwnerAccount[];
}
interface MarketerDue { name: string; count: number; amount: number; }
interface PaymentsDue { marketers: MarketerDue[] }

const hasLive = (o: Owner) => o.accounts.some((a) => a.status === "available" || a.status === "rented");
const resolveStatus = (o: Owner): string => {
  const manual = o.ownerStatus && ["active", "waiting_us", "waiting_them", "paused", "lost"].includes(o.ownerStatus);
  if (manual) return o.ownerStatus as string;
  return o.accountIssue ? "waiting_them" : hasLive(o) ? "active" : "waiting_us";
};
const ownerSetupInfo = (o: Owner) => {
  const setupEntryCount = o.monthlyPayouts.filter((p) => p.kind === "setup").length;
  const setupsPaidCount = setupEntryCount + (o.setupFeePaidAt && setupEntryCount === 0 ? 1 : 0);
  const setupsOwed = Math.max(o.accounts.length, 1);
  return { setupsPaidCount, setupsOwed, setupsRemaining: Math.max(0, setupsOwed - setupsPaidCount) };
};

type FeeKey = "setup" | "monthly" | "referral";
type StateKey = "paid" | "unpaid" | "processing" | "hold";
interface Row {
  key: string; name: string; email: string; accounts: number | string;
  owedNum: number; fee: FeeKey; method: string; methodDetail: string;
  lastPaid: string; lastPaidAgo: string; state: StateKey; dueISO: string | null;
}

const FEE_META: Record<FeeKey, { label: string; bg: string; fg: string }> = {
  setup: { label: "Setup fee", bg: "var(--blue-chip-bg)", fg: "var(--blue-chip-text)" },
  monthly: { label: "Monthly fee", bg: "var(--st-active-bg)", fg: "var(--st-active-fg)" },
  referral: { label: "Referral fee", bg: "var(--neutral-chip-bg)", fg: "var(--neutral-chip-text)" },
};
const STATE_META: Record<StateKey, { label: string; bg: string; fg: string }> = {
  paid: { label: "✓ Paid", bg: "var(--st-active-bg)", fg: "var(--st-active-fg)" },
  unpaid: { label: "Unpaid", bg: "var(--warn-badge-bg)", fg: "var(--warn-badge-text)" },
  processing: { label: "◷ Processing", bg: "var(--blue-chip-bg)", fg: "var(--blue-chip-text)" },
  hold: { label: "△ On hold", bg: "var(--st-cancel-bg)", fg: "var(--st-cancel-fg)" },
};

const GRID = "1fr 78px 104px 118px 150px 120px 128px";
const labelHead: React.CSSProperties = { font: `700 9.5px ${F_SANS}`, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--label)" };

export default function AdminPayoutsPage() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [marketers, setMarketers] = useState<MarketerDue[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<"all" | StateKey>("all");
  const [feeFilter, setFeeFilter] = useState<"all" | FeeKey>("all");
  // Cycle = a calendar month. Offset 0 = the current month; ‹ › shift it.
  const [cycleOffset, setCycleOffset] = useState(0);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/owners").then((r) => r.json()).catch(() => ({ owners: [] })),
      fetch("/api/admin/payments-due").then((r) => r.json()).catch(() => ({ marketers: [] })),
    ]).then(([o, d]: [{ owners: Owner[] }, PaymentsDue]) => {
      setOwners(o.owners || []);
      setMarketers(d?.marketers || []);
    }).finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const cy = now.getFullYear();
  const cm0 = now.getMonth();
  const cycleDate = new Date(cy, cm0 + cycleOffset, 1);
  const CY = cycleDate.getFullYear();
  const CM = cycleDate.getMonth();
  const isCurrentCycle = cycleOffset === 0;
  const sameMonth = (iso: string | null | undefined) => !!iso && (() => { const d = new Date(iso); return d.getFullYear() === CY && d.getMonth() === CM; })();

  // Build the payout rows for the selected cycle from the live owner data.
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const o of owners) {
      const status = resolveStatus(o);
      if (status === "paused" || status === "lost") continue;
      const info = ownerSetupInfo(o);
      const monthlyEntries = o.monthlyPayouts.filter((p) => p.kind !== "setup");
      const lastPay = o.monthlyPayouts.reduce<MonthlyPayout | null>((a, p) => (!a || new Date(p.paidAt) > new Date(a.paidAt) ? p : a), null);
      const missing = !o.paymentMethod || !o.paymentDetails;
      const blocked = !!o.accountIssue;
      const base = {
        name: o.fullName, email: o.email, accounts: o.accountCount,
        method: o.paymentMethod || "—", methodDetail: o.paymentDetails || "",
        lastPaid: lastPay ? fmtDate(lastPay.paidAt) : "—", lastPaidAgo: agoLabel(lastPay?.paidAt || null),
      };
      // Monthly obligation for this cycle (once they're past their first due month).
      const fd = firstMonthlyDue(o.onboardedAt);
      if (o.monthlyPayout > 0 && fd && new Date(CY, CM, 1) >= fd) {
        const paidThis = monthlyEntries.some((p) => sameMonth(p.paidAt));
        out.push({ ...base, key: `${o.email}:m`, fee: "monthly", owedNum: o.monthlyPayout, dueISO: new Date(CY, CM, 1).toISOString(), state: blocked || missing ? "hold" : paidThis ? "paid" : "unpaid" });
      }
      // Outstanding setup fees — surface in their due month, and (if overdue) in the current cycle.
      if (info.setupsRemaining > 0) {
        const sd = setupDueDate(o.onboardedAt, o.accountFreshness);
        if (sd) {
          const dueThisMonth = sd.getFullYear() === CY && sd.getMonth() === CM;
          const overdueNow = isCurrentCycle && new Date(sd.getFullYear(), sd.getMonth(), 1) <= new Date(CY, CM, 1);
          if (dueThisMonth || overdueNow) {
            out.push({ ...base, key: `${o.email}:s`, fee: "setup", owedNum: info.setupsRemaining * SETUP_FEE, dueISO: sd.toISOString(), state: blocked || missing ? "hold" : "unpaid" });
          }
        }
      }
    }
    // Referral commissions ready to pay (current cycle only).
    if (isCurrentCycle) {
      for (const m of marketers) {
        out.push({ key: `ref:${m.name}`, name: m.name, email: `${m.count} signup${m.count !== 1 ? "s" : ""} · referral`, accounts: "—", fee: "referral", owedNum: m.amount, method: "Referral", methodDetail: "", lastPaid: "—", lastPaidAgo: "ready", state: "unpaid", dueISO: null });
      }
    }
    return out;
  }, [owners, marketers, CY, CM, isCurrentCycle]); // eslint-disable-line react-hooks/exhaustive-deps

  // Summary + chip counts are over the whole cycle (before search/chip filters).
  const totalOwed = rows.reduce((s, r) => s + r.owedNum, 0);
  const paidSum = rows.filter((r) => r.state === "paid").reduce((s, r) => s + r.owedNum, 0);
  const holdCount = rows.filter((r) => r.state === "hold").length;
  const acctSum = rows.reduce((s, r) => s + (typeof r.accounts === "number" ? r.accounts : 0), 0);
  const cnt = (fn: (r: Row) => boolean) => rows.filter(fn).length;

  const q = query.trim().toLowerCase();
  const visible = rows.filter((r) =>
    (stateFilter === "all" || r.state === stateFilter) &&
    (feeFilter === "all" || r.fee === feeFilter) &&
    (!q || `${r.name} ${r.email} ${r.method} ${FEE_META[r.fee].label}`.toLowerCase().includes(q))
  );

  // Group the visible rows by due date (dated first, "ready" referral rows last).
  const groups = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const r of visible) {
      const k = r.dueISO ? r.dueISO.slice(0, 10) : "ready";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    return [...map.entries()].sort((a, b) => {
      if (a[0] === "ready") return 1;
      if (b[0] === "ready") return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [visible]);

  const stats = [
    { label: "Owed this cycle", value: peso(totalOwed), hint: `${rows.length} payout${rows.length !== 1 ? "s" : ""} · ${acctSum} accounts`, accent: "var(--link)" },
    { label: "Paid so far", value: peso(paidSum), hint: `${cnt((r) => r.state === "paid")} of ${rows.length} settled`, accent: "var(--st-active-fg)" },
    { label: "Still to pay", value: peso(totalOwed - paidSum), hint: `${cnt((r) => r.state !== "paid")} pending`, accent: "var(--warn-badge-text)" },
    { label: "Needs attention", value: String(holdCount), hint: holdCount ? "missing details / can't log in" : "all details on file", accent: "var(--st-cancel-fg)" },
  ];
  const stateChips: { key: "all" | StateKey; label: string; dot: string | null }[] = [
    { key: "all", label: "All", dot: null },
    { key: "unpaid", label: "Unpaid", dot: "var(--warn-badge-text)" },
    { key: "processing", label: "Processing", dot: "var(--blue-chip-text)" },
    { key: "paid", label: "Paid", dot: "var(--st-active-fg)" },
    { key: "hold", label: "On hold", dot: "var(--st-cancel-fg)" },
  ];
  const feeChips: { key: "all" | FeeKey; label: string; dot: string | null }[] = [
    { key: "all", label: "All fees", dot: null },
    { key: "setup", label: "Setup fee", dot: "var(--blue-chip-text)" },
    { key: "monthly", label: "Monthly fee", dot: "var(--st-active-fg)" },
    { key: "referral", label: "Referral fee", dot: "var(--neutral-chip-text)" },
  ];
  const stateCount = (k: "all" | StateKey) => (k === "all" ? rows.length : cnt((r) => r.state === k));
  const feeCount = (k: "all" | FeeKey) => (k === "all" ? rows.length : cnt((r) => r.fee === k));

  const chipStyle = (on: boolean): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", font: `600 12.5px ${F_SANS}`,
    padding: "8px 14px", borderRadius: 999, border: "1px solid",
    background: on ? "var(--blue-chip-bg)" : "transparent", color: on ? "var(--blue-chip-text)" : "var(--muted)", borderColor: on ? "transparent" : "var(--btn-secondary-border)",
  });
  const countStyle: React.CSSProperties = { font: `700 11px ${F_GRO}`, fontVariantNumeric: "tabular-nums", padding: "1px 6px", borderRadius: 6, background: "var(--band)", color: "var(--muted)" };
  const pill = (bg: string, fg: string, extra?: React.CSSProperties): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", justifyContent: "center", font: `700 10.5px ${F_SANS}`, padding: "5px 10px", borderRadius: 7, whiteSpace: "nowrap", background: bg, color: fg, ...extra });
  const navBtn: React.CSSProperties = { font: `600 15px ${F_SANS}`, color: "var(--btn-secondary-fg)", background: "var(--btn-secondary-bg)", border: "1px solid var(--btn-secondary-border)", width: 34, height: 34, borderRadius: 9, cursor: "pointer" };

  const footerNote = `Setup ${peso(rows.filter((r) => r.fee === "setup").reduce((s, r) => s + r.owedNum, 0))} · Monthly ${peso(rows.filter((r) => r.fee === "monthly").reduce((s, r) => s + r.owedNum, 0))} · Referral ${peso(rows.filter((r) => r.fee === "referral").reduce((s, r) => s + r.owedNum, 0))}`;

  return (
    <div>
      {/* title + cycle */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 22, flexWrap: "wrap" }}>
        <div style={{ maxWidth: 660 }}>
          <h1 style={{ font: `600 30px/1 ${F_GRO}`, color: "var(--text)", margin: "0 0 8px", letterSpacing: "-.02em" }}>Ambassador payouts</h1>
          <p style={{ font: `500 13.5px/1.5 ${F_SANS}`, color: "var(--muted)", margin: 0 }}>
            Who&apos;s due and who&apos;s been paid this cycle. Logging payments, receipts and acknowledgements happens in <a href="/admin/owners" style={{ color: "var(--link)", fontWeight: 600 }}>Account owners</a>.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "none" }}>
          <button type="button" onClick={() => setCycleOffset((o) => o - 1)} style={navBtn}>‹</button>
          <div style={{ textAlign: "center", minWidth: 150 }}>
            <div style={{ font: `600 15px ${F_GRO}`, color: "var(--text)" }}>{MONTHS[CM]} {CY}</div>
            <div style={{ font: `500 11.5px ${F_SANS}`, color: "var(--muted2)", marginTop: 1 }}>Pay run · {fmtDate(new Date(CY, CM, 1))}</div>
          </div>
          <button type="button" onClick={() => setCycleOffset((o) => o + 1)} style={navBtn}>›</button>
        </div>
      </div>

      {/* summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 22 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderLeft: `3px solid ${s.accent}`, borderRadius: 14, padding: "16px 18px", boxShadow: "var(--card-shadow)" }}>
            <div style={{ ...labelHead, marginBottom: 7 }}>{s.label}</div>
            <div style={{ font: `600 24px/1 ${F_GRO}`, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
            <div style={{ font: `500 11.5px ${F_SANS}`, color: "var(--muted)", marginTop: 6 }}>{s.hint}</div>
          </div>
        ))}
      </div>

      {/* legend bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 14, padding: "13px 18px", marginBottom: 16, boxShadow: "var(--card-shadow)", flexWrap: "wrap" }}>
        <span style={{ font: `500 12.5px ${F_SANS}`, color: "var(--muted)" }}>Read-only overview · status mirrors what&apos;s logged in Account owners</span>
        <a href="/admin/owners" style={{ font: `600 12.5px ${F_SANS}`, color: "var(--btn-secondary-fg)", background: "var(--btn-secondary-bg)", border: "1px solid var(--btn-secondary-border)", padding: "9px 15px", borderRadius: 9, whiteSpace: "nowrap", flex: "none" }}>Go to Account owners →</a>
      </div>

      {/* filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        {stateChips.map((c) => (
          <button key={c.key} type="button" onClick={() => setStateFilter(c.key)} style={chipStyle(stateFilter === c.key)}>
            {c.dot && <span style={{ width: 7, height: 7, borderRadius: 999, flex: "none", background: c.dot }} />}{c.label}
            <span style={countStyle}>{stateCount(c.key)}</span>
          </button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {feeChips.map((c) => (
          <button key={c.key} type="button" onClick={() => setFeeFilter(c.key)} style={chipStyle(feeFilter === c.key)}>
            {c.dot && <span style={{ width: 7, height: 7, borderRadius: 999, flex: "none", background: c.dot }} />}{c.label}
            <span style={countStyle}>{feeCount(c.key)}</span>
          </button>
        ))}
      </div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email or payment method…"
        style={{ width: "100%", background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: 9, padding: "11px 14px", font: `500 13px ${F_SANS}`, color: "var(--input-fg)", outline: "none", marginBottom: 16 }} />

      {/* payout list */}
      <div style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 16, overflow: "hidden", boxShadow: "var(--card-shadow)" }}>
        <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 13, alignItems: "center", padding: "12px 18px", background: "var(--band)", borderBottom: "1px solid var(--divider)" }}>
          {["Ambassador", "Accounts", "Owed", "Fee type", "Payment method", "Last paid", "This cycle"].map((h) => <span key={h} style={labelHead}>{h}</span>)}
        </div>

        {loading ? (
          [1, 2, 3, 4].map((i) => <div key={i} style={{ height: 58, borderBottom: "1px solid var(--divider)", background: "var(--card)" }} />)
        ) : visible.length === 0 ? (
          <div style={{ padding: 44, textAlign: "center", font: `500 13.5px ${F_SANS}`, color: "var(--muted)" }}>
            {rows.length === 0 ? "Nothing to pay out this cycle." : "No ambassadors match these filters."}
          </div>
        ) : (
          groups.map(([k, list]) => {
            const ready = k === "ready";
            const w = ready ? { label: "ready", soon: false } : relWhen(list[0].dueISO!);
            const gSum = list.reduce((s, r) => s + r.owedNum, 0);
            return (
              <div key={k}>
                <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 18px", background: "var(--band)", borderBottom: "1px solid var(--divider)", flexWrap: "wrap" }}>
                  <span style={pill(w.soon ? "var(--warn-badge-bg)" : "var(--neutral-chip-bg)", w.soon ? "var(--warn-badge-text)" : "var(--neutral-chip-text)", { font: `700 10px ${F_SANS}`, borderRadius: 999, padding: "4px 10px" })}>{w.label}</span>
                  <span style={{ font: `700 11px ${F_SANS}`, color: "var(--text2)" }}>{ready ? "Ready to pay" : `Due ${fmtDate(list[0].dueISO!)}`}</span>
                  <span style={{ font: `500 11px ${F_SANS}`, color: "var(--muted)" }}>{list.length} ambassador{list.length !== 1 ? "s" : ""} · {peso(gSum)}</span>
                </div>
                {list.map((r) => (
                  <div key={r.key} style={{ display: "grid", gridTemplateColumns: GRID, gap: 13, alignItems: "center", padding: "14px 18px", borderBottom: "1px solid var(--divider)" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ font: `600 13.5px ${F_SANS}`, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                      <div style={{ font: `500 11.5px ${F_SANS}`, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.email}</div>
                    </div>
                    <span style={{ font: `600 13px ${F_GRO}`, color: "var(--text2)", fontVariantNumeric: "tabular-nums" }}>{r.accounts}</span>
                    <span style={{ font: `700 15px ${F_GRO}`, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{peso(r.owedNum)}</span>
                    <span style={pill(FEE_META[r.fee].bg, FEE_META[r.fee].fg)}>{FEE_META[r.fee].label}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ font: `600 12.5px ${F_SANS}`, color: "var(--text2)" }}>{r.method}</div>
                      {r.methodDetail && <div style={{ font: `500 11.5px ${F_SANS}`, color: "var(--muted2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.methodDetail}</div>}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ font: `500 12.5px ${F_SANS}`, color: "var(--text2)" }}>{r.lastPaid}</div>
                      <div style={{ font: `500 11px ${F_SANS}`, color: "var(--muted2)" }}>{r.lastPaidAgo}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <span style={pill(STATE_META[r.state].bg, STATE_META[r.state].fg, { font: `700 11px ${F_SANS}`, borderRadius: 999, padding: "5px 11px" })}>{STATE_META[r.state].label}</span>
                      <a href="/admin/owners" style={{ font: `600 11.5px ${F_SANS}`, color: "var(--muted)", whiteSpace: "nowrap" }}>Record →</a>
                    </div>
                  </div>
                ))}
              </div>
            );
          })
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "14px 18px", background: "var(--band)", borderTop: "1px solid var(--divider)", flexWrap: "wrap" }}>
          <span style={{ font: `500 12.5px ${F_SANS}`, color: "var(--muted)" }}>{footerNote}</span>
          <span style={{ font: `600 14px ${F_GRO}`, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>Cycle total {peso(totalOwed)}</span>
        </div>
      </div>
    </div>
  );
}
