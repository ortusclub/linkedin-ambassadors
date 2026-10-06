"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { blogFontVars } from "@/lib/blog-fonts";

const POP = "var(--font-poppins)", INT = "var(--font-inter)", MONO = "var(--font-jbmono)";
const SUPPORT = "https://t.me/linkedvelocity_support_bot";

const SECTIONS = [
  { id: "sec-donts", label: "Don'ts" },
  { id: "sec-dos", label: "Do's" },
  { id: "sec-proviso", label: "Right to cancel" },
];

type Rule = { lead: string; rest?: string };

const DONTS: Rule[] = [
  { lead: "Never change the profile's name.", rest: "Doing so will result in a permanent ban from renting profiles through LV." },
  { lead: "Do not change the profile picture without prior written permission from LV." },
  { lead: "Do not log in outside your assigned GoLogin browser profile", rest: "unless LV has given prior written permission. This includes other browsers, devices, and the LinkedIn mobile app." },
  { lead: "If permission to access the account outside GoLogin has been granted, you must use the proxy assigned by LV every time you access it." },
  { lead: "Do not make more than one profile change per day.", rest: "Spread larger updates across several days." },
  { lead: "Do not change GoLogin settings,", rest: "including the assigned proxy or browser configuration, unless instructed by LV." },
  { lead: "Do not share account access,", rest: "passwords, authentication codes, or GoLogin links with anyone who has not been approved by LV." },
  { lead: "Do not delete existing connections." },
  { lead: "Never use the account for illegal, fraudulent, deceptive, abusive, or harassing activity." },
  { lead: "Do not repeatedly retry failed logins or attempt to bypass restrictions or identity checks.", rest: "Stop and contact LV." },
];

const DOS: Rule[] = [
  { lead: "You may update profile information without prior approval,", rest: "including experience, job title, location, and interests. Make only one change per day, spreading larger updates across several days. The name and profile-picture restrictions above still apply." },
  { lead: "You may install browser extensions and use third-party automation or scraping tools responsibly.", rest: "Follow each tool's recommended usage and safety limits. Do not bypass these limits or combine tools to exceed them." },
  { lead: "If LinkedIn displays a warning, please reduce your automated activity volume." },
];

const secIcon: Record<string, { bg: string; fg: string; path: React.ReactNode }> = {
  "sec-donts": { bg: "#FCF2F4", fg: "#C2334E", path: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></> },
  "sec-dos": { bg: "#E4F6EC", fg: "#067A45", path: <><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></> },
  "sec-proviso": { bg: "#EAF2FC", fg: "#0A66C2", path: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M9 13h6M9 17h6" /></> },
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

export default function AccountGuideV2View() {
  const [activeId, setActiveId] = useState("sec-donts");
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

  return (
    <div className={blogFontVars} style={{ fontFamily: INT, color: "#0B1220", background: "#FBFCFD" }}>
      <style>{`.agv-toc button:hover{color:#0B1220!important}@media(max-width:900px){.agv-grid{grid-template-columns:1fr!important;gap:24px!important}.agv-toc{display:none!important}}`}</style>

      {/* progress bar */}
      <div style={{ position: "fixed", top: 0, left: 0, height: 3, width: `${progress}%`, background: "linear-gradient(90deg,#0A66C2,#00B85C)", zIndex: 60, transition: "width .08s linear" }} />

      {/* hero */}
      <section style={{ position: "relative", overflow: "hidden", background: "radial-gradient(80% 70% at 50% -10%, rgba(10,102,194,0.30) 0%, rgba(10,24,38,0) 62%), radial-gradient(60% 60% at 88% 20%, rgba(0,184,92,0.16) 0%, rgba(10,24,38,0) 60%), linear-gradient(180deg,#0F2439 0%,#0A1826 100%)", padding: "56px 24px 62px", textAlign: "center", color: "#EAF0FA" }}>
        <div style={{ position: "relative", maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 999, padding: "7px 15px", fontSize: 12.5, fontWeight: 600, color: "#CFE0F0", marginBottom: 22 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3EF08A" }} />Account care rules</div>
          <h1 style={{ fontFamily: POP, fontWeight: 800, fontSize: "clamp(32px,5vw,46px)", lineHeight: 1.06, letterSpacing: "-0.03em", margin: "0 auto 16px", color: "#fff", maxWidth: 600 }}>The rules for your <span style={{ color: "#4FE08C" }}>rented account</span></h1>
          <p style={{ fontSize: 18, lineHeight: 1.6, color: "#AFC4DB", margin: "0 auto", maxWidth: 500 }}>A few clear do&apos;s and don&apos;ts that keep your account healthy. It&apos;s short, and mostly common sense.</p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "rgba(0,184,92,0.14)", border: "1px solid rgba(62,240,138,0.3)", borderRadius: 12, padding: "11px 18px", marginTop: 26, fontSize: 14, color: "#CDEFD9" }}>⏱️ Under a minute · read it once, you&apos;re set</div>
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
          {/* don'ts */}
          <section id="sec-donts">
            <SecHead id="sec-donts" title="Don'ts" />
            <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "#5A6473", margin: "0 0 20px" }}>The things that put an account at risk. A couple carry a hard penalty, so these matter most.</p>
            <div style={{ background: "#FCF2F4", border: "1px solid #F3D2DA", borderRadius: 16, padding: "24px 26px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                {DONTS.map((r) => (
                  <div key={r.lead} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 6, background: "#F7DCE2", color: "#C2334E", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, marginTop: 1 }}>✕</span>
                    <p style={{ fontSize: 15, lineHeight: 1.6, color: "#5A4448", margin: 0 }}><strong style={{ color: "#0B1220" }}>{r.lead}</strong>{r.rest ? " " + r.rest : ""}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* do's */}
          <section id="sec-dos">
            <SecHead id="sec-dos" title="Do's" />
            <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "#5A6473", margin: "0 0 20px" }}>What you&apos;re free to do without checking in first.</p>
            <div style={{ background: "#F2FAF5", border: "1px solid #CDEBD9", borderRadius: 16, padding: "24px 26px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                {DOS.map((r) => (
                  <div key={r.lead} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 6, background: "#D7F0E0", color: "#067A45", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, marginTop: 1 }}>✓</span>
                    <p style={{ fontSize: 15, lineHeight: 1.6, color: "#37424F", margin: 0 }}><strong style={{ color: "#0B1220" }}>{r.lead}</strong>{r.rest ? " " + r.rest : ""}</p>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 13, alignItems: "flex-start", background: "#F2F7FF", border: "1px solid #DCE9FB", borderRadius: 12, padding: "16px 18px", marginTop: 16 }}>
              <span style={{ flexShrink: 0, fontSize: 17 }}>ℹ️</span>
              <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "#37424F", margin: 0 }}>Following the one-change-per-day rule and a tool&apos;s recommended limits does not guarantee protection against account restrictions.</p>
            </div>
          </section>

          {/* proviso */}
          <section id="sec-proviso">
            <SecHead id="sec-proviso" title="Proviso — right to cancel" />
            <div style={{ ...card, padding: "26px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ fontSize: 15, lineHeight: 1.65, color: "#37424F", margin: 0 }}>While some account restrictions may be unavoidable, a higher-than-average restriction rate may indicate misuse or excessive activity and may prompt a review of your usage.</p>
              <p style={{ fontSize: 15, lineHeight: 1.65, color: "#37424F", margin: 0 }}>LV reserves the right to suspend or cancel your subscription or rental, revoke access to the account(s), and refuse future rentals if we reasonably believe you are exceeding usage limits, misusing the account(s), or exposing them to excessive risk. We may take immediate action without prior notice where necessary to protect the account(s).</p>
            </div>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "#5A6473", margin: "18px 0 0" }}>Want the full walkthrough — getting in, warm-up, what to do if an account is restricted? <Link href="/account-guide" style={{ color: "#0A66C2", fontWeight: 600, textDecoration: "underline" }}>Read the full guide →</Link></p>
          </section>

          {/* questions */}
          <section>
            <div style={{ background: "linear-gradient(160deg,#12305F,#0A1826)", borderRadius: 20, padding: "40px 32px 42px", textAlign: "center", color: "#EAF0FA" }}>
              <h2 style={{ fontFamily: POP, fontWeight: 700, fontSize: 28, letterSpacing: "-0.02em", margin: "0 0 10px", color: "#fff" }}>Questions?</h2>
              <p style={{ fontSize: 16, lineHeight: 1.6, color: "#AFC4DB", margin: "0 auto 8px", maxWidth: 460 }}>A profile tweak, a tool you want to use, or a restriction — just reach out and we&apos;ll sort it.</p>
              <div style={{ fontSize: 15, color: "#CFE0F0", marginBottom: 26 }}>Telegram <a href={SUPPORT} target="_blank" rel="noopener noreferrer" style={{ color: "#7FB2EE", fontWeight: 600, textDecoration: "none" }}>@linkedvelocity_support_bot</a></div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <Link href="/dashboard" style={{ background: "#0A66C2", color: "#fff", fontSize: 15, fontWeight: 600, padding: "13px 24px", borderRadius: 12, textDecoration: "none" }}>Go to dashboard</Link>
                <Link href="/account-guide" style={{ background: "rgba(255,255,255,0.1)", color: "#EAF0FA", border: "1px solid rgba(255,255,255,0.2)", fontSize: 15, fontWeight: 600, padding: "13px 24px", borderRadius: 12, textDecoration: "none" }}>Full guide</Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
