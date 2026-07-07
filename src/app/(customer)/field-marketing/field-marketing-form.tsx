"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function FieldMarketingForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
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
          We&apos;ve received your details and will be in touch shortly with the next steps.
        </p>
        <p className="mt-4 text-sm text-gray-500">
          Any questions? Email us at{" "}
          <a href="mailto:sam@linkedvelocity.com" className="text-blue-600 underline">
            sam@linkedvelocity.com
          </a>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-semibold text-gray-900">Register your interest</h2>
      <p className="text-sm text-gray-600">
        Fill in your details and we&apos;ll get back to you about the role.
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

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" size="lg" loading={loading} className="w-full">
        {loading ? "Submitting..." : "Apply now"}
      </Button>

      <p className="text-center text-xs text-gray-500">
        Questions? Email{" "}
        <a href="mailto:sam@linkedvelocity.com" className="text-blue-600 underline">
          sam@linkedvelocity.com
        </a>
      </p>
    </form>
  );
}
