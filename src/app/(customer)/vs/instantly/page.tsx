import type { Metadata } from "next";
import Link from "next/link";
import { CompareStyle } from "../compare-style";

export const metadata: Metadata = {
  title: "Klabber vs Instantly — LinkedIn Outreach Compared",
  description:
    "Instantly is a cold email platform with a LinkedIn add-on. Klabber is a dedicated LinkedIn account rental marketplace. Here's when you need Klabber alongside or instead of Instantly for LinkedIn outreach at scale.",
  alternates: { canonical: "/vs/instantly" },
  openGraph: {
    title: "Klabber vs Instantly for LinkedIn Outreach",
    description:
      "How Klabber's LinkedIn account rentals compare to Instantly's LinkedIn outreach features.",
    url: "https://klabber.co/vs/instantly",
  },
};

const comparison = [
  { feature: "Core product", klabber: "LinkedIn account rental marketplace", alt: "Cold email platform with LinkedIn add-on" },
  { feature: "LinkedIn accounts included", klabber: "Yes — rent 1 to 50+ real accounts", alt: "No — you must bring your own LinkedIn account" },
  { feature: "Multi-account LinkedIn outreach", klabber: "Rent as many accounts as you need, each isolated", alt: "Limited to accounts you already own or control" },
  { feature: "Account warming", klabber: "None — accounts are pre-warmed with real history", alt: "Email warming included; LinkedIn accounts need separate warming" },
  { feature: "Anti-detect browser", klabber: "GoLogin included with every rental, dedicated residential proxy", alt: "Not included — need separate browser tool for LinkedIn" },
  { feature: "Email outreach", klabber: "Not included — LinkedIn only", alt: "Core feature — email warmup, rotation, sequences" },
  { feature: "Best for", klabber: "Teams who need more LinkedIn accounts for outreach", alt: "Teams who need a cold email engine with optional LinkedIn" },
  { feature: "Pricing", klabber: "$10-500/mo per LinkedIn account", alt: "$30-97/mo for email platform; LinkedIn accounts extra" },
];

const faqs = [
  {
    q: "Can I use Klabber and Instantly together?",
    a: "Yes — many teams do. Use Instantly for cold email sequences and Klabber for LinkedIn outreach on rented accounts. They serve different channels and complement each other well. Run Instantly's LinkedIn extension inside the GoLogin browser session that comes with every Klabber rental.",
  },
  {
    q: "Does Instantly provide LinkedIn accounts?",
    a: "No. Instantly is an email-first platform. Its LinkedIn features require you to connect your own LinkedIn account. If you need additional LinkedIn accounts for outreach, that's exactly what Klabber provides.",
  },
  {
    q: "Which is cheaper for LinkedIn outreach?",
    a: "For pure LinkedIn outreach, Klabber is more cost-effective because you get the accounts, browser, and proxy in one package. Instantly charges for the platform ($30-97/mo) but you still need to source and manage your own LinkedIn accounts separately.",
  },
  {
    q: "Do I need Klabber if I already use Instantly?",
    a: "If your LinkedIn outreach is limited to your personal account, you may not. But if you've hit LinkedIn's connection limits and need to scale across multiple accounts, Klabber gives you additional accounts to use — either through Instantly's LinkedIn integration or standalone tools like Dripify or Expandi.",
  },
];

export default function InstantlyVsKlabberPage() {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://klabber.co" },
      { "@type": "ListItem", position: 2, name: "Comparisons", item: "https://klabber.co/vs" },
      { "@type": "ListItem", position: 3, name: "vs Instantly", item: "https://klabber.co/vs/instantly" },
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
          <Link href="/">Home</Link> · <Link href="/vs">Comparisons</Link> · vs Instantly
        </div>

        <header className="vs-header">
          <div className="vs-label">Comparison</div>
          <h1 className="vs-title">Klabber vs Instantly for LinkedIn outreach</h1>
          <p className="vs-subtitle">
            Instantly is a cold email platform that added LinkedIn as a secondary channel.
            Klabber is a marketplace dedicated to renting LinkedIn accounts for outreach.
            They solve different problems — and many teams use both.
          </p>
        </header>

        <div className="vs-verdict">
          <span className="vs-verdict-label">TL;DR</span>
          <p>
            <strong>Different tools, different jobs.</strong> Instantly is your cold email
            engine. Klabber gives you the LinkedIn accounts to run outreach on. If
            you&apos;ve hit LinkedIn&apos;s connection limits on your personal account,
            Klabber is where you get more accounts — then run campaigns via Instantly,
            Dripify, or any other tool.
          </p>
        </div>

        <section className="vs-table-section">
          <h2>Side by side</h2>
          <div className="vs-table-wrap">
            <table className="vs-table">
              <thead>
                <tr><th></th><th>Klabber</th><th>Instantly</th></tr>
              </thead>
              <tbody>
                {comparison.map((row) => (
                  <tr key={row.feature}>
                    <td className="vs-feature">{row.feature}</td>
                    <td className="vs-good">{row.klabber}</td>
                    <td style={{ color: "#536471" }}>{row.alt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="vs-detail">
          <h2>When to use Klabber</h2>
          <p>
            Use Klabber when you need more LinkedIn accounts than you currently have.
            If your team has 3 SDRs but needs to run campaigns from 15 LinkedIn
            profiles, Klabber gives you 12 additional pre-warmed accounts with
            GoLogin browser access and dedicated proxies. You can run any automation
            tool on them — including Instantly&apos;s LinkedIn module.
          </p>
          <h2>When to use Instantly</h2>
          <p>
            Use Instantly when cold email is your primary outreach channel and
            LinkedIn is supplementary. Instantly excels at email warmup, mailbox
            rotation, and multi-step email sequences. Its LinkedIn features work
            best as a complement to email campaigns, not as a standalone LinkedIn
            scaling tool.
          </p>
          <h2>When to use both</h2>
          <p>
            The most common setup is Instantly for email + Klabber for LinkedIn.
            Run your email sequences through Instantly&apos;s infrastructure, then
            connect-and-message the same prospects on LinkedIn through rented
            Klabber accounts. Multi-channel outreach consistently outperforms
            single-channel.
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
          <h2>Need more LinkedIn accounts?</h2>
          <p>Rent pre-warmed accounts with GoLogin browser access. Works with Instantly, Dripify, Expandi, and any Chrome tool.</p>
          <div className="vs-cta-row">
            <Link href="/catalogue" className="vs-btn-primary">Browse Accounts →</Link>
            <Link href="/how-it-works" className="vs-btn-secondary">How Klabber Works</Link>
          </div>
        </section>
      </div>
    </>
  );
}
