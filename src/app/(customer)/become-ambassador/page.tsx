"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

interface Assessment {
  score: number;
  tier: string;
  offeredAmount: number;
  breakdown: { category: string; points: number; maxPoints: number; reason: string }[];
  autoApproved: boolean;
}

type Step = "info" | "result" | "bank" | "done";

export default function BecomeAmbassadorPage() {
  const [step, setStep] = useState<Step>("info");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [applicationId, setApplicationId] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    linkedinUrl: "",
    connectionCount: "",
    industry: "",
    location: "",
    notes: "",
  });

  const [bankForm, setBankForm] = useState({
    bankName: "",
    bankAccountName: "",
    bankAccountNumber: "",
    bankRoutingNumber: "",
    bankSortCode: "",
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const updateBank = (field: string, value: string) =>
    setBankForm((prev) => ({ ...prev, [field]: value }));

  // Step 1: Submit application
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/ambassador/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          connectionCount: form.connectionCount ? Number(form.connectionCount) : undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Something went wrong");
        return;
      }

      setAssessment(data.assessment);
      setApplicationId(data.application.id);
      setStep("result");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Submit bank details
  const handleBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/ambassador/bank`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, ...bankForm }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(typeof data.error === "string" ? data.error : "Something went wrong");
        return;
      }

      setStep("done");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const tierColors: Record<string, string> = {
    starter: "text-gray-600",
    standard: "text-blue-600",
    premium: "text-purple-600",
    elite: "text-yellow-600",
  };

  return (
    <div>
      {/* Hero — always visible */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold tracking-tight text-gray-900">
              Become a LinkedIn
              <span className="text-blue-600"> Ambassador</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
              Earn money from your LinkedIn account. Share your profile with businesses who need
              established accounts for outreach — and get paid monthly.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-gray-900">How It Works</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              {
                n: "1",
                title: "Share Your Profile",
                desc: "Enter your LinkedIn URL and basic info. Takes 60 seconds.",
                active: step === "info",
                done: step !== "info",
              },
              {
                n: "2",
                title: "Instant Assessment & Offer",
                desc: "Our system instantly evaluates your profile and makes you a monthly offer.",
                active: step === "result",
                done: step === "bank" || step === "done",
              },
              {
                n: "3",
                title: "Provide Payment Details",
                desc: "Accept the offer, enter your bank details, and start earning.",
                active: step === "bank",
                done: step === "done",
              },
            ].map((s) => (
              <div
                key={s.n}
                className={`rounded-xl p-8 shadow-sm border text-center transition-all ${
                  s.active
                    ? "border-blue-500 bg-blue-50"
                    : s.done
                    ? "border-green-300 bg-green-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div
                  className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl font-bold ${
                    s.done
                      ? "bg-green-100 text-green-600"
                      : s.active
                      ? "bg-blue-100 text-blue-600"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {s.done ? "\u2713" : s.n}
                </div>
                <h3 className="mt-4 text-xl font-semibold text-gray-900">{s.title}</h3>
                <p className="mt-2 text-gray-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Step content */}
      <section className="py-16">
        <div className="mx-auto max-w-xl px-4">
          {error && (
            <div className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}

          {/* Step 1: Application form */}
          {step === "info" && (
            <form onSubmit={handleSubmit}>
              <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Share Your Profile</h2>
              <p className="text-center text-gray-500 mb-6">We&apos;ll assess it instantly</p>
              <Card>
                <CardContent className="py-6 space-y-4">
                  <Input id="fullName" label="Full Name *" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} required />
                  <Input id="email" label="Email *" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
                  <Input id="linkedinUrl" label="LinkedIn Profile URL *" placeholder="https://linkedin.com/in/yourprofile" value={form.linkedinUrl} onChange={(e) => update("linkedinUrl", e.target.value)} required />
                  <div className="grid grid-cols-2 gap-4">
                    <Input id="connectionCount" label="Approx. Connections" placeholder="e.g. 5000" value={form.connectionCount} onChange={(e) => update("connectionCount", e.target.value.replace(/\D/g, ""))} />
                    <Input id="industry" label="Industry" placeholder="e.g. Technology" value={form.industry} onChange={(e) => update("industry", e.target.value)} />
                  </div>
                  <Input id="location" label="Location" placeholder="e.g. New York, NY" value={form.location} onChange={(e) => update("location", e.target.value)} />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Anything else?</label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => update("notes", e.target.value)}
                      rows={3}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g. Verified profile, Sales Navigator, 10+ years old, have profile photo"
                    />
                    <p className="mt-1 text-xs text-gray-400">
                      Tip: mentioning &quot;verified&quot;, &quot;Sales Navigator&quot;, account age, and having a profile photo can increase your offer.
                    </p>
                  </div>
                  <Button type="submit" loading={loading} className="w-full" size="lg">
                    Assess My Profile
                  </Button>
                </CardContent>
              </Card>
            </form>
          )}

          {/* Step 2: Assessment result & offer */}
          {step === "result" && assessment && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">Your Assessment</h2>

              {/* Score & Offer */}
              <Card>
                <CardContent className="py-8 text-center">
                  <div className="flex items-center justify-center gap-4">
                    <div>
                      <p className="text-sm text-gray-500 uppercase tracking-wide">Your Score</p>
                      <p className="text-4xl font-bold text-gray-900">{assessment.score}<span className="text-lg text-gray-400">/100</span></p>
                    </div>
                    <div className="h-16 w-px bg-gray-200" />
                    <div>
                      <p className="text-sm text-gray-500 uppercase tracking-wide">Your Tier</p>
                      <p className={`text-2xl font-bold capitalize ${tierColors[assessment.tier] || "text-gray-900"}`}>
                        {assessment.tier}
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 rounded-xl bg-green-50 border-2 border-green-500 p-6">
                    <p className="text-sm text-green-700 font-medium">Your Monthly Offer</p>
                    <p className="mt-2 text-5xl font-bold text-green-700">
                      {formatCurrency(assessment.offeredAmount)}
                      <span className="text-lg font-normal text-green-600">/month</span>
                    </p>
                    <p className="mt-2 text-sm text-green-600">Paid directly to your bank account</p>
                  </div>
                </CardContent>
              </Card>

              {/* Breakdown */}
              <Card className="mt-4">
                <CardContent className="py-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">Score Breakdown</p>
                  <div className="space-y-2">
                    {assessment.breakdown.map((b) => (
                      <div key={b.category} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-700">{b.category}</span>
                          <span className="text-gray-400">— {b.reason}</span>
                        </div>
                        <Badge variant={b.points > 0 ? "success" : "default"}>
                          {b.points}/{b.maxPoints}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="mt-6 flex gap-4">
                <Button onClick={() => setStep("bank")} size="lg" className="flex-1">
                  Accept Offer — Continue
                </Button>
                <Button variant="outline" size="lg" onClick={() => { setStep("info"); setAssessment(null); }}>
                  Decline
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Bank details */}
          {step === "bank" && (
            <form onSubmit={handleBankSubmit}>
              <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Payment Details</h2>
              <p className="text-center text-gray-500 mb-6">
                Where should we send your {assessment ? formatCurrency(assessment.offeredAmount) : ""}/month?
              </p>
              <Card>
                <CardContent className="py-6 space-y-4">
                  <Input id="bankName" label="Bank Name *" placeholder="e.g. Chase, Barclays" value={bankForm.bankName} onChange={(e) => updateBank("bankName", e.target.value)} required />
                  <Input id="bankAccountName" label="Account Holder Name *" value={bankForm.bankAccountName} onChange={(e) => updateBank("bankAccountName", e.target.value)} required />
                  <Input id="bankAccountNumber" label="Account Number *" value={bankForm.bankAccountNumber} onChange={(e) => updateBank("bankAccountNumber", e.target.value)} required />
                  <div className="grid grid-cols-2 gap-4">
                    <Input id="bankRoutingNumber" label="Routing Number (US)" value={bankForm.bankRoutingNumber} onChange={(e) => updateBank("bankRoutingNumber", e.target.value)} />
                    <Input id="bankSortCode" label="Sort Code (UK)" value={bankForm.bankSortCode} onChange={(e) => updateBank("bankSortCode", e.target.value)} />
                  </div>
                  <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
                    Your bank details are encrypted and stored securely. We&apos;ll use them only to send your monthly payments.
                  </div>
                  <Button type="submit" loading={loading} className="w-full" size="lg">
                    Submit &amp; Complete Setup
                  </Button>
                </CardContent>
              </Card>
            </form>
          )}

          {/* Step 4: Done */}
          {step === "done" && (
            <div className="text-center py-8">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">You&apos;re All Set!</h2>
              <p className="mt-4 text-lg text-gray-600">
                Your application has been approved and your payment details are saved.
              </p>
              <p className="mt-2 text-gray-500">
                We&apos;ll be in touch shortly with instructions to log into your account via our secure portal.
                Once that&apos;s done, you&apos;ll start earning {assessment ? formatCurrency(assessment.offeredAmount) : ""}/month.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* FAQ — only show on step 1 */}
      {step === "info" && (
        <section className="bg-white py-20">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="text-center text-3xl font-bold text-gray-900">Common Questions</h2>
            <div className="mt-12 space-y-8">
              {[
                { q: "Is my account safe?", a: "Yes. Your account is accessed through a secure, isolated browser profile with its own fingerprint and proxy. It looks like normal usage to LinkedIn." },
                { q: "Do I lose access to my own account?", a: "During the rental period, the renter will be using the account. You'll regain full access when the rental ends." },
                { q: "How do I get paid?", a: "We pay monthly via bank transfer. You'll provide your payment details during the onboarding process." },
                { q: "Can I stop at any time?", a: "Yes. You can withdraw your account with 30 days notice." },
              ].map((faq) => (
                <div key={faq.q}>
                  <h3 className="text-lg font-semibold text-gray-900">{faq.q}</h3>
                  <p className="mt-2 text-gray-600">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
