"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CURRENCY_CONFIG, type CurrencyConfig } from "@/lib/referral-currency";
import styles from "./wizard.module.css";
import { countries, countryCode } from "@/lib/countries";
import BrowserStep from "./browser-step";
import EmailStep, { type EmailSetup } from "./email-step";

type Session = {
  emailSetup: EmailSetup | null;
  country: string | null; proxyAssigned: boolean; proxyPriceLimit: number;
  id: string; name: string; state: string; opened: boolean; shareLink: string | null;
  confirmedAt: string | null; setupDueAt: string | null; setupAmount: string;
  monthlyAmount: string; commission: string; verified: boolean;
};
type Bootstrap = { emailEnabled: boolean; phoneVerificationEnabled: boolean; countries: string[]; autoPurchase: boolean; config: CurrencyConfig; configured: boolean; sessions: { id: string; state: string; name: string }[] };

const PAYOUT_FIELDS: Record<string, { label: string; type?: string; placeholder: string; help: string }> = {
  GCash: { label: "GCash mobile number", type: "tel", placeholder: "+63 9XX XXX XXXX", help: "Enter the mobile number registered to their GCash account." },
  Maya: { label: "Maya mobile number", type: "tel", placeholder: "+63 9XX XXX XXXX", help: "Enter the mobile number registered to their Maya account." },
  UPI: { label: "UPI ID", placeholder: "name@bank", help: "Enter their UPI ID, sometimes called a virtual payment address—not a bank account number." },
  PayPal: { label: "PayPal email address", type: "email", placeholder: "name@example.com", help: "Use the email address confirmed on their PayPal account." },
  Wise: { label: "Wise email address", type: "email", placeholder: "name@example.com", help: "Use the email address registered to their Wise account." },
  "Bank transfer": { label: "Bank transfer details", placeholder: "Bank name, account number and routing / SWIFT details", help: "Include the bank name, account number and the routing, sort, IFSC or SWIFT code required in their country." },
};
const PROXY_COUNTRIES = ["IN", "GB", "US", "PH"];

export default function SelfServiceWizard({ token }: { token: string }) {
  const endpoint = `/api/m/${encodeURIComponent(token)}/onboarding`;
  const phoneEndpoint = `${endpoint}/phone`;
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [step, setStep] = useState(0);
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [consent, setConsent] = useState(false);
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", linkedinUrl: "", country: "", contactNumber: "", phoneVerificationToken: "", accountFreshness: "established", paymentMethod: "", paymentDetails: "", payoutName: "", bankName: "", bankAccountNumber: "", bankRoutingNumber: "" });

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
  async function verifyPhone(action: "send" | "check") {
    setPhoneBusy(true); setPhoneError("");
    try {
      const response = await fetch(phoneEndpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, phone: form.contactNumber, ...(action === "check" ? { code: phoneCode } : {}) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Mobile verification failed.");
      if (action === "send") setPhoneCodeSent(true);
      else setForm((current) => ({ ...current, phoneVerificationToken: data.verificationToken }));
    } catch (e) { setPhoneError(e instanceof Error ? e.message : "Mobile verification failed."); }
    finally { setPhoneBusy(false); }
  }
  function showSession(s: Session) { setSession(s); setStep(s.state === "confirmed" ? 5 : s.emailSetup && !s.emailSetup.primaryConfirmed ? 3 : 4); }
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
  async function action(action: "prepare" | "opened" | "confirm") {
    if (!session) return;
    const data = await request("PATCH", { id: session.id, action });
    showSession(data.session);
  }
  const field = (key: keyof typeof form, label: string, type = "text", placeholder = "") => (
    <label className={styles.field}>{label}<input required type={type} value={form[key]} maxLength={key === "paymentDetails" ? 500 : 254} placeholder={placeholder}
      onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>
  );

  const wizardSteps = [
    { index: 0, label: "Start together", detail: "The owner must stay with you for the entire setup." },
    { index: 1, label: "Owner details", detail: "Add their LinkedIn and contact details." },
    { index: 2, label: "Payout", detail: "Record where the owner should be paid." },
    ...(bootstrap?.emailEnabled ? [{ index: 3, label: "Add secure email", detail: "The owner approves a LinkedVelocity-managed email on LinkedIn." }] : []),
    { index: 4, label: "Prepare & sign in", detail: "The owner enters their login, codes and completes any checks." },
    { index: 5, label: "Team verification", detail: "We check the saved session before activation and payment." },
  ];
  const payoutField = PAYOUT_FIELDS[form.paymentMethod] || { label: "Payout details", placeholder: "Account number or payment address", help: "Enter everything needed to send the payment." };
  const selectedCountry = countryCode(form.country);
  const browserCapacityAvailable = selectedCountry && PROXY_COUNTRIES.includes(selectedCountry)
    ? bootstrap?.countries.some((country) => countryCode(country) === selectedCountry)
    : bootstrap?.countries.some((country) => {
      const code = countryCode(country);
      return !!code && PROXY_COUNTRIES.includes(code);
    });

  async function moveToComputer() {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: "LinkedVelocity onboarding", url }); return; }
      catch (error) { if (error instanceof DOMException && error.name === "AbortError") return; }
    }
    await navigator.clipboard.writeText(url);
    setLinkCopied(true);
  }

  return <main className={styles.page}>
    <div className={styles.shell}>
      <section className={styles.mobileBlock}>
        <div className={styles.eyebrow}>LINKEDVELOCITY · SELF-SERVICE</div>
        <div className={styles.mobileComputerIcon} aria-hidden="true">▰</div>
        <h1>Continue onboarding on a computer</h1>
        <p>This guided onboarding cannot be completed on a mobile phone or tablet.</p>
        <div className={styles.mobileReason}>
          <strong>Why a computer is required</strong>
          <span>The final sign-in uses GoLogin, desktop anti-detect software that prepares a protected browser for the LinkedIn account. GoLogin must be opened on a Windows or Mac computer.</span>
        </div>
        <ol className={styles.mobileInstructions}>
          <li>Share or copy this onboarding link.</li>
          <li>Open the same link on a Windows or Mac computer.</li>
          <li>Have the account owner with you before restarting.</li>
        </ol>
        <button className={styles.primary} onClick={() => void moveToComputer()}>{linkCopied ? "Onboarding link copied ✓" : "Share onboarding link"}</button>
        <Link href={`/m/${token}`} className={styles.secondary}>Return to referral dashboard</Link>
      </section>
      <div className={styles.desktopOnboarding}>
      <Link href={`/m/${token}`} className={styles.back}>← Referral dashboard</Link>
      <div className={styles.eyebrow}>LINKEDVELOCITY · SELF-SERVICE</div>
      <h1>Do-it-yourself onboarding</h1>
      <p className={styles.subtitle}>The account owner must be with you for the whole setup. They&apos;ll need access to their current email, phone and LinkedIn account so they can approve changes, receive verification codes and complete any security checks.</p>
      {error && <div className={styles.error} role="alert">{error}</div>}
      {!bootstrap && error && <button className={styles.primary} onClick={() => { setError(""); setLoadAttempt((n) => n + 1); }}>Retry loading onboarding</button>}
      {!bootstrap && !error && <p role="status">Loading onboarding…</p>}
      {bootstrap && <div className={styles.wizardLayout}>
        <aside className={styles.flowPanel} aria-label="How onboarding works">
          <div className={styles.flowKicker}>HOW IT WORKS</div>
          <h2>One setup, {wizardSteps.length} clear steps</h2>
          <p>It usually takes about 10 minutes. Do not begin unless the owner can stay until sign-in is complete.</p>
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
          <div className={styles.stepLabel}>STEP 1 · BEFORE YOU BEGIN</div>
          <h2>Get the account owner ready</h2>
          <div className={styles.ownerRequired}><strong>The account owner must stay with you from start to finish.</strong><span>You cannot complete this onboarding without them. LinkedIn may send codes or ask them to confirm their identity during setup.</span></div>
          <p>You&apos;ll work through the steps together on the same computer. We prepare the account email and protected browser; the owner personally approves changes and completes their private LinkedIn sign-in.</p>
          <div className={styles.note}>They earn US{CURRENCY_CONFIG.USD.offer.setup} ({CURRENCY_CONFIG.PHP.offer.setup}) for setup and US{CURRENCY_CONFIG.USD.offer.monthly} ({CURRENCY_CONFIG.PHP.offer.monthly}) per active month. You earn double the standard referral fee — US${CURRENCY_CONFIG.USD.rate * 2} (₱{(CURRENCY_CONFIG.PHP.rate * 2).toLocaleString("en-US")}) — when you successfully complete this guided onboarding, subject to verification. Your referral stays attached automatically.</div>
          <label className={styles.check}><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>The account owner meets <a href="https://www.linkedin.com/help/linkedin/answer/a6854067" target="_blank" rel="noreferrer">LinkedIn&apos;s minimum age: 16, or older where local law requires</a>, is present for the full setup, can access their verification methods, and agrees to add a LinkedVelocity-managed email and share account access under the <a href="/ambassador-terms" target="_blank" rel="noreferrer">ambassador terms</a>.</span></label>
          {!bootstrap.configured && <p className={styles.note}>You can enter the details now. The team will need to configure browser access before you can save and continue to sign-in.</p>}
          {bootstrap.configured && !bootstrap.autoPurchase && bootstrap.countries.length === 0 && <p className={styles.note}>You can enter the details now. A dedicated proxy will be needed before you can save and continue to sign-in.</p>}
          <button className={styles.primary} disabled={!consent} onClick={() => setStep(1)}>Start onboarding →</button>
          {bootstrap.sessions.length > 0 && <div className={styles.resume}><h3>Your saved onboardings</h3>{bootstrap.sessions.map((s) => <button key={s.id} disabled={busy} onClick={() => run(async () => showSession((await request("GET", undefined, s.id)).session))}>
            <span>{s.name}</span><span>{s.state === "confirmed" ? "View summary" : "Resume"} →</span></button>)}</div>}
        </>}
        {step === 1 && <form onSubmit={(e) => { e.preventDefault(); if (bootstrap.phoneVerificationEnabled && !form.phoneVerificationToken) { setPhoneError("Verify the mobile number before continuing."); return; } setError(""); setStep(2); }}>
          <h2>Who are we onboarding?</h2><p>A few details connect the account, referral and payouts.</p>
          {field("fullName", "Account owner's full name")}
          {field("email", "Account owner's email", "email")}
          <label className={styles.field}>Mobile number, including country code<input required type="tel" value={form.contactNumber} placeholder="+63 912 345 6789" onChange={(e) => { setForm({ ...form, contactNumber: e.target.value, phoneVerificationToken: "" }); setPhoneCode(""); setPhoneCodeSent(false); setPhoneError(""); }} /></label>
          {bootstrap.phoneVerificationEnabled && <div className={styles.phoneVerification}>
            {form.phoneVerificationToken ? <div className={styles.verifiedPhone}>✓ Mobile number verified</div> : <>
              <button type="button" className={styles.verifyButton} disabled={phoneBusy || form.contactNumber.trim().length < 8} onClick={() => void verifyPhone("send")}>{phoneBusy && !phoneCodeSent ? "Sending…" : phoneCodeSent ? "Send a new code" : "Send verification code"}</button>
              {phoneCodeSent && <div className={styles.verificationRow}><input className={styles.codeInput} inputMode="numeric" autoComplete="one-time-code" value={phoneCode} maxLength={10} placeholder="SMS code" onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, ""))} /><button type="button" className={styles.verifyButton} disabled={phoneBusy || phoneCode.length < 4} onClick={() => void verifyPhone("check")}>{phoneBusy ? "Checking…" : "Verify number"}</button></div>}
              {phoneCodeSent && <p className={styles.phoneHint}>Ask the account owner to read you the code sent to this phone.</p>}
              {phoneError && <p className={styles.phoneError} role="alert">{phoneError}</p>}
            </>}
          </div>}
          {field("linkedinUrl", "LinkedIn profile link", "url", "https://www.linkedin.com/in/your-name")}
          <label className={styles.field}>Which country is the account holder located in?<select required value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
            <option value="">Choose their country</option>{countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select></label><p className={styles.hint}>Choose where the account is normally used. We&apos;ll match the dedicated connection to that country.</p>
          <label className={styles.field}>How old is the LinkedIn account?<select value={form.accountFreshness} onChange={(e) => setForm({ ...form, accountFreshness: e.target.value })}><option value="established">More than one year old</option><option value="fresh">Less than one year old or brand new</option><option value="unknown">I&apos;m not sure</option></select></label>
          {form.accountFreshness === "unknown" && <p className={styles.hint}>We&apos;ll treat this as less than one year old and use the 7-day verification period.</p>}
          <div className={styles.actions}><button type="button" className={styles.secondary} onClick={() => setStep(0)}>Back</button><button className={styles.primary} disabled={bootstrap.phoneVerificationEnabled && !form.phoneVerificationToken}>Continue →</button></div>
        </form>}
        {step === 2 && <form onSubmit={(e) => { e.preventDefault(); run(async () => showSession((await request("POST", { ...form, consent })).session)); }}>
          <h2>Where should they get paid?</h2><p>These are the account owner&apos;s payout details. Your referral commission uses your own dashboard details.</p>
          <label className={styles.field}>Payout method<select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value, paymentDetails: "", bankName: "", bankAccountNumber: "", bankRoutingNumber: "" })}>{bootstrap.config.payoutMethods.map((p) => <option key={p}>{p}</option>)}</select></label>
          {field("payoutName", "Name registered on the payout account", "text", "Must match the payment account")}
          {form.paymentMethod === "Bank transfer" ? <>
            {field("bankName", "Bank name", "text", "Name of the receiving bank")}
            {field("bankAccountNumber", "Account number or IBAN", "text", "Receiving account number")}
            {field("bankRoutingNumber", "Routing, IFSC, sort or SWIFT code", "text", "Use the code required in their country")}
          </> : <>
            {field("paymentDetails", payoutField.label, payoutField.type || "text", payoutField.placeholder)}
            <p className={styles.hint}>{payoutField.help}</p>
          </>}
          {(!bootstrap.configured || (!bootstrap.autoPurchase && !browserCapacityAvailable)) && <div className={styles.note}>Browser setup is not ready yet. Your entries are only held on this page until you successfully save. Keep this tab open while the team configures browser access, then try Save &amp; continue.</div>}
          <div className={styles.note}><strong>What happens next:</strong> We&apos;ll save their onboarding record, then guide you and the owner through adding a shared LinkedVelocity email to their LinkedIn account. The owner will receive and approve any confirmation codes.</div>
          <div className={styles.paymentTimeline}><strong>When the owner gets paid</strong><span>After the shared email and protected browser login are complete, the account is officially onboarded. The setup payment is scheduled after <b>{form.accountFreshness === "established" ? "3 days" : "7 days"}</b>{form.accountFreshness === "established" ? " because the account is more than one year old" : form.accountFreshness === "fresh" ? " because the account is less than one year old" : " because its age has not been confirmed"}, subject to successful verification.</span><span>The owner must stay reachable during this period and complete any extra verification LinkedIn requests. This checking period helps ensure they remain available to resolve those prompts.</span></div>
          <div className={styles.actions}><button type="button" disabled={busy} className={styles.secondary} onClick={() => setStep(1)}>Back</button><button className={styles.primary} disabled={busy}>{busy ? "Saving…" : "Save & continue →"}</button></div>
        </form>}
        {step === 3 && session?.emailSetup && <EmailStep key={`${session.id}-${session.emailSetup.forwardingActive}-${session.emailSetup.lastForwardedAt || "waiting"}`} setup={session.emailSetup} busy={busy} submit={emailAction} refresh={() => run(async () => showSession((await request("GET", undefined, session.id)).session))} />}
        {step === 4 && session && <>
          <div className={styles.browserTip}>
            <strong>Optional tip: wait 24 hours before signing in</strong>
            <span>Leaving 24 hours between making the new email primary and signing in through the prepared browser can reduce the chance of LinkedIn requesting ID verification. You can continue now if needed.</span>
          </div>
          {session.emailSetup && <><div className={styles.note}>LinkedIn login email: <strong>{session.emailSetup.address}</strong>. {session.emailSetup.forwardingActive ? "Verification messages are temporarily forwarded to your verified inbox." : "Onboarding forwarding has expired. Re-verify your inbox if you need more login codes."}</div><button className={styles.secondary} disabled={busy} onClick={() => setStep(3)}>Manage onboarding email</button></>}
          <BrowserStep key={`${session.id}-${session.state}-${session.opened}`} session={session} busy={busy} action={(nextAction) => run(() => action(nextAction))} refresh={() => run(async () => showSession((await request("GET", undefined, session.id)).session))} />
        </>}
        {step === 5 && session && <>
          <div className={styles.success}>✓</div><h2>Login confirmation saved</h2><p>{session.name}&apos;s account is in the system and linked to your referral.</p>
          <dl className={styles.summary}><dt>Owner setup payment</dt><dd>{session.setupAmount}</dd><dt>Setup due date</dt><dd>{session.setupDueAt ? new Date(session.setupDueAt).toLocaleDateString(undefined, { dateStyle: "medium" }) : "Awaiting login"}</dd><dt>Owner monthly payment</dt><dd>{session.monthlyAmount}</dd><dt>Your referral commission</dt><dd>{session.commission} · {session.verified ? "Verified" : "Pending verification"}</dd></dl>
          <div className={styles.note}>The account is officially onboarded. The team will verify the saved login during the 3-day checking period for accounts over one year old, or 7 days for newer accounts. The owner must remain reachable and complete any LinkedIn verification requested before payment is released. Monthly payment dates are calculated after the setup payment is made.</div>
          <Link className={styles.primary} href={`/m/${token}`}>Back to your dashboard →</Link>
          <a className={styles.secondary} href={`/m/${token}/onboarding`}>Onboard another person</a>
        </>}
        </section>
      </div>}
      </div>
    </div>
  </main>;
}
