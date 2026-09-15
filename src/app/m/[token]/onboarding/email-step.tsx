"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./wizard.module.css";

export type EmailSetup = {
  configured: boolean; domains: string[]; address: string | null; destination: string | null;
  destinationVerified: boolean; verificationCodePending: boolean; primaryConfirmed: boolean; forwardingActive: boolean;
  forwardingUntil: string | null; lastForwardedAt: string | null;
};

const MINI_STEPS = ["Owner's inbox", "Add email", "Verify email", "Make primary"];

export default function EmailStep({ setup, busy, submit, refresh }: {
  setup: EmailSetup; busy: boolean; submit: (body: unknown) => Promise<void>; refresh: () => Promise<void>;
}) {
  const initialStep = !setup.forwardingActive ? 1 : setup.lastForwardedAt ? 3 : 2;
  const [miniStep, setMiniStep] = useState(initialStep);
  const [destination, setDestination] = useState(setup.destination || "");
  const [consent, setConsent] = useState(false);
  const [code, setCode] = useState("");
  const [linkConfirmed, setLinkConfirmed] = useState(false);
  const [primary, setPrimary] = useState(false);

  async function restart() {
    await submit({ action: "restart", consent: true });
    setCode(""); setConsent(false); setLinkConfirmed(false); setPrimary(false); setMiniStep(1);
  }

  return <>
    <h2>Set up their LinkedIn email</h2>
    <p>Complete these four steps with the account owner before opening their protected GoLogin browser.</p>

    <ol className={styles.miniSteps} aria-label="LinkedIn email setup progress">
      {MINI_STEPS.map((label, index) => {
        const position = index + 1;
        return <li key={label} className={position === miniStep ? styles.miniActive : position < miniStep ? styles.miniComplete : ""}>
          <span>{position < miniStep ? "✓" : position}</span><small>{label}</small>
        </li>;
      })}
    </ol>

    {!setup.configured ? <div className={styles.note}>Email receiving is not live yet. Your progress is saved; the team must finish configuring and testing the domains before this step can continue.</div> : <>
      {miniStep === 1 && <section className={styles.miniPanel}>
        <div className={styles.stepLabel}>EMAIL STEP 1 OF 4</div>
        <h3>The account owner&apos;s inbox</h3>
        <p>Enter an inbox <strong>the account owner</strong> can open right now (their own email, not yours). We&apos;ll send a six-digit code there first, then temporarily forward LinkedIn&apos;s verification email to the same inbox so the owner can read it.</p>

        {setup.destinationVerified && !setup.forwardingActive ? <>
          <div className={styles.note}>The previous forwarding window expired. Start again to choose the receiving inbox and get a different LinkedVelocity email.</div>
          <button className={styles.primary} disabled={busy} onClick={() => void restart()}>Start this email step again →</button>
        </> : <>
          <form onSubmit={e => { e.preventDefault(); void submit({ action: "start", destination, consent }); }}>
            <label className={styles.field}>The account owner&apos;s email<input type="email" required maxLength={254} value={destination} onChange={e => setDestination(e.target.value)} placeholder="owner@example.com" /></label>
            <label className={styles.check}><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><span>The owner agrees to use a LinkedVelocity-managed primary email and authorizes onboarding messages to be forwarded to this inbox for up to one hour.</span></label>
            <button className={styles.primary} disabled={busy || !consent}>{setup.verificationCodePending ? "Send another six-digit code" : "Send six-digit code →"}</button>
          </form>
          {setup.verificationCodePending && <form onSubmit={e => { e.preventDefault(); void submit({ action: "verify", code }); }}>
            <label className={styles.field}>Enter the six-digit code sent to {setup.destination}<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} /></label>
            <button className={styles.primary} disabled={busy || code.length !== 6}>Verify inbox and continue →</button>
          </form>}
        </>}
      </section>}

      {miniStep === 2 && setup.forwardingActive && <section className={styles.miniPanel}>
        <div className={styles.stepLabel}>EMAIL STEP 2 OF 4</div>
        <h3>Add the new email to LinkedIn</h3>
        <div className={styles.emailAddressCard}><span>LinkedVelocity email to add</span><strong>{setup.address}</strong><button type="button" onClick={() => setup.address && navigator.clipboard?.writeText(setup.address)}>Copy email</button></div>
        <ol className={styles.instructions}>
          <li>On the owner&apos;s usual LinkedIn session, open <strong>Me → Settings &amp; Privacy</strong>.</li>
          <li>Select <strong>Sign in &amp; security → Email addresses → Add email address</strong>.</li>
          <li>Paste <strong>{setup.address}</strong> and submit it. If LinkedIn asks for a password, code or identity check, the owner completes it themselves.</li>
        </ol>
        <button className={styles.primary} disabled={busy} onClick={() => { setMiniStep(3); void refresh(); }}>I&apos;ve added the email →</button>
        <button className={styles.secondary} disabled={busy} onClick={() => void restart()}>Start again with a different email</button>
      </section>}

      {miniStep === 3 && setup.forwardingActive && <section className={styles.miniPanel}>
        <div className={styles.stepLabel}>EMAIL STEP 3 OF 4</div>
        <h3>Verify the email address</h3>
        {setup.lastForwardedAt ? <>
          <div className={styles.note}>LinkedIn&apos;s verification message was forwarded to <strong>{setup.destination}</strong>.</div>
          <ol className={styles.instructions}>
            <li>Open <strong>{setup.destination}</strong>.</li>
            <li>Find the message from LinkedIn and open its verification link.</li>
            <li>Return to LinkedIn and confirm that the new email is shown as verified.</li>
          </ol>
          <label className={styles.check}><input type="checkbox" checked={linkConfirmed} onChange={e => setLinkConfirmed(e.target.checked)} /><span>The owner opened the LinkedIn verification link and the new email now shows as verified.</span></label>
          <button className={styles.primary} disabled={!linkConfirmed} onClick={() => setMiniStep(4)}>Continue to make it primary →</button>
        </> : <>
          <div className={styles.note}>The LinkedIn message has not arrived yet. Request the verification email from LinkedIn, then check again.</div>
          <button className={styles.primary} disabled={busy} onClick={() => void refresh()}>{busy ? "Checking…" : "Check for the LinkedIn email"}</button>
        </>}
        <button className={styles.secondary} disabled={busy} onClick={() => void restart()}>Start again with a different email</button>
      </section>}

      {miniStep === 4 && setup.forwardingActive && <section className={styles.miniPanel}>
        <div className={styles.stepLabel}>EMAIL STEP 4 OF 4</div>
        <h3>Make the LinkedVelocity email primary</h3>
        <p>Return to LinkedIn&apos;s Email addresses list. Find <strong>{setup.address}</strong> and select <strong>Make primary</strong>.</p>
        <div className={styles.primaryButtonCrop}>
          <Image src="/images/onboarding/linkedin-make-primary.png" alt="LinkedIn Make primary button" width={696} height={184} />
        </div>
        <div className={styles.videoComingSoon}>
          <span aria-hidden="true">▶</span>
          <div><strong>Video walkthrough coming soon</strong><small>A short recording will show how to add, verify and make the LinkedVelocity email primary.</small></div>
        </div>
        <label className={styles.check}><input type="checkbox" checked={primary} onChange={e => setPrimary(e.target.checked)} /><span>The owner verified the address and I can see it marked as primary in LinkedIn. The owner agrees to continue.</span></label>
        <button className={styles.primary} disabled={busy || !primary || !setup.lastForwardedAt} onClick={() => void submit({ action: "primary", consent: true })}>Email is primary — continue to GoLogin →</button>
        <button className={styles.secondary} disabled={busy} onClick={() => void restart()}>Start again with a different email</button>
      </section>}
    </>}
    <p className={styles.hint}>Only change the primary email with the owner&apos;s informed agreement. If anything is unclear, pause and contact the team.</p>
  </>;
}
