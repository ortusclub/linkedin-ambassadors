"use client";

import { useState } from "react";

// LinkedArmy homepage (brand = linkedarmy). SDR-agency framing, from the v2 design:
// deep teal ink + electric lime + coral on paper, brutalist 2px borders, big tight lowercase.
// Self-contained nav + footer (the global Navbar/Footer are suppressed for this page).
//
// PLACEHOLDER DATA — the stats, prices and roster below are illustrative from the mockup and
// MUST be replaced with real figures before this is promoted. Roster is intentionally generic
// (role, not invented people).

const CALENDAR_URL =
  "https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ1he_qAS5s8faJzrAIjTJi8KIX9xvPhGbC4Ipn38lPTLzkfSuoyMIiqUrB0viY2jpXr_W_zLSdq";

// PLACEHOLDER — top strip metrics
const STRIP = [
  { n: "62", l: "SDRs on the roster" },
  { n: "0", l: "bots" },
  { n: "4,100", l: "meetings booked" },
  { n: "21%", l: "reply rate" },
  { n: "14", l: "days to first meeting" },
];

const COMPARE = [
  { k: "time to first meeting", hire: "4–6 months", deploy: "14 days" },
  { k: "cost per year", hire: "$92k + tools", deploy: "from $28.8k" },
  { k: "recruiting & ramp", hire: "on you", deploy: "on us" },
  { k: "if it's not working", hire: "PIP, rehire", deploy: "swap the SDR" },
  { k: "scale up", hire: "another job post", deploy: "change your plan" },
];

const STEPS = [
  { n: "01", t: "brief", d: "One call on your ICP, offer and voice. We write the playbook; you approve it." },
  { n: "02", t: "deploy", d: "SDRs matched to your market, profiles set up and warmed, target lists built." },
  { n: "03", t: "reach out", d: "Researched, personal messages and follow-ups. Written by people, every one." },
  { n: "04", t: "meet", d: "Qualified calls land on your calendar. Weekly report, in meetings not vanity metrics." },
];

// PLACEHOLDER — results metrics
const STATS = [
  { label: "sdrs deployed", value: "62", delta: "+8 this quarter" },
  { label: "meetings booked", value: "4,100", delta: "+612 last 30 days" },
  { label: "avg reply rate", value: "21%", delta: "vs ~6% industry" },
  { label: "cost per meeting", value: "$118", delta: "−71% vs in-house" },
];

// PLACEHOLDER — pricing
const TIERS = [
  { name: "crew", badge: "2 sdrs", monthly: 2400, cta: "deploy a crew", featured: false,
    items: ["2 dedicated SDRs", "1 ideal customer profile", "~20 meetings / month", "Weekly report"] },
  { name: "crowd", badge: "most picked · 5 sdrs", monthly: 5500, cta: "deploy a crowd", featured: true,
    items: ["5 dedicated SDRs", "Up to 3 ICPs", "~55 meetings / month", "Shared Slack channel"] },
  { name: "army", badge: "12+ sdrs", monthly: null, cta: "talk to us", featured: false,
    items: ["12+ SDRs, any mix of markets", "Dedicated team lead", "CRM sync & custom reporting", "Quarterly strategy review"] },
];

const FAQS = [
  { q: "is any of this automated?", a: "No. Real SDRs research, write and reply. We use tools for scheduling and CRM, never for writing messages." },
  { q: "whose linkedin profiles do you use?", a: "Your team's profiles, our SDRs' own, or a mix. We'll recommend one based on your market." },
  { q: "how fast will we see meetings?", a: "Most clients get their first booked calls within 14 days of the brief." },
  { q: "can we cancel?", a: "Yes. Plans run month to month. Annual saves 15% if you'd rather commit." },
];

export type ArmyRosterCard = {
  id: string;
  name: string;
  headline: string | null;
  connections: number;
  industry: string | null;
  location: string | null;
  hasSalesNav: boolean;
  verified: boolean;
};

const fmtConns = (c: number) =>
  c >= 1000 ? `${(c / 1000).toFixed(c % 1000 >= 100 ? 1 : 0)}k+` : c > 0 ? `${c}` : "—";

export function LinkedArmyHome({ roster }: { roster: ArmyRosterCard[] }) {
  const [annual, setAnnual] = useState(false);
  const price = (n: number) => "$" + Math.round(annual ? n * 0.85 : n).toLocaleString("en-US");

  return (
    <div className="la2">
      <style>{`
        .la2{
          --bg:#f0f0ee; --surface:#e6e6e3; --ink:#0e404b; --accent:#e4fb25; --coral:#ff7a59;
          --teal:#2e6f78; --footer:#072a32; --accent-700:#5a6100; --hl:#f4fdc4;
          --n100:#f6f6f7; --n200:#e8e8ea; --n300:#d3d3d6; --n700:#5f5f63; --n800:#434346; --n900:#2c2c2f;
          --divider:color-mix(in srgb,#0e404b 35%,transparent);
          background:var(--bg); color:var(--ink);
          font-weight:600; letter-spacing:-0.01em;
        }
        .la2 *{box-sizing:border-box}
        .la2 h1,.la2 h2{text-wrap:balance;margin:0}
        .la2 a{color:var(--ink);text-decoration:none}
        .la2 .lnk:hover{color:var(--accent-700)}
        .la2 .btn{background:var(--ink);color:var(--bg);font-weight:800;text-decoration:none;transition:background .15s}
        .la2 .btn:hover{background:var(--n900)}
        .la2 .cell{border-right:2px solid var(--ink)}
        .la2 .seg{border:0;cursor:pointer;font:inherit;font-weight:800;padding:10px 16px;color:var(--ink);background:transparent}
        .la2 .seg.on{background:var(--ink);color:var(--bg)}
        @media(prefers-reduced-motion:reduce){.la2 *{transition:none!important}}
      `}</style>

      {/* ===== LIME TOP BLOCK: nav + hero + strip ===== */}
      <div style={{ background: "var(--accent)", borderBottom: "2px solid var(--ink)" }}>
        <nav style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 24, padding: "16px clamp(20px,4vw,56px)", borderBottom: "2px solid var(--ink)", fontSize: 14, fontWeight: 600 }}>
          <a href="#top" style={{ display: "flex", alignItems: "baseline", gap: 3, fontWeight: 800, fontSize: 24, letterSpacing: "-0.045em", marginRight: "auto" }}>linkedarmy<span style={{ width: 7, height: 7, background: "var(--ink)" }} /></a>
          <a href="#how" className="lnk">how it works</a>
          <a href="#roster" className="lnk">roster</a>
          <a href="#results" className="lnk">results</a>
          <a href="#pricing" className="lnk">pricing</a>
          <a href="#faq" className="lnk">faq</a>
          <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer" className="btn" style={{ padding: "10px 16px" }}>deploy a team</a>
        </nav>

        <header id="top" style={{ padding: "clamp(40px,7vw,96px) clamp(20px,4vw,56px) clamp(32px,5vw,64px)", display: "flex", flexDirection: "column", gap: "clamp(24px,3vw,40px)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>outbound team on demand</div>
          {/* Hero headline — alternatives: "hire a crowd, not a headcount." / "stop hiring sdrs. start deploying them." */}
          <h1 style={{ fontSize: "clamp(56px,10.5vw,176px)", fontWeight: 800, lineHeight: 0.9, letterSpacing: "-0.055em" }}>strength in numbers. real ones.</h1>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,340px),1fr))", gap: 32, alignItems: "end" }}>
            <p style={{ margin: 0, fontSize: "clamp(17px,1.5vw,21px)", lineHeight: 1.45, fontWeight: 600, maxWidth: 560 }}>Hiring an SDR takes 4 months. Deploying ten takes 14 days. A team of real SDRs runs your LinkedIn outreach (research, messages, follow-ups, booked calls) and you show up to the meetings.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 420 }}>
              <a href="#pricing" className="btn" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, fontSize: 16, padding: "16px 18px" }}><span>price my team</span><span>→</span></a>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Month to month. No setup fee. Plans from $2,400/mo.</span>
            </div>
          </div>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", borderTop: "2px solid var(--ink)", background: "var(--bg)" }}>
          {STRIP.map((s) => (
            <div key={s.l} className="cell" style={{ padding: "14px clamp(20px,2vw,28px)", display: "flex", alignItems: "baseline", gap: 8, fontSize: 14, fontWeight: 600 }}><strong style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>{s.n}</strong>{s.l}</div>
          ))}
        </div>
      </div>

      {/* ===== HIRING VS DEPLOYING ===== */}
      <section style={{ padding: "clamp(48px,7vw,96px) clamp(20px,4vw,56px)", borderBottom: "2px solid var(--divider)", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,420px),1fr))", gap: "clamp(32px,5vw,72px)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent-700)" }}>hiring vs deploying</div>
          <h2 style={{ fontSize: "clamp(40px,5.5vw,80px)", fontWeight: 800, lineHeight: 0.95, letterSpacing: "-0.05em" }}>hiring takes months. deploying takes days.</h2>
          <p style={{ margin: 0, fontSize: 17, lineHeight: 1.5, maxWidth: 460, color: "var(--n800)" }}>You don&apos;t need another job post. You need the output of an SDR team, staffed, trained and accountable, starting this month.</p>
        </div>
        <div style={{ borderTop: "2px solid var(--ink)", minWidth: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 12, padding: "12px 0", borderBottom: "2px solid var(--ink)", fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>
            <span /><span style={{ color: "var(--n700)" }}>hiring one sdr</span><span>deploying linkedarmy</span>
          </div>
          {COMPARE.map((c) => (
            <div key={c.k} style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 12, padding: "16px 0", borderBottom: "1px solid var(--divider)", alignItems: "baseline" }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{c.k}</span>
              <span style={{ fontSize: 18, color: "var(--n700)", textDecoration: "line-through", textDecorationThickness: 1 }}>{c.hire}</span>
              <span style={{ fontSize: 18, fontWeight: 800 }}><span style={{ background: "var(--hl)", padding: "0 4px", boxShadow: "inset 0 -3px 0 var(--accent)" }}>{c.deploy}</span></span>
            </div>
          ))}
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how" style={{ borderBottom: "2px solid var(--divider)" }}>
        <div style={{ padding: "clamp(48px,6vw,80px) clamp(20px,4vw,56px) 32px", display: "flex", flexWrap: "wrap", alignItems: "end", gap: 24, justifyContent: "space-between" }}>
          <h2 style={{ fontSize: "clamp(40px,5.5vw,80px)", fontWeight: 800, lineHeight: 0.95, letterSpacing: "-0.05em" }}>how it works</h2>
          <span style={{ fontSize: 15, fontWeight: 600 }}>brief on monday · first meetings in about 14 days</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,240px),1fr))", borderTop: "2px solid var(--divider)" }}>
          {STEPS.map((s) => (
            <div key={s.n} style={{ padding: "28px clamp(20px,2.5vw,32px) 40px", borderRight: "2px solid var(--divider)", display: "flex", flexDirection: "column", gap: 12 }}>
              <span style={{ alignSelf: "flex-start", background: "var(--teal)", color: "var(--bg)", fontSize: 13, fontWeight: 800, padding: "4px 8px", fontVariantNumeric: "tabular-nums" }}>{s.n}</span>
              <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1 }}>{s.t}</span>
              <span style={{ fontSize: 15, lineHeight: 1.5, color: "var(--n800)" }}>{s.d}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ===== RESULTS (dark) — PLACEHOLDER METRICS ===== */}
      <section id="results" style={{ background: "var(--ink)", color: "var(--bg)" }}>
        <div style={{ padding: "clamp(48px,6vw,80px) clamp(20px,4vw,56px) 40px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent)" }}>results · last 12 months</div>
          <h2 style={{ fontSize: "clamp(40px,5.5vw,80px)", fontWeight: 800, lineHeight: 0.95, letterSpacing: "-0.05em" }}>we report meetings. not impressions.</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,220px),1fr))", borderTop: "2px solid var(--teal)" }}>
          {STATS.map((s) => (
            <div key={s.label} style={{ padding: "24px clamp(20px,2.5vw,32px) 36px", borderRight: "2px solid var(--teal)", display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9cc3c7" }}>{s.label}</span>
              <span style={{ fontSize: "clamp(48px,5vw,72px)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{s.value}</span>
              <span style={{ fontSize: 14, color: "var(--accent)" }}>{s.delta}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ===== THE ROSTER — real, masked profiles from the shared catalogue ===== */}
      <section id="roster" style={{ borderBottom: "2px solid var(--divider)" }}>
        <div style={{ padding: "clamp(48px,6vw,80px) clamp(20px,4vw,56px) 32px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,380px),1fr))", gap: 24, alignItems: "end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}><span style={{ alignSelf: "flex-start", background: "var(--coral)", color: "var(--ink)", fontSize: 13, fontWeight: 800, padding: "5px 10px" }}>meet the roster</span><h2 style={{ fontSize: "clamp(40px,5.5vw,80px)", fontWeight: 800, lineHeight: 0.95, letterSpacing: "-0.05em" }}>real humans.<br />0 bots.</h2></div>
          <p style={{ margin: 0, fontSize: 17, lineHeight: 1.5, maxWidth: 480, color: "var(--n800)" }}>Browse the people behind your outreach. Every one is a real, established LinkedIn profile, vetted and named on your account. First-name-only here; full details once you&apos;re working together.</p>
        </div>
        {roster.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,220px),1fr))", borderTop: "2px solid var(--divider)" }}>
            {roster.map((p) => (
              <div key={p.id} style={{ borderRight: "2px solid var(--divider)", borderBottom: "2px solid var(--divider)", display: "flex", flexDirection: "column" }}>
                <div style={{ aspectRatio: "4/5", background: "repeating-linear-gradient(45deg,var(--n200) 0 8px,var(--n100) 8px 16px)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: 10 }}>
                  <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 11, color: "var(--n700)" }}>{p.industry || "SDR"}</span>
                  {p.verified && <span style={{ background: "var(--ink)", color: "var(--bg)", fontSize: 10, fontWeight: 800, padding: "2px 5px" }}>✓</span>}
                </div>
                <div style={{ padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em" }}><span style={{ width: 8, height: 8, background: "var(--coral)", flexShrink: 0 }} />{p.name}</span>
                  {p.headline && <span style={{ fontSize: 13, color: "var(--n700)", lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.headline}</span>}
                  <span style={{ fontSize: 12, color: "var(--n700)", fontWeight: 700 }}>{fmtConns(p.connections)} connections{p.hasSalesNav ? " · SalesNav" : ""}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ padding: "clamp(28px,4vw,44px) clamp(20px,4vw,56px)", borderTop: "2px solid var(--divider)", display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Hundreds of real profiles across SaaS, fintech, agencies and more.</span>
          <a href="/catalogue" className="btn" style={{ display: "flex", justifyContent: "space-between", gap: 32, minWidth: 260, fontSize: 15, padding: "14px 18px" }}><span>browse the full roster</span><span>→</span></a>
        </div>
      </section>

      {/* ===== PRICING — PLACEHOLDER ===== */}
      <section id="pricing" style={{ borderBottom: "2px solid var(--divider)" }}>
        <div style={{ padding: "clamp(48px,6vw,80px) clamp(20px,4vw,56px) 32px", display: "flex", flexWrap: "wrap", alignItems: "end", gap: 24, justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent-700)" }}>pricing</div>
            <h2 style={{ fontSize: "clamp(40px,5.5vw,80px)", fontWeight: 800, lineHeight: 0.95, letterSpacing: "-0.05em" }}>pick your headcount.</h2>
          </div>
          <div style={{ display: "flex", border: "2px solid var(--ink)", fontSize: 14, fontWeight: 800 }}>
            <button className={`seg ${annual ? "" : "on"}`} onClick={() => setAnnual(false)}>monthly</button>
            <button className={`seg ${annual ? "on" : ""}`} onClick={() => setAnnual(true)}>annual · save 15%</button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,280px),1fr))", borderTop: "2px solid var(--divider)" }}>
          {TIERS.map((t) => (
            <div key={t.name} style={{ padding: "28px clamp(20px,2.5vw,32px) 32px", borderRight: "2px solid var(--divider)", display: "flex", flexDirection: "column", gap: 20, background: t.featured ? "var(--hl)" : undefined, boxShadow: t.featured ? "inset 0 6px 0 var(--accent)" : undefined }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                <span style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.045em", lineHeight: 1 }}>{t.name}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{t.badge}</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}><span style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums" }}>{t.monthly ? price(t.monthly) : "custom"}</span>{t.monthly && <span style={{ fontSize: 14, fontWeight: 600 }}>/mo</span>}</div>
              <div style={{ display: "flex", flexDirection: "column", borderTop: "2px solid var(--ink)" }}>
                {t.items.map((i) => (
                  <span key={i} style={{ padding: "10px 0", borderBottom: "1px solid var(--divider)", fontSize: 15 }}>{i}</span>
                ))}
              </div>
              <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer" className="btn" style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", fontSize: 15, padding: "14px 16px" }}><span>{t.cta}</span><span>→</span></a>
            </div>
          ))}
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" style={{ padding: "clamp(48px,6vw,80px) clamp(20px,4vw,56px)", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,360px),1fr))", gap: "clamp(32px,5vw,72px)", borderBottom: "2px solid var(--ink)" }}>
        <h2 style={{ fontSize: "clamp(40px,5.5vw,80px)", fontWeight: 800, lineHeight: 0.95, letterSpacing: "-0.05em" }}>fair questions.</h2>
        <div style={{ borderTop: "2px solid var(--ink)", minWidth: 0 }}>
          {FAQS.map((f) => (
            <div key={f.q} style={{ padding: "20px 0", borderBottom: "1px solid var(--divider)", display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>{f.q}</span>
              <span style={{ fontSize: 15, lineHeight: 1.5, color: "var(--n800)", maxWidth: 620 }}>{f.a}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section style={{ background: "var(--accent)", padding: "clamp(56px,9vw,128px) clamp(20px,4vw,56px)", display: "flex", flexDirection: "column", gap: 32, borderBottom: "2px solid var(--ink)" }}>
        <h2 style={{ fontSize: "clamp(56px,10vw,168px)", fontWeight: 800, lineHeight: 0.9, letterSpacing: "-0.055em" }}>many hands. one pipeline.</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center" }}>
          <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer" className="btn" style={{ display: "flex", justifyContent: "space-between", gap: 48, minWidth: 280, fontSize: 16, padding: "16px 18px" }}><span>deploy a team</span><span>→</span></a>
          <span style={{ fontSize: 15, fontWeight: 600 }}>15-minute call. You&apos;ll leave with a target list and a price.</span>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer style={{ background: "var(--footer)", color: "var(--bg)", padding: "28px clamp(20px,4vw,56px)", display: "flex", flexWrap: "wrap", gap: 24, alignItems: "baseline", fontSize: 13 }}>
        <span style={{ display: "flex", alignItems: "baseline", gap: 3, fontWeight: 800, fontSize: 20, letterSpacing: "-0.045em", marginRight: "auto" }}>linkedarmy<span style={{ width: 6, height: 6, background: "var(--coral)" }} /></span>
        <a href="#how" style={{ color: "var(--bg)" }}>how it works</a>
        <a href="#pricing" style={{ color: "var(--bg)" }}>pricing</a>
        <a href="#faq" style={{ color: "var(--bg)" }}>faq</a>
        <span style={{ color: "var(--n300)" }}>© 2026 linkedarmy.com</span>
      </footer>
    </div>
  );
}
