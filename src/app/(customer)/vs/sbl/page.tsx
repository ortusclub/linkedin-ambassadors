import type { Metadata } from "next";
import Link from "next/link";
import { CompareStyle } from "../compare-style";

export const metadata: Metadata = {
  title: "Klabber vs SBL.so — Account Rental vs Fractional SDR Service",
  description:
    "SBL.so recruits real LinkedIn users to run outreach on your behalf (fractional SDR model). Klabber rents you the account directly so you control the outreach. Here's how to decide which model fits your team.",
  alternates: { canonical: "/vs/sbl" },
  openGraph: {
    title: "Klabber vs SBL.so for LinkedIn Outreach",
    description:
      "Direct account rental (Klabber) vs fractional SDR outreach-as-a-service (SBL.so). Which model is right for your team?",
    url: "https://klabber.co/vs/sbl",
  },
};

const comparison = [
  { feature: "Model", klabber: "Rent the account — you control outreach", alt: "Fractional SDR — the account owner runs outreach for you" },
  { feature: "Account type", klabber: "Real accounts from real professionals", alt: "Real accounts from real professionals" },
  { feature: "Who sends messages", klabber: "You (or your team) — full control over messaging", alt: "The account owner, guided by AI + your campaign brief" },
  { feature: "Automation tools", klabber: "Any Chrome tool — Dripify, Expandi, Linked Helper, etc.", alt: "SBL's built-in AI platform handles messaging" },
  { feature: "Message customisation", klabber: "Full control — write and edit every message yourself", alt: "AI-generated with 95-99% automation; limited manual control" },
  { feature: "Pricing (per account)", klabber: "$10-500/mo — account rental only", alt: "From $35/mo per profile + $99-189/mo platform fee" },
  { feature: "Sales Navigator", klabber: "Available on selected accounts", alt: "Not specified" },
  { feature: "Anti-detect browser", klabber: "GoLogin with dedicated residential proxy", alt: "Not needed — owner uses their own device" },
  { feature: "Ramp-up time", klabber: "Instant — accounts are pre-warmed and ready", alt: "3-week warm-up ramp (20 → 50 → full capacity)" },
  { feature: "Best for", klabber: "Teams who want to control their own LinkedIn outreach", alt: "Teams who want outreach fully managed for them" },
];

const faqs = [
  {
    q: "What's the difference between renting an account and a fractional SDR?",
    a: "When you rent a LinkedIn account on Klabber, you get a browser session and full control — you write the messages, pick the targets, and run your automation tools. With SBL.so, the account owner runs the outreach on your behalf using SBL's AI platform. You provide the campaign brief, and they execute. It's the difference between renting a car and hiring a driver.",
  },
  {
    q: "Which is cheaper?",
    a: "Klabber is cheaper per account. A basic Klabber rental starts at $10/month with no platform fee. SBL.so charges $35+/month per profile plus a $99-189/month platform fee. For a 5-account setup, Klabber could cost as little as $50-250/month total, while SBL would cost $275-364/month minimum.",
  },
  {
    q: "Which gives me more control over messaging?",
    a: "Klabber. You have full access to the browser session, so you write every message, customise every connection request, and adjust campaigns in real-time. With SBL.so, an AI handles 95-99% of conversations — you set the brief, but you don't control individual messages.",
  },
  {
    q: "Is SBL.so safer because the owner runs outreach from their own device?",
    a: "SBL's model avoids anti-detect browsers by having the account owner use their own device, which is a legitimate safety advantage. However, Klabber's GoLogin approach with residential proxies also achieves a 0% restriction rate. Both models work — the question is whether you want control (Klabber) or hands-off managed outreach (SBL).",
  },
  {
    q: "Can I switch from SBL.so to Klabber?",
    a: "Yes. If you've been using SBL and want more control over messaging, targeting, or automation tools, Klabber gives you direct account access. You can use any automation tool you prefer, write your own messages, and adjust campaigns without waiting for a third party.",
  },
];

export default function SblVsKlabberPage() {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://klabber.co" },
      { "@type": "ListItem", position: 2, name: "Comparisons", item: "https://klabber.co/vs" },
      { "@type": "ListItem", position: 3, name: "vs SBL.so", item: "https://klabber.co/vs/sbl" },
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
          <Link href="/">Home</Link> · <Link href="/vs">Comparisons</Link> · vs SBL.so
        </div>

        <header className="vs-header">
          <div className="vs-label">Comparison</div>
          <h1 className="vs-title">Klabber vs SBL.so</h1>
          <p className="vs-subtitle">
            SBL.so is an outreach-as-a-service platform that recruits real LinkedIn users
            to run campaigns on your behalf. Klabber rents you the account directly so
            you control the messaging, tools, and targeting yourself. Both use real
            accounts — the difference is who&apos;s driving.
          </p>
        </header>

        <div className="vs-verdict">
          <span className="vs-verdict-label">TL;DR</span>
          <p>
            <strong>Control vs convenience.</strong> Klabber gives you direct access to
            LinkedIn accounts — you run your own campaigns with your own tools. SBL.so
            manages the outreach for you via AI and the account owner. Klabber is cheaper
            (from $10/mo, no platform fee) and gives full control. SBL is more hands-off
            but costs more and limits your customisation.
          </p>
        </div>

        <section className="vs-table-section">
          <h2>Side by side</h2>
          <div className="vs-table-wrap">
            <table className="vs-table">
              <thead>
                <tr><th></th><th>Klabber</th><th>SBL.so</th></tr>
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
          <h2>When to choose Klabber</h2>
          <p>
            Choose Klabber when your team already knows how to run LinkedIn outreach and
            just needs more accounts. You get direct browser access via GoLogin, use your
            preferred automation tools, write your own messages, and iterate on campaigns
            in real-time. No middleman, no AI writing messages you haven&apos;t approved,
            and no platform fee on top of the account rental.
          </p>
          <h2>When to choose SBL.so</h2>
          <p>
            Choose SBL when you want LinkedIn outreach fully managed. You provide a
            campaign brief, SBL&apos;s AI handles the messaging, and the account owner
            executes from their own device. This works for teams without outreach
            expertise or those who want zero operational overhead — but you sacrifice
            control over messaging, targeting adjustments, and tool choice.
          </p>
          <h2>The control trade-off</h2>
          <p>
            SBL&apos;s AI handles 95-99% of conversations automatically. That&apos;s
            convenient, but it means you don&apos;t control what gets said to your
            prospects. If your outreach requires nuanced, personalised messaging —
            or if you&apos;ve invested in your own sequences and templates — Klabber
            lets you run exactly the campaigns you&apos;ve built, on additional accounts,
            with no AI filter between you and the prospect.
          </p>
          <h2>Cost comparison</h2>
          <p>
            For 5 LinkedIn accounts, Klabber costs $50-250/month total (just account
            rentals, no platform fee). SBL costs $175-250/month in profile fees plus
            a $99-189/month platform fee — $274-439/month total. Klabber is 40-60%
            cheaper at the same scale, and you can use any automation tool you already
            pay for.
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
          <h2>Want control over your LinkedIn outreach?</h2>
          <p>Rent accounts directly. Use your own tools. Write your own messages. From $10/month.</p>
          <div className="vs-cta-row">
            <Link href="/catalogue" className="vs-btn-primary">Browse Accounts →</Link>
            <Link href="/how-it-works" className="vs-btn-secondary">How Klabber Works</Link>
          </div>
        </section>
      </div>
    </>
  );
}
