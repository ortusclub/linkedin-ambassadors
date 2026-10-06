import type { Metadata } from "next";
import AccountGuideView from "./account-guide-view";

// Superseded by /account-guide-v2 (Sam's shorter version), which is now the
// guide linked everywhere. This long version is kept as a hidden, noindex
// backup reachable by direct URL only.
export const metadata: Metadata = {
  title: "Your Account Guide (full) — using your rented account | LinkedVelocity",
  description: "How to use your rented LinkedIn account: getting in via GoLogin, daily limits, automation & scraping, do's & don'ts, and exactly what happens if an account gets restricted.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function AccountGuidePage() {
  return <AccountGuideView />;
}
