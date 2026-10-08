import type { Metadata } from "next";
import ReferrerSignupForm from "./signup-form";

export const metadata: Metadata = {
  title: "Become a referrer · LinkedVelocity",
  description: "Earn ₱500 for every sign-up through your link, or up to ₱1,000 when you help them get set up. Paid the same day. Get your referral link in 30 seconds.",
};

export default function BecomeAReferrerPage() {
  return <ReferrerSignupForm />;
}
