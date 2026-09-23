import type { Metadata } from "next";
import Guide2FA from "./guide-2fa";

// Unlisted, noindex tutorial — reachable only via the direct link (not in any nav/sitemap,
// hidden from search). Shared with an account owner (or a referrer) during onboarding.
export const metadata: Metadata = {
  title: "Set up two-step verification · LinkedVelocity",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <Guide2FA />;
}
