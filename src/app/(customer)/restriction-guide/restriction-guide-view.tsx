"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { blogFontVars } from "@/lib/blog-fonts";
import OwnerSignInCode from "@/components/owner-sign-in-code";
import pe from "@/app/(customer)/guide/primary-email/primary-email.module.css";

const POP = "var(--font-poppins)", INT = "var(--font-inter)", MONO = "var(--font-jbmono)";
const SUPPORT = "https://t.me/linkedvelocity_support_bot";
const BOOK = "https://calendly.com/linkedvelocity-info/30min";
const FORM_GENERAL = "https://www.linkedin.com/help/linkedin/ask/LI-DEFAULT-NEW";
const FORM_APPEAL = "https://www.linkedin.com/help/linkedin/ask/TS-F-APPEAL";

const SECTIONS = [
  { id: "sec-heads-up", label: "First, a heads-up" },
  { id: "sec-verify", label: "Step 1 · Verify (QR)" },
  { id: "sec-code", label: "Get your 2FA code" },
  { id: "sec-forms", label: "Step 2 · Message LinkedIn" },
  { id: "sec-writing", label: "What to write" },
  { id: "sec-after", label: "While you wait" },
  { id: "sec-questions", label: "Questions?" },
];

const VERIFY_STEPS: React.ReactNode[] = [
  <>Sign in to the account the normal way &mdash; through your GoLogin profile, using the login email and password. If LinkedIn asks for a 6-digit code, generate one in the <strong>Get your 2FA code</strong> step just below. If the password no longer works, use <strong>Forgot password</strong> on LinkedIn&apos;s sign-in page.</>,
  <>On the <strong>&quot;Verify your identity to continue&quot;</strong> screen, tap <strong>Verify with Persona</strong>.</>,
  <>Follow the prompts on your phone &mdash; scan the QR code if one is shown, take a live selfie when asked, and upload a <strong>valid government ID</strong>. The name on the ID must match the name on the LinkedIn profile.</>,
  <>Finish the flow and wait for LinkedIn&apos;s result. It can take anywhere from a few minutes to a day or two.</>,
];

const RETRY = [
  "Wait a bit — give it a few hours, or try again the next day, then run the flow again.",
  "Retry in good lighting, on a stable internet connection, and ideally at a different time of day.",
  "Give it two or three honest attempts across a day before escalating.",
  "If it keeps failing with that same error, move on to Step 2 below.",
];

const WRITING = [
  "Lead with who you are: it's your real account and you want to keep using it. Offer to verify your identity and provide a government ID.",
  "Name the exact problem — the identity check keeps failing with “Something unexpected happened. Please try again.” and won't let you finish verifying.",
  "Keep it short, calm, and honest. Don't exaggerate, and don't make anything up.",
  "Don't mention VPNs, proxies, automation, or that the account is rented — it doesn't help and it can hurt. Keep it a simple “I can't verify my identity, please help me restore access.”",
];

const AFTER = [
  "Verification and appeals run on LinkedIn's clock — a few days is normal, and sometimes they come back asking for the same thing again. Hang in there and don't spam the forms.",
  "Keep us posted — reply to our message or ping support with where things stand. We keep trying alongside you, and if an account genuinely can't come back, we'll make it right.",
  "As soon as access is back, let us know — we'll test the account, and once we confirm it's working again, your monthly payments pick right back up.",
];

type FormField = { label: string; answer: React.ReactNode };

const FORM1_FIELDS: FormField[] = [
  { label: "First Name / Last Name", answer: <>The account owner&apos;s <strong>real name</strong>, exactly as it appears on the LinkedIn profile and the government ID.</> },
  { label: "Email", answer: <>The <strong>email on the account</strong> (your LinkedIn login email). If a &quot;please sign in&quot; box shows on the side, you can ignore it and fill the form in manually.</> },
  { label: "Issue Type", answer: <>Pick the option closest to <strong>account access / verifying your identity</strong> (for example a &quot;restricted account&quot; or &quot;verification&quot; option).</> },
  { label: "Is this related to Premium All-in-One?", answer: <><strong>No</strong> &mdash; the form itself says most people should choose No.</> },
  { label: "In Which App or Site?", answer: <><strong>LinkedIn.com</strong> &mdash; or the LinkedIn mobile app, if that&apos;s where you hit the error.</> },
  { label: "On What Device?", answer: <>Whichever you actually used &mdash; <strong>Desktop / Computer</strong> when you&apos;re in GoLogin, or Mobile if you did the Persona step on your phone.</> },
  { label: "Your Question", answer: <>Paste the message below and adjust the details to match your situation.</> },
];

const FORM2_FIELDS: FormField[] = [
  { label: "First Name / Last Name", answer: <>Your <strong>real name</strong>, matching the LinkedIn profile and your photo ID.</> },
  { label: "Email", answer: <>The <strong>email on the account</strong> (your LinkedIn login email).</> },
  { label: "Does the name of your LinkedIn Profile match the name on your Photo ID?", answer: <><strong>Yes.</strong> The profile uses your real name, so it should match your ID. If for any reason it doesn&apos;t, message us before you submit.</> },
  { label: "Are you currently traveling / have you accessed your account from another country?", answer: <><strong>No</strong> &mdash; unless you genuinely are abroad right now. Normally you&apos;re signing in from your usual country.</> },
  { label: "Have you created / accessed your account through a VPN or Proxy Server?", answer: <><strong>No.</strong></> },
  { label: "Please specify your current location / country.", answer: <>Your <strong>real country</strong> &mdash; the one your account is based in.</> },
  { label: "Did you make recent updates to your profile after creating it?", answer: <><strong>No.</strong></> },
  { label: "If you believe your account has been restricted incorrectly…", answer: <>Paste the message below and tweak it to fit.</> },
];

const FORM1_MSG = `Hi, I'm trying to use my own LinkedIn account but it's asking me to verify my identity, and the identity check keeps failing with the error "Something unexpected happened. Please try again." I've tried several times over a couple of days, in good lighting and on a stable connection, but it won't complete.

This is my real account and I'm happy to verify my identity and provide a government ID. Could you please help me complete the verification, or restore access? Thank you.`;

const FORM2_MSG = `This is my own LinkedIn account, and I believe the restriction was applied in error. I've been trying to confirm my identity through the in-app verification, but it repeatedly fails with the error "Something unexpected happened. Please try again," so I haven't been able to finish it.

I use the account for genuine, professional networking. The name on my profile matches my government ID, and I'm happy to provide it to confirm who I am. Please could you re-review the restriction and let me verify my identity so I can regain access. Thank you for your help.`;

const secIcon: Record<string, { bg: string; fg: string; path: React.ReactNode }> = {
  "sec-heads-up": { bg: "#FBF1DE", fg: "#946011", path: <><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><path d="M12 9v4" /><path d="M12 16h.01" /></> },
  "sec-verify": { bg: "#EAF2FC", fg: "#0A66C2", path: <><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><circle cx="12" cy="11" r="2.2" /><path d="M8.3 16.2a3.8 3.8 0 0 1 7.4 0" /></> },
  "sec-code": { bg: "#E4F6EC", fg: "#067A45", path: <><circle cx="8" cy="15" r="4" /><path d="M10.85 12.15 19 4" /><path d="M18 5l2 2" /><path d="M15 8l2 2" /></> },
  "sec-forms": { bg: "#F1EFFB", fg: "#5747C9", path: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></> },
  "sec-writing": { bg: "#E4F6EC", fg: "#067A45", path: <><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" /></> },
  "sec-after": { bg: "#DEF3F1", fg: "#0E7C74", path: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></> },
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

const fieldHeading = { fontFamily: MONO, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8A93A2", marginBottom: 4 } as const;

function CopyBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    try { void navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard unavailable */ }
  };
  return (
    <div style={{ position: "relative", marginTop: 8 }}>
      <div style={{ whiteSpace: "pre-wrap", fontFamily: INT, fontSize: 14, lineHeight: 1.65, color: "#37424F", background: "#F8FAFC", border: "1px solid #E6E8EC", borderRadius: 12, padding: "18px" }}>{text}</div>
      <button onClick={copy} style={{ position: "absolute", top: 10, right: 10, cursor: "pointer", fontFamily: INT, fontSize: 12.5, fontWeight: 600, color: copied ? "#067A45" : "#0A66C2", background: "#fff", border: "1px solid " + (copied ? "#CDEBD9" : "#D4E3F6"), borderRadius: 8, padding: "6px 12px" }}>{copied ? "Copied ✓" : "Copy"}</button>
    </div>
  );
}

function FieldList({ fields }: { fields: FormField[] }) {
  return (
    <div style={{ marginTop: 6 }}>
      {fields.map((f, i) => (
        <div key={i} className="rgv-field" style={{ display: "grid", gap: 16, padding: "13px 0", borderTop: i ? "1px solid #EEF0F3" : "none" }}>
          <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.45, color: "#0B1220" }}>{f.label}</div>
          <div style={{ fontSize: 14, lineHeight: 1.55, color: "#4A5563" }}>{f.answer}</div>
        </div>
      ))}
    </div>
  );
}

export default function RestrictionGuideView() {
  const [activeId, setActiveId] = useState("sec-heads-up");
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
      <style>{`.rgv-toc button:hover{color:#0B1220!important}.rgv-field{grid-template-columns:minmax(0,0.85fr) minmax(0,1.25fr)}@media(max-width:900px){.rgv-grid{grid-template-columns:1fr!important;gap:24px!important}.rgv-toc{display:none!important}}@media(max-width:640px){.rgv-field{grid-template-columns:1fr!important;gap:3px!important}}`}</style>

      {/* progress bar */}
      <div style={{ position: "fixed", top: 0, left: 0, height: 3, width: `${progress}%`, background: "linear-gradient(90deg,#0A66C2,#00B85C)", zIndex: 60, transition: "width .08s linear" }} />

      {/* hero */}
      <section style={{ position: "relative", overflow: "hidden", background: "radial-gradient(80% 70% at 50% -10%, rgba(10,102,194,0.30) 0%, rgba(10,24,38,0) 62%), radial-gradient(60% 60% at 88% 20%, rgba(0,184,92,0.16) 0%, rgba(10,24,38,0) 60%), linear-gradient(180deg,#0F2439 0%,#0A1826 100%)", padding: "56px 24px 62px", textAlign: "center", color: "#EAF0FA" }}>
        <div style={{ position: "relative", maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 999, padding: "7px 15px", fontSize: 12.5, fontWeight: 600, color: "#CFE0F0", marginBottom: 22 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3EF08A" }} />Restriction help</div>
          <h1 style={{ fontFamily: POP, fontWeight: 800, fontSize: "clamp(32px,5vw,46px)", lineHeight: 1.06, letterSpacing: "-0.03em", margin: "0 auto 16px", color: "#fff", maxWidth: 640 }}>Managing a <span style={{ color: "#4FE08C" }}>LinkedIn restriction</span></h1>
          <p style={{ fontSize: 18, lineHeight: 1.6, color: "#AFC4DB", margin: "0 auto", maxWidth: 520 }}>If LinkedIn ever restricts an account, here&apos;s exactly what to do &mdash; and how we get through it together.</p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "rgba(0,184,92,0.14)", border: "1px solid rgba(62,240,138,0.3)", borderRadius: 12, padding: "11px 18px", marginTop: 26, fontSize: 14, color: "#CDEFD9" }}>⏱️ A 4-minute read · for account owners &amp; referrers</div>
        </div>
      </section>

      {/* body */}
      <div className="rgv-grid" style={{ maxWidth: 1140, margin: "0 auto", padding: "40px 24px 20px", display: "grid", gridTemplateColumns: "220px minmax(0,1fr)", gap: 56, alignItems: "start" }}>
        {/* TOC */}
        <aside className="rgv-toc" style={{ position: "sticky", top: 96, alignSelf: "start" }}>
          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "#8A93A2", marginBottom: 16, paddingLeft: 16 }}>On this page</div>
          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {SECTIONS.map((s) => {
              const on = s.id === activeId;
              return <button key={s.id} onClick={() => go(s.id)} style={{ display: "block", width: "100%", textAlign: "left", cursor: "pointer", fontFamily: INT, fontSize: 13.5, lineHeight: 1.4, fontWeight: on ? 600 : 500, color: on ? "#0B1220" : "#5A6473", background: "transparent", border: "none", borderLeft: "2px solid " + (on ? "#0A66C2" : "#E6E8EC"), padding: "8px 0 8px 14px", transition: "all .15s" }}>{s.label}</button>;
            })}
          </nav>
          <div style={{ marginTop: 24, padding: 18, background: "#0D1B2A", borderRadius: 14 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "#fff", marginBottom: 6 }}>Need a hand?</div>
            <p style={{ fontSize: 12.5, lineHeight: 1.55, color: "#8FA0B4", margin: "0 0 14px" }}>We reply fast on Telegram and we&apos;ll walk you through it.</p>
            <a href={SUPPORT} target="_blank" rel="noopener noreferrer" style={{ display: "block", textAlign: "center", background: "#0A66C2", color: "#fff", fontSize: 13, fontWeight: 600, borderRadius: 9, padding: 9, textDecoration: "none" }}>Message support</a>
          </div>
        </aside>

        {/* content */}
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 44 }}>
          {/* heads-up */}
          <section id="sec-heads-up">
            <SecHead id="sec-heads-up" title="First, a quick heads-up" />
            <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "#5A6473", margin: "0 0 20px" }}>Please read this before anything else &mdash; it&apos;s the honest version, so there are no surprises later.</p>
            <div style={{ ...card, padding: "26px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
              <p style={{ fontSize: 15.5, lineHeight: 1.7, color: "#37424F", margin: 0 }}>LinkedIn has become very strict, and its rules change constantly. Because of that, restrictions can happen to <strong style={{ color: "#0B1220" }}>any account &mdash; even a fully verified one, and even when everything has been done correctly</strong>. When it happens, LinkedIn almost never tells us why. It usually just says the account was found not to meet its policies, so honestly we don&apos;t get a reason either.</p>
              <div style={{ background: "#F2FAF5", border: "1px solid #CDEBD9", borderRadius: 14, padding: "18px 20px" }}>
                <p style={{ fontSize: 15, lineHeight: 1.7, color: "#235A3C", margin: 0 }}><strong style={{ color: "#067A45" }}>Here&apos;s the important part: we&apos;re on the same side.</strong> Your account is just as valuable to us as it is to you. We put real time and money into it &mdash; the setup, the warm-up, the proxy, the verification &mdash; so keeping it safe is 100% in our interest too. If a restriction ever happens, we work hard to recover it with you, and most of the time we do.</p>
              </div>
              <div style={amber}>
                <span style={{ flexShrink: 0, fontSize: 18 }}>⚠️</span>
                <p style={{ fontSize: 14.5, lineHeight: 1.65, color: "#7A4A12", margin: 0 }}><strong style={{ color: "#6B3E0C" }}>In rare cases a restriction can be permanent and out of anyone&apos;s hands.</strong> That&apos;s simply part of the risk of this kind of arrangement, not a sign that anyone did anything wrong. We just want you to know that going in &mdash; so if it ever happens, you understand it&apos;s the nature of LinkedIn, not a reflection of us or you.</p>
              </div>
              <div style={{ display: "flex", gap: 13, alignItems: "flex-start", background: "#F2F7FF", border: "1px solid #DCE9FB", borderRadius: 12, padding: "16px 18px" }}>
                <span style={{ flexShrink: 0, fontSize: 17 }}>👥</span>
                <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "#37424F", margin: 0 }}><strong style={{ color: "#0B1220" }}>For owners and referrers:</strong> the account owner needs to complete any identity check themselves. A referrer can walk the owner through these steps, but the ID verification has to be done by the owner.</p>
              </div>
            </div>
          </section>

          {/* step 1 — verify */}
          <section id="sec-verify">
            <SecHead id="sec-verify" title="Step 1 — Verify your identity (the QR flow)" />
            <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "#5A6473", margin: "0 0 20px" }}>Most restrictions clear once you pass LinkedIn&apos;s identity check. When you sign in, LinkedIn shows a <strong style={{ color: "#0B1220" }}>&quot;Verify your identity to continue&quot;</strong> screen powered by Persona. This is the normal first step &mdash; do this before anything else.</p>
            <div style={{ ...card, padding: "26px 28px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {VERIFY_STEPS.map((h, i) => (
                  <div key={i} style={{ display: "flex", gap: 15, alignItems: "flex-start" }}>
                    <span style={{ flexShrink: 0, width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(150deg,#0A66C2,#2678DC)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: POP, fontWeight: 700, fontSize: 14, boxShadow: "0 5px 12px rgba(10,102,194,0.26)" }}>{i + 1}</span>
                    <p style={{ fontSize: 15.5, lineHeight: 1.65, color: "#37424F", margin: 0, paddingTop: 3 }}>{h}</p>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 22, padding: "16px 18px", background: "#EAF2FC", borderRadius: 12, fontSize: 14.5, lineHeight: 1.6, color: "#37424F" }}>
                <strong>Have ready:</strong> a valid government ID whose name matches the profile, decent lighting for the selfie, and a steady internet connection. Using a phone for the Persona step is usually smoothest.
              </div>
              <div style={{ ...amber, marginTop: 16 }}>
                <span style={{ flexShrink: 0, fontSize: 18 }}>🔒</span>
                <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "#7A4A12", margin: 0 }}><strong style={{ color: "#6B3E0C" }}>Only ever upload your ID inside LinkedIn&apos;s official Persona flow.</strong> Never send ID documents to us, or to anyone, over chat or email.</p>
              </div>
              <div style={{ marginTop: 16, fontSize: 13.5, lineHeight: 1.6, color: "#5A6473" }}>
                LinkedIn&apos;s own step-by-step help: <a href="https://www.linkedin.com/help/linkedin/answer/a1339720" target="_blank" rel="noopener noreferrer" style={{ color: "#0A66C2", textDecoration: "underline" }}>verifying your identity</a> · <a href="https://www.linkedin.com/help/linkedin/answer/a1376104" target="_blank" rel="noopener noreferrer" style={{ color: "#0A66C2", textDecoration: "underline" }}>recovering account access</a>.
              </div>
            </div>

            {/* retry / error branch */}
            <div style={{ background: "#FFF6EC", border: "1.5px solid #F0B851", borderRadius: 16, padding: "22px 24px", marginTop: 16 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "#FCE9BF", color: "#8A5216", fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", padding: "5px 12px", borderRadius: 999, marginBottom: 14 }}>⚠️ If the check fails</div>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: "#7A4A12", margin: "0 0 14px" }}>Sometimes the Persona step errors out before it finishes &mdash; usually with this message:</p>
              <div style={{ border: "1px solid #F3D2DA", background: "#fff", borderRadius: 12, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start", boxShadow: "0 2px 8px rgba(16,24,40,0.05)" }}>
                <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: "50%", background: "#C2334E", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>✕</span>
                <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.5, color: "#37424F" }}>Something unexpected happened. Please try again. <strong>Learn More</strong></p>
              </div>
              <p style={{ fontSize: 14.5, lineHeight: 1.7, color: "#7A4A12", margin: "14px 0 12px" }}>This is almost always a temporary glitch on LinkedIn&apos;s side, not something you did wrong. Before escalating:</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {RETRY.map((t) => (
                  <div key={t} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
                    <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 6, background: "#FCE9BF", color: "#8A5216", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, marginTop: 1 }}>↻</span>
                    <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "#7A4A12", margin: 0 }}>{t}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* get your 2FA code */}
          <section id="sec-code">
            <SecHead id="sec-code" title="Get your sign-in code (2FA)" />
            <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "#5A6473", margin: "0 0 14px" }}>If LinkedIn asks for a 6-digit two-step code when you sign in, generate it here using the private link we sent you &mdash; no personal email or extra verification needed. The code refreshes every 30 seconds.</p>
            <div className={pe.page} style={{ fontFamily: INT, maxWidth: "none", margin: 0, padding: 0, lineHeight: 1.6 }}>
              <OwnerSignInCode />
            </div>
          </section>

          {/* step 2 — forms */}
          <section id="sec-forms">
            <SecHead id="sec-forms" title="Step 2 — If it won't verify, message LinkedIn" />
            <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "#5A6473", margin: "0 0 20px" }}>If the QR flow keeps failing after a few honest tries, reach LinkedIn&apos;s support directly through their help forms. <strong style={{ color: "#0B1220" }}>Do these in order</strong> &mdash; start with the general request, and only move to the appeal if that doesn&apos;t get it sorted. Both forms look long, but here&apos;s exactly what to put in every field.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* FORM 1 */}
              <div style={{ ...card, padding: "24px 26px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span style={{ flexShrink: 0, width: 26, height: 26, borderRadius: "50%", background: "#EAF2FC", color: "#0A66C2", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: POP, fontWeight: 700, fontSize: 13 }}>1</span>
                  <span style={{ fontFamily: POP, fontWeight: 700, fontSize: 18, color: "#0B1220" }}>Try this first &mdash; General help request</span>
                </div>
                <p style={{ fontSize: 14.5, lineHeight: 1.65, color: "#37424F", margin: "0 0 16px" }}>LinkedIn&apos;s general &quot;Contact LinkedIn support&quot; form. Use it to ask them to help you finish verification or restore access.</p>
                <a href={FORM_GENERAL} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#0A66C2", color: "#fff", fontSize: 14, fontWeight: 600, padding: "11px 18px", borderRadius: 10, textDecoration: "none" }}>Open the general help form →</a>
                <div style={{ marginTop: 20, paddingTop: 18, borderTop: "1px solid #EEF0F3" }}>
                  <div style={fieldHeading}>Fill it in like this</div>
                  <FieldList fields={FORM1_FIELDS} />
                </div>
                <div style={{ marginTop: 18 }}>
                  <div style={fieldHeading}>What to paste into &quot;Your Question&quot;</div>
                  <CopyBlock text={FORM1_MSG} />
                </div>
              </div>

              {/* FORM 2 */}
              <div style={{ ...card, padding: "24px 26px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span style={{ flexShrink: 0, width: 26, height: 26, borderRadius: "50%", background: "#FBE0E4", color: "#B2304A", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: POP, fontWeight: 700, fontSize: 13 }}>2</span>
                  <span style={{ fontFamily: POP, fontWeight: 700, fontSize: 18, color: "#0B1220" }}>If that doesn&apos;t work &mdash; Restriction appeal</span>
                </div>
                <p style={{ fontSize: 14.5, lineHeight: 1.65, color: "#37424F", margin: "0 0 16px" }}>A longer appeal form with a few yes/no questions. Keep the answers simple and consistent &mdash; here&apos;s each one.</p>
                <a href={FORM_APPEAL} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#0B1220", color: "#fff", fontSize: 14, fontWeight: 600, padding: "11px 18px", borderRadius: 10, textDecoration: "none" }}>Open the appeal form →</a>
                <div style={{ marginTop: 20, paddingTop: 18, borderTop: "1px solid #EEF0F3" }}>
                  <div style={fieldHeading}>Fill it in like this</div>
                  <FieldList fields={FORM2_FIELDS} />
                </div>
                <div style={{ marginTop: 18 }}>
                  <div style={fieldHeading}>What to paste into the appeal box</div>
                  <CopyBlock text={FORM2_MSG} />
                </div>
              </div>
            </div>
            <div style={{ ...amber, marginTop: 16 }}>
              <span style={{ flexShrink: 0, fontSize: 18 }}>💡</span>
              <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "#7A4A12", margin: 0 }}><strong style={{ color: "#6B3E0C" }}>Keep both forms consistent</strong> &mdash; same name, same email, same story. Use the exact name and email that are on the account, and don&apos;t bring up VPNs, proxies, automation, or renting anywhere in the free-text. If anything about your setup makes you unsure how to answer, message us before you submit.</p>
            </div>
          </section>

          {/* what to write */}
          <section id="sec-writing">
            <SecHead id="sec-writing" title="What to put in the message" />
            <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "#5A6473", margin: "0 0 20px" }}>Keep it simple and human. These few things give you the best shot at a quick review.</p>
            <div style={{ ...card, padding: "24px 28px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                {WRITING.map((t) => (
                  <div key={t} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 6, background: "#E4F6EC", color: "#067A45", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, marginTop: 1 }}>✓</span>
                    <p style={{ fontSize: 15, lineHeight: 1.6, color: "#37424F", margin: 0 }}>{t}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* while you wait */}
          <section id="sec-after">
            <SecHead id="sec-after" title="While you wait" />
            <div style={{ ...card, padding: "26px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
              {AFTER.map((t) => (
                <div key={t} style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
                  <span style={{ flexShrink: 0, color: "#0E7C74", marginTop: 2 }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg></span>
                  <p style={{ fontSize: 15, lineHeight: 1.65, color: "#37424F", margin: 0 }}>{t}</p>
                </div>
              ))}
            </div>
          </section>

          {/* questions */}
          <section id="sec-questions">
            <div style={{ background: "linear-gradient(160deg,#12305F,#0A1826)", borderRadius: 20, padding: "40px 32px 42px", textAlign: "center", color: "#EAF0FA" }}>
              <h2 style={{ fontFamily: POP, fontWeight: 700, fontSize: 28, letterSpacing: "-0.02em", margin: "0 0 10px", color: "#fff" }}>Stuck, or not sure what you&apos;re seeing?</h2>
              <p style={{ fontSize: 16, lineHeight: 1.6, color: "#AFC4DB", margin: "0 auto 8px", maxWidth: 480 }}>Send us a screenshot of the screen you&apos;re on and we&apos;ll tell you the exact next step. We do this with owners all the time.</p>
              <div style={{ fontSize: 15, color: "#CFE0F0", marginBottom: 26 }}>Telegram <a href={SUPPORT} target="_blank" rel="noopener noreferrer" style={{ color: "#7FB2EE", fontWeight: 600, textDecoration: "none" }}>@linkedvelocity_support_bot</a></div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <a href={SUPPORT} target="_blank" rel="noopener noreferrer" style={{ background: "#0A66C2", color: "#fff", fontSize: 15, fontWeight: 600, padding: "13px 24px", borderRadius: 12, textDecoration: "none" }}>Message support</a>
                <a href={BOOK} target="_blank" rel="noopener noreferrer" style={{ background: "rgba(255,255,255,0.1)", color: "#EAF0FA", border: "1px solid rgba(255,255,255,0.2)", fontSize: 15, fontWeight: 600, padding: "13px 24px", borderRadius: 12, textDecoration: "none" }}>Book a help call</a>
              </div>
              <div style={{ marginTop: 22 }}>
                <Link href="/account-guide" style={{ color: "#7FB2EE", fontSize: 13.5, fontWeight: 500, textDecoration: "none" }}>See the full account guide →</Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
