"use client";

import Link from "next/link";
import { blogFontVars } from "@/lib/blog-fonts";

const POP = "var(--font-poppins)", INT = "var(--font-inter)";
const SUPPORT = "https://t.me/linkedvelocity_support_bot";

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

export default function AccountGuideV2View() {
  const card = { background: "#fff", border: "1px solid #E6E8EC", borderRadius: 18, boxShadow: "0 4px 14px rgba(16,24,40,0.05), 0 1px 3px rgba(16,24,40,0.04)" } as const;

  return (
    <div className={blogFontVars} style={{ fontFamily: INT, color: "#0B1220", background: "#FBFCFD", minHeight: "100vh" }}>
      {/* hero */}
      <section style={{ position: "relative", overflow: "hidden", background: "radial-gradient(80% 70% at 50% -10%, rgba(10,102,194,0.30) 0%, rgba(10,24,38,0) 62%), radial-gradient(60% 60% at 88% 20%, rgba(0,184,92,0.16) 0%, rgba(10,24,38,0) 60%), linear-gradient(180deg,#0F2439 0%,#0A1826 100%)", padding: "52px 24px 56px", textAlign: "center", color: "#EAF0FA" }}>
        <div style={{ position: "relative", maxWidth: 680, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 999, padding: "7px 15px", fontSize: 12.5, fontWeight: 600, color: "#CFE0F0", marginBottom: 22 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3EF08A" }} />Account care rules</div>
          <h1 style={{ fontFamily: POP, fontWeight: 800, fontSize: "clamp(30px,5vw,44px)", lineHeight: 1.07, letterSpacing: "-0.03em", margin: "0 auto 16px", color: "#fff", maxWidth: 560 }}>The rules, <span style={{ color: "#4FE08C" }}>start to finish</span></h1>
          <p style={{ fontSize: 17.5, lineHeight: 1.6, color: "#AFC4DB", margin: "0 auto", maxWidth: 500 }}>A few clear do&apos;s and don&apos;ts that keep your rented account healthy. Under a minute to read.</p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "rgba(0,184,92,0.14)", border: "1px solid rgba(62,240,138,0.3)", borderRadius: 12, padding: "11px 18px", marginTop: 24, fontSize: 14, color: "#CDEFD9" }}>⏱️ Under a minute</div>
        </div>
      </section>

      {/* body */}
      <div style={{ maxWidth: 740, margin: "0 auto", padding: "40px 24px 24px", display: "flex", flexDirection: "column", gap: 28 }}>

        {/* Don'ts */}
        <section style={{ background: "#FCF2F4", border: "1px solid #F3D2DA", borderRadius: 18, padding: "26px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <span style={{ width: 30, height: 30, borderRadius: 9, background: "#C2334E", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700 }}>✕</span>
            <h2 style={{ fontFamily: POP, fontWeight: 700, fontSize: 24, letterSpacing: "-0.02em", margin: 0, color: "#B2304A" }}>Don&apos;ts</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {DONTS.map((r) => (
              <div key={r.lead} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ flexShrink: 0, color: "#C2334E", fontWeight: 700, marginTop: 1, fontSize: 15 }}>✕</span>
                <p style={{ fontSize: 15, lineHeight: 1.6, color: "#4A5563", margin: 0 }}>
                  <strong style={{ color: "#0B1220" }}>{r.lead}</strong>{r.rest ? " " + r.rest : ""}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Do's */}
        <section style={{ background: "#F2FAF5", border: "1px solid #CDEBD9", borderRadius: 18, padding: "26px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <span style={{ width: 30, height: 30, borderRadius: 9, background: "#00A150", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700 }}>✓</span>
            <h2 style={{ fontFamily: POP, fontWeight: 700, fontSize: 24, letterSpacing: "-0.02em", margin: 0, color: "#067A45" }}>Do&apos;s</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {DOS.map((r) => (
              <div key={r.lead} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ flexShrink: 0, color: "#00A150", fontWeight: 700, marginTop: 1, fontSize: 15 }}>✓</span>
                <p style={{ fontSize: 15, lineHeight: 1.6, color: "#37424F", margin: 0 }}>
                  <strong style={{ color: "#0B1220" }}>{r.lead}</strong>{r.rest ? " " + r.rest : ""}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* no-guarantee note */}
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", background: "#F2F7FF", border: "1px solid #DCE9FB", borderRadius: 12, padding: "16px 18px" }}>
          <span style={{ flexShrink: 0, fontSize: 17 }}>ℹ️</span>
          <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "#37424F", margin: 0 }}>Following the one-change-per-day rule and a tool&apos;s recommended limits does not guarantee protection against account restrictions.</p>
        </div>

        {/* proviso */}
        <section style={{ ...card, padding: "24px 28px" }}>
          <h3 style={{ fontFamily: POP, fontWeight: 700, fontSize: 18, letterSpacing: "-0.01em", margin: "0 0 12px", color: "#0B1220" }}>Proviso — right to cancel</h3>
          <p style={{ fontSize: 14.5, lineHeight: 1.65, color: "#4A5563", margin: "0 0 12px" }}>While some account restrictions may be unavoidable, a higher-than-average restriction rate may indicate misuse or excessive activity and may prompt a review of your usage.</p>
          <p style={{ fontSize: 14.5, lineHeight: 1.65, color: "#4A5563", margin: 0 }}>LV reserves the right to suspend or cancel your subscription or rental, revoke access to the account(s), and refuse future rentals if we reasonably believe you are exceeding usage limits, misusing the account(s), or exposing them to excessive risk. We may take immediate action without prior notice where necessary to protect the account(s).</p>
        </section>

        {/* link to full guide */}
        <div style={{ textAlign: "center", fontSize: 14.5, color: "#5A6473" }}>
          Want the full walkthrough — getting in, warm-up, what to do if restricted?{" "}
          <Link href="/account-guide" style={{ color: "#0A66C2", fontWeight: 700, textDecoration: "underline" }}>Read the full guide →</Link>
        </div>

        {/* questions */}
        <section style={{ marginTop: 12 }}>
          <div style={{ background: "linear-gradient(160deg,#12305F,#0A1826)", borderRadius: 20, padding: "36px 32px 38px", textAlign: "center", color: "#EAF0FA" }}>
            <h2 style={{ fontFamily: POP, fontWeight: 700, fontSize: 26, letterSpacing: "-0.02em", margin: "0 0 10px", color: "#fff" }}>Questions?</h2>
            <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "#AFC4DB", margin: "0 auto 8px", maxWidth: 440 }}>A profile tweak, a tool you want to use, or a restriction — just reach out and we&apos;ll sort it.</p>
            <div style={{ fontSize: 15, color: "#CFE0F0", marginBottom: 24 }}>Telegram <a href={SUPPORT} target="_blank" rel="noopener noreferrer" style={{ color: "#7FB2EE", fontWeight: 600, textDecoration: "none" }}>@linkedvelocity_support_bot</a></div>
            <Link href="/dashboard" style={{ background: "#0A66C2", color: "#fff", fontSize: 15, fontWeight: 600, padding: "13px 24px", borderRadius: 12, textDecoration: "none" }}>Go to dashboard</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
