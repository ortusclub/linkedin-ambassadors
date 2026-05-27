import type { Metadata } from "next";
import Link from "next/link";
import { CompareStyle } from "../compare-style";

export const metadata: Metadata = {
  title: "Klabber vs MirrorProfiles — Real Accounts vs Fake Profiles",
  description:
    "MirrorProfiles rents synthetic LinkedIn accounts with fabricated identities. Klabber rents access to real accounts owned by real professionals. Here's why real profiles outperform fake ones for outreach.",
  alternates: { canonical: "/vs/mirrorprofiles" },
  openGraph: {
    title: "Klabber vs MirrorProfiles for LinkedIn Outreach",
    description:
      "Real LinkedIn accounts (Klabber) vs synthetic fake profiles (MirrorProfiles). Side-by-side comparison for outreach teams.",
    url: "https://klabber.co/vs/mirrorprofiles",
  },
};

const comparison = [
  { feature: "Account type", klabber: "Real accounts owned by real professionals", alt: "Synthetic accounts with fabricated identities" },
  { feature: "Profile authenticity", klabber: "Real name, real photo, real work history, real connections", alt: "AI-selected photo, invented work history, manufactured connections" },
  { feature: "Connection quality", klabber: "Organic networks built over years (500-10,000+)", alt: "500+ connections built during 3-4 month warming period" },
  { feature: "LinkedIn TOS", klabber: "No ownership transfer — original owner keeps the account", alt: "Fake identity accounts violate LinkedIn's real-name policy" },
  { feature: "Sales Navigator", klabber: "Available on selected accounts", alt: "Not included" },
  { feature: "Pricing", klabber: "$10-500/mo depending on account quality", alt: "~€100/mo (EU) or ~$150/mo (US) per account" },
  { feature: "Anti-detect browser", klabber: "GoLogin included with dedicated residential proxy", alt: "Dedicated IP and digital fingerprint (details not disclosed)" },
  { feature: "Prospect perception", klabber: "Prospects see a real professional with a genuine background", alt: "Prospects may notice a thin or inconsistent profile" },
  { feature: "Profile editing", klabber: "Profile locked — original owner maintains it", alt: "Max one edit per day; cannot delete prior work history" },
  { feature: "Automation tools", klabber: "Any Chrome extension — Dripify, Expandi, Linked Helper, etc.", alt: "Limited to one tool per account (Waalaxy, La Growth Machine, HeyReach, etc.)" },
];

const faqs = [
  {
    q: "What's the difference between real and synthetic LinkedIn accounts?",
    a: "Real accounts (Klabber) belong to actual professionals who built their profile, connections, and activity history over years. Synthetic accounts (MirrorProfiles) are created from scratch with fabricated identities, AI-generated photos, and invented work histories — then warmed for 3-4 months with manufactured engagement.",
  },
  {
    q: "Why does account authenticity matter for outreach?",
    a: "Prospects research who's contacting them. A real account with a genuine professional background, real mutual connections, and years of LinkedIn activity builds trust instantly. A synthetic profile with a thin history, no real industry presence, and connections that don't match the claimed background raises red flags — lowering acceptance and reply rates.",
  },
  {
    q: "Are MirrorProfiles accounts safe from LinkedIn bans?",
    a: "MirrorProfiles offers a 24-hour replacement guarantee if an account gets suspended, which implies suspensions do occur. Their accounts use fabricated identities, which violates LinkedIn's User Agreement requirement that profiles use real names and accurate information. Klabber's real-account model avoids this risk entirely — the profiles are genuine and maintained by their original owners.",
  },
  {
    q: "Is Klabber cheaper than MirrorProfiles?",
    a: "It depends on the account. Klabber's range is $10-500/month based on connection count, industry, and Sales Navigator. Basic accounts start at $10/month — significantly cheaper than MirrorProfiles' ~€100/month (EU) or ~$150/month (US). Premium Klabber accounts with 5,000+ connections and Sales Navigator can cost more, but they come with a genuine profile that outperforms a synthetic one.",
  },
  {
    q: "Can I use MirrorProfiles and Klabber together?",
    a: "You could, but most teams choose one approach. If authenticity and prospect trust matter to your outreach (they should), Klabber's real accounts will outperform synthetic profiles. If you're doing high-volume, low-touch outreach where profile quality matters less, MirrorProfiles might work — but the LinkedIn TOS risk remains.",
  },
];

export default function MirrorProfilesVsKlabberPage() {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://klabber.co" },
      { "@type": "ListItem", position: 2, name: "Comparisons", item: "https://klabber.co/vs" },
      { "@type": "ListItem", position: 3, name: "vs MirrorProfiles", item: "https://klabber.co/vs/mirrorprofiles" },
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
          <Link href="/">Home</Link> · <Link href="/vs">Comparisons</Link> · vs MirrorProfiles
        </div>

        <header className="vs-header">
          <div className="vs-label">Comparison</div>
          <h1 className="vs-title">Klabber vs MirrorProfiles</h1>
          <p className="vs-subtitle">
            MirrorProfiles creates synthetic LinkedIn accounts with fabricated identities
            and warms them for 3-4 months before renting them out. Klabber rents access
            to real accounts owned by real professionals — with genuine connections,
            real activity history, and years of organic presence on LinkedIn.
          </p>
        </header>

        <div className="vs-verdict">
          <span className="vs-verdict-label">TL;DR</span>
          <p>
            <strong>Real accounts outperform fake ones.</strong> MirrorProfiles rents
            synthetic profiles with invented identities. Klabber rents access to real
            accounts from real professionals — better acceptance rates, better prospect
            trust, and no LinkedIn TOS risk from fake identities. Klabber starts at
            $10/mo vs MirrorProfiles&apos; ~$100-150/mo.
          </p>
        </div>

        <section className="vs-table-section">
          <h2>Side by side</h2>
          <div className="vs-table-wrap">
            <table className="vs-table">
              <thead>
                <tr><th></th><th>Klabber</th><th>MirrorProfiles</th></tr>
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
          <h2>The problem with synthetic accounts</h2>
          <p>
            MirrorProfiles describes their accounts as &quot;fictitious but realistic.&quot;
            Each profile is built from scratch: AI-selected photo, invented work history,
            fabricated education, and connections accumulated during a 3-4 month warming
            period. While the accounts may pass a casual glance, they fail under scrutiny
            — and LinkedIn prospects increasingly check who&apos;s contacting them before
            accepting.
          </p>
          <h2>Why real accounts convert better</h2>
          <p>
            A real Klabber account has a genuine professional background that matches the
            industry you&apos;re targeting. The connections are organic, the activity history
            is authentic, and mutual connections often exist. When a prospect sees a
            connection request from a real marketing director with 3,000+ connections in
            their industry, they accept. When they see a thin profile with generic job
            titles and no mutual connections, they don&apos;t.
          </p>
          <h2>The TOS risk difference</h2>
          <p>
            LinkedIn requires profiles to use real names and accurate information.
            MirrorProfiles&apos; synthetic accounts violate this requirement by design —
            every account uses a fabricated identity. If LinkedIn cracks down on fake
            accounts (and they regularly do), entire batches can get swept. Klabber
            accounts are real professionals who voluntarily share access — no fake
            identity, no TOS violation.
          </p>
          <h2>Price comparison</h2>
          <p>
            MirrorProfiles charges ~{"€"}100/month for European accounts and ~$150/month
            for North American accounts, with no Sales Navigator option. Klabber&apos;s
            range starts at $10/month for basic accounts and goes up to $500/month for
            premium accounts with Sales Navigator and 5,000+ connections. For most use
            cases, Klabber is both cheaper and higher quality.
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
          <h2>Rent real accounts, not fake ones</h2>
          <p>847+ verified accounts from real professionals. Genuine connections, real history, Sales Navigator available.</p>
          <div className="vs-cta-row">
            <Link href="/catalogue" className="vs-btn-primary">Browse Real Accounts →</Link>
            <Link href="/how-it-works" className="vs-btn-secondary">How Klabber Works</Link>
          </div>
        </section>
      </div>
    </>
  );
}
