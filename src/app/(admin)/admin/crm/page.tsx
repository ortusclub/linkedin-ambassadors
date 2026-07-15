"use client";

import { useEffect, useMemo, useState } from "react";
import { Poppins, Inter, JetBrains_Mono } from "next/font/google";

const poppins = Poppins({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--lv-poppins" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--lv-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["500", "600"], variable: "--lv-mono" });

interface Comm { ts: string; channel: string; body: string }
interface Lead {
  id: string; channel: string; name: string; handle: string | null; companyEmail: string | null;
  type: string | null; message: string | null; status: string; stage: string; ownerEmail: string | null;
  commsLog: Comm[] | null; source: string | null; notes: string | null;
  followUpDate: string | null; firstContactAt: string; lastContactAt: string;
}

const STAGES = [
  { key: "new", label: "New" },
  { key: "warm", label: "Warm" },
  { key: "active", label: "Active" },
  { key: "cold", label: "Cold" },
  { key: "lost", label: "Lost" },
];
const CHANNELS = ["email", "linkedin", "telegram", "whatsapp", "call", "meeting", "note"];

// ---- design palette helpers (exact from the shared mockup) ----
const stageColor = (key: string, dark: boolean) => {
  const light: Record<string, { fg: string; bg: string; dot: string }> = {
    new: { fg: "#0A66C2", bg: "#EAF2FC", dot: "#0A66C2" },
    warm: { fg: "#946011", bg: "#FBF0DA", dot: "#E0A43B" },
    active: { fg: "#067A45", bg: "#E4F6EC", dot: "#00B85C" },
    cold: { fg: "#5A6473", bg: "#EEF1F4", dot: "#96A0AD" },
    lost: { fg: "#B23150", bg: "#FBE7EB", dot: "#D8607A" },
  };
  const dk: Record<string, { fg: string; bg: string; dot: string }> = {
    new: { fg: "#7FB2EE", bg: "#12314F", dot: "#4B9BEA" },
    warm: { fg: "#E6BE6C", bg: "#3A2E14", dot: "#E0A43B" },
    active: { fg: "#5FD79A", bg: "#123526", dot: "#00B85C" },
    cold: { fg: "#9DA9B6", bg: "#1E2A38", dot: "#7C8A99" },
    lost: { fg: "#EC8AA1", bg: "#3A1B24", dot: "#D8607A" },
  };
  return (dark ? dk : light)[key] || (dark ? dk : light).cold;
};
const chanColor = (c: string, dark: boolean) => {
  const key = (c || "").toLowerCase();
  const light: Record<string, { fg: string; bg: string }> = {
    telegram: { fg: "#2AA2E0", bg: "#E7F1FB" }, email: { fg: "#7A5CE0", bg: "#F1EFFB" },
    linkedin: { fg: "#0A66C2", bg: "#EAF2FC" }, website: { fg: "#0E7C74", bg: "#DEF3F1" },
    whatsapp: { fg: "#067A45", bg: "#E4F6EC" }, call: { fg: "#067A45", bg: "#E4F6EC" },
    meeting: { fg: "#5747C9", bg: "#F1EFFB" }, note: { fg: "#946011", bg: "#FBF0DA" },
  };
  const dk: Record<string, { fg: string; bg: string }> = {
    telegram: { fg: "#5CBAF0", bg: "#12303F" }, email: { fg: "#A48CF0", bg: "#231F3D" },
    linkedin: { fg: "#7FB2EE", bg: "#12314F" }, website: { fg: "#4FC7BC", bg: "#0F3330" },
    whatsapp: { fg: "#5FD79A", bg: "#123526" }, call: { fg: "#5FD79A", bg: "#123526" },
    meeting: { fg: "#A48CF0", bg: "#231F3D" }, note: { fg: "#E6BE6C", bg: "#3A2E14" },
  };
  return (dark ? dk : light)[key] || { fg: "#9DA9B6", bg: dark ? "#1E2A38" : "#EEF1F4" };
};

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—");
const fmtDay = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");
const initials = (n: string) => { const s = (n || "?").replace(/[@"()]/g, "").trim(); return (s[0] || "?").toUpperCase(); };

export default function CrmPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selId, setSelId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, { channel: string; body: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", companyEmail: "", type: "Potential Renter", stage: "new", message: "" });
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const dark = theme === "dark";

  // Follow the admin shell's theme (set in the layout; broadcast on toggle).
  useEffect(() => {
    const read = () => { const t = typeof window !== "undefined" ? localStorage.getItem("lv-admin-theme") : null; if (t === "light" || t === "dark") setTheme(t); };
    read();
    const onEvt = (e: Event) => { const t = (e as CustomEvent).detail; if (t === "light" || t === "dark") setTheme(t); };
    window.addEventListener("lv-admin-theme", onEvt);
    window.addEventListener("storage", read);
    return () => { window.removeEventListener("lv-admin-theme", onEvt); window.removeEventListener("storage", read); };
  }, []);

  const load = () => fetch("/api/admin/inbound").then((r) => r.json()).then((d) => setLeads(d.leads || [])).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  useEffect(() => { fetch("/api/admin/inbound/export-url").then((r) => r.json()).then((d) => { if (d.configured) setSheetUrl(d.url); }).catch(() => {}); }, []);
  const copyFormula = () => { if (!sheetUrl) return; navigator.clipboard.writeText(`=IMPORTDATA("${sheetUrl}")`); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const patch = async (id: string, body: Record<string, unknown>) => {
    setBusy(id);
    await fetch("/api/admin/inbound", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) });
    await load();
    setBusy(null);
  };

  const logComm = async (id: string) => {
    const d = draft[id];
    if (!d || !d.body.trim()) return;
    await patch(id, { addNote: { channel: d.channel, body: d.body } });
    setDraft((p) => ({ ...p, [id]: { channel: d.channel, body: "" } }));
  };

  const addContact = async () => {
    if (!form.name.trim()) return;
    setBusy("new");
    const res = await fetch("/api/admin/inbound", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channel: "manual", source: "manual", ...form }) });
    const data = await res.json().catch(() => ({}));
    setForm({ name: "", companyEmail: "", type: "Potential Renter", stage: "new", message: "" });
    setAdding(false);
    await load();
    if (data?.lead?.id) setSelId(data.lead.id);
    setBusy(null);
  };

  const deleteLead = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This removes the contact and its comms history.`)) return;
    setBusy(id);
    await fetch(`/api/admin/inbound?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (selId === id) setSelId(null);
    await load();
    setBusy(null);
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: leads.length };
    STAGES.forEach((s) => (c[s.key] = leads.filter((l) => (l.stage || "new") === s.key).length));
    return c;
  }, [leads]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const ts = (l: Lead) => new Date(l.lastContactAt || l.firstContactAt).getTime() || 0;
    return leads
      .filter((l) => {
        if (filter !== "all" && (l.stage || "new") !== filter) return false;
        if (!q) return true;
        return `${l.name} ${l.companyEmail || ""} ${l.type || ""} ${l.source || ""} ${l.handle || ""} ${l.notes || ""}`.toLowerCase().includes(q);
      })
      // most recently contacted first — whoever we talked to latest floats to the top
      .sort((a, b) => ts(b) - ts(a));
  }, [leads, filter, search]);

  const cur = useMemo(() => filtered.find((l) => l.id === selId) || filtered[0] || null, [filtered, selId]);

  const CHIPS = [["all", "All", "#96A0AD"] as const, ...STAGES.map((s) => [s.key, s.label, stageColor(s.key, false).dot] as const)];

  // segmented pipeline health bar (design order)
  const segOrder = [["active", "#00B85C"], ["warm", "#E0A43B"], ["new", "#0A66C2"], ["cold", dark ? "#3A4A5A" : "#B7C0CB"], ["lost", "#D8607A"]] as const;
  const segs = segOrder.filter(([k]) => counts[k] > 0).map(([k, c]) => ({ w: leads.length ? (counts[k] / leads.length) * 100 : 0, color: c }));

  const V = {
    bg: dark ? "#0A1420" : "#EEF1F4", surface: dark ? "#0F1C2B" : "#FFFFFF", surface2: dark ? "#13212F" : "#F8FAFC",
    border: dark ? "#22323f" : "#E7EBF0", border2: dark ? "#1A2937" : "#EEF1F4",
    ink: dark ? "#EAF0F6" : "#0B1220", body: dark ? "#C4D0DC" : "#37424F", muted: dark ? "#93A2B2" : "#5A6473",
    muted2: dark ? "#7F8E9D" : "#8A93A2", faint: dark ? "#66788A" : "#96A0AD",
    inputBg: dark ? "#13212F" : "#FFFFFF", inputBorder: dark ? "#2A3B49" : "#DCE0E6", rowActive: dark ? "#12283B" : "#F3F8FE", pillTrack: dark ? "#1A2937" : "#EEF1F4",
  };
  const font = { p: "var(--lv-poppins),sans-serif", i: "var(--lv-inter),sans-serif", m: "var(--lv-mono),monospace" };
  const input = { fontFamily: font.i, color: V.ink, background: V.inputBg, border: `1px solid ${V.inputBorder}`, borderRadius: 10, outline: "none", padding: "9px 12px", fontSize: 13.5 } as const;
  const micro = { fontFamily: font.m, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" } as const;

  return (
    <div className={`${poppins.variable} ${inter.variable} ${mono.variable}`} id="lv-crm" style={{ fontFamily: font.i, color: V.ink, background: V.bg, borderRadius: 16, padding: "4px 4px 8px" }}>
      <style>{`#lv-crm input::placeholder,#lv-crm textarea::placeholder{color:${V.faint};} #lv-crm input:focus,#lv-crm select:focus,#lv-crm textarea:focus{border-color:#0A66C2;box-shadow:0 0 0 3px rgba(10,102,194,0.2);} #lv-crm select option{background:${V.surface};color:${V.ink};} #lv-crm textarea{resize:vertical;line-height:1.55;font-family:${font.i};}`}</style>

      {/* header row */}
      <div style={{ padding: "16px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontFamily: font.p, fontWeight: 700, fontSize: 26, letterSpacing: "-0.02em", margin: "0 0 4px", color: V.ink }}>Contacts &amp; Comms</h1>
            <p style={{ fontSize: 14, color: V.muted, margin: 0, maxWidth: 680 }}>Every lead &amp; client in one place — pipeline, notes, and a timestamped comms history. Telegram logs automatically; add the rest manually.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {sheetUrl && (
              <span onClick={copyFormula} title="Paste into cell A1 of a blank Google Sheet to mirror this view" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: V.surface, border: `1px solid ${V.inputBorder}`, borderRadius: 10, padding: "9px 14px", fontSize: 13, fontWeight: 600, color: V.body, cursor: "pointer" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0A66C2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>{copied ? "Copied ✓" : "Copy Sheets link"}
              </span>
            )}
            <span onClick={() => setAdding((v) => !v)} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "#0A66C2", color: "#fff", borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 6px 16px rgba(10,102,194,0.24)" }}>
              {!adding && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>}{adding ? "Cancel" : "Add contact"}
            </span>
          </div>
        </div>

        {adding && (
          <div style={{ background: V.surface, border: `1px solid ${V.border}`, borderRadius: 14, padding: 16, marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ ...input, flex: "1 1 180px" }} />
            <input placeholder="Company / email" value={form.companyEmail} onChange={(e) => setForm({ ...form, companyEmail: e.target.value })} style={{ ...input, flex: "1 1 180px" }} />
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={input}>
              <option>Potential Renter</option><option>Potential Ambassador</option><option>Renter</option><option>Partner</option><option>Other</option>
            </select>
            <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} style={input}>
              {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <button onClick={addContact} disabled={busy === "new" || !form.name.trim()} style={{ fontFamily: font.i, fontSize: 13, fontWeight: 600, color: "#fff", background: "#00B85C", border: "none", borderRadius: 10, padding: "9px 18px", cursor: "pointer", opacity: !form.name.trim() ? 0.5 : 1 }}>Save</button>
          </div>
        )}

        {/* pipeline bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 18, background: V.surface, border: `1px solid ${V.border}`, borderRadius: 14, padding: "14px 18px", boxShadow: "0 1px 3px rgba(16,24,40,0.04)", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexShrink: 0 }}>
            <span style={{ fontFamily: font.p, fontWeight: 800, fontSize: 22, color: V.ink }}>{counts.all}</span>
            <span style={{ ...micro, fontSize: 10.5, color: V.muted2 }}>in pipeline</span>
          </div>
          <div style={{ flex: 1, display: "flex", height: 8, borderRadius: 999, overflow: "hidden", background: V.pillTrack, minWidth: 120 }}>
            {segs.map((s, i) => <div key={i} style={{ width: s.w + "%", background: s.color }} />)}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
            {CHIPS.map(([k, label, dot]) => {
              const on = filter === k;
              const onBg = dark ? "#0A66C2" : "#0B1220";
              return (
                <button key={k} onClick={() => setFilter(k)} style={{ display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer", fontFamily: font.i, fontSize: 12.5, fontWeight: on ? 600 : 500, color: on ? "#fff" : V.body, background: on ? onBg : V.surface, border: `1px solid ${on ? onBg : V.inputBorder}`, borderRadius: 999, padding: "6px 12px" }}>
                  {k !== "all" && <span style={{ width: 7, height: 7, borderRadius: "50%", background: dot as string, display: "inline-block" }} />}
                  {label}<span style={{ fontFamily: font.m, fontSize: 11, fontWeight: 600, color: on ? "#fff" : V.faint, marginLeft: 2 }}>{counts[k]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* MASTER-DETAIL */}
      <div style={{ padding: "18px 20px 20px", display: "grid", gridTemplateColumns: "360px minmax(0,1fr)", gap: 20, alignItems: "start" }}>

        {/* LIST */}
        <div style={{ background: V.surface, border: `1px solid ${V.border}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(16,24,40,0.04)", overflow: "hidden", position: "sticky", top: 16 }}>
          <div style={{ padding: "14px 14px 12px", borderBottom: `1px solid ${V.border2}` }}>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: V.faint, pointerEvents: "none", display: "flex" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
              </span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email or message…" style={{ ...input, width: "100%", padding: "11px 13px 11px 38px", fontSize: 13.5 }} />
            </div>
          </div>
          <div style={{ maxHeight: "calc(100vh - 210px)", overflowY: "auto" }}>
            {loading ? (
              [1, 2, 3, 4, 5].map((i) => <div key={i} style={{ height: 64, borderBottom: `1px solid ${V.border2}`, background: V.surface2, opacity: 0.6 }} />)
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 16px", color: V.muted, fontSize: 13 }}>No contacts in this view.</div>
            ) : filtered.map((l) => {
              const on = cur?.id === l.id;
              const sc = stageColor(l.stage || "new", dark);
              const cc = chanColor(l.channel, dark);
              const log = Array.isArray(l.commsLog) ? l.commsLog : [];
              return (
                <div key={l.id} onClick={() => setSelId(l.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 15px", cursor: "pointer", borderBottom: `1px solid ${V.border2}`, borderLeft: `3px solid ${on ? "#0A66C2" : "transparent"}`, background: on ? V.rowActive : "transparent" }}>
                  <span style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 10, background: cc.bg, color: cc.fg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.p, fontWeight: 700, fontSize: 14 }}>{initials(l.name)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: V.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.name}</span>
                      <span style={{ fontFamily: font.m, fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase", color: cc.fg, background: cc.bg, borderRadius: 5, padding: "2px 6px", flexShrink: 0 }}>{l.channel}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: V.muted2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>{l.companyEmail || l.type || l.handle || "—"}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: sc.fg, background: sc.bg, borderRadius: 999, padding: "3px 9px" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: sc.dot }} />{(STAGES.find((s) => s.key === (l.stage || "new")) || STAGES[0]).label}
                    </span>
                    <span style={{ fontSize: 11, color: V.faint, whiteSpace: "nowrap" }}>{fmtDay(l.lastContactAt)}{log.length ? ` · ${log.length}` : ""}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* DETAIL */}
        <div style={{ background: V.surface, border: `1px solid ${V.border}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(16,24,40,0.04)", overflow: "hidden", minHeight: 420 }}>
          {!cur ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 420, color: V.muted, fontSize: 14 }}>Select a contact to view their history.</div>
          ) : (() => {
            const sc = stageColor(cur.stage || "new", dark);
            const cc = chanColor(cur.channel, dark);
            const log = Array.isArray(cur.commsLog) ? cur.commsLog : [];
            const d = draft[cur.id] || { channel: "email", body: "" };
            const metaCell = { background: V.surface, padding: "16px 26px" } as const;
            return (
              <>
                {/* detail header */}
                <div style={{ padding: "22px 26px", borderBottom: `1px solid ${V.border2}`, display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <span style={{ flexShrink: 0, width: 52, height: 52, borderRadius: 13, background: cc.bg, color: cc.fg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.p, fontWeight: 700, fontSize: 20 }}>{initials(cur.name)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: font.p, fontWeight: 700, fontSize: 20, letterSpacing: "-0.01em", color: V.ink }}>{cur.name}</span>
                      <span style={{ fontFamily: font.m, fontSize: 9.5, letterSpacing: "0.06em", textTransform: "uppercase", color: cc.fg, background: cc.bg, borderRadius: 6, padding: "3px 8px" }}>{cur.channel}</span>
                    </div>
                    <div style={{ fontSize: 13.5, color: V.muted2, marginTop: 3 }}>{cur.companyEmail || cur.handle || cur.type || "—"}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ position: "relative" }}>
                      <select value={cur.stage || "new"} onChange={(e) => patch(cur.id, { stage: e.target.value })} style={{ ...input, appearance: "none", WebkitAppearance: "none", padding: "9px 34px 9px 14px", fontWeight: 600, cursor: "pointer", color: sc.fg }}>
                        {STAGES.map((s) => <option key={s.key} value={s.key} style={{ color: V.ink }}>{s.label}</option>)}
                      </select>
                      <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: V.muted2, fontSize: 10 }}>▼</span>
                    </div>
                    <span onClick={() => deleteLead(cur.id, cur.name)} style={{ fontSize: 12.5, fontWeight: 600, color: "#C2334E", cursor: "pointer", opacity: busy === cur.id ? 0.5 : 1 }}>Delete</span>
                  </div>
                </div>

                {/* meta grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, background: V.border2, borderBottom: `1px solid ${V.border2}` }}>
                  <div style={metaCell}>
                    <div style={{ ...micro, color: V.faint, marginBottom: 6 }}>Source</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: V.ink }}>{cur.source || cur.channel}</div>
                  </div>
                  <div style={metaCell}>
                    <div style={{ ...micro, color: V.faint, marginBottom: 6 }}>Owner</div>
                    <input key={cur.id + "-owner"} defaultValue={cur.ownerEmail || ""} placeholder="team member" onBlur={(e) => { if (e.target.value !== (cur.ownerEmail || "")) patch(cur.id, { ownerEmail: e.target.value }); }} style={{ ...input, width: "100%", padding: "6px 10px" }} />
                  </div>
                  <div style={metaCell}>
                    <div style={{ ...micro, color: V.faint, marginBottom: 6 }}>Follow-up</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: cur.followUpDate ? V.ink : V.faint }}>{cur.followUpDate ? fmtDay(cur.followUpDate) : "None set"}</div>
                  </div>
                </div>

                {/* notes */}
                <div style={{ padding: "20px 26px", borderBottom: `1px solid ${V.border2}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ ...micro, fontSize: 10.5, color: V.muted2 }}>Notes</span>
                    <span style={{ fontSize: 12, color: V.faint }}>general context — not a dated touchbase</span>
                  </div>
                  <textarea key={cur.id + "-notes"} defaultValue={cur.notes || ""} onBlur={(e) => { if (e.target.value !== (cur.notes || "")) patch(cur.id, { notes: e.target.value }); }} placeholder="Background, pricing locked, preferences…" style={{ ...input, width: "100%", minHeight: 78, padding: "13px 15px", fontSize: 14 }} />
                </div>

                {/* log a touchbase */}
                <div style={{ padding: "20px 26px", background: V.surface2, borderBottom: `1px solid ${V.border2}` }}>
                  <div style={{ ...micro, fontSize: 10.5, color: V.muted2, marginBottom: 10 }}>Log a touchbase</div>
                  <div style={{ display: "flex", gap: 10, alignItems: "stretch", flexWrap: "wrap" }}>
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <select value={d.channel} onChange={(e) => setDraft((p) => ({ ...p, [cur.id]: { ...d, channel: e.target.value } }))} style={{ ...input, appearance: "none", WebkitAppearance: "none", height: "100%", padding: "11px 32px 11px 13px", fontWeight: 600, cursor: "pointer" }}>
                        {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: V.muted2, fontSize: 10 }}>▼</span>
                    </div>
                    <textarea value={d.body} onChange={(e) => setDraft((p) => ({ ...p, [cur.id]: { ...d, body: e.target.value } }))} placeholder="What was said / done…" style={{ ...input, flex: 1, minHeight: 46, padding: "12px 14px", fontSize: 14 }} />
                    <button onClick={() => logComm(cur.id)} disabled={busy === cur.id || !d.body.trim()} style={{ flexShrink: 0, alignSelf: "stretch", background: d.body.trim() ? "#0A66C2" : (dark ? "#274155" : "#B7C7DA"), color: "#fff", border: "none", borderRadius: 10, padding: "0 22px", fontFamily: font.i, fontSize: 14, fontWeight: 600, cursor: d.body.trim() ? "pointer" : "default" }}>Log</button>
                  </div>
                </div>

                {/* timeline */}
                <div style={{ padding: "22px 26px 26px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                    <span style={{ ...micro, fontSize: 10.5, color: V.muted2 }}>Comms history</span>
                    <span style={{ fontSize: 12, color: V.faint }}>{log.length} logged</span>
                  </div>
                  {log.length === 0 ? (
                    <div style={{ fontSize: 12.5, color: V.muted2, fontStyle: "italic" }}>No touchbases logged yet.</div>
                  ) : (
                    <div style={{ position: "relative", paddingLeft: 26 }}>
                      <div style={{ position: "absolute", left: 6, top: 4, bottom: 4, width: 2, background: V.border }} />
                      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        {log.map((c, i) => {
                          const tc = chanColor(c.channel, dark);
                          return (
                            <div key={i} style={{ position: "relative" }}>
                              <span style={{ position: "absolute", left: -26, top: 3, width: 12, height: 12, borderRadius: "50%", background: V.surface, border: `2.5px solid ${tc.fg}` }} />
                              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 5 }}>
                                <span style={{ fontFamily: font.m, fontSize: 9.5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: tc.fg, background: tc.bg, borderRadius: 5, padding: "3px 8px" }}>{c.channel}</span>
                                <span style={{ fontSize: 12, color: V.faint }}>{fmt(c.ts)}</span>
                              </div>
                              <p style={{ fontSize: 14, lineHeight: 1.6, color: V.body, margin: 0, whiteSpace: "pre-wrap" }}>{c.body}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {cur.message && <div style={{ marginTop: 18, fontSize: 12.5, color: V.muted }}><strong style={{ color: V.ink }}>Intake:</strong> {cur.message}</div>}
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
