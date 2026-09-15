"use client";

import { useEffect, useState } from "react";
import styles from "./owner.module.css";
import { countries } from "@/lib/countries";

type Bootstrap = {
  referrerName: string;
  countries: string[];
  payoutMethods: string[];
  emailEnabled: boolean;
  phoneVerificationEnabled: boolean;
  autoPurchase: boolean;
  configured: boolean;
  offer: { setup: string; monthly: string };
};

const PAYOUT_FIELDS: Record<string, { label: string; type?: string; placeholder: string; help: string }> = {
  GCash: { label: "GCash mobile number", type: "tel", placeholder: "+63 9XX XXX XXXX", help: "The mobile number registered to your GCash account." },
  Maya: { label: "Maya mobile number", type: "tel", placeholder: "+63 9XX XXX XXXX", help: "The mobile number registered to your Maya account." },
  UPI: { label: "UPI ID", placeholder: "name@bank", help: "Your UPI ID (a virtual payment address), not a bank account number." },
  PayPal: { label: "PayPal email address", type: "email", placeholder: "name@example.com", help: "The email address confirmed on your PayPal account." },
  Wise: { label: "Wise email address", type: "email", placeholder: "name@example.com", help: "The email address registered to your Wise account." },
  "Bank transfer": { label: "Bank transfer details", placeholder: "Bank name, account number and routing / SWIFT", help: "Bank name, account number and the routing, sort, IFSC or SWIFT code." },
};

export default function OwnerIntake({ slug }: { slug: string }) {
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const [form, setForm] = useState({
    fullName: "", email: "", contactNumber: "", phoneVerificationToken: "", linkedinUrl: "", country: "",
    accountFreshness: "established", paymentMethod: "", paymentDetails: "", payoutName: "",
    bankName: "", bankAccountNumber: "", bankRoutingNumber: "", password: "", twoFactorKey: "",
  });
  const [idCheck, setIdCheck] = useState({ hasGovernmentId: false, nameMatchesId: false, ownerPhotoUrl: "" });
  const [consent, setConsent] = useState(false);
  const [noKey, setNoKey] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  // phone verification
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  useEffect(() => {
    fetch(`/api/onboard/${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then(async (r) => { if (!r.ok) throw new Error((await r.json()).error || "This link is not available."); return r.json(); })
      .then(setBoot)
      .catch((e) => setLoadError(e.message));
  }, [slug]);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const payoutField = PAYOUT_FIELDS[form.paymentMethod] || { label: "Payout details", placeholder: "Account number or payment address", help: "Everything needed to send your payment." };

  async function verifyPhone(action: "send" | "check") {
    setPhoneBusy(true); setPhoneError("");
    try {
      const res = await fetch(`/api/onboard/${encodeURIComponent(slug)}/phone`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "send" ? { action, phone: form.contactNumber } : { action, phone: form.contactNumber, code: phoneCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed.");
      if (action === "send") setPhoneCodeSent(true);
      else set("phoneVerificationToken", data.verificationToken);
    } catch (e) { setPhoneError(e instanceof Error ? e.message : "Verification failed."); }
    finally { setPhoneBusy(false); }
  }

  async function uploadPhoto(file: File) {
    setPhotoBusy(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch(`/api/onboard/${encodeURIComponent(slug)}/photo`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      setIdCheck((c) => ({ ...c, ownerPhotoUrl: data.url }));
    } catch (e) { setError(e instanceof Error ? e.message : "Photo upload failed."); }
    finally { setPhotoBusy(false); }
  }

  const canSubmit = !!boot && consent && !photoBusy
    && form.fullName.trim().length >= 2 && form.email.includes("@") && form.linkedinUrl.includes("/in/")
    && form.country && form.paymentMethod && form.payoutName.trim().length >= 2
    && form.password.trim().length >= 6 && (noKey || form.twoFactorKey.trim().length >= 8)
    && idCheck.hasGovernmentId && idCheck.nameMatchesId
    && (!boot.phoneVerificationEnabled || !!form.phoneVerificationToken);

  async function submit() {
    if (!canSubmit) return;
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/onboard/${encodeURIComponent(slug)}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, twoFactorKey: noKey ? "" : form.twoFactorKey, consent, ...idCheck }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "We couldn't save your details.");
      setDone(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong."); }
    finally { setBusy(false); }
  }

  if (loadError) return <div className={styles.page}><div className={styles.shell}><div className={styles.card}><h2>Link unavailable</h2><p>{loadError}</p></div></div></div>;
  if (!boot) return <div className={styles.page}><div className={styles.shell}><div className={styles.card}><p>Loading…</p></div></div></div>;

  if (done) return <div className={styles.page}><div className={styles.shell}><div className={styles.card}><div className={styles.done}>
    <div className={styles.success}>✓</div>
    <h2>Thank you, {form.fullName.split(" ")[0]}!</h2>
    <p>We&apos;ve received your details. {boot.referrerName} and the LinkedVelocity team will take it from here and complete your onboarding. We may reach out if we need anything else.</p>
    <p className={styles.hint}>You can close this page now.</p>
  </div></div></div></div>;

  const field = (key: keyof typeof form, label: string, type = "text", placeholder = "") => (
    <label className={styles.field}>{label}<input type={type} value={form[key]} placeholder={placeholder} onChange={(e) => set(key, e.target.value)} /></label>
  );

  return <div className={styles.page}><div className={styles.shell}>
    <p className={styles.eyebrow}>LinkedVelocity Onboarding</p>
    <h1>Start your onboarding</h1>
    <p className={styles.subtitle}>{boot.referrerName} invited you to the LinkedVelocity LinkedIn Rental Program. Fill in your details below to get started. You earn <strong>{boot.offer.setup}</strong> for setup and <strong>{boot.offer.monthly}</strong> for every active month.</p>

    {error && <div className={styles.error} role="alert">{error}</div>}

    {/* What to expect + terms */}
    <div className={styles.card}>
      <div className={styles.note}>
        Before you start, please read these so you know exactly what to expect:<br />
        <a href="/ambassador-guide" target="_blank" rel="noreferrer">What to expect with your account →</a><br />
        <a href="/ambassador-terms" target="_blank" rel="noreferrer">Ambassador terms →</a>
      </div>
      <div className={styles.paymentTimeline}>
        <strong>How it works</strong>
        <span>Day 1: you send your photo and add our work email. Day 2: we sign in to your account. Day 3: we check everything is okay and send your setup fee. You keep full access the whole time.</span>
      </div>
    </div>

    {/* Your details */}
    <div className={styles.card}>
      <div className={styles.stepLabel}>YOUR DETAILS</div>
      <h2>Tell us about you and your account</h2>
      {field("fullName", "Your full name (as on your government ID)")}
      {field("email", "Your email address", "email")}
      <label className={styles.field}>Your mobile number, including country code<input type="tel" value={form.contactNumber} placeholder="+63 912 345 6789" onChange={(e) => { set("contactNumber", e.target.value); set("phoneVerificationToken", ""); setPhoneCode(""); setPhoneCodeSent(false); setPhoneError(""); }} /></label>
      {boot.phoneVerificationEnabled && <div className={styles.phoneVerification}>
        {form.phoneVerificationToken ? <div className={styles.verifiedPhone}>✓ Mobile number verified</div> : <>
          <button type="button" className={styles.verifyButton} disabled={phoneBusy || form.contactNumber.trim().length < 8} onClick={() => void verifyPhone("send")}>{phoneBusy && !phoneCodeSent ? "Sending…" : phoneCodeSent ? "Send a new code" : "Send verification code"}</button>
          {phoneCodeSent && <div className={styles.verificationRow}><input inputMode="numeric" autoComplete="one-time-code" value={phoneCode} maxLength={10} placeholder="SMS code" onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, ""))} style={{ background: "#f7f8fa", border: "1px solid #dce2e8", borderRadius: 10, padding: "11px 12px", font: "inherit" }} /><button type="button" className={styles.verifyButton} disabled={phoneBusy || phoneCode.length < 4} onClick={() => void verifyPhone("check")}>{phoneBusy ? "Checking…" : "Verify"}</button></div>}
          {phoneError && <p className={styles.phoneError} role="alert">{phoneError}</p>}
        </>}
      </div>}
      {field("linkedinUrl", "Your LinkedIn profile link", "url", "https://www.linkedin.com/in/your-name")}
      <label className={styles.field}>Which country is the account normally used in?<select value={form.country} onChange={(e) => set("country", e.target.value)}>
        <option value="">Choose a country</option>{countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
      </select></label>
      <label className={styles.field}>How old is your LinkedIn account?<select value={form.accountFreshness} onChange={(e) => set("accountFreshness", e.target.value)}><option value="established">More than one year old</option><option value="fresh">Less than one year old or brand new</option><option value="unknown">I&apos;m not sure</option></select></label>
      <label className={styles.check}><input type="checkbox" checked={idCheck.hasGovernmentId} onChange={(e) => setIdCheck({ ...idCheck, hasGovernmentId: e.target.checked })} /><span>I have a <strong>physical government ID</strong> (passport, national ID or driver&apos;s license) in case LinkedIn asks me to verify later. We never collect it.</span></label>
      <label className={styles.check}><input type="checkbox" checked={idCheck.nameMatchesId} onChange={(e) => setIdCheck({ ...idCheck, nameMatchesId: e.target.checked })} /><span>My full name above <strong>matches the name on that ID</strong>.</span></label>
      <label className={styles.field}>Your profile photo (optional)<input type="file" accept="image/*" disabled={photoBusy} onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadPhoto(f); }} /></label>
      <p className={styles.hint}>{photoBusy ? "Uploading photo…" : idCheck.ownerPhotoUrl ? "Photo uploaded ✓ — we'll optimise it into a professional headshot." : "A clear headshot (1x1 or 2x2). Optional — we'll turn it into a professional photo and send it back to you to upload."}</p>
    </div>

    {/* Payout */}
    <div className={styles.card}>
      <div className={styles.stepLabel}>YOUR PAYOUT</div>
      <h2>Where should we send your money?</h2>
      <p>These are <strong>your</strong> payout details. Only you enter these, so your payments always come to you.</p>
      <label className={styles.field}>Payout method<select value={form.paymentMethod} onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value, paymentDetails: "", bankName: "", bankAccountNumber: "", bankRoutingNumber: "" }))}><option value="">Choose a method</option>{boot.payoutMethods.map((p) => <option key={p}>{p}</option>)}</select></label>
      {field("payoutName", "Name registered on the payout account", "text", "Must match your payment account")}
      {form.paymentMethod === "Bank transfer" ? <>
        {field("bankName", "Bank name", "text", "Name of your bank")}
        {field("bankAccountNumber", "Account number or IBAN", "text", "Your account number")}
        {field("bankRoutingNumber", "Routing, IFSC, sort or SWIFT code", "text", "The code required in your country")}
      </> : form.paymentMethod ? <>
        {field("paymentDetails", payoutField.label, payoutField.type || "text", payoutField.placeholder)}
        <p className={styles.hint}>{payoutField.help}</p>
      </> : null}
    </div>

    {/* Access */}
    <div className={styles.card}>
      <div className={styles.stepLabel}>ACCOUNT ACCESS</div>
      <h2>Set a password for us to sign in</h2>
      <p>So we can sign in and run the account safely. You keep full access and can reset the password any time.</p>
      <div className={styles.ownerRequired}><strong>Set a temporary password on your LinkedIn</strong><span>Change your LinkedIn password (Settings → Sign in &amp; security → Change password) to a temporary one, then enter it here.</span></div>
      <label className={styles.field}>The temporary password<input type="text" autoComplete="off" value={form.password} maxLength={128} placeholder="e.g. LinkedVel2026!" onChange={(e) => set("password", e.target.value)} /></label>
      <label className={styles.check}><input type="checkbox" checked={noKey} onChange={(e) => { setNoKey(e.target.checked); if (e.target.checked) set("twoFactorKey", ""); }} /><span>I can&apos;t get the 2FA key right now — set up two-step verification for me.</span></label>
      {!noKey && <label className={styles.field}>Your 2FA setup key<input type="text" autoComplete="off" value={form.twoFactorKey} maxLength={128} placeholder="e.g. JBSWY3DPEHPK3PXP" onChange={(e) => set("twoFactorKey", e.target.value.toUpperCase())} /></label>}
    </div>

    <div className={styles.card}>
      <label className={styles.check}><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>I&apos;m at least 16 (or older where required), I agree to add a LinkedVelocity-managed email and share account access under the <a href="/ambassador-terms" target="_blank" rel="noreferrer">ambassador terms</a>, and I understand I keep full access and can reset my password any time.</span></label>
      <button className={styles.primary} disabled={busy || !canSubmit} onClick={() => void submit()}>{busy ? "Submitting…" : "Submit my details →"}</button>
    </div>
  </div></div>;
}
