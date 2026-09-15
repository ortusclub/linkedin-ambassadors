"use client";
import { useState } from "react";
import styles from "./wizard.module.css";

// Phone hand-off: the referrer can't run GoLogin (desktop-only), so they give us
// the password and the 2FA key and we do the sign-in on our side. Nothing here
// touches GoLogin; it just captures what we need and marks the account for the team.
export default function PhoneHandoff({ busy, error, submit }: {
  busy: boolean;
  error?: string;
  submit: (body: { password: string; twoFactorKey: string }) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [twoFactorKey, setTwoFactorKey] = useState("");
  const [noKey, setNoKey] = useState(false);
  const [agree, setAgree] = useState(false);
  const ready = password.trim().length >= 6 && agree && (noKey || twoFactorKey.trim().length >= 8);
  return <>
    <h2>Hand off to the LinkedVelocity team</h2>
    <p>No computer needed. Give us two things and we&apos;ll do the protected-browser sign-in for you, then run the checks and pay everyone.</p>
    {error && <div className={styles.error} role="alert">{error}</div>}

    <div className={styles.note}>Do this with the owner, on their phone. Their LinkedIn email is already set to ours, so we just need to be able to log in.</div>

    <label className={styles.field}>A temporary password the owner sets
      <input type="text" autoComplete="off" required minLength={6} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} placeholder="e.g. LinkedVel2026!" />
    </label>
    <p className={styles.hint}>Have the owner change their LinkedIn password to this in the app (Settings → Sign in &amp; security → Change password). They can reset it whenever they like after setup.</p>

    <label className={styles.check}><input type="checkbox" checked={noKey} onChange={e => { setNoKey(e.target.checked); if (e.target.checked) setTwoFactorKey(""); }} /><span>We can&apos;t get the 2FA key right now, set up two-step verification for us.</span></label>

    {!noKey && <>
      <ol className={styles.instructions}>
        <li>In the LinkedIn app: <strong>Settings → Sign in &amp; security → Two-step verification</strong>.</li>
        <li>Choose <strong>Authenticator app</strong>. When LinkedIn shows a QR code, tap <strong>&ldquo;Can&apos;t scan the QR code?&rdquo;</strong> to reveal the setup <strong>key</strong>.</li>
        <li>Paste that key below. To finish turning it on, LinkedIn asks for a 6-digit code, put the key into a TOTP code tool to get it.</li>
      </ol>
      <label className={styles.field}>The 2FA setup key
        <input type="text" autoComplete="off" maxLength={128} value={twoFactorKey} onChange={e => setTwoFactorKey(e.target.value.toUpperCase())} placeholder="e.g. JBSWY3DPEHPK3PXP" />
      </label>
    </>}

    <label className={styles.check}><input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} /><span>The owner agrees to share these so LinkedVelocity can sign in and run the account, and understands they keep full access and can reset the password anytime.</span></label>

    <button className={styles.primary} disabled={busy || !ready} onClick={() => void submit({ password: password.trim(), twoFactorKey: noKey ? "" : twoFactorKey.trim() })}>{busy ? "Handing off…" : "Hand off to the team →"}</button>
    <p className={styles.hint}>We&apos;ll set up the protected browser and sign in within 24 hours, complete the checks, and release payment. Never share these with anyone but LinkedVelocity.</p>
  </>;
}
