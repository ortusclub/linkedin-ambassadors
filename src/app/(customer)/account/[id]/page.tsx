"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatNumber, formatCurrency } from "@/lib/utils";

interface Account {
  id: string;
  linkedinName: string;
  linkedinHeadline: string | null;
  linkedinUrl: string | null;
  connectionCount: number;
  industry: string | null;
  location: string | null;
  profileScreenshotUrl: string | null;
  profilePhotoUrl: string | null;
  accountAgeMonths: number | null;
  hasSalesNav: boolean;
  monthlyPrice: number | string;
  status: string;
  notes: string | null;
  gologinProfileId: string | null;
}

interface User {
  id: string;
  role: string;
}

export default function AccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [browserOpen, setBrowserOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/accounts/${params.id}`).then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()).catch(() => ({ user: null })),
    ]).then(([accountData, userData]) => {
      setAccount(accountData.account);
      setUser(userData.user);
      setLoading(false);
    });
  }, [params.id]);

  const isAdmin = user?.role === "admin";

  const handleOpenBrowser = async () => {
    if (!account?.gologinProfileId) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/browser/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: account.gologinProfileId, accountName: account.linkedinName }),
      });
      const data = await res.json();
      if (res.ok) {
        setBrowserOpen(true);
      } else {
        alert(data.error || "Failed to open browser");
      }
    } catch {
      alert("Failed to open browser");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRent = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/rentals/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: params.id }),
      });
      const data = await res.json();

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="h-96 animate-pulse rounded-2xl bg-gray-200" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Account not found</h1>
      </div>
    );
  }

  const price =
    typeof account.monthlyPrice === "string"
      ? parseFloat(account.monthlyPrice)
      : account.monthlyPrice;

  const displayName = account.linkedinName.replace(/\s*\(.*\)\s*$/, "");

  const ageLabel = account.accountAgeMonths
    ? account.accountAgeMonths >= 12
      ? `${Math.floor(account.accountAgeMonths / 12)}+ years`
      : `${account.accountAgeMonths} months`
    : null;

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Hero header */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Photo */}
            {account.profilePhotoUrl ? (
              <img
                src={account.profilePhotoUrl}
                alt={displayName}
                className="h-24 w-24 rounded-2xl object-cover shadow-sm border border-gray-100 flex-shrink-0"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0A66C2] to-[#004182] text-3xl font-bold text-white shadow-sm flex-shrink-0">
                {displayName.charAt(0)}
              </div>
            )}

            {/* Name & headline */}
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{displayName}</h1>
              {account.linkedinHeadline && (
                <p className="mt-1.5 text-gray-600 text-lg leading-relaxed">{account.linkedinHeadline}</p>
              )}
              {account.location && (
                <p className="mt-1 text-sm text-gray-500">{account.location}</p>
              )}

              {/* Key stats */}
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5">
                  <span className="text-sm font-semibold text-blue-700">{formatNumber(account.connectionCount)}</span>
                  <span className="text-sm text-blue-600">connections</span>
                </div>
                {ageLabel && (
                  <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-1.5">
                    <span className="text-sm font-semibold text-green-700">{ageLabel}</span>
                    <span className="text-sm text-green-600">on LinkedIn</span>
                  </div>
                )}
                {account.hasSalesNav && (
                  <div className="flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-1.5">
                    <span className="text-sm font-semibold text-purple-700">Sales Navigator</span>
                  </div>
                )}
                {account.industry && (
                  <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5">
                    <span className="text-sm text-gray-700">{account.industry}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-3">
          {/* Left: Screenshot + About */}
          <div className="lg:col-span-2 space-y-8">
            {/* Profile screenshot */}
            {account.profileScreenshotUrl && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Profile Preview</h2>
                <img
                  src={account.profileScreenshotUrl}
                  alt={`${displayName}'s LinkedIn profile`}
                  className="rounded-2xl border border-gray-200 shadow-sm w-full"
                />
              </div>
            )}

            {/* What you get */}
            {!isAdmin && (
              <div className="rounded-2xl bg-white border border-gray-200 p-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">What You Get</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { title: "Klabber Desktop App", desc: "Secure browser session managed through the Klabber app" },
                    { title: "Dedicated Proxy", desc: "Residential proxy assigned exclusively to this account" },
                    { title: "Pre-Authenticated", desc: "LinkedIn session already logged in and ready to use" },
                    { title: "Works Anywhere", desc: "Access from any device with the Klabber app installed" },
                    { title: "Cancel Anytime", desc: "No lock-in, cancel your subscription whenever you want" },
                    { title: "Email Reminders", desc: "Renewal notifications so you're always in control" },
                  ].map((item) => (
                    <div key={item.title} className="flex items-start gap-3 rounded-xl bg-gray-50 p-4">
                      <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-600 flex-shrink-0">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                        <p className="text-sm text-gray-500 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar: Pricing + Actions */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-4">
              {/* Pricing card */}
              <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
                {isAdmin ? (
                  <div className="space-y-3">
                    {browserOpen ? (
                      <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-800">
                        Browser is open. The Klabber window should be visible on your screen.
                      </div>
                    ) : account.gologinProfileId ? (
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={handleOpenBrowser}
                        loading={actionLoading}
                        className="w-full"
                      >
                        Open Browser Session
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <>
                    <div className="text-center mb-6">
                      <p className="text-4xl font-bold text-gray-900 tracking-tight">
                        {formatCurrency(price)}
                        <span className="text-lg font-normal text-gray-500">/mo</span>
                      </p>
                      <p className="mt-1 text-sm text-gray-500">Cancel anytime</p>
                    </div>

                    <div className="flex gap-3">
                      {account.linkedinUrl && (
                        <a
                          href={account.linkedinUrl.startsWith("http") ? account.linkedinUrl : `https://${account.linkedinUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center rounded-lg border border-gray-200 h-11 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          View Profile
                        </a>
                      )}
                      {account.status === "available" ? (
                        <button onClick={handleRent} disabled={actionLoading} className="flex-1 flex items-center justify-center rounded-lg bg-blue-600 h-11 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 whitespace-nowrap">
                          {actionLoading ? "Processing..." : "Rent Account"}
                        </button>
                      ) : (
                        <button disabled className="flex-1 flex items-center justify-center rounded-lg bg-gray-100 h-11 text-sm font-semibold text-gray-400 cursor-not-allowed">
                          Unavailable
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Quick stats card */}
              <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Account Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Connections</span>
                    <span className="text-sm font-semibold text-gray-900">{formatNumber(account.connectionCount)}</span>
                  </div>
                  {ageLabel && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Account Age</span>
                      <span className="text-sm font-semibold text-gray-900">{ageLabel}</span>
                    </div>
                  )}
                  {account.industry && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Industry</span>
                      <span className="text-sm font-semibold text-gray-900">{account.industry}</span>
                    </div>
                  )}
                  {account.location && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Location</span>
                      <span className="text-sm font-semibold text-gray-900">{account.location}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Sales Navigator</span>
                    <span className="text-sm font-semibold text-gray-900">{account.hasSalesNav ? "Yes" : "No"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Status</span>
                    <span className={`text-sm font-semibold ${account.status === "available" ? "text-green-600" : "text-gray-500"}`}>
                      {account.status.charAt(0).toUpperCase() + account.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
