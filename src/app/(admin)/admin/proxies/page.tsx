"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const F_SANS = "var(--font-sans),system-ui,sans-serif";
const F_GRO = "var(--font-grotesk),system-ui,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,Menlo,monospace";

const NA_COUNTRY = "Unassigned";
const PROVIDER_SUGGESTIONS = ["Proxy 6", "proxy-cheap", "IPRoyal", "Bright Data", "Oxylabs"];
const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "—" },
  { value: "residential", label: "Residential" },
  { value: "datacenter", label: "Datacenter" },
];
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Auto" },
  { value: "active", label: "Active" },
  { value: "error", label: "Error" },
  { value: "retired", label: "Retired" },
];

const TYPE_META: Record<string, { bg: string; fg: string; label: string }> = {
  residential: { bg: "var(--st-active-bg)", fg: "var(--st-active-fg)", label: "Residential" },
  datacenter: { bg: "var(--blue-chip-bg)", fg: "var(--blue-chip-text)", label: "Datacenter" },
};

interface ProxyRow {
  host: string;
  port: number;
  proxyString: string;
  label: string | null;
  provider: string | null;
  type: string | null;
  country: string | null;
  status: string | null;
  notes: string | null;
  hasRow: boolean;
  accounts: string[];
  accountCount: number;
}

const inputCss: React.CSSProperties = {
  width: "100%", minWidth: 0, background: "var(--input-bg)", border: "1px solid var(--input-border)",
  borderRadius: 8, padding: "7px 9px", font: `500 12.5px ${F_SANS}`, color: "var(--input-fg)", outline: "none",
};
const darkBtn: React.CSSProperties = {
  font: `600 12.5px ${F_SANS}`, color: "#fff", background: "var(--sheets-btn-bg)", border: "none",
  padding: "9px 15px", borderRadius: 9, cursor: "pointer", whiteSpace: "nowrap",
};

// Save-on-blur text field, uncontrolled so it never remounts mid-edit.
function Editable({ initial, onSave, placeholder, mono, list }: {
  initial: string | null; onSave: (v: string | null) => void; placeholder?: string; mono?: boolean; list?: string;
}) {
  return (
    <input
      defaultValue={initial ?? ""}
      placeholder={placeholder}
      list={list}
      onBlur={(e) => { const v = e.target.value.trim(); if (v !== (initial ?? "")) onSave(v || null); }}
      style={{ ...inputCss, fontFamily: mono ? MONO : undefined }}
    />
  );
}

function CopyBtn({ value, small }: { value: string; small?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button"
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
      style={{ flex: "none", font: `600 ${small ? 11 : 12}px ${F_SANS}`, color: "var(--muted)", background: "transparent", border: "none", cursor: "pointer", padding: "0 4px" }}
      title="Copy">{copied ? "✓" : "Copy"}</button>
  );
}

export default function AdminProxiesPage() {
  const [proxies, setProxies] = useState<ProxyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [sheetCopied, setSheetCopied] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    return fetch("/api/admin/proxies")
      .then((r) => r.json())
      .then((d) => setProxies(d.proxies || []))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch("/api/admin/proxies/export-url").then((r) => r.json())
      .then((d) => { if (d.configured) setSheetUrl(d.url); }).catch(() => {});
  }, []);

  const copySheetFormula = () => {
    if (!sheetUrl) return;
    navigator.clipboard.writeText(`=IMPORTDATA("${sheetUrl}")`);
    setSheetCopied(true);
    setTimeout(() => setSheetCopied(false), 2000);
  };

  const patchProxy = async (host: string, port: number, data: Record<string, unknown>) => {
    await fetch("/api/admin/proxies", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host, port, ...data }),
    });
    load();
  };

  const q = query.trim().toLowerCase();
  const shown = useMemo(() => proxies.filter((p) =>
    !q || `${p.proxyString} ${p.country || ""} ${p.label || ""} ${p.provider || ""} ${p.type || ""} ${p.accounts.join(" ")}`.toLowerCase().includes(q)
  ), [proxies, q]);

  // Group by country, then sub-group by provider within each country — preserving
  // the server's sort (Unassigned country / Untagged provider sink to the bottom).
  const groups = useMemo(() => {
    const order: string[] = [];
    const byCountry = new Map<string, ProxyRow[]>();
    for (const p of shown) {
      const c = p.country || NA_COUNTRY;
      if (!byCountry.has(c)) { byCountry.set(c, []); order.push(c); }
      byCountry.get(c)!.push(p);
    }
    return order.map((c) => {
      const rows = byCountry.get(c)!;
      const pOrder: string[] = [];
      const byProvider = new Map<string, ProxyRow[]>();
      for (const p of rows) {
        const key = p.provider || "Untagged";
        if (!byProvider.has(key)) { byProvider.set(key, []); pOrder.push(key); }
        byProvider.get(key)!.push(p);
      }
      const providers = pOrder.map((pv) => {
        const pr = byProvider.get(pv)!;
        // Type shown on the sub-band only when the whole provider group agrees.
        const types = new Set(pr.map((x) => x.type).filter(Boolean));
        const type = types.size === 1 ? [...types][0]! : null;
        return { provider: pv, tagged: pv !== "Untagged", type, rows: pr };
      });
      return { country: c, rows, providers };
    });
  }, [shown]);

  const totalLinked = proxies.reduce((s, p) => s + p.accountCount, 0);
  const untyped = proxies.filter((p) => !p.type).length;

  const GRID = "minmax(230px,1.4fr) 120px 116px 132px minmax(180px,1.6fr) 64px 108px";

  return (
    <div>
      {/* title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ maxWidth: 720 }}>
          <h1 style={{ font: `600 30px/1 ${F_GRO}`, color: "var(--text)", margin: "0 0 8px", letterSpacing: "-.02em" }}>Proxies</h1>
          <p style={{ font: `500 13.5px/1.5 ${F_SANS}`, color: "var(--muted)", margin: 0 }}>
            Every proxy in use, joined live from the accounts assigned to it. Country, linked accounts and count are derived automatically; set the provider, residential/datacenter type and friendly label per proxy. The Google Sheet mirrors this view via the link on the right.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flex: "none" }}>
          {sheetUrl && (
            <button type="button" onClick={copySheetFormula}
              title="Paste into cell A1 of a blank Google Sheet tab to mirror this view live (auto-syncs, no manual export)"
              style={{ ...darkBtn, display: "inline-flex", alignItems: "center", gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
              {sheetCopied ? "Copied ✓" : "Copy Sheets link"}
            </button>
          )}
          <div style={{ textAlign: "right" }}>
            <div style={{ font: `600 13px ${F_SANS}`, color: "var(--muted)" }}>{proxies.length} prox{proxies.length !== 1 ? "ies" : "y"} · {totalLinked} account{totalLinked !== 1 ? "s" : ""}</div>
            {untyped > 0 && <div style={{ font: `600 13px ${F_SANS}`, color: "var(--warn-badge-text)", marginTop: 2 }}>{untyped} untyped</div>}
          </div>
        </div>
      </div>

      {/* search */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search proxy, country, name, provider or account…" style={{ ...inputCss, flex: 1, minWidth: 220, padding: "10px 13px", fontSize: 13 }} />
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{[1, 2, 3].map((i) => <div key={i} style={{ height: 64, borderRadius: 14, background: "var(--card)", border: "1px solid var(--card-border)" }} />)}</div>
      ) : shown.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 16, font: `500 13.5px ${F_SANS}`, color: "var(--muted)" }}>
          {proxies.length === 0 ? "No proxies found — assign a proxy to an account and it appears here." : "No proxies match your search."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          {groups.map((g) => (
            <div key={g.country}>
              {/* group header */}
              <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "0 4px 11px", borderBottom: "1px solid var(--divider)", marginBottom: 12 }}>
                <span style={{ font: `600 15px ${F_GRO}`, color: g.country === NA_COUNTRY ? "var(--muted)" : "var(--text)" }}>{g.country}</span>
                <span style={{ font: `700 11px ${F_GRO}`, fontVariantNumeric: "tabular-nums", padding: "2px 8px", borderRadius: 7, background: "var(--band)", color: "var(--muted)" }}>{g.rows.length}</span>
              </div>

              {/* column header */}
              <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 12, padding: "0 14px 8px", font: `700 9.5px ${F_SANS}`, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--label)" }}>
                <span>Proxy</span><span>Name</span><span>Provider</span><span>Type</span><span>LinkedIn accounts</span><span style={{ textAlign: "center" }}>#</span><span>Status</span>
              </div>

              {g.providers.map((pv) => {
                const pvTypeMeta = pv.type ? TYPE_META[pv.type] : null;
                return (
                  <div key={pv.provider} style={{ marginBottom: 14 }}>
                    {/* provider sub-band */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 14px 7px" }}>
                      <span style={{ width: 6, height: 6, borderRadius: 999, flex: "none", background: pvTypeMeta ? pvTypeMeta.fg : "var(--muted2)" }} />
                      <span style={{ font: `600 12.5px ${F_SANS}`, color: pv.tagged ? "var(--text)" : "var(--muted)" }}>{pv.provider}</span>
                      {pvTypeMeta && (
                        <span style={{ font: `600 10px ${F_SANS}`, letterSpacing: ".04em", textTransform: "uppercase", padding: "2px 7px", borderRadius: 6, background: pvTypeMeta.bg, color: pvTypeMeta.fg }}>{pvTypeMeta.label}</span>
                      )}
                      <span style={{ font: `700 10.5px ${F_GRO}`, fontVariantNumeric: "tabular-nums", padding: "1px 7px", borderRadius: 6, background: "var(--band)", color: "var(--muted)" }}>{pv.rows.length}</span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {pv.rows.map((p) => {
                        const key = `${p.host}:${p.port}`;
                        const tMeta = p.type ? TYPE_META[p.type] : null;
                        const dead = p.status === "error" || p.status === "retired";
                        return (
                          <div key={key} style={{ display: "grid", gridTemplateColumns: GRID, gap: 12, alignItems: "center", background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 12, padding: "10px 14px", boxShadow: "var(--card-shadow)", opacity: dead ? 0.72 : 1 }}>
                            {/* proxy string */}
                            <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
                              <span title={p.proxyString} style={{ font: `500 12px ${MONO}`, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.proxyString}</span>
                              <CopyBtn value={p.proxyString} small />
                            </div>
                            {/* label */}
                            <Editable initial={p.label} placeholder="e.g. Germany 01" onSave={(v) => patchProxy(p.host, p.port, { label: v })} />
                            {/* provider (free text w/ suggestions) */}
                            <Editable initial={p.provider} placeholder="Provider" list="proxy-providers" onSave={(v) => patchProxy(p.host, p.port, { provider: v })} />
                            {/* type */}
                            <select value={p.type || ""} onChange={(e) => patchProxy(p.host, p.port, { type: e.target.value })}
                              style={{ ...inputCss, cursor: "pointer", fontWeight: 600, color: tMeta ? tMeta.fg : "var(--muted)" }}>
                              {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                            {/* accounts */}
                            <div style={{ minWidth: 0 }}>
                              {p.accountCount === 0 ? (
                                <span style={{ font: `500 12px ${F_SANS}`, color: "var(--muted2)", fontStyle: "italic" }}>no accounts</span>
                              ) : (
                                <div title={p.accounts.join(", ")} style={{ font: `500 12px ${F_SANS}`, color: "var(--muted)", display: "flex", flexDirection: "column", gap: 1, wordBreak: "break-word" }}>{p.accounts.map((a) => <span key={a}>{a}</span>)}</div>
                              )}
                            </div>
                            {/* count */}
                            <span style={{ textAlign: "center", font: `700 13px ${F_GRO}`, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{p.accountCount}</span>
                            {/* status */}
                            <select value={p.status || ""} onChange={(e) => patchProxy(p.host, p.port, { status: e.target.value })}
                              style={{ ...inputCss, cursor: "pointer", fontWeight: 600, color: dead ? "var(--st-cancel-fg)" : "var(--muted)" }}>
                              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* datalist for provider suggestions */}
      <datalist id="proxy-providers">{PROVIDER_SUGGESTIONS.map((p) => <option key={p} value={p} />)}</datalist>
    </div>
  );
}
