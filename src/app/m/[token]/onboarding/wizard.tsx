"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { type CurrencyConfig } from "@/lib/referral-currency";
import styles from "./wizard.module.css";
import { countries, countryCode } from "@/lib/countries";
import BrowserStep from "./browser-step";
import PhoneHandoff from "./phone-handoff";
import EmailStep, { type EmailSetup } from "./email-step";
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
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const [browserMode, setBrowserMode] = useState<"" | "pc" | "phone">("");
  const [handedOff, setHandedOff] = useState(false);
  const [idCheck, setIdCheck] = useState({ hasGovernmentId: false, nameMatchesId: false });
  const [accountVerified, setAccountVerified] = useState<"" | "yes" | "no">("");
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
          </div> : <button type="button" className={styles.rail} onClick={() => setRailOpen(true)}>
            <span className={styles.railKick}>HOW IT WORKS</span>
            <span className={styles.railNext}>Now: {activeStep?.label}</span>
            <span className={styles.railToggle}>Show all ▼</span>
          </button>}

          {step === 0 && <>
            <h1 className={styles.heroTitle}>Before you begin</h1>
            <p className={styles.lead}>You&apos;re the referrer. You&apos;re onboarding the <strong>account owner</strong> — the person whose LinkedIn this is. Six steps, about ten minutes, done together.</p>
            <div className={styles.warn}>
              <div>Don&apos;t start unless they can stay</div>
              <p>LinkedIn will send codes and may ask them to confirm who they are. If they walk away halfway, the account can&apos;t be finished and nobody gets paid.</p>
            </div>
            <div className={styles.card}>
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
            <div className={styles.consentCard}>
              <label className={styles.check}><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <span>They&apos;re here with me, they meet <a href="https://www.linkedin.com/help/linkedin/answer/a6854067" target="_blank" rel="noreferrer">LinkedIn&apos;s minimum age (16, or older where local law requires)</a>, they can reach their own email and phone, and they agree to add a LinkedVelocity email and share access under the <a href="/ambassador-terms" target="_blank" rel="noreferrer">terms</a>.</span></label>
            </div>
            {!bootstrap.configured && <p className={styles.note}>You can enter the details now. The team will need to configure browser access before you can save and continue to sign-in.</p>}
            {bootstrap.configured && !bootstrap.autoPurchase && bootstrap.countries.length === 0 && <p className={styles.note}>You can enter the details now. A dedicated proxy will be needed before you can save and continue to sign-in.</p>}
            <button className={styles.primary} disabled={!consent} onClick={() => setStep(1)}>Start onboarding →</button>
            {bootstrap.sessions.length > 0 && <div className={styles.resume}><h3>Your saved onboardings</h3>{bootstrap.sessions.map((s) => <button key={s.id} disabled={busy} onClick={() => run(async () => showSession((await request("GET", undefined, s.id)).session))}>
              <span>{s.name}</span><span>{s.state === "confirmed" ? "View summary" : "Resume"} →</span></button>)}</div>}
          </>}

          {step === 1 && <form onSubmit={(e) => { e.preventDefault(); if (bootstrap.phoneVerificationEnabled && !form.phoneVerificationToken) { setPhoneError("Verify the mobile number before continuing."); return; } setError(""); setStep(2); }}>
            <div className={styles.stepLabel}>Account owner</div>
            <h1 className={styles.heroTitle}>Who&apos;s the account owner?</h1>
            <p className={styles.lead}>A few details about the account owner connect the account, your referral and payouts.</p>
            {field("fullName", "Account owner's full name")}
            {field("email", "Account owner's email", "email")}
            <label className={styles.field}>Mobile number, including country code<input required type="tel" value={form.contactNumber} placeholder="+63 912 345 6789" onChange={(e) => { setForm({ ...form, contactNumber: e.target.value, phoneVerificationToken: "" }); setPhoneCode(""); setPhoneCodeSent(false); setPhoneError(""); }} /></label>
            {bootstrap.phoneVerificationEnabled && <div>
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
            <label className={styles.field}>Is the account already verified on LinkedIn?<select value={accountVerified} onChange={(e) => setAccountVerified(e.target.value as "" | "yes" | "no")}><option value="">Choose one</option><option value="no">No / not sure</option><option value="yes">Yes — it has the ID-verified badge</option></select></label><p className={styles.hint}>LinkedIn shows a verified badge when the owner has confirmed their identity (usually with a passport). Check their profile if you&apos;re not sure.</p>
            <div className={styles.check} style={{ margin: "10px 0 0" }}><input type="checkbox" checked={idCheck.hasGovernmentId} onChange={(e) => setIdCheck({ ...idCheck, hasGovernmentId: e.target.checked })} id="hasGovId" /><label htmlFor="hasGovId">The account owner has a <strong>physical government ID</strong> (passport, national ID or driver&apos;s license). We don&apos;t collect it, but they must have one in case LinkedIn asks them to verify later.</label></div>
            <div className={styles.check}><input type="checkbox" checked={idCheck.nameMatchesId} onChange={(e) => setIdCheck({ ...idCheck, nameMatchesId: e.target.checked })} id="nameMatches" /><label htmlFor="nameMatches">The account owner&apos;s full name above <strong>matches the name on that ID</strong>.</label></div>
            <div style={{ margin: "14px 0 4px" }}>
              <div className={styles.fieldLabel}>Profile photo <span style={{ color: "#98a2b3", fontWeight: 600 }}>(optional)</span></div>
              <p className={styles.hint} style={{ marginBottom: 9 }}>Upload one where their full face is clearly visible, smiling if possible. It doesn&apos;t need to be professional — we&apos;ll tidy it up. Just upload something.</p>
              {form.ownerPhotoUrl ? <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.ownerPhotoUrl} alt="Uploaded" width={48} height={48} style={{ width: 48, height: 48, borderRadius: 10, objectFit: "cover", border: "1px solid #e3e6ea" }} />
                <span className={styles.note} style={{ margin: 0, padding: "8px 12px" }}>Photo added ✓</span>
                <button type="button" className={styles.linkBtn} style={{ width: "auto" }} onClick={() => setForm({ ...form, ownerPhotoUrl: "" })}>Remove</button>
              </div> : <label className={styles.secondary} style={{ cursor: "pointer", display: "inline-block", width: "auto", padding: "12px 18px" }}>
                {photoBusy ? "Uploading…" : "Upload a photo"}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" hidden disabled={photoBusy} onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadPhoto(f); e.target.value = ""; }} />
              </label>}
              {photoError && <p className={styles.phoneError} style={{ marginTop: 8 }}>{photoError}</p>}
            </div>
            <div className={styles.actions}><button type="button" className={styles.secondary} onClick={() => setStep(0)}>Back</button><button className={styles.primary} disabled={(bootstrap.phoneVerificationEnabled && !form.phoneVerificationToken) || !idCheck.hasGovernmentId || !idCheck.nameMatchesId || !accountVerified}>Continue →</button></div>
          </form>}

          {step === 2 && <form onSubmit={(e) => { e.preventDefault(); run(async () => showSession((await request("POST", { ...form, consent, ...idCheck, linkedinVerified: accountVerified === "yes" })).session)); }}>
            <div className={styles.stepLabel}>Payout</div>
            <h1 className={styles.heroTitle}>Where should the account owner get paid?</h1>
            <p className={styles.lead}>These are the <strong>account owner&apos;s</strong> payout details. Your referral commission, as the referrer, uses your own dashboard details.</p>
            <label className={styles.field}>Payout method<select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value, paymentDetails: "", bankName: "", bankAccountNumber: "", bankRoutingNumber: "" })}>{bootstrap.config.payoutMethods.map((p) => <option key={p}>{p}</option>)}</select></label>
            {field("payoutName", "Name registered on the payout account", "text", "Must match the payment account")}
            {form.paymentMethod === "Bank transfer" ? <>
              {field("bankName", "Bank name", "text", "Name of the receiving bank")}
              {field("bankAccountNumber", "Account number or IBAN", "text", "Receiving account number")}
              {field("bankRoutingNumber", "Routing, IFSC, sort or SWIFT code (optional)", "text", "Only if their bank needs one — not required in the Philippines", false)}
            </> : <>
              {field("paymentDetails", payoutField.label, payoutField.type || "text", payoutField.placeholder)}
              <p className={styles.hint}>{payoutField.help}</p>
            </>}
            {(!bootstrap.configured || (!bootstrap.autoPurchase && !browserCapacityAvailable)) && <div className={styles.warn}><div>Browser setup isn&apos;t ready yet</div><p>Your entries are only held on this page until you successfully save. Keep this tab open while the team configures browser access, then try Save &amp; continue.</p></div>}
            <div className={styles.infoBlue}><div>What happens next</div><p>We&apos;ll save the onboarding record, then guide you and the account owner through adding a shared LinkedVelocity email to their LinkedIn account. The account owner will receive and approve any confirmation codes.</p></div>
            <div className={styles.note}><strong>When the account owner gets paid.</strong> Once the email is set and the account is signed in, it&apos;s officially onboarded. We don&apos;t sign in straight away — we wait about 24 hours first (it lowers the chance LinkedIn asks for an ID check). The setup payment then lands <strong>{checkWindow(form.accountFreshness)}</strong> after onboarding{form.accountFreshness === "established" ? " for an established account" : " for a newer account"}, once the check passes. They must stay reachable and complete any verification LinkedIn asks for.</div>
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
            <div className={styles.stepLabel}>Prepare &amp; sign in</div>
            <h1 className={styles.heroTitle}>Computer or phone?</h1>
            <p className={styles.lead}>This decides who does the final LinkedIn sign-in, and what you earn.</p>
            <button type="button" className={`${styles.choiceCard} ${styles.choiceHi}`} onClick={() => setBrowserMode("pc")}>
              <div className={styles.choiceHead}><strong>💻 On a computer</strong><span className={`${styles.rateChip} ${styles.rateChipHi}`}>{computerRange}</span></div>
              <p>You do the sign-in yourself in the prepared GoLogin browser. Needs a Windows or Mac computer.</p>
              <div className={styles.choiceNote}>Highest rate — the top amount when the account is verified.</div>
            </button>
            <button type="button" className={styles.choiceCard} onClick={() => setBrowserMode("phone")}>
              <div className={styles.choiceHead}><strong>📱 On a phone</strong><span className={styles.rateChip}>{phoneRange}</span></div>
              <p>We do the sign-in for you. You hand over the login securely and the team completes it.</p>
              <div className={styles.choiceNote}>A little less than doing it yourself — more when the account is verified.</div>
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
            <h1 className={styles.heroTitle}>Login confirmation saved</h1>
            <p className={styles.lead}>{session.name}&apos;s account is in the system and linked to your referral.</p>
            <div className={styles.card}>
              <div className={styles.summaryRow}><span>Account owner setup payment</span><b>{session.setupAmount}</b></div>
              <div className={styles.summaryRow}><span>Setup due date</span><b>{session.setupDueAt ? new Date(session.setupDueAt).toLocaleDateString(undefined, { dateStyle: "medium" }) : "Awaiting login"}</b></div>
              <div className={styles.summaryRow}><span>Account owner monthly payment</span><b>{session.monthlyAmount}</b></div>
              <div className={styles.summaryRow}><span>Your referral commission</span><b>{session.commission} · {session.verified ? "Verified" : "Pending"}</b></div>
            </div>
            <div className={styles.note}>The account is officially onboarded. We wait about 24 hours before signing in, then verify the account — so the setup payment is released <strong>{checkWindow(session.accountFreshness)}</strong> after onboarding, once the check passes. The account owner must stay reachable and complete any LinkedIn verification requested before payment.</div>
            <Link className={styles.primary} href={`/m/${token}`}>Back to your dashboard →</Link>
            <a className={styles.secondary} href={`/m/${token}/onboarding`} style={{ marginTop: 9 }}>Onboard another account owner</a>
          </>}
        </>}
      </div>
    </div>
  </main>;
}
