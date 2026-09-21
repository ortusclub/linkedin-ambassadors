"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { type CurrencyConfig } from "@/lib/referral-currency";
import styles from "./wizard.module.css";
import { countries, countryCode } from "@/lib/countries";
import BrowserStep from "./browser-step";
import PhoneHandoff from "./phone-handoff";
import EmailStep, { type EmailSetup } from "./email-step";
import { CoachTour, type TourStep } from "./coach-tour";

// Per-page coach tours — the first time a referrer reaches each page they get a short
// walkthrough of that screen. "Skip tour" stops all of them; each is also replayable.
const TOUR_KEY = (page: string) => `lv_diy_tour_${page}`;
const TOUR_ALL = "lv_diy_tour_all";
const PAGE_TOURS: Record<string, TourStep[]> = {
  before: [
    { title: "Welcome — quick tour", body: "You'll do this together with the account owner, on one device, in about 10 minutes. Here's the lay of the land." },
    { target: "rail", title: "See all 6 steps anytime", body: "Tap \"How it works\" to expand the full flow and see where you are. It saves as you go." },
    { target: "need", title: "Check they're ready", body: "Before you start, make sure the owner has these — and that they'll stay with you the whole way." },
    { target: "consent", title: "Get their OK", body: "Once they're happy and agree to the terms, tick this box, then hit Start." },
  ],
  details: [
    { title: "Their details", body: "Let the owner type their own details where they can — it's their account. You just guide them." },
    { target: "age", title: "How old is the account", body: "This sets when the setup fee lands — about 3 days for an older account, about a week for a newer one." },
    { target: "verified", title: "Is it verified?", body: "Check their profile for a Verified badge. A verified account pays you the top rate, so check rather than guess." },
  ],
  payout: [
    { target: "payout-method", title: "Where THEY get paid", body: "These are the account owner's payout details. Your own commission uses the details on your portal, not this." },
    { target: "payout-when", title: "When the money moves", body: "Once signed in, the account is onboarded; we verify it, then their fee goes out and yours follows the next Monday." },
  ],
  signin: [
    { target: "signin-choice", title: "Who signs in?", body: "On a laptop you do the sign-in and earn the most. No computer? \"Hand it to us\" and the team does it — they still get paid, you earn a little less." },
  ],
};
import { ShareLinks, WaitNotice, type ScriptContext } from "./onboarding-scripts";

type Session = {
  emailSetup: EmailSetup | null;
  country: string | null; proxyAssigned: boolean; proxyPriceLimit: number;
  id: string; name: string; state: string; opened: boolean; shareLink: string | null;
  confirmedAt: string | null; accountFreshness: string | null; setupDueAt: string | null; setupAmount: string;
  monthlyAmount: string; commission: string; verified: boolean;
};
type Bootstrap = { emailEnabled: boolean; phoneVerificationEnabled: boolean; countries: string[]; autoPurchase: boolean; config: CurrencyConfig; configured: boolean; sessions: { id: string; state: string; name: string }[] };

const PAYOUT_FIELDS: Record<string, { label: string; type?: string; placeholder: string; help: string }> = {
  GCash: { label: "GCash mobile number", type: "tel", placeholder: "+63 9XX XXX XXXX", help: "Enter the mobile number registered to their GCash account." },
  Maya: { label: "Maya mobile number", type: "tel", placeholder: "+63 9XX XXX XXXX", help: "Enter the mobile number registered to their Maya account." },
  Maribank: { label: "Maribank mobile number", type: "tel", placeholder: "+63 9XX XXX XXXX", help: "Enter the mobile number registered to their Maribank account." },
  GoTyme: { label: "GoTyme account number", placeholder: "GoTyme account number", help: "Enter their GoTyme Bank account number (or the mobile number linked to it)." },
  UnionBank: { label: "UnionBank account number", placeholder: "Account number", help: "Enter their UnionBank account number." },
  BPI: { label: "BPI account number", placeholder: "Account number", help: "Enter their BPI account number." },
  BDO: { label: "BDO account number", placeholder: "Account number", help: "Enter their BDO account number." },
  UPI: { label: "UPI ID", placeholder: "name@bank", help: "Enter their UPI ID, sometimes called a virtual payment address—not a bank account number." },
  PayPal: { label: "PayPal email address", type: "email", placeholder: "name@example.com", help: "Use the email address confirmed on their PayPal account." },
  Wise: { label: "Wise email address", type: "email", placeholder: "name@example.com", help: "Use the email address registered to their Wise account." },
  "Bank transfer": { label: "Bank transfer details", placeholder: "Bank name, account number and routing / SWIFT details", help: "Include the bank name, account number and the routing, sort, IFSC or SWIFT code required in their country." },
};
const PROXY_COUNTRIES = ["IN", "GB", "US", "PH"];
// Setup-fee checking window. We wait ~24h before signing in, so it's about 3 days for
// an established account and about a week for a newer one.
const checkWindow = (freshness?: string | null) => freshness === "established" ? "about 3 days" : "about a week";

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
  const [railOpen, setRailOpen] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const [browserMode, setBrowserMode] = useState<"" | "pc" | "phone">("");
  const [handedOff, setHandedOff] = useState(false);
  const [idCheck, setIdCheck] = useState({ hasGovernmentId: false, nameMatchesId: false });
  const [accountVerified, setAccountVerified] = useState<"" | "yes" | "no" | "unsure">("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [form, setForm] = useState({ fullName: "", email: "", linkedinUrl: "", country: "", contactNumber: "", phoneVerificationToken: "", accountFreshness: "established", paymentMethod: "", paymentDetails: "", payoutName: "", bankName: "", bankAccountNumber: "", bankRoutingNumber: "", ownerPhotoUrl: "" });

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

  // Which page's coach tour applies right now (null = no tour for this screen).
  const tourKey = step === 0 ? "before" : step === 1 ? "details" : step === 2 ? "payout" : (step === 4 && browserMode === "") ? "signin" : null;
  // First-timer coach tour — auto-shows once per page; "Skip tour" stops all of them.
  useEffect(() => {
    if (!bootstrap || !tourKey) { setShowTour(false); return; }
    try { if (!localStorage.getItem(TOUR_ALL) && !localStorage.getItem(TOUR_KEY(tourKey))) setShowTour(true); } catch { /* storage blocked */ }
  }, [bootstrap, tourKey]);
  const endTour = (skipped: boolean) => {
    setShowTour(false);
    try { if (tourKey) localStorage.setItem(TOUR_KEY(tourKey), "1"); if (skipped) localStorage.setItem(TOUR_ALL, "1"); } catch { /* ignore */ }
  };

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
  async function handoff(body: { password: string; twoFactorKey: string }) {
    if (!session) return;
    await run(async () => {
      await request("PATCH", { id: session.id, action: "handoff", ...body });
      setHandedOff(true);
    });
  }
  async function action(action: "prepare" | "opened") {
    if (!session) return;
    const data = await request("PATCH", { id: session.id, action });
    showSession(data.session);
  }
  async function confirmLogin(creds: { password: string; twoFactorKey: string }) {
    if (!session) return;
    await run(async () => {
      const data = await request("PATCH", { id: session.id, action: "confirm", ...creds });
      showSession(data.session);
    });
  }
  async function uploadPhoto(file: File) {
    setPhotoBusy(true); setPhotoError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`${endpoint}/photo`, { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      setForm((f) => ({ ...f, ownerPhotoUrl: data.url }));
    } catch (e) { setPhotoError(e instanceof Error ? e.message : "Upload failed."); }
    finally { setPhotoBusy(false); }
  }
  const field = (key: keyof typeof form, label: string, type = "text", placeholder = "", required = true) => (
    <label className={styles.field}>{label}<input required={required} type={type} value={form[key]} maxLength={key === "paymentDetails" ? 500 : 254} placeholder={placeholder}
      onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>
  );

  const wizardSteps = [
    { index: 0, label: "Start together", detail: "The account owner must stay with you for the entire setup." },
    { index: 1, label: "Owner details", detail: "Add their LinkedIn and contact details." },
    { index: 2, label: "Payout", detail: "Record where the account owner should be paid." },
    ...(bootstrap?.emailEnabled ? [{ index: 3, label: "Add secure email", detail: "The account owner approves a LinkedVelocity-managed email on LinkedIn." }] : []),
    { index: 4, label: "Prepare & sign in", detail: "The account owner enters their login, codes and completes any checks." },
    { index: 5, label: "Team verification", detail: "We check the saved session before activation and payment." },
  ];
  const currentPos = Math.max(0, wizardSteps.findIndex((s) => s.index === step));
  const activeStep = wizardSteps[currentPos];
  // Currency follows the referrer (₱ for PH, $ for USD referrers) — everything the
  // wizard shows about money comes from bootstrap.config, never hardcoded pesos.
  const cfg = bootstrap?.config;
  const fmtMoney = (n: number) => cfg ? `${cfg.symbol}${n.toLocaleString("en-US")}` : "";
  const refBase = cfg ? fmtMoney(cfg.referralTiers.referral) : "";
  const refMax = cfg ? fmtMoney(cfg.referralTiers.computer.verified) : "";
  const phoneRange = cfg ? `${fmtMoney(cfg.referralTiers.phone.base)}–${fmtMoney(cfg.referralTiers.phone.verified)}` : "";
  const computerRange = cfg ? `${fmtMoney(cfg.referralTiers.computer.base)}–${fmtMoney(cfg.referralTiers.computer.verified)}` : "";
  const payoutField = PAYOUT_FIELDS[form.paymentMethod] || { label: "Payout details", placeholder: "Account number or payment address", help: "Enter everything needed to send the payment." };
  const scriptCtx: ScriptContext = {
    name: session?.name || form.fullName,
    address: session?.emailSetup?.address || null,
    termsUrl: `${typeof window !== "undefined" ? window.location.origin : "https://linkedvelocity.com"}/ambassador-terms`,
    guideUrl: `${typeof window !== "undefined" ? window.location.origin : "https://linkedvelocity.com"}/ambassador-guide`,
    setupDays: form.accountFreshness === "established" ? 3 : 7,
  };
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
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <Link href={`/m/${token}`} className={styles.headerBack}>← Dashboard</Link>
          <span className={styles.headerTitle}>DIY onboarding</span>
          {bootstrap && <span className={styles.headerStep}>Step {currentPos + 1} of {wizardSteps.length}</span>}
        </div>
        <div className={styles.progress} aria-hidden="true">
          {wizardSteps.map((s, i) => <span key={s.label} style={{ background: i <= currentPos ? "#16a34a" : "rgba(255,255,255,.16)" }} />)}
        </div>
      </header>

      <div className={styles.content}>
        {error && step !== 4 && <div className={styles.error} role="alert">{error}</div>}
        {!bootstrap && error && <button className={styles.primary} onClick={() => { setError(""); setLoadAttempt((n) => n + 1); }}>Retry loading onboarding</button>}
        {!bootstrap && !error && <p className={styles.loading} role="status">Loading onboarding…</p>}

        {bootstrap && <>
          {railOpen ? <div className={styles.railOpen}>
            <div className={styles.railKick}>HOW IT WORKS</div>
            <h2>One setup, {wizardSteps.length} clear steps</h2>
            <p>It usually takes about 10 minutes. Don&apos;t begin unless the account owner can stay until sign-in is complete.</p>
            {wizardSteps.map((item, position) => {
              const complete = item.index < step;
              return <div key={item.label} className={styles.railStep}>
                <span className={styles.railDot}>{complete ? "✓" : position + 1}</span>
                <span><strong>{item.label}</strong><small>{item.detail}</small></span>
              </div>;
            })}
            <button type="button" className={styles.linkBtn} onClick={() => setRailOpen(false)}>Hide steps ▲</button>
          </div> : <button type="button" data-tour="rail" className={styles.rail} onClick={() => setRailOpen(true)}>
            <span className={styles.railKick}>HOW IT WORKS</span>
            <span className={styles.railNext}>Now: {activeStep?.label}</span>
            <span className={styles.railToggle}>Show all ▼</span>
          </button>}

          {showTour && tourKey && PAGE_TOURS[tourKey] && <CoachTour steps={PAGE_TOURS[tourKey]} onDone={endTour} />}

          {step === 0 && <>
            <h1 className={styles.heroTitle}>Before you begin</h1>
            <p className={styles.lead}>You&apos;re the referrer. You&apos;re onboarding the <strong>account owner</strong> — the person whose LinkedIn this is. Six steps, about ten minutes, done together.</p>
            <button type="button" className={styles.linkBtn} style={{ width: "auto", textAlign: "left", padding: "0 0 10px", color: "#15803d" }} onClick={() => setShowTour(true)}>New here? Take the quick tour →</button>
            <div className={styles.warn}>
              <div>Don&apos;t start unless they can stay</div>
              <p>LinkedIn will send codes and may ask them to confirm who they are. If they walk away halfway, the account can&apos;t be finished and nobody gets paid.</p>
            </div>
            <div className={styles.card} data-tour="need">
              <div className={styles.cardTitle}>They need, right now</div>
              <div className={styles.rowLine}><span className={styles.tick}>✓</span><span className={styles.rowText}>Their LinkedIn email and password — on a computer you use it to sign in, with them sitting right there.</span></div>
              <div className={styles.rowLine}><span className={styles.tick}>✓</span><span className={styles.rowText}>An inbox open in front of you for LinkedIn&apos;s confirmation code — yours or theirs, either is fine.</span></div>
              <div className={styles.rowLine}><span className={styles.tick}>✓</span><span className={styles.rowText}>A government ID somewhere at home — we never take a copy, LinkedIn may ask them later.</span></div>
              <div className={styles.rowLine}><span className={styles.tick}>✓</span><span className={styles.rowText}>A way for you to reach them again — you&apos;re our contact for this account, not them.</span></div>
            </div>
            <ShareLinks ctx={scriptCtx} />
            <div className={styles.note}>
              <div style={{ font: "700 13px 'Plus Jakarta Sans'", color: "#166534", marginBottom: 8 }}>Who gets what</div>
              <div className={styles.payRow}><span>They get</span><span className={styles.payAmt}>{bootstrap.config.offer.setup} + {bootstrap.config.offer.monthly}/mo</span></div>
              <div className={styles.payRow}><span>You get</span><span className={styles.payAmt}>{refBase}–{refMax}</span></div>
              <p style={{ margin: "10px 0 0", fontWeight: 500 }}>Your exact rate is set at the sign-in step, by who does the final sign-in and whether the account is ID-verified.</p>
            </div>
            <div className={styles.consentCard} data-tour="consent">
              <label className={styles.check}><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <span>They&apos;re here with me, they meet <a href="https://www.linkedin.com/help/linkedin/answer/a6854067" target="_blank" rel="noreferrer">LinkedIn&apos;s minimum age (16, or older where local law requires)</a>, they can reach their own email and phone, and they agree to add a LinkedVelocity email and share access under the <a href="/ambassador-terms" target="_blank" rel="noreferrer">terms</a>.</span></label>
            </div>
            {!bootstrap.configured && <p className={styles.note}>You can enter the details now. The team will need to configure browser access before you can save and continue to sign-in.</p>}
            {bootstrap.configured && !bootstrap.autoPurchase && bootstrap.countries.length === 0 && <p className={styles.note}>You can enter the details now. A dedicated proxy will be needed before you can save and continue to sign-in.</p>}
            <button data-tour="start" className={styles.primary} disabled={!consent} onClick={() => setStep(1)}>Start onboarding →</button>
            {bootstrap.sessions.length > 0 && <div className={styles.resume}><h3>Your saved onboardings</h3>{bootstrap.sessions.map((s) => <button key={s.id} disabled={busy} onClick={() => run(async () => showSession((await request("GET", undefined, s.id)).session))}>
              <span>{s.name}</span><span>{s.state === "confirmed" ? "View summary" : "Resume"} →</span></button>)}</div>}
          </>}

          {step === 1 && <form onSubmit={(e) => { e.preventDefault(); if (bootstrap.phoneVerificationEnabled && !form.phoneVerificationToken) { setPhoneError("Verify the mobile number before continuing."); return; } setError(""); setStep(2); }}>
            <h1 className={styles.heroTitle}>Who&apos;s the account owner?</h1>
            <p className={styles.lead}>Let them type their own details where they can — it&apos;s their account.</p>
            <div className={styles.card}>
            {field("fullName", "Full name, as on their ID", "text", "Their full name")}
            {field("email", "Their own email", "email", "them@gmail.com")}
            <label className={styles.field}>Mobile, with country code<input required type="tel" value={form.contactNumber} placeholder="+63 912 345 6789" onChange={(e) => { setForm({ ...form, contactNumber: e.target.value, phoneVerificationToken: "" }); setPhoneCode(""); setPhoneCodeSent(false); setPhoneError(""); }} /></label>
            <p className={styles.hint}>Only needed if we ever have to reach them directly — day to day comes to you.</p>
            {bootstrap.phoneVerificationEnabled && <div>
              {form.phoneVerificationToken ? <div className={styles.verifiedPhone}>✓ Mobile number verified</div> : <>
                <button type="button" className={styles.verifyButton} disabled={phoneBusy || form.contactNumber.trim().length < 8} onClick={() => void verifyPhone("send")}>{phoneBusy && !phoneCodeSent ? "Sending…" : phoneCodeSent ? "Send a new code" : "Send verification code"}</button>
                {phoneCodeSent && <div className={styles.verificationRow}><input className={styles.codeInput} inputMode="numeric" autoComplete="one-time-code" value={phoneCode} maxLength={10} placeholder="SMS code" onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, ""))} /><button type="button" className={styles.verifyButton} disabled={phoneBusy || phoneCode.length < 4} onClick={() => void verifyPhone("check")}>{phoneBusy ? "Checking…" : "Verify number"}</button></div>}
                {phoneCodeSent && <p className={styles.phoneHint}>Ask the account owner to read you the code sent to this phone.</p>}
                {phoneError && <p className={styles.phoneError} role="alert">{phoneError}</p>}
              </>}
            </div>}
            {field("linkedinUrl", "Their LinkedIn profile link", "url", "linkedin.com/in/their-name")}
            <label className={styles.field}>Country the account is normally used in<select required value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
              <option value="">Choose their country</option>{countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select></label><p className={styles.hint}>We match their connection to this country, so LinkedIn keeps seeing them log in from home.</p>
            </div>

            <div className={styles.card} data-tour="age">
              <div className={styles.cardTitle}>How old is the account?</div>
              <button type="button" className={`${styles.optionCard} ${form.accountFreshness === "established" ? styles.optionOn : ""}`} onClick={() => setForm({ ...form, accountFreshness: "established" })}><span className={styles.radio} /><span><strong>More than a month old</strong><small>Three-day check, then payment</small></span></button>
              <button type="button" className={`${styles.optionCard} ${form.accountFreshness === "fresh" ? styles.optionOn : ""}`} onClick={() => setForm({ ...form, accountFreshness: "fresh" })}><span className={styles.radio} /><span><strong>Less than a month old</strong><small>About a week before payment, and expect the odd restriction</small></span></button>
            </div>

            <div className={styles.card} data-tour="verified">
              <div className={styles.cardTitle}>Is their LinkedIn already verified?</div>
              <p className={styles.cardSub}>Open their profile together and look under their name — a verified profile says &ldquo;Verified&rdquo; there. This changes what you earn, so check rather than guess.</p>
              {([{ v: "yes", t: "Yes — it says Verified", s: "Top rate: your commission goes up" }, { v: "no", t: "No, not verified", s: "Fine, they can still do it later" }, { v: "unsure", t: "Not sure yet", s: "We'll confirm it during the checks" }] as const).map((o) => (
                <button key={o.v} type="button" className={`${styles.optionCard} ${accountVerified === o.v ? styles.optionOn : ""}`} onClick={() => setAccountVerified(o.v)}><span className={styles.radio} /><span><strong>{o.t}</strong><small>{o.s}</small></span></button>
              ))}
              <div className={styles.note} style={{ marginTop: 4 }}>Worth doing now: they can verify with a passport in the LinkedIn app in about two minutes. It makes restrictions much less likely, and it moves you to the top rate.</div>
            </div>
            <div className={styles.card}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}><div className={styles.cardTitle} style={{ marginBottom: 0 }}>A photo of them</div><span style={{ font: "700 9.5px 'Plus Jakarta Sans'", letterSpacing: ".06em", color: "#8b95a5", border: "1px solid #e3e6ea", borderRadius: 5, padding: "3px 6px" }}>OPTIONAL</span></div>
              <p className={styles.cardSub}>Upload one where their full face is clearly visible, smiling if possible. It doesn&apos;t need to be professional — we&apos;ll tidy it up.</p>
              <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                {form.ownerPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.ownerPhotoUrl} alt="Uploaded" width={56} height={56} style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", flex: "none", border: "1px solid #e3e6ea" }} />
                ) : <span style={{ width: 56, height: 56, borderRadius: "50%", flex: "none", background: "#f7f8fa", border: "1px solid #e3e6ea", display: "flex", alignItems: "center", justifyContent: "center", font: "600 9px 'Plus Jakarta Sans'", color: "#98a2b3" }}>No photo</span>}
                <div style={{ minWidth: 0 }}>
                  {form.ownerPhotoUrl
                    ? <button type="button" className={styles.linkBtn} style={{ width: "auto", textAlign: "left", padding: 0 }} onClick={() => setForm({ ...form, ownerPhotoUrl: "" })}>Remove photo</button>
                    : <label className={styles.secondary} style={{ cursor: "pointer", display: "inline-block", width: "auto", padding: "11px 16px" }}>{photoBusy ? "Uploading…" : "Upload a photo"}<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" hidden disabled={photoBusy} onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadPhoto(f); e.target.value = ""; }} /></label>}
                  <p className={styles.hint} style={{ margin: "8px 0 0" }}>Whatever they send you is fine. Skip it and we&apos;ll ask later.</p>
                </div>
              </div>
              {photoError && <p className={styles.phoneError} style={{ marginTop: 8 }}>{photoError}</p>}
            </div>

            <div className={styles.card}>
              <div className={styles.cardTitle}>ID check</div>
              <p className={styles.cardSub}>We never take a copy. They just need one in case LinkedIn asks them to verify later.</p>
              <div className={styles.check} style={{ margin: "4px 0 0" }}><input type="checkbox" checked={idCheck.hasGovernmentId} onChange={(e) => setIdCheck({ ...idCheck, hasGovernmentId: e.target.checked })} id="hasGovId" /><label htmlFor="hasGovId">They own a <strong>physical government ID</strong> — passport, national ID or driver&apos;s license.</label></div>
              <div className={styles.check}><input type="checkbox" checked={idCheck.nameMatchesId} onChange={(e) => setIdCheck({ ...idCheck, nameMatchesId: e.target.checked })} id="nameMatches" /><label htmlFor="nameMatches">The name they gave above <strong>matches the name on that ID</strong>.</label></div>
            </div>
            <div className={styles.actions}><button type="button" className={styles.secondary} onClick={() => setStep(0)}>Back</button><button className={styles.primary} disabled={(bootstrap.phoneVerificationEnabled && !form.phoneVerificationToken) || !idCheck.hasGovernmentId || !idCheck.nameMatchesId || !accountVerified}>Continue →</button></div>
          </form>}

          {step === 2 && <form onSubmit={(e) => { e.preventDefault(); run(async () => showSession((await request("POST", { ...form, consent, ...idCheck, linkedinVerified: accountVerified === "yes" })).session)); }}>
            <h1 className={styles.heroTitle}>Where should they get paid?</h1>
            <p className={styles.lead}>This is <strong>their</strong> {bootstrap.config.offer.setup} and {bootstrap.config.offer.monthly} a month. Your own commission goes to the details on your portal.</p>
            <div className={styles.card} data-tour="payout-method">
            <label className={styles.field}>Pay them via<select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value, paymentDetails: "", bankName: "", bankAccountNumber: "", bankRoutingNumber: "" })}>{bootstrap.config.payoutMethods.map((p) => <option key={p}>{p}</option>)}</select></label>
            {field("payoutName", "Name registered on that account", "text", "Must match the payment account")}
            {form.paymentMethod === "Bank transfer" ? <>
              {field("bankName", "Bank name", "text", "Name of the receiving bank")}
              {field("bankAccountNumber", "Account number or IBAN", "text", "Receiving account number")}
              {field("bankRoutingNumber", "Routing, IFSC, sort or SWIFT code (optional)", "text", "Only if their bank needs one — not required in the Philippines", false)}
            </> : <>
              {field("paymentDetails", payoutField.label, payoutField.type || "text", payoutField.placeholder)}
              <p className={styles.hint}>{payoutField.help}</p>
            </>}
            </div>
            {(!bootstrap.configured || (!bootstrap.autoPurchase && !browserCapacityAvailable)) && <div className={styles.warn}><div>Browser setup isn&apos;t ready yet</div><p>Your entries are only held on this page until you successfully save. Keep this tab open while the team configures browser access, then try Save &amp; continue.</p></div>}
            <div className={styles.infoBlue} data-tour="payout-when"><div>When their money arrives</div><p>Once the sign-in is saved, the account counts as onboarded. We then verify it — {checkWindow(form.accountFreshness)}, because we wait about 24 hours before signing in — and their {bootstrap.config.offer.setup} goes out. {bootstrap.config.offer.monthly} follows on the 1st of each month. They need to stay reachable for the odd LinkedIn check.</p></div>
            <div className={styles.actions}><button type="button" disabled={busy} className={styles.secondary} onClick={() => setStep(1)}>Back</button><button className={styles.primary} disabled={busy}>{busy ? "Saving…" : "Save & continue →"}</button></div>
          </form>}

          {step === 3 && session?.emailSetup && <>
            <div className={styles.stepLabel}>Add secure email</div>
            <EmailStep key={`${session.id}-${session.emailSetup.forwardingActive}-${session.emailSetup.lastForwardedAt || "waiting"}`} setup={session.emailSetup} busy={busy} submit={emailAction} refresh={() => run(async () => showSession((await request("GET", undefined, session.id)).session))} />
          </>}

          {step === 4 && session && (handedOff ? <>
            <div className={styles.success}>✓</div>
            <h1 className={styles.heroTitle}>Handed off to the team</h1>
            <p className={styles.lead}>{session.name}&apos;s account is saved with the sign-in details. We&apos;ll set up the protected browser and sign in — we wait about 24 hours before the final sign-in (it lowers the chance of an ID check). The setup payment follows once the account is verified, <strong>{checkWindow(session.accountFreshness)}</strong> after onboarding. Nothing more to do here.</p>
            <a className={styles.secondary} href={`/m/${token}/onboarding`}>Onboard another account owner</a>
          </> : browserMode === "" ? <>
            <h1 className={styles.heroTitle}>Who does the sign-in?</h1>
            <p className={styles.lead}>This is the last step, and it sets your rate: on a laptop you do the sign-in, on a phone we do.</p>
            <button type="button" data-tour="signin-choice" className={styles.choiceCard} onClick={() => setBrowserMode("phone")}>
              <div className={styles.choiceHead}><strong>Hand it to us</strong><span className={styles.rateChip}>{phoneRange}</span></div>
              <p>Works on a phone. They set a temporary password, our team does the sign-in, and their payment timeline doesn&apos;t change.</p>
            </button>
            <button type="button" className={`${styles.choiceCard} ${styles.choiceHi}`} onClick={() => setBrowserMode("pc")}>
              <div className={styles.choiceHead}><strong>I&apos;ll do it on a laptop</strong><span className={`${styles.rateChip} ${styles.rateChipHi}`}>{computerRange}</span></div>
              <p>You open the protected browser and sign in to their LinkedIn with them beside you. Highest rate.</p>
              <div className={styles.choiceNote}>Needs a Windows or Mac computer.</div>
            </button>
          </> : browserMode === "phone" ? <>
            <button className={styles.linkBtn} disabled={busy} onClick={() => setBrowserMode("")}>← Back to computer or phone</button>
            <PhoneHandoff busy={busy} error={error} submit={handoff} />
          </> : <>
            <button className={styles.linkBtn} disabled={busy} onClick={() => setBrowserMode("")}>← Back to computer or phone</button>
            <div className={styles.infoBlue}><div>This step needs a computer</div><p>The sign-in uses GoLogin desktop software. If you&apos;re on a phone, copy this link and open it on a Windows or Mac computer with the account owner.</p></div>
            <button type="button" className={styles.secondary} onClick={() => void moveToComputer()}>{linkCopied ? "Onboarding link copied ✓" : "Copy / share this link"}</button>
            <WaitNotice primaryConfirmedAt={session.emailSetup?.primaryConfirmedAt || null} />
            {session.emailSetup && <><div className={styles.emailAddressCard}><span>LinkedIn login email</span><strong>{session.emailSetup.address}</strong><button type="button" onClick={() => { if (session.emailSetup?.address) { navigator.clipboard?.writeText(session.emailSetup.address); setEmailCopied(true); setTimeout(() => setEmailCopied(false), 1800); } }}>{emailCopied ? "Copied ✓" : "Copy email"}</button></div><div className={styles.note}>{session.emailSetup.forwardingActive ? "Verification messages are temporarily forwarded to the verified inbox." : "Onboarding forwarding has expired. Re-verify the inbox if you need more login codes."}</div><button className={styles.linkBtn} disabled={busy} onClick={() => setStep(3)}>Manage onboarding email</button></>}
            <BrowserStep key={`${session.id}-${session.state}-${session.opened}`} session={session} busy={busy} error={error} action={(nextAction) => run(() => action(nextAction))} confirm={confirmLogin} refresh={() => run(async () => showSession((await request("GET", undefined, session.id)).session))} />
          </>)}

          {step === 5 && session && <>
            <div className={styles.success}>✓</div>
            <h1 className={styles.heroTitle}>That&apos;s them onboarded</h1>
            <p className={styles.lead}>{session.name}&apos;s account is in our system and linked to your code. Nothing else for either of you to do today.</p>
            <div className={styles.card}>
              <div className={styles.summaryRow}><span>Their setup payment</span><b>{session.setupAmount}</b></div>
              <div className={styles.summaryRow}><span>Their monthly payment</span><b>{session.monthlyAmount}/mo</b></div>
              <div className={styles.summaryRow}><span>Your commission</span><b>{session.commission} · {session.verified ? "Verified" : "Pending"}</b></div>
              <div className={styles.summaryRow}><span>Due date</span><b>{session.setupDueAt ? new Date(session.setupDueAt).toLocaleDateString(undefined, { dateStyle: "medium" }) : "After the check"}</b></div>
            </div>
            <div className={styles.note}><strong>What we do next.</strong> We test the sign-in over {checkWindow(session.accountFreshness)}. If LinkedIn asks for a check in that time, <strong>we message you</strong>, not them — you&apos;re our contact for this account, so keep your phone on. Once it clears, their {session.setupAmount} goes out and your commission lands the following Monday.</div>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Tell them before you go</div>
              <p className={styles.cardSub} style={{ marginBottom: 8 }}>Don&apos;t post, message or browse from your own phone while it&apos;s with us — being logged in from two places is what causes restrictions.</p>
              <p className={styles.cardSub} style={{ margin: 0 }}>And if anything is ever needed on the account, it comes through you — so make sure they&apos;ll pick up when you call.</p>
            </div>
            <Link className={styles.primary} href={`/m/${token}`}>Back to my portal →</Link>
            <a className={styles.secondary} href={`/m/${token}/onboarding`} style={{ marginTop: 9 }}>Onboard someone else</a>
          </>}
        </>}
      </div>
    </div>
  </main>;
}
