import type { Metadata } from "next";
import AccountGuideView from "./account-guide-view";

export const metadata: Metadata = {
  title: "Your Account Guide — using your rented account | LinkedVelocity",
  description: "How to use your rented LinkedIn account: getting in via GoLogin, daily limits, automation & scraping, do's & don'ts, and exactly what happens if an account gets restricted.",
  alternates: { canonical: "/account-guide" },
};

export default function AccountGuidePage() {
  return <AccountGuideView />;
}
