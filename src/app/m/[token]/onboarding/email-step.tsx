"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./wizard.module.css";

export type EmailSetup = {
  configured: boolean; domains: string[]; address: string | null; destination: string | null;
  destinationVerified: boolean; verificationCodePending: boolean; primaryConfirmed: boolean; forwardingActive: boolean;
  forwardingUntil: string | null; lastForwardedAt: string | null; primaryConfirmedAt: string | null;
};

const MINI_STEPS = ["Code inbox", "Add email", "Verify email", "Make primary"];

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
  const [copied, setCopied] = useState(false);

  function copyAddress() {
    if (!setup.address) return;
    navigator.clipboard?.writeText(setup.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function restart() {
    await submit({ action: "restart", consent: true });
    setCode(""); setConsent(false); setLinkConfirmed(false); setPrimary(false); setMiniStep(1);
  }

  // Ready-to-send message the referrer copies and sends to the account owner so they
  // can add the LinkedVelocity email themselves. The email is filled in for them.
  const [copiedSteps, setCopiedSteps] = useState(false);
  const addEmailMessage = `Here's how to add our work email to your LinkedIn:

1. Log in to LinkedIn on your normal device.
2. Click your photo (Me) at the top right, then Settings & Privacy.
3. Go to Sign in & security, then Email addresses.
4. Click Add email address.
5. Enter: ${setup.address || "(the email we'll share in a moment)"}
6. Enter your current password when prompted, then click Send verification.
7. That's it on your end. Let us know once you've added it, and we'll click the verification link from our side to confirm it.
8. Once it shows as verified, please set it as your primary email, and we'll take it from there.`;
  function copySteps() {
    navigator.clipboard?.writeText(addEmailMessage);
    setCopiedSteps(true);
    setTimeout(() => setCopiedSteps(false), 1800);
  }

  return <>
    <h2>Set up their LinkedIn email</h2>
    <p>The <strong>account owner</strong> adds and verifies the email themselves, on their own phone or laptop where they&apos;re already signed into LinkedIn. <strong>You walk them through each step.</strong> There&apos;s no protected GoLogin browser yet; that only comes at the very end for the final sign-in.</p>

    <ol className={styles.miniSteps} aria-label="LinkedIn email setup progress">
      {MINI_STEPS.map((label, index) => {
        const position = index + 1;
        // Let the referrer jump back to an earlier completed step (2+) — e.g. to
        // re-copy the email — but never skip forward or reopen the inbox setup.
        const canGoBack = position < miniStep && position >= 2;
        return <li key={label} className={position === miniStep ? styles.miniActive : position < miniStep ? styles.miniComplete : ""}>
          <button type="button" disabled={!canGoBack} onClick={() => canGoBack && setMiniStep(position)}>
            <span>{position < miniStep ? "✓" : position}</span><small>{label}</small>
          </button>
        </li>;
      })}
    </ol>

    {/* Keep the LinkedVelocity email copyable on every step after the inbox setup —
        referrers often move on without copying it and then can't find it again. */}
    {setup.configured && setup.forwardingActive && setup.address && miniStep >= 2 && (
      <div className={styles.emailAddressCard}>
        <span>LinkedVelocity email to add</span>
        <strong>{setup.address}</strong>
        <button type="button" onClick={copyAddress}>{copied ? "Copied ✓" : "Copy email"}</button>
      </div>
    )}

    {!setup.configured ? <div className={styles.note}>Email receiving is not live yet. Your progress is saved; the team must finish configuring and testing the domains before this step can continue.</div> : <>
      {miniStep === 1 && <section className={styles.miniPanel}>
        <div className={styles.stepLabel}>EMAIL STEP 1 OF 4</div>
        <h3>Where should the codes go?</h3>
        <p>Enter any inbox you can open right now — <strong>your own (the referrer&apos;s) is easiest</strong>, or the account owner&apos;s. We&apos;ll send a six-digit code there first, then temporarily forward LinkedIn&apos;s verification email to the same inbox so you can read it.</p>

        {setup.destinationVerified && !setup.forwardingActive ? <>
          <div className={styles.note}>The previous forwarding window expired. Start again to choose the receiving inbox and get a different LinkedVelocity email.</div>
          <button className={styles.primary} disabled={busy} onClick={() => void restart()}>Start this email step again →</button>
        </> : <>
          <form onSubmit={e => { e.preventDefault(); void submit({ action: "start", destination, consent }); }}>
            <label className={styles.field}>Email for the codes (yours or the owner&apos;s)<input type="email" required maxLength={254} value={destination} onChange={e => setDestination(e.target.value)} placeholder="you@example.com" /></label>
            <label className={styles.check}><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><span>The account owner agrees to add a LinkedVelocity-managed primary email and to onboarding messages being forwarded to this inbox for up to one hour.</span></label>
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
        <p>The owner does this on their own LinkedIn. Copy the steps below and send them, or read them out.</p>
        <div className={styles.scriptCard}>
          <div className={styles.scriptHead}>
            <strong>Message to send the owner</strong>
            <button type="button" className={styles.copyButton} onClick={copySteps}>{copiedSteps ? "Copied ✓" : "Copy steps"}</button>
          </div>
          <pre className={styles.scriptText}>{addEmailMessage}</pre>
        </div>
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
