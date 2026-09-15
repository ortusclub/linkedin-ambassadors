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
  guideUrl: string;
  ownerUrl: string;
  setupDays: number;
};

export type OnboardingScript = { key: string; title: string; text: (ctx: ScriptContext) => string };

const firstName = (name: string) => (name || "").trim().split(/\s+/)[0] || "there";
const emailOrPlaceholder = (address: string | null) => address || "our work email (we'll share it in a moment)";

export const ONBOARDING_SCRIPTS: OnboardingScript[] = [
  {
    key: "intro",
    title: "1. Intro, terms & your link",
    text: (c) => `Hi ${firstName(c.name)}! This is LinkedVelocity. You signed up for the LinkedIn Rental Program. Are you free now to start onboarding?

First, please have a quick read of these so you're happy with everything:
- What to expect with your account: ${c.guideUrl}
- Full terms: ${c.termsUrl}

Can you also confirm that your name on LinkedIn matches the name on your government ID?

Once you're happy, open your onboarding link and fill in your details. This is where you add your own payout details and set a temporary password for us:
${c.ownerUrl}

Quick heads-up on timing: if your account is at least a month old, it takes about 3 business days (Day 1 you send your photo and add our work email, Day 2 we sign in, Day 3 we check everything and send your set-up fee). If it's newer than a month or brand new, we use a 7-day checking period. You keep full access the whole time.`,
  },
  {
    key: "photo",
    title: "2. Photo",
    text: () => `When you fill in your onboarding form, you can upload a clear headshot (a 1x1 or 2x2 works best).

We'll turn it into a clean, professional profile photo and send it back for you to upload. If you're not happy with it, just let us know and we'll re-try.`,
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
    title: "4. Make it primary",
    text: (c) => `Great. Now please set the new email (${emailOrPlaceholder(c.address)}) as your primary email, and let us know once it's done.

We already have your payout details and password from your form, so that's everything we need. In the meantime, I'll connect a few people to your account. Just accept them. I'll let you know once we log in.`,
  },
  {
    key: "restriction",
    title: "5. Restriction reminder (before login)",
    text: () => `Quick reminder before we log in: newer or not-yet-verified accounts can sometimes be restricted by LinkedIn. If that happens, we'll need your help to verify it (usually with an ID) to regain access, and we can't send payment while it's restricted. We'll do our best to keep it safe.`,
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

function CopyLink({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ }
  }
  return <div className={styles.shareRow}>
    <div className={styles.shareInfo}><strong>{label}</strong><a href={url} target="_blank" rel="noreferrer">{url}</a></div>
    <div className={styles.shareButtons}>
      <button type="button" className={styles.copyButton} onClick={() => void copy()}>{copied ? "Copied ✓" : "Copy link"}</button>
      <a className={styles.openLink} href={url} target="_blank" rel="noreferrer">Open ↗</a>
    </div>
  </div>;
}

// Prominent share block so the referrer can send the owner the two things they must
// read before onboarding: the plain-language guide and the full terms.
export function ShareLinks({ ctx }: { ctx: ScriptContext }) {
  return <div className={styles.shareBlock}>
    <div className={styles.stepLabel}>SEND THE OWNER THESE FIRST</div>
    <p className={styles.hint}>Share both before you start so they know what to expect and agree to the terms.</p>
    <CopyLink label="What to expect with your account" url={ctx.guideUrl} />
    <CopyLink label="Ambassador terms" url={ctx.termsUrl} />
  </div>;
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
