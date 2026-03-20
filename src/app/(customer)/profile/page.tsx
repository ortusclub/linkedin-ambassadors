"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  contactNumber: string | null;
  role: string;
  stripeCustomerId: string | null;
  createdAt: string;
}

interface PaymentDetails {
  paymentMethod: string | null;
  bankName: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankRoutingNumber: string | null;
  bankSortCode: string | null;
  usdcWalletAddress: string | null;
  usdcNetwork: string | null;
  paypalEmail: string | null;
  wiseEmail: string | null;
}

type Section = "personal" | "billing" | "payout";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<Section>("personal");

  // Personal info form
  const [fullName, setFullName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  // Payment form
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [bankName, setBankName] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankRoutingNumber, setBankRoutingNumber] = useState("");
  const [bankSortCode, setBankSortCode] = useState("");
  const [usdcWalletAddress, setUsdcWalletAddress] = useState("");
  const [usdcNetwork, setUsdcNetwork] = useState("ethereum");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [wiseEmail, setWiseEmail] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => {
        if (r.status === 401) { window.location.href = "/login"; return null; }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        const u = data.user;
        setUser(u);
        setFullName(u.fullName || "");
        setContactNumber(u.contactNumber || "");

        if (data.paymentDetails) {
          const p = data.paymentDetails;
          setPaymentDetails(p);
          setPaymentMethod(p.paymentMethod || "bank_transfer");
          setBankName(p.bankName || "");
          setBankAccountName(p.bankAccountName || "");
          setBankAccountNumber(p.bankAccountNumber || "");
          setBankRoutingNumber(p.bankRoutingNumber || "");
          setBankSortCode(p.bankSortCode || "");
          setUsdcWalletAddress(p.usdcWalletAddress || "");
          setUsdcNetwork(p.usdcNetwork || "ethereum");
          setPaypalEmail(p.paypalEmail || "");
          setWiseEmail(p.wiseEmail || "");
        }
        setLoading(false);
      })
      .catch(() => router.push("/login"));
  }, [router]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMessage("");

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, contactNumber }),
    });

    if (res.ok) {
      const data = await res.json();
      setUser((prev) => prev ? { ...prev, ...data.user } : prev);
      setProfileMessage("Profile updated successfully.");
    } else {
      setProfileMessage("Failed to update profile.");
    }
    setSavingProfile(false);
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPayment(true);
    setPaymentMessage("");

    const res = await fetch("/api/profile/payment", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentMethod, bankName, bankAccountName, bankAccountNumber,
        bankRoutingNumber, bankSortCode, usdcWalletAddress, usdcNetwork,
        paypalEmail, wiseEmail,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setPaymentDetails(data.paymentDetails);
      setPaymentMessage("Payment details updated successfully.");
    } else {
      const data = await res.json();
      setPaymentMessage(data.error || "Failed to update payment details.");
    }
    setSavingPayment(false);
  };

  const handleBillingPortal = async () => {
    const res = await fetch("/api/rentals/billing-portal", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  };

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF8]">
        <div className="mx-auto max-w-3xl px-4 py-12">
          <div className="h-24 animate-pulse rounded-2xl bg-gray-200 mb-6" />
          <div className="h-64 animate-pulse rounded-2xl bg-gray-200" />
        </div>
      </div>
    );
  }

  const sidebarItems: { key: Section; label: string; icon: string }[] = [
    { key: "personal", label: "Personal Info", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
    { key: "billing", label: "Billing", icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
    { key: "payout", label: "Payout Details", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">

        {/* Profile Header */}
        <div className="mb-10">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600 transition-colors mb-6 inline-block">
            &larr; Back to Dashboard
          </Link>
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 rounded-full bg-[#1D1B16] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xl font-semibold tracking-tight" style={{ fontFamily: "'Instrument Sans', sans-serif" }}>
                {user ? getInitials(user.fullName) : ""}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1D1B16] tracking-tight" style={{ fontFamily: "'Instrument Sans', sans-serif" }}>
                {user?.fullName}
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-8 bg-white rounded-xl border border-gray-200 p-1">
          {sidebarItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveSection(item.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeSection === item.key
                  ? "bg-[#1D1B16] text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              {item.label}
            </button>
          ))}
        </div>

        {/* Personal Info Section */}
        {activeSection === "personal" && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-[#1D1B16]">Personal Information</h2>
              <p className="text-sm text-gray-400 mt-1">Update your name and contact details.</p>
            </div>
            <div className="px-6 py-6">
              <form onSubmit={handleSaveProfile} className="space-y-5">
                <Input
                  id="fullName"
                  label="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Email Address</label>
                  <p className="block w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-400 text-sm">
                    {user?.email}
                  </p>
                  <p className="text-xs text-gray-400">Email cannot be changed. Create a new account to use a different email.</p>
                </div>
                <div className="space-y-1">
                  <Input
                    id="contactNumber"
                    label="Phone Number"
                    type="tel"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                  />
                  <p className="text-xs text-gray-400">Please include your country code (e.g. +1, +44). We'll only contact you if there's an issue with one of your ambassador accounts or if we're having issues with your billing or payment information. We won't contact you for marketing or spamming.</p>
                </div>
                {profileMessage && (
                  <div className={`text-sm px-4 py-3 rounded-lg ${
                    profileMessage.includes("success")
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}>
                    {profileMessage}
                  </div>
                )}
                <div className="pt-2">
                  <Button type="submit" variant="primary" loading={savingProfile}>
                    Save Changes
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Billing Section */}
        {activeSection === "billing" && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-[#1D1B16]">Subscription Billing</h2>
              <p className="text-sm text-gray-400 mt-1">Manage the payment methods you use to pay for rented LinkedIn accounts.</p>
            </div>
            <div className="px-6 py-6">
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900">Payment Methods</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Add, remove, or update the credit cards and payment methods linked to your account. This is managed securely through Stripe.
                    </p>
                    <Button variant="outline" className="mt-4" onClick={handleBillingPortal}>
                      Manage Payment Methods
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payout Details Section */}
        {activeSection === "payout" && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-[#1D1B16]">Ambassador Payout Details</h2>
              <p className="text-sm text-gray-400 mt-1">Choose how you receive earnings from your ambassador accounts.</p>
            </div>
            <div className="px-6 py-6">
              {!paymentDetails ? (
                <div className="text-center py-8">
                  <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500 mb-1">No payout details yet.</p>
                  <p className="text-xs text-gray-400 mb-4">Payout details are configured when you become an ambassador.</p>
                  <Link href="/become-ambassador">
                    <Button variant="outline" size="sm">Become an Ambassador</Button>
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSavePayment} className="space-y-5">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="paypal">PayPal</option>
                      <option value="wise">Wise</option>
                      <option value="usdc">USDC (Crypto)</option>
                    </select>
                  </div>

                  {paymentMethod === "bank_transfer" && (
                    <div className="space-y-4 pl-0">
                      <Input id="bankName" label="Bank Name" value={bankName} onChange={(e) => setBankName(e.target.value)} />
                      <Input id="bankAccountName" label="Account Holder Name" value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} />
                      <Input id="bankAccountNumber" label="Account Number" value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} />
                      <div className="grid grid-cols-2 gap-4">
                        <Input id="bankRoutingNumber" label="Routing Number" value={bankRoutingNumber} onChange={(e) => setBankRoutingNumber(e.target.value)} placeholder="US accounts" />
                        <Input id="bankSortCode" label="Sort Code" value={bankSortCode} onChange={(e) => setBankSortCode(e.target.value)} placeholder="UK accounts" />
                      </div>
                    </div>
                  )}

                  {paymentMethod === "paypal" && (
                    <Input id="paypalEmail" label="PayPal Email" type="email" value={paypalEmail} onChange={(e) => setPaypalEmail(e.target.value)} />
                  )}

                  {paymentMethod === "wise" && (
                    <Input id="wiseEmail" label="Wise Email" type="email" value={wiseEmail} onChange={(e) => setWiseEmail(e.target.value)} />
                  )}

                  {paymentMethod === "usdc" && (
                    <div className="space-y-4">
                      <Input id="usdcWalletAddress" label="USDC Wallet Address" value={usdcWalletAddress} onChange={(e) => setUsdcWalletAddress(e.target.value)} />
                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Network</label>
                        <select
                          value={usdcNetwork}
                          onChange={(e) => setUsdcNetwork(e.target.value)}
                          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="ethereum">Ethereum</option>
                          <option value="polygon">Polygon</option>
                          <option value="solana">Solana</option>
                          <option value="base">Base</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {paymentMessage && (
                    <div className={`text-sm px-4 py-3 rounded-lg ${
                      paymentMessage.includes("success")
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}>
                      {paymentMessage}
                    </div>
                  )}
                  <div className="pt-2">
                    <Button type="submit" variant="primary" loading={savingPayment}>
                      Save Payout Details
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
