"use client";

import { useEffect, useState } from "react";
import { AccountCard } from "@/components/catalogue/account-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Account {
  id: string;
  linkedinName: string;
  linkedinHeadline: string | null;
  connectionCount: number;
  industry: string | null;
  location: string | null;
  profilePhotoUrl: string | null;
  accountAgeMonths: number | null;
  hasSalesNav: boolean;
  monthlyPrice: number;
}

export default function CataloguePage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("");
  const [sort, setSort] = useState("connectionCount");
  const [hasSalesNav, setHasSalesNav] = useState(false);

  const fetchAccounts = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (industry) params.set("industry", industry);
    if (sort) params.set("sort", sort);
    if (hasSalesNav) params.set("hasSalesNav", "true");

    const res = await fetch(`/api/accounts?${params}`);
    const data = await res.json();
    setAccounts(data.accounts || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAccounts();
  }, [sort, hasSalesNav]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAccounts();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Browse Available Accounts</h1>
        <p className="mt-2 text-gray-600">
          Find the perfect LinkedIn account for your outreach needs
        </p>
      </div>

      {/* Filters */}
      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-4">
        <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <Input
              id="search"
              label="Search"
              placeholder="Search by name, headline, industry..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="min-w-[150px]">
            <Input
              id="industry"
              label="Industry"
              placeholder="e.g. Technology"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            />
          </div>
          <div className="min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort by</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="connectionCount">Most Connections</option>
              <option value="accountAge">Account Age</option>
              <option value="newest">Newest Added</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={hasSalesNav}
              onChange={(e) => setHasSalesNav(e.target.checked)}
              className="rounded border-gray-300"
            />
            Sales Navigator
          </label>
          <Button type="submit" size="md">
            Search
          </Button>
        </form>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
          <p className="text-lg text-gray-500">No accounts available right now.</p>
          <p className="mt-2 text-sm text-gray-400">Check back soon or adjust your filters.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
        </div>
      )}
    </div>
  );
}
