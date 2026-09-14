"use client";

import { useState } from "react";
import { countries } from "@/lib/countries";
import styles from "./wizard.module.css";

type BrowserSession = {
  id: string;
  name: string;
  state: string;
  opened: boolean;
  country: string | null;
  shareLink: string | null;
};

const MINI_STEPS = ["Prepare browser", "Open GoLogin", "Sign in", "Save session"];

export default function BrowserStep({ session, busy, action, refresh }: {
  session: BrowserSession;
  busy: boolean;
  action: (action: "prepare" | "opened" | "confirm") => Promise<void>;
  refresh: () => Promise<void>;
}) {
  const initialStep = session.state !== "ready" ? 1 : session.opened ? 3 : 2;
  const [miniStep, setMiniStep] = useState(initialStep);
  const [signedIn, setSignedIn] = useState(false);
  const [closed, setClosed] = useState(false);
  const country = countries.find((item) => item.code === session.country)?.name || session.country;

  return <>
    <h2>Prepare and sign in to their browser</h2>
    <p>We&apos;ll prepare the protected browser, then guide the owner through signing in and saving the session.</p>

    <ol className={styles.miniSteps} aria-label="Browser setup progress">
      {MINI_STEPS.map((label, index) => {
        const position = index + 1;
        return <li key={label} className={position === miniStep ? styles.miniActive : position < miniStep ? styles.miniComplete : ""}>
          <span>{position < miniStep ? "✓" : position}</span><small>{label}</small>
        </li>;
      })}
    </ol>

    {miniStep === 1 && <section className={styles.miniPanel}>
      <div className={styles.stepLabel}>BROWSER STEP 1 OF 4</div>
      <h3>Prepare the protected browser</h3>
      <p>We&apos;ll create a dedicated browser and connection for {session.name}{country ? <> in <strong>{country}</strong></> : ""}.</p>
      {["reserved", "link_pending", "proxy_pending"].includes(session.state) && <button className={styles.primary} disabled={busy} onClick={() => void action("prepare")}>{busy ? "Preparing browser…" : session.state === "reserved" ? "Prepare browser →" : "Check browser progress →"}</button>}
      {["purchasing", "purchase_unknown", "creating", "needs_help"].includes(session.state) && <div className={styles.note}>The browser is being prepared. This onboarding is saved, so you can safely return to it later.<br />Reference: {session.id}</div>}
      <button className={styles.secondary} disabled={busy} onClick={() => void refresh()}>{busy ? "Checking…" : "Check browser progress"}</button>
    </section>}

    {miniStep === 2 && session.state === "ready" && <section className={styles.miniPanel}>
      <div className={styles.stepLabel}>BROWSER STEP 2 OF 4</div>
      <h3>Open the prepared GoLogin browser</h3>
      <p>Keep this page open. Select the button below and allow your browser to open GoLogin if prompted.</p>
      <div className={styles.note}>If GoLogin is not installed, follow the installation instructions on the launch page, then return here and open the browser again.</div>
      <a className={styles.primary} href={session.shareLink!} target="_blank" rel="noreferrer" onClick={() => void action("opened")}>Open their GoLogin browser ↗</a>
    </section>}

    {miniStep === 3 && session.state === "ready" && <section className={styles.miniPanel}>
      <div className={styles.stepLabel}>BROWSER STEP 3 OF 4</div>
      <h3>Ask the owner to sign in to LinkedIn</h3>
      <ol className={styles.instructions}>
        <li>Inside the prepared browser, open <strong>linkedin.com</strong>.</li>
        <li>The owner enters their password and completes any code, identity or security check LinkedIn requests.</li>
        <li>Check that both their LinkedIn feed and profile open successfully.</li>
      </ol>
      <label className={styles.check}><input type="checkbox" checked={signedIn} onChange={(event) => setSignedIn(event.target.checked)} /><span>I can see the owner&apos;s LinkedIn feed and profile in the prepared browser.</span></label>
      <button className={styles.primary} disabled={!signedIn} onClick={() => setMiniStep(4)}>Continue to save the session →</button>
      <a className={styles.secondary} href={session.shareLink!} target="_blank" rel="noreferrer">Open the GoLogin browser again ↗</a>
    </section>}

    {miniStep === 4 && session.state === "ready" && <section className={styles.miniPanel}>
      <div className={styles.stepLabel}>BROWSER STEP 4 OF 4</div>
      <h3>Close the browser and save the login</h3>
      <p>Close the GoLogin browser normally and wait for it to finish saving the signed-in session. Keep this onboarding page open.</p>
      <label className={styles.check}><input type="checkbox" checked={closed} onChange={(event) => setClosed(event.target.checked)} /><span>I closed the GoLogin browser normally after confirming the LinkedIn login worked.</span></label>
      <button className={styles.primary} disabled={busy || !closed} onClick={() => void action("confirm")}>{busy ? "Saving confirmation…" : "Confirm successful login ✓"}</button>
      <button className={styles.secondary} onClick={() => { setClosed(false); setMiniStep(3); }}>Back to sign-in instructions</button>
    </section>}

    <p className={styles.hint}>If LinkedIn blocks the login or verification is unfinished, leave the onboarding saved and contact the team. Confirm only after the feed and profile open successfully.</p>
  </>;
}
