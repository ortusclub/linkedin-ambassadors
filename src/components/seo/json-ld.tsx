export function JsonLd() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Klabber",
    url: "https://klabber.co",
    logo: "https://klabber.co/favicon.svg",
    description:
      "Klabber is a marketplace for renting premium, pre-warmed LinkedIn accounts for outreach and lead generation.",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      url: "https://t.me/klabber_support_bot",
      availableLanguage: "English",
    },
    sameAs: ["https://t.me/klabber_support_bot"],
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Klabber",
    url: "https://klabber.co",
    description:
      "Rent premium LinkedIn accounts for outreach, lead generation, and networking.",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://klabber.co/catalogue?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "LinkedIn Account Rental",
    provider: {
      "@type": "Organization",
      name: "Klabber",
    },
    description:
      "Rent pre-warmed, verified LinkedIn accounts for B2B outreach and lead generation campaigns. Includes GoLogin browser access for safe, simultaneous use.",
    serviceType: "Account Rental",
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

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How does LinkedIn account rental work?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Browse our catalogue of pre-warmed LinkedIn accounts, select one that fits your needs, and get instant access via GoLogin browser. Each account is verified, aged, and ready for outreach campaigns.",
        },
      },
      {
        "@type": "Question",
        name: "Is it safe to rent a LinkedIn account?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. We use GoLogin anti-detect browser technology which creates unique browser fingerprints for each session. This prevents LinkedIn from detecting account sharing, with a 0% restriction rate.",
        },
      },
      {
        "@type": "Question",
        name: "How much does it cost to rent a LinkedIn account?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Accounts start from $10/month for basic profiles and go up to $500/month for premium accounts with Sales Navigator, large connection networks, and established presence.",
        },
      },
      {
        "@type": "Question",
        name: "Can I earn money by listing my LinkedIn account?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. If you have a LinkedIn account you're not actively using, you can list it as an Ambassador and earn $10-$500 per month depending on your account's connections, age, and features.",
        },
      },
      {
        "@type": "Question",
        name: "Can I still use my account while it's rented?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. GoLogin allows simultaneous access, so you and the renter can use the account at the same time without conflicts or session clashes.",
        },
      },
      {
        "@type": "Question",
        name: "How are renters charged?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Renters pay a monthly subscription per account. You can pay with a credit card via Stripe or with USDC cryptocurrency. Cancel anytime — no long-term contracts required.",
        },
      },
      {
        "@type": "Question",
        name: "Will renters change my profile information?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. Your name, photo, headline, and profile content stay exactly as they are. Renters only use the account for connection requests and messaging — no profile edits allowed.",
        },
      },
      {
        "@type": "Question",
        name: "What tools work with rented accounts?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Any Chrome extension or LinkedIn automation tool works — including Dripify, Expandi, Linked Helper, and others. The GoLogin browser session supports all standard extensions.",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(serviceSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema),
        }}
      />
    </>
  );
}
