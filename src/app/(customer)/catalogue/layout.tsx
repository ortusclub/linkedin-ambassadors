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
  return <>{children}</>;
}
