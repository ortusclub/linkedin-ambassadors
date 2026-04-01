import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse LinkedIn Accounts for Rent",
  description:
    "Browse our catalogue of pre-warmed, verified LinkedIn accounts available for rent. Filter by industry, connections, Sales Navigator status. From $10/month.",
  alternates: { canonical: "/catalogue" },
  openGraph: {
    title: "Browse LinkedIn Accounts for Rent | Klabber",
    description:
      "Browse pre-warmed LinkedIn accounts for outreach and lead gen. Filter by industry, connections, and more.",
    url: "https://klabber.co/catalogue",
  },
};

export default function CatalogueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      {/* SEO-only content for search engines — hidden visually but indexable */}
      <div
        style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", overflow: "hidden" }}
        aria-hidden="true"
      >
        <h2>Rent LinkedIn Accounts for Outreach</h2>
        <p>
          Browse Klabber&apos;s catalogue of verified, pre-warmed LinkedIn accounts available for
          monthly rental. Each account comes with an established connection network, account
          history, and instant access via GoLogin anti-detect browser.
        </p>
        <h3>Filter by Industry</h3>
        <p>
          Find LinkedIn accounts in Technology, SaaS, Marketing, Finance, Healthcare,
          Recruiting, FinTech, Consulting, and more. Match your outreach campaigns with
          industry-relevant profiles.
        </p>
        <h3>Account Features</h3>
        <ul>
          <li>Connection counts from 500 to 30,000+</li>
          <li>Account ages from 1 to 15+ years</li>
          <li>Sales Navigator enabled accounts available</li>
          <li>Verified and pre-warmed for immediate use</li>
          <li>Monthly pricing from $10 to $500</li>
        </ul>
        <h3>Why Rent LinkedIn Accounts?</h3>
        <p>
          Renting LinkedIn accounts allows sales teams to scale outreach without building
          profiles from scratch. Each account is aged, has established connections, and is
          ready for campaigns. Cancel anytime with no long-term commitment.
        </p>
      </div>
    </>
  );
}
