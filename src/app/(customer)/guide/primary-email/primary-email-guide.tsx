"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import styles from "./primary-email.module.css";

type Session = { forwardingAvailable: boolean; address: string; destination: string; forwardingUntil: string; lastForwardedAt: string | null };
const BOOK = "https://calendly.com/linkedvelocity-info/30min";
const STORAGE = "lv-primary-email-recovery";
export default function PrimaryEmailGuide() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [consent, setConsent] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState<number[]>([]);
  async function request(body: unknown) {
    const res = await fetch("/api/primary-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Please try again.");
    return data;
  }
  useEffect(() => {
    let active = true;
    let stored: string | null = null;
    try { stored = sessionStorage.getItem(STORAGE); } catch { /* storage unavailable */ }
    if (stored) request({ action: "status", token: stored }).then(data => { if (active) { setToken(stored); setSession(data); } }).catch(() => { try { sessionStorage.removeItem(STORAGE); } catch { /* storage unavailable */ } });
    return () => { active = false; };
  }, []);
  async function act(action: "start" | "verify" | "status" | "complete") {
    setBusy(true); setError(""); setMessage("");
    try {
      const data = await request(action === "start" ? { action, email, consent } : action === "verify" ? { action, token, code } : { action, token, confirmed });
      if (action === "start") { setToken(data.token); setCode(""); setMessage(data.message); }
      else if (action === "complete") { setCompleted(true); setSession(null); try { sessionStorage.removeItem(STORAGE); } catch { /* storage unavailable */ } }
      else { setSession(data); try { sessionStorage.setItem(STORAGE, token); } catch { /* current session still works */ } if (action === "status") setMessage(data.lastForwardedAt ? "LinkedIn’s confirmation has been sent to your personal inbox. Check spam too." : "No email-address confirmation received yet. Request it from LinkedIn, then check again in a moment."); }
    } catch (e) { setError(e instanceof Error ? e.message : "Please try again."); }
    finally { setBusy(false); }
  }
  const toggle = (n: number) => setDone(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]);
  return <div className={styles.page}>
    <header className={styles.header}><a href="/">LinkedVelocity</a><span>ACCOUNT SETUP GUIDE</span></header>
    <section className={styles.hero}>
      <span className={styles.eyebrow}>YOUR ACCOUNT. A FEW SIMPLE STEPS.</span>
      <h1>Let’s set your<br /><em>primary email.</em></h1>
      <p>Add or restore your assigned LinkedVelocity email, verify it, and make it primary. Keep your personal email on the account too.</p>
      <div className={styles.tags}><span>✓ Phone or computer</span><span>✓ About 5 minutes</span><span>✓ Guided, step by step</span></div>
    </section>
    <section className={styles.card} aria-labelledby="verify-title">
      <div className={styles.sectionLabel}>01 / VERIFY IT’S YOU</div>
      <h2 id="verify-title">Start with your personal inbox</h2>
      <p>Use the personal contact email you gave us when you joined. Once verified, we’ll show your assigned LV email. For addresses on our confirmation-forwarding service, we’ll send LinkedIn’s email-address confirmation to your personal inbox for the next 30 minutes.</p>
      {!session && !completed && <>
        <form onSubmit={e => { e.preventDefault(); void act("start"); }} className={styles.form}>
          <label>Personal email<input type="email" autoComplete="email" required value={email} onChange={e => { setEmail(e.target.value); setToken(""); }} placeholder="you@example.com" disabled={busy} /></label>
          <label className={styles.check}><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} required />I own this account and want its LV email confirmation sent to my verified personal inbox.</label>
          <button disabled={busy || !consent}>{busy ? "Please wait…" : token ? "Send a new code" : "Send verification code"}</button>
        </form>
        {token && <form onSubmit={e => { e.preventDefault(); void act("verify"); }} className={styles.form}>
          <label>Six-digit code from LinkedVelocity<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} placeholder="000000" /></label>
          <button disabled={busy || code.length !== 6}>Verify my email</button>
        </form>}
        <p className={styles.small}>Email changed or no code arrived? <a href={BOOK}>Book a call</a> so we can help match your account.</p>
      </>}
      {session && <div className={styles.verified}>
        <span>✓ PERSONAL EMAIL VERIFIED</span>
        <p>Your LinkedVelocity email — use this exact address:</p>
        <strong className={styles.address}>{session.address}</strong>
        <button className={styles.secondary} onClick={() => { void navigator.clipboard.writeText(session.address).then(() => setMessage("LV email copied."), () => setError("Select the email above and copy it.")); }}>Copy LV email</button>
        {session.forwardingAvailable ? <p>Confirmations go to <strong>{session.destination}</strong>. Forwarding ends at {new Date(session.forwardingUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.</p> : <p>This older email address needs our team to help with its confirmation. If it is already verified on LinkedIn, you can make it primary now. Otherwise, <a href={BOOK}>book a call</a> so we can help you confirm it.</p>}
        <button className={styles.secondary} disabled={busy || !session.forwardingAvailable} onClick={() => void act("status")}>Check for LinkedIn’s confirmation</button>
        <button className={styles.secondary} disabled={busy} onClick={() => { setEmail(session.destination); setSession(null); setToken(""); setError(""); setMessage(""); try { sessionStorage.removeItem(STORAGE); } catch { /* storage unavailable */ } }}>Verify again / restart</button>
      </div>}
      {completed && <div className={styles.verified}><h3>Thanks — your confirmation is saved.</h3><p>Our team will check access. Payments resume once the issue is resolved and access is confirmed.</p></div>}
      {message && <p role="status" className={styles.notice}>{message}</p>}
      {error && <p role="alert" className={styles.error}>{error}</p>}
    </section>
    <div className={styles.sectionLabel}>02 / FOLLOW ALONG ON LINKEDIN · {done.length} OF 5 CHECKED</div>
    <div className={styles.progress}><span style={{ width: `${done.length * 20}%` }} /></div>
    {[
      { title: "Open Settings & Privacy", body: "Sign in to LinkedIn. On a computer, click Me (your photo), then Settings & Privacy. In the app, tap your photo, then Settings.", image: "/images/guide/2fa/step-1.png", alt: "LinkedIn Me menu and Settings & Privacy" },
      { title: "Find Email addresses", body: "Choose Sign in & security, then Email addresses under Account access.", image: "/images/guide/2fa/step-2.png", alt: "LinkedIn Sign in & security menu" },
      { title: "Add your assigned LV email", body: `Look for ${session?.address || "the exact LinkedVelocity address shown after you verify your personal email above"}. If it is missing, choose Add email address and enter it. If it is already verified, move to step 5. Keep your personal email listed too.` },
      { title: "Confirm the LV email", body: session && !session.forwardingAvailable ? "If this email is not already verified, book a call using the link below so our team can help with the confirmation. Once verified, continue to Make primary." : "Ask LinkedIn to send its confirmation. We’ll forward that email-address confirmation to your verified personal inbox during the 30-minute window. Open the link or enter the code on LinkedIn. Check spam, and use the check button above if it hasn’t arrived. Other login, password-reset, and 2FA codes are not forwarded by this guide." },
      { title: "Make it primary", body: "Next to your verified LV email, choose Make primary. Complete any confirmation LinkedIn asks for, then check that Primary appears beside that exact address.", image: "/images/onboarding/linkedin-make-primary.png", alt: "Make primary option beside a LinkedIn email address" },
    ].map((step, i) => <section key={step.title} className={styles.card}>
      <div className={styles.stepTitle}><span>{String(i + 1).padStart(2, "0")}</span><h2>{step.title}</h2></div>
      <p>{step.body}</p>
      {step.image && <div className={styles.image}><Image src={step.image} width={900} height={500} alt={step.alt!} style={{ width: "100%", height: "auto" }} /></div>}
      <label className={styles.check}><input type="checkbox" checked={done.includes(i)} onChange={() => toggle(i)} />I’ve completed this step</label>
    </section>)}
    {session && <section className={styles.card}>
      <h2>All set?</h2><label className={styles.check}><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />I checked that {session.address} is verified and set as primary on LinkedIn.</label>
      <button disabled={!confirmed || busy} onClick={() => void act("complete")}>I have made it primary</button>
    </section>}
    <section className={styles.help}><h2>We can do this together.</h2><p>Stuck, restricted, or unable to sign in? Book a call and we’ll walk through it with you.</p><a href={BOOK}>Book a help call →</a><p>Then check your <a href="/guide/two-step-verification">two-step verification setup →</a></p></section>
  </div>;
}
