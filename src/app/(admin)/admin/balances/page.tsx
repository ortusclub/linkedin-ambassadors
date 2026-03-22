"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface UserBalance {
  id: string;
  fullName: string;
  email: string;
  usdcBalance: string;
  depositAddress: string | null;
}

export default function AdminBalancesPage() {
  const [users, setUsers] = useState<UserBalance[]>([]);
  const [totalBalance, setTotalBalance] = useState("0");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [payingUser, setPayingUser] = useState<UserBalance | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDescription, setPayDescription] = useState("");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [paySuccess, setPaySuccess] = useState(false);

  useEffect(() => {
    fetch("/api/admin/balances")
      .then((r) => r.json())
      .then((data) => {
        setUsers(data.users || []);
        setTotalBalance(data.totalBalance || "0");
        setLoading(false);
      });
  }, []);

  const handlePay = async () => {
    if (!payingUser || !payAmount) return;
    setPaying(true);
    setPayError("");
    setPaySuccess(false);

    try {
      const res = await fetch("/api/admin/balances/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: payingUser.id,
          amount: parseFloat(payAmount),
          description: payDescription || `Monthly payment to ${payingUser.fullName}`,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setPayError(data.error || "Payment failed");
      } else {
        setPaySuccess(true);
        // Update balance locally
        setUsers((prev) =>
          prev.map((u) =>
            u.id === payingUser.id
              ? { ...u, usdcBalance: (parseFloat(u.usdcBalance) + parseFloat(payAmount)).toString() }
              : u
          )
        );
        setTotalBalance((prev) => (parseFloat(prev) + parseFloat(payAmount)).toFixed(6));
        setTimeout(() => {
          setPayingUser(null);
          setPayAmount("");
          setPayDescription("");
          setPaySuccess(false);
        }, 1500);
      }
    } catch {
      setPayError("Something went wrong");
    } finally {
      setPaying(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  if (loading) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-200" />)}</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">USDC Balances</h2>
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-2">
          <span className="text-sm text-green-700">Total Held: </span>
          <span className="text-lg font-bold text-green-800">${parseFloat(totalBalance).toFixed(2)} USDC</span>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {filteredUsers.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-gray-500">No users found</CardContent></Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Balance</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Deposit Address</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-sm">{u.fullName}</div>
                    <div className="text-xs text-gray-500">{u.email}</div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-sm">${parseFloat(u.usdcBalance).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    {u.depositAddress ? (
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">{u.depositAddress.slice(0, 10)}...{u.depositAddress.slice(-8)}</code>
                    ) : (
                      <span className="text-xs text-gray-400">Not generated</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { setPayingUser(u); setPayAmount(""); setPayDescription(""); setPayError(""); setPaySuccess(false); }}
                      className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 transition-colors"
                    >
                      Send Payment
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Send Payment Modal */}
      {payingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPayingUser(null)}>
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Send Payment</h3>
            <p className="text-sm text-gray-500 mb-4">
              Send USDC to <strong>{payingUser.fullName}</strong> ({payingUser.email})
            </p>
            <p className="text-xs text-gray-400 mb-4">Current balance: ${parseFloat(payingUser.usdcBalance).toFixed(2)}</p>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (USDC)</label>
                <input
                  type="number"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={payDescription}
                  onChange={(e) => setPayDescription(e.target.value)}
                  placeholder={`Monthly payment to ${payingUser.fullName}`}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            {payError && <p className="text-sm text-red-600 mt-3">{payError}</p>}
            {paySuccess && <p className="text-sm text-green-600 mt-3">Payment sent successfully!</p>}

            <div className="mt-6 flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setPayingUser(null)}>Cancel</Button>
              <Button
                onClick={handlePay}
                disabled={paying || !payAmount || parseFloat(payAmount) <= 0}
              >
                {paying ? "Sending..." : `Send $${payAmount || "0.00"} USDC`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
