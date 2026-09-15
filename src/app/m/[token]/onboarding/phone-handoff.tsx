"use client";
import { useState } from "react";
import styles from "./wizard.module.css";

// Phone hand-off: the referrer can't run GoLogin (desktop-only), so we do the sign-in
// on our side. The owner already supplied the login in their own intake form, so this
// is just a confirmation that marks the account for the team to complete.
export default function PhoneHandoff({ busy, error, submit }: {
  busy: boolean;
  error?: string;
  submit: () => Promise<void>;
}) {
  const [agree, setAgree] = useState(false);
  return <>
    <h2>Hand off to the LinkedVelocity team</h2>
    <p>No computer needed. The owner already gave us their login when they filled in their form, so we&apos;ll do the protected-browser sign-in for you, run the checks and pay everyone.</p>
    {error && <div className={styles.error} role="alert">{error}</div>}

    <div className={styles.note}>We&apos;ll set up the protected browser and sign in within about 24 hours, complete the checks, and release payment. If we need anything else, we&apos;ll reach out to the owner.</div>

    <label className={styles.check}><input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} /><span>The owner is happy for LinkedVelocity to sign in and run the account, and understands they keep full access and can reset their password anytime.</span></label>

    <button className={styles.primary} disabled={busy || !agree} onClick={() => void submit()}>{busy ? "Handing off…" : "Hand off to the team →"}</button>
  </>;
}
