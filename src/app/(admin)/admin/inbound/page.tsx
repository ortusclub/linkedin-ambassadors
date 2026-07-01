"use client";

import { useEffect, useMemo, useState } from "react";

interface Lead {
  id: string;
  channel: string;
  name: string;
  handle: string | null;
  contact: string | null;
  companyEmail: string | null;
  type: string | null;
  message: string | null;
  status: string;
  replied: boolean;
  followUpDate: string | null;
  outcome: string | null;
  notes: string | null;
  firstContactAt: string;
}

const F_SANS = "var(--font-sans),system-ui,sans-serif";
const F_GRO = "var(--font-grotesk),system-ui,sans-serif";

const PLATFORMS = ["Telegram", "Website", "Call booking", "WhatsApp", "Email", "Other"];
const TYPES = ["Potential Renter", "Potential Ambassador", "Both", "Other"];
const STATUSES = ["New", "Replied", "In Conversation", "No Response", "Booked Call", "Converted", "Not Interested", "Cancelled"];

// status -> palette key
const stKey = (s: string): string => ({
  New: "new", Converted: "new", Replied: "replied",
  "In Conversation": "conv", "Booked Call": "conv",
  "No Response": "none", "Not Interested": "none", Cancelled: "cancel",
} as Record<string, string>)[s] || "none";
const stStyle = (s: string): React.CSSProperties => ({ background: `var(--st-${stKey(s)}-bg)`, color: `var(--st-${stKey(s)}-fg)` });

const pfKey = (channel: string) => (channel === "telegram" ? "tg" : "web");
const platformLabel = (c: string) =>
  c === "telegram" ? "Telegram" : c === "website" ? "Website" : c === "call" ? "Call booking" : c === "whatsapp" ? "WhatsApp" : c === "email" ? "Email" : (c || "Other");

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtShort = (iso: string | null) => { if (!iso) return "—"; const d = new Date(iso); return `${MON[d.getMonth()]} ${d.getDate()}`; };
const fmtFull = (iso: string | null) => { if (!iso) return "—"; const d = new Date(iso); return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`; };
const dInput = (s: string | null) => (s ? new Date(s).toISOString().slice(0, 10) : "");
const initial = (s: string) => (s || "?").replace(/^@/, "").trim().charAt(0).toUpperCase() || "?";

const blankForm = { name: "", channel: "Website", companyEmail: "", type: "", message: "", status: "New", followUpDate: "", outcome: "", notes: "", firstContactAt: new Date().toISOString().slice(0, 10) };

export default function AdminInboundPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [sheetConfigured, setSheetConfigured] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ ...blankForm });
  const [saving, setSaving] = useState(false);

  const load = () => fetch("/api/admin/inbound").then((r) => r.json()).then((d) => setLeads(d.leads || [])).finally(() => setLoading(false));
  useEffect(() => {
    load();
    fetch("/api/admin/inbound/export-url").then((r) => r.json())
      .then((d) => { setSheetConfigured(!!d.configured); setSheetUrl(d.url || null); })
      .catch(() => setSheetConfigured(false));
  }, []);

  const save = async (id: string, patch: Record<string, unknown>) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    await fetch("/api/admin/inbound", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...patch }) });
  };
  const addLead = async () => {
    if (!form.name.trim() || saving) return;
    setSaving(true);
    const res = await fetch("/api/admin/inbound", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    if (res.ok) { setAdding(false); setForm({ ...blankForm }); load(); }
  };
  const del = async (id: string) => {
    if (!confirm("Delete this lead?")) return;
    setLeads((prev) => prev.filter((l) => l.id !== id));
    if (selectedId === id) setSelectedId(null);
    await fetch(`/api/admin/inbound?id=${id}`, { method: "DELETE" });
  };
  const copyFormula = () => { if (!sheetUrl) return; navigator.clipboard.writeText(`=IMPORTDATA("${sheetUrl}")`); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const l of leads) c[l.status] = (c[l.status] || 0) + 1;
    return c;
  }, [leads]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      const okS = filter === "all" || l.status === filter;
      const hay = `${l.name} ${l.handle || ""} ${l.companyEmail || ""} ${l.message || ""} ${l.type || ""}`.toLowerCase();
      return okS && (!q || hay.includes(q));
    });
  }, [leads, query, filter]);

  // keep a valid selection
  useEffect(() => {
    if (loading) return;
    if (!selectedId || !filtered.some((l) => l.id === selectedId)) setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, loading, selectedId]);

  const selected = leads.find((l) => l.id === selectedId) || null;
  const chipStatuses = STATUSES.filter((s) => counts[s] > 0);

  // ── style atoms ──
  const btnPrimary: React.CSSProperties = { font: `600 13px ${F_SANS}`, color: "#fff", background: "var(--btn-primary-bg)", padding: "9px 16px", borderRadius: 10, border: "none", cursor: "pointer" };
  const btnSecondary: React.CSSProperties = { font: `600 13px ${F_SANS}`, color: "var(--btn-secondary-fg)", background: "var(--btn-secondary-bg)", border: "1px solid var(--btn-secondary-border)", padding: "9px 15px", borderRadius: 10, cursor: "pointer" };
  const labelCss: React.CSSProperties = { font: `600 10px ${F_SANS}`, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--label)" };
  const editInput: React.CSSProperties = { font: `500 13.5px ${F_SANS}`, color: "var(--text)", background: "transparent", border: "1px solid transparent", borderRadius: 6, padding: "3px 6px", margin: "-3px -6px", outline: "none", width: "100%" };
  const formInput: React.CSSProperties = { width: "100%", background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: 9, padding: "9px 12px", font: `500 13px ${F_SANS}`, color: "var(--input-fg)", outline: "none" };

  return (
    <div>
      {/* title + actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 22, flexWrap: "wrap" }}>
        <div style={{ maxWidth: 680 }}>
          <h1 style={{ font: `600 30px/1 ${F_GRO}`, color: "var(--text)", margin: "0 0 8px", letterSpacing: "-.02em" }}>Inbound Leads</h1>
          <p style={{ font: `500 13.5px/1.5 ${F_SANS}`, color: "var(--muted)", margin: 0 }}>Everyone who reached out — Telegram logs automatically; add the rest (website, calls, referrals) manually. One source of truth, exportable to your sheet.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => setAdding(true)} style={btnPrimary}>+ Add Lead</button>
          {sheetUrl && <a href={sheetUrl} target="_blank" rel="noopener noreferrer" style={{ ...btnSecondary, textDecoration: "none" }}>Download CSV</a>}
          {sheetUrl && <button onClick={copyFormula} style={btnSecondary}>{copied ? "Copied ✓" : "Copy Sheets formula"}</button>}
        </div>
      </div>

      {sheetConfigured === false && (
        <div style={{ font: `500 12px ${F_SANS}`, color: "var(--warn-badge-text)", background: "var(--warn-badge-bg)", borderRadius: 9, padding: "8px 13px", marginBottom: 16 }}>
          Live Sheets export needs <code>RENTALS_EXPORT_KEY</code> set in the environment. (The list below still works.)
        </div>
      )}

      {/* pipeline */}
      <div style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 16, padding: "18px 22px", marginBottom: 18, boxShadow: "var(--card-shadow)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 13, flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
            <span style={{ font: `600 22px ${F_GRO}`, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{leads.length}</span>
            <span style={{ font: `600 12px ${F_SANS}`, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--label)" }}>leads in pipeline</span>
          </div>
          <span style={{ font: `500 12px ${F_SANS}`, color: "var(--muted)" }}>{counts["New"] || 0} new · {counts["In Conversation"] || 0} in conversation</span>
        </div>
        {leads.length > 0 && (
          <div style={{ display: "flex", height: 8, borderRadius: 999, overflow: "hidden", background: "var(--track)", marginBottom: 15 }}>
            {STATUSES.filter((s) => counts[s] > 0).map((s) => (
              <div key={s} style={{ width: `${(counts[s] / leads.length) * 100}%`, background: `var(--st-${stKey(s)}-fg)` }} />
            ))}
          </div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {[["all", "All", leads.length] as const, ...chipStatuses.map((s) => [s, s, counts[s]] as const)].map(([val, lbl, n]) => {
            const active = filter === val;
            return (
              <button key={val} onClick={() => setFilter(val)} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 999, border: "1px solid", borderColor: active ? "var(--chip-active-border)" : "var(--card-border)", background: active ? "var(--chip-active-bg)" : "transparent", cursor: "pointer", font: `600 12px ${F_SANS}`, color: "var(--text)" }}>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: val === "all" ? "var(--accent)" : `var(--st-${stKey(val)}-fg)` }} />
                {lbl}<span style={{ color: "var(--muted)" }}>{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* two-pane inbox */}
      <div style={{ display: "flex", background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 16, overflow: "hidden", boxShadow: "var(--card-shadow)", minHeight: 560 }}>
        {/* LEFT list */}
        <div style={{ width: 440, flex: "none", display: "flex", flexDirection: "column", borderRight: "1px solid var(--divider)" }}>
          <div style={{ padding: "15px 16px", borderBottom: "1px solid var(--divider)" }}>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email or message…"
              style={{ width: "100%", background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: 9, padding: "9px 12px", font: `500 13px ${F_SANS}`, color: "var(--input-fg)", outline: "none" }} />
          </div>
          <div style={{ flex: 1, overflowY: "auto", maxHeight: 620 }}>
            {loading && <div style={{ padding: 24, font: `500 13px ${F_SANS}`, color: "var(--muted)" }}>Loading…</div>}
            {!loading && filtered.length === 0 && <div style={{ padding: 24, font: `500 13px ${F_SANS}`, color: "var(--muted)", textAlign: "center" }}>No leads match.</div>}
            {filtered.map((l) => {
              const sel = l.id === selectedId;
              return (
                <div key={l.id} onClick={() => setSelectedId(l.id)}
                  style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 14px 12px 13px", borderLeft: "3px solid", borderLeftColor: sel ? "var(--accent)" : "transparent", borderBottom: "1px solid var(--divider)", cursor: "pointer", background: sel ? "var(--row-selected-bg)" : "transparent" }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", font: `600 13px ${F_GRO}`, background: `var(--pf-${pfKey(l.channel)}-bg)`, color: `var(--pf-${pfKey(l.channel)}-fg)` }}>{initial(l.handle || l.name)}</div>
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ font: `600 13.5px ${F_SANS}`, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.handle || l.name}</span>
                      <span style={{ font: `600 9px ${F_SANS}`, letterSpacing: ".04em", textTransform: "uppercase", padding: "2px 6px", borderRadius: 5, flex: "none", background: `var(--pf-${pfKey(l.channel)}-bg)`, color: `var(--pf-${pfKey(l.channel)}-fg)` }}>{platformLabel(l.channel)}</span>
                    </div>
                    <span style={{ font: `500 12px ${F_SANS}`, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.message || l.companyEmail || "—"}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flex: "none" }}>
                    <span style={{ font: `600 10px ${F_SANS}`, padding: "3px 8px", borderRadius: 999, whiteSpace: "nowrap", ...stStyle(l.status) }}>{l.status}</span>
                    <span style={{ font: `500 11px ${F_SANS}`, color: "var(--date-color)" }}>{fmtShort(l.firstContactAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT detail */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", padding: "24px 28px", gap: 22 }}>
          {!selected ? (
            <div style={{ margin: "auto", font: `500 14px ${F_SANS}`, color: "var(--muted)" }}>Select a lead to see the details.</div>
          ) : (
            <div key={selected.id} style={{ display: "flex", flexDirection: "column", gap: 22, height: "100%" }}>
              {/* header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 14, alignItems: "center", minWidth: 0 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 13, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", font: `600 19px ${F_GRO}`, background: `var(--pf-${pfKey(selected.channel)}-bg)`, color: `var(--pf-${pfKey(selected.channel)}-fg)` }}>{initial(selected.handle || selected.name)}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                      <span style={{ font: `600 20px ${F_GRO}`, color: "var(--text)", letterSpacing: "-.01em" }}>{selected.handle || selected.name}</span>
                      <span style={{ font: `600 9.5px ${F_SANS}`, letterSpacing: ".04em", textTransform: "uppercase", padding: "3px 8px", borderRadius: 6, background: `var(--pf-${pfKey(selected.channel)}-bg)`, color: `var(--pf-${pfKey(selected.channel)}-fg)` }}>{platformLabel(selected.channel)}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                      {selected.handle && selected.name && selected.handle !== selected.name && <span style={{ font: `500 13px ${F_SANS}`, color: "var(--muted)" }}>{selected.name}</span>}
                      <select value={selected.type || ""} onChange={(e) => save(selected.id, { type: e.target.value })}
                        style={{ font: `600 11px ${F_SANS}`, padding: "3px 9px", borderRadius: 7, background: "var(--tag-bg)", color: "var(--tag-fg)", border: "none", cursor: "pointer" }}>
                        <option value="">— type —</option>{TYPES.map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "none" }}>
                  <select value={STATUSES.includes(selected.status) ? selected.status : "New"} onChange={(e) => save(selected.id, { status: e.target.value })}
                    style={{ font: `600 12.5px ${F_SANS}`, padding: "7px 14px", borderRadius: 999, whiteSpace: "nowrap", border: "none", cursor: "pointer", ...stStyle(selected.status) }}>
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                  <button onClick={() => del(selected.id)} style={{ font: `600 13px ${F_SANS}`, color: "var(--delete-color)", background: "transparent", border: "none", cursor: "pointer", padding: "6px 4px" }}>Delete</button>
                </div>
              </div>

              {/* meta grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "18px 26px", padding: "20px 0", borderTop: "1px solid var(--divider)", borderBottom: "1px solid var(--divider)" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={labelCss}>Date added</span>
                  <input type="date" defaultValue={dInput(selected.firstContactAt)} onBlur={(e) => e.target.value && save(selected.id, { firstContactAt: e.target.value })} style={editInput} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
                  <span style={labelCss}>Company / Email</span>
                  <input defaultValue={selected.companyEmail || ""} placeholder="—" onBlur={(e) => save(selected.id, { companyEmail: e.target.value.trim() })} style={editInput} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={labelCss}>Follow-up</span>
                  <input type="date" defaultValue={dInput(selected.followUpDate)} onBlur={(e) => save(selected.id, { followUpDate: e.target.value || null })} style={editInput} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={labelCss}>Outcome</span>
                  <input defaultValue={selected.outcome || ""} placeholder="—" onBlur={(e) => save(selected.id, { outcome: e.target.value.trim() })} style={editInput} />
                </div>
              </div>

              {/* message */}
              <div>
                <div style={{ ...labelCss, marginBottom: 8 }}>Use case / message</div>
                <textarea defaultValue={selected.message || ""} placeholder="—" onBlur={(e) => save(selected.id, { message: e.target.value })} rows={2}
                  style={{ width: "100%", resize: "vertical", font: `500 14px/1.5 ${F_SANS}`, color: "var(--text2)", background: "var(--quote-bg)", borderLeft: "3px solid var(--accent)", border: "none", borderLeftWidth: 3, borderLeftStyle: "solid", borderLeftColor: "var(--accent)", padding: "13px 16px", borderRadius: "0 9px 9px 0", outline: "none" }} />
              </div>

              {/* notes */}
              <div>
                <div style={{ ...labelCss, marginBottom: 8 }}>Notes</div>
                <textarea defaultValue={selected.notes || ""} placeholder="Add a note…" onBlur={(e) => save(selected.id, { notes: e.target.value })} rows={2}
                  style={{ width: "100%", resize: "vertical", font: `500 13.5px/1.5 ${F_SANS}`, color: "var(--text2)", background: "var(--quote-bg)", border: "none", padding: "13px 16px", borderRadius: 9, outline: "none" }} />
              </div>

              <div style={{ marginTop: "auto", font: `500 11.5px ${F_SANS}`, color: "var(--muted)" }}>Click any field to edit — changes save automatically.</div>
            </div>
          )}
        </div>
      </div>

      {/* add-lead modal */}
      {adding && (
        <div onClick={() => setAdding(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "6vh 16px", zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 620, maxWidth: "100%", background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 16, padding: 24, maxHeight: "88vh", overflowY: "auto", boxShadow: "0 20px 60px -20px rgba(0,0,0,.6)" }}>
            <h2 style={{ font: `600 18px ${F_GRO}`, color: "var(--text)", margin: "0 0 16px" }}>Add a lead</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={{ gridColumn: "1 / -1", ...labelCss }}>Name / Username *<input style={{ ...formInput, marginTop: 5 }} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="@username or name" /></label>
              <label style={labelCss}>Platform<select style={{ ...formInput, marginTop: 5 }} value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>{PLATFORMS.map((p) => <option key={p}>{p}</option>)}</select></label>
              <label style={labelCss}>Date<input type="date" style={{ ...formInput, marginTop: 5 }} value={form.firstContactAt} onChange={(e) => setForm({ ...form, firstContactAt: e.target.value })} /></label>
              <label style={labelCss}>Company / Email<input style={{ ...formInput, marginTop: 5 }} value={form.companyEmail} onChange={(e) => setForm({ ...form, companyEmail: e.target.value })} /></label>
              <label style={labelCss}>Type<select style={{ ...formInput, marginTop: 5 }} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="">—</option>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
              <label style={labelCss}>Status<select style={{ ...formInput, marginTop: 5 }} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
              <label style={labelCss}>Follow-up date<input type="date" style={{ ...formInput, marginTop: 5 }} value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} /></label>
              <label style={{ gridColumn: "1 / -1", ...labelCss }}>Use case / message<textarea rows={2} style={{ ...formInput, marginTop: 5, resize: "vertical" }} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></label>
              <label style={labelCss}>Outcome<input style={{ ...formInput, marginTop: 5 }} value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })} /></label>
              <label style={labelCss}>Notes<input style={{ ...formInput, marginTop: 5 }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button disabled={saving || !form.name.trim()} onClick={addLead} style={{ ...btnPrimary, opacity: saving || !form.name.trim() ? 0.5 : 1 }}>{saving ? "Saving…" : "Save lead"}</button>
              <button onClick={() => { setAdding(false); setForm({ ...blankForm }); }} style={btnSecondary}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
