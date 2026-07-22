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

// ---- Printable field-day collateral (shared by cards + flyers) ----
// One B&W card design, authored at 105mm x 148.5mm (a quartered A4). Cards print
// 4-up on A4; the flyer is the same card scaled up to fill a single A5 sheet.
// Every copy carries the marketer's own /r/ link + QR, so each print is unique.
const CARD_FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">`;
// Wait for QR images + web fonts before printing, so nothing prints half-loaded.
const PRINT_BOOT = `<script>window.addEventListener('load',function(){var imgs=[].slice.call(document.images);Promise.all(imgs.map(function(im){return im.complete?1:new Promise(function(res){im.onload=im.onerror=res;});})).then(function(){return (document.fonts&&document.fonts.ready)||1;}).then(function(){setTimeout(function(){window.print();},250);});});<\/script>`;
const RESET_CSS = `*{box-sizing:border-box;margin:0;padding:0}html,body{margin:0;padding:0}body{font-family:'Plus Jakarta Sans',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}`;
const CARD_CSS = `.card{position:relative;border:0.3mm dashed #b6b6b6;padding:16px 17px 14px;display:flex;flex-direction:column;background:#fff;color:#000;overflow:hidden}.brandrow{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:11px}.brand{font:700 13px 'Space Grotesk';color:#000}.badge{font:700 7.5px 'Plus Jakarta Sans';letter-spacing:.04em;text-transform:uppercase;color:#000;border:1px solid #000;border-radius:999px;padding:3px 8px}.hl{font:700 23px/1.02 'Space Grotesk';color:#000;margin:0 0 6px;letter-spacing:-.02em}.lead{font:500 10.5px/1.4 'Plus Jakarta Sans';color:#333;margin:0 0 12px}.tiles{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;margin-bottom:13px}.tile{border:1.4px solid #000;border-radius:9px;padding:8px 4px;text-align:center}.tile.dark{background:#000}.tile b{display:block;font:700 14px/1 'Space Grotesk';color:#000}.tile.dark b{color:#fff}.tile span{display:block;font:600 8px 'Plus Jakarta Sans';color:#555;margin-top:3px}.tile.dark span{color:#cfcfcf}.exp{display:flex;flex-direction:column;gap:7px;margin-bottom:12px}.exp div{font:500 9px/1.35 'Plus Jakarta Sans';color:#333}.exp b{font-weight:700;color:#000}.sect{font:700 8px 'Plus Jakarta Sans';letter-spacing:.06em;text-transform:uppercase;color:#000;margin-bottom:8px}.sect.sm{font-size:7.5px;letter-spacing:.07em;margin-bottom:6px}.steps{display:flex;flex-direction:column;gap:7px;margin-bottom:11px}.step{display:flex;gap:8px;align-items:flex-start}.num{width:15px;height:15px;border-radius:999px;background:#000;color:#fff;font:700 8.5px 'Space Grotesk';display:flex;align-items:center;justify-content:center;flex:none;margin-top:1px}.st{font:500 9.5px/1.25 'Plus Jakarta Sans';color:#1a1a1a}.st b{font-weight:700;color:#000}.whygrid{display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;margin-bottom:7px}.why{display:flex;gap:5px;align-items:flex-start}.why i{font:700 8.5px 'Plus Jakarta Sans';line-height:1.2;flex:none;font-style:normal}.why span{font:500 8.5px/1.2 'Plus Jakarta Sans';color:#1a1a1a}.note{font:600 8px 'Plus Jakarta Sans';color:#444;margin-bottom:6px}.signup{margin-top:auto;border-top:1px solid #000;padding-top:12px;display:flex;align-items:center;gap:13px}.qr{width:82px;height:82px;flex:none;border:1px solid #000;padding:4px;background:#fff}.su-head{font:700 15px/1 'Space Grotesk';color:#000;margin-bottom:5px}.su-or{font:500 9px 'Plus Jakarta Sans';color:#555;margin-bottom:2px}.su-url{font:700 10.5px/1.2 'Plus Jakarta Sans';color:#000;word-break:break-all;margin-bottom:5px}.su-more{font:500 9px 'Plus Jakarta Sans';color:#333;margin-bottom:6px}.su-more b{font-weight:700;color:#000}.su-ref{font:500 8.5px 'Plus Jakarta Sans';color:#555}.su-ref b{font-weight:700;color:#000}`;
// One card's markup, carrying this marketer's /r/ link + QR.
const cardMarkup = (origin: string, r: { slug: string; name: string }) => {
  const link = `${origin}/r/${r.slug}`;
  const shortLink = link.replace(/^https?:\/\//, "");
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=0&data=${encodeURIComponent(link)}`;
  return `<div class="card">
    <div class="brandrow"><span class="brand">&#10022; LinkedVelocity</span><span class="badge">For students &amp; professionals</span></div>
    <h1 class="hl">Get paid for your LinkedIn</h1>
    <p class="lead">Earn every month just by lending us your account. It stays yours &mdash; take it back anytime.</p>
    <div class="tiles">
      <div class="tile"><b>&#8369;1,000</b><span>to start</span></div>
      <div class="tile dark"><b>&#8369;500</b><span>every month</span></div>
      <div class="tile"><b>&#8776;&#8369;7k</b><span>first year</span></div>
    </div>
    <div class="exp">
      <div><b>What it is &mdash; </b>LinkedVelocity pays you to lend your LinkedIn to vetted businesses that use it for professional outreach.</div>
      <div><b>Why your LinkedIn &mdash; </b>Real, established profiles perform far better than brand-new ones, so we pay to borrow yours.</div>
      <div><b>What's in it for you &mdash; </b>&#8369;1,000 to start, &#8369;500 every month, zero effort &mdash; and your profile always stays yours.</div>
    </div>
    <div class="sect">How it works</div>
    <div class="steps">
      <div class="step"><span class="num">1</span><span class="st">Scan the code and sign up &mdash; takes 2 minutes.</span></div>
      <div class="step"><span class="num">2</span><span class="st">We set it up and rent it to a vetted business. Your <b>name, photo &amp; password stay yours</b>.</span></div>
      <div class="step"><span class="num">3</span><span class="st">Get <b>&#8369;500 every month</b> &mdash; take it back anytime, no penalties.</span></div>
    </div>
    <div class="sect sm">Why people say yes</div>
    <div class="whygrid">
      <div class="why"><i>&#10003;</i><span>Name &amp; photo never change</span></div>
      <div class="why"><i>&#10003;</i><span>You keep full access anytime</span></div>
      <div class="why"><i>&#10003;</i><span>Cancel anytime &mdash; no penalties</span></div>
      <div class="why"><i>&#10003;</i><span>Vetted, legitimate businesses</span></div>
      <div class="why"><i>&#10003;</i><span>Password is never shared</span></div>
      <div class="why"><i>&#10003;</i><span>Add accounts to earn more</span></div>
    </div>
    <div class="note">Ages 18+ &middot; paid to GCash, Maya or your bank.</div>
    <div class="signup">
      <img class="qr" src="${qr}" alt="QR"/>
      <div style="min-width:0">
        <div class="su-head">Scan to sign up</div>
        <div class="su-or">or sign up at</div>
        <div class="su-url">${shortLink}</div>
        <div class="su-more">Curious first? Learn more at <b>linkedvelocity.com</b></div>
        <div class="su-ref">Referred by <b>${r.name}</b> &middot; code <b>${r.slug}</b></div>
      </div>
    </div>
  </div>`;
};

// ₱ per converted signup.
const RATE = 500;
// A referrer is "top" once this many of their signups convert.
const TOP_THRESHOLD = 5;

// DB status -> "converted" means the account made it onto inventory.
// "Converted" = the account was actually onboarded/transferred (not just accepted/agreed).
// The marketer's commission is earned only once the account is in hand.
const isConverted = (s: string) => s === "onboarded";

const peso = (n: number) => "₱" + n.toLocaleString("en-US");
const initialsOf = (name: string) => { const p = (name || "?").trim().split(/\s+/); return (p.length > 1 ? p[0][0] + p[1][0] : name.slice(0, 2)).toUpperCase() || "?"; };

interface Row {
  name: string; initials: string; signups: number; converted: number;
  isTop: boolean; active: boolean; convRate: string; earned: number; owed: number;
}

interface Payout {
  id: string; referrerId: string; type: string; description: string | null; amount: number;
  method: string | null; reference: string | null; paidAt: string | null; paidBy: string | null;
  confirmedAt: string | null; confirmedBy: string | null;
  referrer: { id: string; name: string; slug: string; paymentMethod: string | null; paymentDetails: string | null };
}

const PAYOUT_TYPES: [string, string][] = [
  ["day_rate", "Field day rate"],
  ["commission", "Signup commission"],
  ["bonus", "Bonus"],
  ["other", "Other"],
];

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
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [payOpen, setPayOpen] = useState(false);
  const [pForm, setPForm] = useState({ referrerId: "", type: "day_rate", amount: "", description: "" });
  const [pBusy, setPBusy] = useState("");
  const [paidDates, setPaidDates] = useState<Record<string, string>>({});
  const [today, setToday] = useState("");

  const reloadPayouts = () => fetch("/api/admin/payouts").then((r) => r.json()).then((d) => setPayouts(d.payouts || [])).catch(() => {});

  useEffect(() => {
    fetch("/api/admin/ambassadors").then((r) => r.json()).then((d) => setApps(d.applications || [])).finally(() => setLoading(false));
    fetch("/api/admin/referrers").then((r) => r.json()).then((d) => setReferrers(d.referrers || [])).catch(() => {});
    reloadPayouts();
    // Next Monday label (client-only to avoid hydration mismatch).
    const d = new Date();
    d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
    setNextMonday(d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }));
    // Local YYYY-MM-DD for the date inputs (client-only to avoid hydration mismatch).
    const n = new Date();
    setToday(`${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`);
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
  // A5 flyer — the same card design scaled up to fill one A5 sheet, one per marketer.
  // Pass a single referrer to print just theirs; omit to print one sheet per marketer.
  const printFlyers = (only?: Referrer) => {
    const list = only ? [only] : referrers;
    if (!list.length) return;
    const win = window.open("", "_blank");
    if (!win) return;
    const sheets = list.map((r) => `<div class="sheet">${cardMarkup(origin, r)}</div>`).join("");
    // Card is authored at 105x148.5mm; scale 1.409x fills an A5 sheet (148x210mm).
    const css = `${RESET_CSS}.sheet{width:148mm;height:210mm;overflow:hidden;background:#fff;page-break-after:always}.sheet .card{width:105mm;height:148.5mm;border:none;transform:scale(1.409);transform-origin:top left}${CARD_CSS}@page{size:A5;margin:0}`;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Field Day Flyers</title>${CARD_FONTS}<style>${css}</style></head><body>${sheets}${PRINT_BOOT}</body></html>`);
    win.document.close();
  };
  // B&W cards — 4 identical cards per A4 page (quartered). One full page of cuttable
  // cards per marketer, each carrying that marketer's own /r/ link + QR. Pass a single
  // referrer to print just their page; omit to print one page for every marketer.
  const printCards = (only?: Referrer) => {
    const list = only ? [only] : referrers;
    if (!list.length) return;
    const win = window.open("", "_blank");
    if (!win) return;
    const pages = list.map((r) => `<div class="page">${cardMarkup(origin, r).repeat(4)}</div>`).join("");
    const css = `${RESET_CSS}.page{width:210mm;height:297mm;display:grid;grid-template-columns:105mm 105mm;grid-template-rows:148.5mm 148.5mm;background:#fff;page-break-after:always}${CARD_CSS}@page{size:A4;margin:0}`;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Field Day Cards</title>${CARD_FONTS}<style>${css}</style></head><body>${pages}${PRINT_BOOT}</body></html>`);
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

  const addPayout = async () => {
    const amount = Number(pForm.amount);
    if (!pForm.referrerId || !Number.isFinite(amount) || amount <= 0) return;
    setPBusy("new");
    try {
      await fetch("/api/admin/payouts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...pForm, amount }),
      });
      setPForm({ referrerId: "", type: "day_rate", amount: "", description: "" });
      await reloadPayouts();
    } finally { setPBusy(""); }
  };

  const patchPayout = async (id: string, body: Record<string, unknown>) => {
    setPBusy(id);
    try {
      await fetch(`/api/admin/payouts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      await reloadPayouts();
    } finally { setPBusy(""); }
  };

  const deletePayout = async (p: Payout) => {
    if (!confirm(`Delete the ${peso(p.amount)} payment for ${p.referrer.name}? This can't be undone.`)) return;
    setPBusy(p.id);
    try {
      await fetch(`/api/admin/payouts/${p.id}`, { method: "DELETE" });
      await reloadPayouts();
    } finally { setPBusy(""); }
  };

  const owedTotal = payouts.filter((p) => !p.paidAt).reduce((s, p) => s + p.amount, 0);
  const awaitingCount = payouts.filter((p) => p.paidAt && !p.confirmedAt).length;

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
          <button onClick={(e) => { e.stopPropagation(); printCards(); }} disabled={!referrers.length} title="Print a 4-up card page for every marketer (one page each)" style={{ marginLeft: "auto", font: `600 12px ${F_SANS}`, color: "var(--btn-secondary-fg)", background: "var(--btn-secondary-bg)", border: "1px solid var(--btn-secondary-border)", padding: "7px 13px", borderRadius: 8, cursor: referrers.length ? "pointer" : "default", opacity: referrers.length ? 1 : 0.5 }}>All cards · 4/page</button>
          <button onClick={(e) => { e.stopPropagation(); printFlyers(); }} disabled={!referrers.length} title="Print an A5 flyer for every marketer (one sheet each)" style={{ font: `600 12px ${F_SANS}`, color: "var(--btn-secondary-fg)", background: "var(--btn-secondary-bg)", border: "1px solid var(--btn-secondary-border)", padding: "7px 13px", borderRadius: 8, cursor: referrers.length ? "pointer" : "default", opacity: referrers.length ? 1 : 0.5 }}>All flyers · A5</button>
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
                    <div style={{ display: "flex", gap: 7, flex: "none", flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <button onClick={() => openDetails(r)} style={{ ...copyBtn, ...(detailId === r.id ? { borderColor: "var(--chip-active-border)", background: "var(--chip-active-bg)" } : {}) }}>Details</button>
                      <button onClick={() => printCards(r)} title={`Print a 4/page card sheet for ${r.name} (their QR)`} style={copyBtn}>Cards · 4/page</button>
                      <button onClick={() => printFlyers(r)} title={`Print an A5 flyer for ${r.name} (their QR)`} style={copyBtn}>Flyer · A5</button>
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
        {tile("Paid to date", peso(payouts.filter((p) => p.paidAt).reduce((s, p) => s + p.amount, 0)), "var(--green)", awaitingCount ? `${awaitingCount} awaiting confirmation` : "all payments confirmed")}
      </div>

      {/* payments & receipts */}
      <div style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 14, marginBottom: 22, boxShadow: "var(--card-shadow)", overflow: "hidden" }}>
        <div onClick={() => setPayOpen((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 11, padding: "15px 20px", cursor: "pointer", userSelect: "none", flexWrap: "wrap" }}>
          <span style={{ font: `600 12px ${F_SANS}`, color: "var(--muted)", width: 12, textAlign: "center", flex: "none", transition: "transform .18s ease", transform: payOpen ? "rotate(90deg)" : "rotate(0deg)" }}>▸</span>
          <span style={{ font: `700 13.5px ${F_SANS}`, color: "var(--text)" }}>Payments &amp; receipts</span>
          {owedTotal > 0 && <span style={{ font: `600 11px ${F_SANS}`, color: "var(--warn-num)", background: "var(--tag-bg)", padding: "2px 9px", borderRadius: 999 }}>{peso(owedTotal)} to send</span>}
          {awaitingCount > 0 && <span style={{ font: `600 11px ${F_SANS}`, color: "var(--muted)", background: "var(--tag-bg)", padding: "2px 9px", borderRadius: 999 }}>{awaitingCount} awaiting confirmation</span>}
          <span style={{ font: `500 12px ${F_SANS}`, color: "var(--muted2)" }}>cash &amp; GCash — the marketer confirms receipt in their own portal</span>
        </div>

        {payOpen && (
          <div style={{ borderTop: "1px solid var(--divider)", padding: "16px 20px" }}>
            {/* add a payment */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
              <select value={pForm.referrerId} onChange={(e) => setPForm({ ...pForm, referrerId: e.target.value })} style={{ ...inpStyle, minWidth: 150 }}>
                <option value="">Who…</option>
                {referrers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <select value={pForm.type} onChange={(e) => setPForm({ ...pForm, type: e.target.value })} style={{ ...inpStyle, minWidth: 150 }}>
                {PAYOUT_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <input value={pForm.amount} onChange={(e) => setPForm({ ...pForm, amount: e.target.value })} placeholder="Amount ₱" inputMode="decimal" style={{ ...inpStyle, width: 110 }} />
              <input value={pForm.description} onChange={(e) => setPForm({ ...pForm, description: e.target.value })} placeholder="What it's for (e.g. Field day 1 — BGC)" style={{ ...inpStyle, flex: 1, minWidth: 200 }} />
              <button onClick={addPayout} disabled={!pForm.referrerId || !pForm.amount || pBusy === "new"} style={{ font: `600 12px ${F_SANS}`, color: "#fff", background: "var(--sheets-btn-bg)", border: "none", padding: "9px 15px", borderRadius: 8, cursor: pForm.referrerId && pForm.amount ? "pointer" : "default", opacity: pForm.referrerId && pForm.amount ? 1 : 0.5 }}>
                {pBusy === "new" ? "Adding…" : "+ Add payment"}
              </button>
            </div>

            {payouts.length === 0 ? (
              <div style={{ font: `500 12.5px ${F_SANS}`, color: "var(--muted)" }}>No payments logged yet. Add one above, mark it sent once you&apos;ve handed over the cash or sent the GCash, then the marketer confirms it from their portal — that confirmation is your receipt.</div>
            ) : payouts.map((p) => {
              const busy = pBusy === p.id;
              return (
                <div key={p.id} style={{ borderTop: "1px solid var(--divider)", padding: "12px 0", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ font: `600 13px ${F_SANS}`, color: "var(--text)", minWidth: 120 }}>{p.referrer.name}</span>
                  <span style={{ font: `600 14px ${F_GRO}`, color: "var(--text2)", fontVariantNumeric: "tabular-nums", minWidth: 70 }}>{peso(p.amount)}</span>
                  <span style={{ font: `500 12px ${F_SANS}`, color: "var(--muted)", flex: 1, minWidth: 140 }}>{p.description || (PAYOUT_TYPES.find(([v]) => v === p.type)?.[1] ?? "Payment")}</span>

                  {!p.paidAt ? (
                    <>
                      <input defaultValue={p.method || "GCash"} onBlur={(e) => e.target.value !== (p.method || "") && patchPayout(p.id, { method: e.target.value })} placeholder="Cash / GCash" style={{ ...inpStyle, width: 100 }} />
                      <input defaultValue={p.reference || ""} onBlur={(e) => e.target.value !== (p.reference || "") && patchPayout(p.id, { reference: e.target.value })} placeholder="Ref no." style={{ ...inpStyle, width: 110 }} />
                      <input type="date" value={paidDates[p.id] ?? today} max={today} onChange={(e) => setPaidDates({ ...paidDates, [p.id]: e.target.value })} title="Date the payment was made" style={{ ...inpStyle, width: 140 }} />
                      <button onClick={() => patchPayout(p.id, { markPaid: true, paidAt: paidDates[p.id] ?? today })} disabled={busy} style={{ font: `600 11.5px ${F_SANS}`, color: "#fff", background: "var(--green)", border: "none", padding: "7px 12px", borderRadius: 7, cursor: "pointer" }}>{busy ? "…" : "Mark sent"}</button>
                    </>
                  ) : p.confirmedAt ? (
                    <span style={{ font: `600 11.5px ${F_SANS}`, color: "var(--green)", whiteSpace: "nowrap" }}>
                      ✓ Paid {new Date(p.paidAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}{p.method ? ` · ${p.method}` : ""} · confirmed by {p.confirmedBy} {new Date(p.confirmedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  ) : (
                    <span style={{ font: `600 11.5px ${F_SANS}`, color: "var(--warn-num)", whiteSpace: "nowrap" }}>Sent {new Date(p.paidAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}{p.method ? ` · ${p.method}` : ""} — awaiting confirmation</span>
                  )}

                  {p.paidAt && !p.confirmedAt && (
                    <button onClick={() => patchPayout(p.id, { markPaid: false })} disabled={busy} title="Undo — marks this as not sent" style={{ ...copyBtn, padding: "6px 9px" }}>Undo</button>
                  )}
                  {!p.confirmedAt && (
                    <button onClick={() => deletePayout(p)} disabled={busy} title="Delete this payment" style={{ ...copyBtn, padding: "6px 9px", color: "var(--warn-num)" }}>✕</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
