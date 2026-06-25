"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Two-level admin nav: top-level section tabs (the two sides of the
// marketplace) swap the sub-links underneath. Hrefs are unchanged from the
// original flat nav — only grouping and labels differ.
const sections = [
  {
    name: "Overview",
    items: [{ href: "/admin/dashboard", label: "Dashboard" }],
  },
  {
    name: "Renters",
    items: [
      { href: "/admin/customers", label: "Renters" },
      { href: "/admin/rentals", label: "Rentals" },
      { href: "/admin/transactions", label: "Transactions" },
    ],
  },
  {
    name: "Ambassadors",
    items: [
      { href: "/admin/ambassadors", label: "Applications" },
      { href: "/admin/owners", label: "Ambassadors" },
      { href: "/admin/accounts", label: "Inventory" },
      { href: "/admin/balances", label: "Payouts" },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.user || data.user.role !== "admin") {
          router.push("/login");
        } else {
          setAuthorized(true);
        }
      })
      .catch(() => router.push("/login"));
  }, [router]);

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
    }
  };

  if (!authorized) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  // Which side are we on? Match the current path against each section's items
  // (startsWith handles nested routes like /admin/accounts/[id]).
  const activeSection =
    sections.find((s) => s.items.some((i) => pathname.startsWith(i.href))) ??
    sections[0];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Level 1: section tabs */}
      <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <h1 className="text-xl font-bold text-gray-900">Admin</h1>
        <nav className="flex flex-wrap gap-1">
          {sections.map((s) => (
            <Link
              key={s.name}
              href={s.items[0].href}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
                s.name === activeSection.name
                  ? "bg-blue-600 text-white"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              {s.name}
            </Link>
          ))}
        </nav>
        <button
          onClick={handleSignOut}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          Sign out
        </button>
      </div>

      {/* Level 2: sub-links for the active section */}
      <div className="mb-8 flex flex-wrap gap-2 border-y border-gray-200 py-3">
        {activeSection.items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              pathname.startsWith(item.href)
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {children}
    </div>
  );
}
