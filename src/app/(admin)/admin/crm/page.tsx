"use client";

import { useEffect, useMemo, useState } from "react";

interface Comm { ts: string; channel: string; body: string }
interface Lead {
  id: string; channel: string; name: string; handle: string | null; companyEmail: string | null;
  type: string | null; message: string | null; status: string; stage: string; ownerEmail: string | null;
  commsLog: Comm[] | null; source: string | null; notes: string | null;
  followUpDate: string | null; firstContactAt: string; lastContactAt: string;
}

const STAGES = [
  { key: "new", label: "New", color: "#8A93A2" },
  { key: "warm", label: "Warm", color: "#D9822B" },
  { key: "active", label: "Active", color: "#12B76A" },
  { key: "cold", label: "Cold", color: "#5B8DEF" },
  { key: "lost", label: "Lost", color: "#F04438" },
];
const stageOf = (k: string) => STAGES.find((s) => s.key === k) || STAGES[0];
const CHANNELS = ["email", "linkedin", "telegram", "whatsapp", "call", "meeting", "note"];

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—");
const fmtDay = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");

export default function CrmPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState<Record<string, { channel: string; body: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", companyEmail: "", type: "Potential Renter", stage: "new", message: "" });
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
    await fetch("/api/admin/inbound", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channel: "manual", source: "manual", ...form }) });
    setForm({ name: "", companyEmail: "", type: "Potential Renter", stage: "new", message: "" });
    setAdding(false);
    await load();
    setBusy(null);
  };

  const toggle = (id: string) => setExpanded((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: leads.length };
    STAGES.forEach((s) => (c[s.key] = leads.filter((l) => (l.stage || "new") === s.key).length));
    return c;
  }, [leads]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (filter !== "all" && (l.stage || "new") !== filter) return false;
      if (!q) return true;
      return `${l.name} ${l.companyEmail || ""} ${l.type || ""} ${l.source || ""} ${l.handle || ""}`.toLowerCase().includes(q);
    });
  }, [leads, filter, search]);

  const CHIPS = [["all", "All", counts.all, "#8A93A2"] as const, ...STAGES.map((s) => [s.key, s.label, counts[s.key], s.color] as const)];
  const input = { background: "var(--input-bg, var(--card))", border: "1px solid var(--card-border)", borderRadius: 8, padding: "8px 11px", font: "500 13px var(--font-sans)", color: "var(--text)", outline: "none" } as const;

  return (
    <div style={{ fontFamily: "var(--font-sans),system-ui,sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 8 }}>
        <div>
          <h1 style={{ font: "700 22px var(--font-grotesk)", color: "var(--text)", margin: 0 }}>CRM</h1>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0 0" }}>Every lead & client in one place — active, warm and cold, with a timestamped comms history.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {sheetUrl && <button onClick={copyFormula} title="Paste into cell A1 of a blank Google Sheet to mirror this view" style={{ font: "600 13px var(--font-sans)", color: "var(--muted)", background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 9, padding: "9px 16px", cursor: "pointer" }}>{copied ? "Copied ✓" : "📊 Copy Google Sheets link"}</button>}
          <button onClick={() => setAdding((v) => !v)} style={{ font: "600 13px var(--font-sans)", color: "var(--nav-active-text)", background: "var(--nav-active-bg)", border: "none", borderRadius: 9, padding: "9px 16px", cursor: "pointer" }}>{adding ? "Cancel" : "+ Add contact"}</button>
        </div>
      </div>

      {adding && (
        <div style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 12, padding: 16, marginBottom: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ ...input, flex: "1 1 180px" }} />
          <input placeholder="Company / email" value={form.companyEmail} onChange={(e) => setForm({ ...form, companyEmail: e.target.value })} style={{ ...input, flex: "1 1 180px" }} />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={input}>
            <option>Potential Renter</option><option>Potential Ambassador</option><option>Renter</option><option>Partner</option><option>Other</option>
          </select>
          <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} style={input}>
            {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <button onClick={addContact} disabled={busy === "new"} style={{ font: "600 13px var(--font-sans)", color: "#fff", background: "#12B76A", border: "none", borderRadius: 8, padding: "9px 16px", cursor: "pointer" }}>Save</button>
        </div>
      )}

      {/* stage filter + search */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {CHIPS.map(([k, label, n, color]) => {
            const on = filter === k;
            return (
              <button key={k} onClick={() => setFilter(k)} style={{ display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer", font: `${on ? 600 : 500} 13px var(--font-sans)`, color: on ? "#fff" : "var(--muted)", background: on ? (color as string) : "var(--card)", border: "1px solid " + (on ? (color as string) : "var(--card-border)"), borderRadius: 999, padding: "7px 13px" }}>
                {label}<span style={{ font: "600 11px var(--font-grotesk)", opacity: 0.85 }}>{n}</span>
              </button>
            );
          })}
        </div>
        <input placeholder="Search contacts…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...input, width: 210 }} />
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{[1, 2, 3, 4].map((i) => <div key={i} style={{ height: 58, borderRadius: 12, background: "var(--card)", opacity: 0.5 }} />)}</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--muted)" }}>No contacts in this view.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((l) => {
            const st = stageOf(l.stage || "new");
            const isOpen = expanded.has(l.id);
            const log = Array.isArray(l.commsLog) ? l.commsLog : [];
            const d = draft[l.id] || { channel: "email", body: "" };
            return (
              <div key={l.id} style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 12, overflow: "hidden" }}>
                {/* row */}
                <div onClick={() => toggle(l.id)} style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) 1.1fr 1fr 1.1fr auto", alignItems: "center", gap: 14, padding: "13px 16px", cursor: "pointer" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ font: "600 14px var(--font-sans)", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.name}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.companyEmail || l.handle || "—"}</div>
                  </div>
                  <span style={{ fontSize: 12.5, color: "var(--muted2, var(--muted))" }}>{l.type || "—"}</span>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>{l.source || l.channel}</span>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>Last: {fmt(l.lastContactAt)}{log.length ? ` · ${log.length}` : ""}</span>
                  <span style={{ justifySelf: "end", display: "inline-flex", alignItems: "center", gap: 6, font: "600 11.5px var(--font-sans)", color: st.color, background: st.color + "22", border: `1px solid ${st.color}55`, borderRadius: 999, padding: "3px 10px", whiteSpace: "nowrap" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: st.color }} />{st.label}
                  </span>
                </div>

                {isOpen && (
                  <div style={{ borderTop: "1px solid var(--divider)", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                    {/* controls */}
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <label style={{ fontSize: 12, color: "var(--muted)" }}>Stage</label>
                      <select value={l.stage || "new"} onChange={(e) => patch(l.id, { stage: e.target.value })} style={input}>
                        {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                      <label style={{ fontSize: 12, color: "var(--muted)", marginLeft: 8 }}>Owner</label>
                      <input defaultValue={l.ownerEmail || ""} placeholder="team member" onBlur={(e) => { if (e.target.value !== (l.ownerEmail || "")) patch(l.id, { ownerEmail: e.target.value }); }} style={{ ...input, width: 150 }} />
                      <label style={{ fontSize: 12, color: "var(--muted)", marginLeft: 8 }}>Next follow-up</label>
                      <input type="date" defaultValue={l.followUpDate ? l.followUpDate.slice(0, 10) : ""} onChange={(e) => patch(l.id, { followUpDate: e.target.value || null })} style={input} />
                    </div>

                    {/* general notes (context) — separate from the dated comms log */}
                    <div>
                      <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 5 }}>Notes <span style={{ opacity: 0.7 }}>(general context — not a dated touchbase)</span></label>
                      <textarea defaultValue={l.notes || ""} onBlur={(e) => { if (e.target.value !== (l.notes || "")) patch(l.id, { notes: e.target.value }); }} placeholder="e.g. competitor, prefers Western accounts, budget under $100…" style={{ ...input, width: "100%", minHeight: 44, resize: "vertical" }} />
                    </div>

                    {/* add comms */}
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
                      <select value={d.channel} onChange={(e) => setDraft((p) => ({ ...p, [l.id]: { ...d, channel: e.target.value } }))} style={input}>
                        {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <textarea placeholder="Log a touchbase — what was said / done…" value={d.body} onChange={(e) => setDraft((p) => ({ ...p, [l.id]: { ...d, body: e.target.value } }))} style={{ ...input, flex: "1 1 320px", minHeight: 40, resize: "vertical" }} />
                      <button onClick={() => logComm(l.id)} disabled={busy === l.id || !d.body.trim()} style={{ font: "600 13px var(--font-sans)", color: "#fff", background: "#0A66C2", border: "none", borderRadius: 8, padding: "9px 16px", cursor: "pointer", opacity: !d.body.trim() ? 0.5 : 1 }}>Log</button>
                    </div>

                    {/* timeline */}
                    {log.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 0, borderLeft: "2px solid var(--divider)", paddingLeft: 14, marginLeft: 4 }}>
                        {log.map((c, i) => (
                          <div key={i} style={{ position: "relative", paddingBottom: i === log.length - 1 ? 0 : 14 }}>
                            <span style={{ position: "absolute", left: -21, top: 4, width: 8, height: 8, borderRadius: "50%", background: "#0A66C2", border: "2px solid var(--card)" }} />
                            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 2 }}>
                              <span style={{ font: "600 11px var(--font-grotesk)", textTransform: "uppercase", letterSpacing: "0.04em", color: "#0A66C2", background: "var(--blue-chip-bg)", borderRadius: 5, padding: "1px 7px" }}>{c.channel}</span>
                              <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{fmt(c.ts)}</span>
                            </div>
                            <div style={{ fontSize: 13.5, color: "var(--text)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{c.body}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12.5, color: "var(--muted)", fontStyle: "italic" }}>No touchbases logged yet.</div>
                    )}

                    {l.message && <div style={{ fontSize: 12.5, color: "var(--muted)" }}><strong style={{ color: "var(--text)" }}>Intake:</strong> {l.message}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
