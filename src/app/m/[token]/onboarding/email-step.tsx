"use client";
import { useState } from "react";
import styles from "./wizard.module.css";

export type EmailSetup = {
  configured: boolean; domains: string[]; address: string | null; destination: string | null;
  destinationVerified: boolean; primaryConfirmed: boolean; forwardingActive: boolean;
  forwardingUntil: string | null; lastForwardedAt: string | null;
};

export default function EmailStep({ setup, busy, submit, refresh, ownerEmail }: {
  setup: EmailSetup; busy: boolean; submit: (body: unknown) => Promise<void>; refresh: () => void; ownerEmail?: string;
}) {
  const [destination, setDestination] = useState(setup.destination || ownerEmail || "");
  const [consent, setConsent] = useState(false);
  const [code, setCode] = useState("");
  const [primary, setPrimary] = useState(false);
  return <>
    <h2>Set up the account&apos;s login email</h2>
    <p>LinkedVelocity adds its own email to the account and makes it the main (primary) one, so LinkedIn&apos;s security codes come to us and the account stays signed in. The owner&apos;s own email stays on the account as a backup and can be made primary again at any time.</p>
    {!setup.configured ? <div className={styles.note}>Email setup is not switched on yet. Your progress is saved. The team needs to finish setting up the email domains before you can add an address to LinkedIn.</div> : <>
      {!setup.forwardingActive && <form onSubmit={e => { e.preventDefault(); void submit({ action: "start", destination, consent }); }}>
        <div className={styles.note}>{setup.address ? <>The account&apos;s new email: <strong>{setup.address}</strong></> : <>We&apos;ll create a company login email for the account from the owner&apos;s name. The owner adds it on LinkedIn, and we forward LinkedIn&apos;s confirmation link to the owner so they can finish on their side.</>}</div>
        <p>First, confirm we can reach the owner. We&apos;ll email a 6-digit code to their address below (already filled in from their details), then hand you the new email to give them.</p>
        <label className={styles.field}>The owner&apos;s email<input type="email" required maxLength={254} value={destination} disabled={setup.destinationVerified} onChange={e => setDestination(e.target.value)} placeholder="owner@example.com" /></label>
        <p className={styles.hint}>This is where we&apos;ll forward LinkedIn&apos;s confirmation link during setup. Change it only if the owner prefers a different inbox.</p>
        <label className={styles.check}><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><span>The owner agrees to make this LinkedVelocity email the account&apos;s main email (this changes how they sign in and recover the account), and to have setup codes forwarded to the inbox above for up to one hour, or until setup finishes.</span></label>
        <button className={styles.primary} disabled={busy || !consent}>{setup.address ? "Send a new code" : "Email the owner a code"}</button>
      </form>}
      {setup.address && !setup.forwardingActive && <form onSubmit={e => { e.preventDefault(); void submit({ action: "verify", code }); }}>
        <label className={styles.field}>Enter the 6-digit code we sent to {setup.destination}<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value)} /></label>
        <button className={styles.primary} disabled={busy || code.length !== 6}>Confirm</button>
        {setup.destinationVerified && <p className={styles.hint}>Forwarding expired. Send a new code to your inbox before requesting more LinkedIn messages.</p>}
      </form>}
      {setup.forwardingActive && <>
        <div className={styles.note}>The account&apos;s new email: <strong>{setup.address}</strong><br />We&apos;ll forward LinkedIn&apos;s confirmation to: {setup.destination}<br />Active until {setup.forwardingUntil && new Date(setup.forwardingUntil).toLocaleTimeString()}, or until setup finishes.</div>
        <p>Give this email to the ambassador and have them add it on LinkedIn, then make it their primary email:</p>
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
