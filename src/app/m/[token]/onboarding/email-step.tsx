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
    <h2>Set up the account&apos;s login email</h2>
    <p>LinkedVelocity adds its own email to the account and makes it the main (primary) one, so LinkedIn&apos;s security codes come to us and the account stays signed in. The owner&apos;s own email stays on the account as a backup and can be made primary again at any time.</p>
    {!setup.configured ? <div className={styles.note}>Email setup is not switched on yet. Your progress is saved. The team needs to finish setting up the email domains before you can add an address to LinkedIn.</div> : <>
      {!setup.forwardingActive && <form onSubmit={e => { e.preventDefault(); void submit({ action: "start", destination, consent }); }}>
        <div className={styles.note}>{setup.address ? <>The account&apos;s new email: <strong>{setup.address}</strong></> : <>We&apos;ll create the account&apos;s email automatically from the owner&apos;s name. If that one is taken, we add a small number so it is unique.</>}</div>
        <label className={styles.field}>An inbox you can open right now<input type="email" required maxLength={254} value={destination} disabled={setup.destinationVerified} onChange={e => setDestination(e.target.value)} placeholder="you@example.com" /></label>
        <p className={styles.hint}>During setup, LinkedIn&apos;s codes go to the new account email and we forward a copy to this inbox so the owner can read them (for about an hour). We&apos;ll send a code here first to check it works.</p>
        <label className={styles.check}><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><span>The owner agrees to make this LinkedVelocity email the account&apos;s main email (this changes how they sign in and recover the account), and to have setup codes forwarded to the inbox above for up to one hour, or until setup finishes.</span></label>
        <button className={styles.primary} disabled={busy || !consent}>{setup.address ? "Send a new code" : "Send a verification code"}</button>
      </form>}
      {setup.address && !setup.forwardingActive && <form onSubmit={e => { e.preventDefault(); void submit({ action: "verify", code }); }}>
        <label className={styles.field}>Enter the 6-digit code we sent to {setup.destination}<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value)} /></label>
        <button className={styles.primary} disabled={busy || code.length !== 6}>Confirm</button>
        {setup.destinationVerified && <p className={styles.hint}>Forwarding expired. Send a new code to your inbox before requesting more LinkedIn messages.</p>}
      </form>}
      {setup.forwardingActive && <>
        <div className={styles.note}>The account&apos;s new email: <strong>{setup.address}</strong><br />Codes forwarded to: {setup.destination}<br />Forwarding active until {setup.forwardingUntil && new Date(setup.forwardingUntil).toLocaleTimeString()}, or until setup finishes.</div>
        <p>Now add this email to the owner&apos;s real LinkedIn account and make it the primary one:</p>
        <ol className={styles.instructions}>
          <li>On the owner&apos;s usual device, open LinkedIn and go to <strong>Settings → Sign in &amp; security → Email addresses</strong>.</li>
          <li>Choose <strong>Add email address</strong> and enter the new email shown above. Leave the owner&apos;s own email on the account as a backup.</li>
          <li>LinkedIn sends a confirmation to that new email. It is forwarded to the inbox above, so open it there, then finish confirming back on LinkedIn. The owner does this themselves. Never type their password on this page.</li>
          <li>Set the new email as the <strong>primary</strong> email, and check that LinkedIn shows it as primary.</li>
        </ol>
        <p role="status">{setup.lastForwardedAt ? "We received a forwarded LinkedIn message. That does not confirm it is primary yet, so tick the box below once LinkedIn shows the new email as primary." : "Waiting for LinkedIn&apos;s confirmation email. Do steps 1 and 2 on LinkedIn, then click Refresh below."}</p>
        <label className={styles.check}><input type="checkbox" checked={primary} onChange={e => setPrimary(e.target.checked)} /><span>The new email is confirmed and shows as primary in LinkedIn. The owner agrees to continue.</span></label>
        <button className={styles.primary} disabled={busy || !primary || !setup.lastForwardedAt} onClick={() => void submit({ action: "primary", consent: true })}>Done, continue to browser setup →</button>
      </>}
    </>}
    <button className={styles.secondary} disabled={busy} onClick={refresh}>Refresh</button>
    <p className={styles.hint}>Only change the primary email with the owner&apos;s clear agreement. If anything is unclear, pause and contact the team.</p>
  </>;
}
