"use client";

import { useEffect, useState } from "react";
import styles from "./wizard.module.css";

// Soft 24h wait between making the new email primary and signing in. We recommend
// waiting (it lowers the chance LinkedIn asks for ID at login) but never block it.
const WAIT_MS = 24 * 60 * 60 * 1000;

export function WaitNotice({ primaryConfirmedAt }: { primaryConfirmedAt: string | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);
  if (!primaryConfirmedAt) return null;
  const readyAt = new Date(primaryConfirmedAt).getTime() + WAIT_MS;
  const remaining = readyAt - now;
  if (remaining <= 0) {
    return <div className={styles.waitReady}>
      <strong>✓ Safe to sign in</strong>
      <span>It&apos;s been more than 24 hours since the email was made primary. You can complete the sign-in now.</span>
    </div>;
  }
  const hrs = Math.floor(remaining / 3600000);
  const mins = Math.ceil((remaining % 3600000) / 60000);
  const when = new Date(readyAt).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" });
  return <div className={styles.waitNotice}>
    <strong>Recommended: wait about 24 hours before signing in</strong>
    <span>Leaving a day between making the new email primary and signing in reduces the chance LinkedIn asks for ID. Best to come back around <b>{when}</b> ({hrs}h {mins}m from now). You can continue now if you need to.</span>
  </div>;
}

// Ready-to-send messages the referrer copies and sends to the account owner at each
// stage. These mirror the manual LinkedVelocity onboarding script so referrers don't
// have to remember what to say. NOTE on the photo: LinkedVelocity edits the photo, so
// the message only asks the owner to send one (and later upload the version we return).

export type ScriptContext = {
  name: string;
  address: string | null;
  termsUrl: string;
  setupDays: number;
};

export type OnboardingScript = { key: string; title: string; text: (ctx: ScriptContext) => string };

const firstName = (name: string) => (name || "").trim().split(/\s+/)[0] || "there";
const emailOrPlaceholder = (address: string | null) => address || "our work email (we'll share it in a moment)";

export const ONBOARDING_SCRIPTS: OnboardingScript[] = [
  {
    key: "intro",
    title: "1. Intro, terms & name check",
    text: (c) => `Hi ${firstName(c.name)}! This is LinkedVelocity. You signed up for the LinkedIn Rental Program. Are you free now to start the onboarding process?

Before we start, please have a quick read of the terms so you're happy with them: ${c.termsUrl}

Can you also confirm that your name on LinkedIn matches the name on your government ID?

Since your account is established, it only takes about ${c.setupDays} business days before we send your set-up fee:
- Day 1 (today): send your photo + add our work email
- Day 2 (tomorrow): we log in to your account
- Day 3: we check your account is okay, then send your set-up fee`,
  },
  {
    key: "photo",
    title: "2. Ask for a photo",
    text: () => `Can you send us a clear headshot? A 1x1 or 2x2 works best.

We'll turn it into a clean, professional profile photo and send it back for you to upload. If you're not happy with it, just let us know and send another and we'll re-try.`,
  },
  {
    key: "add-email",
    title: "3. Add our work email",
    text: (c) => `Here's how to add our work email to your LinkedIn:

1. Log in to LinkedIn on your normal device.
2. Click your photo (Me) at the top right, then Settings & Privacy.
3. Go to Sign in & security, then Email addresses.
4. Click Add email address.
5. Enter: ${emailOrPlaceholder(c.address)}
6. Enter your current password when prompted, then click Send verification.
7. That's it on your end. Let us know once you've added it and we'll click the verification link from our side.
8. Once it shows as verified, please set it as your primary email.`,
  },
  {
    key: "primary-password",
    title: "4. Make it primary, share password & payout",
    text: (c) => `Great. Now please set the new email (${emailOrPlaceholder(c.address)}) as your primary email, and let us know once it's done.

Could you also share your LinkedIn password? And your payout method, account number, and the name registered on it, please?

In the meantime, I'll connect a few people to your account. Just accept them. I'll let you know once we log in.`,
  },
  {
    key: "restriction",
    title: "5. Restriction reminder (before login)",
    text: () => `Quick reminder before we log in: since your account is unverified, it can be prone to restrictions. If that happens, we'll need to verify it with an ID to regain access, and we can't send payment while it's restricted. We'll do our best to keep it safe.`,
  },
  {
    key: "wait",
    title: "6. Wait 24 hours & keep it safe",
    text: () => `Thanks so much! Now we just wait 24 hours. If your account is still active and not restricted, we'll settle your set-up fee.

For now, I'd suggest not using your account. You still have full access, but it's safest if it's only used one at a time.`,
  },
];

export function scriptByKey(key: string) {
  return ONBOARDING_SCRIPTS.find((s) => s.key === key);
}

export function CopyScript({ script, ctx }: { script: OnboardingScript; ctx: ScriptContext }) {
  const [copied, setCopied] = useState(false);
  const text = script.text(ctx);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (e.g. insecure context). Select the text so it can be copied manually.
      const el = document.getElementById(`script-${script.key}`);
      if (el) { const r = document.createRange(); r.selectNodeContents(el); const sel = window.getSelection(); sel?.removeAllRanges(); sel?.addRange(r); }
    }
  }
  return <div className={styles.scriptCard}>
    <div className={styles.scriptHead}>
      <strong>{script.title}</strong>
      <button type="button" className={styles.copyButton} onClick={() => void copy()}>{copied ? "Copied ✓" : "Copy"}</button>
    </div>
    <pre id={`script-${script.key}`} className={styles.scriptText}>{text}</pre>
  </div>;
}

// Full collapsible panel with every message, available throughout the wizard.
export function ScriptsPanel({ ctx }: { ctx: ScriptContext }) {
  const [open, setOpen] = useState(false);
  return <div className={styles.scriptsPanel}>
    <button type="button" className={styles.scriptsToggle} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
      <span>💬 Messages to send the owner</span><span>{open ? "Hide ▲" : "Show all ▼"}</span>
    </button>
    {open && <div className={styles.scriptsList}>
      <p className={styles.hint}>Copy any message and send it to the account owner. Details like their name and the work email are filled in for you.</p>
      {ONBOARDING_SCRIPTS.map((s) => <CopyScript key={s.key} script={s} ctx={ctx} />)}
    </div>}
  </div>;
}
