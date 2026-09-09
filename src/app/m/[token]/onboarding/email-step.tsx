"use client";
import { useState } from "react";
import styles from "./wizard.module.css";

export type EmailSetup = {
  configured: boolean; domains: string[]; address: string | null; destination: string | null;
  destinationVerified: boolean; primaryConfirmed: boolean; forwardingActive: boolean;
  forwardingUntil: string | null; lastForwardedAt: string | null;
};

export default function EmailStep({ setup, busy, submit, refresh }: {
  setup: EmailSetup; busy: boolean; submit: (body: unknown) => Promise<void>; refresh: () => void;
}) {
  const [destination, setDestination] = useState(setup.destination || "");
  const [consent, setConsent] = useState(false);
  const [code, setCode] = useState("");
  const [primary, setPrimary] = useState(false);
  return <>
    <h2>Set up their LinkedIn email</h2>
    <p>The owner first adds the new address using LinkedIn on their own device or existing browser. GoLogin comes next.</p>
    {!setup.configured ? <div className={styles.note}>Email receiving is not live yet. Your progress is saved; the team must finish configuring and testing the domains before you add an address to LinkedIn.</div> : <>
      {!setup.forwardingActive && <form onSubmit={e => { e.preventDefault(); void submit({ action: "start", destination, consent }); }}>
        <div className={styles.note}>{setup.address ? <>Assigned LinkedIn email: <strong>{setup.address}</strong></> : <>We&apos;ll automatically assign an email using the owner&apos;s first and last name. If it&apos;s already taken, we&apos;ll add a small number to make it unique.</>}</div>
        <label className={styles.field}>Where should onboarding messages be forwarded?<input type="email" required maxLength={254} value={destination} disabled={setup.destinationVerified} onChange={e => setDestination(e.target.value)} /></label>
        <p className={styles.hint}>Use an inbox you can open now. We will verify it before forwarding account messages.</p>
        <label className={styles.check}><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><span>The owner agrees to use a service-managed primary email and understands that it affects sign-in and recovery. They authorize forwarding onboarding messages to this inbox for one hour or until onboarding finishes, whichever comes first.</span></label>
        <button className={styles.primary} disabled={busy || !consent}>{setup.address ? "Send a new verification code" : "Verify forwarding inbox →"}</button>
      </form>}
      {setup.address && !setup.forwardingActive && <form onSubmit={e => { e.preventDefault(); void submit({ action: "verify", code }); }}>
        <label className={styles.field}>Six-digit code sent to {setup.destination}<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value)} /></label>
        <button className={styles.primary} disabled={busy || code.length !== 6}>Confirm forwarding inbox</button>
        {setup.destinationVerified && <p className={styles.hint}>Forwarding expired. Verify your inbox again before requesting more LinkedIn messages.</p>}
      </form>}
      {setup.forwardingActive && <>
        <div className={styles.note}>New LinkedIn email: <strong>{setup.address}</strong><br />Forwarding to: {setup.destination}<br />Active until {setup.forwardingUntil && new Date(setup.forwardingUntil).toLocaleTimeString()} or onboarding completion.</div>
        <ol className={styles.instructions}>
          <li>The owner opens LinkedIn settings on their usual device and finds email addresses under sign-in and security.</li>
          <li>Add the new address above. Keep the owner&apos;s existing email as a recovery option.</li>
          <li>Open the verification message forwarded to your inbox. The owner completes verification themselves. Never paste their password here.</li>
          <li>Make the new address primary and check that LinkedIn shows it as primary.</li>
        </ol>
        <p role="status">{setup.lastForwardedAt ? "A LinkedIn message has been forwarded. This does not yet confirm the address is primary." : "Waiting for the LinkedIn message. Request it on LinkedIn, then refresh below."}</p>
        <label className={styles.check}><input type="checkbox" checked={primary} onChange={e => setPrimary(e.target.checked)} /><span>The owner verified this address and I can see it marked as primary in LinkedIn. The owner agrees to continue.</span></label>
        <button className={styles.primary} disabled={busy || !primary || !setup.lastForwardedAt} onClick={() => void submit({ action: "primary", consent: true })}>Email is primary — continue to GoLogin →</button>
      </>}
    </>}
    <button className={styles.secondary} disabled={busy} onClick={refresh}>Refresh email progress</button>
    <p className={styles.hint}>Only change the primary email with the owner&apos;s informed agreement. If anything is unclear, pause and contact the team.</p>
  </>;
}
