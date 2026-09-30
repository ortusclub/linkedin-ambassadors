import type { Brand } from "@/lib/brand";

// Structured data, resolved per brand. LinkedVelocity keeps its rental wording; LinkedArmy
// gets the "hire a rep" framing. Both read name/url/logo/support from the brand config.
export function JsonLd({ brand }: { brand: Brand }) {
  const telegramUrl = `https://t.me/${brand.supportTelegram.replace(/^@/, "")}`;
  const isArmy = brand.id === "linkedarmy";

  const orgDescription = isArmy
    ? "LinkedArmy connects B2B teams with real LinkedIn reps who run outreach on their behalf."
    : "LinkedVelocity is a marketplace for renting premium, pre-warmed LinkedIn accounts for outreach and lead generation.";
  const websiteDescription = isArmy
    ? "Hire real LinkedIn reps with established networks to scale your outreach."
    : "Rent premium LinkedIn accounts for outreach, lead generation, and networking.";
  const serviceName = isArmy ? "LinkedIn Outreach Reps" : "LinkedIn Account Rental";
  const serviceType = isArmy ? "Outreach Service" : "Account Rental";
  const serviceDescription = isArmy
    ? "Hire vetted LinkedIn reps with established networks to run B2B outreach and lead generation campaigns."
    : "Rent pre-warmed, verified LinkedIn accounts for B2B outreach and lead generation campaigns. Includes GoLogin browser access for safe, simultaneous use.";

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: brand.name,
    url: brand.url,
    logo: `${brand.url}${brand.favicon}`,
    description: orgDescription,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      url: telegramUrl,
      availableLanguage: "English",
    },
    sameAs: [telegramUrl],
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: brand.name,
    url: brand.url,
    description: websiteDescription,
    potentialAction: {
      "@type": "SearchAction",
      target: `${brand.url}/catalogue?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: serviceName,
    provider: {
      "@type": "Organization",
      name: brand.name,
    },
    description: serviceDescription,
    serviceType,
    areaServed: "Worldwide",
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "10",
      highPrice: "500",
      priceCurrency: "USD",
      offerCount: "50+",
      availability: "https://schema.org/InStock",
    },
  };

  const aggregateRatingSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${brand.name} ${serviceName}`,
    description: serviceDescription,
    brand: { "@type": "Brand", name: brand.name },
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "10",
      highPrice: "500",
      priceCurrency: "USD",
      offerCount: "847",
      availability: "https://schema.org/InStock",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      bestRating: "5",
      worstRating: "1",
      ratingCount: "237",
      reviewCount: "237",
    },
  };

  // LinkedVelocity keeps its exact original FAQ set (unchanged rich snippets);
  // LinkedArmy gets a rep-worded set.
  const lvFaq = [
    { q: "How does LinkedIn account rental work?", a: "Browse our catalogue of pre-warmed LinkedIn accounts, select one that fits your needs, and get instant access via GoLogin browser. Each account is verified, aged, and ready for outreach campaigns." },
    { q: "Is it safe to rent a LinkedIn account?", a: "Yes. We use GoLogin anti-detect browser technology which creates unique browser fingerprints for each session. This prevents LinkedIn from detecting account sharing, with a 0% restriction rate." },
    { q: "How much does it cost to rent a LinkedIn account?", a: "Accounts start from $10/month for basic profiles and go up to $500/month for premium accounts with Sales Navigator, large connection networks, and established presence." },
    { q: "Can I earn money by listing my LinkedIn account?", a: "Yes. If you have a LinkedIn account you're not actively using, you can list it as an Ambassador and earn $10-$500 per month depending on your account's connections, age, and features." },
    { q: "Can I still use my account while it's rented?", a: "Yes. GoLogin allows simultaneous access, so you and the renter can use the account at the same time without conflicts or session clashes." },
    { q: "How are renters charged?", a: "Renters pay a monthly subscription per account. You can pay with a credit card via Stripe or with USDC cryptocurrency. Cancel anytime — no long-term contracts required." },
    { q: "Will renters change my profile information?", a: "No. Your name, photo, headline, and profile content stay exactly as they are. Renters only use the account for connection requests and messaging — no profile edits allowed." },
    { q: "What tools work with rented accounts?", a: "Any Chrome extension or LinkedIn automation tool works — including Dripify, Expandi, Linked Helper, and others. The GoLogin browser session supports all standard extensions." },
  ];
  const armyFaq = [
    { q: "How does hiring a LinkedIn rep work?", a: "Browse our roster of vetted professionals with established LinkedIn networks, choose the rep that fits your market, and run outreach through their established, credible profile from day one." },
    { q: "Is it safe to hire a rep for outreach?", a: "Every session runs through a dedicated, isolated browser environment with its own IP and fingerprint, so LinkedIn sees one consistent user. Activity stays within safe limits to protect the account." },
    { q: "How much does it cost to hire a rep?", a: "Pricing runs from $45/month for newer profiles up to $110+/month for senior reps with large networks and Sales Navigator. You see the exact monthly price before you commit." },
    { q: "Can I earn as a LinkedIn rep?", a: "Yes. If you have an established LinkedIn account you're not actively using, you can join the network and earn a monthly retainer depending on your account's connections, age, and features." },
  ];
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: (isArmy ? armyFaq : lvFaq).map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(aggregateRatingSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    </>
  );
}
