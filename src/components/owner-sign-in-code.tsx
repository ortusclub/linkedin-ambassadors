"use client";
import { useEffect, useState } from "react";
import styles from "@/app/(customer)/guide/primary-email/primary-email.module.css";
const BOOK = "https://calendly.com/linkedvelocity-info/30min";
export default function OwnerSignInCode() {
  const [loginEmail, setLoginEmail] = useState("");
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
      const response = await fetch("/api/account-recovery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action === "start" ? { action, email, consent } : { action, token, loginEmail, ...(action === "verify" ? { code: verification } : {}) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Please try again.");
      if (action === "start") { setToken(data.token); setMessage(data.message); }
      else { setVerified(true); setResult(data); setNow(Date.now()); }
    } catch (err) { setError(err instanceof Error ? err.message : "Please try again."); }
    finally { setBusy(false); }
  }
  return (
    <section id="sign-in-code" className={`${styles.card} ${styles.form}`}><h2>Need a LinkedIn sign-in code?</h2><p>Enter the LinkedVelocity login email for your LinkedIn account, then verify your saved personal email. Codes are available only for your matched account and for 10 minutes after verification. A referral partner should ask the owner to complete this step.</p>
      <label>LinkedIn login email<input type="email" autoComplete="off" value={loginEmail} disabled={!!token} onChange={e=>setLoginEmail(e.target.value)} /></label>
      <label>Personal email<input type="email" autoComplete="email" value={email} disabled={!!token} onChange={e=>setEmail(e.target.value)} /></label>
      <label className={styles.check}><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} disabled={!!token} />I own this LinkedIn account and want a sign-in code.</label>
      <button disabled={busy || !consent || !email || !loginEmail} onClick={()=>void act("start")}>{token ? "Send a new email verification code" : "Verify my personal email"}</button>
      {token && !verified && <><label>Six-digit code sent to your personal inbox<input inputMode="numeric" autoComplete="one-time-code" value={verification} maxLength={6} onChange={e=>setVerification(e.target.value.replace(/\D/g,""))} /></label><button disabled={busy || verification.length!==6} onClick={()=>void act("verify")}>Verify email and show LinkedIn code</button></>}
      {verified && <button disabled={busy} onClick={()=>void act("code")}>Get current LinkedIn code</button>}
      {result && <div className={styles.notice} role="status"><p>LinkedIn account: {result.address}</p>{result.expiresAt > now ? <><strong style={{fontSize:36,letterSpacing:6}}>{result.code}</strong><p>Enter this on LinkedIn. Expires in {Math.ceil((result.expiresAt-now)/1000)} seconds.</p></> : <p>This code has expired. Get a current code above.</p>}</div>}
      {message && <p role="status" className={styles.notice}>{message}</p>}{error && <p role="alert" className={styles.error}>{error}</p>}
      {token && <button disabled={busy} onClick={()=>{setToken("");setVerified(false);setResult(null);setVerification("");setError("");setMessage("");}}>Start again</button>}
      <p>No matching account, no saved key, or no access to your inbox? <a href={BOOK}>Book a help call</a>. The stored setup key is never displayed here.</p>
    </section>
  );
}
