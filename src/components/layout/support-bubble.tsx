"use client";

import { usePathname } from "next/navigation";

// Floating Telegram support button. Hidden on the token-gated app surfaces
// (referrer portal + DIY onboarding wizard) where it would overlap the app's
// own bottom tab bar / footer nav.
const HIDE_PREFIXES = ["/m"];

export function SupportBubble() {
  const pathname = usePathname() || "";
  if (HIDE_PREFIXES.some((p) => pathname.startsWith(p))) return null;
  return (
    <a
      href="https://t.me/linkedvelocity_support_bot"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on Telegram"
      style={{ position: "fixed", bottom: 24, right: 24, zIndex: 50, width: 56, height: 56, borderRadius: "50%", background: "#0088cc", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.2)", textDecoration: "none", transition: "transform 0.2s,box-shadow 0.2s" }}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
    </a>
  );
}
