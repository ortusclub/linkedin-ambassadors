"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Calendly booking link shown inline on the final step.
// Leave empty and applicants are told we'll email a link instead.
const BOOKING_URL = "https://calendly.com/milee-linkedvelocity/30min";

const COMFORT_SCALE = ["1", "2", "3", "4", "5"];
const STEPS = ["Your details", "About you", "Book a call"];

export function FieldMarketingForm() {
  const [step, setStep] = useState(1);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [comfortApproaching, setComfortApproaching] = useState("");
  const [handlesRejection, setHandlesRejection] = useState("");
  const [interest, setInterest] = useState("");
  const [experience, setExperience] = useState("");
  const [trialAvailability, setTrialAvailability] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function goToStep2(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!fullName.trim() || !email.trim() || !contactNumber.trim()) {
      setError("Please fill in your name, email and contact number.");
      return;
    }
    setStep(2);
  }

  async function submitAndBook(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!comfortApproaching) {
      setError("Please rate how comfortable you are approaching strangers.");
      return;
    }
    if (!trialAvailability) {
      setError("Please let us know your availability for the trial day.");
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
          handlesRejection: handlesRejection.trim() || undefined,
          interest: interest.trim() || undefined,
          experience: experience.trim() || undefined,
          trialAvailability,
        }),
      });
      if (!res.ok) {
        throw new Error("Something went wrong. Please try again.");
      }
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-2">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const active = step === n;
          const complete = step > n;
          return (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div
                className={
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold " +
                  (active
                    ? "bg-blue-600 text-white"
                    : complete
                      ? "bg-green-600 text-white"
                      : "bg-gray-100 text-gray-500")
                }
              >
                {complete ? "✓" : n}
              </div>
              <span
                className={
                  "hidden text-xs font-medium sm:inline " +
                  (active ? "text-gray-900" : "text-gray-400")
                }
              >
                {label}
              </span>
              {n < STEPS.length && <div className="h-px flex-1 bg-gray-200" />}
            </div>
          );
        })}
      </div>

      {/* Step 1 — details */}
      {step === 1 && (
        <form onSubmit={goToStep2} className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Apply to the Promo Team</h2>
            <p className="mt-1 text-sm text-gray-600">
              Start with your details — takes about 2 minutes in all.
            </p>
          </div>
          <Input
            id="fullName"
            label="Full name *"
            placeholder="Juan Dela Cruz"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
          />
          <Input
            id="email"
            label="Email *"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <Input
            id="contactNumber"
            label="Contact number *"
            type="tel"
            placeholder="09XX XXX XXXX"
            value={contactNumber}
            onChange={(e) => setContactNumber(e.target.value)}
            autoComplete="tel"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" size="lg" className="w-full">
            Continue
          </Button>
        </form>
      )}

      {/* Step 2 — screening questions */}
      {step === 2 && (
        <form onSubmit={submitAndBook} className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">A bit about you</h2>
            <p className="mt-1 text-sm text-gray-600">
              A few quick questions. We&apos;ll explain the full role on the call.
            </p>
          </div>

          {/* Comfort approaching strangers — 1 to 5 */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              How comfortable are you walking up to strangers and starting a conversation? *
            </label>
            <div className="flex gap-2" role="radiogroup" aria-label="Comfort approaching strangers, 1 to 5">
              {COMFORT_SCALE.map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={comfortApproaching === n}
                  onClick={() => setComfortApproaching(n)}
                  className={
                    "flex h-10 flex-1 items-center justify-center rounded-lg border text-sm font-semibold transition focus:outline-none focus:ring-1 focus:ring-blue-500 " +
                    (comfortApproaching === n
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-gray-300 bg-white text-gray-700 hover:border-blue-400")
                  }
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400">1 = I&apos;d find it hard · 5 = Totally comfortable</p>
          </div>

          {/* Handling rejection */}
          <div className="space-y-1">
            <label htmlFor="handlesRejection" className="block text-sm font-medium text-gray-700">
              Out promoting, a lot of people will say no or brush you off. How do you handle that?
            </label>
            <textarea
              id="handlesRejection"
              rows={3}
              placeholder="A sentence or two is fine."
              value={handlesRejection}
              onChange={(e) => setHandlesRejection(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          {/* Interest */}
          <div className="space-y-1">
            <label htmlFor="interest" className="block text-sm font-medium text-gray-700">
              What made you interested in this role?
            </label>
            <textarea
              id="interest"
              rows={3}
              placeholder="A sentence or two is fine."
              value={interest}
              onChange={(e) => setInterest(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          {/* Experience */}
          <Input
            id="experience"
            label="Any promo, sales, or people-facing work before? (optional)"
            placeholder='e.g. "Brand ambassador for 6 months" — or "None, but I love talking to people"'
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
          />

          {/* Trial availability */}
          <div className="space-y-1">
            <label htmlFor="trialAvailability" className="block text-sm font-medium text-gray-700">
              We&apos;re planning a trial day at Market! Market!, BGC around the end of July (exact
              date TBD). Are you likely available? *
            </label>
            <select
              id="trialAvailability"
              value={trialAvailability}
              onChange={(e) => setTrialAvailability(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">Select one…</option>
              <option value="Yes">Yes, I&apos;m available</option>
              <option value="Maybe">Maybe — depends on the exact date</option>
              <option value="No">No, not around then</option>
            </select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <Button
              type="button"
              size="lg"
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setError("");
                setStep(1);
              }}
            >
              Back
            </Button>
            <Button type="submit" size="lg" loading={loading} className="flex-[2]">
              {loading ? "Submitting..." : "Continue"}
            </Button>
          </div>
        </form>
      )}

      {/* Step 3 — book a call */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">You&apos;re in!</h2>
              <p className="text-sm text-gray-600">
                Last step — book a quick call so we can walk you through the role.
              </p>
            </div>
          </div>

          {BOOKING_URL ? (
            <>
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <iframe
                  src={`${BOOKING_URL}?hide_gdpr_banner=1`}
                  title="Book your call"
                  className="h-[640px] w-full"
                  frameBorder="0"
                />
              </div>
              <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className="block">
                <Button size="lg" className="w-full">
                  Book your call →
                </Button>
              </a>
            </>
          ) : (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-6 text-center">
              <p className="text-gray-700">
                Thanks — we&apos;ve got your details. We&apos;ll email you shortly with a link to
                book your quick call.
              </p>
            </div>
          )}

          <p className="text-center text-xs text-gray-500">
            Questions? Email{" "}
            <a href="mailto:info@linkedvelocity.com" className="text-blue-600 underline">
              info@linkedvelocity.com
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
