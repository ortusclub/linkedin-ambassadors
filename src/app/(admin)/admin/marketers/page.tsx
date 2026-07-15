"use client";

import { useEffect, useMemo, useState } from "react";

// One field marketer's referral figures, derived from ambassador applications.
interface App {
  referredBy: string | null;
  status: string;
}

const F_SANS = "var(--font-sans),system-ui,sans-serif";
const F_GRO = "var(--font-grotesk),system-ui,sans-serif";

// ₱ per successful (accepted / on-inventory) signup a marketer drove.
const COMMISSION_PER_SIGNUP = 500;

// DB status -> display bucket (mirrors the Applications page).
const bucketOf = (s: string): string => {
  if (["pending", "reviewing", "contacted"].includes(s)) return "in_progress";
  if (s === "unreachable") return "no_response";
  if (s === "on_hold") return "in_progress";
  if (s === "approved" || s === "onboarded") return "accepted";
  if (s === "rejected") return "rejected";
  return "in_progress";
};

const peso = (n: number) => "₱" + n.toLocaleString("en-PH");

interface Row { name: string; total: number; inProgress: number; accepted: number; rejected: number; noResponse: number; }

export default function AdminMarketersPage() {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/ambassadors").then((r) => r.json()).then((d) => setApps(d.applications || [])).finally(() => setLoading(false));
  }, []);

  const rows = useMemo<Row[]>(() => {
    const m = new Map<string, Row>();
    for (const a of apps) {
      const name = (a.referredBy || "").trim();
      if (!name) continue;
      const r = m.get(name) || { name, total: 0, inProgress: 0, accepted: 0, rejected: 0, noResponse: 0 };
      r.total++;
      const b = bucketOf(a.status);
      if (b === "accepted") r.accepted++;
      else if (b === "rejected") r.rejected++;
      else if (b === "no_response") r.noResponse++;
      else r.inProgress++;
      m.set(name, r);
    }
    return [...m.values()].sort((x, y) => y.total - x.total || y.accepted - x.accepted || x.name.localeCompare(y.name));
  }, [apps]);

  const unattributed = useMemo(() => apps.filter((a) => !(a.referredBy || "").trim()).length, [apps]);
  const totals = useMemo(() => ({
    marketers: rows.length,
    referrals: rows.reduce((s, r) => s + r.total, 0),
    accepted: rows.reduce((s, r) => s + r.accepted, 0),
    commission: rows.reduce((s, r) => s + r.accepted, 0) * COMMISSION_PER_SIGNUP,
  }), [rows]);

  const labelCss: React.CSSProperties = { font: `600 10px ${F_SANS}`, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--label)" };
  const th: React.CSSProperties = { font: `600 10px ${F_SANS}`, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--label)", textAlign: "left", padding: "0 14px 10px" };
  const td: React.CSSProperties = { font: `500 13.5px ${F_SANS}`, color: "var(--text)", padding: "14px", borderTop: "1px solid var(--divider)" };

  if (loading) return <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{[1, 2].map((i) => <div key={i} style={{ height: 90, borderRadius: 16, background: "var(--card)", border: "1px solid var(--card-border)" }} />)}</div>;

  const tiles: { label: string; value: string; hint?: string }[] = [
    { label: "Marketers", value: String(totals.marketers) },
    { label: "Total referrals", value: String(totals.referrals), hint: unattributed ? `+${unattributed} organic` : undefined },
    { label: "Accepted (payable)", value: String(totals.accepted) },
    { label: "Est. commission owed", value: peso(totals.commission), hint: `₱${COMMISSION_PER_SIGNUP} × accepted` },
  ];

  return (
    <div>
      {/* title */}
      <div style={{ marginBottom: 20, maxWidth: 680 }}>
        <h1 style={{ font: `600 30px/1 ${F_GRO}`, color: "var(--text)", margin: "0 0 8px", letterSpacing: "-.02em" }}>Marketers</h1>
        <p style={{ font: `500 13.5px/1.5 ${F_SANS}`, color: "var(--muted)", margin: 0 }}>Referrals driven by each field marketer, and what they&apos;re owed. Commission is ₱{COMMISSION_PER_SIGNUP} per <strong>accepted</strong> signup (an account that made it onto inventory).</p>
      </div>

      {/* summary tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 22 }}>
        {tiles.map((t) => (
          <div key={t.label} style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 16, padding: "18px 20px", boxShadow: "var(--card-shadow)" }}>
            <div style={labelCss}>{t.label}</div>
            <div style={{ font: `600 26px ${F_GRO}`, color: "var(--text)", marginTop: 6, letterSpacing: "-.01em" }}>{t.value}</div>
            {t.hint && <div style={{ font: `500 11.5px ${F_SANS}`, color: "var(--muted)", marginTop: 3 }}>{t.hint}</div>}
          </div>
        ))}
      </div>

      {/* per-marketer table */}
      <div style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 16, padding: "18px 8px 8px", boxShadow: "var(--card-shadow)", overflowX: "auto" }}>
        {rows.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", font: `500 13.5px ${F_SANS}`, color: "var(--muted)" }}>No referred signups yet. They&apos;ll appear here as marketers&apos; QR / referral signups come in.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
            <thead>
              <tr>
                <th style={th}>Marketer</th>
                <th style={{ ...th, textAlign: "right" }}>Referrals</th>
                <th style={{ ...th, textAlign: "right" }}>In progress</th>
                <th style={{ ...th, textAlign: "right" }}>Accepted</th>
                <th style={{ ...th, textAlign: "right" }}>Est. commission</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name}>
                  <td style={{ ...td, fontWeight: 600 }}>{r.name}</td>
                  <td style={{ ...td, textAlign: "right" }}>{r.total}</td>
                  <td style={{ ...td, textAlign: "right", color: "var(--muted)" }}>{r.inProgress}</td>
                  <td style={{ ...td, textAlign: "right", color: "var(--st-active-fg)", fontWeight: 600 }}>{r.accepted}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{peso(r.accepted * COMMISSION_PER_SIGNUP)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
