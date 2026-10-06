import type { Metadata } from "next";
import RestrictionGuideView from "@/components/restriction-guide-view";

export const metadata: Metadata = {
  title: "Managing a LinkedIn restriction — owner & referrer guide",
  description:
    "What to do if a LinkedIn account gets restricted: verify through the Persona QR flow, what to do when it errors, and how to message LinkedIn's help team.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function RestrictionGuidePage() {
  return <RestrictionGuideView />;
}
