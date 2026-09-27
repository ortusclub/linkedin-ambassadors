"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { crmOwnerOptions, matchesCrmOwner, ownerKey, type CrmOwner } from "@/lib/crm-owners";

import { PocFilter } from "@/components/admin/poc-filter";

import { INBOUND_TYPES, INBOUND_DESTINATIONS, inboundType, inboundStatuses, matchesInboundStatus, type InboundRouting, type InboundDestination } from "@/lib/inbound-filters";

interface Lead extends InboundRouting {
  id: string;
  ownerEmail: string | null;
  commsLog?: { ts: string; channel: string; direction?: string; authorName?: string; authorEmail?: string; body: string }[] | null;
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

const PLATFORMS = ["Telegram", "Website", "Call booking", "WhatsApp", "Email", "Referral", "Other"];
const TYPES = ["Potential Renter", "Potential Ambassador", "Both", "Other"];
const STATUSES = ["New", "Replied", "In Conversation", "No Response", "Booked Call", "Converted", "Not Interested / Cancelled"];

// status -> palette key
const stKey = (s: string): string => ({
  New: "new", Converted: "new", Replied: "replied",
  "In Conversation": "conv", "Booked Call": "conv",
  "No Response": "none", "Not Interested / Cancelled": "cancel",
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

const blankForm = { ownerEmail: "", name: "", channel: "Website", companyEmail: "", type: "", message: "", status: "New", followUpDate: "", outcome: "", notes: "", firstContactAt: new Date().toISOString().slice(0, 10) };

export function InboundPage({ archive = false }: { archive?: boolean }) {
  const [bookings, setBookings] = useState<{ key: string; leadId: string; scheduledAt: string; cancelled: boolean }[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [owners, setOwners] = useState<CrmOwner[]>([]);
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [error, setError] = useState("");
  const [reply, setReply] = useState<{ id: string; name: string; text: string } | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = useState(false);
  const noteLock = useRef(false);
  const noteRequest = useRef<{ id: string; text: string; requestId: string } | null>(null);
  const addNote = async (id: string) => {
    const text = (noteDrafts[id] || "").trim();
    if (!text || noteLock.current) return;
    noteLock.current = true; setSavingNote(true); setError("");
    if (noteRequest.current?.id !== id || noteRequest.current?.text !== text) noteRequest.current = { id, text, requestId: crypto.randomUUID() };
    try {
      const response = await fetch("/api/admin/inbound/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(noteRequest.current) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save the note.");
      setLeads(prev => prev.map(l => l.id === id ? data.lead : l));
      setNoteDrafts(prev => ({ ...prev, [id]: "" })); noteRequest.current = null;
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save the note. Your draft has been kept."); }
    finally { noteLock.current = false; setSavingNote(false); }
  };
  const [sendingReply, setSendingReply] = useState(false);
  const [replyResult, setReplyResult] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [routingBusy, setRoutingBusy] = useState(false);
  const [filter, setFilter] = useState("all");
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [sheetConfigured, setSheetConfigured] = useState<boolean | null>(null);
  const [syncingBookings, setSyncingBookings] = useState(false);
  const [bookingResult, setBookingResult] = useState("");
  const [copied, setCopied] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ ...blankForm });
  const [saving, setSaving] = useState(false);

  const load = () => fetch(archive ? "/api/admin/inbound/archive" : "/api/admin/inbound").then((r) => r.json()).then((d) => { setLeads((d.leads || []).map((lead: Lead) => ({ ...lead, status: ["not interested", "cancelled"].includes(lead.status.toLowerCase()) ? "Not Interested / Cancelled" : lead.status }))); setOwners(d.owners || []); setBookings(d.bookings || []); }).finally(() => setLoading(false));
  useEffect(() => {
    load();
    if (!archive) fetch("/api/admin/inbound/export-url").then((r) => r.json())
      .then((d) => { setSheetConfigured(!!d.configured); setSheetUrl(d.url || null); })
      .catch(() => setSheetConfigured(false));
  }, [archive]);

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

  const ownerOptions = useMemo(() => crmOwnerOptions(owners, leads).map(o => o.value === "ardi@linkedvelocity.com" ? { ...o, label: "Ardi (ardi@linkedvelocity.com)" } : o), [owners, leads]);
  const ownerLabels = useMemo(() => new Map(ownerOptions.map(o => [o.value, o.label])), [ownerOptions]);
  const ownerLeads = useMemo(() => leads.filter(l => matchesCrmOwner(l.ownerEmail, ownerFilter)), [leads, ownerFilter]);
  const assignOwner = async (id: string, ownerEmail: string) => {
    setAssigning(true); setError("");
    try {
      const response = await fetch("/api/admin/inbound", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ownerEmail: ownerEmail || null }) });
      if (!response.ok) throw new Error("Could not save the LV PoC. Please try again.");
      const data = await response.json();
      setLeads(prev => prev.map(l => l.id === id ? data.lead : l));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save the LV PoC."); }
    finally { setAssigning(false); }
  };

  const typeLeads = useMemo(() => ownerLeads.filter(l => typeFilter === "all" || inboundType(l.channel) === typeFilter), [ownerLeads, typeFilter]);
  const updateDestination = async (lead: Lead, key: InboundDestination) => {
    if (routingBusy || lead[key]) return;
    const destination = key === "addedToAmbassadorPipeline" ? "ambassador" : key === "addedToReferralPipeline" ? "referrer" : "crm";
    let email = lead.companyEmail || "";
    if (destination === "ambassador" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || destination === "referrer" && !email && !lead.handle) {
      const entered = window.prompt("Enter the contact’s email so we can add them to this pipeline:", email);
      if (entered === null) return;
      email = entered.trim();
    }
    setRoutingBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/inbound/route-contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: lead.id, destination, email }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not add the contact.");
      setLeads(prev => prev.map(l => l.id === lead.id ? data.lead : l));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not add the contact."); }
    finally { setRoutingBusy(false); }
  };
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const l of ownerLeads) c[l.status] = (c[l.status] || 0) + 1;
    return c;
  }, [ownerLeads]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ownerLeads.filter((l) => {
      const okS = archive ? filter === "all" || l.status === filter : (typeFilter === "all" || inboundType(l.channel) === typeFilter) && matchesInboundStatus(l, statusFilters);
      const hay = `${l.name} ${l.handle || ""} ${l.companyEmail || ""} ${l.message || ""} ${l.type || ""}`.toLowerCase();
      return okS && (!q || hay.includes(q));
    });
  }, [ownerLeads, query, filter, archive, typeFilter, statusFilters]);

  // keep a valid selection
  useEffect(() => {
    if (loading) return;
    if (!selectedId || !filtered.some((l) => l.id === selectedId)) setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, loading, selectedId]);

  const selected = leads.find((l) => l.id === selectedId) || null;
  const selectedBookings = bookings.filter(booking => booking.leadId === selectedId);
  const meetingTime = (iso: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  const meetingTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const telegramUsername = selected?.channel.toLowerCase() === "telegram" ? (selected.handle || "").replace(/^@/, "") : "";
  const telegramUrl = /^[a-z][a-z0-9_]{3,31}$/i.test(telegramUsername) ? `https://t.me/${telegramUsername}` : null;
  const canBotReply = selected?.channel.toLowerCase() === "telegram" && /^[1-9]\d*$/.test(selected.contact || "");
  const chipStatuses = STATUSES.filter((s) => counts[s] > 0 || s === filter);

  // ── style atoms ──
  const btnPrimary: React.CSSProperties = { font: `600 13px ${F_SANS}`, color: "#fff", background: "var(--btn-primary-bg)", padding: "9px 16px", borderRadius: 10, border: "none", cursor: "pointer" };
  const btnSecondary: React.CSSProperties = { font: `600 13px ${F_SANS}`, color: "var(--btn-secondary-fg)", background: "var(--btn-secondary-bg)", border: "1px solid var(--btn-secondary-border)", padding: "9px 15px", borderRadius: 10, cursor: "pointer" };
  const filterChip = (active: boolean): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 8, font: `600 13px ${F_SANS}`, color: "var(--text)", padding: "8px 14px", borderRadius: 999, cursor: "pointer", border: `1px solid ${active ? "var(--chip-active-border)" : "var(--card-border)"}`, background: active ? "var(--chip-active-bg)" : "transparent" });
  const labelCss: React.CSSProperties = { font: `600 10px ${F_SANS}`, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--label)" };
  const editInput: React.CSSProperties = { font: `500 13.5px ${F_SANS}`, color: "var(--text)", background: "transparent", border: "1px solid transparent", borderRadius: 6, padding: "3px 6px", margin: "-3px -6px", outline: "none", width: "100%" };
  const formInput: React.CSSProperties = { width: "100%", background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: 9, padding: "9px 12px", font: `500 13px ${F_SANS}`, color: "var(--input-fg)", outline: "none" };

  return (
    <div>
      {/* title + actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 22, flexWrap: "wrap" }}>
        <div style={{ maxWidth: 680 }}>
          <h1 style={{ font: `600 30px/1 ${F_GRO}`, color: "var(--text)", margin: "0 0 8px", letterSpacing: "-.02em" }}>{archive ? "Inbound (Archive)" : "Inbound"}</h1>
          <p style={{ font: `500 13.5px/1.5 ${F_SANS}`, color: "var(--muted)", margin: 0 }}>{archive ? "Read-only snapshot of the original inbound table. Changes to Inbound do not change these archived records." : "Everyone who reached out — Telegram and meeting bookings are added automatically. Add other leads manually."}</p>
        </div>
        <div style={{ display: archive ? "none" : "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={btnSecondary} disabled={syncingBookings} onClick={async () => {
            setSyncingBookings(true); setBookingResult("");
            try {
              const response = await fetch("/api/admin/inbound/sync-bookings", { method: "POST" });
              const data = await response.json();
              if (!response.ok) throw new Error(data.error || "Could not sync bookings.");
              setBookingResult(`Bookings synced: ${data.created} new, ${data.updated} updated, ${data.unchanged} unchanged.${data.ambiguous ? ` ${data.ambiguous} skipped because multiple leads share the email.` : ""}`);
              await load();
            } catch (e) { setBookingResult(e instanceof Error ? e.message : "Could not sync bookings."); }
            finally { setSyncingBookings(false); }
          }}>{syncingBookings ? "Syncing…" : "Sync bookings"}</button>
          <button onClick={() => setAdding(true)} style={btnPrimary}>+ Add Lead</button>
          {sheetUrl && <a href={sheetUrl} target="_blank" rel="noopener noreferrer" style={{ ...btnSecondary, textDecoration: "none" }}>Download CSV</a>}
          {sheetUrl && <button onClick={copyFormula} style={btnSecondary}>{copied ? "Copied ✓" : "Copy Sheets formula"}</button>}
        </div>
      </div>

      {bookingResult && <p role="status">{bookingResult}</p>}
      {!archive && <p style={{ fontSize: 12, color: "var(--muted)" }}>Google Calendar bookings sync every 10 minutes, after Google updates its calendar feed.</p>}

      {sheetConfigured === false && (
        <div style={{ font: `500 12px ${F_SANS}`, color: "var(--warn-badge-text)", background: "var(--warn-badge-bg)", borderRadius: 9, padding: "8px 13px", marginBottom: 16 }}>
          Live Sheets export needs <code>RENTALS_EXPORT_KEY</code> set in the environment. (The list below still works.)
        </div>
      )}

      {error && <p role="alert" style={{ color: "var(--delete-color)" }}>{error}</p>}

      <div style={{ marginBottom: 18 }}><PocFilter owners={owners} leads={leads} value={ownerFilter} onChange={setOwnerFilter} /></div>

      {/* pipeline */}
      {archive ? <div style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 16, padding: "18px 22px", marginBottom: 18, boxShadow: "var(--card-shadow)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 13, flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
            <span style={{ font: `600 22px ${F_GRO}`, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{ownerLeads.length}</span>
            <span style={{ font: `600 12px ${F_SANS}`, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--label)" }}>leads in pipeline</span>
          </div>
          <span style={{ font: `500 12px ${F_SANS}`, color: "var(--muted)" }}>{counts["New"] || 0} new · {counts["In Conversation"] || 0} in conversation</span>
        </div>
        {ownerLeads.length > 0 && (
          <div style={{ display: "flex", height: 8, borderRadius: 999, overflow: "hidden", background: "var(--track)", marginBottom: 15 }}>
            {STATUSES.filter((s) => counts[s] > 0).map((s) => (
              <div key={s} style={{ width: `${(counts[s] / ownerLeads.length) * 100}%`, background: `var(--st-${stKey(s)}-fg)` }} />
            ))}
          </div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {[["all", "All", ownerLeads.length] as const, ...chipStatuses.map((s) => [s, s, counts[s] || 0] as const)].map(([val, lbl, n]) => {
            const active = filter === val;
            return (
              <button key={val} onClick={() => setFilter(val)} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 999, border: "1px solid", borderColor: active ? "var(--chip-active-border)" : "var(--card-border)", background: active ? "var(--chip-active-bg)" : "transparent", cursor: "pointer", font: `600 12px ${F_SANS}`, color: "var(--text)" }}>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: val === "all" ? "var(--accent)" : `var(--st-${stKey(val)}-fg)` }} />
                {lbl}<span style={{ color: "var(--muted)" }}>{n}</span>
              </button>
            );
          })}
        </div>
      </div> : <div style={{ marginBottom: 18 }}>
        <div role="group" aria-label="Inbound type filters" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span style={{ ...labelCss, minWidth: 54 }}>Type</span>
          {["all", ...INBOUND_TYPES].map(type => <button key={type} aria-pressed={typeFilter === type} onClick={() => setTypeFilter(type)} style={filterChip(typeFilter === type)}>{type === "all" ? "All" : type} <span style={{ color: "var(--muted)" }}>{type === "all" ? ownerLeads.length : ownerLeads.filter(l => inboundType(l.channel) === type).length}</span></button>)}
        </div>
        <div role="group" aria-label="Inbound stage filters" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <span style={{ ...labelCss, minWidth: 54 }}>Stage</span>
          <button aria-pressed={!statusFilters.length} style={filterChip(!statusFilters.length)} onClick={() => setStatusFilters([])}>All <span style={{ color: "var(--muted)" }}>{typeLeads.length}</span></button>
          {[{ key: "new", label: "New" }, ...INBOUND_DESTINATIONS].map(item => <button key={item.key} aria-pressed={statusFilters.includes(item.key)} style={filterChip(statusFilters.includes(item.key))} onClick={() => setStatusFilters(prev => prev.includes(item.key) ? prev.filter(key => key !== item.key) : [...prev, item.key])}>{item.label} <span style={{ color: "var(--muted)" }}>{typeLeads.filter(l => inboundStatuses(l).includes(item.key)).length}</span></button>)}
        </div>
        <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 0 }}>Select multiple stages to show contacts matching any of them. A contact can be added to all three destinations. New means none have been recorded yet.</p>
      </div>}

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
                    <span style={{ font: `500 11px ${F_SANS}`, color: "var(--muted)" }}>LV PoC: {ownerLabels.get(ownerKey(l.ownerEmail)) || "Unassigned"}</span>
                    <span style={{ font: `500 12px ${F_SANS}`, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.message || l.companyEmail || "—"}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flex: "none" }}>
                    {(archive ? [l.status] : inboundStatuses(l).map(key => key === "new" ? "New" : INBOUND_DESTINATIONS.find(item => item.key === key)!.label)).map(label => <span key={label} style={{ font: `600 10px ${F_SANS}`, padding: "3px 8px", borderRadius: 999, ...stStyle(archive ? l.status : "New") }}>{label}</span>)}
                    <span style={{ font: `500 11px ${F_SANS}`, color: "var(--date-color)" }}>{fmtShort(l.firstContactAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT detail */}
        <fieldset disabled={archive} style={{ border: 0, margin: 0, flex: 1, minWidth: 0, display: "flex", flexDirection: "column", padding: "24px 28px", gap: 22 }}>
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
                      {archive && <select value={selected.type || ""} onChange={(e) => save(selected.id, { type: e.target.value })}
                        style={{ font: `600 11px ${F_SANS}`, padding: "3px 9px", borderRadius: 7, background: "var(--tag-bg)", color: "var(--tag-fg)", border: "none", cursor: "pointer" }}>
                        <option value="">— type —</option>{TYPES.map((t) => <option key={t}>{t}</option>)}
                      </select>}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "none" }}>
                  {archive && <select value={STATUSES.includes(selected.status) ? selected.status : "New"} onChange={(e) => save(selected.id, { status: e.target.value })}
                    style={{ font: `600 12.5px ${F_SANS}`, padding: "7px 14px", borderRadius: 999, whiteSpace: "nowrap", border: "none", cursor: "pointer", ...stStyle(selected.status) }}>
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>}
                  <button onClick={() => del(selected.id)} style={{ font: `600 13px ${F_SANS}`, color: "var(--delete-color)", background: "transparent", border: "none", cursor: "pointer", padding: "6px 4px" }}>Delete</button>
                </div>
              </div>

              {!archive && <div aria-label="Add contact to pipelines" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {INBOUND_DESTINATIONS.map(item => <button key={item.key} aria-pressed={!!selected[item.key]} disabled={routingBusy || !!selected[item.key]} onClick={() => void updateDestination(selected, item.key)} style={{ ...btnSecondary, borderRadius: 999, color: selected[item.key] ? "var(--st-new-fg)" : "var(--text)", background: selected[item.key] ? "var(--st-new-bg)" : "var(--card)", opacity: routingBusy ? .6 : 1 }}>{selected[item.key] ? `✓ ${item.label}` : item.key === "addedToAmbassadorPipeline" ? "Add to Ambassador Pipeline" : item.key === "addedToReferralPipeline" ? "Add to Referrers" : "Add to Client CRM"}</button>)}
              </div>}
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={labelCss}>LV PoC — person handling this contact</span>
                <select aria-label="Lead LV PoC" value={ownerKey(selected.ownerEmail)} disabled={assigning} onChange={e => void assignOwner(selected.id, e.target.value)} style={formInput}>
                  <option value="">Unassigned</option>{ownerOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>

              {selected.channel.toLowerCase() === "telegram" && <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button style={btnPrimary} disabled={!canBotReply} title={canBotReply ? "Reply through the LinkedVelocity Telegram bot" : "No saved private bot chat"} onClick={() => { setReplyResult(""); setReply({ id: selected.id, name: selected.handle || selected.name, text: "Hi! Thanks for contacting LinkedVelocity. Are you looking to rent accounts, earn from your own account, become a referral partner, or get support? Let us know what you need and our team will help." }); }}>Reply on Telegram</button>
                {telegramUrl && <a href={telegramUrl} target="_blank" rel="noopener noreferrer" style={{ ...btnSecondary, textDecoration: "none" }}>Open Telegram ↗</a>}
              </div>}
              {replyResult && <p role="status">{replyResult}</p>}

              <div style={{ padding: "14px 16px", border: "1px solid var(--card-border)", borderRadius: 10 }}>
                <div style={labelCss}>Meeting booked for</div>
                {selectedBookings.length ? <>
                  {selectedBookings.map(booking => <div key={booking.key} style={{ marginTop: 8, color: booking.cancelled ? "var(--muted)" : "var(--text)" }}>
                    <time dateTime={booking.scheduledAt}>{meetingTime(booking.scheduledAt)}</time>{booking.cancelled && <span> · Cancelled</span>}
                  </div>)}
                  <small style={{ color: "var(--muted)" }}>Times shown in {meetingTimezone}. Updated from the meeting scheduler.</small>
                </> : <p style={{ margin: "8px 0 0", color: "var(--muted)" }}>Not available — no calendar booking linked to this contact yet.</p>}
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

              {!!selected.commsLog?.some(entry => entry.channel !== "note") && <details><summary style={{ cursor: "pointer", ...labelCss }}>Conversation history</summary>
                {selected.commsLog!.filter(entry => entry.channel !== "note").map((entry, i) => <div key={`${entry.ts}-${i}`} style={{ padding: "10px 0", borderBottom: "1px solid var(--divider)" }}><small>{entry.direction === "outbound" ? "Team sent" : "Received / logged"} · {entry.channel} · {fmtShort(entry.ts)}</small><p style={{ whiteSpace: "pre-wrap", margin: "5px 0" }}>{entry.body}</p></div>)}
              </details>}

              {/* notes */}
              <div>
                <div style={{ ...labelCss, marginBottom: 8 }}>Notes</div>
                {selected.notes && <div style={{ padding: 12, background: "var(--quote-bg)", borderRadius: 9, marginBottom: 10 }}><small>Previous notes · author and time not recorded</small><p style={{ whiteSpace: "pre-wrap" }}>{selected.notes}</p></div>}
                {(selected.commsLog || []).filter(entry => entry.channel === "note").map((entry, i) => <div key={`${entry.ts}-${i}`} style={{ padding: 12, borderBottom: "1px solid var(--divider)" }}>
                  <small>{entry.authorName || entry.authorEmail || "Author not recorded"} · {new Date(entry.ts).toLocaleString()}</small>
                  <p style={{ whiteSpace: "pre-wrap", margin: "5px 0" }}>{entry.body}</p>
                </div>)}
                <textarea aria-label="Add a note" value={noteDrafts[selected.id] || ""} disabled={savingNote} placeholder="Add a note… Enter to save, Shift+Enter for a new line" maxLength={10000} onChange={e => setNoteDrafts(prev => ({ ...prev, [selected.id]: e.target.value }))} onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void addNote(selected.id); }
                }} rows={2} style={{ ...formInput, marginTop: 10, resize: "vertical" }} />
                <button style={{ ...btnPrimary, marginTop: 8 }} disabled={savingNote || !(noteDrafts[selected.id] || "").trim()} onClick={() => void addNote(selected.id)}>{savingNote ? "Adding…" : "Add note"}</button>
                <span style={{ marginLeft: 10, fontSize: 12, color: "var(--muted)" }}>Enter to save · Shift+Enter for a new line</span>
              </div>

              <div style={{ marginTop: "auto", font: `500 11.5px ${F_SANS}`, color: "var(--muted)" }}>{archive ? "Archived snapshot — open Inbound to edit contacts." : "Fields save automatically. Press Enter or Add note to save a new note."}</div>
            </div>
          )}
        </fieldset>
      </div>

      {reply && <div role="dialog" aria-modal="true" aria-label="Reply on Telegram" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 60 }}>
        <div style={{ width: 620, maxWidth: "100%", background: "var(--card)", borderRadius: 16, padding: 24 }}>
          <h2>Reply to {reply.name}</h2><p>This sends from the LinkedVelocity Telegram bot into their existing bot conversation.</p>
          <textarea aria-label="Telegram reply message" rows={8} maxLength={4096} value={reply.text} disabled={sendingReply} onChange={e => setReply({ ...reply, text: e.target.value })} style={formInput} />
          {replyResult && <p role="status">{replyResult}</p>}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button disabled={sendingReply} style={btnSecondary} onClick={() => setReply(null)}>Cancel</button>
            <button disabled={sendingReply || !reply.text.trim()} style={btnPrimary} onClick={async () => {
              setSendingReply(true); setReplyResult("");
              try {
                const response = await fetch("/api/admin/inbound/telegram", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: reply.id, text: reply.text }) });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || "Could not send the message.");
                setReplyResult(data.warning || "Telegram message sent."); setReply(null);
                await load().catch(() => setReplyResult("Message sent. Refresh to update the conversation history."));
              } catch (e) { setReplyResult(e instanceof Error ? e.message : "Could not confirm delivery. Check the conversation before retrying."); }
              finally { setSendingReply(false); }
            }}>{sendingReply ? "Sending…" : "Send Telegram message"}</button>
          </div>
        </div>
      </div>}

      {/* add-lead modal */}
      {adding && (
        <div onClick={() => setAdding(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "6vh 16px", zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 620, maxWidth: "100%", background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 16, padding: 24, maxHeight: "88vh", overflowY: "auto", boxShadow: "0 20px 60px -20px rgba(0,0,0,.6)" }}>
            <h2 style={{ font: `600 18px ${F_GRO}`, color: "var(--text)", margin: "0 0 16px" }}>Add a lead</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={{ gridColumn: "1 / -1", ...labelCss }}>Name / Username *<input style={{ ...formInput, marginTop: 5 }} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="@username or name" /></label>
              <label style={labelCss}>LV PoC<select style={{ ...formInput, marginTop: 5 }} value={form.ownerEmail} onChange={e => setForm({ ...form, ownerEmail: e.target.value })}><option value="">Unassigned</option>{ownerOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
              <label style={labelCss}>Type / source<select style={{ ...formInput, marginTop: 5 }} value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>{PLATFORMS.map((p) => <option key={p}>{p}</option>)}</select></label>
              <label style={labelCss}>Date<input type="date" style={{ ...formInput, marginTop: 5 }} value={form.firstContactAt} onChange={(e) => setForm({ ...form, firstContactAt: e.target.value })} /></label>
              <label style={labelCss}>Company / Email<input style={{ ...formInput, marginTop: 5 }} value={form.companyEmail} onChange={(e) => setForm({ ...form, companyEmail: e.target.value })} /></label>
              <label style={labelCss}>Interest<select style={{ ...formInput, marginTop: 5 }} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="">—</option>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
              <div style={labelCss}>Status: New</div>
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
