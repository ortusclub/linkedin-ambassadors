"use client";

import { useEffect, useMemo, useState } from "react";

// A single ambassador application, reduced to what the referral roll-up needs.
interface App {
  referredBy: string | null;
  status: string;
}

const F_SANS = "var(--font-sans),system-ui,sans-serif";
const F_GRO = "var(--font-grotesk),system-ui,sans-serif";

// ₱ per converted (accepted / on-inventory) signup.
const RATE = 500;
// A referrer is "top" once this many of their signups convert.
const TOP_THRESHOLD = 5;

// DB status -> "converted" means the account made it onto inventory.
const isConverted = (s: string) => s === "approved" || s === "onboarded";

const peso = (n: number) => "₱" + n.toLocaleString("en-US");
const initialsOf = (name: string) => { const p = (name || "?").trim().split(/\s+/); return (p.length > 1 ? p[0][0] + p[1][0] : name.slice(0, 2)).toUpperCase() || "?"; };

interface Row {
  name: string; initials: string; signups: number; converted: number;
  isTop: boolean; active: boolean; convRate: string; earned: number; owed: number;
}

const CHIPS: [string, string, string | null][] = [
  ["all", "All", null],
  ["top", "Top performers", "var(--green)"],
  ["owed", "Has unpaid", "var(--warn-num)"],
  ["inactive", "Inactive", "var(--muted2)"],
];

export default function AdminReferralsPage() {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState("all");
  const [query, setQuery] = useState("");
  const [nextMonday, setNextMonday] = useState("");

  useEffect(() => {
    fetch("/api/admin/ambassadors").then((r) => r.json()).then((d) => setApps(d.applications || [])).finally(() => setLoading(false));
    // Next Monday label (client-only to avoid hydration mismatch).
    const d = new Date();
    d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
    setNextMonday(d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }));
  }, []);

  const rows = useMemo<Row[]>(() => {
    const m = new Map<string, { name: string; signups: number; converted: number }>();
    for (const a of apps) {
      const name = (a.referredBy || "").trim();
      if (!name) continue;
      const r = m.get(name) || { name, signups: 0, converted: 0 };
      r.signups++;
      if (isConverted(a.status)) r.converted++;
      m.set(name, r);
    }
    return [...m.values()]
      .map((r) => ({
        name: r.name,
        initials: initialsOf(r.name),
        signups: r.signups,
        converted: r.converted,
        isTop: r.converted >= TOP_THRESHOLD,
        active: r.converted > 0,
        convRate: r.signups > 0 ? Math.round((r.converted / r.signups) * 100) + "%" : "—",
        earned: r.converted * RATE,     // Phase 2 will split earned into paid vs owed
        owed: r.converted * RATE,       // Phase 1: nothing paid yet, so all owed
      }))
      .sort((a, b) => b.signups - a.signups || b.converted - a.converted || a.name.localeCompare(b.name));
  }, [apps]);

  const chart = useMemo(() => {
    const withSignups = rows.filter((r) => r.signups > 0);
    const max = Math.max(1, ...withSignups.map((r) => r.signups));
    return [...withSignups].sort((a, b) => b.signups - a.signups).map((r) => ({ name: r.name, signups: r.signups, pct: Math.round((r.signups / max) * 100) }));
  }, [rows]);

  const tierOf = (r: Row) => {
    const t = ["all"];
    if (r.isTop) t.push("top");
    if (r.owed > 0) t.push("owed");
    if (!r.active) t.push("inactive");
    return t;
  };
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length, top: 0, owed: 0, inactive: 0 };
    for (const r of rows) { if (r.isTop) c.top++; if (r.owed > 0) c.owed++; if (!r.active) c.inactive++; }
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => (tier === "all" || tierOf(r).includes(tier)) && (!q || r.name.toLowerCase().includes(q)));
  }, [rows, tier, query]);

  const totals = useMemo(() => ({
    active: rows.filter((r) => r.signups > 0).length,
    signups: rows.reduce((s, r) => s + r.signups, 0),
    converted: rows.reduce((s, r) => s + r.converted, 0),
    owed: rows.reduce((s, r) => s + r.owed, 0),
  }), [rows]);

  const label: React.CSSProperties = { font: `700 10.5px ${F_SANS}`, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--label)" };
  const th: React.CSSProperties = { font: `700 10px ${F_SANS}`, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--label)" };
  const chip = (active: boolean): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 13px", borderRadius: 999, cursor: "pointer", font: `600 12.5px ${F_SANS}`, color: "var(--text)", border: "1px solid", borderColor: active ? "var(--chip-active-border)" : "var(--card-border)", background: active ? "var(--chip-active-bg)" : "transparent" });
  const tile = (labelText: string, value: string, valueColor: string, sub: string) => (
    <div style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 14, padding: "16px 18px", boxShadow: "var(--card-shadow)" }}>
      <div style={{ ...label, marginBottom: 8 }}>{labelText}</div>
      <div style={{ font: `600 24px/1 ${F_GRO}`, color: valueColor, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ font: `500 11.5px ${F_SANS}`, color: "var(--muted)", marginTop: 6 }}>{sub}</div>
    </div>
  );

  if (loading) return <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{[1, 2].map((i) => <div key={i} style={{ height: 90, borderRadius: 16, background: "var(--card)", border: "1px solid var(--card-border)" }} />)}</div>;

  return (
    <div>
      {/* title */}
      <div style={{ marginBottom: 22, maxWidth: 660 }}>
        <h1 style={{ font: `600 30px/1 ${F_GRO}`, color: "var(--text)", margin: "0 0 8px", letterSpacing: "-.02em" }}>Referrals</h1>
        <p style={{ font: `500 13.5px/1.5 ${F_SANS}`, color: "var(--muted)", margin: 0 }}>Who&apos;s bringing in new ambassador signups. Track referral volume, see how many convert into inventory, spot your top performers to re-invite, and see commissions owed — ₱{RATE} per converted signup.</p>
      </div>

      {/* summary strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginBottom: 22 }}>
        {tile("Active referrers", String(totals.active), "var(--text)", "brought ≥1 signup")}
        {tile("Total signups", String(totals.signups), "var(--accent)", `${totals.converted} converted to inventory`)}
        {tile("Commission owed", peso(totals.owed), "var(--warn-num)", `${peso(totals.owed)} ready · ₱0 held`)}
        {tile("Paid to date", "₱0", "var(--green)", "payout tracking — coming soon")}
      </div>

      {/* payout schedule banner */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--band)", border: "1px solid var(--card-border)", borderRadius: 12, padding: "12px 16px", marginBottom: 22, flexWrap: "wrap" }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--accent)", flex: "none" }} />
        <span style={{ font: `600 12.5px ${F_SANS}`, color: "var(--text2)" }}>Payouts run every Monday.</span>
        <span style={{ font: `500 12.5px ${F_SANS}`, color: "var(--muted)" }}>A commission releases 3 days after conversion; if that lands on a weekend it rolls to the next Monday.</span>
        {nextMonday && <span style={{ marginLeft: "auto", font: `600 12px ${F_SANS}`, color: "var(--accent)", whiteSpace: "nowrap" }}>Next payout · {nextMonday}</span>}
      </div>

      {/* leaderboard */}
      <div style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 16, padding: "20px 22px", marginBottom: 22, boxShadow: "var(--card-shadow)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={{ font: `700 13.5px ${F_SANS}`, color: "var(--text)" }}>Signups by referrer</span>
          <span style={{ font: `500 11.5px ${F_SANS}`, color: "var(--muted2)" }}>all time</span>
        </div>
        {chart.length === 0 ? (
          <div style={{ padding: 16, font: `500 13px ${F_SANS}`, color: "var(--muted)" }}>No referred signups yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            {chart.map((c) => (
              <div key={c.name} style={{ display: "grid", gridTemplateColumns: "150px 1fr 96px", gap: 14, alignItems: "center" }}>
                <span style={{ font: `600 13px ${F_SANS}`, color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                <div style={{ height: 22, background: "var(--track)", borderRadius: 7, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${c.pct}%`, minWidth: 6, borderRadius: 7, backgroundImage: "linear-gradient(90deg, var(--accent), var(--green))" }} />
                </div>
                <span style={{ font: `600 13px ${F_GRO}`, color: "var(--text)", fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{c.signups} <span style={{ font: `500 11px ${F_SANS}`, color: "var(--muted2)" }}>signups</span></span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {CHIPS.map(([key, lbl, dot]) => (
            <button key={key} onClick={() => setTier(key)} style={chip(tier === key)}>
              {dot && <span style={{ width: 7, height: 7, borderRadius: 999, background: dot }} />}
              {lbl}<span style={{ color: "var(--muted)" }}>{counts[key] ?? 0}</span>
            </button>
          ))}
        </div>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search referrer…" style={{ width: 300, maxWidth: "100%", background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: 9, padding: "9px 12px", font: `500 13px ${F_SANS}`, color: "var(--input-fg)", outline: "none" }} />
      </div>

      {/* referrer list */}
      <div style={{ background: "var(--panel)", border: "1px solid var(--panel-border)", borderRadius: 16, overflow: "hidden", boxShadow: "var(--panel-shadow)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 100px 120px 110px 140px 120px", gap: 14, padding: "13px 22px", borderBottom: "1px solid var(--divider)" }}>
          <span style={th}>Referrer</span>
          <span style={{ ...th, textAlign: "right" }}>Signups</span>
          <span style={{ ...th, textAlign: "right" }}>Converted</span>
          <span style={{ ...th, textAlign: "right" }}>Earned</span>
          <span style={{ ...th, textAlign: "right" }}>Owed</span>
          <span style={{ ...th, textAlign: "right" }}>Action</span>
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: 44, textAlign: "center", font: `500 13.5px ${F_SANS}`, color: "var(--muted)" }}>No referrers match.</div>
        ) : filtered.map((r) => (
          <div key={r.name} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 100px 120px 110px 140px 120px", gap: 14, alignItems: "center", padding: "15px 22px", borderBottom: "1px solid var(--divider)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", font: `600 14px ${F_GRO}`, background: "var(--avatar-bg)", color: "var(--avatar-fg)" }}>{r.initials}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span style={{ font: `600 14px ${F_SANS}`, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                {r.isTop && <span style={{ font: `700 9.5px ${F_SANS}`, padding: "2px 7px", borderRadius: 5, whiteSpace: "nowrap", background: "var(--st-active-bg)", color: "var(--st-active-fg)" }}>★ Top</span>}
                {!r.active && <span style={{ font: `600 9.5px ${F_SANS}`, padding: "2px 7px", borderRadius: 5, whiteSpace: "nowrap", background: "var(--neutral-chip-bg)", color: "var(--neutral-chip-text)" }}>Inactive</span>}
              </div>
            </div>
            <div style={{ textAlign: "right" }}><span style={{ font: `600 17px ${F_GRO}`, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{r.signups}</span></div>
            <div style={{ textAlign: "right" }}>
              <span style={{ font: `600 17px ${F_GRO}`, color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>{r.converted}</span>
              <span style={{ font: `500 10.5px ${F_SANS}`, color: "var(--muted2)", display: "block" }}>{r.convRate}</span>
            </div>
            <div style={{ textAlign: "right" }}><span style={{ font: `600 14px ${F_GRO}`, color: "var(--text2)", fontVariantNumeric: "tabular-nums" }}>{peso(r.earned)}</span></div>
            <div style={{ textAlign: "right" }}>
              <span style={{ font: `600 14px ${F_GRO}`, fontVariantNumeric: "tabular-nums", color: r.owed > 0 ? "var(--warn-num)" : "var(--muted2)" }}>{peso(r.owed)}</span>
              <span style={{ font: `500 10.5px ${F_SANS}`, display: "block", color: r.owed > 0 ? "var(--green)" : "var(--muted2)" }}>{r.owed > 0 ? "ready to pay" : "all settled"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button disabled title="Payout tracking coming soon" style={{ font: `600 12px ${F_SANS}`, color: "var(--muted2)", background: "transparent", border: "1px solid var(--btn-secondary-border)", padding: "7px 14px", borderRadius: 8, cursor: "default", whiteSpace: "nowrap", opacity: 0.85 }}>{r.owed > 0 ? "Pay · soon" : "Settled"}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
