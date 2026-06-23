"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDate, formatCurrency } from "@/lib/utils";
import { CardTopUp } from "./card-topup";
import { startDashboardTour } from "@/lib/dashboard-tour";

interface Rental {
  id: string;
  status: string;
  paused?: boolean;
  startDate: string;
  currentPeriodEnd: string | null;
  autoRenew: boolean;
  linkedinAccount: {
    id: string;
    linkedinName: string;
    linkedinHeadline: string | null;
    profilePhotoUrl: string | null;
    connectionCount: number;
    gologinProfileId: string | null;
    gologinShareLink: string | null;
  };
}

interface AmbassadorAccount {
  id: string;
  linkedinName: string;
  linkedinHeadline: string | null;
  notes: string | null;
  profilePhotoUrl: string | null;
  connectionCount: number;
  status: string;
  monthlyPrice: string | number;
  ambassadorPayment: string | number;
  gologinProfileId: string | null;
  proxyHost: string | null;
  proxyPort: number | null;
  removedAt: string | null;
  removedBy: string | null;
  createdAt: string;
  rentals: Array<{ id: string; startDate: string; currentPeriodEnd: string | null }>;
}

interface Submission {
  id: string;
  fullName: string;
  email: string;
  linkedinEmail: string | null;
  linkedinUrl: string;
  status: string;
  createdAt: string;
  gologinShareLink: string | null;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[80vh] items-center justify-center"><div className="text-gray-400">Loading...</div></div>}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [ambassadorAccounts, setAmbassadorAccounts] = useState<AmbassadorAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [usdcBalance, setUsdcBalance] = useState<string>("0");
  const [depositAddress, setDepositAddress] = useState<string | null>(null);
  const [addressCopied, setAddressCopied] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AmbassadorAccount | null>(null);
  const [editForm, setEditForm] = useState({ linkedinName: "", linkedinHeadline: "", linkedinUrl: "", industry: "", location: "", connectionCount: 0, profilePhotoUrl: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [removedAccounts, setRemovedAccounts] = useState<AmbassadorAccount[]>([]);
  const [deletingSubmission, setDeletingSubmission] = useState<string | null>(null);
  const [depositPolling, setDepositPolling] = useState(false);
  const [lastDetectedBalance, setLastDetectedBalance] = useState<string>("0");

  // Poll balance every 10 seconds when deposit panel is open
  useEffect(() => {
    if (!showTopUp) return;
    setDepositPolling(true);
    const prevBalance = usdcBalance;
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/wallet/balance");
        const data = await res.json();
        const newBalance = data.balance || "0";
        if (parseFloat(newBalance) > parseFloat(prevBalance)) {
          setLastDetectedBalance((parseFloat(newBalance) - parseFloat(prevBalance)).toFixed(2));
          setUsdcBalance(newBalance);
          setTimeout(() => setLastDetectedBalance("0"), 5000);
        }
      } catch {}
    }, 10000);
    return () => { clearInterval(interval); setDepositPolling(false); };
  }, [showTopUp]);

  useEffect(() => {
    Promise.all([
      fetch("/api/rentals").then((r) => {
        if (r.status === 401) { router.push("/login"); return null; }
        return r.json();
      }),
      fetch("/api/ambassador/my-accounts").then((r) => r.json()).catch(() => ({ accounts: [] })),
      fetch("/api/wallet/balance").then((r) => r.json()).catch(() => ({ balance: "0" })),
      fetch("/api/wallet/deposit-address").then((r) => r.json()).catch(() => ({ address: null })),
      fetch("/api/ambassador/my-submissions").then((r) => r.json()).catch(() => ({ submissions: [] })),
    ]).then(([rentalData, ambassadorData, balanceData, addressData, submissionsData]) => {
      if (rentalData) setRentals(rentalData.rentals || []);
      setAmbassadorAccounts(ambassadorData.accounts || []);
      setRemovedAccounts(ambassadorData.removedAccounts || []);
      setUsdcBalance(balanceData.balance || "0");
      setDepositAddress(addressData.address || null);
      setSubmissions(submissionsData.submissions || []);
      setLoading(false);
    });
  }, [router]);

  useEffect(() => {
    if (searchParams.get("topup") === "1") {
      setShowTopUp(true);
      setShowWithdraw(false);
    }
  }, [searchParams]);

  // Auto-run the guided tour once for new users, after the dashboard has rendered
  // (so the highlighted elements exist in the DOM).
  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => startDashboardTour(false), 700);
    return () => clearTimeout(t);
  }, [loading]);

  const handleWithdraw = async () => {
    setWithdrawing(true);
    setWithdrawError("");
    setWithdrawSuccess(false);
    try {
      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: withdrawAddress, amount: withdrawAmount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setWithdrawError(data.error || "Withdrawal failed");
        return;
      }
      setWithdrawSuccess(true);
      setUsdcBalance((prev) => (parseFloat(prev) - parseFloat(withdrawAmount)).toString());
      setWithdrawAddress("");
      setWithdrawAmount("");
    } catch {
      setWithdrawError("Something went wrong");
    } finally {
      setWithdrawing(false);
    }
  };

  const [removeAccountId, setRemoveAccountId] = useState<string | null>(null);

  const handleRemoveAccount = async () => {
    if (!removeAccountId) return;
    const res = await fetch(`/api/ambassador/accounts/${removeAccountId}`, { method: "DELETE" });
    if (res.ok) {
      const removed = ambassadorAccounts.find((a) => a.id === removeAccountId);
      setAmbassadorAccounts((prev) => prev.filter((a) => a.id !== removeAccountId));
      if (removed) {
        setRemovedAccounts((prev) => [{ ...removed, status: "removed", removedAt: new Date().toISOString(), removedBy: "ambassador" }, ...prev]);
      }
    }
    setRemoveAccountId(null);
  };

  const handleToggleStatus = async (account: AmbassadorAccount) => {
    const newStatus = account.status === "available" ? "unavailable" : "available";
    const res = await fetch("/api/ambassador/my-accounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: account.id, status: newStatus }),
    });
    if (res.ok) {
      setAmbassadorAccounts((prev) =>
        prev.map((a) => a.id === account.id ? { ...a, status: newStatus } : a)
      );
    }
  };

  const openEditModal = (account: AmbassadorAccount) => {
    setEditingAccount(account);
    setEditForm({
      linkedinName: account.linkedinName || "",
      linkedinHeadline: account.linkedinHeadline || "",
      linkedinUrl: "",
      industry: "",
      location: "",
      connectionCount: account.connectionCount || 0,
      profilePhotoUrl: account.profilePhotoUrl || "",
    });
  };

  const handleEditSave = async () => {
    if (!editingAccount) return;
    setEditSaving(true);
    const res = await fetch("/api/ambassador/my-accounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingAccount.id,
        linkedinName: editForm.linkedinName,
        linkedinHeadline: editForm.linkedinHeadline || null,
        connectionCount: editForm.connectionCount,
        profilePhotoUrl: editForm.profilePhotoUrl || null,
      }),
    });
    if (res.ok) {
      setAmbassadorAccounts((prev) =>
        prev.map((a) =>
          a.id === editingAccount.id
            ? { ...a, linkedinName: editForm.linkedinName, linkedinHeadline: editForm.linkedinHeadline, connectionCount: editForm.connectionCount, profilePhotoUrl: editForm.profilePhotoUrl || null }
            : a
        )
      );
    }
    setEditSaving(false);
    setEditingAccount(null);
  };

  const handleCancel = async (rentalId: string) => {
    if (!confirm("Are you sure you want to cancel this rental?")) return;
    await fetch(`/api/rentals/${rentalId}/cancel`, { method: "POST" });
    setRentals((prev) =>
      prev.map((r) => (r.id === rentalId ? { ...r, autoRenew: false } : r))
    );
  };

  const activeRentals = rentals.filter((r) => r.status === "active" || r.status === "payment_failed" || r.status === "pending_access");
  const pastRentals = rentals.filter((r) => r.status === "expired" || r.status === "cancelled");
  // Adaptive dashboard: lean ambassador-first if they share/submit accounts.
  const isAmbassador = ambassadorAccounts.length > 0 || submissions.length > 0;
  const hasRealRentals = activeRentals.length > 0 || pastRentals.length > 0;
  const showRenterSide = !isAmbassador || hasRealRentals; // pure ambassadors hide renter-only bits

  // Ambassador summary: how many profiles they've shared, how many are still being
  // reviewed/valued, and what they earn per month from the live ones.
  const liveSharedCount = ambassadorAccounts.length;
  const pendingSharedCount = submissions.filter(
    (s) => s.status !== "rejected"
  ).length;
  const totalSharedCount = liveSharedCount + pendingSharedCount;
  const monthlyEarnings = ambassadorAccounts.reduce((sum, a) => {
    const p = typeof a.ambassadorPayment === "string" ? parseFloat(a.ambassadorPayment) : a.ambassadorPayment;
    return sum + (p && p > 0 ? p : 0);
  }, 0);

  const statusBadge = (status: string) => {
    const map: Record<string, "success" | "warning" | "danger" | "default" | "info"> = {
      active: "success",
      payment_failed: "danger",
      expired: "default",
      cancelled: "default",
      under_review: "warning",
      available: "info",
      rented: "success",
      maintenance: "warning",
    };
    return <Badge variant={map[status] || "default"}>{status.replace("_", " ")}</Badge>;
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="space-y-4">
          {[1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-200" />)}
        </div>
      </div>
    );
  }

  const showRentalSuccess = searchParams.get("rental") === "success";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
        <div className="flex items-center gap-2">
          {!isAmbassador && (
            <>
              <button
                onClick={() => startDashboardTour(true)}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors whitespace-nowrap"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" /></svg>
                Take a tour
              </button>
              <Link
                href="/catalogue"
                data-tour="browse"
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                Browse accounts
              </Link>
              <a
                href="/guide"
                data-tour="getting-started"
                className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors whitespace-nowrap"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                Getting started
              </a>
            </>
          )}
        </div>
      </div>

      {/* Ambassador summary — profiles shared, monthly earnings, next step */}
      {isAmbassador && (
        <div className="mb-8 rounded-xl border border-green-100 bg-gradient-to-r from-green-50/70 to-white p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Accounts shared</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{totalSharedCount}</p>
              <p className="text-xs text-gray-500">
                {liveSharedCount > 0 ? `${liveSharedCount} live` : "0 live"}
                {pendingSharedCount > 0 ? ` · ${pendingSharedCount} in review` : ""}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Monthly earnings</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {monthlyEarnings > 0 ? formatCurrency(monthlyEarnings) : <span className="text-gray-400">Being valued</span>}
              </p>
              <p className="text-xs text-gray-500">{monthlyEarnings > 0 ? "from your live accounts" : "we'll confirm your rate shortly"}</p>
            </div>
            <div className="flex flex-col justify-center gap-2">
              <Link href="/become-ambassador?submit=1" className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#00B85C] px-3 py-2 text-sm font-semibold text-white hover:bg-[#00A050] transition-colors">
                Add another profile
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" /></svg>
              </Link>
              <a href="https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ1he_qAS5s8faJzrAIjTJi8KIX9xvPhGbC4Ipn38lPTLzkfSuoyMIiqUrB0viY2jpXr_W_zLSdq" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-md border border-green-300 bg-white px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-50 transition-colors">
                Book a setup call
              </a>
            </div>
          </div>
          {pendingSharedCount > 0 && (
            <p className="mt-4 border-t border-green-100 pt-3 text-sm text-gray-600">
              <span className="font-medium text-gray-900">We&apos;re reviewing your account.</span>{" "}
              Once it&apos;s approved we&apos;ll connect it through GoLogin so it&apos;s ready to earn — book a quick call above and we can set it up together.
            </p>
          )}
        </div>
      )}

      {/* Ambassador getting-started — how the programme works */}
      {isAmbassador && (
        <div className="mb-8 rounded-xl border border-gray-100 bg-white p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-gray-900">How it works</p>
            <span className="text-xs text-gray-400">Share as many LinkedIn accounts as you like — each one earns separately.</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            {[
              { n: "1", t: "Submit your account", d: "Add your LinkedIn profile — or several." },
              { n: "2", t: "Book a setup call", d: "We hop on a quick call together." },
              { n: "3", t: "We connect GoLogin", d: "Set up securely on the call — you keep full control." },
              { n: "4", t: "Get paid monthly", d: "On the 1st, every month it stays active." },
            ].map((s) => (
              <div key={s.n} className="flex gap-3">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">{s.n}</div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{s.t}</p>
                  <p className="text-xs text-gray-500">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Post-payment confirmation — what to do now */}
      {showRentalSuccess && (
        <div className="mb-8 rounded-xl border border-green-200 bg-green-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-green-900">Payment received — your account is ready! 🎉</p>
              <p className="mt-1 text-sm text-green-800 leading-relaxed">
                Open it from your rentals below with <strong>&quot;Open in GoLogin.&quot;</strong> Just make sure GoLogin is installed and signed in with <strong>this same email</strong> — that&apos;s how your rented profile opens. New to GoLogin? Grab it free below and sign in with this email.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href="https://gologin.com/download" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 transition-colors">
                  Download GoLogin
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" /></svg>
                </a>
                <a href="/guide" className="inline-flex items-center gap-1.5 rounded-md border border-green-300 bg-white px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-50 transition-colors">
                  Read the guide
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wallet — renter side (top up to rent). Hidden for pure ambassadors. */}
      {showRenterSide && (
      <section id="wallet" data-tour="wallet" className="mb-8">
        <Card>
          <CardContent className="px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A66C2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M15 9.5c0-1.38-1.34-2.5-3-2.5S9 8.12 9 9.5 10.34 12 12 12s3 1.12 3 2.5-1.34 2.5-3 2.5-3-1.12-3-2.5"/></svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Balance</p>
                  <p className="text-xl font-bold text-gray-900 -mt-0.5">${parseFloat(usdcBalance).toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowTopUp(!showTopUp);
                    setShowWithdraw(false);
                    if (!depositAddress) {
                      fetch("/api/wallet/deposit-address").then(r => r.json()).then(data => {
                        if (data.address) setDepositAddress(data.address);
                      }).catch(() => {});
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${showTopUp ? 'bg-green-700 text-white' : 'bg-green-600 text-white hover:bg-green-700'}`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                  Deposit
                </button>
                <button
                  onClick={() => { setShowWithdraw(!showWithdraw); setShowTopUp(false); }}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${showWithdraw ? 'border-gray-400 bg-gray-100 text-gray-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  Withdraw
                </button>
              </div>
            </div>

            {/* Deposit Panel */}
            {showTopUp && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                {/* Crypto deposit */}
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Transfer USDC <span className="font-normal text-gray-400">— no fees</span></p>
                  {depositAddress ? (
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 break-all text-gray-700">{depositAddress}</code>
                      <button
                        onClick={() => { navigator.clipboard.writeText(depositAddress); setAddressCopied(true); setTimeout(() => setAddressCopied(false), 2000); }}
                        className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:bg-gray-50 whitespace-nowrap"
                      >
                        {addressCopied ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">Loading your deposit address...</p>
                  )}
                  {lastDetectedBalance !== "0" ? (
                    <p className="text-xs text-green-600 font-semibold mt-1.5 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      Deposit of ${lastDetectedBalance} USDC detected!
                    </p>
                  ) : depositPolling ? (
                    <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      Watching for deposits... Base network only.
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1.5">Base network only. Unique to your account. Please allow up to one minute for deposits to be detected.</p>
                  )}
                </div>
                {/* Card deposit */}
                <CardTopUp />
              </div>
            )}

            {/* Withdraw Panel */}
            {showWithdraw && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Wallet Address</label>
                    <input type="text" placeholder="0x..." value={withdrawAddress} onChange={(e) => setWithdrawAddress(e.target.value)} className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Amount</label>
                    <input type="number" placeholder="0.00" step="0.01" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs" />
                  </div>
                </div>
                <button
                  onClick={handleWithdraw}
                  disabled={withdrawing || !withdrawAddress || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > parseFloat(usdcBalance)}
                  className="w-full rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {withdrawing ? "Processing..." : "Withdraw"}
                </button>
                {withdrawError && <p className="text-xs text-red-600 mt-1">{withdrawError}</p>}
                {withdrawSuccess && <p className="text-xs text-green-600 mt-1">Withdrawal submitted!</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
      )}

      {/* Primary CTA — rent (renters / both). Pure ambassadors add accounts from the summary card. */}
      {showRenterSide && (
      <section className="mb-8">
        <Link
          href="/catalogue"
          className="flex items-center justify-between gap-4 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white px-5 py-4 transition-all hover:border-blue-300 hover:shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Rent an Account</p>
              <p className="text-xs text-gray-500">Browse available LinkedIn accounts in the marketplace</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white">
            Browse Accounts
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </span>
        </Link>
      </section>
      )}

      {/* Ambassador Accounts */}
      {ambassadorAccounts.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">My Shared Accounts</h2>
            <Link href="/become-ambassador?submit=1">
              <Button variant="outline" size="sm">Add Another Account</Button>
            </Link>
          </div>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th className="px-4 py-3">Profile</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Monthly Payment</th>
                    <th className="px-4 py-3">Proxy</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {ambassadorAccounts.map((account) => {
                    const price = typeof account.ambassadorPayment === "string"
                      ? parseFloat(account.ambassadorPayment)
                      : account.ambassadorPayment;
                    const isRented = account.rentals.length > 0;
                    const initials = account.linkedinName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
                    const emailMatch = account.notes?.match(/Profile email: ([^.]+@[^.]+\.[^.]+)/);
                    const profileEmail = emailMatch ? emailMatch[1] : null;

                    return (
                      <tr key={account.id} className="border-b last:border-b-0">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-600">
                              {account.profilePhotoUrl ? (
                                <img src={account.profilePhotoUrl} alt={account.linkedinName} className="h-full w-full rounded-full object-cover" />
                              ) : (
                                initials
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{account.linkedinName}</p>
                              {profileEmail && <p className="text-xs text-gray-500">{profileEmail}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${isRented ? "text-green-600" : account.status === "available" ? "text-green-600" : "text-gray-500"}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${isRented ? "bg-green-500" : account.status === "available" ? "bg-green-500" : "bg-gray-400"}`} />
                            {isRented ? "Rented" : account.status === "under_review" ? "Under Review" : account.status === "available" ? "Available" : "Not Available"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{price > 0 ? formatCurrency(price) : <span className="text-sm text-gray-400 font-normal">To be confirmed</span>}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{account.proxyHost ? <span className="text-green-600 font-medium">Assigned</span> : "None"}</td>
                        <td className="px-4 py-3 text-gray-500">{formatDate(account.createdAt)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center gap-2 justify-end">
                            {!isRented && account.status !== "under_review" && (
                              <button
                                onClick={() => handleToggleStatus(account)}
                                className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${account.status === "available" ? "border-yellow-300 text-yellow-700 hover:bg-yellow-50" : "border-green-300 text-green-700 hover:bg-green-50"}`}
                              >
                                {account.status === "available" ? "Pause" : "Activate"}
                              </button>
                            )}
                            <button
                              onClick={() => setRemoveAccountId(account.id)}
                              className="text-xs text-red-500 hover:text-red-700 font-medium"
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Removed Accounts */}
      {removedAccounts.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Removed Accounts</h2>
            <span className="text-xs text-gray-400">Paper trail of removed accounts</span>
          </div>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th className="px-4 py-3">Profile</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Monthly Payment</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Removed</th>
                  </tr>
                </thead>
                <tbody>
                  {removedAccounts.map((account) => {
                    const price = typeof account.ambassadorPayment === "string"
                      ? parseFloat(account.ambassadorPayment)
                      : account.ambassadorPayment;
                    const initials = account.linkedinName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
                    const emailMatch = account.notes?.match(/Profile email: ([^.]+@[^.]+\.[^.]+)/);
                    const profileEmail = emailMatch ? emailMatch[1] : null;

                    return (
                      <tr key={account.id} className="border-b last:border-b-0 opacity-60">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-400">
                              {initials}
                            </div>
                            <div>
                              <p className="font-medium text-gray-500">{account.linkedinName}</p>
                              {profileEmail && <p className="text-xs text-gray-400">{profileEmail}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                            Removed
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400">{price > 0 ? formatCurrency(price) : "—"}</td>
                        <td className="px-4 py-3 text-gray-400">{formatDate(account.createdAt)}</td>
                        <td className="px-4 py-3 text-gray-400">{account.removedAt ? formatDate(account.removedAt) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </section>
      )}

      {/* My Rented Accounts — hidden for pure ambassadors (no real rentals) */}
      {showRenterSide && (
      <section data-tour="rentals" className="mb-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">My Rented Accounts</h2>
        <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th className="px-4 py-3">Profile</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Started</th>
                    <th className="px-4 py-3">Next Billing</th>
                    <th className="px-4 py-3">Auto-Renew</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
            {activeRentals.map((rental) => {
              const initials = rental.linkedinAccount.linkedinName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
              return (
                <tr key={rental.id} className="border-b">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-600">
                        {rental.linkedinAccount.profilePhotoUrl ? (
                          <img src={rental.linkedinAccount.profilePhotoUrl} alt={rental.linkedinAccount.linkedinName} className="h-full w-full rounded-full object-cover" />
                        ) : (
                          initials
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{rental.linkedinAccount.linkedinName}</p>
                        {rental.linkedinAccount.linkedinHeadline && (
                          <p className="text-xs text-gray-500">{rental.linkedinAccount.linkedinHeadline}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {rental.paused ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        Paused
                      </span>
                    ) : rental.linkedinAccount.gologinShareLink ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Active
                      </span>
                    ) : rental.status === "pending_access" ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                        Preparing
                      </span>
                    ) : (
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${rental.status === "active" ? "text-green-600" : "text-red-600"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${rental.status === "active" ? "bg-green-500" : "bg-red-500"}`} />
                        {rental.status === "active" ? "Active" : rental.status.replace("_", " ")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(rental.startDate)}</td>
                  <td className="px-4 py-3 text-gray-500">{rental.currentPeriodEnd ? formatDate(rental.currentPeriodEnd) : "—"}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={async () => {
                        const newVal = !rental.autoRenew;
                        const res = await fetch(`/api/rentals/${rental.id}/auto-renew`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ autoRenew: newVal }),
                        });
                        if (res.ok) {
                          setRentals((prev) => prev.map((r) => r.id === rental.id ? { ...r, autoRenew: newVal } : r));
                        }
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${rental.autoRenew ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                      <span className={`inline-block w-2 h-2 rounded-full ${rental.autoRenew ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {rental.autoRenew ? "On" : "Off"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      {rental.paused ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-400 whitespace-nowrap">
                          Access paused
                        </span>
                      ) : rental.linkedinAccount.gologinShareLink ? (
                        <button
                          onClick={async () => {
                            const open = (link: string) => {
                              try { const u = new URL(link); window.location.href = `gologin:/${u.pathname}`; }
                              catch { window.open(link, "_blank"); }
                            };
                            // Fire the API share first (captures a share id so access is revocable),
                            // then open the profile. Falls back to opening directly on any error.
                            try {
                              const res = await fetch(`/api/rentals/${rental.id}/access`, { method: "POST" });
                              const data = await res.json().catch(() => ({}));
                              if (res.status === 403) { alert(data.error || "Access to this account is paused."); return; }
                              open(data.shareLink || rental.linkedinAccount.gologinShareLink!);
                            } catch {
                              open(rental.linkedinAccount.gologinShareLink!);
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer border-none"
                        >
                          Open in GoLogin
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" /></svg>
                        </button>
                      ) : rental.status === "pending_access" ? (
                        <span className="text-[11px] text-gray-400 whitespace-nowrap">Preparing — ready soon. <a href="/guide" className="text-blue-600 hover:underline">Guide</a></span>
                      ) : null}
                      {rental.autoRenew && (
                        <button
                          onClick={() => handleCancel(rental.id)}
                          className="rounded-md border border-yellow-300 px-2.5 py-1 text-xs font-medium text-yellow-700 hover:bg-yellow-50 transition-colors"
                        >
                          Cancel Renewal
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
                  {/* Demo test account — hidden for ambassadors */}
                  {!isAmbassador && (
                  <tr className="bg-amber-50/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-600">
                          JL
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">Jeremiah Lofranco</p>
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Demo</span>
                          </div>
                          <p className="text-xs text-gray-400">This is a test account to show how renting works</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Active
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">Mar 24, 2026</td>
                    <td className="px-4 py-3 text-gray-400">Apr 24, 2026</td>
                    <td className="px-4 py-3 text-gray-400">—</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          window.location.href = "gologin://share/jeremiah.lofranco%40klabber.co/MHsjRdOlhL";
                        }}
                        className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 transition-colors whitespace-nowrap cursor-pointer border-none"
                      >
                        Try It
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </button>
                    </td>
                  </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
        </Card>
      </section>
      )}

      {/* Past Rentals */}
      {pastRentals.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Past Rentals</h2>
          <div className="space-y-3">
            {pastRentals.map((rental) => (
              <Card key={rental.id}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-700">{rental.linkedinAccount.linkedinName}</span>
                      {statusBadge(rental.status)}
                    </div>
                    <span className="text-sm text-gray-500">{formatDate(rental.startDate)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* My Submissions */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">My Submissions</h2>
        {submissions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <h3 className="text-lg font-semibold text-gray-900">Submit Your LinkedIn Accounts</h3>
              <p className="text-gray-500 text-sm mb-6">Share your accounts with us and get paid monthly.</p>
              <Link href="/become-ambassador?submit=1">
                <Button variant="primary">Submit an Account</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: 900 }}>
                <thead>
                  <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                    <th className="px-5 py-4">Account Name</th>
                    <th className="px-5 py-4">Account Email</th>
                    <th className="px-5 py-4">LinkedIn URL</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Submitted</th>
                    <th className="px-5 py-4">GoLogin</th>
                    <th className="px-5 py-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub) => (
                    <tr key={sub.id} className="border-b last:border-b-0">
                      <td className="px-5 py-4 font-semibold text-gray-900">{sub.fullName}</td>
                      <td className="px-5 py-4 text-gray-500">{sub.linkedinEmail || sub.email}</td>
                      <td className="px-5 py-4">
                        <a href={sub.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm font-medium truncate block max-w-[200px]">
                          {sub.linkedinUrl.replace(/https?:\/\/(www\.)?linkedin\.com\/in\//, "").replace(/\/$/, "")}
                        </a>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={sub.status === "approved" || sub.status === "onboarded" ? "success" : sub.status === "rejected" ? "danger" : "warning"}>
                          {sub.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-gray-400 text-sm">{formatDate(sub.createdAt)}</td>
                      <td className="px-5 py-4">
                        {sub.gologinShareLink ? (
                          <button
                            onClick={() => {
                              // Extract path from share link and build gologin:// protocol URL
                              try {
                                const shareUrl = new URL(sub.gologinShareLink!);
                                const gologinProto = `gologin:/${shareUrl.pathname}`;
                                window.location.href = gologinProto;
                              } catch {
                                // Fallback: open share link in browser
                                window.open(sub.gologinShareLink!, "_blank");
                              }
                            }}
                            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer border-none"
                          >
                            GoLogin
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                          </button>
                        ) : (sub.status === "onboarded" || sub.status === "approved") ? (
                          <button
                            onClick={() => {
                              window.location.href = "gologin://";
                            }}
                            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer border-none"
                          >
                            GoLogin
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                          </button>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={async () => {
                            if (!confirm("Are you sure you want to delete this submission?")) return;
                            setDeletingSubmission(sub.id);
                            const res = await fetch(`/api/ambassador/my-submissions/${sub.id}`, { method: "DELETE" });
                            if (res.ok) {
                              setSubmissions((prev) => prev.filter((s) => s.id !== sub.id));
                            }
                            setDeletingSubmission(null);
                          }}
                          disabled={deletingSubmission === sub.id}
                          className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
                        >
                          {deletingSubmission === sub.id ? "Deleting..." : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Remove Account Modal */}
      {removeAccountId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setRemoveAccountId(null)}>
          <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Remove this account?</h3>
            <p className="mt-2 text-sm text-gray-600">
              Once removed, this account will no longer be listed and you will not receive any further monthly payments for it. This action cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setRemoveAccountId(null)}>Keep Account</Button>
              <button
                onClick={handleRemoveAccount}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
              >
                Remove Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Listing Modal */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditingAccount(null)}>
          <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Listing</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-full bg-gray-200">
                  {editForm.profilePhotoUrl ? (
                    <img src={editForm.profilePhotoUrl} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-gray-400">
                      {editForm.linkedinName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Profile Photo URL</label>
                  <Input
                    value={editForm.profilePhotoUrl}
                    onChange={(e) => setEditForm(f => ({ ...f, profilePhotoUrl: e.target.value }))}
                    placeholder="https://example.com/photo.jpg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <Input
                  value={editForm.linkedinName}
                  onChange={(e) => setEditForm(f => ({ ...f, linkedinName: e.target.value }))}
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Headline</label>
                <Input
                  value={editForm.linkedinHeadline}
                  onChange={(e) => setEditForm(f => ({ ...f, linkedinHeadline: e.target.value }))}
                  placeholder="e.g. Senior Software Engineer at Google"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Connections</label>
                <Input
                  type="number"
                  value={editForm.connectionCount}
                  onChange={(e) => setEditForm(f => ({ ...f, connectionCount: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setEditingAccount(null)}>Cancel</Button>
              <Button variant="primary" onClick={handleEditSave} disabled={editSaving}>
                {editSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
