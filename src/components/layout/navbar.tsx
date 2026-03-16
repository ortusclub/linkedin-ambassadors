"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

export function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => setUser(data.user || null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
  };

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold text-blue-600">
              LinkedIn Ambassadors
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link href="/catalogue" className="text-sm text-gray-600 hover:text-gray-900">
                Browse Accounts
              </Link>
              <Link href="/become-ambassador" className="text-sm text-gray-600 hover:text-gray-900">
                Become an Ambassador
              </Link>
              {user?.role === "admin" && (
                <Link href="/admin/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
                  Admin
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {loading ? (
              <div className="h-8 w-20 animate-pulse rounded bg-gray-200" />
            ) : user ? (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm">
                    Dashboard
                  </Button>
                </Link>
                <span className="text-sm text-gray-600">{user.fullName}</span>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Log in
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">Sign up</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
