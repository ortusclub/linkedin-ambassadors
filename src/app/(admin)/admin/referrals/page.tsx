"use client";

import { useEffect, useMemo, useState } from "react";

// A single ambassador application, reduced to what the referral roll-up needs.
interface App {
  referredBy: string | null;
  status: string;
}

interface Referrer { id: string; slug: string; token: string; name: string; type: string; channel: string | null; assignedDay: string | null; assignedLocation: string | null; contactMethod: string | null; contactHandle: string | null; paymentMethod: string | null; paymentDetails: string | null; }

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
  const [referrers, setReferrers] = useState<Referrer[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [linksOpen, setLinksOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", type: "marketer", channel: "", assignedDay: "", assignedLocation: "" });
  const [creating, setCreating] = useState(false);
  const [copiedKey, setCopiedKey] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [dForm, setDForm] = useState({ contactMethod: "WhatsApp", contactHandle: "", paymentMethod: "GCash", paymentDetails: "" });
  const [dSaving, setDSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/ambassadors").then((r) => r.json()).then((d) => setApps(d.applications || [])).finally(() => setLoading(false));
    fetch("/api/admin/referrers").then((r) => r.json()).then((d) => setReferrers(d.referrers || [])).catch(() => {});
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

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const refLink = (r: Referrer) => `${origin}/become-ambassador?ref=${r.slug}`;
  const portalLink = (r: Referrer) => `${origin}/m/${r.token}`;
  const printFlyers = () => {
    if (!referrers.length) return;
    const win = window.open("", "_blank");
    if (!win) return;
    const flyers = referrers.map((r) => {
      const link = `${origin}/r/${r.slug}`;
      const shortLink = link.replace(/^https?:\/\//, "");
      const qr = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=0&data=${encodeURIComponent(link)}`;
      return `<div class="sheet"><div class="top"><div class="wm">&#10022; LinkedVelocity</div><div class="badge">For students &amp; professionals</div><h2>Get paid for your <span>LinkedIn</span></h2><p>Earn every month just by lending us your account. It stays yours &mdash; take it back anytime.</p></div><div class="body"><div class="benefits"><div class="b"><b>&#8369;1,000</b><span>to start</span></div><div class="b feat"><b>&#8369;500</b><span>every month</span></div><div class="b"><b>&#8776;&#8369;7,000</b><span>first year</span></div></div><div class="wt">Why people say yes</div><div class="wl"><div><i>&#10003;</i><span>Your <b>name &amp; photo never change</b> &mdash; it stays your profile</span></div><div><i>&#10003;</i><span>You keep <b>full access</b> &mdash; check your account anytime and see how it's used</span></div><div><i>&#10003;</i><span><b>Take it back anytime</b>, cancel anytime &mdash; no penalties</span></div><div><i>&#10003;</i><span>We only work with <b>vetted, legitimate businesses</b></span></div><div><i>&#10003;</i><span>Your <b>password is never shared</b> with anyone</span></div><div><i>&#10003;</i><span><b>Start with one &mdash; add more accounts</b> (yours or family's) to earn even more</span></div></div><div class="qrwrap"><img class="qr" src="${qr}" alt="QR"/><div class="qrt"><div class="lead">Scan to sign up</div><div class="or">&hellip; or just type this link:</div><div class="url">${shortLink}</div><div class="code">Referred by <b>${r.name}</b> &middot; code <b>${r.slug}</b></div></div></div></div><div class="bot">18+ &middot; any LinkedIn account &mdash; new is fine &middot; students welcome</div></div>`;
    }).join("");
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Field Day Flyers</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0F1419}.sheet{width:148mm;min-height:210mm;margin:0 auto;display:flex;flex-direction:column;page-break-after:always;overflow:hidden}.top{background:linear-gradient(155deg,#00A150,#0B6B3A);color:#fff;padding:24px 26px 28px;text-align:center}.wm{font-size:13.5px;font-weight:800;opacity:.96;margin-bottom:13px}.badge{display:inline-block;font-size:11px;font-weight:700;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.28);padding:4px 11px;border-radius:999px;margin-bottom:13px}.top h2{font-size:34px;line-height:1.06;font-weight:800;letter-spacing:-.02em}.top h2 span{color:#B9F5CF}.top p{margin:11px auto 0;font-size:14px;line-height:1.5;opacity:.95;max-width:33ch}.body{flex:1;padding:20px 26px 14px;display:flex;flex-direction:column}.benefits{display:flex;gap:10px;margin-bottom:18px}.b{flex:1;text-align:center;border:1px solid #E2E8F0;border-radius:13px;padding:13px 5px}.b.feat{border:1.5px solid #00A150;background:#F1FBF5}.b b{display:block;font-size:21px;color:#0B6B3A;font-weight:800}.b span{font-size:11px;color:#64748B}.wt{font-size:11.5px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#00A150;margin-bottom:10px}.wl div{display:flex;gap:9px;font-size:13px;line-height:1.45;color:#37424F;margin-bottom:8px}.wl i{color:#00A150;font-weight:800;font-style:normal;flex:none}.qrwrap{display:flex;align-items:center;gap:15px;background:#E7F6EE;border:1px solid #C9EED8;border-radius:16px;padding:15px;margin-top:auto}.qr{width:128px;height:128px;flex:none;background:#fff;border-radius:11px;padding:7px}.qrt .lead{font-size:19px;font-weight:800;color:#0B6B3A}.qrt .or{font-size:12px;color:#3f7d5a;margin-top:6px}.qrt .url{font-size:15px;font-weight:800;color:#0F1419;margin-top:2px;word-break:break-all}.qrt .code{font-size:12px;color:#537a64;margin-top:8px}.bot{background:#0B2018;color:#B7D4C4;text-align:center;font-size:11px;padding:11px}@page{size:A5;margin:0}</style></head><body>${flyers}<script>window.addEventListener('load',function(){setTimeout(function(){window.print();},350);});</script></body></html>`);
    win.document.close();
  };
  // Compact, ink-light cards — 6 per A4 page, one full page of cuttable cards per marketer.
  const printCards = () => {
    if (!referrers.length) return;
    const win = window.open("", "_blank");
    if (!win) return;
    const card = (r: Referrer) => {
      const link = `${origin}/r/${r.slug}`;
      const shortLink = link.replace(/^https?:\/\//, "");
      const qr = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=0&data=${encodeURIComponent(link)}`;
      return `<div class="card"><div class="brand">LinkedVelocity</div><div class="h">Get paid for your LinkedIn</div><div class="mid"><img class="qr" src="${qr}" alt="QR"/><div class="mt"><div class="pay">&#8369;1,000 to start<br>then &#8369;500 / month</div><div class="safe">It stays yours &mdash; take it back anytime. Add more accounts to earn more.</div></div></div><div class="url">Scan, or go to <b>${shortLink}</b></div><div class="ask">Ask <b>${r.name}</b> &middot; code <b>${r.slug}</b></div></div>`;
    };
    const pages = referrers.map((r) => `<div class="page">${card(r).repeat(6)}</div>`).join("");
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Field Day Cards</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0F1419}.page{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(3,1fr);gap:5mm;width:194mm;height:281mm;margin:0 auto;page-break-after:always}.card{border:1px dashed #9aa3b2;border-radius:9px;padding:9px 12px;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden}.brand{font-size:10px;font-weight:800;letter-spacing:.02em}.h{font-size:15px;font-weight:800;line-height:1.1;margin-top:2px}.mid{display:flex;gap:9px;align-items:center;margin:7px 0}.qr{width:32mm;height:32mm;flex:none}.mt .pay{font-size:13.5px;font-weight:800;line-height:1.2}.mt .safe{font-size:10px;line-height:1.35;color:#37424F;margin-top:5px}.url{font-size:9.5px;text-align:center;word-break:break-all;color:#334155}.url b{color:#000}.ask{font-size:9.5px;text-align:center;margin-top:3px;color:#334155}.ask b{color:#000}@page{size:A4;margin:8mm}</style></head><body>${pages}<script>window.addEventListener('load',function(){setTimeout(function(){window.print();},350);});</script></body></html>`);
    win.document.close();
  };
  const copy = (key: string, text: string) => { navigator.clipboard?.writeText(text); setCopiedKey(key); setTimeout(() => setCopiedKey(""), 1500); };
  const addReferrer = async () => {
    if (!addForm.name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/referrers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(addForm) });
      if (res.ok) { const d = await res.json(); setReferrers((prev) => [d.referrer, ...prev]); setAddForm({ name: "", type: "marketer", channel: "", assignedDay: "", assignedLocation: "" }); setShowAdd(false); }
    } finally { setCreating(false); }
  };
  const openDetails = (r: Referrer) => {
    if (detailId === r.id) { setDetailId(null); return; }
    setDForm({ contactMethod: r.contactMethod || "WhatsApp", contactHandle: r.contactHandle || "", paymentMethod: r.paymentMethod || "GCash", paymentDetails: r.paymentDetails || "" });
    setDetailId(r.id);
  };
  const saveDetails = async (r: Referrer) => {
    setDSaving(true);
    try {
      const res = await fetch(`/api/admin/referrers/${r.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dForm) });
      if (res.ok) { setReferrers((prev) => prev.map((x) => (x.id === r.id ? { ...x, ...dForm } : x))); setDetailId(null); }
    } finally { setDSaving(false); }
  };
  const deleteReferrer = async (r: Referrer) => {
    if (!confirm(`Remove ${r.name}? Their QR/portal links stop working.`)) return;
    setReferrers((prev) => prev.filter((x) => x.id !== r.id));
    try { await fetch(`/api/admin/referrers/${r.id}`, { method: "DELETE" }); } catch {}
  };

  const label: React.CSSProperties = { font: `700 10.5px ${F_SANS}`, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--label)" };
  const th: React.CSSProperties = { font: `700 10px ${F_SANS}`, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--label)" };
  const chip = (active: boolean): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 13px", borderRadius: 999, cursor: "pointer", font: `600 12.5px ${F_SANS}`, color: "var(--text)", border: "1px solid", borderColor: active ? "var(--chip-active-border)" : "var(--card-border)", background: active ? "var(--chip-active-bg)" : "transparent" });
  const inpStyle: React.CSSProperties = { background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: 8, padding: "9px 11px", font: `500 12.5px ${F_SANS}`, color: "var(--input-fg)", outline: "none" };
  const copyBtn: React.CSSProperties = { font: `600 11.5px ${F_SANS}`, color: "var(--btn-secondary-fg)", background: "var(--btn-secondary-bg)", border: "1px solid var(--btn-secondary-border)", padding: "6px 10px", borderRadius: 7, cursor: "pointer", whiteSpace: "nowrap" };
  const roleBadge = (t: string): React.CSSProperties => ({ font: `700 9.5px ${F_SANS}`, letterSpacing: ".03em", padding: "2px 7px", borderRadius: 5, flex: "none", textTransform: "capitalize", background: t === "ambassador" ? "var(--blue-chip-bg)" : "var(--test-bg)", color: t === "ambassador" ? "var(--blue-chip-text)" : "var(--test-fg)" });
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

      {/* referral links (collapsible) */}
      <div style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 14, marginBottom: 22, boxShadow: "var(--card-shadow)", overflow: "hidden" }}>
        <div onClick={() => setLinksOpen((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 11, padding: "15px 20px", cursor: "pointer", userSelect: "none", flexWrap: "wrap" }}>
          <span style={{ font: `600 12px ${F_SANS}`, color: "var(--muted)", width: 12, textAlign: "center", flex: "none", transition: "transform .18s ease", transform: linksOpen ? "rotate(90deg)" : "rotate(0deg)" }}>▸</span>
          <span style={{ font: `700 13.5px ${F_SANS}`, color: "var(--text)" }}>Referral links</span>
          <span style={{ font: `600 11px ${F_SANS}`, color: "var(--muted)", background: "var(--tag-bg)", padding: "2px 9px", borderRadius: 999 }}>{referrers.length} referrer{referrers.length === 1 ? "" : "s"}</span>
          <span style={{ font: `500 12px ${F_SANS}`, color: "var(--muted2)" }}>portal &amp; QR links to share</span>
          <button onClick={(e) => { e.stopPropagation(); printCards(); }} disabled={!referrers.length} style={{ marginLeft: "auto", font: `600 12px ${F_SANS}`, color: "var(--btn-secondary-fg)", background: "var(--btn-secondary-bg)", border: "1px solid var(--btn-secondary-border)", padding: "7px 13px", borderRadius: 8, cursor: referrers.length ? "pointer" : "default", opacity: referrers.length ? 1 : 0.5 }}>Cards · 6/page</button>
          <button onClick={(e) => { e.stopPropagation(); printFlyers(); }} disabled={!referrers.length} style={{ font: `600 12px ${F_SANS}`, color: "var(--btn-secondary-fg)", background: "var(--btn-secondary-bg)", border: "1px solid var(--btn-secondary-border)", padding: "7px 13px", borderRadius: 8, cursor: referrers.length ? "pointer" : "default", opacity: referrers.length ? 1 : 0.5 }}>Flyers · A5</button>
          <button onClick={(e) => { e.stopPropagation(); setLinksOpen(true); setShowAdd((v) => !v); }} style={{ font: `600 12px ${F_SANS}`, color: "#fff", background: "var(--sheets-btn-bg)", border: "none", padding: "7px 13px", borderRadius: 8, cursor: "pointer" }}>{showAdd ? "Cancel" : "+ Add referrer"}</button>
        </div>
        {linksOpen && (
          <div style={{ borderTop: "1px solid var(--divider)" }}>
            {showAdd && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, padding: "14px 20px", borderBottom: "1px solid var(--divider)" }}>
                <input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder="Name *" style={inpStyle} />
                <select value={addForm.type} onChange={(e) => setAddForm({ ...addForm, type: e.target.value })} style={inpStyle}><option value="marketer">Marketer</option><option value="ambassador">Ambassador</option></select>
                <input value={addForm.channel} onChange={(e) => setAddForm({ ...addForm, channel: e.target.value })} placeholder="Channel (optional)" style={inpStyle} />
                <input value={addForm.assignedDay} onChange={(e) => setAddForm({ ...addForm, assignedDay: e.target.value })} placeholder="Day (optional)" style={inpStyle} />
                <input value={addForm.assignedLocation} onChange={(e) => setAddForm({ ...addForm, assignedLocation: e.target.value })} placeholder="Location (optional)" style={inpStyle} />
                <button onClick={addReferrer} disabled={creating || !addForm.name.trim()} style={{ font: `600 12.5px ${F_SANS}`, color: "#fff", background: "var(--accent)", border: "none", padding: "9px 14px", borderRadius: 9, cursor: creating || !addForm.name.trim() ? "default" : "pointer", opacity: creating || !addForm.name.trim() ? 0.6 : 1 }}>{creating ? "Creating…" : "Create + links"}</button>
              </div>
            )}
            {referrers.length === 0 ? (
              !showAdd && <div style={{ font: `500 12.5px ${F_SANS}`, color: "var(--muted)", padding: "14px 20px" }}>No marketers yet. Add one to generate their QR link and personal portal link.</div>
            ) : (
              referrers.map((r) => (
                <div key={r.id} style={{ borderBottom: "1px solid var(--divider)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 14, alignItems: "center", padding: "11px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0, flexWrap: "wrap" }}>
                      <span style={{ font: `600 13px ${F_SANS}`, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                      <span style={roleBadge(r.type)}>{r.type}</span>
                      <span style={{ font: `500 11.5px ${F_GRO}`, color: "var(--muted2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>ref: {r.slug}</span>
                      <span style={{ font: `600 10px ${F_SANS}`, padding: "2px 7px", borderRadius: 5, whiteSpace: "nowrap", background: r.paymentDetails ? "var(--st-active-bg)" : "var(--warn-badge-bg)", color: r.paymentDetails ? "var(--st-active-fg)" : "var(--warn-badge-text)" }}>{r.paymentDetails ? "payout set ✓" : "no payout details"}</span>
                    </div>
                    <div style={{ display: "flex", gap: 7, flex: "none" }}>
                      <button onClick={() => openDetails(r)} style={{ ...copyBtn, ...(detailId === r.id ? { borderColor: "var(--chip-active-border)", background: "var(--chip-active-bg)" } : {}) }}>Details</button>
                      <button onClick={() => copy(`ref-${r.id}`, refLink(r))} style={copyBtn}>{copiedKey === `ref-${r.id}` ? "Copied ✓" : "Copy QR"}</button>
                      <button onClick={() => copy(`portal-${r.id}`, portalLink(r))} style={copyBtn}>{copiedKey === `portal-${r.id}` ? "Copied ✓" : "Copy portal link"}</button>
                      <button onClick={() => deleteReferrer(r)} title="Remove referrer" style={{ ...copyBtn, color: "var(--danger)", borderColor: "var(--danger-border)", padding: "6px 9px" }}>✕</button>
                    </div>
                  </div>
                  {detailId === r.id && (
                    <div style={{ padding: "2px 20px 16px", display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
                      <div style={{ flex: "1 1 240px" }}>
                        <div style={{ font: `600 10px ${F_SANS}`, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--label)", marginBottom: 5 }}>Contact</div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <select value={dForm.contactMethod} onChange={(e) => setDForm({ ...dForm, contactMethod: e.target.value })} style={{ ...inpStyle, width: 108, flex: "none" }}><option>WhatsApp</option><option>Telegram</option><option>Viber</option><option>Email</option></select>
                          <input value={dForm.contactHandle} onChange={(e) => setDForm({ ...dForm, contactHandle: e.target.value })} placeholder="number / @handle" style={inpStyle} />
                        </div>
                      </div>
                      <div style={{ flex: "1 1 240px" }}>
                        <div style={{ font: `600 10px ${F_SANS}`, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--label)", marginBottom: 5 }}>Pay via</div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <select value={dForm.paymentMethod} onChange={(e) => setDForm({ ...dForm, paymentMethod: e.target.value })} style={{ ...inpStyle, width: 108, flex: "none" }}><option>GCash</option><option>Maya</option><option>Bank transfer</option></select>
                          <input value={dForm.paymentDetails} onChange={(e) => setDForm({ ...dForm, paymentDetails: e.target.value })} placeholder="account number / details" style={inpStyle} />
                        </div>
                      </div>
                      <button onClick={() => saveDetails(r)} disabled={dSaving} style={{ font: `600 12.5px ${F_SANS}`, color: "#fff", background: "var(--sheets-btn-bg)", border: "none", padding: "9px 16px", borderRadius: 9, cursor: "pointer", opacity: dSaving ? 0.6 : 1 }}>{dSaving ? "Saving…" : "Save"}</button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
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
