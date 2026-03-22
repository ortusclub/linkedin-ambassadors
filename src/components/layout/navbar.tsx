"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        setUser(data.user || null);
        if (data.user) {
          fetch("/api/wallet/balance")
            .then((r) => r.json())
            .then((d) => setBalance(d.balance || "0"))
            .catch(() => {});
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
  };

  // No pages excluded — navbar shows everywhere

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=DM+Sans:wght@400;500&display=swap');
        .kl-navbar{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(250,250,248,0.92);backdrop-filter:blur(20px);border-bottom:1px solid #E8E6E1}
        .kl-navbar-inner{max-width:1200px;margin:0 auto;padding:0 40px;height:64px;display:flex;align-items:center;justify-content:space-between}
        .kl-logo{font-family:'Instrument Sans',sans-serif;font-weight:700;font-size:22px;letter-spacing:-0.03em;color:#1D1B16;text-decoration:none;display:flex;align-items:center;gap:8px}
        .kl-logo-mark{width:36px;height:36px;background:#1D1B16;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;font-weight:700;flex-shrink:0;letter-spacing:-0.03em}
        .kl-nav-links{display:flex;align-items:center;gap:32px}
        .kl-nav-links a{font-family:'DM Sans','Instrument Sans',system-ui,sans-serif;font-size:14px;color:#536471;text-decoration:none;font-weight:500;transition:color .15s}
        .kl-nav-links a:hover{color:#0F1419}
        .kl-nav-cta{padding:8px 20px !important;background:#1D1B16 !important;color:#fff !important;border-radius:10px !important;font-size:13px !important;font-weight:600 !important;text-decoration:none;transition:transform .15s,box-shadow .15s;border:none;cursor:pointer;display:inline-flex;align-items:center}
        .kl-nav-cta:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(15,20,25,0.15)}
        .kl-nav-user{font-family:'DM Sans',system-ui,sans-serif;font-size:13px;color:#1D1B16 !important;font-weight:600;cursor:pointer;text-decoration:none !important;display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:8px;background:rgba(29,27,22,0.06);transition:all .15s}
        .kl-nav-user:hover{background:rgba(29,27,22,0.12) !important;color:#1D1B16 !important}
        .kl-nav-btn{font-family:'DM Sans',system-ui,sans-serif;font-size:13px;font-weight:500;padding:6px 14px;border-radius:8px;border:1px solid #E8E6E1;background:transparent;color:#536471;cursor:pointer;transition:all .15s;text-decoration:none}
        .kl-nav-btn:hover{color:#0F1419;border-color:#0F1419}
        .kl-balance{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:8px;background:#E6F9EE;border:1px solid #BBF7D0;font-size:13px;font-weight:700;color:#166534;text-decoration:none;transition:all .15s;cursor:pointer;font-family:'DM Sans',system-ui,sans-serif}
        .kl-balance:hover{background:#D1FAE5;border-color:#86EFAC}
        .kl-balance-label{font-size:11px;font-weight:500;color:#22C55E;letter-spacing:0.02em}
        .kl-topup{font-size:10px;font-weight:600;color:#0A66C2;background:#E8F1FA;padding:2px 6px;border-radius:4px;margin-left:2px}
        .kl-spacer{height:64px}
        @media(max-width:900px){.kl-nav-links{display:none}}
      `}</style>
      <nav className="kl-navbar">
        <div className="kl-navbar-inner">
          <Link href="/" className="kl-logo"><span className="kl-logo-mark">kl</span>Klabber</Link>
          <div className="kl-nav-links">
            <Link href="/catalogue">Browse Accounts</Link>
            <Link href="/become-ambassador">Share Accounts</Link>
            {user?.role === "admin" && (
              <Link href="/admin/dashboard">Admin</Link>
            )}
            {loading ? null : user ? (
              <>
                <Link href="/dashboard">Dashboard</Link>
                <Link href="/dashboard#wallet" className="kl-balance">
                  <span className="kl-balance-label">USDC</span>
                  ${balance !== null ? parseFloat(balance).toFixed(2) : '—'}
                  <span className="kl-topup">Top Up</span>
                </Link>
                <Link href="/profile" className="kl-nav-btn">
                  {user.fullName}
                </Link>
                <button className="kl-nav-btn" onClick={handleLogout}>Sign Out</button>
              </>
            ) : (
              <>
                <Link href="/login" className="kl-nav-btn">Sign In</Link>
                <Link href="/register" className="kl-nav-cta">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      </nav>
      <div className="kl-spacer" />
    </>
  );
}
