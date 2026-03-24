"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [contactMethod, setContactMethod] = useState<"whatsapp" | "telegram">("whatsapp");
  const [contactHandle, setContactHandle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter your first and last name.");
      return;
    }
    if (!contactHandle) {
      setError("Please provide your WhatsApp number or Telegram username.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      // Register the user first (ignore if already exists)
      await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          fullName: `${firstName.trim()} ${lastName.trim()}`,
          contactMethod,
          contactHandle,
        }),
      }).catch(() => {});

      // Send verification code
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed to send verification code");
        return;
      }

      setCodeSent(true);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Invalid code");
        return;
      }

      window.location.href = redirect && redirect.startsWith("/") ? redirect : "/dashboard";
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (codeSent) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 text-center">Check your email</h1>
          <p className="mt-2 text-center text-sm text-gray-500">We sent a 6-digit code to <span className="font-medium text-gray-900">{email}</span></p>
          <form onSubmit={handleVerify} className="mt-8 space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
            )}
            <Input
              id="code"
              label="Verification code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="000000"
              maxLength={6}
              required
            />
            <Button type="submit" loading={loading} className="w-full">
              Verify & Create Account
            </Button>
          </form>
          <button
            onClick={() => setCodeSent(false)}
            className="mt-4 block w-full text-center text-sm text-gray-500 hover:text-gray-700"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-[#1D1B16] flex items-center justify-center text-white text-sm font-bold" style={{ fontFamily: "'Instrument Sans', sans-serif", letterSpacing: "-0.03em" }}>kl</div>
          <span className="text-xl font-bold text-[#1D1B16]" style={{ fontFamily: "'Instrument Sans', sans-serif", letterSpacing: "-0.03em" }}>Klabber</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 text-center">Create your account</h1>
        <p className="mt-2 text-center text-sm text-gray-500 mb-8">Start renting or sharing LinkedIn accounts in minutes.</p>
        <form onSubmit={handleSendCode} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="firstName"
              label="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="John"
              required
            />
            <Input
              id="lastName"
              label="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Doe"
              required
            />
          </div>
          <Input
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john@company.com"
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              WhatsApp or Telegram <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setContactMethod("whatsapp")}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${contactMethod === "whatsapp" ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
              >
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setContactMethod("telegram")}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${contactMethod === "telegram" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
              >
                Telegram
              </button>
            </div>
            <input
              type="text"
              value={contactHandle}
              onChange={(e) => setContactHandle(e.target.value)}
              placeholder={contactMethod === "whatsapp" ? "+44 7700 000000" : "@username"}
              required
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Only used for account communication — never for marketing.</p>
          </div>
          <Button type="submit" loading={loading} className="w-full">
            Continue
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link href={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login"} className="font-medium text-blue-600 hover:text-blue-500">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
