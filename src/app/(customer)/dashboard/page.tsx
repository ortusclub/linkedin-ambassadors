"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  profilePhotoUrl: string | null;
  connectionCount: number;
  status: string;
  monthlyPrice: string | number;
  gologinProfileId: string | null;
  createdAt: string;
  rentals: Array<{ id: string; startDate: string; currentPeriodEnd: string | null }>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [ambassadorAccounts, setAmbassadorAccounts] = useState<AmbassadorAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/rentals").then((r) => {
        if (r.status === 401) { router.push("/login"); return null; }
        return r.json();
      }),
      fetch("/api/ambassador/my-accounts").then((r) => r.json()).catch(() => ({ accounts: [] })),
    ]).then(([rentalData, ambassadorData]) => {
      if (rentalData) setRentals(rentalData.rentals || []);
      setAmbassadorAccounts(ambassadorData.accounts || []);
      setLoading(false);
    });
  }, [router]);

  const handleCancel = async (rentalId: string) => {
    if (!confirm("Are you sure you want to cancel this rental?")) return;
    await fetch(`/api/rentals/${rentalId}/cancel`, { method: "POST" });
    setRentals((prev) =>
      prev.map((r) => (r.id === rentalId ? { ...r, autoRenew: false } : r))
    );
  };

  const handleBillingPortal = async () => {
    const res = await fetch("/api/rentals/billing-portal", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  };

  const activeRentals = rentals.filter((r) => r.status === "active" || r.status === "payment_failed");
  const pastRentals = rentals.filter((r) => r.status === "expired" || r.status === "cancelled");

  const statusBadge = (status: string) => {
    const map: Record<string, "success" | "warning" | "danger" | "default" | "info"> = {
      active: "success",
      payment_failed: "danger",
      expired: "default",
      cancelled: "default",
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
        <Button variant="outline" onClick={handleBillingPortal}>
          Manage Billing
        </Button>
      </div>

      {/* Ambassador Accounts */}
      {ambassadorAccounts.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">My Ambassador Accounts</h2>
            <Link href="/become-ambassador">
              <Button variant="outline" size="sm">Add Another Account</Button>
            </Link>
          </div>
          <div className="space-y-4">
            {ambassadorAccounts.map((account) => {
              const price = typeof account.monthlyPrice === "string"
                ? parseFloat(account.monthlyPrice)
                : account.monthlyPrice;
              const isRented = account.rentals.length > 0;

              return (
                <Card key={account.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-full bg-gray-200">
                        {account.profilePhotoUrl ? (
                          <img src={account.profilePhotoUrl} alt={account.linkedinName} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-gray-400">
                            {account.linkedinName.charAt(0)}
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{account.linkedinName}</h3>
                          {statusBadge(account.status)}
                          {isRented && <Badge variant="success">Currently Rented</Badge>}
                        </div>
                        <div className="mt-1 flex gap-4 text-xs text-gray-500">
                          <span>Earning: {formatCurrency(price)}/mo</span>
                          <span>Added: {formatDate(account.createdAt)}</span>
                          {account.connectionCount > 0 && <span>{account.connectionCount.toLocaleString()} connections</span>}
                        </div>
                      </div>

                      <div className="flex gap-2 items-center">
                        {isRented ? (
                          <div className="text-right">
                            <p className="text-sm font-semibold text-green-600">Active</p>
                            <p className="text-xs text-gray-400">Earning {formatCurrency(price)}/mo</p>
                          </div>
                        ) : (
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Waiting for renter</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Active Rentals */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Rentals</h2>
        {activeRentals.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-gray-500">No active rentals.</p>
              <Button variant="primary" className="mt-4" onClick={() => router.push("/catalogue")}>
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
                        <span>Auto-renew: {rental.autoRenew ? "On" : "Off"}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {rental.linkedinAccount.gologinProfileId && (
                        <Button size="sm" variant="primary">Access Account</Button>
                      )}
                      {rental.autoRenew && (
                        <Button size="sm" variant="outline" onClick={() => handleCancel(rental.id)}>Cancel</Button>
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

      {/* Become an Ambassador CTA — only show if they have no ambassador accounts */}
      {ambassadorAccounts.length === 0 && (
        <section>
          <Card>
            <CardContent className="py-8 text-center">
              <h3 className="text-lg font-semibold text-gray-900">Earn Money From Your LinkedIn Account</h3>
              <p className="mt-2 text-gray-500">Offer your LinkedIn account as an ambassador and get paid monthly.</p>
              <Link href="/become-ambassador">
                <Button className="mt-4" variant="primary">Become an Ambassador</Button>
              </Link>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
