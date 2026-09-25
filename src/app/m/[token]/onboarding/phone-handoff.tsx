"use client";
import { useState } from "react";
import styles from "./wizard.module.css";

// Phone hand-off: the referrer can't run GoLogin (desktop-only), so they give us a
// temporary password and we do the sign-in on our side. The 2FA key was captured in the
// dedicated two-step-verification step before this, so it's sent along by the wizard.
export default function PhoneHandoff({ busy, error, submit }: {
  busy: boolean;
  error?: string;
  submit: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const ready = password.trim().length >= 6 && agree;
  return <>
    <h2>Hand off to the LinkedVelocity team</h2>
    <p>No computer needed. Set a temporary password and we&apos;ll do the protected-browser sign-in for you, then run the checks and pay everyone.</p>
    {error && <div className={styles.error} role="alert">{error}</div>}

    <div className={styles.note}>Do this with the owner, on their phone. Their LinkedIn email is already set to ours, so we just need to be able to log in.</div>

    <label className={styles.field}>A temporary password the owner sets
      <input type="text" autoComplete="off" required minLength={6} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} placeholder="e.g. LinkedVel2026!" />
    </label>
    <p className={styles.hint}>Have the owner change their LinkedIn password to this in the app (Settings → Sign in &amp; security → Change password). They can reset it whenever they like after setup.</p>

    <div className={styles.note}>Two-step verification is set up — we&apos;ll use the code from the previous step when we sign in.</div>

    <label className={styles.check}><input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} /><span>The owner agrees to share these so LinkedVelocity can sign in and run the account, and understands they keep full access and can reset the password anytime.</span></label>

    <button className={styles.primary} disabled={busy || !ready} onClick={() => void submit(password.trim())}>{busy ? "Handing off…" : "Hand off to the team →"}</button>
    <p className={styles.hint}>We&apos;ll set up the protected browser and sign in within 24 hours, complete the checks, and release payment. Never share these with anyone but LinkedVelocity.</p>
  </>;
}
