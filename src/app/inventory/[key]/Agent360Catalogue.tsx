"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// Client-side password gate + earmark experience for the Agent360 unlisted inventory.
// The slug already gates the URL; the password is a light extra barrier Eyal asked for
// (it lives in the bundle, so it deters casual access rather than being true auth).
export type A360Row = {
  id: string;
  name: string;
  url: string;
  cc: number;
  v: boolean;
  price: number;           // per-month price, computed server-side (pricing varies per catalogue)
  status: string; // "available" | "under_construction" | "construction_immature"
  shadow: boolean; // held by a shadow renter (Apex/Ortus), frees up within ~1 week
  industry: string | null;
  headline: string | null;
  reserved: boolean;       // self-reserved by this catalogue (a short hold) — shown here, hidden elsewhere
  heldUntil: string | null;
};

// Per-catalogue display chrome. Defaults below reproduce the Agent360 catalogue exactly, so callers
// that pass no cfg (the Agent360 branch) are unchanged; Will Cura passes its own.
export type CatalogueConfig = {
  forLabel: string;     // who it's "Prepared for" / gate copy / copy-picks heading
  storageKey: string;   // sessionStorage/localStorage namespace, so catalogues don't collide
  heroBlurb: string;
  legend: { cls: string; label: string; value?: string }[];
  // Whether to show the direct "Rent →" button. Off for Will Cura: his direct checkout would price
  // off the account tier (SN withdrawn → undercharged, no SN), so his flow is Reserve → we provision
  // manually with lockedPrice + SN. Default true keeps Agent360 unchanged.
  showRent: boolean;
};

const DEFAULT_CFG: CatalogueConfig = {
  forLabel: "Agent360",
  storageKey: "a360",
  heroBlurb: "Aged, warmed LinkedIn profiles, plus everything currently in warm-up. Pricing is per account, per month: unverified $45, verified $60. Once you reach 10 accounts the rate drops to $40 unverified / $50 verified. Open any profile to review it.",
  legend: [
    { cls: "u", label: "Unverified", value: "$45/mo" },
    { cls: "v", label: "✓ Verified", value: "$60/mo" },
    { cls: "u", label: "At 10 accounts", value: "$40 / $50" },
  ],
  showRent: true,
};

const sortVC = (a: A360Row, b: A360Row) => Number(b.v) - Number(a.v) || b.cc - a.cc;

const CSS = `
.a3{--ink:#101828;--muted:#5a6475;--faint:#98a1b0;--line:#e2e7ee;--line2:#d3dae3;--card:#fff;--surface:#eef1f6;--bg:#f6f7f9;--accent:#0a66c2;--accent-ink:#084e96;--accent-soft:#e8f1fb;--verified:#067a45;--verified-soft:#e3f3ea;--warm:#9a5b12;min-height:100vh;background:var(--bg);color:var(--ink);font-family:var(--font-inter),system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.5;-webkit-font-smoothing:antialiased}
.a3 *{box-sizing:border-box}
.a3 h1,.a3 h2,.a3 h3,.a3 .brand b,.a3 .price,.a3 .gate-card b{font-family:var(--font-poppins),var(--font-inter),sans-serif}
.a3-gate{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:24px;background:var(--bg)}
.gate-card{background:var(--card);border:1px solid var(--line);border-radius:18px;box-shadow:0 1px 2px rgba(16,24,40,.05),0 8px 24px rgba(16,24,40,.06);padding:30px 28px;max-width:380px;width:100%;text-align:center}
.gate-card .mk{width:44px;height:44px;border-radius:12px;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;margin:0 auto 16px}
.gate-card b{font-size:18px;color:var(--accent);display:block;margin-bottom:2px}
.gate-card .sub{color:var(--muted);font-size:13.5px;margin-bottom:20px}
.gate-card input{width:100%;padding:12px 14px;border:1px solid var(--line2);border-radius:10px;background:var(--bg);color:var(--ink);font-size:15px;font-family:inherit}
.gate-card input:focus{outline:2px solid var(--accent);outline-offset:1px;border-color:var(--accent)}
.gate-card button{width:100%;margin-top:12px;padding:12px;border:none;border-radius:10px;background:var(--accent);color:#fff;font-size:15px;font-weight:600;font-family:inherit;cursor:pointer}
.gate-card button:hover{background:var(--accent-ink)}
.gate-err{color:#c0392b;font-size:13px;margin-top:10px;min-height:18px}
.a3-top{position:sticky;top:0;z-index:5;background:rgba(246,247,249,.9);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.a3-top-in,.a3-main{max-width:1080px;margin:0 auto;padding-left:20px;padding-right:20px}
.a3-top-in{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;padding-top:13px;padding-bottom:13px}
.brand{display:flex;flex-direction:column;gap:1px}
.brand b{font-weight:700;font-size:17px;letter-spacing:-.01em;color:var(--accent)}
.brand span{font-size:12px;color:var(--muted)}
.legend{display:flex;gap:8px;flex-wrap:wrap}
.lg{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;padding:6px 11px;border-radius:999px;border:1px solid var(--line);background:var(--card)}
.lg i{font-style:normal;font-weight:700;font-variant-numeric:tabular-nums}
.lg.v{color:var(--verified)}.lg.u{color:var(--muted)}
.a3-main{padding-top:32px;padding-bottom:120px}
.hero{margin-bottom:12px}
.for{display:block;margin:0 0 10px;color:var(--accent);font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.hero h1{font-weight:700;font-size:clamp(27px,5vw,38px);letter-spacing:-.02em;margin:0 0 8px;text-wrap:balance}
.hero p{margin:0;color:var(--muted);max-width:66ch;font-size:15px}
.howto{display:flex;gap:11px;align-items:flex-start;background:var(--accent-soft);border:1px solid rgba(10,102,194,.22);border-radius:12px;padding:13px 15px;margin:22px 0 20px;font-size:13.5px}
.howto svg{flex:none;color:var(--accent);margin-top:1px}
.howto b{color:var(--ink)}
.filters{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:0 0 30px}
.filters .fsearch{flex:1 1 220px;min-width:0}
.filters input,.filters select{font-family:inherit;font-size:13.5px;color:var(--ink);background:var(--card);border:1px solid var(--line2);border-radius:10px;padding:10px 12px;height:40px}
.filters input:focus,.filters select:focus{outline:2px solid var(--accent);outline-offset:1px;border-color:var(--accent)}
.filters select{cursor:pointer;background-image:none}
.filters .fcount{font-size:12.5px;color:var(--muted);font-weight:600;margin-left:auto;white-space:nowrap}
.filters .fclear{border:1px solid var(--line2);background:var(--card);color:var(--muted);border-radius:10px;height:40px;padding:0 13px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer}
.filters .fclear:hover{border-color:var(--accent);color:var(--accent)}
.noresults{text-align:center;color:var(--muted);font-size:14px;padding:40px 10px;border:1px dashed var(--line2);border-radius:12px}
.group{margin-bottom:38px}
.ghead{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:3px}
.eyebrow{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}
.eyebrow.now{color:var(--verified)}.eyebrow.soon{color:var(--accent)}.eyebrow.warm{color:var(--warm)}
.gtitle{font-weight:600;font-size:21px;letter-spacing:-.01em;margin:0}
.count{font-size:12.5px;font-weight:700;color:var(--muted);background:var(--surface);border:1px solid var(--line);padding:2px 10px;border-radius:999px;font-variant-numeric:tabular-nums}
.ghint{margin:0 0 16px;color:var(--muted);font-size:13.5px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:13px}
.card{position:relative;display:flex;flex-direction:column;gap:9px;background:var(--card);border:1px solid var(--line);border-radius:13px;padding:15px 16px 14px;box-shadow:0 1px 2px rgba(16,24,40,.05);transition:border-color .15s,box-shadow .15s}
.card.picked{border-color:var(--accent);box-shadow:0 0 0 2px rgba(10,102,194,.3)}
.card-top{display:flex;gap:11px;align-items:flex-start}
.pick{flex:none;width:22px;height:22px;margin:1px 0 0;cursor:pointer;accent-color:var(--accent)}
.card-id{min-width:0;flex:1}
.name{font-size:15.5px;font-weight:600;margin:0;letter-spacing:-.01em;line-height:1.25;word-break:break-word}
.headline{font-size:12.5px;color:var(--muted);margin:3px 0 0;line-height:1.35}
.chips{display:flex;gap:6px;flex-wrap:wrap}
.chip{font-size:11.5px;font-weight:600;padding:3px 9px;border-radius:999px;white-space:nowrap}
.chip.conn{background:var(--surface);color:var(--muted);font-variant-numeric:tabular-nums}
.chip.verified{background:var(--verified-soft);color:var(--verified)}
.chip.unverified{background:var(--surface);color:var(--faint)}
.chip.ind{background:var(--accent-soft);color:var(--accent-ink)}
.foot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:4px;padding-top:9px;border-top:1px solid var(--line)}
.price{font-weight:700;font-size:18px;letter-spacing:-.01em;font-variant-numeric:tabular-nums}
.price .per{font-size:12px;font-weight:600;color:var(--muted)}
.view{font-size:12.5px;font-weight:600;color:var(--accent);text-decoration:none;white-space:nowrap}
.view:hover{text-decoration:underline}
.view:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}
.cacts{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:2px}
.cacts .rsv{font-family:inherit;font-size:12.5px;font-weight:600;border:1px solid var(--line2);background:var(--card);color:var(--ink);border-radius:9px;padding:7px 12px;cursor:pointer}
.cacts .rsv:hover{border-color:var(--accent);color:var(--accent)}
.cacts .rsv:disabled{opacity:.5;cursor:default}
.cacts .rent{font-family:inherit;font-size:12.5px;font-weight:700;background:var(--accent);color:#fff;border:1px solid var(--accent);border-radius:9px;padding:7px 13px;text-decoration:none;cursor:pointer}
.cacts .rent:hover{background:var(--accent-ink)}
.cacts .rel{font-family:inherit;font-size:12px;font-weight:600;border:none;background:none;color:var(--muted);cursor:pointer;text-decoration:underline;padding:0}
.resv{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:700;color:var(--warm);background:#fdf4e7;border:1px solid #f0dcc0;border-radius:999px;padding:3px 10px}
.bar{position:fixed;left:0;right:0;bottom:0;z-index:8;background:rgba(255,255,255,.94);backdrop-filter:blur(10px);border-top:1px solid var(--line);padding:12px 20px}
.bar-in{max-width:1080px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}
.bar-count{font-size:14px;font-weight:600}
.bar-count b{color:var(--accent);font-variant-numeric:tabular-nums}
.bar-actions{display:flex;gap:10px;align-items:center}
.btn{font-size:13.5px;font-weight:600;font-family:inherit;border-radius:10px;padding:10px 15px;cursor:pointer;border:1px solid var(--line2);background:var(--card);color:var(--ink)}
.btn.primary{background:var(--accent);border-color:var(--accent);color:#fff}
.btn.primary:hover{background:var(--accent-ink)}
.btn.primary:disabled{opacity:.5;cursor:default}
.btn.ghost:hover{border-color:var(--accent);color:var(--accent)}
.note{color:var(--muted);font-size:12.5px;line-height:1.6;margin-top:6px}
.toast{position:fixed;left:50%;transform:translateX(-50%);bottom:84px;z-index:9;background:var(--ink);color:#fff;font-size:13px;font-weight:600;padding:9px 16px;border-radius:999px;opacity:0;transition:opacity .2s;pointer-events:none}
.toast.show{opacity:1}
.hid{position:absolute;left:-9999px;top:0}
@media (max-width:440px){.grid{grid-template-columns:1fr}}
`;

const fmtHold = (iso: string | null) => { if (!iso) return ""; const d = new Date(iso); return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }); };

function Card({ a, picked, onToggle, onReserve, onRelease, busy, showRent }: { a: A360Row; picked: boolean; onToggle: (id: string) => void; onReserve: (id: string) => void; onRelease: (id: string) => void; busy: boolean; showRent: boolean }) {
  // Reserve/Rent only make sense for live accounts (the "available now" bucket).
  const rentable = a.status === "available" && !a.shadow;
  return (
    <article className={`card${picked ? " picked" : ""}`}>
      <div className="card-top">
        <input className="pick" type="checkbox" aria-label={`Earmark ${a.name}`} checked={picked} onChange={() => onToggle(a.id)} />
        <div className="card-id">
          <h3 className="name">{a.name}</h3>
          {a.headline ? <p className="headline">{a.headline}</p> : null}
        </div>
      </div>
      <div className="chips">
        {a.cc > 0 ? <span className="chip conn">{a.cc} connections</span> : null}
        {a.v ? <span className="chip verified">✓ Verified</span> : <span className="chip unverified">Unverified</span>}
        {a.industry ? <span className="chip ind">{a.industry}</span> : null}
      </div>
      <div className="foot">
        <span className="price">${a.price}<span className="per">/mo</span></span>
        <a className="view" href={a.url} target="_blank" rel="noopener noreferrer">View profile →</a>
      </div>
      {rentable && (
        a.reserved ? (
          <div className="cacts">
            <span className="resv">⏸ Reserved{a.heldUntil ? ` · until ${fmtHold(a.heldUntil)}` : ""}</span>
            {showRent && <a className="rent" href={`/checkout?accounts=${a.id}&direct=1`}>Rent →</a>}
            <button className="rel" type="button" onClick={() => onRelease(a.id)} disabled={busy}>Release</button>
          </div>
        ) : (
          <div className="cacts">
            <button className="rsv" type="button" onClick={() => onReserve(a.id)} disabled={busy}>Reserve 2 days</button>
            {showRent && <a className="rent" href={`/checkout?accounts=${a.id}&direct=1`}>Rent →</a>}
          </div>
        )
      )}
    </article>
  );
}

function Group({ eyebrow, cls, title, hint, items, picks, onToggle, onReserve, onRelease, busyId, showRent }: { eyebrow: string; cls: string; title: string; hint: string; items: A360Row[]; picks: Set<string>; onToggle: (id: string) => void; onReserve: (id: string) => void; onRelease: (id: string) => void; busyId: string | null; showRent: boolean }) {
  if (!items.length) return null;
  return (
    <section className="group">
      <div className="ghead">
        <span className={`eyebrow ${cls}`}>{eyebrow}</span>
        <h2 className="gtitle">{title}</h2>
        <span className="count">{items.length}</span>
      </div>
      <p className="ghint">{hint}</p>
      <div className="grid">
        {items.map((a) => <Card key={a.id} a={a} picked={picks.has(a.id)} onToggle={onToggle} onReserve={onReserve} onRelease={onRelease} busy={busyId === a.id} showRent={showRent} />)}
      </div>
    </section>
  );
}

export default function Agent360Catalogue({ rows, password, slug, cfg = DEFAULT_CFG }: { rows: A360Row[]; password: string; slug: string; cfg?: CatalogueConfig }) {
  const [unlocked, setUnlocked] = useState(false);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [picks, setPicks] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  // Local overlay so a reserve/release reflects instantly without a full reload.
  const [ov, setOv] = useState<Record<string, { reserved: boolean; heldUntil: string | null }>>({});
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("");
  const [vFilter, setVFilter] = useState<"all" | "verified" | "unverified">("all");
  const taRef = useRef<HTMLTextAreaElement>(null);

  const unlockKey = `${cfg.storageKey}_unlocked`;
  const picksKey = `${cfg.storageKey}_picks`;

  useEffect(() => {
    try { if (sessionStorage.getItem(unlockKey) === "1") setUnlocked(true); } catch {}
    try { const saved = JSON.parse(localStorage.getItem(picksKey) || "[]"); if (Array.isArray(saved)) setPicks(new Set(saved)); } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const savePicks = (next: Set<string>) => { try { localStorage.setItem(picksKey, JSON.stringify([...next])); } catch {} };

  const effRows = useMemo(() => rows.map((r) => (ov[r.id] ? { ...r, ...ov[r.id] } : r)), [rows, ov]);
  const industryOptions = useMemo(
    () => [...new Set(rows.map((r) => r.industry).filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b)),
    [rows]
  );
  const filtersActive = !!search.trim() || !!industry || vFilter !== "all";
  const matches = (r: A360Row) => {
    if (vFilter === "verified" && !r.v) return false;
    if (vFilter === "unverified" && r.v) return false;
    if (industry && r.industry !== industry) return false;
    const q = search.trim().toLowerCase();
    if (q && !`${r.name} ${r.headline || ""} ${r.industry || ""}`.toLowerCase().includes(q)) return false;
    return true;
  };
  const buckets = useMemo(() => {
    const ok = (r: A360Row) => matches(r);
    return {
      now: effRows.filter((r) => r.status === "available" && !r.shadow && ok(r)).sort(sortVC),
      soon: effRows.filter((r) => r.status === "available" && r.shadow && ok(r)).sort(sortVC),
      warm: effRows.filter((r) => r.status !== "available" && ok(r)).sort(sortVC),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effRows, search, industry, vFilter]);
  const shownCount = buckets.now.length + buckets.soon.length + buckets.warm.length;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.trim() === password) { setUnlocked(true); try { sessionStorage.setItem(unlockKey, "1"); } catch {} }
    else setErr("Incorrect password. Please try again.");
  };

  const toggle = (id: string) => {
    setPicks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      savePicks(next);
      return next;
    });
  };

  const clearPicks = () => { setPicks(new Set()); savePicks(new Set()); };

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2200); };

  const reserve = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/inventory/${slug}/reserve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId: id, days: 2 }) });
      const d = await res.json().catch(() => ({} as { heldUntil?: string }));
      if (res.ok) { setOv((o) => ({ ...o, [id]: { reserved: true, heldUntil: d.heldUntil ?? null } })); flash("Reserved for 2 days — hit Rent when you're ready"); }
      else flash(res.status === 409 ? "Sorry — that one was just taken" : "Couldn't reserve, please try again");
    } catch { flash("Couldn't reserve, please try again"); }
    finally { setBusyId(null); }
  };
  const release = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/inventory/${slug}/reserve`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId: id }) });
      if (res.ok) { setOv((o) => ({ ...o, [id]: { reserved: false, heldUntil: null } })); flash("Released"); }
    } catch { /* ignore */ }
    finally { setBusyId(null); }
  };

  const copyPicks = () => {
    if (!picks.size) return;
    const map = new Map(rows.map((r) => [r.id, r]));
    const lines = [`${cfg.forLabel} earmarked accounts (${picks.size}):`, ""];
    [...picks].map((id) => map.get(id)).filter((d): d is A360Row => !!d).sort(sortVC).forEach((d) => {
      lines.push(`- ${d.name} (${d.cc} conns, ${d.v ? "verified" : "unverified"}${d.industry ? ", " + d.industry : ""}) $${d.price}/mo - ${d.url}`);
    });
    const text = lines.join("\n");
    if (taRef.current) taRef.current.value = text;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => flash("Picks copied — paste them into your reply")).catch(() => {
        taRef.current?.select(); try { document.execCommand("copy"); flash("Picks copied"); } catch { flash("Press Ctrl/Cmd+C to copy"); }
      });
    } else { taRef.current?.select(); try { document.execCommand("copy"); flash("Picks copied"); } catch { flash("Press Ctrl/Cmd+C to copy"); } }
  };

  return (
    <div className="a3">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {!unlocked && (
        <div className="a3-gate">
          <form className="gate-card" onSubmit={submit}>
            <div className="mk"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></div>
            <b>LinkedVelocity</b>
            <div className="sub">Private inventory for {cfg.forLabel}. Enter the password to view.</div>
            <input type="password" placeholder="Password" autoComplete="off" aria-label="Password" value={pw} onChange={(e) => { setPw(e.target.value); setErr(""); }} />
            <button type="submit">View inventory</button>
            <div className="gate-err">{err}</div>
          </form>
        </div>
      )}

      {unlocked && (
        <>
          <div className="a3-top">
            <div className="a3-top-in">
              <div className="brand"><b>LinkedVelocity</b><span>Account inventory</span></div>
              <div className="legend">
                {cfg.legend.map((l, i) => (
                  <span key={i} className={`lg ${l.cls}`}>{l.label}{l.value ? <> <i>{l.value}</i></> : null}</span>
                ))}
              </div>
            </div>
          </div>
          <main className="a3-main">
            <div className="hero">
              <span className="for">Prepared for {cfg.forLabel}</span>
              <h1>Account inventory</h1>
              <p>{cfg.heroBlurb}</p>
            </div>
            <div className="howto">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
              {cfg.showRent
                ? <div><b>Reserve or rent in one click.</b> On any available account, hit <b>Reserve 2 days</b> to hold it so no one else can take it, or <b>Rent →</b> to rent it now. Prefer to send a list? Tick several and use &quot;Copy my picks&quot; at the bottom.</div>
                : <div><b>Reserve in one click.</b> On any available account, hit <b>Reserve 2 days</b> to hold it so no one else can take it, then top up and we&apos;ll connect you with Sales Navigator included. Prefer to send a list? Tick several and use &quot;Copy my picks&quot; at the bottom.</div>}
            </div>
            <div className="filters">
              <input className="fsearch" type="search" placeholder="Search name, role, or industry…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search accounts" />
              <select value={industry} onChange={(e) => setIndustry(e.target.value)} aria-label="Filter by industry">
                <option value="">All industries</option>
                {industryOptions.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
              <select value={vFilter} onChange={(e) => setVFilter(e.target.value as "all" | "verified" | "unverified")} aria-label="Filter by verification">
                <option value="all">Verified + unverified</option>
                <option value="verified">Verified only</option>
                <option value="unverified">Unverified only</option>
              </select>
              {filtersActive && <button className="fclear" type="button" onClick={() => { setSearch(""); setIndustry(""); setVFilter("all"); }}>Clear</button>}
              <span className="fcount">{shownCount} shown</span>
            </div>
            <Group eyebrow="Ready today" cls="now" title="Available now" hint="Live and rentable right now. Reserve one to hold it for 2 days, or rent it straight away." items={buckets.now} picks={picks} onToggle={toggle} onReserve={reserve} onRelease={release} busyId={busyId} showRent={cfg.showRent} />
            <Group eyebrow="Within ~1 week" cls="soon" title="Freeing up soon" hint="Currently finishing another engagement. These can be yours within about a week of ordering." items={buckets.soon} picks={picks} onToggle={toggle} onReserve={reserve} onRelease={release} busyId={busyId} showRent={cfg.showRent} />
            <Group eyebrow="In warm-up" cls="warm" title="Coming soon" hint="Being aged and warmed now. Earmark any and we’ll prioritise them and hand them over once ready." items={buckets.warm} picks={picks} onToggle={toggle} onReserve={reserve} onRelease={release} busyId={busyId} showRent={cfg.showRent} />
            {shownCount === 0 && <div className="noresults">No accounts match those filters. Try clearing them.</div>}
            <p className="note">
              {filtersActive
                ? <>{shownCount} of {rows.length} accounts match &middot; {buckets.now.length} available now, {buckets.soon.length} within a week, {buckets.warm.length} in warm-up.</>
                : <>{rows.length} accounts total &middot; {buckets.now.length} available now, {buckets.soon.length} within a week, {buckets.warm.length} in warm-up.</>}<br />
              Prices per account / month. Earmark what you&apos;d like and we&apos;ll reserve them.
            </p>
          </main>
          <div className="bar">
            <div className="bar-in">
              <div className="bar-count"><b>{picks.size}</b> account{picks.size === 1 ? "" : "s"} earmarked</div>
              <div className="bar-actions">
                <button className="btn ghost" type="button" onClick={clearPicks}>Clear</button>
                <button className="btn primary" type="button" onClick={copyPicks} disabled={picks.size === 0}>Copy my picks</button>
              </div>
            </div>
          </div>
          <textarea ref={taRef} className="hid" readOnly />
          <div className={`toast${toast ? " show" : ""}`}>{toast}</div>
        </>
      )}
    </div>
  );
}
