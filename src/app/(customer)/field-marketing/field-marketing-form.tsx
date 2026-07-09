"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const COMFORT_SCALE = ["1", "2", "3", "4", "5"];

export function FieldMarketingForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [comfortApproaching, setComfortApproaching] = useState("");
  const [handlesRejection, setHandlesRejection] = useState("");
  const [interest, setInterest] = useState("");
  const [experience, setExperience] = useState("");
  const [trialAvailability, setTrialAvailability] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!fullName.trim() || !email.trim() || !contactNumber.trim()) {
      setError("Please fill in your name, email and contact number.");
      return;
    }
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
          linkedinUrl: linkedinUrl.trim() || undefined,
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
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-600 text-white">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900">Thanks — you&apos;re in!</h3>
        <p className="mt-2 text-gray-600">
          We&apos;ve received your details. We&apos;ll be in touch shortly to book a quick
          15-minute call and walk you through the role.
        </p>
        <p className="mt-4 text-sm text-gray-500">
          Any questions? Email us at{" "}
          <a href="mailto:info@linkedvelocity.com" className="text-blue-600 underline">
            info@linkedvelocity.com
          </a>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-semibold text-gray-900">Apply to the Promo Team</h2>
      <p className="text-sm text-gray-600">
        Tell us a bit about yourself — takes about 2 minutes. We&apos;ll explain the full
        role and answer your questions on a quick call.
      </p>

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
      <Input
        id="linkedinUrl"
        label="LinkedIn profile (optional)"
        placeholder="linkedin.com/in/your-name"
        value={linkedinUrl}
        onChange={(e) => setLinkedinUrl(e.target.value)}
      />

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

      <Button type="submit" size="lg" loading={loading} className="w-full">
        {loading ? "Submitting..." : "Apply now"}
      </Button>

      <p className="text-center text-xs text-gray-500">
        Questions? Email{" "}
        <a href="mailto:info@linkedvelocity.com" className="text-blue-600 underline">
          info@linkedvelocity.com
        </a>
      </p>
    </form>
  );
}
