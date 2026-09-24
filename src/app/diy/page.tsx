"use client";

import { useState } from "react";

// Public DIY landing page — post it anywhere, no referrer needed. Presents the three
// self-onboarding tiers (sign-on bonus scales with how much the owner does themselves;
// monthly stays the same) and captures the signup + chosen tier, attributed to the
// hidden "diy" system referrer. Stage 1: capture + book a call. The live self-onboarding
// wizard (Full/Partial DIY) is wired in Stage 2 behind an email/phone verification gate.

const CALENDAR_URL = "https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ1he_qAS5s8faJzrAIjTJi8KIX9xvPhGbC4Ipn38lPTLzkfSuoyMIiqUrB0viY2jpXr_W_zLSdq";

type Tier = "standard" | "partial" | "full";

const TIERS: {
  id: Tier; name: string; php: number; usd: number; who: string; delay: string; highlight?: boolean;
}[] = [
  { id: "standard", name: "We set it up", php: 1000, usd: 16, who: "Our team does everything — you just share your account.", delay: "Onboarding takes a little longer (there's a queue)." },
  { id: "partial", name: "You add email + 2FA", php: 1500, usd: 24, who: "You add our secure email and set up 2FA. We do the GoLogin step.", delay: "Faster — most of the wait is skipped." },
  { id: "full", name: "Full DIY", php: 2000, usd: 32, who: "You do it all yourself — email, 2FA and the GoLogin sign-in.", delay: "Zero delays — you're live straight away.", highlight: true },
];

const peso = (n: number) => "₱" + n.toLocaleString("en-US");

export default function DIYPage() {
  const [tier, setTier] = useState<Tier>("full");
  const [form, setForm] = useState({ fullName: "", email: "", contactHandle: "", linkedinUrl: "" });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const update = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    setError("");
    if (!form.fullName.trim() || !form.email.trim() || !form.contactHandle.trim()) {
      setError("Please add your name, email and a contact number so we can reach you.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/ambassador/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          contactNumber: form.contactHandle.trim(),
          linkedinUrl: form.linkedinUrl.trim() || undefined,
          referredBy: "diy",
          referralSource: "DIY page",
          diyTier: tier,
        }),
      });
      if (!res.ok) throw new Error("apply failed");
      setDone(true);
    } catch {
      setError("Something went wrong — please try again, or message us.");
    } finally {
      setSubmitting(false);
    }
  };

  const chosen = TIERS.find((t) => t.id === tier)!;

  const inp: React.CSSProperties = { width: "100%", fontFamily: "'Inter',sans-serif", fontSize: 15, color: "#0B1220", background: "#fff", border: "1px solid #DCE3DE", borderRadius: 11, padding: "13px 14px", outline: "none", boxSizing: "border-box" };
  const label: React.CSSProperties = { display: "block", fontSize: 13.5, fontWeight: 600, color: "#37424F", margin: "0 0 7px" };

  return (
    <main style={{ minHeight: "100dvh", background: "#F6F8F7", fontFamily: "'Inter',sans-serif", color: "#0B1220" }}>
      <div style={{ maxWidth: 940, margin: "0 auto", padding: "44px 18px 80px" }}>
        {/* Hero */}
        <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 34px" }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "#00A150", marginBottom: 12 }}>Earn from your LinkedIn</div>
          <h1 style={{ fontFamily: "'Poppins','Inter',sans-serif", fontWeight: 700, fontSize: "clamp(28px,5vw,42px)", letterSpacing: "-0.03em", lineHeight: 1.1, margin: "0 0 14px" }}>Get paid monthly for your LinkedIn account</h1>
          <p style={{ fontSize: 17, lineHeight: 1.55, color: "#5A6473", margin: 0 }}>
            <strong style={{ color: "#0B1220" }}>{peso(500)}/month</strong> for every month your account stays active, plus a one-time sign-on bonus.
            The more of the quick setup you do yourself, the bigger your bonus — and the faster you go live.
          </p>
        </div>

        {done ? (
          <div style={{ maxWidth: 520, margin: "0 auto", background: "#0D2A1C", borderRadius: 20, padding: "34px 30px", textAlign: "center", color: "#fff" }}>
            <div style={{ fontSize: 34, marginBottom: 10 }}>✓</div>
            <h2 style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: 24, margin: "0 0 10px" }}>You&apos;re in, {form.fullName.split(" ")[0]}!</h2>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: "#B7D4C4", margin: "0 0 22px" }}>
              You chose <strong style={{ color: "#fff" }}>{chosen.name}</strong> — {peso(chosen.php)} sign-on bonus + {peso(500)}/month. We&apos;ll send your next steps to <strong style={{ color: "#fff" }}>{form.email}</strong>. Book a quick call to get started fast:
            </p>
            <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", background: "#00B85C", color: "#fff", fontSize: 16, fontWeight: 600, padding: "14px 28px", borderRadius: 13, textDecoration: "none" }}>Book my onboarding call →</a>
          </div>
        ) : (
          <>
            {/* Tier cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 16, marginBottom: 34 }}>
              {TIERS.map((t) => {
                const active = t.id === tier;
                return (
                  <button key={t.id} onClick={() => setTier(t.id)} style={{ textAlign: "left", cursor: "pointer", background: active ? "#0D2A1C" : "#fff", border: `2px solid ${active ? "#00B85C" : "#E6E8EC"}`, borderRadius: 18, padding: "20px 20px 22px", transition: "all .15s", position: "relative" }}>
                    {t.highlight && <span style={{ position: "absolute", top: -11, right: 16, background: "#00B85C", color: "#fff", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "4px 9px", borderRadius: 6 }}>Biggest bonus</span>}
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: active ? "#6EE7B7" : "#00A150", marginBottom: 10 }}>{t.name}</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginBottom: 3 }}>
                      <span style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 800, fontSize: 30, color: active ? "#fff" : "#0B1220" }}>{peso(t.php)}</span>
                      <span style={{ fontSize: 13, color: active ? "#9DC4AE" : "#8A93A2" }}>~${t.usd}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: active ? "#9DC4AE" : "#8A93A2", marginBottom: 14 }}>sign-on bonus · then {peso(500)}/mo</div>
                    <div style={{ fontSize: 13, lineHeight: 1.5, color: active ? "#D6E7DD" : "#37424F", marginBottom: 10 }}>{t.who}</div>
                    <div style={{ fontSize: 12.5, lineHeight: 1.45, fontWeight: 600, color: t.id === "full" ? (active ? "#6EE7B7" : "#00A150") : (active ? "#9DC4AE" : "#8A93A2") }}>{t.delay}</div>
                  </button>
                );
              })}
            </div>

            {/* Signup */}
            <div style={{ maxWidth: 560, margin: "0 auto", background: "#fff", border: "1px solid #E6E8EC", borderRadius: 20, padding: "28px 28px 30px", boxShadow: "0 6px 20px rgba(16,24,40,0.05)" }}>
              <div style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: 19, marginBottom: 4 }}>Sign up — {chosen.name}</div>
              <p style={{ fontSize: 13.5, color: "#5A6473", margin: "0 0 20px" }}>{peso(chosen.php)} sign-on + {peso(500)}/month. {chosen.delay}</p>

              <div style={{ marginBottom: 14 }}>
                <label style={label}>Your name *</label>
                <input style={inp} value={form.fullName} onChange={(e) => update("fullName", e.target.value)} placeholder="Full name" />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={label}>Email *</label>
                <input style={inp} type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@example.com" />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={label}>Contact number (WhatsApp) *</label>
                <input style={inp} value={form.contactHandle} onChange={(e) => update("contactHandle", e.target.value)} placeholder="+63…" />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={label}>LinkedIn profile URL <span style={{ fontWeight: 400, color: "#96A0AD" }}>(optional)</span></label>
                <input style={inp} value={form.linkedinUrl} onChange={(e) => update("linkedinUrl", e.target.value)} placeholder="linkedin.com/in/yourprofile" />
              </div>

              {error && <div style={{ fontSize: 13.5, color: "#C0392B", marginBottom: 14 }}>{error}</div>}

              <button onClick={submit} disabled={submitting} style={{ width: "100%", background: submitting ? "#8FD9B4" : "#00B85C", color: "#fff", fontSize: 16, fontWeight: 600, border: "none", borderRadius: 12, padding: 15, cursor: submitting ? "not-allowed" : "pointer" }}>
                {submitting ? "Sending…" : `Sign up for ${peso(chosen.php)} + ${peso(500)}/mo →`}
              </button>
              <div style={{ textAlign: "center", fontSize: 12.5, color: "#8A93A2", marginTop: 12 }}>Consent-based · you keep full control · cancel anytime</div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
