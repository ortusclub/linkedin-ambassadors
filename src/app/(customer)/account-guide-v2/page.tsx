import type { Metadata } from "next";
import AccountGuideV2View from "./account-guide-v2-view";

// Draft/preview of a tightened account guide (Sam's feedback: shorter, clearer
// rules, connection limits framed as a ceiling to work up to). Unlisted while
// under review — not indexed. The full current guide lives at /account-guide.
export const metadata: Metadata = {
  title: "Account care rules — using your rented account | LinkedVelocity",
  description:
    "The short version: a few clear do's and don'ts that keep your rented LinkedIn account healthy.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function AccountGuideV2Page() {
  return <AccountGuideV2View />;
}
