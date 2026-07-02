"use client";

import { useEffect, useState } from "react";

export interface FaqItem { q: string; a: string; }
export interface FaqGroup { label: string; color: string; items: FaqItem[]; }

const CAL_URL = "https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ1he_qAS5s8faJzrAIjTJi8KIX9xvPhGbC4Ipn38lPTLzkfSuoyMIiqUrB0viY2jpXr_W_zLSdq";
const TG_URL = "https://t.me/linkedvelocity_support_bot";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function FaqView({ groups }: { groups: FaqGroup[] }) {
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const o: Record<string, boolean> = {};
    groups.forEach((g, gi) => g.items.forEach((_, ii) => { o[`${gi}-${ii}`] = gi === 0 && ii === 0; }));
    return o;
  });
  const [active, setActive] = useState<string>(groups[0]?.label || "");

  useEffect(() => {
    const els = groups.map((g) => document.getElementById("faq-" + slug(g.label))).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const obs = new IntersectionObserver((entries) => {
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (vis[0]) {
        const lbl = groups.find((g) => "faq-" + slug(g.label) === vis[0].target.id)?.label;
        if (lbl) setActive(lbl);
      }
    }, { rootMargin: "-15% 0px -75% 0px" });
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [groups]);

  const jump = (label: string) => {
    const el = document.getElementById("faq-" + slug(label));
    if (el) { const y = el.getBoundingClientRect().top + window.scrollY - 24; window.scrollTo({ top: y, behavior: "smooth" }); }
    setActive(label);
  };
  const toggle = (key: string) => setOpen((s) => ({ ...s, [key]: !s[key] }));

  const POP = "var(--font-poppins)", INT = "var(--font-inter)", MONO = "var(--font-jbmono)";

  return (
    <div style={{ fontFamily: INT, color: "#0B1220", background: "#FBFCFD", minHeight: "100vh" }}>
      <style>{`
        .lvfaq-grid{max-width:1160px;margin:0 auto;padding:28px 40px 80px;display:grid;grid-template-columns:290px minmax(0,1fr);gap:64px;align-items:start;}
        .lvfaq-rail{position:sticky;top:28px;align-self:start;}
        @media(max-width:900px){
          .lvfaq-grid{grid-template-columns:1fr;gap:28px;padding:20px 18px 64px;}
          .lvfaq-rail{position:static;}
          .lvfaq-catnav{flex-direction:row!important;flex-wrap:wrap;}
          .lvfaq-help{display:none;}
        }
      `}</style>

      {/* header band */}
      <div style={{ textAlign: "center", padding: "52px 24px 8px" }}>
        <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "#0A66C2", marginBottom: 16 }}>Frequently Asked Questions</div>
        <h1 style={{ fontFamily: POP, fontWeight: 700, fontSize: "clamp(32px,4.4vw,52px)", lineHeight: 1.05, letterSpacing: "-0.03em", margin: "0 0 18px" }}>Questions, answered</h1>
        <p style={{ fontSize: 18, lineHeight: 1.55, color: "#5A6473", margin: "0 auto", maxWidth: 600 }}>
          Everything you need to know about renting a verified LinkedIn account. Want to <a href="/become-ambassador" style={{ color: "#00A150", fontWeight: 600, textDecoration: "none" }}>earn by sharing yours →</a>
        </p>
      </div>

      <div className="lvfaq-grid">
        {/* LEFT RAIL */}
        <aside className="lvfaq-rail">
          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "#8A93A2", marginBottom: 16, paddingLeft: 2 }}>Browse by topic</div>
          <nav className="lvfaq-catnav" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {groups.map((g) => {
              const on = g.label === active;
              return (
                <button key={g.label} onClick={() => jump(g.label)} style={{
                  display: "flex", alignItems: "center", gap: 11, width: "100%", textAlign: "left", cursor: "pointer",
                  fontFamily: INT, fontSize: 14.5, fontWeight: on ? 600 : 500, color: on ? "#0B1220" : "#4A5563",
                  background: on ? "#FFFFFF" : "transparent", border: "1px solid " + (on ? "#E3E6EB" : "transparent"),
                  boxShadow: on ? "0 1px 2px rgba(16,24,40,0.05)" : "none", borderRadius: 11, padding: "11px 14px", transition: "all .15s",
                }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: g.color, flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{g.label}</span>
                  <span style={{ fontFamily: MONO, fontSize: 12, color: on ? g.color : "#A6AEB9", fontWeight: 500 }}>{g.items.length}</span>
                </button>
              );
            })}
          </nav>

          <div className="lvfaq-help" style={{ marginTop: 26, background: "#0D1B2A", borderRadius: 16, padding: 24 }}>
            <div style={{ fontFamily: POP, fontWeight: 600, fontSize: 17, color: "#fff", marginBottom: 8 }}>Still have questions?</div>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "#8FA0B4", margin: "0 0 18px" }}>Our team replies fast on Telegram, or grab a slot to talk it through.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              <a href={TG_URL} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#0A66C2", color: "#fff", borderRadius: 10, padding: 11, fontSize: 13.5, fontWeight: 600, textDecoration: "none" }}>💬 Chat on Telegram</a>
              <a href={CAL_URL} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "transparent", color: "#EAF0FA", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 10, padding: 11, fontSize: 13.5, fontWeight: 600, textDecoration: "none" }}>Book a Meeting →</a>
            </div>
          </div>
        </aside>

        {/* ACCORDION */}
        <div style={{ minWidth: 0 }}>
          {groups.map((g, gi) => (
            <div key={g.label} style={{ marginBottom: 38 }} id={"faq-" + slug(g.label)}>
              <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 16 }}>
                <span style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: g.color, background: g.color + "14", padding: "5px 11px", borderRadius: 7 }}>{g.label}</span>
                <span style={{ flex: 1, height: 1, background: "#EDEFF2" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {g.items.map((it, ii) => {
                  const key = `${gi}-${ii}`;
                  const isOpen = !!open[key];
                  return (
                    <div key={key} style={{ background: "#FFFFFF", border: "1px solid " + (isOpen ? g.color + "4D" : "#E9ECF0"), borderRadius: 14, boxShadow: isOpen ? "0 6px 20px rgba(16,24,40,0.06)" : "0 1px 2px rgba(16,24,40,0.03)", transition: "border-color .15s, box-shadow .15s", overflow: "hidden" }}>
                      <button onClick={() => toggle(key)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, background: "transparent", border: "none", cursor: "pointer", padding: "20px 22px", textAlign: "left" }}>
                        <span style={{ fontFamily: POP, fontWeight: 600, fontSize: 17.5, lineHeight: 1.35, color: "#0B1220" }}>{it.q}</span>
                        <span style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, fontWeight: 400, lineHeight: 1, color: isOpen ? "#FFFFFF" : g.color, background: isOpen ? g.color : g.color + "14", transition: "all .15s" }}>{isOpen ? "–" : "+"}</span>
                      </button>
                      <div style={{ display: "grid", gridTemplateRows: isOpen ? "1fr" : "0fr", transition: "grid-template-rows .28s ease", overflow: "hidden" }}>
                        <div style={{ minHeight: 0, overflow: "hidden" }}>
                          <div style={{ padding: "0 22px 22px", fontSize: 16, lineHeight: 1.7, color: "#4A5563" }}>{it.a}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
