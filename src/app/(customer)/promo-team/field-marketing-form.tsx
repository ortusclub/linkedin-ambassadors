"use client";

import { useEffect, useState } from "react";
import { poppins } from "./fonts";

// Calendly booking link shown inline on the final step.
// Leave empty and applicants are told we'll email a link instead.
const BOOKING_URL = "https://calendly.com/milee-linkedvelocity/30min";

const STEPS = ["Your details", "About you", "Book a call"];
const SCALE = ["1", "2", "3", "4", "5"];
const YES_NO = ["Yes", "No"];

const inputCls =
  "w-full rounded-[11px] border border-[#DCE3DE] bg-white px-3.5 py-[13px] text-[15px] text-[#0B1220] outline-none transition placeholder:text-[#A6B0AA] focus:border-[#00A150] focus:shadow-[0_0_0_3px_rgba(0,161,80,0.14)]";
const labelCls = "mb-[10px] block text-[14px] font-semibold text-[#0B1220]";
const primaryBtn =
  "flex items-center justify-center rounded-xl bg-[#00B85C] px-6 py-[15px] text-[16px] font-semibold text-white shadow-[0_12px_28px_rgba(0,184,92,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(0,184,92,0.36)] disabled:opacity-60 disabled:hover:translate-y-0";
const backBtn =
  "flex items-center justify-center rounded-xl bg-[#F2F4F3] px-6 py-[15px] text-[15px] font-semibold text-[#37424F]";

// One-tap choice buttons — used for both the 1–5 scales and Yes/No.
function ChoiceButtons({
  value,
  onChange,
  options,
  cols,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  cols: number;
  ariaLabel: string;
}) {
  return (
    <div
      className="grid gap-[10px]"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {options.map((o) => {
        const on = value === o;
        return (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o)}
            className={`${poppins.className} rounded-[11px] py-[14px] text-[17px] font-bold transition`}
            style={{
              border: `1.5px solid ${on ? "#00A150" : "#DCE3DE"}`,
              background: on ? "#E7F6EE" : "#fff",
              color: on ? "#067A45" : "#3F4856",
              boxShadow: on ? "0 0 0 3px rgba(0,161,80,0.12)" : "none",
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

export function FieldMarketingForm() {
  const [step, setStep] = useState(1);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [comfortApproaching, setComfortApproaching] = useState("");
  const [handlesRejection, setHandlesRejection] = useState("");
  const [experience, setExperience] = useState("");
  const [trialAvailability, setTrialAvailability] = useState("");

  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Capture the ?src= channel tag (e.g. ?src=fb) so we know where each applicant came from.
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("src");
    if (s) setSource(s);
  }, []);

  function scrollToTop() {
    if (typeof window !== "undefined") {
      const el = document.getElementById("promo-apply");
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 30, behavior: "smooth" });
    }
  }

  function goToStep2(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!fullName.trim() || !email.trim() || !contactNumber.trim()) {
      setError("Please fill in your name, email and contact number.");
      return;
    }
    setStep(2);
    scrollToTop();
  }

  async function submitAndBook(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!comfortApproaching || !handlesRejection || !experience || !trialAvailability) {
      setError("Please answer all the questions — just a tap each.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/field-marketing/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          contactNumber: contactNumber.trim(),
          comfortApproaching,
          handlesRejection,
          experience,
          trialAvailability,
          source: source || undefined,
        }),
      });
      if (!res.ok) throw new Error("Something went wrong. Please try again.");
      setStep(3);
      scrollToTop();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const firstName = fullName.trim().split(" ")[0];

  return (
    <div
      style={{ boxShadow: "0 10px 34px rgba(16,24,40,0.08), 0 1px 3px rgba(16,24,40,0.04)" }}
      className="rounded-[22px] border border-[#E7EBE8] bg-white p-8 sm:p-[38px]"
    >
      {/* Stepper */}
      <div className="mb-[30px] flex items-center">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const active = step === n;
          const done = step > n;
          const last = n === STEPS.length;
          return (
            <div key={label} className="flex items-center" style={{ flex: last ? "0" : "1" }}>
              <div className="flex flex-shrink-0 items-center gap-[10px]">
                <span
                  className={`${poppins.className} flex h-[30px] w-[30px] items-center justify-center rounded-full text-[13px] font-bold`}
                  style={{
                    background: done ? "#00A150" : active ? "#00B85C" : "#EEF1EF",
                    color: done || active ? "#fff" : "#96A0AD",
                    boxShadow: active ? "0 6px 14px rgba(0,184,92,0.3)" : "none",
                  }}
                >
                  {done ? "✓" : n}
                </span>
                <span
                  className="hidden whitespace-nowrap text-[14.5px] sm:inline"
                  style={{
                    fontWeight: active ? 600 : 500,
                    color: active || done ? "#0B1220" : "#96A0AD",
                  }}
                >
                  {label}
                </span>
              </div>
              {!last && (
                <span
                  className="mx-[14px] h-[1.5px] flex-1"
                  style={{ background: done ? "#00A150" : "#E7EBE8" }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* STEP 1 — details */}
      {step === 1 && (
        <form onSubmit={goToStep2}>
          <h2 className={`${poppins.className} m-0 mb-1.5 text-[26px] font-bold tracking-[-0.02em]`}>
            Apply to the promo team
          </h2>
          <p className="m-0 mb-[26px] text-[15.5px] text-[#5A6473]">
            Start with your details — takes about a minute.
          </p>
          <div className="flex flex-col gap-[18px]">
            <div>
              <label htmlFor="fullName" className={labelCls}>
                Full name <span className="text-[#00A150]">*</span>
              </label>
              <input id="fullName" className={inputCls} placeholder="Juan Dela Cruz" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <label htmlFor="email" className={labelCls}>
                Email <span className="text-[#00A150]">*</span>
              </label>
              <input id="email" type="email" className={inputCls} placeholder="you@example.com" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label htmlFor="contactNumber" className={labelCls}>
                Contact number <span className="text-[#00A150]">*</span>
              </label>
              <input id="contactNumber" type="tel" className={inputCls} placeholder="09XX XXX XXXX" autoComplete="tel" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} />
            </div>
          </div>
          {error && <p className="mt-4 text-[14px] text-red-600">{error}</p>}
          <button type="submit" className={`${primaryBtn} mt-[26px] w-full`}>
            Continue →
          </button>
        </form>
      )}

      {/* STEP 2 — about you (all one-tap) */}
      {step === 2 && (
        <form onSubmit={submitAndBook}>
          <h2 className={`${poppins.className} m-0 mb-1.5 text-[26px] font-bold tracking-[-0.02em]`}>
            A bit about you
          </h2>
          <p className="m-0 mb-[26px] text-[15.5px] text-[#5A6473]">
            Quick taps — no typing. We&apos;ll get into the details on the call.
          </p>

          <div className="flex flex-col gap-6">
            <div>
              <label className={labelCls}>
                How comfortable are you walking up to strangers and starting a conversation?{" "}
                <span className="text-[#00A150]">*</span>
              </label>
              <ChoiceButtons value={comfortApproaching} onChange={setComfortApproaching} options={SCALE} cols={5} ariaLabel="Comfort approaching strangers, 1 to 5" />
              <div className="mt-2 text-[12.5px] text-[#8A93A2]">1 = I&apos;d find it hard · 5 = Totally comfortable</div>
            </div>

            <div>
              <label className={labelCls}>
                If people brush you off or say no, how well do you handle it?{" "}
                <span className="text-[#00A150]">*</span>
              </label>
              <ChoiceButtons value={handlesRejection} onChange={setHandlesRejection} options={SCALE} cols={5} ariaLabel="Handling rejection, 1 to 5" />
              <div className="mt-2 text-[12.5px] text-[#8A93A2]">1 = It really gets to me · 5 = Doesn&apos;t bother me</div>
            </div>

            <div>
              <label className={labelCls}>
                Any promo, sales, or people-facing work before?{" "}
                <span className="text-[#00A150]">*</span>
              </label>
              <ChoiceButtons value={experience} onChange={setExperience} options={YES_NO} cols={2} ariaLabel="Prior people-facing work" />
            </div>

            <div>
              <label className={labelCls}>
                Are you free for a trial day at Market! Market!, BGC around the end of July (exact
                date TBD)? <span className="text-[#00A150]">*</span>
              </label>
              <ChoiceButtons value={trialAvailability} onChange={setTrialAvailability} options={YES_NO} cols={2} ariaLabel="Trial day availability" />
            </div>
          </div>

          {error && <p className="mt-4 text-[14px] text-red-600">{error}</p>}

          <div className="mt-[26px] flex gap-3">
            <button type="button" className={backBtn} onClick={() => { setError(""); setStep(1); }}>
              Back
            </button>
            <button type="submit" disabled={loading} className={`${primaryBtn} flex-1`}>
              {loading ? "Submitting…" : "Continue →"}
            </button>
          </div>
        </form>
      )}

      {/* STEP 3 — book a call */}
      {step === 3 && (
        <div>
          <div className="mb-6 flex items-start gap-[15px]">
            <span
              className="flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center rounded-full"
              style={{ background: "linear-gradient(150deg,#00B85C,#068A48)", boxShadow: "0 10px 24px rgba(0,161,80,0.3)" }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>
            <div>
              <h2 className={`${poppins.className} m-0 mb-1 text-[26px] font-bold tracking-[-0.02em]`}>
                You&apos;re in{firstName ? `, ${firstName}` : ""}!
              </h2>
              <p className="m-0 text-[15.5px] leading-[1.55] text-[#5A6473]">
                Last step — book a quick call so we can walk you through the role.
              </p>
            </div>
          </div>

          {BOOKING_URL ? (
            <div className="overflow-hidden rounded-[18px] border border-[#E7EBE8] shadow-[0_4px_14px_rgba(16,24,40,0.05)]">
              <div className="border-b border-[#E7EBE8] bg-[#F6FAF7] px-[26px] py-6 text-center">
                <div className="mb-1 text-[13px] text-[#8A93A2]">LinkedVelocity · Recruiting</div>
                <div className={`${poppins.className} text-[22px] font-bold tracking-[-0.01em] text-[#0B1220]`}>
                  Promo Team Screening Call
                </div>
                <div className="mt-[14px] flex flex-wrap items-center justify-center gap-5">
                  <span className="inline-flex items-center gap-[7px] text-[13.5px] text-[#37424F]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00A150" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" />
                    </svg>
                    30 min
                  </span>
                  <span className="inline-flex items-center gap-[7px] text-[13.5px] text-[#37424F]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00A150" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 7l-7 5 7 5V7z" />
                      <rect x="1" y="5" width="15" height="14" rx="2" />
                    </svg>
                    Web conferencing details on confirmation
                  </span>
                </div>
              </div>
              <iframe src={`${BOOKING_URL}?hide_gdpr_banner=1`} title="Book your call" className="h-[640px] w-full" frameBorder="0" />
            </div>
          ) : (
            <div className="rounded-[18px] border border-[#E1EFE7] bg-[#F6FAF7] p-6 text-center">
              <p className="text-[#37424F]">
                Thanks — we&apos;ve got your details. We&apos;ll email you shortly with a link to book your quick call.
              </p>
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <button type="button" className={backBtn} onClick={() => setStep(2)}>
              Back
            </button>
          </div>
          <div className="mt-4 text-center text-[13px] text-[#96A0AD]">
            Questions? Email{" "}
            <a href="mailto:info@linkedvelocity.com" className="font-semibold text-[#00A150] hover:underline">
              info@linkedvelocity.com
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
