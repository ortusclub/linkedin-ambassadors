"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface UserBalance {
  id: string;
  fullName: string;
  email: string;
  usdcBalance: string;
  depositAddress: string | null;
}

interface Transaction {
  id: string;
  type: string;
  amount: string;
  txHash: string | null;
  description: string | null;
  createdAt: string;
  user: { fullName: string; email: string };
}

export default function AdminBalancesPage() {
  const [users, setUsers] = useState<UserBalance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalBalance, setTotalBalance] = useState("0");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/balances").then((r) => r.json()),
      fetch("/api/admin/transactions").then((r) => r.json()),
    ]).then(([balanceData, txData]) => {
      setUsers(balanceData.users || []);
      setTotalBalance(balanceData.totalBalance || "0");
      setTransactions(txData.transactions || []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-200" />)}</div>;
  }

  const typeColors: Record<string, string> = {
    deposit: "success",
    rental_payment: "default",
    sweep: "info",
    refund: "warning",
    adjustment: "default",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">USDC Balances</h2>
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-2">
          <span className="text-sm text-green-700">Total Held: </span>
          <span className="text-lg font-bold text-green-800">${parseFloat(totalBalance).toFixed(2)} USDC</span>
        </div>
      </div>

      {/* User Balances */}
      <Card>
        <CardHeader><h3 className="font-semibold text-gray-900">User Balances</h3></CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No users with USDC balance</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Balance</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Deposit Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((u) => (
                    <tr key={u.id}>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader><h3 className="font-semibold text-gray-900">Recent Transactions</h3></CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No transactions yet</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Tx Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transactions.map((tx) => {
                    const amount = parseFloat(tx.amount);
                    return (
                      <tr key={tx.id}>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium">{tx.user.fullName}</div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={typeColors[tx.type] as "success" | "default" | "info" || "default"}>
                            {tx.type.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className={`px-4 py-3 text-sm font-semibold ${amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {amount >= 0 ? '+' : ''}{amount.toFixed(2)} USDC
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate">{tx.description || '—'}</td>
                        <td className="px-4 py-3 text-xs">
                          {tx.txHash ? (
                            <a href={`https://basescan.org/tx/${tx.txHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {tx.txHash.slice(0, 10)}...
                            </a>
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
