import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Rent LinkedIn Accounts for Outreach — From $10/Month",
  description:
    "Rent pre-warmed, verified LinkedIn accounts for B2B outreach and lead generation. 847+ accounts, 0% restriction rate, instant GoLogin browser access. Browse the catalogue and start sending messages today.",
  alternates: { canonical: "/rent-linkedin-accounts" },
  openGraph: {
    title: "Rent LinkedIn Accounts — LinkedVelocity Marketplace",
    description:
      "The marketplace for renting LinkedIn accounts. Pre-warmed profiles, GoLogin browser access, dedicated proxies. From $10/month, cancel anytime.",
    url: "https://linkedvelocity.com/rent-linkedin-accounts",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rent LinkedIn Accounts — LinkedVelocity",
    description:
      "Rent verified LinkedIn accounts for outreach. 847+ accounts, 0% restriction rate. From $10/mo.",
  },
};

const benefits = [
  {
    title: "Pre-warmed & verified",
    text: "Every account has an established connection network, real activity history, and verified credentials. No warming period needed — start outreach the same day you rent.",
  },
  {
    title: "GoLogin anti-detect browser",
    text: "Each rented account runs in an isolated browser profile with a unique fingerprint (canvas, WebGL, fonts, timezone). LinkedIn cannot distinguish the renter's session from the original owner.",
  },
  {
    title: "Dedicated residential proxy",
    text: "Every account gets its own residential IP address, matched to the region of the original account owner. No datacenter IPs, no VPNs, no shared proxies.",
  },
  {
    title: "0% restriction rate",
    text: "Across all rentals since launch, zero accounts have been restricted by LinkedIn. The combination of anti-detect browsers, residential proxies, and real account histories makes detection extremely unlikely.",
  },
  {
    title: "Works with any automation tool",
    text: "Dripify, Expandi, Linked Helper, Phantombuster, Lemlist, HeyReach — any Chrome extension or LinkedIn automation tool works inside the GoLogin session.",
  },
  {
    title: "Cancel anytime",
    text: "All rentals are monthly subscriptions with no contracts and no cancellation fees. If outreach doesn't work for you, stop paying.",
  },
];

const useCases = [
  {
    title: "SDR teams scaling outbound",
    text: "Sales development teams rent 5-20 LinkedIn accounts to run parallel campaigns across industries and geographies. Each SDR gets their own rented account with a unique persona, avoiding LinkedIn's daily connection limits on any single profile.",
  },
  {
    title: "Agencies managing client campaigns",
    text: "Lead generation agencies rent accounts per client engagement. When the campaign ends, cancel the rental. No sunk cost in buying accounts that might get banned.",
  },
  {
    title: "Founders doing founder-led sales",
    text: "Startup founders who've hit LinkedIn's weekly connection limit rent one or two additional accounts to double or triple their outreach volume without risking their personal profile.",
  },
  {
    title: "Recruiters sourcing candidates",
    text: "Recruitment firms rent accounts with connections in specific industries to access wider candidate pools and send InMail at scale through Sales Navigator-enabled profiles.",
  },
];

const faqs = [
  {
    q: "How much does it cost to rent a LinkedIn account?",
    a: "Rental prices range from $10 to $500 per month, depending on the account's connection count, industry, age, and whether it includes Sales Navigator. Basic accounts with 500-1,000 connections start at $10/month. Premium accounts with 5,000+ connections and Sales Navigator can reach $500/month.",
  },
  {
    q: "Is it safe to rent a LinkedIn account?",
    a: "Yes. LinkedVelocity has maintained a 0% restriction rate across all rentals since launch. Each account runs in an isolated GoLogin anti-detect browser with a unique fingerprint and dedicated residential proxy. LinkedIn's detection systems see the renter's session as normal activity from the original account owner.",
  },
  {
    q: "How quickly can I start sending messages?",
    a: "Same day. After checkout, the account's browser profile is shared straight to your own GoLogin account. Click to open the GoLogin browser session — the account is already logged in and ready for outreach. Install your preferred automation tool and start sending connection requests and messages immediately.",
  },
  {
    q: "Can I use my own LinkedIn tools with a rented account?",
    a: "Yes. Rented accounts run in a full Chrome browser session via GoLogin. Any LinkedIn tool that works as a Chrome extension or browser-based app will work — including Dripify, Expandi, Linked Helper, Phantombuster, Lemlist, and others.",
  },
  {
    q: "What's the difference between renting and buying LinkedIn accounts?",
    a: "Buying LinkedIn accounts violates LinkedIn's User Agreement and typically results in permanent bans within weeks. Renting through LinkedVelocity keeps the account with its original owner — no ownership transfer, no TOS violation. You get a managed browser session, not the account itself. See our full comparison at linkedvelocity.com/vs/buying-linkedin-accounts.",
  },
  {
    q: "Can I rent multiple accounts at the same time?",
    a: "Yes, there's no limit. Many teams rent 5-20+ accounts to run parallel outreach campaigns across different industries, geographies, or client engagements.",
  },
  {
    q: "What happens if I cancel?",
    a: "Your rental ends at the current billing period. No cancellation fees, no penalties. The account returns to the marketplace for other renters.",
  },
  {
    q: "Do some accounts include Sales Navigator?",
    a: "Yes. Filter for Sales Navigator accounts in the catalogue. These accounts let you use LinkedIn's advanced lead filtering, saved searches, and InMail credits.",
  },
];

export default function RentLinkedInAccountsPage() {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://linkedvelocity.com" },
      { "@type": "ListItem", position: 2, name: "Rent LinkedIn Accounts", item: "https://linkedvelocity.com/rent-linkedin-accounts" },
    ],
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "LinkedIn Account Rental",
    serviceType: "LinkedIn Account Rental Service",
    provider: {
      "@type": "Organization",
      name: "LinkedVelocity",
      url: "https://linkedvelocity.com",
    },
    description:
      "Rent pre-warmed, verified LinkedIn accounts for B2B outreach and lead generation. Includes GoLogin anti-detect browser access and dedicated residential proxy. From $10/month, cancel anytime.",
    areaServed: { "@type": "Place", name: "Worldwide" },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "LinkedIn Account Rentals",
      itemListElement: [
        {
          "@type": "Offer",
          name: "Basic LinkedIn Account Rental",
          description: "500-1,000 connections, GoLogin browser, dedicated proxy",
          price: "10",
          priceCurrency: "USD",
          priceSpecification: { "@type": "UnitPriceSpecification", price: "10", priceCurrency: "USD", billingDuration: "P1M" },
        },
        {
          "@type": "Offer",
          name: "Standard LinkedIn Account Rental",
          description: "1,000-5,000 connections, GoLogin browser, dedicated proxy",
          price: "25",
          priceCurrency: "USD",
          priceSpecification: { "@type": "UnitPriceSpecification", price: "25", priceCurrency: "USD", billingDuration: "P1M" },
        },
        {
          "@type": "Offer",
          name: "Premium LinkedIn Account Rental",
          description: "5,000+ connections, Sales Navigator, GoLogin browser, dedicated proxy, priority support",
          price: "75",
          priceCurrency: "USD",
          priceSpecification: { "@type": "UnitPriceSpecification", price: "75", priceCurrency: "USD", billingDuration: "P1M" },
        },
      ],
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      bestRating: "5",
      ratingCount: "237",
    },
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
      <style>{`
        :root{
          --bg:#FAFAF8;--surface:#FFFFFF;--surface-alt:#F3F2EE;--text:#0F1419;--text-mid:#536471;--text-light:#8899A6;--border:#E8E6E1;
          --blue:#0A66C2;--blue-dark:#004182;--blue-light:#E8F1FA;--green:#00B85C;--green-dark:#007A3D;--green-light:#E6F9EE;
          --radius:10px;--radius-lg:16px;
        }
        body{font-family:'Karla','Montserrat',system-ui,sans-serif;color:var(--text);background:var(--bg);-webkit-font-smoothing:antialiased}
        h1,h2,h3,h4{font-family:'Montserrat','Karla',system-ui,sans-serif;font-weight:600;letter-spacing:-0.02em}
        .rent-page{max-width:1100px;margin:0 auto;padding:64px 40px 120px}
        .rent-crumb{font-size:13px;color:var(--text-light);margin-bottom:24px}
        .rent-crumb a{color:var(--text-light);text-decoration:none}
        .rent-crumb a:hover{color:var(--text)}
        .rent-header{max-width:800px;margin-bottom:48px}
        .rent-label{font-size:12px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:var(--blue);margin-bottom:12px}
        .rent-title{font-size:clamp(32px,4vw,52px);line-height:1.1;letter-spacing:-0.03em;margin-bottom:16px}
        .rent-subtitle{font-size:18px;color:var(--text-mid);line-height:1.65;margin-bottom:24px}
        .rent-stats{display:flex;gap:24px;flex-wrap:wrap;margin-bottom:12px}
        .rent-stat{display:flex;align-items:baseline;gap:6px}
        .rent-stat-num{font-size:24px;font-weight:700;color:var(--text);font-family:'Montserrat',sans-serif}
        .rent-stat-label{font-size:13px;color:var(--text-mid)}
        .rent-cta{display:inline-flex;align-items:center;gap:8px;padding:16px 32px;border-radius:var(--radius);background:var(--blue);color:#fff;font-size:16px;font-weight:600;text-decoration:none;transition:background .2s}
        .rent-cta:hover{background:var(--blue-dark)}
        .rent-cta-row{display:flex;gap:12px;flex-wrap:wrap;margin-top:28px}
        .rent-cta-secondary{display:inline-flex;align-items:center;gap:8px;padding:16px 32px;border-radius:var(--radius);background:#fff;color:var(--text);font-size:16px;font-weight:600;text-decoration:none;border:1px solid var(--border);transition:border-color .2s}
        .rent-cta-secondary:hover{border-color:var(--text)}
        .rent-section{margin-top:72px;padding-top:48px;border-top:1px solid var(--border)}
        .rent-section-title{font-size:clamp(24px,2.5vw,32px);margin-bottom:12px}
        .rent-section-lede{font-size:15px;color:var(--text-mid);line-height:1.7;margin-bottom:32px;max-width:720px}
        .rent-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}
        .rent-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px 28px}
        .rent-card h3{font-size:17px;margin:0 0 8px}
        .rent-card p{font-size:14px;color:var(--text-mid);line-height:1.65;margin:0}
        .rent-pricing{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;margin-bottom:32px}
        .rent-pricing table{width:100%;border-collapse:collapse;font-size:14px}
        .rent-pricing th{text-align:left;padding:14px 20px;background:var(--surface-alt);font-size:12px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;color:var(--text-mid);border-bottom:1px solid var(--border)}
        .rent-pricing td{padding:14px 20px;border-bottom:1px solid var(--border);line-height:1.5}
        .rent-pricing tr:last-child td{border-bottom:none}
        .rent-steps{display:flex;flex-direction:column;gap:0;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden}
        .rent-step{display:grid;grid-template-columns:56px 1fr;gap:20px;padding:24px 28px;border-bottom:1px solid var(--border)}
        .rent-step:last-child{border-bottom:none}
        .rent-step-num{width:36px;height:36px;border-radius:10px;background:var(--blue-light);color:var(--blue);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;font-family:'Montserrat',sans-serif}
        .rent-step h3{font-size:17px;margin:0 0 6px;font-weight:600}
        .rent-step p{font-size:14px;color:var(--text-mid);line-height:1.65;margin:0}
        .rent-usecase{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px 28px;margin-bottom:16px}
        .rent-usecase h3{font-size:17px;margin:0 0 8px}
        .rent-usecase p{font-size:14px;color:var(--text-mid);line-height:1.65;margin:0}
        .rent-faq{margin-bottom:10px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:18px 22px}
        .rent-faq summary{font-weight:600;font-size:15px;cursor:pointer;color:var(--text);list-style:none}
        .rent-faq summary::-webkit-details-marker{display:none}
        .rent-faq summary::after{content:'+';float:right;color:var(--text-light);font-weight:400}
        .rent-faq[open] summary::after{content:'−'}
        .rent-faq p{margin:14px 0 0;font-size:14px;color:var(--text-mid);line-height:1.7}
        .rent-bottom-cta{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:40px 32px;text-align:center;margin-top:64px}
        .rent-bottom-cta h2{font-size:28px;margin:0 0 8px}
        .rent-bottom-cta p{font-size:15px;color:var(--text-mid);margin:0 0 24px}
        .rent-long p{font-size:15px;color:var(--text-mid);line-height:1.75;margin:0 0 16px;max-width:760px}
        .rent-long h2{font-size:22px;margin:32px 0 12px}
        .rent-long h2:first-child{margin-top:0}
        @media(max-width:700px){
          .rent-page{padding:32px 16px 80px}
          .rent-grid{grid-template-columns:1fr}
          .rent-step{grid-template-columns:40px 1fr;gap:14px;padding:18px 18px}
          .rent-step-num{width:28px;height:28px;font-size:13px;border-radius:8px}
          .rent-pricing table{font-size:13px}
          .rent-pricing th,.rent-pricing td{padding:10px 12px}
        }
      `}</style>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="rent-page">
        <div className="rent-crumb">
          <Link href="/">Home</Link> · Rent LinkedIn Accounts
        </div>

        <header className="rent-header">
          <div className="rent-label">LinkedIn account rental</div>
          <h1 className="rent-title">Rent LinkedIn accounts for outreach and lead generation</h1>
          <p className="rent-subtitle">
            LinkedVelocity is the marketplace for renting pre-warmed, verified LinkedIn accounts.
            Growth teams, agencies, and SDRs use LinkedVelocity to scale LinkedIn outreach without
            getting their primary accounts restricted. Plans start at $10/month with instant
            access via GoLogin anti-detect browser.
          </p>

          <div className="rent-stats">
            <div className="rent-stat">
              <span className="rent-stat-num">847</span>
              <span className="rent-stat-label">accounts available</span>
            </div>
            <div className="rent-stat">
              <span className="rent-stat-num">0%</span>
              <span className="rent-stat-label">restriction rate</span>
            </div>
            <div className="rent-stat">
              <span className="rent-stat-num">237</span>
              <span className="rent-stat-label">teams using LinkedVelocity</span>
            </div>
          </div>

          <div className="rent-cta-row">
            <Link href="/catalogue" className="rent-cta">Browse Available Accounts →</Link>
            <Link href="/how-it-works" className="rent-cta-secondary">How It Works</Link>
          </div>
        </header>

        {/* What you get */}
        <section className="rent-section">
          <h2 className="rent-section-title">What you get with every rental</h2>
          <p className="rent-section-lede">
            Every rented LinkedIn account includes an isolated GoLogin browser profile,
            a dedicated residential proxy, and full compatibility with any LinkedIn
            automation tool. No passwords to manage, no setup wizard.
          </p>
          <div className="rent-grid">
            {benefits.map((b) => (
              <div className="rent-card" key={b.title}>
                <h3>{b.title}</h3>
                <p>{b.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section className="rent-section">
          <h2 className="rent-section-title">Pricing</h2>
          <p className="rent-section-lede">
            Accounts are priced based on connection count, industry, account age, and
            Sales Navigator availability. All plans are monthly — cancel anytime.
          </p>
          <div className="rent-pricing">
            <table>
              <thead>
                <tr>
                  <th>Tier</th>
                  <th>Connections</th>
                  <th>Price</th>
                  <th>Includes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Basic</strong></td>
                  <td>500 – 1,000</td>
                  <td>$10 – 25/mo</td>
                  <td>GoLogin browser, residential proxy, support</td>
                </tr>
                <tr>
                  <td><strong>Standard</strong></td>
                  <td>1,000 – 5,000</td>
                  <td>$25 – 75/mo</td>
                  <td>GoLogin browser, residential proxy, support</td>
                </tr>
                <tr>
                  <td><strong>Premium</strong></td>
                  <td>5,000+ or Sales Nav</td>
                  <td>$75 – 500/mo</td>
                  <td>GoLogin browser, residential proxy, priority support</td>
                </tr>
              </tbody>
            </table>
          </div>
          <Link href="/catalogue" className="rent-cta">Browse & Compare Accounts →</Link>
        </section>

        {/* How to rent */}
        <section className="rent-section">
          <h2 className="rent-section-title">How to rent a LinkedIn account</h2>
          <p className="rent-section-lede">
            From browsing to sending your first message — the whole process takes under 10 minutes.
          </p>
          <div className="rent-steps">
            {[
              { name: "Browse the catalogue", text: "Filter accounts by industry, connection count, geography, and Sales Navigator status. Every listing shows price, stats, and current availability." },
              { name: "Select and check out", text: "Add one or more accounts to your cart. Pay monthly via Stripe (credit card) or USDC (crypto on Base network). No upfront fees, no contracts." },
              { name: "Open your account in GoLogin", text: "Each rented account's browser profile is shared straight to your own GoLogin account. Each account is its own isolated GoLogin browser profile." },
              { name: "Open and start outreach", text: "Click the account to open a real Chrome session. Install Dripify, Expandi, Linked Helper, or any extension. Send connection requests and messages the same day." },
            ].map((s, i) => (
              <div className="rent-step" key={s.name}>
                <div className="rent-step-num">{i + 1}</div>
                <div>
                  <h3>{s.name}</h3>
                  <p>{s.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Use cases */}
        <section className="rent-section">
          <h2 className="rent-section-title">Who rents LinkedIn accounts</h2>
          <p className="rent-section-lede">
            Teams across B2B sales, recruitment, and lead generation use LinkedVelocity to
            scale LinkedIn outreach beyond single-account limits.
          </p>
          {useCases.map((uc) => (
            <div className="rent-usecase" key={uc.title}>
              <h3>{uc.title}</h3>
              <p>{uc.text}</p>
            </div>
          ))}
        </section>

        {/* Why renting beats buying */}
        <section className="rent-section rent-long">
          <h2 className="rent-section-title">Why renting LinkedIn accounts is better than buying</h2>
          <p>
            Buying LinkedIn accounts violates LinkedIn&apos;s User Agreement (Section 8.2),
            which explicitly prohibits the sale or transfer of accounts. When LinkedIn detects
            a sold account — usually via login location, browser fingerprint, or device
            changes — they permanently restrict it. The buyer loses both the account and
            whatever they paid, with no recourse.
          </p>
          <p>
            Renting through LinkedVelocity avoids this entirely. The account stays with its original
            owner. The renter gets a managed browser session through GoLogin, with a unique
            fingerprint and dedicated residential proxy. From LinkedIn&apos;s perspective,
            it&apos;s the same person logging in from their usual location.
          </p>
          <p>
            The cost math also favours renting. A $500 bought account that gets banned after
            six weeks costs ~$80/week. A comparable LinkedVelocity rental at $50/month costs ~$12/week,
            with no upfront risk and no account-death cliff. And if outreach doesn&apos;t work
            for your use case, you simply cancel.
          </p>
          <div className="rent-cta-row" style={{ marginTop: 24 }}>
            <Link href="/vs/buying-linkedin-accounts" className="rent-cta-secondary">Full Comparison: Renting vs Buying →</Link>
          </div>
        </section>

        {/* FAQs */}
        <section className="rent-section">
          <h2 className="rent-section-title">Frequently asked questions</h2>
          {faqs.map((f) => (
            <details className="rent-faq" key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </section>

        {/* Bottom CTA */}
        <div className="rent-bottom-cta">
          <h2>Ready to scale your LinkedIn outreach?</h2>
          <p>Browse 847+ verified accounts. Filter by industry, connections, and Sales Navigator. No commitment.</p>
          <div className="rent-cta-row" style={{ justifyContent: "center" }}>
            <Link href="/catalogue" className="rent-cta">Browse Available Accounts →</Link>
            <Link href="/become-ambassador" className="rent-cta-secondary">Earn From Your Account</Link>
          </div>
        </div>
      </div>
    </>
  );
}
