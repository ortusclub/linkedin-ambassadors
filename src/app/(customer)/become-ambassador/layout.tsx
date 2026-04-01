import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Become an Ambassador — Earn From Your LinkedIn Account",
  description:
    "Earn $10-$500/month by listing your LinkedIn account on Klabber. We handle everything — you just get paid. USDC, PayPal, Wise, or bank transfer.",
  alternates: { canonical: "/become-ambassador" },
  openGraph: {
    title: "Earn Money From Your LinkedIn Account | Klabber",
    description:
      "List your unused LinkedIn account and earn up to $500/month passively. Safe, simple, and instant payouts.",
    url: "https://klabber.co/become-ambassador",
  },
};

export default function AmbassadorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
