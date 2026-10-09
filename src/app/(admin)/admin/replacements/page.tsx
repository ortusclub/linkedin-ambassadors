"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDate } from "@/lib/utils";

const F_SANS = "var(--font-sans),system-ui,sans-serif";
const F_GRO = "var(--font-grotesk),system-ui,sans-serif";

// "in ↗" badge linking to the account's LinkedIn profile (hidden when there's no URL).
function LiBadge({ url }: { url: string | null }) {
  const [h, setH] = useState(false);
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" title="View LinkedIn profile"
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ flex: "none", display: "inline-flex", alignItems: "center", gap: 2, padding: "2px 7px", borderRadius: 7, background: h ? "#0a66c2" : "#e8f0fe", color: h ? "#fff" : "#0a66c2", fontWeight: 800, fontSize: 11.5, lineHeight: 1.2, textDecoration: "none" }}>
      in <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}><path d="M2.5 7.5L7.5 2.5M3.5 2.5h4v4" /></svg>
    </a>
  );
}

type Status = "recovering" | "failed" | "permanent" | "waiting" | "handover" | "origBack" | "recovered" | "done" | "relisted" | "retired";

interface Case {
  id: string;
  status: Status;
  tab: "needs" | "progress" | "closed";
  original: { name: string; url: string | null; restrictedAt: string | null; price: number } | null;
  replacement: { name: string; url: string | null; price: number; diff: number } | null;
  renter: { name: string; email: string; internal: boolean };
  hoursRestricted?: number;
  swappedAt?: string;
  recoveredAt?: string;
  creditedDays?: number;
  restrictedAccountId?: string;
  newRentalId?: string;
  relistAccountId?: string | null;
}

const SMETA: Record<Status, { label: string; bg: string; fg: string }> = {
  recovering: { label: "Recovering", bg: "#fff1e6", fg: "#c2410c" },
  failed: { label: "Couldn't recover", bg: "#fdecec", fg: "#b91c1c" },
  permanent: { label: "Permanently restricted", bg: "#fdecec", fg: "#b91c1c" },
  waiting: { label: "Renter waiting", bg: "#fff7ed", fg: "#9a3412" },
  handover: { label: "Hand over", bg: "#e8f0fe", fg: "#0A66C2" },
  origBack: { label: "Original back", bg: "#fef3c7", fg: "#b45309" },
  recovered: { label: "Recovered", bg: "#e7f7ee", fg: "#0f7a3d" },
  done: { label: "Replaced", bg: "#f1f3f6", fg: "#5b6779" },
  relisted: { label: "Original relisted", bg: "#f1f3f6", fg: "#5b6779" },
  retired: { label: "Original retired", bg: "#f1f3f6", fg: "#5b6779" },
};

const GRID = "minmax(0,2.3fr) minmax(0,1.3fr) minmax(0,1.6fr) 170px";
const fmt = (d?: string | null) => (d ? formatDate(d) : "—");

export default function AdminReplacementsPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"needs" | "progress" | "closed" | "all">("needs");
  const [query, setQuery] = useState("");
  const [client, setClient] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const refresh = () => fetch("/api/admin/replacements").then((r) => r.json()).then((d) => setCases(d.cases || [])).catch(() => {});
  useEffect(() => { refresh().finally(() => setLoading(false)); }, []);

  const flash = (t: string) => { setToast(t); setTimeout(() => setToast(""), 2200); };

  const act = async (key: string, url: string, body: object, msg: string) => {
    setBusy(key);
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); flash(d.error || "That didn't work."); return; }
      await refresh();
      flash(msg);
    } catch { flash("That didn't work."); }
    finally { setBusy(null); }
  };

  const inClient = (c: Case) => !client || c.renter.email === client;
  const matchesQuery = (c: Case) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return `${c.renter.name} ${c.renter.email} ${c.original?.name || ""} ${c.replacement?.name || ""}`.toLowerCase().includes(q);
  };

  const tabCount = (t: "needs" | "progress" | "closed" | "all") => cases.filter((c) => inClient(c) && (t === "all" || c.tab === t)).length;

  const clients = useMemo(() => {
    const m = new Map<string, { email: string; label: string; internal: boolean; n: number; hot: number }>();
    for (const c of cases) {
      const e = c.renter.email;
      let row = m.get(e);
      if (!row) { row = { email: e, label: c.renter.internal ? e.split("@")[1] || e : c.renter.name, internal: c.renter.internal, n: 0, hot: 0 }; m.set(e, row); }
      row.n++;
      if (c.tab === "needs") row.hot++;
    }
    return [...m.values()].sort((a, b) => b.hot - a.hot || b.n - a.n);
  }, [cases]);

  const rows = cases.filter((c) => inClient(c) && (tab === "all" || c.tab === tab) && matchesQuery(c));

  const TABS: [typeof tab, string][] = [["needs", "Needs you"], ["progress", "In recovery"], ["closed", "Closed"], ["all", "All"]];

  const subLine = (c: Case): string => {
    switch (c.status) {
      case "recovering": return `Replace unlocks in ${Math.max(0, 48 - (c.hoursRestricted || 0))}h · billing paused`;
      case "failed": return `Renter can replace now · ${Math.round((c.hoursRestricted || 0) / 24)} days paused`;
      case "permanent": return "Can't recover · renter must replace";
      case "waiting": return "Chose to wait · billing paused";
      case "handover": return `Picked ${fmt(c.swappedAt)} · share GoLogin access`;
      case "origBack": return `${c.original?.name || "The original"} came back after the swap`;
      case "recovered": return `Back ${fmt(c.recoveredAt)}${c.creditedDays ? ` · ${c.creditedDays} days added` : ""}`;
      default: return `Swapped ${fmt(c.swappedAt)}`;
    }
  };

  const nameLink = (name: string, url: string | null, strong = true) =>
    url ? <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, fontSize: strong ? 14 : 13, color: "var(--link)", textDecoration: "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</a>
        : <span style={{ fontWeight: 700, fontSize: strong ? 14 : 13, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>;

  const ActionBtn = ({ c }: { c: Case }) => {
    const base: React.CSSProperties = { width: 150, borderRadius: 9, padding: "8px 0", fontWeight: 700, fontSize: 12.5, fontFamily: F_SANS, cursor: "pointer", whiteSpace: "nowrap", opacity: busy === c.id ? 0.6 : 1 };
    const mark = (primary: boolean) => (
      <button disabled={busy === c.id} onClick={() => act(c.id, `/api/admin/accounts/${c.restrictedAccountId}/restricted`, { restricted: false }, `${c.original?.name || "Account"} recovered`)}
        style={{ ...base, ...(primary ? { border: "none", background: "#12a150", color: "#fff" } : { border: "1px solid var(--btn-secondary-border, #d5dbe5)", background: "var(--btn-secondary-bg, #fff)", color: "var(--btn-secondary-fg, #0b1220)" }) }}>Mark recovered</button>
    );
    if (c.status === "recovering" || c.status === "failed") return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
        {mark(false)}
        <button disabled={busy === c.id} onClick={() => act(c.id, "/api/admin/replacements", { action: "permanent", accountId: c.restrictedAccountId }, `${c.original?.name || "Account"} marked permanently restricted`)}
          style={{ border: "none", background: "none", fontWeight: 600, fontSize: 11.5, fontFamily: F_SANS, color: "#b91c1c", cursor: "pointer", padding: 0, opacity: busy === c.id ? 0.6 : 1 }}>Can&apos;t recover</button>
      </div>
    );
    if (c.status === "permanent") return <span style={{ fontWeight: 600, fontSize: 12.5, fontFamily: F_SANS, color: "#8a93a3" }}>Renter to replace</span>;
    if (c.status === "waiting") return mark(true);
    if (c.status === "handover") return (
      <button disabled={busy === c.id} onClick={() => act(c.id, "/api/admin/replacements", { action: "grant", rentalId: c.newRentalId }, "Access shared · renter emailed")}
        style={{ ...base, border: "none", background: "#0A66C2", color: "#fff" }}>Access shared ✓</button>
    );
    if (c.status === "origBack") return (
      <button disabled={busy === c.id} onClick={() => act(c.id, "/api/admin/replacements", { action: "relist", accountId: c.relistAccountId }, `${c.original?.name || "Original"} relisted`)}
        style={{ ...base, border: "none", background: "#b45309", color: "#fff" }}>Relist original</button>
    );
    return <span style={{ fontWeight: 600, fontSize: 12.5, fontFamily: F_SANS, color: "#8a93a3" }}>{fmt(c.recoveredAt || c.swappedAt)}</span>;
  };

  const labelCss: React.CSSProperties = { fontWeight: 700, fontSize: 11, fontFamily: F_SANS, letterSpacing: ".07em", textTransform: "uppercase", color: "#8a93a3" };

  if (loading) return <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{[1, 2, 3].map((i) => <div key={i} style={{ height: 64, borderRadius: 14, background: "var(--card)", border: "1px solid var(--card-border)" }} />)}</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* header */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <h1 style={{ margin: 0, fontWeight: 800, fontSize: 28, fontFamily: F_GRO, letterSpacing: "-.02em", color: "var(--text)" }}>Replacements</h1>
        <p style={{ margin: 0, fontWeight: 500, fontSize: 14, lineHeight: 1.5, fontFamily: F_SANS, color: "var(--muted)", maxWidth: 640 }}>Every restricted rental, from recovery to swap. Work the &quot;Needs you&quot; tab top to bottom.</p>
      </div>

      {/* tabs + search */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4, background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 11, padding: 4, flexWrap: "wrap" }}>
          {TABS.map(([k, l]) => {
            const on = tab === k;
            const n = tabCount(k);
            const hot = k === "needs" && n > 0;
            return (
              <button key={k} onClick={() => setTab(k)} style={{ border: "none", borderRadius: 8, padding: "7px 12px", fontWeight: 700, fontSize: 13, fontFamily: F_SANS, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, background: on ? "var(--subtab-active-bg, #0b1220)" : "transparent", color: on ? "var(--subtab-active-fg, #fff)" : "var(--muted)" }}>
                {l}
                <span style={{ fontWeight: 700, fontSize: 11.5, padding: "1px 7px", borderRadius: 999, background: hot ? "#ea580c" : "var(--divider)", color: hot ? "#fff" : "var(--muted)" }}>{n}</span>
              </button>
            );
          })}
        </div>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search renter or account…"
          style={{ marginLeft: "auto", flex: "0 1 300px", minWidth: 180, background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: 10, padding: "9px 12px", fontWeight: 500, fontSize: 13.5, fontFamily: F_SANS, color: "var(--input-fg)", outline: "none" }} />
      </div>

      {/* client filter */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: -6 }}>
        <span style={{ ...labelCss, marginRight: 4 }}>Client</span>
        {[{ email: "", label: "All clients", internal: false, n: cases.length, hot: 0 }, ...clients].map((c) => {
          const on = client === c.email;
          return (
            <button key={c.email || "all"} onClick={() => setClient(on && c.email ? "" : c.email)}
              style={{ borderRadius: 999, padding: "5px 11px", fontWeight: 700, fontSize: 12.5, fontFamily: F_SANS, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, border: `1px solid ${on ? "var(--text)" : "var(--card-border)"}`, background: on ? "var(--text)" : "var(--card)", color: on ? "var(--panel)" : "var(--text)" }}>
              {c.label}
              {c.internal && <span style={{ fontWeight: 700, fontSize: 10, padding: "1px 6px", borderRadius: 999, background: "#f1f3f6", color: "#5b6779" }}>Internal</span>}
              <span style={{ fontWeight: 700, fontSize: 11, color: on ? "var(--panel)" : "#8a93a3", opacity: 0.8 }}>{c.n}</span>
              {c.hot > 0 && <span style={{ fontWeight: 800, fontSize: 10, padding: "1px 6px", borderRadius: 999, background: "#ea580c", color: "#fff" }}>{c.hot} to do</span>}
            </button>
          );
        })}
      </div>

      {/* table */}
      <div style={{ background: "var(--panel)", border: "1px solid var(--panel-border)", borderRadius: 14, overflowX: "auto", boxShadow: "var(--panel-shadow)" }}>
        <div style={{ minWidth: 900 }}>
          <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 16, padding: "11px 18px", borderBottom: "1px solid var(--divider)" }}>
            <span style={labelCss}>Account swap</span><span style={labelCss}>Renter</span><span style={labelCss}>Status</span><span style={{ ...labelCss, textAlign: "right" }}>Next step</span>
          </div>
          {rows.length === 0 ? (
            <div style={{ padding: "34px 18px", textAlign: "center", fontWeight: 500, fontSize: 14, fontFamily: F_SANS, color: "var(--muted)" }}>Nothing here.</div>
          ) : rows.map((c) => {
            const sm = SMETA[c.status];
            return (
              <div key={c.id} style={{ display: "grid", gridTemplateColumns: GRID, gap: 16, alignItems: "center", padding: "13px 18px", borderTop: "1px solid var(--divider)" }}>
                {/* account swap */}
                <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>{nameLink(c.original?.name || "—", c.original?.url || null)}<LiBadge url={c.original?.url || null} /></div>
                    <span style={{ fontWeight: 500, fontSize: 12, fontFamily: F_SANS, color: "#8a93a3" }}>Restricted {fmt(c.original?.restrictedAt)} · ${c.original?.price ?? 0}/mo</span>
                  </div>
                  <span style={{ flex: "none", fontWeight: 700, fontSize: 15, fontFamily: F_SANS, color: c.replacement ? "#0A66C2" : "#c5cbd3" }}>→</span>
                  <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                    {c.replacement ? (
                      <>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>{nameLink(c.replacement.name, c.replacement.url)}<LiBadge url={c.replacement.url} /></div>
                        <span style={{ fontWeight: 500, fontSize: 12, fontFamily: F_SANS, color: "#8a93a3" }}>${c.replacement.price}/mo {c.replacement.diff < 0 && <span style={{ fontWeight: 700, color: "#12a150" }}>(−${-c.replacement.diff})</span>}</span>
                      </>
                    ) : (
                      <span style={{ fontWeight: 600, fontSize: 13, fontFamily: F_SANS, color: "#8a93a3" }}>{c.status === "recovered" ? "Kept original" : "Not replaced yet"}</span>
                    )}
                  </div>
                </div>
                {/* renter */}
                <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                    <span style={{ fontWeight: 700, fontSize: 13.5, fontFamily: F_SANS, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.renter.name}</span>
                    {c.renter.internal && <span style={{ flex: "none", fontWeight: 700, fontSize: 10.5, padding: "1px 6px", borderRadius: 999, background: "#f1f3f6", color: "#5b6779" }}>Internal</span>}
                  </span>
                  <span style={{ fontWeight: 500, fontSize: 12, fontFamily: F_SANS, color: "#8a93a3", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.renter.email}</span>
                </div>
                {/* status */}
                <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                  <span style={{ fontWeight: 700, fontSize: 11.5, fontFamily: F_SANS, padding: "3px 9px", borderRadius: 999, background: sm.bg, color: sm.fg, whiteSpace: "nowrap" }}>{sm.label}</span>
                  <span style={{ fontWeight: 500, fontSize: 12, lineHeight: 1.4, fontFamily: F_SANS, color: "var(--muted)" }}>{subLine(c)}</span>
                </div>
                {/* next step */}
                <div style={{ display: "flex", justifyContent: "flex-end" }}><ActionBtn c={c} /></div>
              </div>
            );
          })}
        </div>
      </div>

      {/* legend */}
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontWeight: 500, fontSize: 12.5, lineHeight: 1.5, fontFamily: F_SANS, color: "var(--muted)" }}>
        <span><b style={{ color: "#c2410c" }}>Recovering</b> · first 48h, renter can&apos;t replace yet</span>
        <span><b style={{ color: "#9a3412" }}>Renter waiting</b> · past 48h, renter chose to wait</span>
        <span><b style={{ color: "#0A66C2" }}>Hand over</b> · renter picked a new account, share access</span>
        <span><b style={{ color: "#b45309" }}>Original back</b> · old account recovered after the swap, relist or retire it</span>
      </div>

      {toast && (
        <div style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", background: "#0b1220", color: "#fff", fontWeight: 600, fontSize: 13, fontFamily: F_SANS, padding: "10px 16px", borderRadius: 10, boxShadow: "0 10px 30px rgba(11,18,32,.25)", zIndex: 60 }}>{toast}</div>
      )}
    </div>
  );
}
