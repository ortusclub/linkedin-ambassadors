"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./wizard.module.css";
import BrowserStep from "./browser-step";
import PhoneHandoff from "./phone-handoff";
import EmailStep, { type EmailSetup } from "./email-step";
import { CopyScript, ScriptsPanel, WaitNotice, scriptByKey, type ScriptContext } from "./onboarding-scripts";

type Credentials = { loginEmail: string | null; password: string | null; twoFactor: string | null };
type Session = {
  emailSetup: EmailSetup | null;
  country: string | null; proxyAssigned: boolean; proxyPriceLimit: number;
  id: string; name: string; state: string; opened: boolean; shareLink: string | null;
  confirmedAt: string | null; setupDueAt: string | null; setupAmount: string;
  monthlyAmount: string; commission: string; verified: boolean;
  credentials?: Credentials;
};
type Bootstrap = { emailEnabled: boolean; slug: string; autoPurchase: boolean; configured: boolean; sessions: { id: string; state: string; name: string }[] };

export default function SelfServiceWizard({ token }: { token: string }) {
  const endpoint = `/api/m/${encodeURIComponent(token)}/onboarding`;
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [step, setStep] = useState(0);
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [linkCopied, setLinkCopied] = useState(false);
  const [browserMode, setBrowserMode] = useState<"" | "pc" | "phone">("");
  const [handedOff, setHandedOff] = useState(false);

  async function request(method: string, body?: unknown, id?: string) {
    const response = await fetch(endpoint + (id ? `?id=${encodeURIComponent(id)}` : ""), {
      method, headers: { "Content-Type": "application/json" }, cache: "no-store",
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
    return data;
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      for (let attempt = 0; attempt < 3 && !cancelled; attempt++) {
        let retryable = true;
        try {
          const r = await fetch(endpoint, { cache: "no-store", signal: AbortSignal.timeout(15000) });
          retryable = r.status >= 500 || r.status === 429;
          const data = await r.json();
          if (!r.ok) throw new Error(data.error || "Could not load onboarding.");
          if (!cancelled) setBootstrap(data);
          return;
        } catch (e) {
          if (!retryable || attempt === 2) {
            if (!cancelled) setError(e instanceof Error ? e.message : "Could not load onboarding.");
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
        }
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [endpoint, loadAttempt]);

  async function run(task: () => Promise<void>) {
    setBusy(true); setError("");
    try { await task(); } catch (e) { setError(e instanceof Error ? e.message : "Please try again."); }
    finally { setBusy(false); }
  }
  function showSession(s: Session) { setSession(s); if (s.state === "handed_off") setHandedOff(true); setStep(s.state === "confirmed" ? 5 : s.emailSetup && !s.emailSetup.primaryConfirmed ? 3 : 4); }
  async function emailAction(body: unknown) {
    if (!session) return;
    await run(async () => {
      const res = await fetch(`${endpoint}/${session.id}/email`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Email setup failed.");
      showSession(data.session);
      if ((body as { action?: string }).action !== "primary") setStep(3);
    });
  }
  async function handoff() {
    if (!session) return;
    await run(async () => {
      await request("PATCH", { id: session.id, action: "handoff" });
      setHandedOff(true);
    });
  }
  async function action(action: "prepare" | "opened") {
    if (!session) return;
    const data = await request("PATCH", { id: session.id, action });
    showSession(data.session);
  }
  async function confirmLogin() {
    if (!session) return;
    await run(async () => {
      const data = await request("PATCH", { id: session.id, action: "confirm" });
      showSession(data.session);
    });
  }

  const ownerLink = bootstrap ? `${typeof window !== "undefined" ? window.location.origin : "https://linkedvelocity.com"}/o/${bootstrap.slug}` : "";
  const scriptCtx: ScriptContext = {
    name: session?.name || "there",
    address: session?.emailSetup?.address || null,
    termsUrl: `${typeof window !== "undefined" ? window.location.origin : "https://linkedvelocity.com"}/ambassador-terms`,
    guideUrl: `${typeof window !== "undefined" ? window.location.origin : "https://linkedvelocity.com"}/ambassador-guide`,
    ownerUrl: ownerLink,
    setupDays: 3,
  };
  async function shareOwnerLink() {
    if (navigator.share) {
      try { await navigator.share({ title: "LinkedVelocity onboarding", url: ownerLink }); return; }
      catch (err) { if (err instanceof DOMException && err.name === "AbortError") return; }
    }
    try { await navigator.clipboard.writeText(ownerLink); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); } catch { /* clipboard blocked */ }
  }

  const wizardSteps = [
    { index: 0, label: "Send the owner their link", detail: "They fill in their own details and payout." },
    ...(bootstrap?.emailEnabled ? [{ index: 3, label: "Add secure email", detail: "Add a LinkedVelocity-managed email to LinkedIn." }] : []),
    { index: 4, label: "Sign in", detail: "Sign in on a computer, or hand off for us to do it." },
    { index: 5, label: "Team verification", detail: "We check the saved session before payout." },
  ];

  const creds = session?.credentials;
  const credCard = creds && (creds.loginEmail || creds.password) ? <div className={styles.credCapture}>
    <strong>Login the owner provided</strong>
    <p className={styles.hint}>Use these to sign in. Keep them private. The owner keeps full access and can reset the password any time.</p>
    {creds.loginEmail && <div className={styles.note}>Email: <strong>{creds.loginEmail}</strong></div>}
    {creds.password && <div className={styles.note}>Password: <strong>{creds.password}</strong></div>}
    {creds.twoFactor && <div className={styles.note}>2FA key: <strong>{creds.twoFactor}</strong></div>}
  </div> : null;

  return <main className={styles.page}>
    <div className={styles.shell}>
      <div className={styles.desktopOnboarding}>
      <Link href={`/m/${token}`} className={styles.back}>← Referral dashboard</Link>
      <div className={styles.eyebrow}>LINKEDVELOCITY · SELF-SERVICE</div>
      <h1>Onboard someone you referred</h1>
      <p className={styles.subtitle}>Send the account owner their onboarding link. They fill in their own details, payout and login. Then you sign them in here (on a computer), or hand it to us to do.</p>
      {error && step !== 4 && <div className={styles.error} role="alert">{error}</div>}
      {!bootstrap && error && <button className={styles.primary} onClick={() => { setError(""); setLoadAttempt((n) => n + 1); }}>Retry loading onboarding</button>}
      {!bootstrap && !error && <p role="status">Loading onboarding…</p>}
      {bootstrap && <div className={styles.wizardLayout}>
        <aside className={styles.flowPanel} aria-label="How onboarding works">
          <div className={styles.flowKicker}>HOW IT WORKS</div>
          <h2>Send the link, then sign in</h2>
          <p>The owner fills their own form (details + payout). You never handle their payout. Then it comes back here for the sign-in.</p>
          <ol className={styles.flowSteps} aria-label="Onboarding progress">
            {wizardSteps.map((item, position) => {
              const complete = item.index < step;
              const active = item.index === step;
              return <li key={item.label} aria-current={active ? "step" : undefined} className={`${complete ? styles.complete : ""} ${active ? styles.active : ""}`}>
                <span className={styles.flowNumber}>{complete ? "✓" : position + 1}</span>
                <span><strong>{item.label}</strong><small>{item.detail}</small></span>
              </li>;
            })}
          </ol>
        </aside>
        <section className={styles.card} aria-busy={busy}>
        {step === 0 && <>
          <div className={styles.stepLabel}>STEP 1 · SEND THE OWNER THEIR LINK</div>
          <h2>Send the owner their onboarding link</h2>
          <p>Send this link to the person you&apos;re onboarding. They fill in their own details, payout and login, and agree to the terms. Then their onboarding appears below for you to complete the sign-in.</p>
          <div className={styles.note}>
            <strong>You earn ₱600–₱1,000</strong> for a completed onboarding — the exact amount depends on whether it&apos;s done on a phone or computer and whether the account is verified (you&apos;ll see it at the sign-in step). The owner earns ₱1,000 for setup and ₱500 per active month. Your referral stays attached automatically.
          </div>
          <div className={styles.emailAddressCard}>
            <span>The owner&apos;s onboarding link</span>
            <strong>{ownerLink}</strong>
            <button type="button" onClick={() => void shareOwnerLink()}>{linkCopied ? "Copied ✓" : "Copy / share"}</button>
          </div>
          <div className={styles.inlineScripts}>
            <div className={styles.stepLabel}>MESSAGE TO SEND WITH IT</div>
            {scriptByKey("intro") && <CopyScript script={scriptByKey("intro")!} ctx={scriptCtx} />}
          </div>
          {!bootstrap.configured && <p className={styles.note}>Note: browser access isn&apos;t fully configured yet. The owner can still submit their details; the team will finish setup.</p>}
          <div className={styles.resume}><h3>Your onboardings</h3>
            {bootstrap.sessions.length === 0 ? <p className={styles.hint}>None yet. Once an owner submits their link, they&apos;ll show up here.</p>
              : bootstrap.sessions.map((s) => <button key={s.id} disabled={busy} onClick={() => run(async () => showSession((await request("GET", undefined, s.id)).session))}>
                <span>{s.name}</span><span>{s.state === "confirmed" ? "View summary" : s.state === "handed_off" ? "Handed off" : "Continue"} →</span></button>)}
          </div>
        </>}
        {step === 3 && session?.emailSetup && <>
          <button className={styles.secondary} disabled={busy} onClick={() => { setSession(null); setStep(0); }}>← Back to your onboardings</button>
          <EmailStep key={`${session.id}-${session.emailSetup.forwardingActive}-${session.emailSetup.lastForwardedAt || "waiting"}`} setup={session.emailSetup} busy={busy} submit={emailAction} refresh={() => run(async () => showSession((await request("GET", undefined, session.id)).session))} />
          <div className={styles.inlineScripts}>
            <div className={styles.stepLabel}>MESSAGES TO SEND</div>
            {scriptByKey("add-email") && <CopyScript script={scriptByKey("add-email")!} ctx={scriptCtx} />}
          </div>
        </>}
        {step === 4 && session && (handedOff ? <>
          <div className={styles.success}>✓</div>
          <h2>Handed off to the team</h2>
          <p>{session.name}&apos;s account is saved with the sign-in details. We&apos;ll set up the protected browser, sign in, run the checks and release payment within about a day. Nothing more to do here.</p>
          <div className={styles.inlineScripts}>
            <div className={styles.stepLabel}>MESSAGE TO SEND THE OWNER</div>
            {scriptByKey("wait") && <CopyScript script={scriptByKey("wait")!} ctx={scriptCtx} />}
          </div>
          <a className={styles.secondary} href={`/m/${token}/onboarding`}>Back to your onboardings</a>
        </> : browserMode === "" ? <>
          <button className={styles.secondary} disabled={busy} onClick={() => { setSession(null); setStep(0); }}>← Back to your onboardings</button>
          <h2>Are you signing in on a computer or a phone?</h2>
          <p>This decides who does the final LinkedIn sign-in, and what you earn.</p>
          <div className={styles.handoffChoice}>
            <button type="button" className={styles.choiceCard} onClick={() => setBrowserMode("pc")}>
              <span className={styles.choiceIcon}>💻</span>
              <span className={styles.choiceTitle}>On a computer</span>
              <span className={styles.choiceDesc}>You do the sign-in in the prepared browser.</span>
              <span className={styles.choiceFee}>Earn ₱700 unverified · ₱1,000 verified</span>
            </button>
            <button type="button" className={styles.choiceCard} onClick={() => setBrowserMode("phone")}>
              <span className={styles.choiceIcon}>📱</span>
              <span className={styles.choiceTitle}>On a phone</span>
              <span className={styles.choiceDesc}>We do the sign-in for you. No computer needed.</span>
              <span className={styles.choiceFee}>Earn ₱600 unverified · ₱800 verified</span>
            </button>
          </div>
        </> : browserMode === "phone" ? <>
          <button className={styles.secondary} disabled={busy} onClick={() => setBrowserMode("")}>← Back to computer or phone</button>
          <PhoneHandoff busy={busy} error={error} submit={handoff} />
        </> : <>
          <button className={styles.secondary} disabled={busy} onClick={() => setBrowserMode("")}>← Back to computer or phone</button>
          <WaitNotice primaryConfirmedAt={session.emailSetup?.primaryConfirmedAt || null} />
          {credCard}
          {session.emailSetup && <><div className={styles.note}>LinkedIn login email: <strong>{session.emailSetup.address}</strong>. {session.emailSetup.forwardingActive ? "Verification messages are temporarily forwarded to the owner's verified inbox." : "Onboarding forwarding has expired. Re-verify the inbox if you need more login codes."}</div><button className={styles.secondary} disabled={busy} onClick={() => setStep(3)}>Manage onboarding email</button></>}
          <div className={styles.inlineScripts}>
            <div className={styles.stepLabel}>MESSAGE TO SEND BEFORE SIGN-IN</div>
            {scriptByKey("restriction") && <CopyScript script={scriptByKey("restriction")!} ctx={scriptCtx} />}
          </div>
          <BrowserStep key={`${session.id}-${session.state}-${session.opened}`} session={session} busy={busy} error={error} action={(nextAction) => run(() => action(nextAction))} confirm={confirmLogin} refresh={() => run(async () => showSession((await request("GET", undefined, session.id)).session))} />
        </>)}
        {step === 5 && session && <>
          <div className={styles.success}>✓</div><h2>Login confirmation saved</h2><p>{session.name}&apos;s account is in the system and linked to your referral.</p>
          <dl className={styles.summary}><dt>Owner setup payment</dt><dd>{session.setupAmount}</dd><dt>Setup due date</dt><dd>{session.setupDueAt ? new Date(session.setupDueAt).toLocaleDateString(undefined, { dateStyle: "medium" }) : "Awaiting login"}</dd><dt>Owner monthly payment</dt><dd>{session.monthlyAmount}</dd><dt>Your referral commission</dt><dd>{session.commission} · {session.verified ? "Verified" : "Pending verification"}</dd></dl>
          <div className={styles.note}>The account is officially onboarded. The team will verify the saved login during the checking period. The owner must remain reachable and complete any LinkedIn verification requested before payment is released.</div>
          <div className={styles.inlineScripts}>
            <div className={styles.stepLabel}>MESSAGE TO SEND</div>
            {scriptByKey("wait") && <CopyScript script={scriptByKey("wait")!} ctx={scriptCtx} />}
          </div>
          <Link className={styles.primary} href={`/m/${token}`}>Back to your dashboard →</Link>
          <a className={styles.secondary} href={`/m/${token}/onboarding`}>Back to your onboardings</a>
        </>}
        {step >= 3 && step <= 4 && <ScriptsPanel ctx={scriptCtx} />}
        </section>
      </div>}
      </div>
    </div>
  </main>;
}
