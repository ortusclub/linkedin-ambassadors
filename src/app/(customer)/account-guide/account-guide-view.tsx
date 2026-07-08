"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { blogFontVars } from "@/lib/blog-fonts";

const POP = "var(--font-poppins)", INT = "var(--font-inter)", MONO = "var(--font-jbmono)";
const SUPPORT = "https://t.me/linkedvelocity_support_bot";

const SECTIONS = [
  { id: "sec-getting-in", label: "Getting in" },
  { id: "sec-limits", label: "Your daily limits" },
  { id: "sec-automation", label: "Automation & scraping" },
  { id: "sec-dos", label: "Do's and don'ts" },
  { id: "sec-wrong", label: "If something goes wrong" },
  { id: "sec-questions", label: "Questions?" },
];

const GETTING_IN = [
  <>Sign up for a free <strong>GoLogin</strong> account (app or web) using the email you rented with, then sign in.</>,
  <>We share the profile to you — find it under <strong>&quot;Shared with me.&quot;</strong> Don&apos;t see it yet? Refresh — it can take a minute or two to appear after renting.</>,
  <>Hit <strong>Start</strong> to launch the browser with LinkedIn already logged in. That&apos;s it — you&apos;re in.</>,
];

const LIMITS: [string, string][] = [
  ["Connection requests", "15–20 per day · keep under ~100 per week"],
  ["Messages to connections", "50–80 per day"],
  ["Profile views / scraping", "Keep it modest — steady pace, not hundreds in a burst"],
  ["Searches", "Space them out — don't rip through pages rapidly"],
  ["InMail messages", "Use sparingly — only to 2nd/3rd degree connections"],
  ["Endorsements / reactions", "Keep minimal — focus on outreach only"],
];

const AUTOMATION = [
  "Turn on randomized delays between actions (~5–30 seconds) — most tools have this setting.",
  "Ramp up gradually — run at roughly half-pace for the first week or two, then build.",
  "Run during business hours in the account's region, not around the clock.",
  "If you see a CAPTCHA, a \"weekly limit\" banner, or a drop in results — pause for a few days and ease back in.",
];

const DOS = [
  "Always open the account through your GoLogin profile.",
  "Send natural, personalised B2B messages.",
  "Stay within the daily limits above.",
  "Ask us for any profile changes (headline, experience, location) — we'll do it for you.",
  "Give us a heads-up if you connect any tool.",
];
const DONTS = [
  "Log in directly on LinkedIn.com or the app, or share the login.",
  "Change the name, photo, email, password, or security settings.",
  "Run scrapers or cloud tools that log in separately.",
  "Delete connections, link a payment card, or create a LinkedIn Ads account.",
  "Never use it for anything illegal, fraudulent, or deceptive.",
];

const RECOVERY: [string, string][] = [
  ["Let us handle the recovery — don't appeal it yourself.", "If an account gets restricted, please don't try to appeal or contact LinkedIn on your own. Just flag it to us and we'll sort it out — appealing yourself can make it harder to get back."],
  ["We'll always work to get it back.", "Whatever caused it, we jump on recovery straight away."],
  ["Stick to the guidelines and you're covered.", "If it happened even though you followed the tips above, there's no penalty — we credit your downtime, and if it can't come back we'll swap it for another."],
];

const ESCALATION: { n: string; title: string; body: string; bg: string; fg: string }[] = [
  { n: "1", title: "First time", body: "A friendly heads-up and a quick refresher on the tips. No penalty — everyone gets the benefit of the doubt.", bg: "#E4F6EC", fg: "#067A45" },
  { n: "2", title: "If it happens again", body: "We'll briefly pause access and look at the usage together, to get you back on track.", bg: "#FCE9BF", fg: "#8A5216" },
  { n: "3", title: "If it keeps happening", body: "We may need to end the rental, but we'd always talk it through with you first.", bg: "#FBE0E4", fg: "#B2304A" },
];

const secIcon: Record<string, { bg: string; fg: string; path: React.ReactNode }> = {
  "sec-getting-in": { bg: "#EAF2FC", fg: "#0A66C2", path: <><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /></> },
  "sec-limits": { bg: "#E4F6EC", fg: "#067A45", path: <path d="M12 20V10M18 20V4M6 20v-4" /> },
  "sec-automation": { bg: "#F1EFFB", fg: "#5747C9", path: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></> },
  "sec-dos": { bg: "#EAF2FC", fg: "#0A66C2", path: <><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></> },
  "sec-wrong": { bg: "#E4F6EC", fg: "#067A45", path: <><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><path d="M9 12l2 2 4-4" /></> },
};

function SecHead({ id, title }: { id: string; title: string }) {
  const i = secIcon[id];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
      <span style={{ width: 34, height: 34, borderRadius: 10, background: i.bg, color: i.fg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{i.path}</svg>
      </span>
      <h2 style={{ fontFamily: POP, fontWeight: 700, fontSize: 27, letterSpacing: "-0.02em", margin: 0 }}>{title}</h2>
    </div>
  );
}

export default function AccountGuideView() {
  const [activeId, setActiveId] = useState("sec-getting-in");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0);
      let cur = SECTIONS[0].id;
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= 140) cur = s.id;
      }
      setActiveId(cur);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 90, behavior: "smooth" });
  };

  const card = { background: "#fff", border: "1px solid #E6E8EC", borderRadius: 18, boxShadow: "0 4px 14px rgba(16,24,40,0.05), 0 1px 3px rgba(16,24,40,0.04)" } as const;
  const amber = { display: "flex", gap: 14, alignItems: "flex-start", background: "#FFF6EC", border: "1px solid #F6DCBB", borderLeft: "4px solid #E8912B", borderRadius: 12, padding: "16px 18px" } as const;

  return (
    <div className={blogFontVars} style={{ fontFamily: INT, color: "#0B1220", background: "#FBFCFD" }}>
      <style>{`.agv-toc button:hover{color:#0B1220!important}@media(max-width:900px){.agv-grid{grid-template-columns:1fr!important;gap:24px!important}.agv-toc{display:none!important}}`}</style>

      {/* progress bar */}
      <div style={{ position: "fixed", top: 0, left: 0, height: 3, width: `${progress}%`, background: "linear-gradient(90deg,#0A66C2,#00B85C)", zIndex: 60, transition: "width .08s linear" }} />

      {/* hero */}
      <section style={{ position: "relative", overflow: "hidden", background: "radial-gradient(80% 70% at 50% -10%, rgba(10,102,194,0.30) 0%, rgba(10,24,38,0) 62%), radial-gradient(60% 60% at 88% 20%, rgba(0,184,92,0.16) 0%, rgba(10,24,38,0) 60%), linear-gradient(180deg,#0F2439 0%,#0A1826 100%)", padding: "56px 24px 62px", textAlign: "center", color: "#EAF0FA" }}>
        <div style={{ position: "relative", maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 999, padding: "7px 15px", fontSize: 12.5, fontWeight: 600, color: "#CFE0F0", marginBottom: 22 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3EF08A" }} />Your account guide</div>
          <h1 style={{ fontFamily: POP, fontWeight: 800, fontSize: "clamp(32px,5vw,46px)", lineHeight: 1.06, letterSpacing: "-0.03em", margin: "0 auto 16px", color: "#fff", maxWidth: 600 }}>Getting the most from your <span style={{ color: "#4FE08C" }}>rented account</span></h1>
          <p style={{ fontSize: 18, lineHeight: 1.6, color: "#AFC4DB", margin: "0 auto", maxWidth: 500 }}>Everything you need to run your account well and keep it healthy. It&apos;s short, and mostly common sense.</p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "rgba(0,184,92,0.14)", border: "1px solid rgba(62,240,138,0.3)", borderRadius: 12, padding: "11px 18px", marginTop: 26, fontSize: 14, color: "#CDEFD9" }}>⏱️ About a 3-minute read · read it once, you&apos;re set</div>
        </div>
      </section>

      {/* body */}
      <div className="agv-grid" style={{ maxWidth: 1140, margin: "0 auto", padding: "40px 24px 20px", display: "grid", gridTemplateColumns: "220px minmax(0,1fr)", gap: 56, alignItems: "start" }}>
        {/* TOC */}
        <aside className="agv-toc" style={{ position: "sticky", top: 96, alignSelf: "start" }}>
          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "#8A93A2", marginBottom: 16, paddingLeft: 16 }}>On this page</div>
          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {SECTIONS.map((s) => {
              const on = s.id === activeId;
              return <button key={s.id} onClick={() => go(s.id)} style={{ display: "block", width: "100%", textAlign: "left", cursor: "pointer", fontFamily: INT, fontSize: 13.5, lineHeight: 1.4, fontWeight: on ? 600 : 500, color: on ? "#0B1220" : "#5A6473", background: "transparent", border: "none", borderLeft: "2px solid " + (on ? "#0A66C2" : "#E6E8EC"), padding: "8px 0 8px 14px", transition: "all .15s" }}>{s.label}</button>;
            })}
          </nav>
          <div style={{ marginTop: 24, padding: 18, background: "#0D1B2A", borderRadius: 14 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "#fff", marginBottom: 6 }}>Need a hand?</div>
            <p style={{ fontSize: 12.5, lineHeight: 1.55, color: "#8FA0B4", margin: "0 0 14px" }}>We reply fast on Telegram.</p>
            <a href={SUPPORT} target="_blank" rel="noopener noreferrer" style={{ display: "block", textAlign: "center", background: "#0A66C2", color: "#fff", fontSize: 13, fontWeight: 600, borderRadius: 9, padding: 9, textDecoration: "none" }}>Message support</a>
          </div>
        </aside>

        {/* content */}
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 44 }}>
          {/* getting in */}
          <section id="sec-getting-in">
            <SecHead id="sec-getting-in" title="Getting in" />
            <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "#5A6473", margin: "0 0 20px" }}>You&apos;ll use the account through <strong style={{ color: "#0B1220" }}>GoLogin</strong> — sign up for a free account, and we&apos;ll share the profile straight to you.</p>
            <div style={{ ...card, padding: "26px 28px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {GETTING_IN.map((h, i) => (
                  <div key={i} style={{ display: "flex", gap: 15, alignItems: "flex-start" }}>
                    <span style={{ flexShrink: 0, width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(150deg,#0A66C2,#2678DC)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: POP, fontWeight: 700, fontSize: 14, boxShadow: "0 5px 12px rgba(10,102,194,0.26)" }}>{i + 1}</span>
                    <p style={{ fontSize: 15.5, lineHeight: 1.65, color: "#37424F", margin: 0, paddingTop: 3 }}>{h}</p>
                  </div>
                ))}
              </div>
              <div style={{ ...amber, marginTop: 22 }}>
                <span style={{ flexShrink: 0, fontSize: 18 }}>⚠️</span>
                <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "#8A5216", margin: 0 }}><strong style={{ color: "#6B3E0C" }}>Always use the account through GoLogin.</strong> Please don&apos;t log in on LinkedIn.com or the app directly, or share the login — that&apos;s what keeps the account safe and consistent.</p>
              </div>
            </div>
          </section>

          {/* limits */}
          <section id="sec-limits">
            <SecHead id="sec-limits" title="Your daily limits" />
            <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "#5A6473", margin: "0 0 20px" }}>Staying inside these keeps your account healthy and well under LinkedIn&apos;s radar.</p>
            <div style={{ ...card, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", background: "#0F2439", color: "#fff" }}>
                <div style={{ padding: "14px 24px", fontFamily: MONO, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>Activity</div>
                <div style={{ padding: "14px 24px", fontFamily: MONO, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>Recommended daily limit</div>
              </div>
              {LIMITS.map(([a, l], i) => (
                <div key={a} style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", background: i % 2 ? "#F8FAFC" : "#fff", borderTop: "1px solid #EEF0F3" }}>
                  <div style={{ padding: "15px 24px", fontWeight: 600, fontSize: 14.5, color: "#0B1220" }}>{a}</div>
                  <div style={{ padding: "15px 24px", fontSize: 14.5, color: "#4A5563" }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ ...amber, marginTop: 16 }}>
              <span style={{ flexShrink: 0, fontSize: 18 }}>🌱</span>
              <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "#8A5216", margin: 0 }}><strong style={{ color: "#6B3E0C" }}>Warm-up:</strong> for the first week on a fresh account, start lower (~5–10 a day) and build up. If LinkedIn ever shows a warning, just pause for a couple of days and ease back in — it usually settles on its own.</p>
            </div>
          </section>

          {/* automation */}
          <section id="sec-automation">
            <SecHead id="sec-automation" title="Automation & scraping" />
            <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "#5A6473", margin: "0 0 20px" }}>You&apos;re welcome to run automation and data-scraping tools <strong style={{ color: "#0B1220" }}>inside your GoLogin browser</strong> (Dripify, Expandi, Linked Helper, and similar). Just keep it steady and human-paced.</p>
            <div style={{ ...card, padding: "24px 28px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                {AUTOMATION.map((t) => (
                  <div key={t} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 6, background: "#E4F6EC", color: "#067A45", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, marginTop: 1 }}>✓</span>
                    <p style={{ fontSize: 15, lineHeight: 1.6, color: "#37424F", margin: 0 }}>{t}</p>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: "#FFF6EC", border: "1.5px solid #F0B851", borderRadius: 16, padding: "22px 24px", marginTop: 16 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "#FCE9BF", color: "#8A5216", fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", padding: "5px 12px", borderRadius: 999, marginBottom: 14 }}>⚠️ Important</div>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: "#7A4A12", margin: 0 }}><strong style={{ color: "#6B3E0C" }}>There&apos;s no guaranteed &quot;safe&quot; number.</strong> LinkedIn&apos;s detection changes day to day, so the limits above are a <strong style={{ color: "#6B3E0C" }}>ceiling to stay under, not a target to hit</strong>. The safest approach is to keep automation to a minimum and stay comfortably below these ranges — the lower and steadier you run, the less chance of any disruption. And run tools <strong style={{ color: "#6B3E0C" }}>inside GoLogin only</strong> — never a cloud tool that logs into the account separately (that&apos;s the #1 cause of restrictions).</p>
            </div>
          </section>

          {/* do / don't */}
          <section id="sec-dos">
            <SecHead id="sec-dos" title="Do's and don'ts" />
            <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "#5A6473", margin: "0 0 20px" }}>A quick rundown of what keeps your account healthy — and what to steer clear of.</p>
            <div className="agv-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
              <div style={{ background: "#F2FAF5", border: "1px solid #CDEBD9", borderRadius: 16, padding: "22px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16 }}><span style={{ width: 26, height: 26, borderRadius: 8, background: "#00A150", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>✓</span><span style={{ fontFamily: POP, fontWeight: 700, fontSize: 17, color: "#067A45" }}>Do</span></div>
                <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                  {DOS.map((d) => <div key={d} style={{ display: "flex", gap: 11, alignItems: "flex-start", fontSize: 14.5, lineHeight: 1.55, color: "#37424F" }}><span style={{ color: "#00A150", fontWeight: 700, marginTop: 1 }}>✓</span><span>{d}</span></div>)}
                </div>
              </div>
              <div style={{ background: "#FCF2F4", border: "1px solid #F3D2DA", borderRadius: 16, padding: "22px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16 }}><span style={{ width: 26, height: 26, borderRadius: 8, background: "#C2334E", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>✕</span><span style={{ fontFamily: POP, fontWeight: 700, fontSize: 17, color: "#B2304A" }}>Don&apos;t</span></div>
                <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                  {DONTS.map((d) => <div key={d} style={{ display: "flex", gap: 11, alignItems: "flex-start", fontSize: 14.5, lineHeight: 1.55, color: "#5A4448" }}><span style={{ color: "#C2334E", fontWeight: 700, marginTop: 1 }}>✕</span><span>{d}</span></div>)}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 13, alignItems: "flex-start", background: "#F2F7FF", border: "1px solid #DCE9FB", borderRadius: 12, padding: "16px 18px", marginTop: 16 }}>
              <span style={{ flexShrink: 0, fontSize: 17 }}>✏️</span>
              <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "#37424F", margin: 0 }}>Want the profile tailored to your outreach — a different headline, experience, or location? Just <a href={SUPPORT} target="_blank" rel="noopener noreferrer" style={{ color: "#0A66C2", fontWeight: 600, textDecoration: "none" }}>message us</a> and we&apos;ll handle it (we can change anything except the name and photo).</p>
            </div>
          </section>

          {/* if something goes wrong */}
          <section id="sec-wrong">
            <SecHead id="sec-wrong" title="If something goes wrong" />
            <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "#5A6473", margin: "0 0 20px" }}>Restrictions happen now and then, even to careful users — it&apos;s part of LinkedIn, and most are temporary. Here&apos;s exactly how we handle it, so there are never surprises.</p>
            <div style={{ ...card, padding: "26px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
              {RECOVERY.map(([t, b]) => (
                <div key={t} style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
                  <span style={{ flexShrink: 0, color: "#00A150", marginTop: 2 }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg></span>
                  <p style={{ fontSize: 15, lineHeight: 1.65, color: "#37424F", margin: 0 }}><strong style={{ color: "#0B1220" }}>{t}</strong> {b}</p>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 14.5, fontWeight: 600, color: "#0B1220", margin: "22px 0 14px" }}>And if an account keeps getting restricted from heavy use, here&apos;s what happens — we keep it fair and predictable:</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {ESCALATION.map((e) => (
                <div key={e.n} style={{ display: "flex", gap: 14, alignItems: "flex-start", background: "#fff", border: "1px solid #E9ECF0", borderRadius: 14, padding: "16px 18px" }}>
                  <span style={{ flexShrink: 0, width: 26, height: 26, borderRadius: "50%", background: e.bg, color: e.fg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: POP, fontWeight: 700, fontSize: 13 }}>{e.n}</span>
                  <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "#37424F", margin: 0, paddingTop: 2 }}><strong style={{ color: "#0B1220" }}>{e.title}</strong> — {e.body}</p>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "#8A93A2", margin: "14px 0 0" }}>Only repeated heavy use counts toward this — a one-off, or a restriction that wasn&apos;t your fault, never does.</p>
            <div style={{ background: "#FFF6EC", border: "1.5px solid #F0B851", borderRadius: 16, padding: "22px 24px", marginTop: 16 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "#FCE9BF", color: "#8A5216", fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", padding: "5px 12px", borderRadius: 999, marginBottom: 14 }}>⚠️ Please take note</div>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: "#7A4A12", margin: 0 }}><strong style={{ color: "#6B3E0C" }}>Above all — these are real people.</strong> Every account belongs to a real, consenting professional who&apos;s trusted us with their profile. Please only ever use it for genuine, legitimate business — never anything illegal, fraudulent, or deceptive. If we spot something serious, we&apos;ll pause access and ask what happened, and a genuine breach ends the rental (no refund).</p>
            </div>
          </section>

          {/* questions */}
          <section id="sec-questions">
            <div style={{ background: "linear-gradient(160deg,#12305F,#0A1826)", borderRadius: 20, padding: "40px 32px 42px", textAlign: "center", color: "#EAF0FA" }}>
              <h2 style={{ fontFamily: POP, fontWeight: 700, fontSize: 28, letterSpacing: "-0.02em", margin: "0 0 10px", color: "#fff" }}>Questions?</h2>
              <p style={{ fontSize: 16, lineHeight: 1.6, color: "#AFC4DB", margin: "0 auto 8px", maxWidth: 460 }}>A profile tweak, a tool you want to use, or a restriction — just reach out and we&apos;ll sort it.</p>
              <div style={{ fontSize: 15, color: "#CFE0F0", marginBottom: 26 }}>Telegram <a href={SUPPORT} target="_blank" rel="noopener noreferrer" style={{ color: "#7FB2EE", fontWeight: 600, textDecoration: "none" }}>@linkedvelocity_support_bot</a></div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <Link href="/dashboard" style={{ background: "#0A66C2", color: "#fff", fontSize: 15, fontWeight: 600, padding: "13px 24px", borderRadius: 12, textDecoration: "none" }}>Go to dashboard</Link>
                <Link href="/how-it-works" style={{ background: "rgba(255,255,255,0.1)", color: "#EAF0FA", border: "1px solid rgba(255,255,255,0.2)", fontSize: 15, fontWeight: 600, padding: "13px 24px", borderRadius: 12, textDecoration: "none" }}>How renting works</Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
