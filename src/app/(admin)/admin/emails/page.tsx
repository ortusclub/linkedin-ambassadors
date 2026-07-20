"use client";

import { useEffect, useMemo, useState, useCallback } from "react";

// ---- data shapes from our APIs ----
interface SentRow { id: string; to: string; subject: string; bcc: string | null; status: string; error: string | null; body: string | null; createdAt: string; }
interface ForecastEvent { date: string; rentalId: string; account: string; to: string; stage: string; label: string; subject: string; html: string; condition: string | null; }

// unified row used by the list/preview
interface Item { id: string; status: "sent" | "failed" | "scheduled"; to: string; subject: string; body: string | null; when: string; type: string; condition: string | null; }

const JAK = "var(--font-sans),'Plus Jakarta Sans',system-ui,-apple-system,sans-serif";
const GRO = "var(--font-grotesk),'Space Grotesk',var(--font-sans),system-ui,sans-serif";

const THEMES: Record<"dark" | "light", Record<string, string>> = {
  dark: {
    "--page-bg": "#060912", "--panel": "#0f1623", "--panel-border": "#1c2434", "--panel-shadow": "none", "--preview-bg": "#0a0e17",
    "--text": "#e6edf6", "--text2": "#c5cedd", "--muted": "#8a97ad", "--muted2": "#5b6678", "--label": "#7c8597",
    "--accent": "#4f8cff", "--divider": "#1b2334",
    "--seg-bg": "#111726", "--seg-border": "#1e2636",
    "--subtab-fg": "#9aa6ba", "--subtab-active-fg": "#7eb0ff", "--subtab-active-bg": "rgba(79,140,255,.16)",
    "--input-bg": "#0e1420", "--input-border": "#1e2636", "--input-fg": "#e6edf6", "--placeholder": "#5b6678",
    "--row-hover": "rgba(255,255,255,.03)", "--row-selected": "rgba(79,140,255,.12)", "--group-bg": "#0c121e",
    "--st-active-bg": "rgba(52,211,153,.16)", "--st-active-fg": "#34d399",
    "--em-amber-bg": "rgba(245,180,80,.16)", "--em-amber-fg": "#f5c26b",
    "--em-blue-bg": "rgba(79,140,255,.16)", "--em-blue-fg": "#7eb0ff",
    "--em-green-bg": "rgba(52,211,153,.16)", "--em-green-fg": "#34d399",
    "--em-violet-bg": "rgba(167,139,250,.18)", "--em-violet-fg": "#c4b5fd",
    "--em-teal-bg": "rgba(45,212,191,.16)", "--em-teal-fg": "#5eead4",
    "--em-red-bg": "rgba(248,113,113,.16)", "--em-red-fg": "#f87171",
  },
  light: {
    "--page-bg": "#e8eaee", "--panel": "#ffffff", "--panel-border": "#ebedf1", "--panel-shadow": "0 1px 3px rgba(16,24,40,.05)", "--preview-bg": "#eef1f5",
    "--text": "#0f1729", "--text2": "#334155", "--muted": "#647189", "--muted2": "#94a0b3", "--label": "#9aa3b2",
    "--accent": "#2563eb", "--divider": "#eef0f3",
    "--seg-bg": "#ffffff", "--seg-border": "#e3e6ea",
    "--subtab-fg": "#647189", "--subtab-active-fg": "#2563eb", "--subtab-active-bg": "#e6effe",
    "--input-bg": "#ffffff", "--input-border": "#e3e6ea", "--input-fg": "#0f1729", "--placeholder": "#aab2c0",
    "--row-hover": "#f7f8fa", "--row-selected": "#e6effe", "--group-bg": "#f4f6f9",
    "--st-active-bg": "#dcf5e4", "--st-active-fg": "#15803d",
    "--em-amber-bg": "#fdf0d5", "--em-amber-fg": "#b45309",
    "--em-blue-bg": "#e6effe", "--em-blue-fg": "#1d4ed8",
    "--em-green-bg": "#dcf5e4", "--em-green-fg": "#15803d",
    "--em-violet-bg": "#ede9fe", "--em-violet-fg": "#6d28d9",
    "--em-teal-bg": "#d5f5f0", "--em-teal-fg": "#0f766e",
    "--em-red-bg": "#fde3e3", "--em-red-fg": "#dc2626",
  },
};

const TYPE_META: Record<string, { label: string; color: string }> = {
  renewal_reminder: { label: "Renewal reminder", color: "amber" },
  charge_notice: { label: "Charge notice", color: "blue" },
  renewal_confirmed: { label: "Renewal confirmed", color: "green" },
  payment_failed: { label: "Payment failed", color: "red" },
  verification: { label: "Verification", color: "violet" },
  welcome: { label: "Welcome", color: "teal" },
  other: { label: "Other", color: "blue" },
};
const CHIP_ORDER = ["all", "renewal_reminder", "charge_notice", "renewal_confirmed", "payment_failed", "verification", "welcome"];

function classify(subject: string, stage?: string): string {
  if (stage) {
    if (stage === "heads_up") return "charge_notice";
    if (stage === "reminder_3d" || stage === "grace" || stage === "winback") return "renewal_reminder";
    if (stage === "confirmation") return "renewal_confirmed";
    if (stage === "payment_hiccup" || stage === "access_revoked") return "payment_failed";
  }
  const s = (subject || "").toLowerCase();
  if (s.includes("verification") || s.includes("verify")) return "verification";
  if (s.includes("welcome")) return "welcome";
  if (s.includes("will be charged") || s.includes("heads-up")) return "charge_notice";
  if (s.includes("renewed") || s.includes("all set")) return "renewal_confirmed";
  if (s.includes("paused") || s.includes("hiccup") || s.includes("declined") || s.includes("payment")) return "payment_failed";
  if (s.includes("renew") || s.includes("24 hours") || s.includes("last chance") || s.includes("expires")) return "renewal_reminder";
  return "other";
}

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayLabel = (iso: string) => { const d = new Date(iso); return `${MON[d.getMonth()]} ${d.getDate()}`; };
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const badge = (color: string): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", font: `700 10px ${JAK}`, letterSpacing: ".02em",
  padding: "3px 9px", borderRadius: 999, flex: "none", whiteSpace: "nowrap",
  background: `var(--em-${color}-bg)`, color: `var(--em-${color}-fg)`,
});
const DOT = (color: string) => `var(--em-${color}-fg)`;

const statusBadge = (status: string): React.CSSProperties => {
  const c = status === "sent" ? "green" : status === "scheduled" ? "blue" : "red";
  return { display: "inline-flex", alignItems: "center", gap: 5, font: `700 10.5px ${JAK}`, padding: "4px 11px", borderRadius: 999, flex: "none", background: status === "sent" ? "var(--st-active-bg)" : `var(--em-${c}-bg)`, color: status === "sent" ? "var(--st-active-fg)" : `var(--em-${c}-fg)` };
};
const statusText = (status: string) => (status === "sent" ? "● Delivered" : status === "scheduled" ? "◷ Scheduled" : "△ Failed");

export default function EmailsPage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [view, setView] = useState<"sent" | "scheduled">("sent");
  const [type, setType] = useState<string>("all");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sent, setSent] = useState<Item[]>([]);
  const [sched, setSched] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // theme — follow the admin theme (localStorage + layout's lv-admin-theme event)
  useEffect(() => {
    const read = () => { try { const s = localStorage.getItem("lv-admin-theme"); setTheme(s === "light" ? "light" : "dark"); } catch { /* noop */ } };
    read();
    const onTheme = (e: Event) => { const d = (e as CustomEvent).detail; if (d === "light" || d === "dark") setTheme(d); };
    window.addEventListener("lv-admin-theme", onTheme as EventListener);
    return () => window.removeEventListener("lv-admin-theme", onTheme as EventListener);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([
        fetch("/api/admin/emails").then((r) => r.json()),
        fetch("/api/admin/emails/upcoming").then((r) => r.json()),
      ]);
      const sentItems: Item[] = (a.emails || []).map((r: SentRow) => ({
        id: r.id, status: r.status === "failed" ? "failed" : "sent", to: r.to, subject: r.subject,
        body: r.body, when: r.createdAt, type: classify(r.subject), condition: null,
      }));
      const schedItems: Item[] = (b.events || []).map((e: ForecastEvent, i: number) => ({
        id: `sched-${i}`, status: "scheduled", to: e.to, subject: e.subject, body: e.html,
        when: e.date, type: classify(e.subject, e.stage), condition: e.condition,
      }));
      setSent(sentItems);
      setSched(schedItems);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const base = view === "scheduled" ? sched : sent;

  const filtered = useMemo(() => {
    let list = base;
    if (type !== "all") list = list.filter((e) => e.type === type);
    if (q) { const s = q.toLowerCase(); list = list.filter((e) => (e.to + " " + e.subject).toLowerCase().includes(s)); }
    return [...list].sort((x, y) => view === "scheduled" ? x.when.localeCompare(y.when) : y.when.localeCompare(x.when));
  }, [base, type, q, view]);

  const sel = filtered.find((e) => e.id === selectedId) || filtered[0] || null;
  const delivered = sent.filter((e) => e.status === "sent").length;
  const failed = sent.filter((e) => e.status === "failed").length;

  const root: React.CSSProperties = { ...(THEMES[theme] as React.CSSProperties), minHeight: "calc(100vh - 0px)", background: "var(--page-bg)", padding: "26px 30px 50px", fontFamily: JAK };
  const panel: React.CSSProperties = { background: "var(--panel)", border: "1px solid var(--panel-border)", borderRadius: 16, boxShadow: "var(--panel-shadow)", height: 660, display: "flex", flexDirection: "column", overflow: "hidden" };
  const segBtn = (active: boolean): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", border: "none", font: `600 12.5px ${JAK}`, padding: "7px 16px", borderRadius: 8, background: active ? "var(--accent)" : "transparent", color: active ? "#fff" : "var(--muted)" });
  const segCount = (active: boolean): React.CSSProperties => ({ font: `700 11px ${GRO}`, fontVariantNumeric: "tabular-nums", padding: "1px 6px", borderRadius: 6, background: active ? "rgba(255,255,255,.22)" : "var(--group-bg)", color: active ? "#fff" : "var(--muted)" });

  let lastDay = "";

  return (
    <div style={root}>
      {/* title */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ font: `600 28px/1 ${GRO}`, color: "var(--text)", margin: "0 0 8px", letterSpacing: "-.02em" }}>Email log</h1>
        <p style={{ font: `500 13.5px/1.5 ${JAK}`, color: "var(--muted)", margin: 0, maxWidth: 720 }}>
          Every automated email the system sends — renewal reminders, charge notices, confirmations, verification. Select any email to read exactly what the recipient received (or will).
        </p>
      </div>

      {/* view switch + stats */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", background: "var(--seg-bg)", border: "1px solid var(--seg-border)", borderRadius: 11, padding: 3 }}>
          <button onClick={() => { setView("sent"); setType("all"); setSelectedId(null); }} style={segBtn(view === "sent")}>Sent <span style={segCount(view === "sent")}>{sent.length}</span></button>
          <button onClick={() => { setView("scheduled"); setType("all"); setSelectedId(null); }} style={segBtn(view === "scheduled")}>Scheduled <span style={segCount(view === "scheduled")}>{sched.length}</span></button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, font: `500 12.5px ${JAK}`, color: "var(--muted)" }}><span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--st-active-fg)" }} />{delivered} delivered</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, font: `500 12.5px ${JAK}`, color: "var(--muted)" }}><span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--em-red-fg)" }} />{failed} failed</span>
          <input value={q} onChange={(e) => { setQ(e.target.value); setSelectedId(null); }} placeholder="Search recipient or subject…"
            style={{ width: 280, background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: 9, padding: "9px 12px", font: `500 13px ${JAK}`, color: "var(--input-fg)", outline: "none" }} />
        </div>
      </div>

      {/* type chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
        {CHIP_ORDER.map((key) => {
          const count = key === "all" ? base.length : base.filter((e) => e.type === key).length;
          const active = type === key;
          const label = key === "all" ? "All" : TYPE_META[key].label;
          return (
            <button key={key} onClick={() => { setType(key); setSelectedId(null); }}
              style={{ display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer", font: `600 12.5px ${JAK}`, padding: "7px 13px", borderRadius: 999, border: "1px solid", ...(active ? { background: "var(--subtab-active-bg)", color: "var(--subtab-active-fg)", borderColor: "transparent" } : { background: "transparent", color: "var(--subtab-fg)", borderColor: "var(--input-border)" }) }}>
              {label}
              <span style={{ font: `700 11px ${GRO}`, fontVariantNumeric: "tabular-nums", padding: "1px 6px", borderRadius: 6, ...(active ? { background: "rgba(127,176,255,.18)", color: "var(--subtab-active-fg)" } : { background: "var(--group-bg)", color: "var(--muted)" }) }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* master-detail */}
      <div style={{ display: "grid", gridTemplateColumns: "452px 1fr", gap: 18, alignItems: "start" }}>
        {/* list */}
        <div style={panel}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 18px", borderBottom: "1px solid var(--divider)" }}>
            <span style={{ font: `700 10px ${JAK}`, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--label)" }}>{view === "scheduled" ? "Upcoming — soonest first" : "Sent — newest first"}</span>
            <span style={{ font: `600 11px ${JAK}`, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{filtered.length} {filtered.length === 1 ? "email" : "emails"}</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: "center", font: `500 13px ${JAK}`, color: "var(--muted)" }}>Loading…</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: "48px 24px", textAlign: "center" }}>
                <div style={{ font: `600 14px ${JAK}`, color: "var(--text2)", marginBottom: 4 }}>No emails</div>
                <div style={{ font: `500 12.5px ${JAK}`, color: "var(--muted)" }}>Nothing matches this filter yet.</div>
              </div>
            ) : filtered.map((e) => {
              const meta = TYPE_META[e.type];
              const isSel = sel && e.id === sel.id;
              const showGroup = view === "scheduled" && dayLabel(e.when) !== lastDay;
              if (view === "scheduled") lastDay = dayLabel(e.when);
              return (
                <div key={e.id}>
                  {showGroup && <div style={{ font: `700 10px ${JAK}`, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--label)", padding: "9px 18px 7px", background: "var(--group-bg)", borderBottom: "1px solid var(--divider)" }}>{dayLabel(e.when)}, 2026</div>}
                  <div onClick={() => setSelectedId(e.id)} style={{ display: "flex", gap: 12, padding: "13px 18px", cursor: "pointer", borderBottom: "1px solid var(--divider)", borderLeft: "3px solid", ...(isSel ? { borderLeftColor: "var(--accent)", background: "var(--row-selected)" } : { borderLeftColor: "transparent" }) }}>
                    <div style={{ width: 8, height: 8, borderRadius: 999, marginTop: 6, flex: "none", background: e.status === "failed" ? DOT("red") : DOT(meta.color) }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ font: `600 13px ${JAK}`, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{e.subject}</span>
                        <span style={{ font: `500 11px ${JAK}`, color: "var(--muted2)", flex: "none", fontVariantNumeric: "tabular-nums" }}>{timeLabel(e.when)}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <span style={badge(meta.color)}>{meta.label}</span>
                        <span style={{ font: `500 12px ${JAK}`, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.to}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* detail */}
        <div style={panel}>
          {sel ? (
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--divider)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 12 }}>
                  <h2 style={{ font: `600 18px/1.3 ${GRO}`, color: "var(--text)", margin: 0, letterSpacing: "-.01em" }}>{sel.subject}</h2>
                  <span style={statusBadge(sel.status)}>{statusText(sel.status)}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 26px" }}>
                  {[["To", sel.to], [sel.status === "scheduled" ? "Sends" : "Sent", `${dayLabel(sel.when)}, 2026 · ${timeLabel(sel.when)}`], ["Type", TYPE_META[sel.type].label]].map(([k, v], i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ font: `700 9.5px ${JAK}`, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--label)", width: 42 }}>{k}</span>
                      {k === "Type" ? <span style={badge(TYPE_META[sel.type].color)}>{v}</span> : <span style={{ font: `500 12.5px ${JAK}`, color: "var(--text2)" }}>{v}</span>}
                    </div>
                  ))}
                </div>
                {sel.condition && <div style={{ font: `600 12px ${JAK}`, color: "var(--em-amber-fg)", marginTop: 10 }}>Only fires {sel.condition}</div>}
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: 26, background: "var(--preview-bg)" }}>
                {sel.body
                  ? <div style={{ maxWidth: 600, margin: "0 auto", background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 8px 30px rgba(2,6,20,.28)", border: "1px solid #eef0f3" }} dangerouslySetInnerHTML={{ __html: sel.body }} />
                  : <div style={{ maxWidth: 600, margin: "0 auto", background: "#fff", borderRadius: 14, padding: "40px 34px", textAlign: "center", color: "#8a97ad", font: `500 13px ${JAK}` }}>No stored content for this email (it predates content capture).</div>}
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, textAlign: "center", padding: 40 }}>
              <div style={{ font: `600 15px ${JAK}`, color: "var(--text2)" }}>Select an email</div>
              <div style={{ font: `500 13px ${JAK}`, color: "var(--muted)", maxWidth: 280 }}>Pick a message from the list to read the exact email the system {view === "scheduled" ? "will send" : "delivered"}.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
