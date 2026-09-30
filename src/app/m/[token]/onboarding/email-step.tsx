"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./wizard.module.css";

export type EmailSetup = {
  previouslyVerifiedEmail?: string | null;
  configured: boolean; domains: string[]; address: string | null; destination: string | null;
  destinationVerified: boolean; verificationCodePending: boolean; primaryConfirmed: boolean; forwardingActive: boolean;
  forwardingUntil: string | null; lastForwardedAt: string | null; primaryConfirmedAt: string | null;
  confirmUrl: string | null;
  latestCode: string | null; latestCodeAt: string | null;
};

const MINI_STEPS = ["Code inbox", "Add email", "Verify email", "Make primary"];

export default function EmailStep({ setup, busy, submit, refresh, selfMode = false }: {
  selfMode?: boolean;
  setup: EmailSetup; busy: boolean; submit: (body: unknown) => Promise<void>; refresh: () => Promise<void>;
}) {
  const initialStep = !setup.forwardingActive ? 1 : (setup.lastForwardedAt || setup.confirmUrl) ? 3 : 2;
  const [miniStep, setMiniStep] = useState(initialStep);
  const [destination, setDestination] = useState(setup.destination || (selfMode ? setup.previouslyVerifiedEmail : "") || "");
  const [editingInbox, setEditingInbox] = useState(false);
  const previouslyVerified = !!(selfMode && setup.previouslyVerifiedEmail && destination.trim().toLowerCase() === setup.previouslyVerifiedEmail.toLowerCase());
  const [consent, setConsent] = useState(false);
  const [code, setCode] = useState("");
  const [linkConfirmed, setLinkConfirmed] = useState(false);
  const [primary, setPrimary] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmCopied, setConfirmCopied] = useState(false);

  function copyAddress() {
    if (!setup.address) return;
    navigator.clipboard?.writeText(setup.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  function copyConfirm() {
    if (!setup.confirmUrl) return;
    navigator.clipboard?.writeText(setup.confirmUrl);
    setConfirmCopied(true);
    setTimeout(() => setConfirmCopied(false), 1800);
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
${selfMode ? "7. Return to this wizard, open LinkedIn’s verification link on your signed-in device, and confirm the new email is verified." : "7. That’s it on your end. Let us know once you’ve added it, and we’ll click the verification link from our side to confirm it."}
8. Once it shows as verified, please set it as your primary email, and we'll take it from there.`;
  function copySteps() {
    navigator.clipboard?.writeText(addEmailMessage);
    setCopiedSteps(true);
    setTimeout(() => setCopiedSteps(false), 1800);
  }

  return <>
    <h2>{selfMode ? "Set up your LinkedIn email" : "Set up their LinkedIn email"}</h2>
    <p>{selfMode ? "Add and verify the email on your own phone or laptop where you’re already signed into LinkedIn. We’ll guide you through each step below." : <>The <strong>account owner</strong> adds and verifies the email on their own signed-in device. You walk them through each step.</>} The protected GoLogin browser comes later for the final sign-in.</p>

    {/* People get confused about "whose email" — spell out what this step is FOR. */}
    <div className={styles.why} data-tour="email-why">
      <strong>What this step is for</strong>
      <p>We&apos;re adding a LinkedVelocity work email to {selfMode ? "your" : "their"} LinkedIn and making it the primary one — that&apos;s how we manage the account. LinkedIn has to <strong>verify</strong> that new email, so its verification message needs to land in an inbox someone can open and click.</p>
      <p>{selfMode ? "Choose an inbox you can open now. We only forward LinkedIn’s verification messages there, for up to one hour." : "The receiving inbox can be yours or the account owner’s. We only forward LinkedIn’s messages there, for up to one hour."}</p>
    </div>

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
      {miniStep === 1 && <section className={styles.miniPanel} data-tour="email-inbox">
        <div className={styles.stepLabel}>EMAIL STEP 1 OF 4</div>
        <h3>{previouslyVerified && !editingInbox ? "Your verification inbox" : "Pick an inbox to catch the verification"}</h3>
        {previouslyVerified && !editingInbox ? <p>We’ll forward LinkedIn’s verification email to <strong>{destination}</strong>. You’ve already verified this address, so you don’t need another code.</p> : <p>Enter an inbox you can open now. We’ll send a six-digit code to verify a different address, then temporarily forward LinkedIn’s verification message there.</p>}
        {previouslyVerified && !editingInbox && <button type="button" className={styles.linkBtn} disabled={busy} onClick={() => setEditingInbox(true)}>Change email</button>}

        {setup.destinationVerified && !setup.forwardingActive ? <>
          <div className={styles.note}>The previous forwarding window expired. Start again to choose the receiving inbox and get a different LinkedVelocity email.</div>
          <button className={styles.primary} disabled={busy} onClick={() => void restart()}>Start this email step again →</button>
        </> : <>
          <form onSubmit={e => { e.preventDefault(); void submit({ action: "start", destination, consent }); }}>
            {(!previouslyVerified || editingInbox) && <label className={styles.field}>{selfMode ? "Your inbox for verification codes" : "Email for the codes (yours or the owner’s)"}<input type="email" required maxLength={254} value={destination} onChange={e => { setDestination(e.target.value); setCode(""); }} placeholder="you@example.com" /></label>}
            <label className={styles.check}><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><span>{selfMode ? "I agree" : "The account owner agrees"} to add a LinkedVelocity-managed primary email and to onboarding messages being forwarded to this inbox for up to one hour.</span></label>
            <button className={styles.primary} disabled={busy || !consent}>{previouslyVerified ? "Continue with this email →" : setup.verificationCodePending ? "Send another six-digit code" : "Send six-digit code →"}</button>
          </form>
          {setup.verificationCodePending && !previouslyVerified && <form onSubmit={e => { e.preventDefault(); void submit({ action: "verify", code }); }}>
            <label className={styles.field}>Enter the six-digit code sent to {setup.destination}<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} /></label>
            <button className={styles.primary} disabled={busy || code.length !== 6}>Verify inbox and continue →</button>
          </form>}
        </>}
      </section>}

      {miniStep === 2 && setup.forwardingActive && <section className={styles.miniPanel}>
        <div className={styles.stepLabel}>EMAIL STEP 2 OF 4</div>
        <h3>Add the new email to LinkedIn</h3>
        <p>{selfMode ? "Follow these steps in your own LinkedIn account." : "The owner does this on their own LinkedIn. Copy the steps below and send them, or read them out."}</p>
        <div className={styles.scriptCard}>
          <div className={styles.scriptHead}>
            <strong>{selfMode ? "Steps to follow" : "Message to send the owner"}</strong>
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
        {setup.confirmUrl ? <>
          <div className={styles.note}>LinkedIn&apos;s confirmation link came through. Open it <strong>on the device where {selfMode ? "you’re" : "the owner is"} logged into LinkedIn</strong>.</div>
          <a className={styles.primary} href={setup.confirmUrl} target="_blank" rel="noopener noreferrer" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>Open LinkedIn&apos;s confirmation link →</a>
          <button type="button" className={styles.secondary} onClick={copyConfirm}>{confirmCopied ? "Link copied ✓" : (selfMode ? "Copy verification link" : "Copy link to send the owner")}</button>
          <label className={styles.check}><input type="checkbox" checked={linkConfirmed} onChange={e => setLinkConfirmed(e.target.checked)} /><span>{selfMode ? "I opened" : "The owner opened"} the link and the new email now shows as verified on LinkedIn.</span></label>
          <button className={styles.primary} disabled={!linkConfirmed} onClick={() => setMiniStep(4)}>Continue to make it primary →</button>
        </> : setup.lastForwardedAt ? <>
          <div className={styles.note}>LinkedIn&apos;s verification message was forwarded to <strong>{setup.destination}</strong>.</div>
          <ol className={styles.instructions}>
            <li>Open <strong>{setup.destination}</strong>.</li>
            <li>Find the message from LinkedIn and open its verification link.</li>
            <li>Return to LinkedIn and confirm that the new email is shown as verified.</li>
          </ol>
          <label className={styles.check}><input type="checkbox" checked={linkConfirmed} onChange={e => setLinkConfirmed(e.target.checked)} /><span>{selfMode ? "I opened" : "The owner opened"} the LinkedIn verification link and the new email now shows as verified.</span></label>
          <button className={styles.primary} disabled={!linkConfirmed} onClick={() => setMiniStep(4)}>Continue to make it primary →</button>
        </> : <>
          <div className={styles.note}>Waiting for LinkedIn&apos;s confirmation. Once {selfMode ? "you add" : "the owner adds"} the email it usually arrives in a moment — tap to check. If it&apos;s slow, {selfMode ? "tap" : "have them tap"} <strong>resend</strong> on LinkedIn; it&apos;ll come through here whenever it lands, no time limit.</div>
          <button className={styles.primary} disabled={busy} onClick={() => void refresh()}>{busy ? "Checking…" : "Check for LinkedIn&apos;s link"}</button>
        </>}
        <button className={styles.secondary} disabled={busy} onClick={() => void restart()}>Start again with a different email</button>
      </section>}

      {miniStep === 4 && setup.forwardingActive && <section className={styles.miniPanel}>
        <div className={styles.stepLabel}>EMAIL STEP 4 OF 4</div>
        <h3>Make the LinkedVelocity email primary</h3>
        <p>Return to LinkedIn&apos;s Email addresses list. Find <strong>{setup.address}</strong> and select <strong>Make primary</strong>.</p>
        <div className={styles.warn}>
          <div>This must be the PRIMARY email</div>
          <p>Don&apos;t just leave it added — it has to be set as the <strong>primary</strong> email. If <strong>{setup.address}</strong> isn&apos;t primary, we can&apos;t sign in and the onboarding can&apos;t finish. Double-check it shows as primary before you continue.</p>
        </div>
        <div className={styles.primaryButtonCrop}>
          <Image src="/images/onboarding/linkedin-make-primary-button.png" alt="LinkedIn Make primary button" width={1973} height={797} />
        </div>
        <div className={styles.videoComingSoon}>
          <span aria-hidden="true">▶</span>
          <div><strong>Video walkthrough coming soon</strong><small>A short recording will show how to add, verify and make the LinkedVelocity email primary.</small></div>
        </div>
        <label className={styles.check}><input type="checkbox" checked={primary} onChange={e => setPrimary(e.target.checked)} /><span>I can see <strong>{setup.address}</strong> set as the <strong>primary</strong> email in {selfMode ? "my" : "the owner’s"} LinkedIn — not just added. {selfMode ? "I agree" : "The owner agrees"} to continue.</span></label>
        <button className={styles.primary} disabled={busy || !primary || !(setup.lastForwardedAt || setup.confirmUrl)} onClick={() => void submit({ action: "primary", consent: true })}>Email is primary — continue to 2FA →</button>
        <button className={styles.secondary} disabled={busy} onClick={() => void restart()}>Start again with a different email</button>
      </section>}
    </>}
    <p className={styles.hint}>{selfMode ? "Only continue if you understand and agree to the primary email change." : "Only change the primary email with the owner’s informed agreement."} If anything is unclear, pause and contact the team.</p>
  </>;
}
