"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CURRENCY_CONFIG, type CurrencyConfig } from "@/lib/referral-currency";
import styles from "./wizard.module.css";
import { countries, countryCode } from "@/lib/countries";
import EmailStep, { type EmailSetup } from "./email-step";

type Session = {
  emailSetup: EmailSetup | null;
  country: string | null; proxyAssigned: boolean; proxyPriceLimit: number;
  id: string; name: string; state: string; opened: boolean; shareLink: string | null;
  confirmedAt: string | null; setupDueAt: string | null; setupAmount: string;
  monthlyAmount: string; commission: string; verified: boolean;
};
type Bootstrap = { emailEnabled: boolean; countries: string[]; autoPurchase: boolean; config: CurrencyConfig; configured: boolean; sessions: { id: string; state: string; name: string }[] };

export default function SelfServiceWizard({ token }: { token: string }) {
  const endpoint = `/api/m/${encodeURIComponent(token)}/onboarding`;
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [step, setStep] = useState(0);
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [consent, setConsent] = useState(false);
  const [loginConfirmed, setLoginConfirmed] = useState(false);
  const [verify, setVerify] = useState({ status: "", passport: "" });
  const [form, setForm] = useState({ fullName: "", email: "", linkedinUrl: "", country: "", contactNumber: "", accountFreshness: "established", paymentMethod: "", paymentDetails: "", payoutName: "" });

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
          if (!cancelled) {
            setBootstrap(data);
            setForm((f) => ({ ...f, paymentMethod: data.config.defaultPayoutMethod }));
          }
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
  function showSession(s: Session) { setSession(s); setStep(s.state === "confirmed" ? 6 : s.emailSetup && !s.emailSetup.primaryConfirmed ? 4 : 5); }
  async function emailAction(body: unknown) {
    if (!session) return;
    await run(async () => {
      const res = await fetch(`${endpoint}/${session.id}/email`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Email setup failed.");
      showSession(data.session);
      if ((body as { action?: string }).action !== "primary") setStep(4);
    });
  }
  async function action(action: "prepare" | "opened" | "confirm") {
    if (!session) return;
    const data = await request("PATCH", { id: session.id, action });
    showSession(data.session);
  }
  const field = (key: keyof typeof form, label: string, type = "text", placeholder = "") => (
    <label className={styles.field}>{label}<input required type={type} value={form[key]} maxLength={key === "paymentDetails" ? 500 : 254} placeholder={placeholder}
      onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>
  );

  return <main className={styles.page}>
    <div className={styles.shell}>
      <Link href={`/m/${token}`} className={styles.back}>← Referral dashboard</Link>
      <div className={styles.eyebrow}>LINKEDVELOCITY · SELF-SERVICE</div>
      <h1>Do-it-yourself onboarding</h1>
      <p className={styles.subtitle}>Set up an account together, right here. We&apos;ll prepare the browser; the account owner signs into LinkedIn.</p>
      <ol className={styles.steps} aria-label="Onboarding progress">
        {["Start", "Details", "Verify", "Payout", "Email", "Sign in", "Done"].map((label, i) => (!bootstrap || bootstrap.emailEnabled || i !== 4) && <li key={label} aria-current={step === i ? "step" : undefined} className={i <= step ? styles.current : ""}><span>{i < step ? "✓" : i + 1 - (bootstrap && !bootstrap.emailEnabled && i > 4 ? 1 : 0)}</span>{label}</li>)}
      </ol>
      {error && <div className={styles.error} role="alert">{error}</div>}
      {!bootstrap && error && <button className={styles.primary} onClick={() => { setError(""); setLoadAttempt((n) => n + 1); }}>Retry loading onboarding</button>}
      {!bootstrap && !error && <p role="status">Loading onboarding…</p>}
      {bootstrap && <section className={styles.card} aria-busy={busy}>
        {step === 0 && <>
          <h2>Let&apos;s get them set up</h2>
          <p>Have the account owner with you on a computer. They&apos;ll need access to their LinkedIn account and any verification codes.</p>
          <div className={styles.note}>They earn US{CURRENCY_CONFIG.USD.offer.setup} ({CURRENCY_CONFIG.PHP.offer.setup}) for setup and US{CURRENCY_CONFIG.USD.offer.monthly} ({CURRENCY_CONFIG.PHP.offer.monthly}) per active month. You earn a referral fee of US${CURRENCY_CONFIG.USD.rate} (₱{CURRENCY_CONFIG.PHP.rate.toLocaleString("en-US")}) for each successfully onboarded referral, subject to verification. Your referral stays attached automatically.</div>
          <label className={styles.check}><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>The account owner meets <a href="https://www.linkedin.com/help/linkedin/answer/a6854067" target="_blank" rel="noreferrer">LinkedIn&apos;s minimum age: 16, or older where local law requires</a>, is present, and agrees to share their account through LinkedVelocity under the <a href="/ambassador-terms" target="_blank" rel="noreferrer">ambassador terms</a>.</span></label>
          {!bootstrap.configured && <p className={styles.note}>You can enter the details now. The team will need to configure browser access before you can save and continue to sign-in.</p>}
          {bootstrap.configured && !bootstrap.autoPurchase && bootstrap.countries.length === 0 && <p className={styles.note}>You can enter the details now. A dedicated proxy will be needed before you can save and continue to sign-in.</p>}
          <button className={styles.primary} disabled={!consent} onClick={() => setStep(1)}>Start onboarding →</button>
          {bootstrap.sessions.length > 0 && <div className={styles.resume}><h3>Your saved onboardings</h3>{bootstrap.sessions.map((s) => <button key={s.id} disabled={busy} onClick={() => run(async () => showSession((await request("GET", undefined, s.id)).session))}>
            <span>{s.name}</span><span>{s.state === "confirmed" ? "View summary" : "Resume"} →</span></button>)}</div>}
        </>}
        {step === 1 && <form onSubmit={(e) => { e.preventDefault(); setError(""); setStep(2); }}>
          <h2>Who are we onboarding?</h2><p>A few details connect the account, referral and payouts.</p>
          {field("fullName", "Account owner's full name")}
          {field("email", "Account owner's email", "email")}
          {field("contactNumber", "Contact number, including country code", "tel", "+63…")}
          {field("linkedinUrl", "LinkedIn profile link", "url", "https://www.linkedin.com/in/your-name")}
          <label className={styles.field}>Which country is the account holder located in?<select required value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
            <option value="">Choose their country</option>{countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select></label><p className={styles.hint}>Choose where the account is normally used. We&apos;ll match the dedicated connection to that country.</p>
          {form.country && !bootstrap.countries.some((c) => countryCode(c) === form.country) && <div className={styles.note}>{bootstrap.autoPurchase ? "No spare connection in this country. We'll check for a matching static residential proxy during setup. If unavailable, we'll save progress for the team." : "There is no spare connection in this country yet. You can finish entering the details, but the team needs to add a matching proxy before you can save and continue to sign-in."}</div>}
          <label className={styles.field}>Account age<select value={form.accountFreshness} onChange={(e) => setForm({ ...form, accountFreshness: e.target.value })}><option value="established">Established account</option><option value="fresh">Brand-new account</option></select></label>
          <div className={styles.actions}><button type="button" className={styles.secondary} onClick={() => setStep(0)}>Back</button><button className={styles.primary}>Continue →</button></div>
        </form>}
        {step === 2 && <div>
          <h2>Is the account verified on LinkedIn?</h2>
          <p>Accounts that have verified the owner&apos;s identity are less likely to be restricted. Verifying is free and takes a few minutes.</p>
          <label className={styles.field}>Is this LinkedIn account already identity-verified?<select value={verify.status} onChange={(e) => setVerify({ ...verify, status: e.target.value })}>
            <option value="">Choose one</option><option value="yes">Yes, it&apos;s already verified</option><option value="no">No, or not sure</option>
          </select></label>
          {verify.status === "yes" && <div className={styles.note}>Great. A verified account is more stable and less likely to be restricted.</div>}
          {verify.status === "no" && <>
            <label className={styles.field}>{form.country === "PH" ? "Does the owner have a passport?" : "Does the owner have a passport or government ID?"}<select value={verify.passport} onChange={(e) => setVerify({ ...verify, passport: e.target.value })}>
              <option value="">Choose one</option><option value="yes">Yes</option><option value="no">No</option>
            </select></label>
            {form.country === "PH" && <p className={styles.hint}>In the Philippines, LinkedIn only accepts a passport for identity verification.</p>}
            {verify.passport === "yes" && <>
              <div className={styles.note}>Recommended: verify the account now. It&apos;s free, takes about five minutes, and lowers the chance of restrictions.</div>
              <ol className={styles.instructions}>
                <li>On the owner&apos;s phone, open the <strong>LinkedIn app</strong> and go to their profile.</li>
                <li>Open <strong>Settings → Account preferences → Verifications</strong>, or tap &ldquo;Add verification&rdquo; on the profile.</li>
                <li>Choose <strong>Verify with government ID</strong> and follow the steps: scan the {form.country === "PH" ? "passport" : "passport or ID"} and take a selfie. LinkedIn uses a secure verification partner.</li>
                <li>It usually finishes within minutes and adds a verification badge to the profile.</li>
              </ol>
              <p className={styles.hint}>You can start verification now and continue setup at the same time. Exact menu names may vary slightly by app version and country.</p>
            </>}
            {verify.passport === "no" && <div className={styles.note}>{form.country === "PH" ? "In the Philippines, LinkedIn only accepts a passport, so verification is not possible without one yet. It is strongly recommended once the owner has a passport, as it lowers the chance of restrictions." : "That's okay. Verifying with a passport later is strongly recommended, as it lowers the chance of restrictions."} You can continue for now.</div>}
          </>}
          <div className={styles.actions}><button type="button" className={styles.secondary} onClick={() => setStep(1)}>Back</button><button className={styles.primary} disabled={!verify.status} onClick={() => setStep(3)}>Continue →</button></div>
        </div>}
        {step === 3 && <form onSubmit={(e) => { e.preventDefault(); run(async () => showSession((await request("POST", { ...form, consent })).session)); }}>
          <h2>Where should they get paid?</h2><p>These are the account owner&apos;s payout details. Your referral commission uses your own dashboard details.</p>
          <label className={styles.field}>Payout method<select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>{bootstrap.config.payoutMethods.map((p) => <option key={p}>{p}</option>)}</select></label>
          {field("payoutName", "Registered payout account name")}{field("paymentDetails", "Payout number, address or bank details")}
          {(!bootstrap.configured || (!bootstrap.autoPurchase && !bootstrap.countries.some((c) => countryCode(c) === form.country))) && <div className={styles.note}>Browser setup is not ready yet. Your entries are only held on this page until you successfully save. Keep this tab open while the team configures browser access and a matching proxy, then try Save &amp; continue.</div>}
          <div className={styles.note}>Next, we&apos;ll create their onboarding record and arrange a dedicated connection in {countries.find((c) => c.code === form.country)?.name}.</div>
          <div className={styles.actions}><button type="button" disabled={busy} className={styles.secondary} onClick={() => setStep(2)}>Back</button><button className={styles.primary} disabled={busy}>{busy ? "Saving…" : "Save & continue →"}</button></div>
        </form>}
        {step === 4 && session?.emailSetup && <EmailStep key={session.id} setup={session.emailSetup} busy={busy} submit={emailAction} refresh={() => run(async () => showSession((await request("GET", undefined, session.id)).session))} />}
        {step === 5 && session && <>
          {session.emailSetup && <><div className={styles.note}>LinkedIn login email: <strong>{session.emailSetup.address}</strong>. {session.emailSetup.forwardingActive ? "Verification messages are temporarily forwarded to your verified inbox." : "Onboarding forwarding has expired. Re-verify your inbox if you need more login codes."}</div><button className={styles.secondary} disabled={busy} onClick={() => setStep(4)}>Manage onboarding email</button></>}
          <h2>{session.state === "ready" ? "Time to sign into LinkedIn" : "Prepare their browser"}</h2>
          <p>{session.name}&apos;s onboarding is saved. We&apos;ll prepare their dedicated connection and browser together.</p>
          {session.state === "reserved" && <div className={styles.note}>
            Account country: <strong>{countries.find((c) => c.code === session.country)?.name || session.country}</strong>.
            {session.proxyAssigned ? " A matching proxy is already assigned." : " We'll assign an available residential proxy in this country, or arrange a new one if needed. If none is available, setup will pause."}
          </div>}
          {["reserved", "link_pending", "proxy_pending"].includes(session.state) && <button className={styles.primary} disabled={busy} onClick={() => run(() => action("prepare"))}>{busy ? "Preparing connection & browser…" : session.state === "link_pending" ? "Retry browser link" : session.state === "proxy_pending" ? "Check proxy delivery & continue" : "Prepare GoLogin browser →"}</button>}
          {session.state === "proxy_pending" && <p className={styles.hint}>The matching proxy has been ordered and is being prepared. Check delivery to continue; this will not purchase another proxy.</p>}
          {["purchasing", "purchase_unknown"].includes(session.state) && <div className={styles.note}>The proxy order is processing or needs a team check. Progress is saved; no duplicate purchase will be made. Reference: {session.id}</div>}
          {["creating", "needs_help"].includes(session.state) && <div className={styles.note}>Your setup is saved. {session.state === "creating" ? "The browser is being prepared. If this persists, ask the team to check it." : "The team needs to check the browser setup before you continue."}<br />Reference: {session.id}</div>}
          {session.state === "ready" && <>
            <ol className={styles.instructions}><li>Open the prepared GoLogin browser below. Allow your browser to open GoLogin if prompted.</li><li>If GoLogin is missing, install it using the launch page instructions, then return here and open the link again.</li><li>Inside that browser, go to <strong>linkedin.com</strong>. The owner enters their own password and any verification codes.</li><li>Check that their LinkedIn feed and profile open. Close the GoLogin browser normally so the session can sync, then confirm below.</li></ol>
            <a className={styles.primary} href={session.shareLink!} target="_blank" rel="noreferrer" onClick={() => run(() => action("opened"))}>Open their GoLogin browser ↗</a>
            <p className={styles.hint}>Use this prepared browser for the login. Don&apos;t enter their password into this page.</p>
            <label className={styles.check}><input type="checkbox" checked={loginConfirmed} onChange={(e) => setLoginConfirmed(e.target.checked)} /><span>I saw the owner&apos;s LinkedIn feed and profile in the prepared browser and closed it to save the session.</span></label>
            <button className={styles.primary} disabled={busy || !loginConfirmed || !session.opened} onClick={() => run(() => action("confirm"))}>{busy ? "Saving confirmation…" : "Yes, I managed to sign in ✓"}</button>
          </>}
          <button className={styles.secondary} disabled={busy} onClick={() => run(async () => showSession((await request("GET", undefined, session.id)).session))}>Refresh saved progress</button>
          <p className={styles.hint}>Login blocked or verification unfinished? Leave this onboarding saved and contact the team. Only confirm after a successful login.</p>
        </>}
        {step === 6 && session && <>
          <div className={styles.success}>✓</div><h2>Login confirmation saved</h2><p>{session.name}&apos;s account is in the system and linked to your referral.</p>
          <dl className={styles.summary}><dt>Owner setup payment</dt><dd>{session.setupAmount}</dd><dt>Setup due date</dt><dd>{session.setupDueAt ? new Date(session.setupDueAt).toLocaleDateString(undefined, { dateStyle: "medium" }) : "Awaiting login"}</dd><dt>Owner monthly payment</dt><dd>{session.monthlyAmount}</dd><dt>Your referral commission</dt><dd>{session.commission} · {session.verified ? "Verified" : "Pending verification"}</dd></dl>
          <div className={styles.note}>The team will verify the saved login before payment is released or the account becomes rentable. Monthly payment dates are calculated after the setup payment is made.</div>
          <Link className={styles.primary} href={`/m/${token}`}>Back to your dashboard →</Link>
          <a className={styles.secondary} href={`/m/${token}/onboarding`}>Onboard another person</a>
        </>}
      </section>}
    </div>
  </main>;
}
