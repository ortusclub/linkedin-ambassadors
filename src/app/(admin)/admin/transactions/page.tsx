"use client";

import { useEffect, useMemo, useState } from "react";
import { txMethod } from "@/lib/tx-method";

interface Transaction {
  id: string;
  type: string;
  amount: string;
  txHash: string | null;
  description: string | null;
  createdAt: string;
  user: { fullName: string; email: string; isTest?: boolean };
}

const F_SANS = "var(--font-sans),system-ui,sans-serif";
const F_GRO = "var(--font-grotesk),system-ui,sans-serif";

// enum -> chip group (sweep/refund fold into "adjustment")
const typeGroup = (t: string) => (t === "deposit" ? "deposit" : t === "rental_payment" ? "rental_payment" : "adjustment");
const typeLabel = (t: string) => t.replace(/_/g, " ");
const amountColor = (n: number) => (n > 0 ? "var(--st-active-fg)" : n < 0 ? "var(--danger)" : "var(--muted)");
const money = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}$${Math.abs(n).toFixed(2)}`;

const typeBadge = (t: string): React.CSSProperties => {
  const g = typeGroup(t);
  const [bg, fg] = g === "deposit" ? ["var(--st-active-bg)", "var(--st-active-fg)"] : g === "rental_payment" ? ["var(--blue-chip-bg)", "var(--blue-chip-text)"] : ["var(--tag-bg)", "var(--tag-fg)"];
  return { font: `600 11px ${F_SANS}`, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap", background: bg, color: fg };
};
const methodBadge = (m: string): React.CSSProperties => {
  const [bg, fg] = m === "Stripe top-up" ? ["var(--blue-chip-bg)", "var(--blue-chip-text)"] : m === "USDC" ? ["var(--st-active-bg)", "var(--st-active-fg)"] : m === "Stripe card (direct)" ? ["var(--test-bg)", "var(--test-fg)"] : ["var(--tag-bg)", "var(--tag-fg)"];
  return { font: `600 9.5px ${F_SANS}`, letterSpacing: ".02em", padding: "2px 7px", borderRadius: 5, whiteSpace: "nowrap", flex: "none", background: bg, color: fg };
};

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayKey = (iso: string) => iso.slice(0, 10);
const dayLabel = (iso: string) => { const d = new Date(iso); return `${MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; };
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const GRID = "170px minmax(0,1fr) 160px 210px";

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeTest, setIncludeTest] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [sheetConfigured, setSheetConfigured] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/admin/transactions?includeTest=${includeTest ? "1" : "0"}`)
      .then((r) => r.json())
      .then((d) => { if (active) setTransactions(d.transactions || []); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [includeTest]);
  useEffect(() => {
    fetch("/api/admin/transactions/export-url").then((r) => r.json()).then((d) => { setSheetConfigured(!!d.configured); setSheetUrl(d.url || null); }).catch(() => setSheetConfigured(false));
  }, []);

  const copyFormula = () => { if (!sheetUrl) return; navigator.clipboard?.writeText(`=IMPORTDATA("${sheetUrl}")`); setCopied(true); setTimeout(() => setCopied(false), 1800); };

  const nums = useMemo(() => {
    const amt = (t: Transaction) => Number(t.amount);
    const revenue = transactions.filter((t) => amt(t) > 0).reduce((s, t) => s + amt(t), 0);
    const deposits = transactions.filter((t) => t.type === "deposit").reduce((s, t) => s + amt(t), 0);
    const walletSpend = transactions.filter((t) => t.type === "rental_payment" && amt(t) < 0).reduce((s, t) => s + Math.abs(amt(t)), 0);
    return { revenue, deposits, walletHeld: deposits - walletSpend, count: transactions.length };
  }, [transactions]);

  const counts = useMemo(() => ({
    all: transactions.length,
    deposit: transactions.filter((t) => t.type === "deposit").length,
    rental_payment: transactions.filter((t) => t.type === "rental_payment").length,
    adjustment: transactions.filter((t) => typeGroup(t.type) === "adjustment").length,
  }), [transactions]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = transactions.filter((t) => {
      if (typeFilter !== "all" && typeGroup(t.type) !== typeFilter) return false;
      if (!q) return true;
      return `${t.user.fullName} ${t.user.email} ${typeLabel(t.type)} ${txMethod(t)} ${t.description || ""} ${dayLabel(t.createdAt)}`.toLowerCase().includes(q);
    });
    const order: string[] = []; const map: Record<string, Transaction[]> = {};
    for (const t of filtered) { const k = dayKey(t.createdAt); if (!map[k]) { map[k] = []; order.push(k); } map[k].push(t); }
    return order.map((k) => {
      const rows = map[k];
      const byG: Record<string, number> = {};
      rows.forEach((t) => { byG[typeGroup(t.type)] = (byG[typeGroup(t.type)] || 0) + 1; });
      const pl = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
      const parts: string[] = [];
      if (byG.rental_payment) parts.push(pl(byG.rental_payment, "rental payment"));
      if (byG.deposit) parts.push(pl(byG.deposit, "deposit"));
      if (byG.adjustment) parts.push(pl(byG.adjustment, "adjustment"));
      return { key: k, date: dayLabel(rows[0].createdAt), rows, count: rows.length, breakdown: parts.join("  ·  "), dayRev: rows.filter((t) => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0) };
    });
  }, [transactions, typeFilter, query]);

  const toggleDay = (k: string) => setCollapsed((prev) => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const allCollapsed = groups.length > 0 && collapsed.size >= groups.length;
  const collapseAll = () => setCollapsed(allCollapsed ? new Set() : new Set(groups.map((g) => g.key)));

  const labelCss: React.CSSProperties = { font: `700 10px ${F_SANS}`, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--label)" };
  const seg = (active: boolean): React.CSSProperties => ({ font: `600 12.5px ${F_SANS}`, padding: "7px 15px", borderRadius: 7, cursor: "pointer", border: "none", background: active ? "var(--accent)" : "transparent", color: active ? "#fff" : "var(--muted)" });
  const chipStyle = (active: boolean, dot?: string): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 13px", borderRadius: 999, cursor: "pointer", font: `600 12.5px ${F_SANS}`, color: "var(--text)", border: "1px solid", borderColor: active ? "var(--chip-active-border)" : "var(--card-border)", background: active ? "var(--chip-active-bg)" : "transparent", ...(dot ? {} : {}) });

  const SummaryCard = ({ label, value, color, sub }: { label: string; value: string; color: string; sub: string }) => (
    <div style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 14, padding: "16px 18px", boxShadow: "var(--card-shadow)" }}>
      <div style={{ ...labelCss, fontSize: 10.5, marginBottom: 8 }}>{label}</div>
      <div style={{ font: `600 24px/1 ${F_GRO}`, color, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ font: `500 11.5px ${F_SANS}`, color: "var(--muted)", marginTop: 6 }}>{sub}</div>
    </div>
  );

  if (loading) return <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{[1, 2, 3].map((i) => <div key={i} style={{ height: 64, borderRadius: 14, background: "var(--card)", border: "1px solid var(--card-border)" }} />)}</div>;

  const CHIPS: [string, string, number, string | null][] = [["all", "All", counts.all, null], ["deposit", "Deposits", counts.deposit, "var(--st-active-fg)"], ["rental_payment", "Rental payments", counts.rental_payment, "var(--blue-chip-text)"], ["adjustment", "Adjustments", counts.adjustment, "var(--muted2)"]];

  return (
    <div>
      {/* title + toggle + sheets */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 22, flexWrap: "wrap" }}>
        <div style={{ maxWidth: 640 }}>
          <h1 style={{ font: `600 30px/1 ${F_GRO}`, color: "var(--text)", margin: "0 0 8px", letterSpacing: "-.02em" }}>Transactions</h1>
          <p style={{ font: `500 13.5px/1.5 ${F_SANS}`, color: "var(--muted)", margin: 0 }}>Money coming in from renters — deposits and rental payments. Ambassador payouts live under Ambassadors → Payouts.</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12, flex: "none" }}>
          <div style={{ display: "flex", background: "var(--seg-bg)", border: "1px solid var(--seg-border)", borderRadius: 10, padding: 3 }}>
            <button onClick={() => setIncludeTest(false)} style={seg(!includeTest)}>Live</button>
            <button onClick={() => setIncludeTest(true)} style={seg(includeTest)}>All (incl. test)</button>
          </div>
          {sheetConfigured && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--sheets-bg)", border: "1px solid var(--sheets-border)", padding: "6px 8px 6px 14px", borderRadius: 12 }}>
              <span style={{ font: `600 13px ${F_SANS}`, color: "var(--sheets-fg)" }}>Live Google Sheets</span>
              <button onClick={copyFormula} style={{ font: `600 12.5px ${F_SANS}`, color: "#fff", background: "var(--sheets-btn-bg)", border: "none", padding: "8px 14px", borderRadius: 9, cursor: "pointer", whiteSpace: "nowrap" }}>{copied ? "Copied ✓" : "Copy formula"}</button>
            </div>
          )}
        </div>
      </div>

      {/* summary strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
        <SummaryCard label="Revenue collected" value={`+$${nums.revenue.toFixed(2)}`} color="var(--st-active-fg)" sub="everything collected — top-ups + direct" />
        <SummaryCard label="Deposits / top-ups" value={`+$${nums.deposits.toFixed(2)}`} color="var(--accent)" sub="non-refundable wallet credit loaded" />
        <SummaryCard label="Unspent credit" value={`${nums.walletHeld < 0 ? "−$" : "$"}${Math.abs(nums.walletHeld).toFixed(2)}`} color="var(--text)" sub="loaded, not yet used on a rental" />
        <SummaryCard label="Transactions" value={String(nums.count)} color="var(--text)" sub="in this view" />
      </div>

      {/* toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {CHIPS.map(([val, lbl, n, dot]) => (
            <button key={val} onClick={() => setTypeFilter(val)} style={chipStyle(typeFilter === val)}>
              {dot && <span style={{ width: 7, height: 7, borderRadius: 999, background: dot }} />}
              {lbl}<span style={{ color: "var(--muted)" }}>{n}</span>
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button onClick={collapseAll} style={{ font: `600 12.5px ${F_SANS}`, color: "var(--subtab-fg)", background: "var(--input-bg)", border: "1px solid var(--input-border)", padding: "9px 14px", borderRadius: 9, cursor: "pointer", whiteSpace: "nowrap" }}>{allCollapsed ? "Expand all" : "Collapse all"}</button>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search renter, date, description or type…" style={{ width: 300, maxWidth: "50vw", background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: 9, padding: "9px 12px", font: `500 13px ${F_SANS}`, color: "var(--input-fg)", outline: "none" }} />
        </div>
      </div>

      {/* ledger */}
      <div style={{ background: "var(--panel)", border: "1px solid var(--panel-border)", borderRadius: 16, overflow: "hidden", boxShadow: "var(--panel-shadow)" }}>
        <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 18, padding: "12px 22px", borderBottom: "1px solid var(--divider)" }}>
          <span style={labelCss}>Type</span><span style={labelCss}>Detail</span><span style={{ ...labelCss, textAlign: "right" }}>Amount</span><span style={{ ...labelCss, textAlign: "right" }}>Time · Tx hash</span>
        </div>

        {transactions.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", font: `500 13px ${F_SANS}`, color: "var(--muted)" }}>No transactions yet.</div>
        ) : groups.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", font: `500 13px ${F_SANS}`, color: "var(--muted)" }}>No transactions match.</div>
        ) : groups.map((g) => {
          const isCollapsed = collapsed.has(g.key);
          return (
            <div key={g.key}>
              <div onClick={() => toggleDay(g.key)} style={{ display: "grid", gridTemplateColumns: GRID, gap: 18, alignItems: "center", padding: "12px 22px", background: "var(--band)", borderTop: "1px solid var(--divider)", cursor: "pointer", userSelect: "none" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <span style={{ font: `600 11px ${F_SANS}`, color: "var(--muted)", width: 12, textAlign: "center", transform: isCollapsed ? "none" : "rotate(90deg)", transition: "transform .18s" }}>▸</span>
                  <span style={{ font: `700 11px ${F_SANS}`, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--label)", whiteSpace: "nowrap" }}>{g.date}</span>
                </span>
                <span style={{ font: `500 12px ${F_SANS}`, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.breakdown}</span>
                <span style={{ font: `600 12.5px ${F_GRO}`, textAlign: "right", fontVariantNumeric: "tabular-nums", color: g.dayRev > 0 ? "var(--st-active-fg)" : "var(--muted2)" }}>{g.dayRev > 0 ? `+$${g.dayRev.toFixed(2)}` : "—"}</span>
                <span style={{ font: `500 11.5px ${F_SANS}`, color: "var(--label)", textAlign: "right" }}>{g.count} txns</span>
              </div>

              {!isCollapsed && g.rows.map((t) => {
                const amt = Number(t.amount);
                const method = txMethod(t);
                return (
                  <div key={t.id} style={{ display: "grid", gridTemplateColumns: GRID, gap: 18, alignItems: "center", padding: "14px 22px", borderTop: "1px solid var(--divider)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <span style={typeBadge(t.type)}>{typeLabel(t.type)}</span>
                      {t.user.isTest && <span style={{ font: `700 8.5px ${F_SANS}`, letterSpacing: ".05em", padding: "2px 5px", borderRadius: 4, background: "var(--test-bg)", color: "var(--test-fg)" }}>TEST</span>}
                    </div>
                    <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                      <span style={{ font: `500 13.5px ${F_SANS}`, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.description || "—"}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                        <span style={{ font: `500 12px ${F_SANS}`, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.user.fullName}  ·  {t.user.email}</span>
                        {method && <span style={methodBadge(method)}>{method}</span>}
                      </div>
                    </div>
                    <span style={{ font: `600 14.5px ${F_GRO}`, textAlign: "right", fontVariantNumeric: "tabular-nums", color: amountColor(amt) }}>{money(amt)}</span>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-end" }}>
                      <span style={{ font: `500 12px ${F_SANS}`, color: "var(--text2)", fontVariantNumeric: "tabular-nums" }}>{timeOf(t.createdAt)}</span>
                      {t.txHash ? <a href={t.txHash.startsWith("0x") ? `https://basescan.org/tx/${t.txHash}` : `https://tronscan.org/#/transaction/${t.txHash}`} target="_blank" rel="noopener noreferrer" style={{ font: `500 11px ${F_GRO}`, color: "var(--link)" }}>{t.txHash.slice(0, 12)}…</a> : <span style={{ font: `500 11px ${F_GRO}`, color: "var(--muted2)" }}>—</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
