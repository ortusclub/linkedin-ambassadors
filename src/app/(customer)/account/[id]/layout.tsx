import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const account = await prisma.linkedInAccount.findUnique({
    where: { id },
    select: {
      linkedinName: true,
      linkedinHeadline: true,
      connectionCount: true,
      industry: true,
      location: true,
      monthlyPrice: true,
      hasSalesNav: true,
      status: true,
    },
  });

  if (!account || account.status !== "available") return {};

  const name = account.linkedinName.replace(/\s*\(.*\)\s*$/, "");
  const price = Number(account.monthlyPrice);

  return {
    title: `Rent ${name}'s LinkedIn Account — ${account.connectionCount.toLocaleString()} Connections`,
    description: `Rent ${name}'s pre-warmed LinkedIn account for outreach. ${account.connectionCount.toLocaleString()} connections${account.industry ? ` in ${account.industry}` : ""}${account.hasSalesNav ? ", Sales Navigator included" : ""}. $${price}/month, cancel anytime.`,
    alternates: { canonical: `/account/${id}` },
    openGraph: {
      title: `Rent ${name}'s LinkedIn — ${account.connectionCount.toLocaleString()} Connections | LinkedVelocity`,
      description: `Pre-warmed LinkedIn account for rent. ${account.connectionCount.toLocaleString()} connections${account.industry ? ` in ${account.industry}` : ""}. $${price}/mo.`,
      url: `https://linkedvelocity.com/account/${id}`,
    },
  };
}

export default async function AccountLayout({ params, children }: Props) {
  const { id } = await params;

  let account;
  try {
    account = await prisma.linkedInAccount.findUnique({
      where: { id },
      select: {
        linkedinName: true,
        linkedinHeadline: true,
        connectionCount: true,
        industry: true,
        location: true,
        monthlyPrice: true,
        hasSalesNav: true,
        profilePhotoUrl: true,
        status: true,
        listed: true,
      },
    });
  } catch {
    return <>{children}</>;
  }

  if (!account || !account.listed) return <>{children}</>;

  const name = account.linkedinName.replace(/\s*\(.*\)\s*$/, "");
  const price = Number(account.monthlyPrice);

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${name}'s LinkedIn Account Rental`,
    description: `Rent ${name}'s pre-warmed LinkedIn account for outreach. ${account.connectionCount.toLocaleString()} connections${account.industry ? ` in ${account.industry}` : ""}${account.hasSalesNav ? ", Sales Navigator included" : ""}. Instant access via GoLogin browser.`,
    brand: { "@type": "Brand", name: "LinkedVelocity" },
    category: "LinkedIn Account Rental",
    ...(account.profilePhotoUrl ? { image: account.profilePhotoUrl } : {}),
    offers: {
      "@type": "Offer",
      price: price.toFixed(2),
      priceCurrency: "USD",
      availability:
        account.status === "available"
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      url: `https://linkedvelocity.com/account/${id}`,
      priceValidUntil: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString().split("T")[0],
      seller: { "@type": "Organization", name: "LinkedVelocity" },
    },
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "Connection Count",
        value: account.connectionCount.toLocaleString(),
      },
      ...(account.industry
        ? [
            {
              "@type": "PropertyValue",
              name: "Industry",
              value: account.industry,
            },
          ]
        : []),
      ...(account.location
        ? [
            {
              "@type": "PropertyValue",
              name: "Location",
              value: account.location,
            },
          ]
        : []),
      {
        "@type": "PropertyValue",
        name: "Sales Navigator",
        value: account.hasSalesNav ? "Included" : "Not included",
      },
    ],
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://linkedvelocity.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Catalogue",
        item: "https://linkedvelocity.com/catalogue",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `${name}'s Account`,
        item: `https://linkedvelocity.com/account/${id}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
