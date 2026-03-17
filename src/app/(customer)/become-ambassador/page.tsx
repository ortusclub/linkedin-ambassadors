"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

type Step = "info" | "scanning" | "result" | "bank" | "login" | "complete" | "done" | "review";

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
  verified: boolean;
  hasSalesNav: boolean;
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

  // Verified
  if (data.verified) {
    baseScore += 15;
    reasons.push({ label: "Verification", detail: "LinkedIn verified profile", positive: true });
  }

  // Sales Navigator
  if (data.hasSalesNav) {
    baseScore += 10;
    reasons.push({ label: "Sales Navigator", detail: "Active Sales Navigator subscription", positive: true });
  }

  // Notes parsing for account age
  const notes = (data.notes || "").toLowerCase();
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
  const [profileId, setGologinProfileId] = useState("");
  const [launchingBrowser, setLaunchingBrowser] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; tempPassword: string } | null>(null);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    contactNumber: "",
    linkedinProfileName: "",
    linkedinEmail: "",
    sameNameAsProfile: true,
    sameEmailAsProfile: true,
    linkedinUrl: "",
    connectionCount: "",
    location: "",
    verified: false,
    hasSalesNav: false,
    notes: "",
  });

  const [paymentMethod, setPaymentMethod] = useState<"usdc" | "paypal" | "wise" | null>(null);
  const [bankForm, setBankForm] = useState({
    bankName: "",
    bankAccountName: "",
    bankAccountNumber: "",
    bankRoutingNumber: "",
    bankSortCode: "",
    usdcWalletAddress: "",
    usdcNetwork: "ethereum",
    paypalEmail: "",
    wiseEmail: "",
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const updateBank = (field: string, value: string) =>
    setBankForm((prev) => ({ ...prev, [field]: value }));

  // Pre-fill from logged-in user
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setForm((prev) => ({
            ...prev,
            fullName: prev.fullName || data.user.fullName || "",
            email: prev.email || data.user.email || "",
            contactNumber: prev.contactNumber || data.user.contactNumber || "",
          }));
        }
      })
      .catch(() => {});
  }, []);

  // Scanning animation
  useEffect(() => {
    if (step !== "scanning") return;
    if (scanIndex >= SCAN_STEPS.length) {
      // Done scanning — calculate offer and show result
      const result = calculateOffer({
        connectionCount: Number(form.connectionCount) || 0,
        verified: form.verified as unknown as boolean,
        hasSalesNav: form.hasSalesNav as unknown as boolean,
        notes: form.notes,
      });
      setOffer(result);
      setTimeout(() => setStep("result"), 500);
      return;
    }
    const timer = setTimeout(() => setScanIndex((i) => i + 1), 1200 + Math.random() * 800);
    return () => clearTimeout(timer);
  }, [step, scanIndex, form]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.fullName || !form.email || !form.linkedinUrl || !form.contactNumber) {
      setError("Please fill in all required fields");
      return;
    }

    // Create ambassador application immediately so it appears in admin
    try {
      await fetch("/api/ambassador/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          contactNumber: form.contactNumber,
          linkedinUrl: form.linkedinUrl,
          connectionCount: form.connectionCount ? Number(form.connectionCount) : undefined,
          location: form.location || undefined,
          notes: [
            form.verified ? "Verified profile" : "",
            form.hasSalesNav ? "Sales Navigator" : "",
            form.notes || "",
          ].filter(Boolean).join(". ") || undefined,
        }),
      });
    } catch {} // Don't block the flow if this fails

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
          body: JSON.stringify({ applicationId: applyData.application.id, paymentMethod, ...bankForm }),
        });
      }

      setStep("login");
    } catch {
      setStep("login"); // Continue to login step even if save fails
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
          <div className="mt-10 grid gap-6 md:grid-cols-4">
            {[
              { n: "1", title: "Share Your Profile", desc: "Enter your LinkedIn URL and basic info.", active: step === "info", done: step !== "info", goTo: "info" as Step },
              { n: "2", title: "Assessment & Offer", desc: "We evaluate your profile and make you a monthly offer.", active: step === "scanning" || step === "result", done: ["bank","login","complete","done"].includes(step), goTo: "result" as Step },
              { n: "3", title: "Payment Details", desc: "Choose how you'd like to be paid.", active: step === "bank", done: ["login","complete","done"].includes(step), goTo: "bank" as Step },
              { n: "4", title: "Download & Connect", desc: "Download the Klabber app and add your LinkedIn profile.", active: step === "login" || step === "complete", done: step === "done", goTo: "login" as Step },
            ].map((s) => (
              <div
                key={s.n}
                onClick={() => s.done && setStep(s.goTo)}
                className={`rounded-xl p-8 shadow-sm border text-center transition-all ${s.done ? "border-green-300 bg-green-50 cursor-pointer hover:border-green-400 hover:shadow-md" : s.active ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"}`}
              >
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
                  {/* Your details */}
                  <div className="border-b border-gray-100 pb-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Your Details</p>
                    <div className="space-y-4">
                      <Input id="fullName" label="Your Full Name *" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} required />
                      <Input id="email" label="Your Email *" type="email" placeholder="your@email.com" value={form.email} onChange={(e) => update("email", e.target.value)} required />
                      <Input id="contactNumber" label="Contact Number *" type="tel" placeholder="e.g. +1 555 123 4567" value={form.contactNumber} onChange={(e) => update("contactNumber", e.target.value)} required />
                    </div>
                  </div>

                  {/* LinkedIn profile details */}
                  <div className="border-b border-gray-100 pb-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">LinkedIn Profile You Want to Share</p>
                    <div className="space-y-4">
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={form.sameNameAsProfile}
                          onChange={(e) => setForm(prev => ({ ...prev, sameNameAsProfile: e.target.checked }))}
                          className="rounded border-gray-300"
                        />
                        The LinkedIn profile name is the same as my name above
                      </label>
                      {!form.sameNameAsProfile && (
                        <Input id="linkedinProfileName" label="Name on LinkedIn Profile *" placeholder="e.g. John Smith" value={form.linkedinProfileName} onChange={(e) => update("linkedinProfileName", e.target.value)} />
                      )}

                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={form.sameEmailAsProfile}
                          onChange={(e) => setForm(prev => ({ ...prev, sameEmailAsProfile: e.target.checked }))}
                          className="rounded border-gray-300"
                        />
                        The LinkedIn login email is the same as my email above
                      </label>
                      {!form.sameEmailAsProfile && (
                        <Input id="linkedinEmail" label="Email Used for LinkedIn Login *" type="email" placeholder="linkedin@email.com" value={form.linkedinEmail} onChange={(e) => update("linkedinEmail", e.target.value)} />
                      )}

                      <Input id="linkedinUrl" label="LinkedIn Profile URL *" placeholder="https://linkedin.com/in/yourprofile" value={form.linkedinUrl} onChange={(e) => update("linkedinUrl", e.target.value)} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input id="connectionCount" label="Approx. Connections" type="text" inputMode="numeric" placeholder="e.g. 5000" value={form.connectionCount} onChange={(e) => update("connectionCount", e.target.value.replace(/\D/g, ""))} />
                    <Input id="location" label="Location" placeholder="e.g. New York, NY" value={form.location} onChange={(e) => update("location", e.target.value)} />
                  </div>
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer">
                        <input type="checkbox" checked={form.verified as unknown as boolean} onChange={(e) => setForm(prev => ({ ...prev, verified: e.target.checked }))} className="rounded border-gray-300 h-4 w-4" />
                        My LinkedIn profile is verified
                      </label>
                      <p className="text-xs text-gray-400 ml-7 mt-1">Leave blank if you&apos;re unsure</p>
                    </div>
                    <div>
                      <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer">
                        <input type="checkbox" checked={form.hasSalesNav as unknown as boolean} onChange={(e) => setForm(prev => ({ ...prev, hasSalesNav: e.target.checked }))} className="rounded border-gray-300 h-4 w-4" />
                        I have Sales Navigator
                      </label>
                      <p className="text-xs text-gray-400 ml-7 mt-1">Leave blank if you&apos;re unsure</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Anything else?</label>
                    <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={2}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g. 10+ years old, specific industry experience" />
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
                  {offer.reasons.filter((r) => r.positive).length <= 1 && (
                    <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                      <strong>Limited information available.</strong> We weren&apos;t able to fully assess your profile with the details provided.
                      This is an automated estimate — if you&apos;d like a more accurate offer, our team can review your profile manually.
                    </div>
                  )}
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
                {offer.reasons.filter((r) => r.positive).length <= 1 ? (
                  <Button variant="outline" size="lg" onClick={() => setStep("review")} className="flex-1">
                    Request Manual Review
                  </Button>
                ) : (
                  <Button variant="outline" size="lg" onClick={() => { setStep("info"); setOffer(null); }} className="flex-1">
                    No, Thank You
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* STEP: Manual Review Contact Options */}
          {step === "review" && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Request a Manual Review</h2>
              <p className="text-center text-gray-500 mb-6">
                Our team will personally review your profile and get back to you with a tailored offer. Reach out to us through any of the channels below.
              </p>

              <div className="space-y-3">
                <a
                  href="https://wa.me/447700123456"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <svg viewBox="0 0 24 24" className="h-6 w-6 text-green-600" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">WhatsApp Us</p>
                    <p className="text-sm text-gray-500">+44 7700 123456</p>
                  </div>
                </a>

                <a
                  href="https://t.me/clabber_support"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                    <svg viewBox="0 0 24 24" className="h-6 w-6 text-blue-500" fill="currentColor">
                      <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Telegram Us</p>
                    <p className="text-sm text-gray-500">@clabber_support</p>
                  </div>
                </a>

                <a
                  href="mailto:ambassadors@clabber.co"
                  className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                    <svg viewBox="0 0 24 24" className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="M22 4l-10 8L2 4" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Email Us</p>
                    <p className="text-sm text-gray-500">ambassadors@clabber.co</p>
                  </div>
                </a>
              </div>

              <div className="mt-6">
                <Button variant="outline" size="lg" className="w-full" onClick={() => setStep("result")}>
                  Back to Offer
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: Payment details */}
          {step === "bank" && (
            <form onSubmit={handleBankSubmit}>
              <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Payment Details</h2>
              <p className="text-center text-gray-500 mb-6">
                How would you like to receive your {offer ? formatCurrency(offer.amount) : ""}/month payment?
              </p>

              {/* Payment method selection */}
              <div className="space-y-3 mb-6">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("usdc")}
                  className={`flex items-center gap-4 w-full rounded-xl border-2 p-5 text-left transition-all ${paymentMethod === "usdc" ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"}`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 flex-shrink-0">
                    <svg viewBox="0 0 24 24" className="h-6 w-6 text-blue-600" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v-2h-2v2zm0-4h2V7h-2v6z"/>
                      <text x="7" y="16" fontSize="10" fontWeight="bold" fill="currentColor">$</text>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">USDC</p>
                    <p className="text-sm text-gray-500">Receive stablecoin to your crypto wallet. Fast, zero fees.</p>
                  </div>
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${paymentMethod === "usdc" ? "border-blue-600" : "border-gray-300"}`}>
                    {paymentMethod === "usdc" && <div className="h-2.5 w-2.5 rounded-full bg-blue-600" />}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("paypal")}
                  className={`flex items-center gap-4 w-full rounded-xl border-2 p-5 text-left transition-all ${paymentMethod === "paypal" ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"}`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 flex-shrink-0">
                    <svg viewBox="0 0 24 24" className="h-6 w-6 text-indigo-600" fill="currentColor">
                      <path d="M7.076 21.337H2.47a.641.641 0 01-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 00-.607-.541c1.652 1.046 2.024 2.986 1.488 5.74-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.44 9.137a.641.641 0 00.633.74h3.874c.457 0 .85-.334.922-.788l.038-.2.728-4.617.047-.254a.932.932 0 01.922-.788h.58c3.76 0 6.705-1.528 7.566-5.946.36-1.847.174-3.388-.777-4.471a3.71 3.71 0 00-1.092-.709z"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">PayPal</p>
                    <p className="text-sm text-gray-500">Receive payment to your PayPal account. Available worldwide.</p>
                  </div>
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${paymentMethod === "paypal" ? "border-blue-600" : "border-gray-300"}`}>
                    {paymentMethod === "paypal" && <div className="h-2.5 w-2.5 rounded-full bg-blue-600" />}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("wise")}
                  className={`flex items-center gap-4 w-full rounded-xl border-2 p-5 text-left transition-all ${paymentMethod === "wise" ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"}`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 flex-shrink-0">
                    <svg viewBox="0 0 24 24" className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Wise</p>
                    <p className="text-sm text-gray-500">Receive to your bank account via Wise. Low fees, great rates.</p>
                  </div>
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${paymentMethod === "wise" ? "border-blue-600" : "border-gray-300"}`}>
                    {paymentMethod === "wise" && <div className="h-2.5 w-2.5 rounded-full bg-blue-600" />}
                  </div>
                </button>
              </div>

              {/* USDC fields */}
              {paymentMethod === "usdc" && (
                <Card>
                  <CardContent className="py-6 space-y-4">
                    <Input
                      id="usdcWalletAddress"
                      label="Wallet Address"
                      placeholder="0x... or ENS name"
                      value={bankForm.usdcWalletAddress}
                      onChange={(e) => updateBank("usdcWalletAddress", e.target.value)}
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Network</label>
                      <select
                        value={bankForm.usdcNetwork}
                        onChange={(e) => updateBank("usdcNetwork", e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="ethereum">Ethereum (ERC-20)</option>
                        <option value="polygon">Polygon</option>
                        <option value="arbitrum">Arbitrum</option>
                        <option value="base">Base</option>
                        <option value="solana">Solana</option>
                      </select>
                    </div>
                    <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
                      Make sure your wallet supports USDC on the selected network. Sending to the wrong network may result in lost funds.
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* PayPal fields */}
              {paymentMethod === "paypal" && (
                <Card>
                  <CardContent className="py-6 space-y-4">
                    <Input
                      id="paypalEmail"
                      label="PayPal Email"
                      type="email"
                      placeholder="your@email.com"
                      value={bankForm.paypalEmail}
                      onChange={(e) => updateBank("paypalEmail", e.target.value)}
                    />
                    <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
                      Make sure this is the email address linked to your PayPal account. PayPal fees may apply.
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Wise fields */}
              {paymentMethod === "wise" && (
                <Card>
                  <CardContent className="py-6 space-y-4">
                    <Input
                      id="wiseEmail"
                      label="Wise Email"
                      type="email"
                      placeholder="your@email.com"
                      value={bankForm.wiseEmail}
                      onChange={(e) => updateBank("wiseEmail", e.target.value)}
                    />
                    <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-800">
                      We&apos;ll send payment to your Wise account. If you don&apos;t have one yet, <a href="https://wise.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">sign up for free</a>.
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="mt-6 flex gap-3">
                <Button variant="outline" size="lg" type="button" onClick={() => setStep("result")}>
                  Back
                </Button>
                {paymentMethod && (
                  <Button type="submit" loading={loading} className="flex-1" size="lg">
                    Submit &amp; Complete Setup
                  </Button>
                )}
              </div>
            </form>
          )}

          {/* STEP 5: Link LinkedIn — two options */}
          {step === "login" && (
            <div className="py-4">
              <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Link Your LinkedIn Account</h2>
              <p className="text-center text-gray-500 mb-8">
                Pick one of the two options below to connect your LinkedIn profile.
              </p>

              {/* Option A: Do it yourself */}
              <Card>
                <CardContent className="py-8">
                  <div className="text-center mb-4">
                    <span className="inline-block rounded-full bg-blue-100 px-4 py-1.5 text-sm font-semibold text-blue-700 mb-4">Option A</span>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Set It Up Yourself</h3>
                    <p className="text-gray-500">Takes about 2 minutes using the Klabber app.</p>
                  </div>

                  <hr className="border-gray-200 mb-6" />

                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white flex-shrink-0">1</div>
                      <div>
                        <p className="font-semibold text-gray-900">Download the Klabber App</p>
                        <div className="flex gap-3 mt-3">
                          <a
                            href="/api/download"
                            className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-6 py-3 text-center font-semibold text-white hover:bg-gray-800 transition-colors"
                          >
                            Download for Mac
                          </a>
                          <span className="inline-flex items-center justify-center rounded-lg bg-gray-100 border border-gray-200 px-6 py-3 text-center font-semibold text-gray-400 cursor-not-allowed">
                            Windows — Coming Soon
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">If macOS says the app can&apos;t be opened, right-click the app and choose <strong>Open</strong> — you&apos;ll only need to do this once.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white flex-shrink-0">2</div>
                      <div>
                        <p className="font-semibold text-gray-900">Sign into the app</p>
                        <p className="text-sm text-gray-500 mt-1">Enter your email (<strong>{form.email}</strong>) and verify via the code we send you.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white flex-shrink-0">3</div>
                      <div>
                        <p className="font-semibold text-gray-900">Add your LinkedIn profile</p>
                        <p className="text-sm text-gray-500 mt-1">Click &quot;+ Add Profile&quot;, enter your details, and log into LinkedIn in the secure Chrome browser that opens.</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 rounded-lg bg-blue-50 border border-blue-100 p-4 text-sm text-blue-700">
                    <strong>Your login is safe.</strong> We never see your password — only the session cookie is stored.
                  </div>

                  <Button size="lg" className="w-full mt-6" onClick={() => setStep("complete")}>
                    I&apos;ve Completed the Steps
                  </Button>
                </CardContent>
              </Card>

              {/* Divider */}
              <div className="flex items-center gap-4 my-8">
                <div className="flex-1 border-t border-gray-200" />
                <span className="text-sm font-medium text-gray-400 uppercase tracking-wide">or</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>

              {/* Option B: Get help from our team */}
              <Card>
                <CardContent className="py-8">
                  <div className="text-center mb-4">
                    <span className="inline-block rounded-full bg-green-100 px-4 py-1.5 text-sm font-semibold text-green-700 mb-4">Option B</span>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Get Help From Our Team</h3>
                    <p className="text-gray-500">We&apos;ll walk you through it and set everything up together.</p>
                  </div>

                  <hr className="border-gray-200 mb-6" />

                  <div className="space-y-4">
                    <a
                      href="https://wa.me/447700123456"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-green-300 hover:bg-green-50"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 flex-shrink-0">
                        <svg viewBox="0 0 24 24" className="h-6 w-6 text-green-600" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">WhatsApp</p>
                        <p className="text-sm text-gray-500">+44 7700 123456</p>
                      </div>
                    </a>

                    <a
                      href="https://t.me/klabber_support"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-blue-300 hover:bg-blue-50"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 flex-shrink-0">
                        <svg viewBox="0 0 24 24" className="h-6 w-6 text-blue-500" fill="currentColor">
                          <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Telegram</p>
                        <p className="text-sm text-gray-500">@klabber_support</p>
                      </div>
                    </a>

                    <a
                      href="mailto:ambassadors@klabber.co"
                      className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-purple-300 hover:bg-purple-50"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 flex-shrink-0">
                        <svg viewBox="0 0 24 24" className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="4" width="20" height="16" rx="2" />
                          <path d="M22 4l-10 8L2 4" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Email</p>
                        <p className="text-sm text-gray-500">ambassadors@klabber.co</p>
                      </div>
                    </a>
                  </div>

                  <p className="text-sm text-gray-400 mt-5 text-center">Our team will guide you through the entire process step by step.</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* STEP 6: Waiting for confirmation */}
          {step === "complete" && (
            <div className="py-4">
              <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Almost Done!</h2>
              <p className="text-center text-gray-500 mb-6">
                If you&apos;ve completed the steps in the app, your account should be registered automatically. Click below to finish.
              </p>

              <Card>
                <CardContent className="py-6">
                  <div className="space-y-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 flex-shrink-0">
                        <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">App downloaded and installed</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 flex-shrink-0">
                        <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Logged into LinkedIn via the secure browser</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 flex-shrink-0">
                        <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Session saved and account registered</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-800">
                    <strong>All done!</strong> Your account will appear in our marketplace and you&apos;ll start earning monthly once it&apos;s rented.
                  </div>
                </CardContent>
              </Card>

              <div className="mt-6 space-y-3">
                <Button size="lg" className="w-full" loading={loading} onClick={async () => {
                  setLoading(true);
                  setError("");
                  try {
                    // Create the ambassador's user account + LinkedIn account in the system
                    const res = await fetch("/api/ambassador/complete", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        fullName: form.fullName,
                        email: form.email,
                        linkedinUrl: form.linkedinUrl,
                        connectionCount: form.connectionCount ? Number(form.connectionCount) : undefined,
                        industry: form.industry,
                        location: form.location,
                        profileId: profileId,
                        offeredAmount: offer?.amount,
                      }),
                    });
                    const resData = await res.json();
                    if (!res.ok) {
                      setError(resData.error || "Something went wrong");
                      return;
                    }
                    if (resData.user?.tempPassword) {
                      setCredentials({ email: resData.user.email, tempPassword: resData.user.tempPassword });
                    }
                    setStep("done");
                  } catch {
                    setStep("done"); // Don't block them
                  } finally {
                    setLoading(false);
                  }
                }}>
                  I&apos;ve Logged In &amp; Stopped the Profile — Complete Setup
                </Button>
                <Button size="lg" variant="outline" className="w-full" onClick={() => setStep("login")}>
                  I Need Help — Go Back to Instructions
                </Button>
              </div>
            </div>
          )}

          {/* STEP 7: Done */}
          {step === "done" && (
            <div className="text-center py-8">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">You&apos;re All Set!</h2>
              <p className="mt-4 text-lg text-gray-600">
                Your LinkedIn account is now connected and your payment details are saved.
              </p>

              {/* Login credentials */}
              {credentials && (
                <Card className="mt-6">
                  <CardContent className="py-5">
                    <p className="text-sm font-semibold text-gray-900 mb-3">Your Ambassador Account</p>
                    <p className="text-sm text-gray-600 mb-3">
                      We&apos;ve created an account for you so you can log back in and manage your ambassador profile.
                    </p>
                    <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Email</span>
                        <span className="font-mono font-medium text-gray-900">{credentials.email}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Temporary Password</span>
                        <span className="font-mono font-medium text-gray-900">{credentials.tempPassword}</span>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-gray-400">Save this password — you can change it after logging in.</p>
                  </CardContent>
                </Card>
              )}

              <Card className="mt-6 text-left">
                <CardContent className="py-6">
                  <h3 className="font-semibold text-gray-900 mb-4">What happens next?</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 flex-shrink-0 mt-0.5">
                        <svg className="h-3.5 w-3.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Your account is now live</p>
                        <p className="text-sm text-gray-500">We&apos;ll list your LinkedIn account in our marketplace for businesses to rent.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 flex-shrink-0 mt-0.5">
                        <svg className="h-3.5 w-3.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Monthly payments of {offer ? formatCurrency(offer.amount) : ""}</p>
                        <p className="text-sm text-gray-500">Paid directly to your bank account on the 1st of each month while your account is active.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-100 flex-shrink-0 mt-0.5">
                        <svg className="h-3.5 w-3.5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Keep your account logged in</p>
                        <p className="text-sm text-gray-500">If your LinkedIn account gets logged out, we&apos;ll contact you to re-authenticate. Monthly payments are paused until access is restored.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 flex-shrink-0 mt-0.5">
                        <svg className="h-3.5 w-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Cancel anytime</p>
                        <p className="text-sm text-gray-500">Give us 30 days notice and we&apos;ll stop renting your account and return full access to you.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <p className="mt-6 text-sm text-gray-400">
                Questions? Contact us at support@klabber.co
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
