"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

type Step = "choice" | "logged-in-choice" | "info" | "scanning" | "result" | "bank" | "account-details" | "login" | "complete" | "done" | "review" | "scheduled";

const SCAN_STEPS = [
  "Locating your LinkedIn profile...",
  "Analysing your connection network...",
  "Reviewing your industry and experience...",
  "Checking profile verification status...",
  "Evaluating account history and age...",
  "Assessing profile strength and engagement...",
  "Calculating your ambassador value...",
  "Generating your personalised offer...",
];

function calculateOffer(data: {
  connectionCount: number;
  verified: boolean;
  hasSalesNav: boolean;
  notes: string;
}): {
  amount: number;
  tier: string;
  reasons: { label: string; detail: string; positive: boolean }[];
} {
  const reasons: { label: string; detail: string; positive: boolean }[] = [];
  let baseScore = 0;

  // Connections
  const conn = data.connectionCount || 0;
  if (conn >= 10000) {
    baseScore += 40;
    reasons.push({ label: "Connections", detail: `${conn.toLocaleString()}+ connections — excellent network`, positive: true });
  } else if (conn >= 5000) {
    baseScore += 30;
    reasons.push({ label: "Connections", detail: `${conn.toLocaleString()}+ connections — strong network`, positive: true });
  } else if (conn >= 2000) {
    baseScore += 20;
    reasons.push({ label: "Connections", detail: `${conn.toLocaleString()}+ connections — good network`, positive: true });
  } else if (conn >= 500) {
    baseScore += 10;
    reasons.push({ label: "Connections", detail: `${conn.toLocaleString()} connections — growing network`, positive: true });
  } else {
    baseScore += 5;
    reasons.push({ label: "Connections", detail: `${conn} connections — building network`, positive: false });
  }

  // Verified
  if (data.verified) {
    baseScore += 15;
    reasons.push({ label: "Verification", detail: "LinkedIn verified profile", positive: true });
  }

  // Sales Navigator
  if (data.hasSalesNav) {
    baseScore += 10;
    reasons.push({ label: "Sales Navigator", detail: "Active Sales Navigator subscription", positive: true });
  }

  // Notes parsing for account age
  const notes = (data.notes || "").toLowerCase();
  const ageMatch = notes.match(/(\d+)\+?\s*year/);
  if (ageMatch) {
    const years = parseInt(ageMatch[1]);
    if (years >= 5) {
      baseScore += 15;
      reasons.push({ label: "Account Age", detail: `${years}+ years — well-established account`, positive: true });
    } else {
      baseScore += 8;
      reasons.push({ label: "Account Age", detail: `${years} years`, positive: true });
    }
  }
  if (notes.includes("photo") || notes.includes("picture")) {
    baseScore += 5;
    reasons.push({ label: "Profile Photo", detail: "Professional profile photo", positive: true });
  }

  // Calculate amount
  let amount: number;
  let tier: string;
  if (baseScore >= 70) {
    amount = 40 + Math.floor((baseScore - 70) / 5) * 5;
    tier = "Elite";
  } else if (baseScore >= 50) {
    amount = 25 + Math.floor((baseScore - 50) / 10) * 5;
    tier = "Premium";
  } else if (baseScore >= 30) {
    amount = 15 + Math.floor((baseScore - 30) / 10) * 5;
    tier = "Standard";
  } else {
    amount = 16;
    tier = "Starter";
  }

  return { amount: Math.min(amount, 75), tier, reasons };
}

export default function BecomeAmbassadorPage() {
  const [step, setStep] = useState<Step | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [assignedProxy, setAssignedProxy] = useState<{host:string;port:number;username:string;password:string}|null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scanIndex, setScanIndex] = useState(0);
  const [offer, setOffer] = useState<{ amount: number; tier: string; reasons: { label: string; detail: string; positive: boolean }[] } | null>(null);
  const [profileId, setGologinProfileId] = useState("");
  const [launchingBrowser, setLaunchingBrowser] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; tempPassword: string } | null>(null);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    contactNumber: "",
    contactMethod: "whatsapp" as "whatsapp" | "telegram",
    contactHandle: "",
    linkedinProfileName: "",
    linkedinEmail: "",
    sameNameAsProfile: true,
    sameEmailAsProfile: true,
    linkedinUrl: "",
    connectionCount: "",
    location: "",
    verified: false,
    hasSalesNav: false,
    notes: "",
    referralSource: "",
  });

  const [accountName, setAccountName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountLinkedinUrl, setAccountLinkedinUrl] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"usdc" | "paypal" | "wise" | null>(null);
  const [bankForm, setBankForm] = useState({
    bankName: "",
    bankAccountName: "",
    bankAccountNumber: "",
    bankRoutingNumber: "",
    bankSortCode: "",
    usdcWalletAddress: "",
    usdcNetwork: "ethereum",
    paypalEmail: "",
    wiseEmail: "",
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const updateBank = (field: string, value: string) =>
    setBankForm((prev) => ({ ...prev, [field]: value }));

  // Pre-fill from logged-in user and skip choice step. If "?valuation=1" is in the URL
  // (e.g. the "Get my valuation" nav button), jump straight into the form.
  useEffect(() => {
    let wantValuation = false;
    let booked = false;
    let wantSubmit = false;
    try {
      const sp = new URLSearchParams(window.location.search);
      wantValuation = !!sp.get("valuation");
      booked = !!sp.get("booked"); // returning here after signing up — show the book-a-call step
      wantSubmit = !!sp.get("submit"); // logged-in user adding an account — skip valuation, go straight to the form
    } catch {}
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setForm((prev) => ({
            ...prev,
            fullName: prev.fullName || data.user.fullName || "",
            email: prev.email || data.user.email || "",
            contactNumber: prev.contactNumber || data.user.contactNumber || "",
            contactMethod: data.user.contactNumber?.startsWith("telegram:") ? "telegram" as const : "whatsapp" as const,
            contactHandle: prev.contactHandle || (data.user.contactNumber?.replace(/^(whatsapp|telegram):/, "") || ""),
          }));
          setIsLoggedIn(true);
          setStep(booked ? "scheduled" : wantSubmit ? "account-details" : wantValuation ? "info" : "logged-in-choice");
        } else {
          setStep(booked ? "scheduled" : wantValuation ? "info" : "choice");
        }
      })
      .catch(() => {
        setStep(booked ? "scheduled" : wantValuation ? "info" : "choice");
      });
  }, []);

  // Auto-fetch proxy when entering the GoLogin setup step
  useEffect(() => {
    if (step !== "login" || assignedProxy) return;
    fetch("/api/ambassador/proxy")
      .then((r) => r.json())
      .then((data) => {
        if (data.proxy) setAssignedProxy(data.proxy);
      })
      .catch(() => {});
  }, [step, assignedProxy]);

  // Scanning animation
  useEffect(() => {
    if (step !== "scanning") return;
    if (scanIndex >= SCAN_STEPS.length) {
      // Show the server's assessed offer (captured in handleSubmit). Fall back to the
      // local estimate only if the apply call didn't return one — so the number the
      // applicant sees always matches what's stored + emailed + paid.
      setOffer((prev) => prev ?? calculateOffer({
        connectionCount: Number(form.connectionCount) || 0,
        verified: form.verified as unknown as boolean,
        hasSalesNav: form.hasSalesNav as unknown as boolean,
        notes: form.notes,
      }));
      setTimeout(() => setStep("result"), 500);
      return;
    }
    const timer = setTimeout(() => setScanIndex((i) => i + 1), 1200 + Math.random() * 800);
    return () => clearTimeout(timer);
  }, [step, scanIndex, form]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.fullName || !form.email || !form.linkedinUrl || !form.contactHandle) {
      setError("Please fill in all required fields");
      return;
    }

    // Create ambassador application immediately so it appears in admin, and capture
    // the server's assessed offer so the applicant sees the SAME number we store/pay.
    try {
      const res = await fetch("/api/ambassador/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          linkedinEmail: form.sameEmailAsProfile ? form.email : (form.linkedinEmail || form.email),
          contactNumber: `${form.contactMethod}:${form.contactHandle}`,
          linkedinUrl: form.linkedinUrl,
          connectionCount: form.connectionCount ? Number(form.connectionCount) : undefined,
          location: form.location || undefined,
          referralSource: form.referralSource || undefined,
          notes: [
            form.verified ? "Verified profile" : "",
            form.hasSalesNav ? "Sales Navigator" : "",
            form.notes || "",
          ].filter(Boolean).join(". ") || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const a = data.assessment;
        if (a) {
          setOffer({
            amount: a.offeredAmount,
            tier: a.tier ? a.tier.charAt(0).toUpperCase() + a.tier.slice(1) : "Starter",
            reasons: (a.breakdown || []).map((b: { category: string; reason: string; points: number }) => ({
              label: b.category, detail: b.reason, positive: b.points > 0,
            })),
          });
        }
      }
    } catch {} // Don't block the flow if this fails

    setScanIndex(0);
    setStep("scanning");
  }, [form]);

  // Stash what they already typed so the signup page pre-fills it (no re-entering).
  const stashSignupPrefill = () => {
    try {
      const parts = (form.fullName || "").trim().split(/\s+/);
      localStorage.setItem("lv_signup_prefill", JSON.stringify({
        firstName: parts[0] || "",
        lastName: parts.slice(1).join(" "),
        email: form.email || "",
        contactMethod: form.contactMethod || "whatsapp",
        contactHandle: form.contactHandle || "",
      }));
    } catch {}
  };

  const handleBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Save to database
      const applyRes = await fetch("/api/ambassador/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          contactNumber: form.contactHandle ? `${form.contactMethod}:${form.contactHandle}` : undefined,
          linkedinEmail: form.sameEmailAsProfile ? form.email : (form.linkedinEmail || form.email),
          connectionCount: form.connectionCount ? Number(form.connectionCount) : undefined,
        }),
      });

      if (applyRes.ok) {
        const applyData = await applyRes.json();
        // Save bank details
        await fetch("/api/ambassador/bank", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ applicationId: applyData.application.id, paymentMethod, ...bankForm }),
        });
      }

      setStep("account-details");
    } catch {
      setStep("account-details"); // Continue even if save fails
    } finally {
      setLoading(false);
    }
  };

  if (step === null) {
    return <div className="flex min-h-screen items-center justify-center"><div className="text-gray-400">Loading...</div></div>;
  }

  return (
    <div>
      <style>{`
        .atiers{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;align-items:start;max-width:1080px;margin:0 auto}
        .atier{position:relative;border:1px solid #E8E6E1;border-radius:18px;padding:30px 28px;background:#fff;transition:.2s;text-align:left}
        .atier::before{content:'';position:absolute;top:0;left:0;right:0;height:5px;border-radius:18px 18px 0 0;background:#9be0b8}
        .atier.t-est::before{background:#00B85C}
        .atier.t-prem::before{background:#0A4D30}
        .atier:hover{transform:translateY(-4px);box-shadow:0 22px 44px -24px rgba(0,184,92,0.3)}
        .atier.feat{border:2px solid #00B85C;box-shadow:0 30px 60px -26px rgba(0,184,92,0.5);transform:translateY(-14px)}
        .atier.feat:hover{transform:translateY(-18px)}
        .atier h3{font-family:'Montserrat',sans-serif;font-size:20px;font-weight:700;letter-spacing:-0.02em;margin:14px 0 4px;color:#0F1419}
        .a-badge{position:absolute;top:-11px;left:28px;font-size:10.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#fff;background:linear-gradient(135deg,#00B85C,#007A3D);padding:4px 11px;border-radius:999px}
        .a-cat{font-size:10.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#007A3D;background:#E6F9EE;border-radius:999px;padding:4px 11px;display:inline-block}
        .atier.t-est .a-cat{color:#fff;background:#00B85C}
        .atier.t-prem .a-cat{color:#fff;background:#0A4D30}
        .a-strength{display:inline-flex;gap:4px;margin-left:9px;vertical-align:middle}
        .a-strength i{width:7px;height:7px;border-radius:50%;background:#D5DBE3;display:inline-block}
        .a-strength i.on{background:#00B85C}
        .atier.t-prem .a-strength i.on{background:#0A4D30}
        .a-eg{display:flex;align-items:center;gap:11px;margin:14px 0 10px;padding:11px 12px;border:1px solid #E8E6E1;border-radius:12px;background:#FAFBFC}
        .a-eg-av{width:42px;height:42px;border-radius:50%;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;position:relative;flex:0 0 42px;font-family:'Montserrat',sans-serif}
        .a-eg-dot{position:absolute;right:-1px;bottom:-1px;width:11px;height:11px;border-radius:50%;background:#0A66C2;border:2px solid #FAFBFC}
        .a-eg-name{font-weight:700;font-size:14px;color:#0F1419}
        .a-eg-tag{font-size:9px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#8899A6;background:#EEF0F4;border-radius:6px;padding:2px 6px;margin-left:6px}
        .a-eg-role{font-size:12px;color:#536471}
        .a-egstats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:6px}
        .a-egstats > div{background:#F2FAF5;border-radius:9px;padding:8px 6px;text-align:center}
        .a-egstats b{display:block;font-family:'Montserrat',sans-serif;font-size:15px;color:#007A3D}
        .a-egstats span{font-size:10px;color:#8899A6}
        .a-desc{font-size:13.5px;color:#536471;line-height:1.55;margin:10px 0 0}
        .a-band{font-size:16px;font-weight:800;color:#007A3D;margin:14px 0 0}
        .a-band small{color:#8899A6;font-weight:600}
        @media(max-width:860px){.atiers{grid-template-columns:1fr}}
      `}</style>

      {/* Landing marketing (hero + earnings) — only on the choice/landing steps so it
          hides once the user starts the valuation form. */}
      {(step === "choice" || step === "logged-in-choice") && (
      <>
      <style>{`@keyframes lvAurA{0%,100%{transform:translate(0,0) scale(1);opacity:.9}50%{transform:translate(6%,4%) scale(1.12);opacity:1}}@keyframes lvAurB{0%,100%{transform:translate(0,0) scale(1);opacity:.8}50%{transform:translate(-5%,3%) scale(1.15);opacity:.95}}@media(max-width:720px){.a-earn-grid{grid-template-columns:1fr!important}}`}</style>

      {/* Hero — green ambassador design */}
      <section id="amb-hero" style={{ position: "relative", overflow: "hidden", background: "radial-gradient(80% 60% at 50% -10%, rgba(0,184,92,0.30) 0%, rgba(11,32,24,0) 62%), radial-gradient(70% 60% at 88% 10%, rgba(20,160,90,0.20) 0%, rgba(11,32,24,0) 55%), linear-gradient(180deg,#10432C 0%,#0B2018 100%)", padding: "74px 24px 84px", textAlign: "center", color: "#EAF6EE" }}>
        <div aria-hidden style={{ position: "absolute", width: 620, height: 620, left: -160, top: -220, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,184,92,0.26), rgba(0,184,92,0) 65%)", filter: "blur(20px)", pointerEvents: "none", animation: "lvAurA 16s ease-in-out infinite" }} />
        <div aria-hidden style={{ position: "absolute", width: 560, height: 560, right: -140, bottom: -200, borderRadius: "50%", background: "radial-gradient(circle, rgba(20,180,110,0.22), rgba(20,180,110,0) 65%)", filter: "blur(20px)", pointerEvents: "none", animation: "lvAurB 19s ease-in-out infinite" }} />
        <div style={{ position: "relative", maxWidth: 820, margin: "0 auto" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 999, padding: "7px 15px", fontSize: 13, fontWeight: 600, color: "#CFEAD9", marginBottom: 26 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3EF08A" }} />For account owners &amp; professionals
          </span>
          <h1 style={{ fontFamily: "'Poppins','Montserrat',sans-serif", fontWeight: 800, fontSize: "clamp(36px,5.8vw,58px)", lineHeight: 1.04, letterSpacing: "-0.03em", margin: "0 auto 22px", color: "#fff", maxWidth: 720 }}>Get paid for your <span style={{ color: "#4FE08C" }}>LinkedIn account</span></h1>
          <p style={{ fontSize: 19, lineHeight: 1.6, color: "#B7D4C4", margin: "0 auto", maxWidth: 600 }}>Every LinkedIn account has value — whether you&apos;re a student, a professional, or barely use it. Companies need real profiles for outreach, and we pay you a <strong style={{ color: "#fff" }}>setup bonus plus a monthly payout</strong> for every account you share.</p>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", justifyContent: "center", marginTop: 34 }}>
            <button type="button" onClick={() => setStep("info")} style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "#00B85C", color: "#fff", fontSize: 16, fontWeight: 600, padding: "15px 26px", borderRadius: 12, border: "none", cursor: "pointer", boxShadow: "0 14px 32px rgba(0,184,92,0.34)" }}>Get my free valuation →</button>
            <a href="#earn" style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "rgba(255,255,255,0.08)", color: "#EAF6EE", border: "1px solid rgba(255,255,255,0.2)", fontSize: 16, fontWeight: 600, padding: "15px 26px", borderRadius: 12, textDecoration: "none" }}>See how it works</a>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 26, flexWrap: "wrap", justifyContent: "center", marginTop: 34, fontSize: 13.5, color: "#9DC4AE" }}>
            {["No cost to join", "You stay in control", "Cancel anytime"].map((t) => (
              <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span style={{ color: "#4FE08C" }}>✓</span>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* How earning works — structure only, no public payout figures */}
      <section id="earn" style={{ background: "#FBFCFB", padding: "64px 24px 8px", borderBottom: "1px solid #E8E6E1" }}>
        <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 40px" }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "#00A150", marginBottom: 14 }}>How earning works</div>
          <h2 style={{ fontFamily: "'Poppins','Montserrat',sans-serif", fontWeight: 700, fontSize: "clamp(28px,4vw,40px)", letterSpacing: "-0.03em", margin: "0 0 12px" }}>A bonus to start, then paid every month</h2>
          <p style={{ fontSize: 18, lineHeight: 1.55, color: "#5A6473", margin: 0 }}>Get a one-time setup bonus when your account is approved, then a payout every month it stays active. Get your free valuation to see exactly what yours is worth.</p>
        </div>

        <div style={{ maxWidth: 820, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, alignItems: "stretch" }} className="a-earn-grid">
          <div style={{ background: "#fff", border: "1px solid #E7EBE8", borderRadius: 20, padding: "30px", boxShadow: "0 1px 3px rgba(16,24,40,0.04)" }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, fontWeight: 500, letterSpacing: "0.1em", color: "#067A45", background: "#E7F6EE", padding: "5px 11px", borderRadius: 7 }}>ONE-TIME</span>
            <div style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: 22, color: "#0B1220", margin: "20px 0 6px" }}>Setup bonus</div>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "#5A6473", margin: 0 }}>Paid once when your account is approved and set up — just for getting started.</p>
          </div>
          <div style={{ position: "relative", background: "#fff", border: "1.5px solid #00A150", borderRadius: 20, padding: "30px", boxShadow: "0 18px 44px rgba(0,161,80,0.16)" }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, fontWeight: 500, letterSpacing: "0.1em", color: "#fff", background: "#00A150", padding: "5px 11px", borderRadius: 7 }}>EVERY MONTH</span>
            <div style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: 22, color: "#00A150", margin: "20px 0 6px" }}>Monthly payout</div>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "#5A6473", margin: 0 }}>Paid every month your account stays active — for as long as you keep it shared. Cancel anytime.</p>
          </div>
        </div>

        <div style={{ maxWidth: 820, margin: "18px auto 0", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", justifyContent: "center", background: "#F6FAF7", border: "1px solid #E6F0EA", borderRadius: 14, padding: "16px 22px" }}>
          <span style={{ fontSize: 14.5, color: "#37424F" }}><strong style={{ color: "#0B1220" }}>More accounts, more income:</strong> share your own and your family&apos;s — each approved account earns its own setup bonus + monthly payout.</span>
        </div>

        <div style={{ maxWidth: 900, margin: "34px auto 0" }}>
          <div style={{ background: "linear-gradient(135deg,#E7F6EE,#F1FAF4)", border: "1px solid #CDEBD9", borderRadius: 16, padding: "26px 30px", textAlign: "center" }}>
            <div style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: 19, color: "#0B1220", marginBottom: 8 }}>It&apos;s not just your account</div>
            <p style={{ fontSize: 15.5, lineHeight: 1.65, color: "#37424F", margin: "0 auto", maxWidth: 640 }}>Got family who don&apos;t use their LinkedIn? Your siblings, parents, aunties, uncles — submit their accounts too and earn a setup bonus plus monthly payout for each one. If the account exists, it has value.</p>
          </div>
        </div>

        <div style={{ textAlign: "center", padding: "34px 0 0" }}>
          <button type="button" onClick={() => setStep("info")} style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "#00B85C", color: "#fff", fontSize: 15, fontWeight: 600, padding: "13px 24px", borderRadius: 12, border: "none", cursor: "pointer", boxShadow: "0 12px 28px rgba(0,184,92,0.28)" }}>Get my free valuation →</button>
        </div>
      </section>
      </>
      )}

      {/* Choice Screen */}
      {step === "choice" && (
        <section className="py-6">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-5 md:grid-cols-2">
              <div
                onClick={() => (window.location.href = "/login?redirect=/become-ambassador")}
                className="group cursor-pointer rounded-2xl border border-gray-200 bg-white p-8 transition-all hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/5"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
                  <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-gray-900">Already an Ambassador?</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">Sign in to manage your accounts, check earnings, and view your dashboard.</p>
                <div className="mt-5">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 group-hover:gap-2.5 transition-all">
                    Sign In
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                  </span>
                </div>
              </div>

              <div
                onClick={() => setStep("info")}
                className="group cursor-pointer rounded-2xl border border-gray-200 bg-white p-8 transition-all hover:border-green-400 hover:shadow-xl hover:shadow-green-500/5"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50">
                  <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-gray-900">First-Time Ambassador?</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">Get your LinkedIn profile evaluated instantly — no sign-up needed.</p>
                <div className="mt-5">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-600 group-hover:gap-2.5 transition-all">
                    Get Started
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* === Landing marketing (only on the choice/landing step) === */}
      {step === "choice" && (
        <>
          {/* HOW IT WORKS */}
          <section id="how" className="bg-white border-t" style={{borderColor:'#E8E6E1'}}>
            <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
              <div className="text-center max-w-2xl mx-auto mb-10">
                <div className="text-xs font-bold uppercase mb-3" style={{color:'#00B85C',letterSpacing:'0.12em'}}>How it works</div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900" style={{fontFamily:"'Montserrat',sans-serif",letterSpacing:'-0.03em'}}>From sign-up to your first payout</h2>
                <p className="mt-3 text-gray-600">Four simple steps. No technical know-how needed.</p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {t:"Get a free valuation",d:"Enter your profile and see what it's worth instantly — no sign-up needed."},
                  {t:"Share your profile securely",d:"We set up protected, proxy-based access. Your login stays safe."},
                  {t:"We review & approve",d:"Our team checks the account and lists it for renters."},
                  {t:"Get paid monthly",d:"Earn every month via USDC, PayPal or Wise — guaranteed."},
                ].map((s,i)=>(
                  <div key={i} className="rounded-2xl border border-[#E8E6E1] bg-white p-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white font-bold" style={{background:'linear-gradient(135deg,#00B85C,#007A3D)',boxShadow:'0 10px 20px -8px rgba(0,184,92,0.6)'}}>{i+1}</div>
                    <h3 className="mt-4 text-base font-semibold text-gray-900">{s.t}</h3>
                    <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{s.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* WHY AMBASSADORS LOVE THIS — benefits */}
          <section className="bg-[#FAFAF8] border-t" style={{borderColor:'#E8E6E1'}}>
            <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
              <div className="text-center max-w-2xl mx-auto mb-10">
                <div className="text-xs font-bold uppercase mb-3" style={{color:'#00B85C',letterSpacing:'0.12em'}}>Ambassador benefits</div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900" style={{fontFamily:"'Montserrat',sans-serif",letterSpacing:'-0.03em'}}>Why ambassadors love this</h2>
                <p className="mt-3 text-gray-600">Everything you gain — nothing you lose.</p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  {icon:"💵",tint:"green",t:"Earn monthly income",d:"Predictable recurring payouts every month your account is active."},
                  {icon:"🙌",tint:"blue",t:"Completely hands-off",d:"You don't run campaigns, reply to messages, or manage anything — we handle it all."},
                  {icon:"🎛️",tint:"green",t:"Stay in full control",d:"Pause or withdraw whenever you want. No lock-in, no penalties."},
                  {icon:"🛡️",tint:"blue",t:"Safe & protected",d:"Human-paced activity within LinkedIn's limits. Your profile stays protected."},
                  {icon:"🌐",tint:"green",t:"Grow your network",d:"Real, relevant connections get added as outreach runs on your behalf."},
                  {icon:"💤",tint:"blue",t:"Even idle accounts pay",d:"Barely use LinkedIn? Accounts you — or family — don't use still earn."},
                ].map((b,i)=>(
                  <div key={i} className="rounded-2xl border border-[#E8E6E1] bg-white p-6">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl text-lg" style={{background: b.tint==="blue" ? "#E8F1FA" : "#E6F9EE"}}>{b.icon}</div>
                    <h3 className="mt-4 text-base font-semibold text-gray-900">{b.t}</h3>
                    <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{b.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* WHY YOU'RE NEEDED — bot vs real comparison */}
          <section className="bg-white border-t" style={{borderColor:'#E8E6E1'}}>
            <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
              <div className="text-center max-w-2xl mx-auto mb-8">
                <div className="text-xs font-bold uppercase mb-3" style={{color:'#00B85C',letterSpacing:'0.12em'}}>Why you&apos;re needed</div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900" style={{fontFamily:"'Montserrat',sans-serif",letterSpacing:'-0.03em'}}>Why businesses need real profiles</h2>
                <p className="mt-3 text-gray-600">Messages from real professionals vastly outperform automated bot accounts — that&apos;s why companies partner with verified individuals.</p>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-[#E8E6E1] bg-white">
                <table className="w-full text-left text-sm" style={{minWidth:520}}>
                  <thead>
                    <tr className="border-b border-[#E8E6E1] bg-[#FAFAF8]">
                      <th className="px-5 py-3.5 font-semibold text-gray-500">Feature</th>
                      <th className="px-5 py-3.5 font-semibold" style={{color:'#DC2626'}}>Bot outreach</th>
                      <th className="px-5 py-3.5 font-semibold" style={{color:'#007A3D'}}>Real profile outreach</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {f:"Account type",bot:"Fake / recycled accounts",real:"Verified real professional"},
                      {f:"Restriction risk",bot:"High restriction risk",real:"Low restriction rate"},
                      {f:"Acceptance rates",bot:"Low acceptance rates",real:"Higher acceptance rates"},
                      {f:"Messaging feel",bot:"Feels spammy",real:"Human communication"},
                      {f:"Trust level",bot:"No trust",real:"Trusted company representative"},
                    ].map((r,i)=>(
                      <tr key={i} className="border-b border-[#F0F1F3] last:border-0">
                        <td className="px-5 py-3.5 font-medium text-gray-900">{r.f}</td>
                        <td className="px-5 py-3.5 text-gray-600"><span className="mr-1.5" style={{color:'#DC2626'}}>✗</span>{r.bot}</td>
                        <td className="px-5 py-3.5 text-gray-700"><span className="mr-1.5" style={{color:'#00B85C'}}>✓</span>{r.real}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-6 text-center text-gray-600">Companies pay for trust &amp; deliverability — <strong className="text-gray-900">your real identity makes outreach work.</strong></p>
            </div>
          </section>

          {/* TRUST & SAFETY */}
          <section className="bg-[#FAFAF8] border-t" style={{borderColor:'#E8E6E1'}}>
            <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
              <div className="text-center max-w-2xl mx-auto mb-10">
                <div className="text-xs font-bold uppercase mb-3" style={{color:'#00B85C',letterSpacing:'0.12em'}}>Safe &amp; in your control</div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900" style={{fontFamily:"'Montserrat',sans-serif",letterSpacing:'-0.03em'}}>Your account always stays yours</h2>
                <p className="mt-3 text-gray-600">Sharing an account doesn&apos;t mean giving it away. Here&apos;s how we keep you protected.</p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 max-w-3xl mx-auto">
                {[
                  {t:"You stay in control",d:"Your name, photo and headline never change. The account is used for outreach only."},
                  {t:"Protected access",d:"Every account runs through a dedicated proxy and a secure anti-detect browser (GoLogin)."},
                  {t:"Nothing posted as you",d:"Renters can't change your profile or post on your behalf."},
                  {t:"Stop whenever",d:"Withdraw your account at any time. No lock-in, no penalties."},
                ].map((s,i)=>(
                  <div key={i} className="flex gap-3.5 rounded-2xl border border-[#E8E6E1] bg-white p-5">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg" style={{background:'#E6F9EE'}}>
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="#00B85C" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    </div>
                    <div>
                      <h3 className="text-[15px] font-semibold text-gray-900">{s.t}</h3>
                      <p className="mt-1 text-sm text-gray-600 leading-relaxed">{s.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* PAYOUTS */}
          <section className="bg-white border-t" style={{borderColor:'#E8E6E1'}}>
            <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
              <div className="text-center max-w-2xl mx-auto mb-10">
                <div className="text-xs font-bold uppercase mb-3" style={{color:'#00B85C',letterSpacing:'0.12em'}}>Payouts</div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900" style={{fontFamily:"'Montserrat',sans-serif",letterSpacing:'-0.03em'}}>Get paid every month — guaranteed</h2>
                <p className="mt-3 text-gray-600">Whether or not we find a renter, you get paid.</p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 max-w-4xl mx-auto">
                {[
                  {h:"1st",t:"Paid monthly",d:"On the 1st of every month, like clockwork."},
                  {h:"3 ways",t:"Your choice",d:"USDC, PayPal, or Wise — whatever suits you."},
                  {h:"100%",t:"Guaranteed",d:"Paid even in months your account isn't rented."},
                  {h:"+",t:"Scale up",d:"Add more accounts (yours or family's) for more income."},
                ].map((s,i)=>(
                  <div key={i} className="rounded-2xl border border-[#E8E6E1] bg-[#FAFAF8] p-6 text-center">
                    <div className="text-2xl font-bold" style={{fontFamily:"'Montserrat',sans-serif",color:'#0A66C2'}}>{s.h}</div>
                    <h3 className="mt-2 text-[15px] font-semibold text-gray-900">{s.t}</h3>
                    <p className="mt-1 text-sm text-gray-600 leading-relaxed">{s.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* WHAT HAPPENS NEXT */}
          <section className="bg-[#FAFAF8] border-t" style={{borderColor:'#E8E6E1'}}>
            <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
              <div className="text-center mb-10">
                <div className="text-xs font-bold uppercase mb-3" style={{color:'#00B85C',letterSpacing:'0.12em'}}>What&apos;s next</div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900" style={{fontFamily:"'Montserrat',sans-serif",letterSpacing:'-0.03em'}}>After you submit</h2>
                <p className="mt-3 text-gray-600">No mystery — here&apos;s exactly what happens.</p>
              </div>
              <div className="space-y-4">
                {[
                  {t:"Instant valuation",d:"You see your estimated monthly value right away."},
                  {t:"Quick review",d:"Our team verifies the account, usually within a couple of days."},
                  {t:"You're notified & listed",d:"We let you know it's approved and add it to the marketplace."},
                  {t:"Earnings begin",d:"You start earning on your next monthly payout."},
                ].map((s,i)=>(
                  <div key={i} className="flex gap-4 rounded-2xl border border-[#E8E6E1] bg-white p-5">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{background:'#00B85C'}}>{i+1}</div>
                    <div><h3 className="text-[15px] font-semibold text-gray-900">{s.t}</h3><p className="mt-0.5 text-sm text-gray-600">{s.d}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section id="faq" className="bg-white border-t" style={{borderColor:'#E8E6E1'}}>
            <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
              <div className="text-center mb-8">
                <div className="text-xs font-bold uppercase mb-3" style={{color:'#00B85C',letterSpacing:'0.12em'}}>FAQ</div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900" style={{fontFamily:"'Montserrat',sans-serif",letterSpacing:'-0.03em'}}>Common questions</h2>
              </div>
              <div>
                {[
                  {q:"Is it safe to share my account?",a:"Yes. Access is proxy-protected through a secure anti-detect browser, and the account is used for outreach only. Your password and profile stay yours."},
                  {q:"Will this affect my LinkedIn account?",a:"No. Real, established accounts used for normal outreach don't get flagged, and nothing about your profile is changed."},
                  {q:"When and how do I get paid?",a:"On the 1st of each month via USDC, PayPal, or Wise — guaranteed, whether or not your account is rented that month."},
                  {q:"Do I have to do anything day-to-day?",a:"No. Once it's set up, it runs in the background. You just get paid."},
                  {q:"Can I stop anytime?",a:"Yes — you can withdraw your account whenever you like. There's no lock-in."},
                  {q:"Can I submit accounts that aren't mine?",a:"Family members' accounts are welcome with their permission — submit each one and earn for each."},
                ].map((f,i)=>(
                  <details key={i} className="group border-b border-[#E8E6E1] py-4">
                    <summary className="flex cursor-pointer items-center justify-between font-semibold text-gray-900" style={{listStyle:'none'}}>
                      {f.q}
                      <span className="ml-4 text-xl leading-none transition-transform group-open:rotate-45" style={{color:'#00B85C'}}>+</span>
                    </summary>
                    <p className="mt-3 text-sm text-gray-600 leading-relaxed">{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>

          {/* CLOSING CTA */}
          <section className="relative overflow-hidden" style={{background:'linear-gradient(160deg,#06231A 0%,#0A4D30 45%,#00B85C 130%)'}}>
            <div aria-hidden className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-72 w-[34rem] rounded-full" style={{background:'radial-gradient(closest-side,rgba(79,144,217,0.22),transparent 70%)'}} />
            <div className="relative mx-auto max-w-3xl px-4 py-20 text-center">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white" style={{fontFamily:"'Montserrat',sans-serif",letterSpacing:'-0.03em'}}>Ready to start earning?</h2>
              <p className="mt-3 text-lg text-white/80">Get a free, instant valuation — no sign-up needed.</p>
              <div className="mt-7">
                <button type="button" onClick={() => setStep("info")} className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-bold text-[#06231A] transition hover:-translate-y-0.5" style={{boxShadow:'0 18px 36px -14px rgba(0,0,0,0.6)'}}>Get my free valuation →</button>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Logged-in Choice Screen */}
      {step === "logged-in-choice" && (
        <section className="py-6">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-5 md:grid-cols-2">
              <div
                onClick={() => setStep("info")}
                className="group cursor-pointer rounded-2xl border border-gray-200 bg-white p-8 transition-all hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/5"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
                  <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" /></svg>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-gray-900">Get Your Profile Evaluated</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">Share your LinkedIn details and we&apos;ll assess your profile value.</p>
                <div className="mt-5">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 group-hover:gap-2.5 transition-all">
                    Start Evaluation
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                  </span>
                </div>
                <div className="mt-4 inline-block rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">Beta</div>
              </div>

              <div
                onClick={() => setStep("account-details")}
                className="group cursor-pointer rounded-2xl border border-gray-200 bg-white p-8 transition-all hover:border-green-400 hover:shadow-xl hover:shadow-green-500/5"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50">
                  <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-gray-900">Share Your Profile Directly</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">Follow our step-by-step guide to share your LinkedIn profile via GoLogin. It&apos;s quick and free.</p>
                <div className="mt-5">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-600 group-hover:gap-2.5 transition-all">
                    Follow the Steps
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">Need help? <a href="https://t.me/linkedvelocity_support_bot" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-medium hover:text-blue-800">Get in touch with our team</a> and we&apos;ll walk you through the process.</p>
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      {step !== "choice" && step !== "logged-in-choice" && (
      <section className="py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-start justify-between">
            {[
              { n: "1", title: "Get a Valuation", active: step === "info" || step === "scanning" || step === "result" || step === "bank", done: ["account-details","login","complete","done"].includes(step as string), goTo: "info" as Step, color: "#0A66C2" },
              { n: "2", title: "Share Your Profile", active: step === "account-details" || step === "login", done: ["complete","done"].includes(step as string), goTo: "account-details" as Step, color: "#00B85C" },
              { n: "3", title: "Get Approved", active: step === "complete", done: step === "done", goTo: "complete" as Step, color: "#0A66C2" },
              { n: "4", title: "Get Paid Monthly", active: false, done: step === "done", goTo: "done" as Step, color: "#00B85C" },
            ].map((s, i, arr) => (
              <div key={s.n} className="flex items-start" style={{flex:1}}>
                <div
                  onClick={() => s.done && setStep(s.goTo)}
                  className={`flex flex-col items-center text-center ${s.done ? "cursor-pointer" : ""}`}
                  style={{width:'100%'}}
                >
                  <div
                    className="flex items-center justify-center transition-all"
                    style={{
                      width: 44, height: 44, borderRadius: '50%',
                      background: s.done ? '#00B85C' : s.active ? s.color : '#E8E6E1',
                      color: s.done || s.active ? '#fff' : '#8899A6',
                      fontSize: 16, fontWeight: 700,
                      boxShadow: s.active ? `0 0 0 4px ${s.color}20` : 'none',
                    }}
                  >
                    {s.done ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                    ) : s.n}
                  </div>
                  <p className="mt-2 text-xs font-semibold" style={{color: s.active ? '#0F1419' : s.done ? '#00B85C' : '#8899A6'}}>{s.title}</p>
                </div>
                {i < arr.length - 1 && (
                  <div style={{flex:'0 0 auto',width:40,height:2,background: s.done ? '#00B85C' : '#E8E6E1',marginTop:22,borderRadius:1}} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {step !== "choice" && (
      <section className="py-16">
        <div className="mx-auto max-w-xl px-4">
          {error && <div className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

          {/* STEP 1: Form */}
          {step === "info" && (
            <form onSubmit={handleSubmit}>
              <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Get Your Profile Valuation</h2>
              <p className="text-center text-gray-500 mb-2">We&apos;ll evaluate your profile instantly</p>
              <button
                type="button"
                onClick={() => {
                  if (isLoggedIn) {
                    setStep("scheduled");
                  } else {
                    stashSignupPrefill();
                    window.location.href = "/register?redirect=" + encodeURIComponent("/become-ambassador?booked=1");
                  }
                }}
                className="block mx-auto mb-6 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Skip valuation for now →
              </button>
              <Card>
                <CardContent className="py-6 space-y-4">
                  {/* Your details */}
                  <div className="border-b border-gray-100 pb-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Your Details</p>
                    <div className="space-y-4">
                      <Input id="fullName" label="Your Full Name *" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} required />
                      <Input id="email" label="Your Email *" type="email" placeholder="your@email.com" value={form.email} onChange={(e) => update("email", e.target.value)} required />
                      <div className="space-y-1">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp or Telegram *</label>
                          <div className="flex gap-2 mb-2">
                            <button
                              type="button"
                              onClick={() => update("contactMethod", "whatsapp")}
                              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${form.contactMethod === "whatsapp" ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                            >
                              WhatsApp
                            </button>
                            <button
                              type="button"
                              onClick={() => update("contactMethod", "telegram")}
                              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${form.contactMethod === "telegram" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                            >
                              Telegram
                            </button>
                          </div>
                          <input
                            type="text"
                            value={form.contactHandle}
                            onChange={(e) => update("contactHandle", e.target.value)}
                            placeholder={form.contactMethod === "whatsapp" ? "+44 7700 000000" : "@username"}
                            required
                            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <p className="text-xs text-gray-400">Please include your country code (e.g. +1, +44). We'll only contact you if there's an issue with one of your ambassador accounts or if we're having issues with your billing or payment information. We won't contact you for marketing or spamming.</p>
                      </div>
                    </div>
                  </div>

                  {/* LinkedIn profile details */}
                  <div className="border-b border-gray-100 pb-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">LinkedIn Profile You Want to Share</p>
                    <div className="space-y-4">
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={form.sameNameAsProfile}
                          onChange={(e) => setForm(prev => ({ ...prev, sameNameAsProfile: e.target.checked }))}
                          className="rounded border-gray-300"
                        />
                        The LinkedIn profile name is the same as my name above
                      </label>
                      {!form.sameNameAsProfile && (
                        <Input id="linkedinProfileName" label="Name on LinkedIn Profile *" placeholder="e.g. John Smith" value={form.linkedinProfileName} onChange={(e) => update("linkedinProfileName", e.target.value)} />
                      )}

                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={form.sameEmailAsProfile}
                          onChange={(e) => setForm(prev => ({ ...prev, sameEmailAsProfile: e.target.checked }))}
                          className="rounded border-gray-300"
                        />
                        The LinkedIn login email is the same as my email above
                      </label>
                      {!form.sameEmailAsProfile && (
                        <Input id="linkedinEmail" label="Email Used for LinkedIn Login *" type="email" placeholder="linkedin@email.com" value={form.linkedinEmail} onChange={(e) => update("linkedinEmail", e.target.value)} />
                      )}

                      <Input id="linkedinUrl" label="LinkedIn Profile URL *" placeholder="https://linkedin.com/in/yourprofile" value={form.linkedinUrl} onChange={(e) => update("linkedinUrl", e.target.value)} required />
                    </div>
                  </div>

                  {/* How did you hear about us? */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">How did you hear about us?</label>
                    <select
                      value={form.referralSource}
                      onChange={(e) => update("referralSource", e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select an option (optional)</option>
                      <option>Google search</option>
                      <option>LinkedIn</option>
                      <option>ChatGPT / AI tool</option>
                      <option>Social media</option>
                      <option>Reddit</option>
                      <option>Friend or referral</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <Button type="submit" className="w-full" size="lg">Get Profile Valuation</Button>
                </CardContent>
              </Card>
            </form>
          )}

          {/* STEP 2: Scanning animation */}
          {step === "scanning" && (
            <div className="text-center py-12">
              <div className="mx-auto mb-8 relative">
                {/* Spinning rings */}
                <div className="mx-auto h-32 w-32 relative">
                  <div className="absolute inset-0 rounded-full border-4 border-blue-200 animate-ping opacity-20" />
                  <div className="absolute inset-2 rounded-full border-4 border-blue-300 animate-spin" style={{ borderTopColor: "transparent", animationDuration: "1.5s" }} />
                  <div className="absolute inset-4 rounded-full border-4 border-blue-400 animate-spin" style={{ borderBottomColor: "transparent", animationDuration: "2s", animationDirection: "reverse" }} />
                  <div className="absolute inset-6 rounded-full border-4 border-blue-500 animate-spin" style={{ borderTopColor: "transparent", animationDuration: "1s" }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                  </div>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-900">Assessing Your Profile</h2>
              <p className="mt-2 text-gray-500">This will only take a moment...</p>

              {/* Scan steps */}
              <div className="mt-8 text-left max-w-sm mx-auto space-y-3">
                {SCAN_STEPS.map((label, i) => (
                  <div key={label} className={`flex items-center gap-3 transition-all duration-500 ${i < scanIndex ? "opacity-100" : i === scanIndex ? "opacity-100" : "opacity-0"}`}>
                    {i < scanIndex ? (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 flex-shrink-0">
                        <svg className="h-3.5 w-3.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    ) : i === scanIndex ? (
                      <div className="flex h-6 w-6 items-center justify-center flex-shrink-0">
                        <div className="h-4 w-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                      </div>
                    ) : (
                      <div className="h-6 w-6 flex-shrink-0" />
                    )}
                    <span className={`text-sm ${i < scanIndex ? "text-green-700" : i === scanIndex ? "text-blue-700 font-medium" : "text-gray-400"}`}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div className="mt-8 mx-auto max-w-sm">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${(scanIndex / SCAN_STEPS.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Result & offer */}
          {step === "result" && offer && (
            <div className="py-4">
              <div className="text-center mb-6">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Assessment Complete</h2>
                <p className="mt-1 text-gray-500">Here&apos;s what we found, {form.fullName.split(" ")[0]}</p>
              </div>

              {/* Offer */}
              <Card className="mt-4">
                <CardContent className="py-8 text-center">
                  <p className="text-sm text-gray-500 uppercase tracking-wide font-medium">Based on your {offer.tier} profile, we&apos;d like to offer you</p>
                  <p className="mt-4 text-6xl font-bold text-green-600">
                    {formatCurrency(offer.amount)}
                  </p>
                  <p className="mt-1 text-lg text-gray-500">per month</p>
                  <p className="mt-4 text-sm text-gray-500">
                    Paid by a method of your choosing on the 1st of each month.
                    <br />Cancel anytime.
                  </p>
                </CardContent>
              </Card>

              <div className="mt-6 flex gap-4">
                <Button onClick={() => {
                  if (!isLoggedIn) {
                    stashSignupPrefill();
                    window.location.href = "/register?redirect=" + encodeURIComponent("/become-ambassador?booked=1");
                    return;
                  }
                  setStep("scheduled");
                }} size="lg" className="flex-1">
                  Accept &amp; Continue
                </Button>
                <Button variant="outline" size="lg" onClick={() => setStep("review")} className="flex-1">
                  Request Manual Review
                </Button>
              </div>
              <p className="mt-4 text-center text-xs text-gray-400">
                By accepting, you agree to the{" "}
                <a href="/ambassador-terms" target="_blank" rel="noopener noreferrer" className="text-green-700 underline hover:text-green-800">
                  Ambassador Agreement
                </a>{" "}
                (LinkedIn Account Access &amp; Usage terms).
              </p>
            </div>
          )}

          {/* STEP: Book your onboarding call (interim — after accepting + signing up) */}
          {step === "scheduled" && (
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#E6F9EE]">
                <svg className="h-8 w-8 text-[#00B85C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">You&apos;re in{form.fullName ? `, ${form.fullName.split(" ")[0]}` : ""}! 🎉</h2>
              <p className="mt-2 text-gray-600 max-w-md mx-auto">
                We&apos;ve got your details. The last step is a quick onboarding call so we can verify your profile and get you set up to start earning.
              </p>

              <a
                href="https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ1he_qAS5s8faJzrAIjTJi8KIX9xvPhGbC4Ipn38lPTLzkfSuoyMIiqUrB0viY2jpXr_W_zLSdq"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#00B85C] px-7 py-3.5 text-[15px] font-bold text-white transition hover:bg-[#00A050]"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Book your onboarding call
              </a>

              <div className="mt-8 max-w-md mx-auto rounded-xl border border-green-100 bg-green-50/50 p-5 text-left">
                <p className="text-sm font-semibold text-gray-900 mb-2">What happens on the call</p>
                <ol className="space-y-1.5 text-sm text-gray-600">
                  <li>1. We quickly verify your LinkedIn profile.</li>
                  <li>2. We connect your account securely via GoLogin (you keep full control).</li>
                  <li>3. You start earning every month it&apos;s active.</li>
                </ol>
              </div>

              <a href="/dashboard" className="mt-6 inline-block text-sm font-medium text-gray-500 hover:text-gray-700">
                Go to my dashboard →
              </a>
            </div>
          )}

          {/* STEP: Manual Review Contact Options */}
          {step === "review" && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Request a Manual Review</h2>
              <p className="text-center text-gray-500 mb-6">
                Our team will personally review your profile and get back to you with a tailored offer. Reach out to us through any of the channels below.
              </p>

              <div className="space-y-3">
                <a
                  href="https://wa.me/639399388701"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <svg viewBox="0 0 24 24" className="h-6 w-6 text-green-600" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">WhatsApp Us</p>
                    <p className="text-sm text-gray-500">+639399388701</p>
                  </div>
                </a>

                <a
                  href="https://t.me/linkedvelocity_support_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                    <svg viewBox="0 0 24 24" className="h-6 w-6 text-blue-500" fill="currentColor">
                      <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Telegram Us</p>
                    <p className="text-sm text-gray-500">@linkedvelocity_support_bot</p>
                  </div>
                </a>

                <a
                  href="mailto:info@linkedvelocity.com"
                  className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                    <svg viewBox="0 0 24 24" className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="M22 4l-10 8L2 4" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Email Us</p>
                    <p className="text-sm text-gray-500">info@linkedvelocity.com</p>
                  </div>
                </a>
              </div>

              <div className="mt-6">
                <Button variant="outline" size="lg" className="w-full" onClick={() => setStep("result")}>
                  Back to Offer
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: Payment details */}
          {step === "bank" && (
            <form onSubmit={handleBankSubmit}>
              <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Payment Details</h2>
              <p className="text-center text-gray-500 mb-6">
                How would you like to receive your {offer ? formatCurrency(offer.amount) : ""}/month payment?
              </p>

              {/* Payment method selection */}
              <div className="space-y-3 mb-6">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("usdc")}
                  className={`flex items-center gap-4 w-full rounded-xl border-2 p-5 text-left transition-all ${paymentMethod === "usdc" ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"}`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 flex-shrink-0">
                    <svg viewBox="0 0 24 24" className="h-6 w-6 text-blue-600" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v-2h-2v2zm0-4h2V7h-2v6z"/>
                      <text x="7" y="16" fontSize="10" fontWeight="bold" fill="currentColor">$</text>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">USDC</p>
                    <p className="text-sm text-gray-500">Receive stablecoin to your crypto wallet. Fast, zero fees.</p>
                  </div>
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${paymentMethod === "usdc" ? "border-blue-600" : "border-gray-300"}`}>
                    {paymentMethod === "usdc" && <div className="h-2.5 w-2.5 rounded-full bg-blue-600" />}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("paypal")}
                  className={`flex items-center gap-4 w-full rounded-xl border-2 p-5 text-left transition-all ${paymentMethod === "paypal" ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"}`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 flex-shrink-0">
                    <svg viewBox="0 0 24 24" className="h-6 w-6 text-indigo-600" fill="currentColor">
                      <path d="M7.076 21.337H2.47a.641.641 0 01-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 00-.607-.541c1.652 1.046 2.024 2.986 1.488 5.74-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.44 9.137a.641.641 0 00.633.74h3.874c.457 0 .85-.334.922-.788l.038-.2.728-4.617.047-.254a.932.932 0 01.922-.788h.58c3.76 0 6.705-1.528 7.566-5.946.36-1.847.174-3.388-.777-4.471a3.71 3.71 0 00-1.092-.709z"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">PayPal</p>
                    <p className="text-sm text-gray-500">Receive payment to your PayPal account. Available worldwide.</p>
                  </div>
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${paymentMethod === "paypal" ? "border-blue-600" : "border-gray-300"}`}>
                    {paymentMethod === "paypal" && <div className="h-2.5 w-2.5 rounded-full bg-blue-600" />}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("wise")}
                  className={`flex items-center gap-4 w-full rounded-xl border-2 p-5 text-left transition-all ${paymentMethod === "wise" ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"}`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 flex-shrink-0">
                    <svg viewBox="0 0 24 24" className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Wise</p>
                    <p className="text-sm text-gray-500">Receive to your bank account via Wise. Low fees, great rates.</p>
                  </div>
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${paymentMethod === "wise" ? "border-blue-600" : "border-gray-300"}`}>
                    {paymentMethod === "wise" && <div className="h-2.5 w-2.5 rounded-full bg-blue-600" />}
                  </div>
                </button>
              </div>

              {/* USDC fields */}
              {paymentMethod === "usdc" && (
                <Card>
                  <CardContent className="py-6 space-y-4">
                    <Input
                      id="usdcWalletAddress"
                      label="Wallet Address"
                      placeholder="0x... or ENS name"
                      value={bankForm.usdcWalletAddress}
                      onChange={(e) => updateBank("usdcWalletAddress", e.target.value)}
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Network</label>
                      <select
                        value={bankForm.usdcNetwork}
                        onChange={(e) => updateBank("usdcNetwork", e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="ethereum">Ethereum (ERC-20)</option>
                        <option value="polygon">Polygon</option>
                        <option value="arbitrum">Arbitrum</option>
                        <option value="base">Base</option>
                        <option value="solana">Solana</option>
                      </select>
                    </div>
                    <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
                      Make sure your wallet supports USDC on the selected network. Sending to the wrong network may result in lost funds.
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* PayPal fields */}
              {paymentMethod === "paypal" && (
                <Card>
                  <CardContent className="py-6 space-y-4">
                    <Input
                      id="paypalEmail"
                      label="PayPal Email"
                      type="email"
                      placeholder="your@email.com"
                      value={bankForm.paypalEmail}
                      onChange={(e) => updateBank("paypalEmail", e.target.value)}
                    />
                    <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
                      Make sure this is the email address linked to your PayPal account. PayPal fees may apply.
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Wise fields */}
              {paymentMethod === "wise" && (
                <Card>
                  <CardContent className="py-6 space-y-4">
                    <Input
                      id="wiseEmail"
                      label="Wise Email"
                      type="email"
                      placeholder="your@email.com"
                      value={bankForm.wiseEmail}
                      onChange={(e) => updateBank("wiseEmail", e.target.value)}
                    />
                    <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-800">
                      We&apos;ll send payment to your Wise account. If you don&apos;t have one yet, <a href="https://wise.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">sign up for free</a>.
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="mt-6 flex gap-3">
                <Button variant="outline" size="lg" type="button" onClick={() => setStep("result")}>
                  Back
                </Button>
                {paymentMethod && (
                  <Button type="submit" loading={loading} className="flex-1" size="lg">
                    Submit &amp; Complete Setup
                  </Button>
                )}
              </div>
            </form>
          )}

          {/* STEP: Account Details */}
          {step === "account-details" && (
            <div className="py-4">
              <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Account Details</h2>
              <p className="text-center text-gray-500 mb-8">Tell us about the LinkedIn account you&apos;re sharing.</p>

              <div className="mx-auto max-w-md space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Full name on the LinkedIn account"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Email <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    value={accountEmail}
                    onChange={(e) => setAccountEmail(e.target.value)}
                    placeholder="Email used to log into this LinkedIn account"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn Profile URL <span className="text-red-500">*</span></label>
                  <input
                    type="url"
                    value={accountLinkedinUrl}
                    onChange={(e) => setAccountLinkedinUrl(e.target.value)}
                    placeholder="https://www.linkedin.com/in/yourprofile"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}

                <Button
                  className="w-full"
                  disabled={!accountName || !accountEmail || !accountLinkedinUrl}
                  onClick={async () => {
                    setError("");
                    if (!/\S+@\S+\.\S+/.test(accountEmail)) { setError("Please enter a valid account email address."); return; }
                    if (!/linkedin\.com\/in\//i.test(accountLinkedinUrl)) { setError("Please enter a valid LinkedIn profile URL (e.g. https://www.linkedin.com/in/yourprofile)."); return; }
                    try {
                      const res = await fetch("/api/ambassador/apply", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          fullName: accountName,
                          email: form.email || accountEmail,
                          linkedinEmail: accountEmail,
                          contactNumber: form.contactHandle ? `${form.contactMethod}:${form.contactHandle}` : undefined,
                          linkedinUrl: accountLinkedinUrl,
                          notes: `Account name: ${accountName}. Account email: ${accountEmail}.`,
                        }),
                      });
                      if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        // 409 = duplicate, still continue
                        if (res.status !== 409) {
                          console.error("Submission failed:", err);
                        }
                      }
                    } catch (e) {
                      console.error("Submission error:", e);
                    }
                    // Land on the dashboard so the new account shows under "My Submissions" (reviewing).
                    window.location.href = "/dashboard";
                  }}
                >
                  Submit account
                </Button>
              </div>
            </div>
          )}

          {/* STEP 5: Link LinkedIn — two options */}
          {step === "login" && (
            <div className="py-4">
              <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Link Your LinkedIn Account</h2>
              <p className="text-center text-gray-500 mb-8">
                Pick one of the two options below to connect your LinkedIn profile.
              </p>

              {/* Option A: Do it yourself */}
              <Card>
                <CardContent className="py-8">
                  <div className="text-center mb-4">
                    <span className="inline-block rounded-full bg-blue-100 px-4 py-1.5 text-sm font-semibold text-blue-700 mb-4">Option A</span>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Set It Up Yourself</h3>
                    <p className="text-gray-500">Takes about 5 minutes using GoLogin (free).</p>
                    <div className="mt-4 flex items-center justify-center gap-4">
                      <a href="#" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-purple-50 border border-purple-200 px-4 py-2.5 text-sm font-medium text-purple-700 hover:bg-purple-100 transition-colors">
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" /></svg>
                        Watch Loom Walkthrough
                      </a>
                      <a href="https://scribehow.com/viewer/Share_your_accounts_on_LinkedVelocity__jLAzNyl3SHeWQVy8ISk9BA" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-4 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors">
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                        See Scribe Guide
                      </a>
                    </div>
                  </div>

                  <hr className="border-gray-200 mb-6" />

                  <div className="space-y-6">
                    {/* Step 1 */}
                    <div className="flex items-start gap-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white flex-shrink-0">1</div>
                      <div>
                        <p className="font-semibold text-gray-900">Sign up to GoLogin</p>
                        <p className="text-sm text-gray-500 mt-1">If you don&apos;t have GoLogin yet, sign up for free at <a href="https://gologin.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-medium hover:text-blue-800">gologin.com</a>. You&apos;ll get a free trial — that&apos;s fine, you only need the free version.</p>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex items-start gap-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white flex-shrink-0">2</div>
                      <div>
                        <p className="font-semibold text-gray-900">Create a new profile with this proxy</p>
                        <p className="text-sm text-gray-500 mt-1">Open GoLogin, click &quot;+ New Profile&quot;, and name it after the email of the LinkedIn account you want to share. Then enter the proxy details below:</p>
                        {assignedProxy ? (
                          <div className="mt-3 rounded-lg bg-gray-50 border border-gray-200 p-4 font-mono text-sm space-y-2">
                            <div className="flex justify-between"><span className="text-gray-500">Host:</span><span className="font-semibold text-gray-900">{assignedProxy.host}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Port:</span><span className="font-semibold text-gray-900">{assignedProxy.port}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Username:</span><span className="font-semibold text-gray-900">{assignedProxy.username}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Password:</span><span className="font-semibold text-gray-900">{assignedProxy.password}</span></div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const res = await fetch("/api/ambassador/proxy");
                                const data = await res.json();
                                if (data.proxy) setAssignedProxy(data.proxy);
                              } catch {}
                            }}
                            className="mt-3 inline-flex items-center rounded-lg bg-blue-50 border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                          >
                            Show my proxy details
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex items-start gap-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white flex-shrink-0">3</div>
                      <div>
                        <p className="font-semibold text-gray-900">Log into your LinkedIn account</p>
                        <p className="text-sm text-gray-500 mt-1">Open the profile you just created in GoLogin. A browser will open — log into your LinkedIn account as you normally would.</p>
                      </div>
                    </div>

                    {/* Step 4 */}
                    <div className="flex items-start gap-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white flex-shrink-0">4</div>
                      <div>
                        <p className="font-semibold text-gray-900">Share the profile with LinkedVelocity</p>
                        <p className="text-sm text-gray-500 mt-1">Close the browser, then in GoLogin right-click the profile → <strong>Share</strong> → set permission to <strong>&quot;Can edit&quot;</strong> → share to:</p>
                        <div className="mt-2 flex items-center gap-2">
                          <code className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white">info@linkedvelocity.com</code>
                          <button
                            type="button"
                            onClick={() => { navigator.clipboard.writeText("info@linkedvelocity.com"); }}
                            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 rounded-lg bg-green-50 border border-green-100 p-4 text-sm text-green-700">
                    <strong>Your password stays private.</strong> By sharing the GoLogin profile with us, we can both access the account without you ever needing to share your LinkedIn password. You stay in control — if you ever want to deactivate your account, simply delete the profile from GoLogin and it will automatically be removed from our system too.
                  </div>

                  <Button size="lg" className="w-full mt-6" onClick={() => setStep("complete")}>
                    I&apos;ve Shared My Profile
                  </Button>
                </CardContent>
              </Card>

              {/* Divider */}
              <div className="flex items-center gap-4 my-8">
                <div className="flex-1 border-t border-gray-200" />
                <span className="text-sm font-medium text-gray-400 uppercase tracking-wide">or</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>

              {/* Option B: Get help from our team */}
              <Card>
                <CardContent className="py-8">
                  <div className="text-center mb-4">
                    <span className="inline-block rounded-full bg-green-100 px-4 py-1.5 text-sm font-semibold text-green-700 mb-4">Option B</span>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Get Help From Our Team</h3>
                    <p className="text-gray-500">We&apos;ll walk you through it and set everything up together.</p>
                  </div>

                  <hr className="border-gray-200 mb-6" />

                  <div className="space-y-4">
                    <a
                      href="https://linkedvelocity.com/book"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-indigo-300 hover:bg-indigo-50"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 flex-shrink-0">
                        <svg viewBox="0 0 24 24" className="h-6 w-6 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Book a Meeting</p>
                        <p className="text-sm text-gray-500">Schedule a call with our team</p>
                      </div>
                    </a>

                    <a
                      href="https://wa.me/639399388701"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-green-300 hover:bg-green-50"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 flex-shrink-0">
                        <svg viewBox="0 0 24 24" className="h-6 w-6 text-green-600" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">WhatsApp</p>
                        <p className="text-sm text-gray-500">+639399388701</p>
                      </div>
                    </a>

                    <a
                      href="https://t.me/linkedvelocity_support_bot"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-blue-300 hover:bg-blue-50"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 flex-shrink-0">
                        <svg viewBox="0 0 24 24" className="h-6 w-6 text-blue-500" fill="currentColor">
                          <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Telegram</p>
                        <p className="text-sm text-gray-500">@linkedvelocity_support_bot</p>
                      </div>
                    </a>

                    <a
                      href="mailto:info@linkedvelocity.com"
                      className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-purple-300 hover:bg-purple-50"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 flex-shrink-0">
                        <svg viewBox="0 0 24 24" className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="4" width="20" height="16" rx="2" />
                          <path d="M22 4l-10 8L2 4" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Email</p>
                        <p className="text-sm text-gray-500">info@linkedvelocity.com</p>
                      </div>
                    </a>
                  </div>

                  <p className="text-sm text-gray-400 mt-5 text-center">Our team will guide you through the entire process step by step.</p>
                </CardContent>
              </Card>

              <div className="mt-6">
                <Button size="lg" className="w-full" onClick={() => setStep("complete")}>
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* STEP 6: Waiting for confirmation */}
          {step === "complete" && (
            <div className="py-4">
              <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Almost Done!</h2>
              <p className="text-center text-gray-500 mb-6">
                The LinkedVelocity team is now assessing your profile to ensure everything is in place. We&apos;ll send you an email once it&apos;s approved.
              </p>

              <Card>
                <CardContent className="py-6">
                  <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 text-sm text-blue-700 text-center mb-6">
                    <strong>Please check back soon.</strong> We&apos;ll review your shared profile and get back to you as quickly as possible.
                  </div>

                  <p className="text-sm text-gray-500 text-center mb-4">If you need to reach out to us at any point, you can do so using these contact methods:</p>

                  <div className="space-y-3">
                    <a href="https://wa.me/639399388701" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-green-50 hover:border-green-200 transition-all">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 flex-shrink-0">
                        <svg viewBox="0 0 24 24" className="h-4 w-4 text-green-600" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">WhatsApp</p>
                        <p className="text-xs text-gray-500">+639399388701</p>
                      </div>
                    </a>
                    <a href="https://t.me/linkedvelocity_support_bot" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-blue-50 hover:border-blue-200 transition-all">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 flex-shrink-0">
                        <svg viewBox="0 0 24 24" className="h-4 w-4 text-blue-500" fill="currentColor"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Telegram</p>
                        <p className="text-xs text-gray-500">@linkedvelocity_support_bot</p>
                      </div>
                    </a>
                    <a href="mailto:info@linkedvelocity.com" className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-purple-50 hover:border-purple-200 transition-all">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 flex-shrink-0">
                        <svg viewBox="0 0 24 24" className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 4l-10 8L2 4"/></svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Email</p>
                        <p className="text-xs text-gray-500">info@linkedvelocity.com</p>
                      </div>
                    </a>
                  </div>
                </CardContent>
              </Card>

              <div className="mt-6">
                <Button size="lg" className="w-full" onClick={() => setStep("done")}>
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* STEP 7: Done */}
          {step === "done" && (
            <div className="text-center py-8">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Start Getting Paid</h2>
              <p className="mt-4 text-lg text-gray-600">
                Once your account is approved, you&apos;ll start getting paid on the 1st of every month.
              </p>

              <Card className="mt-6 text-left">
                <CardContent className="py-6">
                  <h3 className="font-semibold text-gray-900 mb-4">How you get paid</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 flex-shrink-0 mt-0.5">
                        <svg className="h-3.5 w-3.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Paid monthly on the 1st</p>
                        <p className="text-sm text-gray-500">Your agreed amount is paid on the 1st of every month, directly to your preferred payment method.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 flex-shrink-0 mt-0.5">
                        <svg className="h-3.5 w-3.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Multiple payment options</p>
                        <p className="text-sm text-gray-500">Receive payment via USDC directly into your LinkedVelocity wallet, or if you prefer an alternative method, our team can accommodate — just let us know.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 flex-shrink-0 mt-0.5">
                        <svg className="h-3.5 w-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Cancel anytime</p>
                        <p className="text-sm text-gray-500">You can withdraw your account at any time with 30 days notice.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="mt-6">
                <a href="/dashboard" className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-8 py-3 text-center font-semibold text-white hover:bg-blue-700 transition-colors">
                  Go to Dashboard
                </a>
              </div>
            </div>
          )}
        </div>
      </section>
      )}

      {/* FAQ — only on step 1 */}
      {step === "info" && (
        <section className="bg-white py-20">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="text-center text-3xl font-bold text-gray-900">Common Questions</h2>
            <div className="mt-12 space-y-8">
              {[
                { q: "Is my account safe?", a: "Yes. Your account is accessed through a secure, isolated browser profile with its own fingerprint and proxy. It looks like normal usage to LinkedIn." },
                { q: "Do I lose access to my own account?", a: "No. Both you and the renter have access to the account at any time through our proprietary software. You can see what they're using it for and who they're messaging. You don't lose access to anything." },
                { q: "How do I get paid?", a: "We offer several payment options: bank transfer to a bank of your choice, PayPal, Wise, or USDC. We pay out on the 1st of every month." },
                { q: "Can I stop at any time?", a: "Yes. You can withdraw your account anytime — just change your password or remove it. You won't be paid for the following month, and we'd appreciate a heads up, but it's completely up to you. You always have full access to your account, just like anybody else." },
              ].map((faq) => (
                <div key={faq.q}>
                  <h3 className="text-lg font-semibold text-gray-900">{faq.q}</h3>
                  <p className="mt-2 text-gray-600">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
