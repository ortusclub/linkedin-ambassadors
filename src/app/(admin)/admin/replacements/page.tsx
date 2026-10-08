"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDate } from "@/lib/utils";

interface Replacement {
  id: string;
  at: string;
  renter: { id: string; name: string; email: string };
  original: { id: string; name: string; url: string | null } | null;
  restrictedAt: string | null;
  replacement: { id: string; name: string; url: string | null };
  replacementStatus: string;
}

const F_SANS = "var(--font-sans),system-ui,sans-serif";
const F_GRO = "var(--font-grotesk),system-ui,sans-serif";
const GRID = "1.3fr 132px 1.3fr 1.2fr 120px";

export default function AdminReplacementsPage() {
  const [rows, setRows] = useState<Replacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/admin/replacements")
      .then((r) => r.json())
      .then((d) => setRows(d.replacements || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      `${r.renter.name} ${r.renter.email} ${r.original?.name || ""} ${r.replacement.name}`.toLowerCase().includes(q)
    );
  }, [rows, query]);

  const labelCss: React.CSSProperties = { font: `700 10px ${F_SANS}`, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--label)" };

  if (loading) return <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{[1, 2, 3].map((i) => <div key={i} style={{ height: 60, borderRadius: 14, background: "var(--card)", border: "1px solid var(--card-border)" }} />)}</div>;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ font: `600 30px/1 ${F_GRO}`, color: "var(--text)", margin: "0 0 8px", letterSpacing: "-.02em" }}>Replacements</h1>
        <p style={{ font: `500 13.5px/1.5 ${F_SANS}`, color: "var(--muted)", margin: 0, maxWidth: 680 }}>Self-serve swaps: when a renter&apos;s account got restricted and couldn&apos;t be recovered in time, they replaced it with an equivalent available account. The original stays linked so account counts stay honest.</p>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ font: `600 22px ${F_GRO}`, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{rows.length}</span>
          <span style={{ font: `600 12px ${F_SANS}`, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--label)" }}>replacements</span>
        </span>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search renter or account…"
          style={{ width: 300, maxWidth: "50vw", background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: 9, padding: "9px 12px", font: `500 13px ${F_SANS}`, color: "var(--input-fg)", outline: "none" }} />
      </div>

      <div style={{ background: "var(--panel)", border: "1px solid var(--panel-border)", borderRadius: 16, overflow: "hidden", boxShadow: "var(--panel-shadow)" }}>
        <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 16, padding: "13px 22px", borderBottom: "1px solid var(--divider)" }}>
          <span style={labelCss}>Original (restricted)</span><span style={labelCss}>Restricted</span><span style={labelCss}>Replaced with</span><span style={labelCss}>Renter</span><span style={labelCss}>When</span>
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: "30px", textAlign: "center", font: `500 13px ${F_SANS}`, color: "var(--muted)" }}>{rows.length === 0 ? "No replacements yet." : "No replacements match."}</div>
        ) : filtered.map((r) => (
          <div key={r.id} style={{ display: "grid", gridTemplateColumns: GRID, gap: 16, alignItems: "center", padding: "15px 22px", borderBottom: "1px solid var(--divider)" }}>
            <div style={{ minWidth: 0 }}>
              {r.original?.url
                ? <a href={r.original.url} target="_blank" rel="noopener noreferrer" style={{ font: `600 13.5px ${F_SANS}`, color: "var(--link)", textDecoration: "none" }}>{r.original.name}</a>
                : <span style={{ font: `600 13.5px ${F_SANS}`, color: "var(--text)" }}>{r.original?.name || "—"}</span>}
            </div>
            <span style={{ font: `500 12.5px ${F_SANS}`, color: "var(--text2)" }}>{r.restrictedAt ? formatDate(r.restrictedAt) : "—"}</span>
            <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
              {r.replacement.url
                ? <a href={r.replacement.url} target="_blank" rel="noopener noreferrer" style={{ font: `600 13.5px ${F_SANS}`, color: "var(--link)", textDecoration: "none" }}>{r.replacement.name}</a>
                : <span style={{ font: `600 13.5px ${F_SANS}`, color: "var(--text)" }}>{r.replacement.name}</span>}
              <span style={{ font: `600 10px ${F_SANS}`, letterSpacing: ".03em", textTransform: "uppercase", color: r.replacementStatus === "active" ? "var(--st-active-fg)" : "var(--muted)" }}>{r.replacementStatus.replace("_", " ")}</span>
            </div>
            <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ font: `600 13px ${F_SANS}`, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.renter.name}</span>
              <span style={{ font: `500 11.5px ${F_SANS}`, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.renter.email}</span>
            </div>
            <span style={{ font: `500 12.5px ${F_SANS}`, color: "var(--text2)" }}>{formatDate(r.at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
