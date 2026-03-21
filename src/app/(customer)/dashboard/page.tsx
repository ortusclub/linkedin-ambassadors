"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDate, formatCurrency } from "@/lib/utils";

interface Rental {
  id: string;
  status: string;
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
  createdAt: string;
  rentals: Array<{ id: string; startDate: string; currentPeriodEnd: string | null }>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [ambassadorAccounts, setAmbassadorAccounts] = useState<AmbassadorAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAppModal, setShowAppModal] = useState(false);
  const [appModalDismissed, setAppModalDismissed] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState<string>("0");
  const [depositAddress, setDepositAddress] = useState<string | null>(null);
  const [addressCopied, setAddressCopied] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showAppPrompt, setShowAppPrompt] = useState(false);
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AmbassadorAccount | null>(null);
  const [editForm, setEditForm] = useState({ linkedinName: "", linkedinHeadline: "", linkedinUrl: "", industry: "", location: "", connectionCount: 0, profilePhotoUrl: "" });
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/rentals").then((r) => {
        if (r.status === 401) { router.push("/login"); return null; }
        return r.json();
      }),
      fetch("/api/ambassador/my-accounts").then((r) => r.json()).catch(() => ({ accounts: [] })),
      fetch("/api/user/dismiss-app-modal").then((r) => r.json()).catch(() => ({ dismissed: false })),
      fetch("/api/wallet/balance").then((r) => r.json()).catch(() => ({ balance: "0" })),
      fetch("/api/wallet/deposit-address").then((r) => r.json()).catch(() => ({ address: null })),
    ]).then(([rentalData, ambassadorData, dismissData, balanceData, addressData]) => {
      if (rentalData) setRentals(rentalData.rentals || []);
      setAmbassadorAccounts(ambassadorData.accounts || []);
      setAppModalDismissed(dismissData.dismissed || false);
      setUsdcBalance(balanceData.balance || "0");
      setDepositAddress(addressData.address || null);
      setLoading(false);
    });
  }, [router]);

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
      setAmbassadorAccounts((prev) => prev.filter((a) => a.id !== removeAccountId));
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

  const handleOpenAccount = () => {
    if (appModalDismissed) {
      window.location.href = "klabber://open";
    } else {
      setShowAppModal(true);
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

  const activeRentals = rentals.filter((r) => r.status === "active" || r.status === "payment_failed");
  const pastRentals = rentals.filter((r) => r.status === "expired" || r.status === "cancelled");

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

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
      </div>

      {/* USDC Wallet */}
      <section id="wallet" className="mb-8">
        <Card>
          <CardContent className="px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A66C2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M15 9.5c0-1.38-1.34-2.5-3-2.5S9 8.12 9 9.5 10.34 12 12 12s3 1.12 3 2.5-1.34 2.5-3 2.5-3-1.12-3-2.5"/></svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">USDC Balance</p>
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
                  <p className="text-xs text-gray-400 mt-1.5">Base network only. Unique to your account. Detected automatically.</p>
                </div>
                {/* Card deposit */}
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Pay with Card <span className="font-normal text-gray-400">— via MoonPay</span></p>
                  {depositAddress ? (
                    <div>
                      <a
                        href={`https://buy.moonpay.com?apiKey=pk_live_yourkey&currencyCode=usdc_base&walletAddress=${depositAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#7D00FF] px-3 py-2 text-xs font-semibold text-white hover:bg-[#6B00DB] transition-colors"
                      >
                        Buy USDC with Card
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </a>
                      <p className="text-xs text-gray-400 mt-1.5">Standard card fees apply.</p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">Loading...</p>
                  )}
                </div>
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

      {/* Ambassador Accounts */}
      {ambassadorAccounts.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">My Ambassador Accounts</h2>
            <Link href="/become-ambassador">
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
                            <Button size="sm" variant="primary" onClick={handleOpenAccount}>Open</Button>
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

      {/* Active Rentals */}
      <section className="mb-12">
        {activeRentals.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <h3 className="text-lg font-semibold text-gray-900">Scale Your LinkedIn Outreach</h3>
              <p className="text-gray-500 text-sm mb-6">Rent verified accounts and run parallel campaigns to grow faster.</p>
              <Button variant="primary" onClick={() => router.push("/catalogue")}>
                Browse Accounts
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {activeRentals.map((rental) => (
              <Card key={rental.id}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-full bg-gray-200">
                      {rental.linkedinAccount.profilePhotoUrl ? (
                        <img src={rental.linkedinAccount.profilePhotoUrl} alt={rental.linkedinAccount.linkedinName} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-gray-400">
                          {rental.linkedinAccount.linkedinName.charAt(0)}
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{rental.linkedinAccount.linkedinName}</h3>
                        {statusBadge(rental.status)}
                      </div>
                      {rental.linkedinAccount.linkedinHeadline && (
                        <p className="text-sm text-gray-600">{rental.linkedinAccount.linkedinHeadline}</p>
                      )}
                      <div className="mt-1 flex gap-4 text-xs text-gray-500">
                        <span>Started: {formatDate(rental.startDate)}</span>
                        {rental.currentPeriodEnd && <span>Next billing: {formatDate(rental.currentPeriodEnd)}</span>}
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
                          Auto-renew {rental.autoRenew ? "On" : "Off"}
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" variant="primary" onClick={() => {
                        setShowAppPrompt(true);
                      }}>Access Account</Button>
                      {rental.autoRenew && (
                        <Button size="sm" variant="outline" onClick={() => handleCancel(rental.id)}>Cancel Auto Renewal</Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

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

      {/* Share Accounts CTA — only show if they have no ambassador accounts */}
      {ambassadorAccounts.length === 0 && (
        <section>
          <Card>
            <CardContent className="py-8 text-center">
              <h3 className="text-lg font-semibold text-gray-900">Earn Money From Your LinkedIn Account</h3>
              <p className="mt-2 text-gray-500">Share your LinkedIn account and get paid monthly.</p>
              <Link href="/become-ambassador">
                <Button className="mt-4" variant="primary">Share Your Accounts</Button>
              </Link>
            </CardContent>
          </Card>
        </section>
      )}
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

      {/* App Required Modal */}
      {showAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAppModal(false)}>
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900">Open via Klabber App</h3>
            <p className="mt-3 text-sm text-gray-600">
              To protect your digital footprint, LinkedIn accounts can only be accessed through the Klabber desktop app. This prevents LinkedIn from detecting that multiple people are accessing the account at the same time.
            </p>
            <label className="mt-4 flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="rounded border-gray-300"
              />
              Don&apos;t show me this message again
            </label>
            <div className="mt-4 flex flex-col gap-2">
              <Button variant="primary" className="w-full" onClick={() => {
                if (dontShowAgain) {
                  fetch("/api/user/dismiss-app-modal", { method: "POST" });
                  setAppModalDismissed(true);
                }
                window.location.href = "klabber://open";
                setShowAppModal(false);
              }}>Open App</Button>
              <Link href="/api/download" className="w-full">
                <Button variant="outline" className="w-full">Download App</Button>
              </Link>
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

      {/* Klabber App Download Prompt */}
      {showAppPrompt && (
        <div style={{position:'fixed',inset:0,zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)'}}>
          <div style={{background:'#fff',borderRadius:20,padding:32,maxWidth:440,width:'90%',position:'relative'}}>
            <button
              onClick={() => setShowAppPrompt(false)}
              style={{position:'absolute',top:16,right:16,background:'none',border:'none',fontSize:20,color:'#8899A6',cursor:'pointer',lineHeight:1}}
            >
              &times;
            </button>

            <div style={{textAlign:'center',marginBottom:24}}>
              <div style={{width:48,height:48,borderRadius:12,background:'#1D1B16',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:20,fontWeight:700,margin:'0 auto 16px',fontFamily:"'Instrument Sans',sans-serif"}}>kl</div>
              <h3 style={{fontSize:20,fontWeight:700,color:'#0F1419',fontFamily:"'Instrument Sans',sans-serif"}}>Download the Klabber App</h3>
              <p style={{fontSize:13,color:'#536471',marginTop:6}}>You need the Klabber desktop app to access your rented accounts securely.</p>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:16,marginBottom:28}}>
              <div style={{display:'flex',gap:14,alignItems:'flex-start'}}>
                <div style={{width:28,height:28,borderRadius:8,background:'#E8F1FA',color:'#0A66C2',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:13,flexShrink:0,fontFamily:"'Instrument Sans',sans-serif"}}>1</div>
                <div>
                  <p style={{fontSize:14,fontWeight:600,color:'#0F1419'}}>Download the Klabber app</p>
                  <p style={{fontSize:12,color:'#8899A6',marginTop:2}}>Available for Mac and Windows. Takes less than a minute.</p>
                </div>
              </div>
              <div style={{display:'flex',gap:14,alignItems:'flex-start'}}>
                <div style={{width:28,height:28,borderRadius:8,background:'#E6F9EE',color:'#00B85C',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:13,flexShrink:0,fontFamily:"'Instrument Sans',sans-serif"}}>2</div>
                <div>
                  <p style={{fontSize:14,fontWeight:600,color:'#0F1419'}}>Log in with your Klabber account</p>
                  <p style={{fontSize:12,color:'#8899A6',marginTop:2}}>Use the same email you signed up with. We&apos;ll send you a verification code.</p>
                </div>
              </div>
              <div style={{display:'flex',gap:14,alignItems:'flex-start'}}>
                <div style={{width:28,height:28,borderRadius:8,background:'#F3E8FF',color:'#7C3AED',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:13,flexShrink:0,fontFamily:"'Instrument Sans',sans-serif"}}>3</div>
                <div>
                  <p style={{fontSize:14,fontWeight:600,color:'#0F1419'}}>Your accounts will appear automatically</p>
                  <p style={{fontSize:12,color:'#8899A6',marginTop:2}}>Open any account directly from the app with a secure, isolated Chrome profile.</p>
                </div>
              </div>
            </div>

            <a
              href="/api/download"
              style={{display:'block',width:'100%',padding:14,borderRadius:10,background:'#0A66C2',color:'#fff',fontSize:15,fontWeight:700,textAlign:'center',textDecoration:'none',fontFamily:"'DM Sans',sans-serif"}}
            >
              Download Klabber App
            </a>
            <button
              onClick={() => {
                window.location.href = 'klabber://open';
                setShowAppPrompt(false);
              }}
              style={{display:'block',width:'100%',padding:12,borderRadius:10,background:'transparent',border:'2px solid #E8E6E1',color:'#0F1419',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit',marginTop:8,textAlign:'center'}}
            >
              I already have the app — Open Klabber
            </button>
            <button
              onClick={() => setShowAppPrompt(false)}
              style={{display:'block',width:'100%',padding:8,background:'transparent',border:'none',color:'#8899A6',fontSize:12,fontWeight:500,cursor:'pointer',fontFamily:'inherit',marginTop:4,textAlign:'center'}}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
