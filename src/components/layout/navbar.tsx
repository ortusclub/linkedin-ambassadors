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

const CALENDAR_URL =
  "https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ1he_qAS5s8faJzrAIjTJi8KIX9xvPhGbC4Ipn38lPTLzkfSuoyMIiqUrB0viY2jpXr_W_zLSdq";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  // Two "worlds": renter (default, blue) and ambassador (green) — the nav swaps with the route.
  const isAmb = (pathname || "").startsWith("/become-ambassador");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=Karla:wght@400;500;600;700&display=swap');
        .kl-navbar{position:fixed;top:0;left:0;right:0;z-index:100;backdrop-filter:blur(20px);border-bottom:1px solid #E8E6E1;transition:background .2s,border-color .2s}
        .kl-navbar.kl-renter{background:rgba(238,244,251,0.95);border-bottom-color:#cfe0f4}
        .kl-navbar.kl-amb{background:rgba(241,250,244,0.95);border-bottom-color:#cdebd9}
        .kl-navbar-inner{max-width:1200px;margin:0 auto;padding:0 40px;height:64px;display:flex;align-items:center;justify-content:space-between;gap:28px}
        .kl-logo{font-family:'Montserrat',sans-serif;font-weight:700;font-size:22px;letter-spacing:-0.03em;color:#1D1B16;text-decoration:none;display:flex;align-items:center;gap:8px;flex-shrink:0}
        .kl-logo-mark{width:36px;height:36px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .kl-word-velo{color:#00B85C}
        .kl-tag{font-family:'Karla',sans-serif;font-size:11px;font-weight:700;border-radius:999px;padding:3px 9px;white-space:nowrap;flex-shrink:0}
        .kl-tag-rent{color:#0A66C2;background:#E8F1FA;border:1px solid #bcd9f5}
        .kl-tag-amb{color:#007A3D;background:#E6F9EE;border:1px solid #bbf0d4}
        .kl-nav-links{display:flex;align-items:center;gap:22px}
        .kl-nav-right{display:flex;align-items:center;gap:20px;margin-left:auto;min-width:0}
        .kl-nav-account{display:flex;align-items:center;gap:12px;flex-shrink:0}
        .kl-nav-name{max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block}
        .kl-nav-dash{font-family:'Karla',system-ui,sans-serif;font-size:14px;color:#536471;text-decoration:none;font-weight:500;white-space:nowrap;transition:color .15s}
        .kl-nav-dash:hover{color:#0F1419}
        .kl-nav-links a{font-family:'Karla','Montserrat',system-ui,sans-serif;font-size:14px;color:#536471;text-decoration:none;font-weight:500;transition:color .15s;white-space:nowrap}
        .kl-nav-links a:hover{color:#0F1419}
        .kl-cross-rent{color:#0A66C2 !important;font-weight:700 !important}
        .kl-cross-rent:hover{color:#004182 !important}
        .kl-cross-amb{color:#007A3D !important;font-weight:700 !important}
        .kl-cross-amb:hover{color:#005a2e !important}
        .kl-nav-cta{padding:8px 20px !important;background:#1D1B16 !important;color:#fff !important;border-radius:10px !important;font-size:13px !important;font-weight:600 !important;text-decoration:none;transition:transform .15s,box-shadow .15s;border:none;cursor:pointer;display:inline-flex;align-items:center}
        .kl-nav-cta:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(15,20,25,0.15)}
        .kl-cta-blue{background:linear-gradient(135deg,#0A66C2,#004182) !important}
        .kl-cta-green{background:linear-gradient(135deg,#00B85C,#007A3D) !important}
        .kl-nav-btn{font-family:'Karla',system-ui,sans-serif;font-size:13px;font-weight:500;padding:6px 14px;border-radius:8px;border:1px solid #E8E6E1;background:transparent;color:#536471;cursor:pointer;transition:all .15s;text-decoration:none;white-space:nowrap}
        .kl-nav-btn:hover{color:#0F1419;border-color:#0F1419}
        .kl-balance{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:8px;background:#E6F9EE;border:1px solid #BBF7D0;font-size:13px;font-weight:700;color:#166534;text-decoration:none;transition:all .15s;cursor:pointer;font-family:'Karla',system-ui,sans-serif}
        .kl-balance:hover{background:#D1FAE5;border-color:#86EFAC}
        .kl-balance-label{font-size:11px;font-weight:500;color:#22C55E;letter-spacing:0.02em}
        .kl-topup{font-size:10px;font-weight:600;color:#0A66C2;background:#E8F1FA;padding:2px 6px;border-radius:4px;margin-left:2px}
        .kl-spacer{height:64px}
        /* Marketing links collapse into the hamburger first (1100px); the account
           cluster (incl. Sign Out) stays pinned right and visible much longer. */
        @media(max-width:1100px){.kl-nav-links{display:none}}
        @media(max-width:900px){.kl-nav-dash{display:none}}
        @media(max-width:820px){.kl-tag{display:none}.kl-nav-name{display:none}}
        @media(max-width:700px){.kl-nav-account{display:none}}
        .kl-burger{display:none;background:none;border:none;cursor:pointer;padding:8px;color:#0F1419}
        .kl-mobile-menu{display:none;flex-direction:column;background:#fff;border-bottom:1px solid #E8E6E1;padding:8px 24px 16px}
        .kl-mobile-menu a,.kl-mobile-menu button{display:block;text-align:left;width:100%;padding:11px 0;font-family:'Karla',system-ui,sans-serif;font-size:15px;color:#0F1419;text-decoration:none;background:none;border:none;border-bottom:1px solid #F1F0EC;cursor:pointer}
        .kl-mobile-signout{color:#B91C1C !important;font-weight:600}
        @media(max-width:1100px){.kl-burger{display:inline-flex}.kl-mobile-menu.open{display:flex}}
        @media(min-width:1101px){.kl-mobile-menu,.kl-burger{display:none !important}}
      `}</style>
      <nav className={`kl-navbar ${isAmb ? "kl-amb" : "kl-renter"}`}>
        <div className="kl-navbar-inner">
          <Link href={isAmb ? "/become-ambassador" : "/"} className="kl-logo">
            <span className="kl-logo-mark" aria-hidden="true">
              <svg width="36" height="36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="100" height="100" rx="16" fill="#0B1B2D" />
                <polygon points="26,74 39,74 53,26 40,26" fill="#1C3A5E" />
                <polygon points="44,74 57,74 71,26 58,26" fill="#0A66C2" />
                <polygon points="62,74 75,74 89,26 76,26" fill="#00B85C" />
              </svg>
            </span>
            <span>Linked<span className="kl-word-velo">Velocity</span></span>
            <span className={`kl-tag ${isAmb ? "kl-tag-amb" : "kl-tag-rent"}`}>{isAmb ? "for Ambassadors" : "for Teams"}</span>
          </Link>
          <div className="kl-nav-right">
            {/* Marketing links — first to collapse into the hamburger */}
            <div className="kl-nav-links">
              {isAmb ? (
                <>
                  <a href="#how">How it works</a>
                  <a href="#earn">Earnings</a>
                  <a href="#faq">FAQ</a>
                  <Link href="/catalogue" className="kl-cross-amb">← Rent a profile</Link>
                </>
              ) : (
                <>
                  <Link href="/catalogue">Browse Accounts</Link>
                  <Link href="/pricing">Pricing</Link>
                  <Link href="/blog">Blog</Link>
                  <Link href="/faqs">FAQs</Link>
                  <Link href="/become-ambassador" className="kl-cross-rent">Earn with your account →</Link>
                  <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer">Book a Meeting</a>
                </>
              )}
              {user?.role === "admin" && (
                <Link href="/admin/dashboard">Admin</Link>
              )}
            </div>

            {/* Account cluster — stays pinned right and visible far longer so Sign Out is always reachable */}
            <div className="kl-nav-account">
              {loading ? null : user ? (
                <>
                  <Link href="/dashboard" className="kl-nav-dash">Dashboard</Link>
                  <Link href="/dashboard#wallet" className="kl-balance">
                    <span className="kl-balance-label">Balance</span>
                    ${balance !== null ? parseFloat(balance).toFixed(2) : '—'}
                    <span className="kl-topup">Top Up</span>
                  </Link>
                  <Link href="/profile" className="kl-nav-btn kl-nav-name">
                    {user.fullName}
                  </Link>
                  <button className="kl-nav-btn" onClick={handleLogout}>Sign Out</button>
                </>
              ) : isAmb ? (
                <a href="/become-ambassador?valuation=1" className="kl-nav-cta kl-cta-green">Get my valuation</a>
              ) : (
                <>
                  <Link href="/login" className="kl-nav-btn">Sign In</Link>
                  <Link href="/register" className="kl-nav-cta kl-cta-blue">Sign Up</Link>
                </>
              )}
            </div>
          </div>

          {/* Mobile hamburger — marketing links collapse here < 1100px; account cluster < 700px */}
          <button className="kl-burger" aria-label="Menu" onClick={() => setMobileOpen((o) => !o)}>
            {mobileOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
            )}
          </button>
        </div>

        {/* Mobile dropdown */}
        <div className={`kl-mobile-menu ${mobileOpen ? "open" : ""}`} onClick={() => setMobileOpen(false)}>
          {isAmb ? (
            <>
              <a href="#how">How it works</a>
              <a href="#earn">Earnings</a>
              <a href="#faq">FAQ</a>
              <Link href="/catalogue">← Rent a profile</Link>
            </>
          ) : (
            <>
              <Link href="/catalogue">Browse Accounts</Link>
              <Link href="/pricing">Pricing</Link>
              <Link href="/become-ambassador">Earn with your account</Link>
              <Link href="/faqs">FAQs</Link>
              <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer">Book a Meeting</a>
            </>
          )}
          {loading ? null : user ? (
            <>
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/dashboard#wallet">Balance &amp; Top Up{balance !== null ? ` — $${parseFloat(balance).toFixed(2)}` : ""}</Link>
              {user.role === "admin" && <Link href="/admin/dashboard">Admin</Link>}
              <Link href="/profile">{user.fullName}</Link>
              <button className="kl-mobile-signout" onClick={handleLogout}>Sign Out</button>
            </>
          ) : isAmb ? (
            <a href="/become-ambassador?valuation=1">Get my valuation</a>
          ) : (
            <>
              <Link href="/login">Sign In</Link>
              <Link href="/register">Sign Up</Link>
            </>
          )}
        </div>
      </nav>
      <div className="kl-spacer" />
    </>
  );
}
