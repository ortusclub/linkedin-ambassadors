import type { Metadata } from "next";
import Link from "next/link";
import { CompareStyle } from "../compare-style";

export const metadata: Metadata = {
  title: "LinkedVelocity vs Smartlead — LinkedIn Account Rental vs Email Automation",
  description:
    "Smartlead automates cold email with unlimited mailboxes. LinkedVelocity rents LinkedIn accounts for outreach. They solve different parts of the pipeline — here's how to decide which you need, or whether to use both.",
  alternates: { canonical: "/vs/smartlead" },
  openGraph: {
    title: "LinkedVelocity vs Smartlead for Outreach",
    description:
      "Smartlead handles email. LinkedVelocity handles LinkedIn accounts. Here's when you need which.",
    url: "https://linkedvelocity.com/vs/smartlead",
  },
};

const comparison = [
  { feature: "Core product", linkedvelocity: "LinkedIn account rental marketplace", alt: "Cold email automation with unlimited mailboxes" },
  { feature: "Channel", linkedvelocity: "LinkedIn only", alt: "Email only (LinkedIn via third-party integrations)" },
  { feature: "Accounts provided", linkedvelocity: "Yes — rent real, pre-warmed LinkedIn accounts", alt: "Yes — unlimited email mailboxes included" },
  { feature: "Anti-detect / isolation", linkedvelocity: "GoLogin browser + residential proxy per account", alt: "IP rotation and email warmup for deliverability" },
  { feature: "LinkedIn multi-account", linkedvelocity: "Core feature — rent as many as needed", alt: "Not supported — Smartlead is email-focused" },
  { feature: "Warming", linkedvelocity: "None needed — accounts have real years-long history", alt: "Automated email warmup included" },
  { feature: "Best for", linkedvelocity: "LinkedIn outreach at scale across multiple accounts", alt: "High-volume cold email campaigns" },
  { feature: "Pricing", linkedvelocity: "$10-500/mo per LinkedIn account", alt: "$39-94/mo for email platform" },
];

const faqs = [
  {
    q: "Can I use LinkedVelocity and Smartlead together?",
    a: "Yes. Many growth teams run Smartlead for cold email and LinkedVelocity for LinkedIn. Contact the same prospects on both channels: email via Smartlead, then connect and message on LinkedIn via rented LinkedVelocity accounts. Multi-touch outreach has 2-3x higher response rates than single-channel.",
  },
  {
    q: "Does Smartlead support LinkedIn outreach?",
    a: "Not natively. Smartlead is an email automation platform. Some users connect LinkedIn tools via webhooks or Zapier, but Smartlead doesn't provide LinkedIn accounts or browser sessions. LinkedVelocity fills that gap.",
  },
  {
    q: "Which is better for B2B prospecting?",
    a: "It depends on your channel. For email-first prospecting with high volume, Smartlead excels. For LinkedIn-first prospecting where you need multiple accounts, LinkedVelocity is purpose-built. The best-performing teams use both — email and LinkedIn — to reach prospects on the channel they're most responsive on.",
  },
  {
    q: "I'm already paying for Smartlead. Do I need LinkedVelocity?",
    a: "Only if you want to add LinkedIn as an outreach channel and need more than your personal LinkedIn account. If you're hitting LinkedIn's weekly connection limits or want to run campaigns from multiple LinkedIn profiles, LinkedVelocity gives you additional accounts ready for outreach the same day.",
  },
];

export default function SmartleadVsLinkedVelocityPage() {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://linkedvelocity.com" },
      { "@type": "ListItem", position: 2, name: "Comparisons", item: "https://linkedvelocity.com/vs" },
      { "@type": "ListItem", position: 3, name: "vs Smartlead", item: "https://linkedvelocity.com/vs/smartlead" },
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
          <Link href="/">Home</Link> · <Link href="/vs">Comparisons</Link> · vs Smartlead
        </div>

        <header className="vs-header">
          <div className="vs-label">Comparison</div>
          <h1 className="vs-title">LinkedVelocity vs Smartlead</h1>
          <p className="vs-subtitle">
            Smartlead automates cold email at scale with unlimited mailboxes and built-in
            warmup. LinkedVelocity rents LinkedIn accounts for outreach with GoLogin browser access.
            They cover different channels — and the best outbound teams use both.
          </p>
        </header>

        <div className="vs-verdict">
          <span className="vs-verdict-label">TL;DR</span>
          <p>
            <strong>Email vs LinkedIn — not either/or.</strong> Smartlead gives you
            unlimited email mailboxes. LinkedVelocity gives you LinkedIn accounts. If you&apos;re
            only doing email, Smartlead is enough. If you want to add LinkedIn outreach
            across multiple accounts, LinkedVelocity is what you add.
          </p>
        </div>

        <section className="vs-table-section">
          <h2>Side by side</h2>
          <div className="vs-table-wrap">
            <table className="vs-table">
              <thead>
                <tr><th></th><th>LinkedVelocity</th><th>Smartlead</th></tr>
              </thead>
              <tbody>
                {comparison.map((row) => (
                  <tr key={row.feature}>
                    <td className="vs-feature">{row.feature}</td>
                    <td className="vs-good">{row.linkedvelocity}</td>
                    <td style={{ color: "#536471" }}>{row.alt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="vs-detail">
          <h2>When to use LinkedVelocity</h2>
          <p>
            Use LinkedVelocity when LinkedIn is part of your outreach strategy and you need
            more accounts than you currently own. If your SDR team has 5 people but
            wants to run campaigns from 20 LinkedIn profiles — across different
            industries, geographies, or client engagements — LinkedVelocity is where you
            get those 15 additional accounts, each with its own GoLogin browser and
            residential proxy.
          </p>
          <h2>When to use Smartlead</h2>
          <p>
            Use Smartlead when cold email is your primary channel and you need
            unlimited sending capacity. Smartlead&apos;s strength is email
            infrastructure: warmup, rotation, deliverability monitoring, and
            multi-inbox management. It&apos;s purpose-built for email volume.
          </p>
          <h2>The multi-channel play</h2>
          <p>
            The highest-performing outbound teams don&apos;t choose between email and
            LinkedIn — they use both. Smartlead handles email sequences, and LinkedVelocity
            provides the LinkedIn accounts for parallel outreach. Prospects who ignore
            a cold email often respond to a LinkedIn connection request the same week,
            and vice versa.
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
          <h2>Add LinkedIn to your outreach stack</h2>
          <p>Rent pre-warmed accounts and start messaging the same day. Works alongside Smartlead, Instantly, or any email tool.</p>
          <div className="vs-cta-row">
            <Link href="/catalogue" className="vs-btn-primary">Browse Accounts →</Link>
            <Link href="/how-it-works" className="vs-btn-secondary">How LinkedVelocity Works</Link>
          </div>
        </section>
      </div>
    </>
  );
}
