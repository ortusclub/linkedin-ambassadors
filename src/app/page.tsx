export const dynamic = "force-dynamic";

import Link from "next/link";
import { blogFontVars } from "@/lib/blog-fonts";
import { getBrand } from "@/lib/brand";

const POP = "var(--font-poppins)", INT = "var(--font-inter)", MONO = "var(--font-jbmono)";

// Per-brand homepage. SAME LinkedVelocity layout for both; LinkedArmy swaps the wording
// from "rent an account" to "hire a LinkedIn Operator" (subtle, compliant-sounding).
// The one-word noun lives in brand.ts term — flip to "LinkedIn support" there if preferred.

const HERO = {
  linkedvelocity: {
    h1a: "Scale LinkedIn outreach",
    h1b: "without the limits",
    sub: "Rent verified, pre-warmed LinkedIn accounts with real connections and established histories — run parallel campaigns and hit pipeline targets in weeks, not quarters.",
    cta: "Browse Available Accounts →",
    trust: "Real, aged & verified · GoLogin-protected · Cancel anytime",
    tiles: [
      ["#4B9BEA", "Verified", "real, consenting professionals"],
      ["#4B9BEA", "Protected", "GoLogin anti-detect sessions"],
      ["#26C879", "Flexible", "cancel anytime, no contracts"],
    ],
    ownLead: "Own a LinkedIn account?",
    ownCta: "Earn passive income sharing it →",
  },
  linkedarmy: {
    h1a: "Scale LinkedIn outreach",
    h1b: "without the limits",
    sub: "Hire verified LinkedIn Operators with a mature online presence and established networks to run campaigns for you and hit pipeline targets in weeks, not quarters.",
    cta: "Browse Operators →",
    trust: "Real, verified operators · GoLogin-protected · Cancel anytime",
    tiles: [
      ["#4B9BEA", "Verified", "real, consenting professionals"],
      ["#4B9BEA", "Protected", "secure, consistent sessions"],
      ["#26C879", "Flexible", "cancel anytime, no contracts"],
    ],
    ownLead: "Have a strong LinkedIn presence?",
    ownCta: "Become an operator and earn →",
  },
} as const;

const STEPS_BY_BRAND = {
  linkedvelocity: [
    { n: "1", tag: "Browse", title: "Browse & select", body: "Filter accounts by industry, location and connection count. Every account is a real, established profile — verified, with genuine history." },
    { n: "2", tag: "Rent", title: "Rent monthly", body: "Pay a flat monthly fee per account. No contracts, no setup fees. Scale up or down anytime — add a few this month, more the next." },
    { n: "3", tag: "Launch", title: "Launch campaigns", body: "Open the account in a secure browser and run your outreach tool. Each account has its own limits — multiply your reach, not your risk." },
  ],
  linkedarmy: [
    { n: "1", tag: "Browse", title: "Browse & select", body: "Filter operators by industry, location and connection count. Every operator is a real, established professional — verified, with genuine history." },
    { n: "2", tag: "Hire", title: "Hire monthly", body: "Pay a flat monthly fee per operator. No contracts, no setup fees. Scale up or down anytime — add a few this month, more the next." },
    { n: "3", tag: "Launch", title: "Launch campaigns", body: "Your operator's established profile runs your outreach in a secure browser. Multiply your reach, not your risk." },
  ],
} as const;

const GO_FEATURES_BY_BRAND = {
  linkedvelocity: [
    { icon: "🌐", title: "Dedicated proxy", body: "Each account runs from a consistent IP location, every session." },
    { icon: "🧬", title: "Isolated fingerprint", body: "A unique browser fingerprint per profile — no overlap." },
    { icon: "🍪", title: "Separate cookies", body: "Sessions never cross-contaminate between accounts." },
    { icon: "👤", title: "One consistent user", body: "LinkedIn sees a single, stable login — no matter who's on it." },
  ],
  linkedarmy: [
    { icon: "🌐", title: "Dedicated proxy", body: "Each operator works from a consistent IP location, every session." },
    { icon: "🧬", title: "Isolated fingerprint", body: "A unique browser fingerprint per profile — no overlap." },
    { icon: "🍪", title: "Separate cookies", body: "Sessions never cross-contaminate between operators." },
    { icon: "👤", title: "One consistent presence", body: "LinkedIn sees a single, stable, professional presence." },
  ],
} as const;

const WHY_BY_BRAND = {
  linkedvelocity: [
    { title: "No warm-up", body: "Established accounts are ready from day one — no aging period." },
    { title: "Anti-detect protected", body: "GoLogin gives each account its own fingerprint, proxy and cookies." },
    { title: "Cancel anytime", body: "Flat monthly fee per account. No contracts — scale up or down." },
    { title: "Real, consenting people", body: "Every profile is a real professional who has opted in." },
  ],
  linkedarmy: [
    { title: "No warm-up", body: "Established operators are ready from day one — no aging period." },
    { title: "Secure sessions", body: "Each operator works from their own fingerprint, proxy and cookies." },
    { title: "Cancel anytime", body: "Flat monthly fee per operator. No contracts — scale up or down." },
    { title: "Real, consenting people", body: "Every operator is a real professional who has opted in." },
  ],
} as const;

export default async function HomePage() {
  const brand = await getBrand();
  const isArmy = brand.id === "linkedarmy";
  const hero = HERO[brand.id];
  const steps = STEPS_BY_BRAND[brand.id];
  const goFeatures = GO_FEATURES_BY_BRAND[brand.id];
  const why = WHY_BY_BRAND[brand.id];
  return (
    <div className={blogFontVars} style={{ fontFamily: INT, color: "#0B1220", background: "#0D1B2A" }}>
      <style>{`
        @keyframes lvA{0%,100%{transform:translate(0,0) scale(1);opacity:.9}50%{transform:translate(6%,4%) scale(1.12);opacity:1}}
        @keyframes lvB{0%,100%{transform:translate(0,0) scale(1);opacity:.8}50%{transform:translate(-5%,3%) scale(1.15);opacity:.95}}
        .lvh-lift{transition:transform .18s ease, box-shadow .18s ease, border-color .18s ease;}
        .lvh-lift:hover{transform:translateY(-4px);box-shadow:0 18px 40px rgba(16,24,40,0.12)!important;}
        .lvh-cta{transition:transform .18s ease, box-shadow .18s ease;}
        .lvh-cta:hover{transform:translateY(-2px);}
        .lvh-3{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;}
        .lvh-4{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;}
        .lvh-2{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center;}
        .lvh-ba{display:grid;grid-template-columns:1fr auto 1fr;gap:18px;align-items:stretch;max-width:940px;margin:0 auto 40px;}
        @media(max-width:960px){.lvh-3{grid-template-columns:1fr}.lvh-4{grid-template-columns:1fr 1fr}.lvh-2{grid-template-columns:1fr;gap:40px}.lvh-ba{grid-template-columns:1fr;}.lvh-ba .lvh-arrow{transform:rotate(90deg)}}
        @media(max-width:560px){.lvh-4{grid-template-columns:1fr}}
      `}</style>

      {/* ================= HERO ================= */}
      <section style={{ position: "relative", overflow: "hidden", background: "radial-gradient(80% 60% at 50% -10%, rgba(10,102,194,0.30) 0%, rgba(10,24,38,0) 62%), radial-gradient(70% 60% at 12% 108%, rgba(0,184,92,0.20) 0%, rgba(10,24,38,0) 55%), linear-gradient(180deg,#0F2439 0%,#0A1826 100%)", padding: "74px 24px 88px", textAlign: "center", color: "#EAF0FA" }}>
        <div style={{ position: "absolute", width: 620, height: 620, left: -160, top: -220, borderRadius: "50%", background: "radial-gradient(circle, rgba(10,102,194,0.28), rgba(10,102,194,0) 65%)", filter: "blur(20px)", pointerEvents: "none", animation: "lvA 16s ease-in-out infinite" }} />
        <div style={{ position: "absolute", width: 560, height: 560, right: -140, bottom: -200, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,184,92,0.22), rgba(0,184,92,0) 65%)", filter: "blur(20px)", pointerEvents: "none", animation: "lvB 19s ease-in-out infinite" }} />
        <div style={{ position: "relative", maxWidth: 820, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 9, fontSize: 13, fontWeight: 600, color: "#DCE7F5", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", padding: "8px 16px", borderRadius: 999, marginBottom: 26 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#00B85C", boxShadow: "0 0 5px 1px rgba(0,184,92,0.5), 0 0 12px 4px rgba(0,184,92,0.25)" }} />For growth &amp; outreach teams
          </div>
          <h1 style={{ font: `800 clamp(38px,7vw,68px) ${POP}`, lineHeight: 1.02, letterSpacing: "-0.03em", margin: "0 0 22px", color: "#fff" }}>{hero.h1a}<br /><span style={{ color: "#26C879" }}>{hero.h1b}</span></h1>
          <p style={{ fontSize: 19, lineHeight: 1.55, color: "#AFC0D6", margin: "0 auto 32px", maxWidth: 620 }}>{hero.sub}</p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 18 }}>
            <Link href="/catalogue" className="lvh-cta" style={{ fontSize: 16, fontWeight: 600, color: "#fff", background: "#0A66C2", padding: "15px 28px", borderRadius: 12, textDecoration: "none", boxShadow: "0 14px 30px -12px rgba(10,102,194,0.75)" }}>{hero.cta}</Link>
            <Link href="/how-it-works" className="lvh-cta" style={{ fontSize: 16, fontWeight: 600, color: "#EAF0FA", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)", padding: "15px 26px", borderRadius: 12, textDecoration: "none" }}>See how it works</Link>
          </div>
          <div style={{ fontSize: 13, color: "#8CA0BC", marginBottom: 44 }}>{hero.trust}</div>

          {/* honest trust tiles (no invented counts) */}
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", maxWidth: 760, margin: "0 auto" }}>
            {hero.tiles.map(([c, t, s]) => (
              <div key={t} style={{ flex: "1 1 200px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.11)", borderTop: `3px solid ${c}`, borderRadius: 14, padding: "22px 16px" }}>
                <div style={{ font: `700 22px ${POP}`, color: c === "#26C879" ? "#26C879" : "#fff" }}>{t}</div>
                <div style={{ fontSize: 12.5, color: "#93A6C0", marginTop: 6 }}>{s}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 34, paddingTop: 26, borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: 15, color: "#AFC0D6" }}>{hero.ownLead} <Link href="/become-ambassador" style={{ color: "#26C879", fontWeight: 600, textDecoration: "none" }}>{hero.ownCta}</Link></div>
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section style={{ background: "#F6F5F1", padding: "88px 24px 96px" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", textAlign: "center" }}>
          <div style={{ font: `500 12px ${MONO}`, letterSpacing: "0.16em", textTransform: "uppercase", color: "#0A66C2", marginBottom: 16 }}>How it works</div>
          <h2 style={{ font: `700 clamp(30px,4vw,42px) ${POP}`, lineHeight: 1.08, letterSpacing: "-0.03em", margin: "0 auto 14px", maxWidth: 600 }}>Three steps to unlimited LinkedIn outreach</h2>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: "#5A6473", margin: "0 auto 64px", maxWidth: 520 }}>No warm-up period. No building profiles from scratch. No ceiling on your growth.</p>
          <div className="lvh-3">
            {steps.map((s) => (
              <div key={s.n} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(150deg,#12C169,#059748)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", font: `700 24px ${POP}`, boxShadow: "0 10px 24px rgba(5,151,72,0.32)", border: "5px solid #F6F5F1", marginBottom: 24 }}>{s.n}</div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, font: `500 11px ${MONO}`, letterSpacing: "0.1em", textTransform: "uppercase", color: "#059748", background: "#E4F6EC", padding: "4px 11px", borderRadius: 999, marginBottom: 16 }}>{s.tag}</div>
                <div style={{ font: `600 20px ${POP}`, color: "#0B1220", marginBottom: 10 }}>{s.title}</div>
                <p style={{ fontSize: 15, lineHeight: 1.65, color: "#5A6473", margin: 0, maxWidth: 300 }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ================= GOLOGIN ================= */}
      <section style={{ position: "relative", background: "#FFFFFF", borderTop: "1px solid #ECEEF1", padding: "88px 24px", overflow: "hidden" }}>
        <div style={{ position: "relative", maxWidth: 1160, margin: "0 auto" }} className="lvh-2">
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "#F6F8FB", border: "1px solid #E4E9F0", borderRadius: 999, padding: "5px 6px 5px 14px", marginBottom: 22 }}>
              <span style={{ font: `500 11px ${MONO}`, letterSpacing: "0.12em", textTransform: "uppercase", color: "#5A6473" }}>Powered by</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "#0D1B2A", color: "#fff", borderRadius: 999, padding: "5px 13px", font: `600 13px ${POP}` }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: "#E0710E" }} />GoLogin</span>
            </div>
            <h2 style={{ font: `700 clamp(28px,3.6vw,38px) ${POP}`, lineHeight: 1.12, letterSpacing: "-0.025em", margin: "0 0 20px" }}>{isArmy ? "Every operator works from a secure, consistent environment" : "Account sharing that's invisible to LinkedIn"}</h2>
            <p style={{ fontSize: 16.5, lineHeight: 1.7, color: "#5A6473", margin: "0 0 32px" }}>{isArmy ? <>We&apos;ve partnered with <strong>GoLogin</strong>, a leading secure-browser platform. Each operator&apos;s profile runs through a dedicated environment with its own proxy, cookies and fingerprint — so every session stays consistent and secure.</> : <>We&apos;ve partnered with <strong>GoLogin</strong>, a leading anti-detect browser. Each shared account runs through a dedicated profile with its own proxy, cookies and fingerprint — so LinkedIn sees one consistent user, no matter who&apos;s logged in.</>}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {goFeatures.map((g) => (
                <div key={g.title} className="lvh-lift" style={{ background: "#fff", border: "1px solid #E9ECF0", borderRadius: 14, padding: 18, boxShadow: "0 4px 14px rgba(16,24,40,0.05)" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 10, background: "#EAF2FC", fontSize: 18 }}>{g.icon}</span>
                  <div style={{ font: `600 15px ${POP}`, color: "#0B1220", margin: "14px 0 6px" }}>{g.title}</div>
                  <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "#5A6473", margin: 0 }}>{g.body}</p>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: "#fff", border: "1px solid #E6E8EC", borderRadius: 18, padding: 16, boxShadow: "0 24px 60px rgba(16,24,40,0.12)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#F5F7FA", border: "1px solid #EDEFF2", borderRadius: 10, padding: "9px 12px", marginBottom: 16 }}>
              <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#FF5F57" }} /><span style={{ width: 11, height: 11, borderRadius: "50%", background: "#FEBC2E" }} /><span style={{ width: 11, height: 11, borderRadius: "50%", background: "#28C840" }} />
              <span style={{ flex: 1, textAlign: "center", fontSize: 13, color: "#6B7484" }}>🔒 linkedin.com/in/{isArmy ? "your-operator" : "your-rented-account"}</span>
            </div>
            {[["#00B85C", "Operator connected", "via proxy: San Francisco, CA"], ["#0A66C2", isArmy ? "You connected" : "Renter connected", "via proxy: San Francisco, CA"]].map(([d, a, b]) => (
              <div key={a} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13.5, marginBottom: 12 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, color: "#0B1220", fontWeight: 500 }}><span style={{ width: 9, height: 9, borderRadius: "50%", background: d }} />{a}</span><span style={{ color: "#96A0AD" }}>{b}</span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#E4F6EC", borderRadius: 10, padding: "11px 14px", marginTop: 4, fontSize: 13.5, color: "#067A45", fontWeight: 600 }}>🛡 Session protected · Same origin · No flags</div>
          </div>
        </div>
      </section>

      {/* ================= CATALOGUE ================= */}
      <section style={{ background: "#FBFCFD", padding: "72px 24px", borderTop: "1px solid #EEF0F3", textAlign: "center" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <h2 style={{ font: `700 clamp(28px,4vw,40px) ${POP}`, lineHeight: 1.15, letterSpacing: "-0.03em", margin: "0 0 16px" }}>{isArmy ? "Find your next operator" : "Find your next account"}</h2>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: "#5A6473", margin: "0 0 28px" }}>{isArmy ? "Explore the catalogue to compare operators and find the right fit for your campaigns." : "Explore the catalogue to compare accounts and find one that fits your needs."}</p>
          <Link href="/catalogue" className="lvh-cta" style={{ display: "inline-flex", justifyContent: "center", alignItems: "center", maxWidth: "100%", boxSizing: "border-box", background: "#0A66C2", color: "#fff", fontSize: 16, fontWeight: 600, padding: "14px 24px", borderRadius: 10, textDecoration: "none", boxShadow: "0 4px 12px rgba(10,102,194,0.12)" }}>{isArmy ? "See the operators you can hire →" : "See the accounts you can rent →"}</Link>
        </div>
      </section>

      {/* ================= WHY ================= */}
      <section style={{ background: "radial-gradient(120% 120% at 80% 0%, #17457F 0%, #0F2C4E 45%, #0A1626 100%)", padding: "88px 24px 96px", textAlign: "center" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto" }}>
          <div style={{ font: `500 12px ${MONO}`, letterSpacing: "0.16em", textTransform: "uppercase", color: "#7FA8E0", marginBottom: 18 }}>{isArmy ? "Why hire operators" : "Why rent accounts"}</div>
          <h2 style={{ font: `700 clamp(30px,4vw,44px) ${POP}`, letterSpacing: "-0.03em", margin: "0 0 20px", color: "#fff" }}>LinkedIn is powerful — but limited</h2>
          <p style={{ fontSize: 17, lineHeight: 1.7, color: "#AFC4DB", margin: "0 auto 48px", maxWidth: 600 }}>{isArmy ? "A single account caps how far you can reach. LinkedArmy removes the ceiling by putting multiple verified LinkedIn Operators to work for you in parallel." : "A single account caps how far you can reach. LinkedVelocity removes the ceiling by giving you multiple verified accounts running in parallel."}</p>
          <div className="lvh-ba">
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 18, padding: "28px 30px", textAlign: "left" }}>
              <div style={{ font: `500 11px ${MONO}`, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8CA0BC", marginBottom: 22 }}>With one profile</div>
              {[["~100", "connection requests / week"], ["~50", "messages & InMails"], ["1", "campaign at a time"]].map(([v, l]) => (
                <div key={l} style={{ marginBottom: 18 }}><div style={{ font: `700 30px ${POP}`, color: "#7386A0", lineHeight: 1 }}>{v}</div><div style={{ fontSize: 13, color: "#8CA0BC", marginTop: 5 }}>{l}</div></div>
              ))}
            </div>
            <div className="lvh-arrow" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#26C879", fontSize: 30 }}>→</div>
            <div style={{ position: "relative", background: "linear-gradient(160deg, rgba(0,184,92,0.16), rgba(0,184,92,0.04))", border: "1px solid rgba(38,200,121,0.38)", borderRadius: 18, padding: "28px 30px", textAlign: "left", boxShadow: "0 0 44px rgba(0,184,92,0.12)" }}>
              <div style={{ font: `500 11px ${MONO}`, letterSpacing: "0.12em", textTransform: "uppercase", color: "#7FE3AB", marginBottom: 22 }}>{isArmy ? "Across multiple operators" : "Across multiple accounts"}</div>
              {[["1,000+", "connection requests / week"], ["500+", "messages & InMails"], ["Unlimited", "parallel campaigns"]].map(([v, l]) => (
                <div key={l} style={{ marginBottom: 18 }}><div style={{ font: `800 30px ${POP}`, color: v === "Unlimited" ? "#3EDC8C" : "#fff", lineHeight: 1 }}>{v}</div><div style={{ fontSize: 13, color: "#B7D6C6", marginTop: 5 }}>{l}</div></div>
              ))}
            </div>
          </div>
          <div className="lvh-4" style={{ maxWidth: 1000, margin: "0 auto" }}>
            {why.map((w) => (
              <div key={w.title} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 16, padding: "22px 20px", textAlign: "left" }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 9, background: "linear-gradient(150deg,#12C169,#059748)", color: "#fff", fontSize: 14, fontWeight: 700, boxShadow: "0 6px 14px rgba(5,151,72,0.35)", marginBottom: 16 }}>✓</span>
                <div style={{ font: `600 15.5px ${POP}`, color: "#fff", marginBottom: 6 }}>{w.title}</div>
                <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "#9FB6D0", margin: 0 }}>{w.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= EARN BAND ================= */}
      <section id="earn" style={{ background: "#F6F5F1", padding: "64px 24px" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto" }}>
          <div className="lvh-2" style={{ overflow: "hidden", background: "linear-gradient(100deg,#065C33 0%,#0A8F4E 55%,#0BA557 100%)", borderRadius: 22, padding: "44px 48px", boxShadow: "0 20px 46px rgba(6,92,51,0.28)" }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, font: `500 11px ${MONO}`, letterSpacing: "0.14em", textTransform: "uppercase", color: "#D3F5E0", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 999, padding: "6px 13px", marginBottom: 18 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff" }} />For professionals</div>
              <div style={{ font: `700 clamp(24px,3vw,30px) ${POP}`, color: "#fff", marginBottom: 12, letterSpacing: "-0.015em", lineHeight: 1.12 }}>{isArmy ? "Have a strong LinkedIn presence?" : "Own a LinkedIn account?"}<br />Get paid every month.</div>
              <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "#DBF3E4", margin: "0 0 26px", maxWidth: 440 }}>{isArmy ? "Join as an operator and receive a fixed monthly payment, whether or not you're currently on a campaign. You stay in control and can leave anytime after a light 6-month minimum — your password is never shared." : "Share your account and receive a fixed monthly payment, whether or not it is currently rented. You stay in control and can leave anytime after a light 6-month minimum — your password is never shared."}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <Link href="/become-ambassador" className="lvh-cta" style={{ background: "#fff", color: "#0A7A45", fontSize: 15, fontWeight: 700, padding: "14px 24px", borderRadius: 12, textDecoration: "none" }}>{isArmy ? "Become an operator →" : "Rent us your account →"}</Link>
                <span style={{ fontSize: 13.5, color: "#CFEFDC" }}>Free to join · Cancel anytime after 6 months</span>
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.22)", borderRadius: 18, padding: "26px 28px" }}>
              <div style={{ font: `500 11px ${MONO}`, letterSpacing: "0.12em", textTransform: "uppercase", color: "#D3F5E0", marginBottom: 18 }}>Example</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
                <div><div style={{ font: `700 19px ${POP}`, color: "#fff" }}>{isArmy ? "Your profile" : "Each account"}</div><div style={{ fontSize: 12.5, color: "#CFEFDC", marginTop: 2 }}>{isArmy ? "shared securely" : "shared, hands-off"}</div></div>
                <span style={{ fontSize: 22, color: "#B7EBCC" }}>=</span>
                <div style={{ textAlign: "right" }}><div style={{ font: `800 22px ${POP}`, color: "#fff", lineHeight: 1.15 }}>Setup bonus<br />+ fixed monthly payment</div><div style={{ fontSize: 12.5, color: "#CFEFDC", marginTop: 6 }}>{isArmy ? "a fixed payment, every month" : "the more accounts, the more you earn"}</div></div>
              </div>
              <div style={{ height: 1, background: "rgba(255,255,255,0.18)", margin: "20px 0" }} />
              {["Leave anytime after 6 months", isArmy ? "You stay in control" : "Password never shared"].map((t) => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13.5, color: "#EAFBF0", marginBottom: 11 }}><span style={{ fontWeight: 700 }}>✓</span>{t}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section style={{ background: "#F6F5F1", padding: "40px 24px 96px", textAlign: "center" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <h2 style={{ font: `700 clamp(32px,5vw,52px) ${POP}`, lineHeight: 1.08, letterSpacing: "-0.03em", margin: "0 0 18px" }}>Ready to break through LinkedIn&apos;s ceiling?</h2>
          <p style={{ fontSize: 18, lineHeight: 1.55, color: "#5A6473", margin: "0 0 34px" }}>{isArmy ? "Hire verified LinkedIn Operators and scale your outreach today." : "Rent verified, pre-warmed accounts and scale your outreach today."}</p>
          <Link href="/catalogue" className="lvh-cta" style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "#0A66C2", color: "#fff", fontSize: 16, fontWeight: 600, padding: "16px 30px", borderRadius: 12, textDecoration: "none", boxShadow: "0 12px 30px rgba(10,102,194,0.28)" }}>{isArmy ? "Browse Operators →" : "Browse Accounts →"}</Link>
          <div style={{ marginTop: 24, fontSize: 15, color: "#8A93A2" }}>{isArmy ? "Have a strong LinkedIn presence?" : "Own a LinkedIn account?"} <Link href="/become-ambassador" style={{ color: "#0A66C2", fontWeight: 600, textDecoration: "none" }}>{isArmy ? "Become an operator →" : "Earn by sharing it →"}</Link></div>
        </div>
      </section>
    </div>
  );
}
