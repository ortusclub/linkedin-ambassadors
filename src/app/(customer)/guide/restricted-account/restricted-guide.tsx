"use client";
import { useEffect, useState } from "react";
import styles from "../primary-email/primary-email.module.css";
const BOOK = "https://calendly.com/linkedvelocity-info/30min";
export default function Guide() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [token, setToken] = useState("");
  const [verification, setVerification] = useState("");
  const [verified, setVerified] = useState(false);
  const [result, setResult] = useState<{code:string;expiresAt:number;address:string} | null>(null);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  async function act(action: "start" | "verify" | "code") {
    setBusy(true); setError(""); setMessage(""); setResult(null);
    if (action === "start") { setVerified(false); setToken(""); setVerification(""); }
    try {
      const response = await fetch("/api/account-recovery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action === "start" ? { action, email, consent } : { action, token, ...(action === "verify" ? { code: verification } : {}) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Please try again.");
      if (action === "start") { setToken(data.token); setMessage(data.message); }
      else { setVerified(true); setResult(data); setNow(Date.now()); }
    } catch (err) { setError(err instanceof Error ? err.message : "Please try again."); }
    finally { setBusy(false); }
  }
  return <main className={styles.page}>
    <section className={styles.card}><p>LINKEDVELOCITY · ACCOUNT HELP</p><h1 style={{fontSize:"clamp(30px, 6vw, 48px)",lineHeight:1.2,fontWeight:800}}>Recover your restricted LinkedIn account</h1><p>The account owner needs to complete LinkedIn’s recovery process. A referral partner can help with these instructions, but the owner must complete any identity check.</p></section>
    <section className={styles.card}><h2>1. Sign in to your account</h2><p>Open <a href="https://www.linkedin.com/login">LinkedIn’s sign-in page</a> or its official app. Use your original email and existing password if that email is still attached and the password has not changed. You can also use the LV email listed in our message if it remains attached.</p><p>If LinkedIn asks for 2FA, use your authenticator or the verified-owner code tool below. If your password no longer works, follow LinkedIn’s password recovery instructions.</p></section>
    <section className={styles.card}><h2>2. Follow the restriction notice</h2><p>Read the instructions LinkedIn displays. Complete the recovery or review steps offered there. If you are asked to verify your identity, continue through LinkedIn’s official verification flow.</p></section>
    <section className={styles.card}><h2>3. Complete identity verification if requested</h2><p>LinkedIn may use Persona to verify the owner’s identity. Follow the prompts, use your phone if instructed, and provide the requested valid ID and photo directly in that flow. Do not send identity documents to LinkedVelocity.</p><p><a href="https://www.linkedin.com/help/linkedin/answer/a1339720">LinkedIn’s official identity recovery tutorial →</a></p><p>Follow the status and next steps LinkedIn provides. If you cannot access your email or complete the flow, see <a href="https://www.linkedin.com/help/linkedin/answer/a1376104">LinkedIn’s account recovery help</a> or book a call below. Recovery depends on LinkedIn’s review.</p></section>
    <section className={styles.card}><h2>4. Tell us when the restriction is cleared</h2><p>Reply to our email or message us. Our team will test account access. Once we confirm access is restored, your monthly LinkedVelocity payments will resume.</p></section>
    <section id="sign-in-code" className={`${styles.card} ${styles.form}`}><h2>Need a LinkedIn sign-in code?</h2><p>Verify the personal email we have saved for you as the account owner. Codes are available only for your matched account and for 10 minutes after verification. A referral partner should ask the owner to complete this step.</p>
      <label>Personal email<input type="email" autoComplete="email" value={email} disabled={!!token} onChange={e=>setEmail(e.target.value)} /></label>
      <label className={styles.check}><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} disabled={!!token} />I own this LinkedIn account and want a sign-in code.</label>
      <button disabled={busy || !consent || !email} onClick={()=>void act("start")}>{token ? "Send a new email verification code" : "Verify my personal email"}</button>
      {token && !verified && <><label>Six-digit code sent to your personal inbox<input inputMode="numeric" autoComplete="one-time-code" value={verification} maxLength={6} onChange={e=>setVerification(e.target.value.replace(/\D/g,""))} /></label><button disabled={busy || verification.length!==6} onClick={()=>void act("verify")}>Verify email and show LinkedIn code</button></>}
      {verified && <button disabled={busy} onClick={()=>void act("code")}>Get current LinkedIn code</button>}
      {result && <div className={styles.notice} role="status"><p>LinkedIn account: {result.address}</p>{result.expiresAt > now ? <><strong style={{fontSize:36,letterSpacing:6}}>{result.code}</strong><p>Enter this on LinkedIn. Expires in {Math.ceil((result.expiresAt-now)/1000)} seconds.</p></> : <p>This code has expired. Get a current code above.</p>}</div>}
      {message && <p role="status" className={styles.notice}>{message}</p>}{error && <p role="alert" className={styles.error}>{error}</p>}
      {token && <button disabled={busy} onClick={()=>{setToken("");setVerified(false);setResult(null);setVerification("");setError("");setMessage("");}}>Use another personal email</button>}
      <p>No matching account, no saved key, or no access to your inbox? <a href={BOOK}>Book a help call</a>. The stored setup key is never displayed here.</p>
    </section>
    <section className={styles.help}><h2>Option 2: Resolve it together</h2><p>Book a call with our team and we will help you follow the recovery steps.</p><a href={BOOK}>Book a help call →</a></section>
  </main>;
}
