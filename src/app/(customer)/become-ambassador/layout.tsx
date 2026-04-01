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
  return (
    <>
      {children}
      <div
        style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", overflow: "hidden" }}
        aria-hidden="true"
      >
        <h2>Earn Passive Income From Your LinkedIn Account</h2>
        <p>
          Klabber&apos;s Ambassador program lets you earn $10 to $500 per month from a LinkedIn
          account you&apos;re not actively using. We handle everything — you just get paid.
        </p>
        <h3>How the Ambassador Program Works</h3>
        <ol>
          <li>Submit your LinkedIn profile URL for valuation</li>
          <li>We assess your account based on connections, age, industry, and Sales Navigator status</li>
          <li>Receive your monthly earning estimate instantly</li>
          <li>Choose your payout method: USDC, PayPal, Wise, or bank transfer</li>
          <li>Start earning on the 1st of every month — guaranteed</li>
        </ol>
        <h3>What Determines Your Account Value?</h3>
        <ul>
          <li>Connection count: accounts with 5,000+ connections earn significantly more</li>
          <li>Account age: older accounts (5+ years) are more valuable</li>
          <li>Sales Navigator: accounts with active Sales Navigator subscriptions command premium rates</li>
          <li>Industry relevance: accounts in Technology, SaaS, Finance, and Healthcare are in high demand</li>
          <li>Verification status: verified accounts earn more</li>
        </ul>
        <h3>Your Account Stays Safe</h3>
        <p>
          Your personal information, profile content, and photos remain unchanged. Renters access
          the account through GoLogin anti-detect browser technology, which creates isolated sessions.
          You can continue using your account simultaneously without any conflicts.
        </p>
        <h3>Ambassador Earning Examples</h3>
        <ul>
          <li>500-1,000 connections: $10-30/month</li>
          <li>1,000-5,000 connections: $30-100/month</li>
          <li>5,000-10,000 connections: $100-250/month</li>
          <li>10,000+ connections with Sales Navigator: $250-500/month</li>
        </ul>
      </div>
    </>
  );
}
