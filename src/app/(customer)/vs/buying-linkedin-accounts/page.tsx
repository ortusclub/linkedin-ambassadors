import type { Metadata } from "next";
import Link from "next/link";
import { CompareStyle } from "../compare-style";

export const metadata: Metadata = {
  title: "Renting vs Buying LinkedIn Accounts — Why Renting Is Safer",
  description:
    "Comparing renting LinkedIn accounts (via Klabber) to buying them outright. Buying violates LinkedIn's terms, exposes you to permanent bans, and offers no recovery if the account dies. Renting via GoLogin browser sessions sidesteps all three risks.",
  alternates: { canonical: "/vs/buying-linkedin-accounts" },
  openGraph: {
    title: "Renting vs Buying LinkedIn Accounts — Side-by-Side",
    description:
      "Why renting LinkedIn accounts through Klabber is safer, cheaper, and faster than buying accounts on marketplaces.",
    url: "https://klabber.co/vs/buying-linkedin-accounts",
  },
};

const comparison = [
  { feature: "LinkedIn TOS compliance", klabber: "Compliant — account is never transferred", alt: "Violates LinkedIn TOS (account sales prohibited)" },
  { feature: "Risk of permanent ban", klabber: "0% restriction rate to date", alt: "High — flagged accounts get permanently banned" },
  { feature: "Recovery if account dies", klabber: "Swap to another account in your dashboard", alt: "You lose the full purchase price" },
  { feature: "Upfront cost", klabber: "$10-500/month, cancel anytime", alt: "$100-2,000+ per account, non-refundable" },
  { feature: "Account warming period", klabber: "None — accounts are pre-warmed and active", alt: "1-3 months before safe for outreach" },
  { feature: "Verification & 2FA", klabber: "Already verified, 2FA handled in GoLogin session", alt: "Often unverified, 2FA disputes common" },
  { feature: "Profile content control", klabber: "Original owner curates profile (looks real)", alt: "You inherit a fake or abandoned profile" },
  { feature: "Time to first message sent", klabber: "Same day", alt: "Weeks — buy, warm, verify, then send" },
];

const faqs = [
  {
    q: "Why is buying LinkedIn accounts risky?",
    a: "Account sales violate LinkedIn's User Agreement (Section 8.2). When LinkedIn detects a sold account — usually via login location, IP, or device fingerprint changes — they permanently restrict it. You lose both the account and whatever you paid. Klabber sidesteps this by renting access to active accounts that stay with their original owner.",
  },
  {
    q: "What happens if a rented account gets restricted?",
    a: "Across thousands of rentals, Klabber has maintained a 0% restriction rate thanks to isolated GoLogin sessions and dedicated residential proxies. If an account is ever restricted while you're renting it, you can switch to another available account from your dashboard at no extra cost.",
  },
  {
    q: "Aren't rented accounts more expensive than bought ones?",
    a: "Only if you measure single-month cost. A bought account typically costs $200-2,000 upfront and may die before you recoup the value. Renting at $10-500/month means you only pay while the account is producing results, and you can cancel anytime.",
  },
  {
    q: "Can I run automation tools on a rented account?",
    a: "Yes — rented accounts run inside a real Chrome session (via GoLogin), so any LinkedIn automation tool works: Dripify, Expandi, Linked Helper, Phantombuster, Lemlist's LinkedIn module, and any Chrome extension you'd normally install.",
  },
];

export default function BuyingVsRentPage() {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://klabber.co" },
      { "@type": "ListItem", position: 2, name: "Comparisons", item: "https://klabber.co/vs" },
      { "@type": "ListItem", position: 3, name: "vs Buying LinkedIn Accounts", item: "https://klabber.co/vs/buying-linkedin-accounts" },
    ],
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <CompareStyle />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="vs-page">
        <div className="vs-crumb">
          <Link href="/">Home</Link> · <Link href="/how-it-works">How It Works</Link> · vs Buying Accounts
        </div>

        <header className="vs-header">
          <div className="vs-label">Comparison</div>
          <h1 className="vs-title">Renting vs buying LinkedIn accounts</h1>
          <p className="vs-subtitle">
            Buying a LinkedIn account is the fastest way to lose money to a permanent ban.
            LinkedIn explicitly prohibits account sales — every bought account is on borrowed
            time. Renting via Klabber gets you the same outreach capacity, legally, at a
            fraction of the upfront cost, with a 0% restriction rate to date.
          </p>
        </header>

        <div className="vs-verdict">
          <span className="vs-verdict-label">TL;DR</span>
          <p>
            <strong>Rent, don&apos;t buy.</strong> Buying violates LinkedIn&apos;s terms and
            usually ends in a permanent restriction within weeks. Renting through Klabber
            keeps the account with its original owner, runs in an isolated browser session,
            and costs $10-500/month with no upfront risk.
          </p>
        </div>

        <section className="vs-table-section">
          <h2>Side by side</h2>
          <div className="vs-table-wrap">
            <table className="vs-table">
              <thead>
                <tr><th></th><th>Klabber (rent)</th><th>Buying accounts</th></tr>
              </thead>
              <tbody>
                {comparison.map((row) => (
                  <tr key={row.feature}>
                    <td className="vs-feature">{row.feature}</td>
                    <td className="vs-good">{row.klabber}</td>
                    <td className="vs-bad">{row.alt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="vs-detail">
          <h2>Why buying is structurally broken</h2>
          <p>
            LinkedIn&apos;s detection model is built around login behaviour, not profile
            content. When a sold account suddenly logs in from a new country, browser, or
            device, LinkedIn flags it within days. The buyer has no recourse — the seller is
            usually anonymous, payment is irreversible (often crypto), and the account is
            gone forever.
          </p>
          <h2>Why renting works</h2>
          <p>
            Klabber rents the <em>session</em>, not the account. The original owner&apos;s
            credentials, recovery email, and 2FA stay with them. The renter accesses the
            account through a managed GoLogin browser profile with a dedicated residential
            proxy in the same region as the owner. From LinkedIn&apos;s perspective, nothing
            unusual is happening.
          </p>
          <h2>The cost math actually favours renting</h2>
          <p>
            A $500 bought account that dies after six weeks costs ~$80/week. A comparable
            Klabber rental at $50/month costs ~$12/week, with no upfront risk and no
            account-death cliff. If outreach doesn&apos;t work, you cancel.
          </p>
        </section>

        <section className="vs-faq">
          <h2>FAQs</h2>
          {faqs.map((f) => (
            <details key={f.q} className="vs-faq-item">
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </section>

        <section className="vs-cta">
          <h2>Browse rentable accounts</h2>
          <p>Filter by industry, connection count, and Sales Navigator. No upfront fee. Cancel anytime.</p>
          <div className="vs-cta-row">
            <Link href="/catalogue" className="vs-btn-primary">Browse Catalogue →</Link>
            <Link href="/how-it-works" className="vs-btn-secondary">How Klabber Works</Link>
          </div>
        </section>
      </div>
    </>
  );
}

