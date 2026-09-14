"use client";
import { useState } from "react";
import styles from "./wizard.module.css";

export type EmailSetup = {
  configured: boolean; domains: string[]; address: string | null; destination: string | null;
  destinationVerified: boolean; verificationCodePending: boolean; primaryConfirmed: boolean; forwardingActive: boolean;
  forwardingUntil: string | null; lastForwardedAt: string | null;
};

export default function EmailStep({ setup, busy, submit }: {
  setup: EmailSetup; busy: boolean; submit: (body: unknown) => Promise<void>;
}) {
  const [destination, setDestination] = useState(setup.destination || "");
  const [consent, setConsent] = useState(false);
  const [code, setCode] = useState("");
  const [primary, setPrimary] = useState(false);
  return <>
    <h2>First, add a LinkedVelocity email to LinkedIn</h2>
    <p>The account owner must add the assigned LinkedVelocity email to their account and make it the primary email. They should do this from LinkedIn on their usual device or existing browser. The protected GoLogin browser comes afterwards.</p>
    {!setup.forwardingActive && <div className={styles.emailPlan}>
      <strong>How this step works</strong>
      <ol>
        <li>Verify a forwarding inbox below so you can receive the email confirmation from LinkedIn.</li>
        <li>We&apos;ll assign the owner their new LinkedVelocity email address.</li>
        <li>On LinkedIn, the owner opens <b>Me → Settings &amp; Privacy → Sign in &amp; security → Email addresses</b>.</li>
        <li>They select <b>Add email address</b> and enter the assigned LinkedVelocity email.</li>
        <li>LinkedIn may ask the owner to enter their password, receive another code, or complete an identity check. The owner must complete this themselves.</li>
        <li>After confirming the new address, they make it the <b>primary email</b> on the account.</li>
      </ol>
    </div>}
    {!setup.configured ? <div className={styles.note}>Email receiving is not live yet. Your progress is saved; the team must finish configuring and testing the domains before you add an address to LinkedIn.</div> : <>
      {!setup.forwardingActive && <form onSubmit={e => { e.preventDefault(); void submit({ action: "start", destination, consent }); }}>
        <div className={styles.note}>{setup.address ? <>Assigned LinkedIn email: <strong>{setup.address}</strong></> : <>We&apos;ll automatically assign an email using the owner&apos;s first and last name. If it&apos;s already taken, we&apos;ll add a small number to make it unique.</>}</div>
        <label className={styles.field}>Where should onboarding messages be forwarded?<input type="email" required maxLength={254} value={destination} disabled={setup.destinationVerified} onChange={e => setDestination(e.target.value)} /></label>
        <p className={styles.hint}>Use an inbox you can open now. We will verify it before forwarding account messages.</p>
        <label className={styles.check}><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><span>The owner agrees to use a service-managed primary email and understands that it affects sign-in and recovery. They authorize forwarding onboarding messages to this inbox for one hour or until onboarding finishes, whichever comes first.</span></label>
        <button className={styles.primary} disabled={busy || !consent}>{setup.destinationVerified ? "Start this email step again" : setup.verificationCodePending ? "Send a new forwarding code" : "Verify forwarding inbox →"}</button>
      </form>}
      {setup.address && setup.verificationCodePending && !setup.forwardingActive && <form onSubmit={e => { e.preventDefault(); void submit({ action: "verify", code }); }}>
        <label className={styles.field}>Six-digit code sent to {setup.destination}<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value)} /></label>
        <button className={styles.primary} disabled={busy || code.length !== 6}>Confirm forwarding inbox</button>
        {setup.destinationVerified && <p className={styles.hint}>Forwarding expired. Verify your inbox again before requesting more LinkedIn messages.</p>}
      </form>}
      {setup.forwardingActive && <>
        <div className={styles.note}>New LinkedIn email: <strong>{setup.address}</strong><br />Forwarding to: {setup.destination}<br />Active until {setup.forwardingUntil && new Date(setup.forwardingUntil).toLocaleTimeString()} or onboarding completion.</div>
        <ol className={styles.instructions}>
          <li>On the owner&apos;s usual LinkedIn session, open <strong>Me → Settings &amp; Privacy</strong>.</li>
          <li>Select <strong>Sign in &amp; security → Email addresses → Add email address</strong>.</li>
          <li>Enter <strong>{setup.address}</strong>. If LinkedIn asks for a password, code or identity check, the owner completes it themselves.</li>
          <li>Open the LinkedIn verification message forwarded to <strong>{setup.destination}</strong> and confirm the new address.</li>
          <li>Return to LinkedIn, make the LinkedVelocity address <strong>primary</strong>, and check that it is labelled as primary before continuing.</li>
        </ol>
        {setup.lastForwardedAt && <p role="status">A LinkedIn verification message has been forwarded. Complete the confirmation in LinkedIn, then make the address primary.</p>}
        <label className={styles.check}><input type="checkbox" checked={primary} onChange={e => setPrimary(e.target.checked)} /><span>The owner verified this address and I can see it marked as primary in LinkedIn. The owner agrees to continue.</span></label>
        <button className={styles.primary} disabled={busy || !primary || !setup.lastForwardedAt} onClick={() => void submit({ action: "primary", consent: true })}>Email is primary — continue to GoLogin →</button>
      </>}
    </>}
    {setup.forwardingActive && <button className={styles.secondary} disabled={busy} onClick={() => void submit({ action: "restart", consent: true })}>Start again with a new email</button>}
    <p className={styles.hint}>Only change the primary email with the owner&apos;s informed agreement. If anything is unclear, pause and contact the team.</p>
  </>;
}
