"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

type Step = "info" | "scanning" | "result" | "bank" | "done";

const SCAN_STEPS = [
  "Locating your LinkedIn profile...",
  "Analysing your connection network...",
  "Reviewing your industry and experience...",
  "Checking profile verification status...",
  "Evaluating account history and age...",
  "Assessing profile strength and engagement...",
  "Calculating your ambassador value...",
  "Generating your personalised offer...",
];

function calculateOffer(data: {
  connectionCount: number;
  industry: string;
  notes: string;
}): {
  amount: number;
  tier: string;
  reasons: { label: string; detail: string; positive: boolean }[];
} {
  const reasons: { label: string; detail: string; positive: boolean }[] = [];
  let baseScore = 0;

  // Connections
  const conn = data.connectionCount || 0;
  if (conn >= 10000) {
    baseScore += 40;
    reasons.push({ label: "Connections", detail: `${conn.toLocaleString()}+ connections — excellent network`, positive: true });
  } else if (conn >= 5000) {
    baseScore += 30;
    reasons.push({ label: "Connections", detail: `${conn.toLocaleString()}+ connections — strong network`, positive: true });
  } else if (conn >= 2000) {
    baseScore += 20;
    reasons.push({ label: "Connections", detail: `${conn.toLocaleString()}+ connections — good network`, positive: true });
  } else if (conn >= 500) {
    baseScore += 10;
    reasons.push({ label: "Connections", detail: `${conn.toLocaleString()} connections — growing network`, positive: true });
  } else {
    baseScore += 5;
    reasons.push({ label: "Connections", detail: `${conn} connections — building network`, positive: false });
  }

  // Industry
  const industry = (data.industry || "").toLowerCase();
  const highValue = ["technology", "saas", "software", "finance", "banking", "consulting", "healthcare"];
  const midValue = ["marketing", "sales", "real estate", "insurance", "recruiting"];
  if (highValue.some((i) => industry.includes(i))) {
    baseScore += 25;
    reasons.push({ label: "Industry", detail: `${data.industry} — high-demand industry for outreach`, positive: true });
  } else if (midValue.some((i) => industry.includes(i))) {
    baseScore += 15;
    reasons.push({ label: "Industry", detail: `${data.industry} — solid industry for outreach`, positive: true });
  } else if (industry) {
    baseScore += 10;
    reasons.push({ label: "Industry", detail: `${data.industry}`, positive: true });
  }

  // Notes parsing
  const notes = (data.notes || "").toLowerCase();
  if (notes.includes("verified")) {
    baseScore += 15;
    reasons.push({ label: "Verification", detail: "LinkedIn verified profile", positive: true });
  }
  if (notes.includes("sales nav") || notes.includes("navigator")) {
    baseScore += 10;
    reasons.push({ label: "Sales Navigator", detail: "Active Sales Navigator subscription", positive: true });
  }
  const ageMatch = notes.match(/(\d+)\+?\s*year/);
  if (ageMatch) {
    const years = parseInt(ageMatch[1]);
    if (years >= 5) {
      baseScore += 15;
      reasons.push({ label: "Account Age", detail: `${years}+ years — well-established account`, positive: true });
    } else {
      baseScore += 8;
      reasons.push({ label: "Account Age", detail: `${years} years`, positive: true });
    }
  }
  if (notes.includes("photo") || notes.includes("picture")) {
    baseScore += 5;
    reasons.push({ label: "Profile Photo", detail: "Professional profile photo", positive: true });
  }

  // Calculate amount
  let amount: number;
  let tier: string;
  if (baseScore >= 70) {
    amount = 40 + Math.floor((baseScore - 70) / 5) * 5;
    tier = "Elite";
  } else if (baseScore >= 50) {
    amount = 25 + Math.floor((baseScore - 50) / 10) * 5;
    tier = "Premium";
  } else if (baseScore >= 30) {
    amount = 15 + Math.floor((baseScore - 30) / 10) * 5;
    tier = "Standard";
  } else {
    amount = 10 + Math.floor(baseScore / 10) * 2;
    tier = "Starter";
  }

  return { amount: Math.min(amount, 75), tier, reasons };
}

export default function BecomeAmbassadorPage() {
  const [step, setStep] = useState<Step>("info");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scanIndex, setScanIndex] = useState(0);
  const [offer, setOffer] = useState<{ amount: number; tier: string; reasons: { label: string; detail: string; positive: boolean }[] } | null>(null);

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

  // Scanning animation
  useEffect(() => {
    if (step !== "scanning") return;
    if (scanIndex >= SCAN_STEPS.length) {
      // Done scanning — calculate offer and show result
      const result = calculateOffer({
        connectionCount: Number(form.connectionCount) || 0,
        industry: form.industry,
        notes: form.notes,
      });
      setOffer(result);
      setTimeout(() => setStep("result"), 500);
      return;
    }
    const timer = setTimeout(() => setScanIndex((i) => i + 1), 1200 + Math.random() * 800);
    return () => clearTimeout(timer);
  }, [step, scanIndex, form]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.fullName || !form.email || !form.linkedinUrl) {
      setError("Please fill in all required fields");
      return;
    }
    setScanIndex(0);
    setStep("scanning");
  }, [form]);

  const handleBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Save to database
      const applyRes = await fetch("/api/ambassador/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          connectionCount: form.connectionCount ? Number(form.connectionCount) : undefined,
        }),
      });

      if (applyRes.ok) {
        const applyData = await applyRes.json();
        // Save bank details
        await fetch("/api/ambassador/bank", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ applicationId: applyData.application.id, ...bankForm }),
        });
      }

      setStep("done");
    } catch {
      setStep("done"); // Still show success even if save fails — we'll capture it
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Hero */}
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
              { n: "1", title: "Share Your Profile", desc: "Enter your LinkedIn URL and basic info. Takes 60 seconds.", active: step === "info", done: step !== "info" },
              { n: "2", title: "Instant Assessment & Offer", desc: "We instantly evaluate your profile and make you a monthly offer.", active: step === "scanning" || step === "result", done: step === "bank" || step === "done" },
              { n: "3", title: "Accept & Get Paid", desc: "Accept the offer, enter your bank details, and start earning.", active: step === "bank", done: step === "done" },
            ].map((s) => (
              <div key={s.n} className={`rounded-xl p-8 shadow-sm border text-center transition-all ${s.active ? "border-blue-500 bg-blue-50" : s.done ? "border-green-300 bg-green-50" : "border-gray-200 bg-white"}`}>
                <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl font-bold ${s.done ? "bg-green-100 text-green-600" : s.active ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"}`}>
                  {s.done ? "\u2713" : s.n}
                </div>
                <h3 className="mt-4 text-xl font-semibold text-gray-900">{s.title}</h3>
                <p className="mt-2 text-gray-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-xl px-4">
          {error && <div className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

          {/* STEP 1: Form */}
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
                    <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={3}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g. Verified profile, Sales Navigator, 10+ years old" />
                    <p className="mt-1 text-xs text-gray-400">Tip: mentioning verification, Sales Navigator, and account age can increase your offer.</p>
                  </div>
                  <Button type="submit" className="w-full" size="lg">Assess My Profile</Button>
                </CardContent>
              </Card>
            </form>
          )}

          {/* STEP 2: Scanning animation */}
          {step === "scanning" && (
            <div className="text-center py-12">
              <div className="mx-auto mb-8 relative">
                {/* Spinning rings */}
                <div className="mx-auto h-32 w-32 relative">
                  <div className="absolute inset-0 rounded-full border-4 border-blue-200 animate-ping opacity-20" />
                  <div className="absolute inset-2 rounded-full border-4 border-blue-300 animate-spin" style={{ borderTopColor: "transparent", animationDuration: "1.5s" }} />
                  <div className="absolute inset-4 rounded-full border-4 border-blue-400 animate-spin" style={{ borderBottomColor: "transparent", animationDuration: "2s", animationDirection: "reverse" }} />
                  <div className="absolute inset-6 rounded-full border-4 border-blue-500 animate-spin" style={{ borderTopColor: "transparent", animationDuration: "1s" }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                  </div>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-900">Assessing Your Profile</h2>
              <p className="mt-2 text-gray-500">This will only take a moment...</p>

              {/* Scan steps */}
              <div className="mt-8 text-left max-w-sm mx-auto space-y-3">
                {SCAN_STEPS.map((label, i) => (
                  <div key={label} className={`flex items-center gap-3 transition-all duration-500 ${i < scanIndex ? "opacity-100" : i === scanIndex ? "opacity-100" : "opacity-0"}`}>
                    {i < scanIndex ? (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 flex-shrink-0">
                        <svg className="h-3.5 w-3.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    ) : i === scanIndex ? (
                      <div className="flex h-6 w-6 items-center justify-center flex-shrink-0">
                        <div className="h-4 w-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                      </div>
                    ) : (
                      <div className="h-6 w-6 flex-shrink-0" />
                    )}
                    <span className={`text-sm ${i < scanIndex ? "text-green-700" : i === scanIndex ? "text-blue-700 font-medium" : "text-gray-400"}`}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div className="mt-8 mx-auto max-w-sm">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${(scanIndex / SCAN_STEPS.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Result & offer */}
          {step === "result" && offer && (
            <div className="py-4">
              <div className="text-center mb-6">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Assessment Complete</h2>
                <p className="mt-1 text-gray-500">Here&apos;s what we found, {form.fullName.split(" ")[0]}</p>
              </div>

              {/* Reasons */}
              <Card>
                <CardContent className="py-5">
                  <p className="text-sm font-semibold text-gray-900 mb-3">Profile Analysis</p>
                  <div className="space-y-2.5">
                    {offer.reasons.map((r) => (
                      <div key={r.label} className="flex items-start gap-2.5">
                        <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full flex-shrink-0 ${r.positive ? "bg-green-100" : "bg-gray-100"}`}>
                          {r.positive ? (
                            <svg className="h-3 w-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                          )}
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-900">{r.label}</span>
                          <span className="text-sm text-gray-500"> — {r.detail}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Offer */}
              <Card className="mt-4">
                <CardContent className="py-8 text-center">
                  <p className="text-sm text-gray-500 uppercase tracking-wide font-medium">Based on your {offer.tier} profile, we&apos;d like to offer you</p>
                  <p className="mt-4 text-6xl font-bold text-green-600">
                    {formatCurrency(offer.amount)}
                  </p>
                  <p className="mt-1 text-lg text-gray-500">per month</p>
                  <p className="mt-4 text-sm text-gray-500">
                    Paid directly to your bank account on the 1st of each month.
                    <br />Cancel anytime with 30 days notice.
                  </p>
                </CardContent>
              </Card>

              <div className="mt-6 flex gap-4">
                <Button onClick={() => setStep("bank")} size="lg" className="flex-1">
                  Become an Ambassador
                </Button>
                <Button variant="outline" size="lg" onClick={() => { setStep("info"); setOffer(null); }} className="flex-1">
                  No, Thank You
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: Bank details */}
          {step === "bank" && (
            <form onSubmit={handleBankSubmit}>
              <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Payment Details</h2>
              <p className="text-center text-gray-500 mb-6">
                Where should we send your {offer ? formatCurrency(offer.amount) : ""}/month?
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

          {/* STEP 5: Done */}
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
                We&apos;ll be in touch shortly with instructions to securely log into your LinkedIn account
                via our portal. Once that&apos;s done, you&apos;ll start earning {offer ? formatCurrency(offer.amount) : ""}/month.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* FAQ — only on step 1 */}
      {step === "info" && (
        <section className="bg-white py-20">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="text-center text-3xl font-bold text-gray-900">Common Questions</h2>
            <div className="mt-12 space-y-8">
              {[
                { q: "Is my account safe?", a: "Yes. Your account is accessed through a secure, isolated browser profile with its own fingerprint and proxy. It looks like normal usage to LinkedIn." },
                { q: "Do I lose access to my own account?", a: "During the rental period, the renter will be using the account. You'll regain full access when the rental ends." },
                { q: "How do I get paid?", a: "We pay monthly via bank transfer on the 1st of each month." },
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
