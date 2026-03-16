"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
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
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="h-96 animate-pulse rounded-xl bg-gray-200" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Account not found</h1>
      </div>
    );
  }

  const price =
    typeof account.monthlyPrice === "string"
      ? parseFloat(account.monthlyPrice)
      : account.monthlyPrice;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-8 md:grid-cols-2">
        {/* Screenshot */}
        <div>
          {account.profileScreenshotUrl ? (
            <img
              src={account.profileScreenshotUrl}
              alt={`${account.linkedinName}'s LinkedIn profile`}
              className="rounded-xl border border-gray-200 shadow-sm"
            />
          ) : (
            <div className="flex h-80 items-center justify-center rounded-xl border border-gray-200 bg-gray-100">
              <div className="text-center">
                <div className="mx-auto h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center text-4xl font-bold text-gray-400">
                  {account.linkedinName.charAt(0)}
                </div>
                <p className="mt-4 text-gray-500">Profile screenshot coming soon</p>
              </div>
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <div className="flex items-start gap-4">
            {account.profilePhotoUrl ? (
              <img
                src={account.profilePhotoUrl}
                alt={account.linkedinName}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 text-2xl font-semibold text-gray-400">
                {account.linkedinName.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{account.linkedinName}</h1>
              {account.linkedinHeadline && (
                <p className="mt-1 text-gray-600">{account.linkedinHeadline}</p>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Badge variant="info">{formatNumber(account.connectionCount)} connections</Badge>
            {account.industry && <Badge>{account.industry}</Badge>}
            {account.location && <Badge>{account.location}</Badge>}
            {account.accountAgeMonths && (
              <Badge>
                {account.accountAgeMonths >= 12
                  ? `${Math.floor(account.accountAgeMonths / 12)} years on LinkedIn`
                  : `${account.accountAgeMonths} months on LinkedIn`}
              </Badge>
            )}
            {account.hasSalesNav && <Badge variant="success">Sales Navigator</Badge>}
          </div>

          {account.notes && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700">About this account</h3>
              <p className="mt-1 text-gray-600">{account.notes}</p>
            </div>
          )}

          <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-6">
            {isAdmin ? (
              /* Admin view — just open the browser */
              <div className="space-y-3">
                {browserOpen ? (
                  <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-800">
                    Browser is open. The GoLogin window should be visible on your screen.
                  </div>
                ) : (
                  <Button
                    size="lg"
                    onClick={handleOpenBrowser}
                    loading={actionLoading}
                    className="w-full"
                  >
                    Open Account
                  </Button>
                )}
                {account.gologinProfileId && (
                  <p className="text-xs text-gray-400 text-center">
                    GoLogin: {account.gologinProfileId}
                  </p>
                )}
              </div>
            ) : (
              /* Customer view — rent via Stripe */
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatCurrency(price)}
                    <span className="text-base font-normal text-gray-500">/month</span>
                  </p>
                  <p className="mt-1 text-sm text-gray-500">Cancel anytime</p>
                </div>

                {account.status === "available" ? (
                  <Button size="lg" onClick={handleRent} loading={actionLoading}>
                    Rent This Account
                  </Button>
                ) : (
                  <Button size="lg" disabled variant="secondary">
                    Currently Unavailable
                  </Button>
                )}
              </div>
            )}
          </div>

          {!isAdmin && (
            <div className="mt-6 text-sm text-gray-500">
              <h3 className="font-medium text-gray-700">What you get:</h3>
              <ul className="mt-2 space-y-1">
                <li>- Fully configured browser profile via GoLogin</li>
                <li>- Dedicated residential proxy</li>
                <li>- LinkedIn session already authenticated</li>
                <li>- Works from any device with GoLogin installed</li>
                <li>- Auto-renew with email reminders</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
