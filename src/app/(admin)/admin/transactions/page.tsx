"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Transaction {
  id: string;
  type: string;
  amount: string;
  txHash: string | null;
  description: string | null;
  createdAt: string;
  user: { fullName: string; email: string; isTest?: boolean };
}

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeTest, setIncludeTest] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/admin/transactions?includeTest=${includeTest ? "1" : "0"}`)
      .then((r) => r.json())
      .then((data) => { if (active) setTransactions(data.transactions || []); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [includeTest]);

  const typeColors: Record<string, string> = {
    deposit: "success",
    rental_payment: "default",
    sweep: "info",
    refund: "warning",
    adjustment: "default",
  };

  if (loading) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-200" />)}</div>;
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Transactions</h2>
          <p className="mt-1 mb-6 max-w-2xl text-sm text-gray-500">Money coming in from renters — deposits and rental payments.</p>
        </div>
        <div className="flex flex-shrink-0 items-center rounded-lg border border-gray-200 bg-white p-0.5 text-sm">
          <button onClick={() => setIncludeTest(false)} className={`rounded-md px-3 py-1 font-medium transition-colors ${!includeTest ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-800"}`}>Live</button>
          <button onClick={() => setIncludeTest(true)} className={`rounded-md px-3 py-1 font-medium transition-colors ${includeTest ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-800"}`}>All (incl. test)</button>
        </div>
      </div>

      {transactions.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-gray-500">No transactions yet</CardContent></Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
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
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium">
                        {tx.user.fullName}
                        {tx.user.isTest && <span className="ml-1.5 rounded bg-purple-100 px-1 py-0.5 text-[9px] font-semibold text-purple-700 align-middle">TEST</span>}
                      </div>
                      <div className="text-xs text-gray-500">{tx.user.email}</div>
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
    </div>
  );
}
