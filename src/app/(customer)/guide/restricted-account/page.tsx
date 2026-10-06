import type { Metadata } from "next";
import RestrictionGuideView from "@/components/restriction-guide-view";

// Legacy URL (linked from recovery emails + older messages). Renders the same
// shared RestrictionGuideView as /restriction-guide so the two never drift.
export const metadata: Metadata = {
  title: "Managing a LinkedIn restriction — owner & referrer guide",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function Page() {
  return <RestrictionGuideView />;
}
