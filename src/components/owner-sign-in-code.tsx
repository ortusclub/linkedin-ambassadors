"use client";
import { useEffect, useState } from "react";
import styles from "@/app/(customer)/guide/primary-email/primary-email.module.css";
const BOOK = "https://calendly.com/linkedvelocity-info/30min";
export default function OwnerSignInCode() {
  const [loginEmail, setLoginEmail] = useState("");
  const [access, setAccess] = useState("");
  const [ready, setReady] = useState(false);
  const [result, setResult] = useState<{code:string;expiresAt:number;address:string} | null>(null);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const fragment = window.location.hash.slice(1);
    const privateToken = /^[A-Za-z0-9_-]{22}$/.test(fragment) ? fragment : new URLSearchParams(fragment).get("access");
    if (privateToken) setAccess(privateToken);
    if (privateToken) window.history.replaceState(null, "", window.location.pathname);
    setReady(true);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  async function getCode() {
    setBusy(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/account-recovery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "private_code", access, loginEmail }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Please try again.");
      setResult(data); setNow(Date.now());
    } catch (err) { setError(err instanceof Error ? err.message : "Please try again."); }
    finally { setBusy(false); }
  }
  return <section id="sign-in-code" className={`${styles.card} ${styles.form}`}>
    <h2>Get your LinkedIn authenticator code</h2>
    <p>Open the private account link our team sent you, then enter your LinkedIn login email. No personal email or email verification is needed here. Your setup key stays hidden.</p>
    {ready && !access && <p className={styles.notice}>Open the private code link in your message from LinkedVelocity. If you need a new link, reply to our team or <a href={BOOK}>book a help call</a>.</p>}
    <label>LinkedIn login email<input type="email" autoComplete="off" value={loginEmail} onChange={e=>{setLoginEmail(e.target.value);setResult(null);}} /></label>
    <button disabled={busy || !access || !loginEmail} onClick={()=>void getCode()}>{busy ? "Getting code…" : "Get six-digit code"}</button>
    {result && <div className={styles.notice} role="status"><p>LinkedIn account: {result.address}</p>{result.expiresAt > now ? <><strong style={{fontSize:36,letterSpacing:6}}>{result.code}</strong><p>Enter this on LinkedIn. Expires in {Math.ceil((result.expiresAt-now)/1000)} seconds.</p></> : <p>This code has expired. Get a new code above.</p>}</div>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <p>Private links expire after 24 hours. Codes are disabled while an account is rented, available or on trial. If you refresh this page, reopen your private link.</p>
  </section>;
}
