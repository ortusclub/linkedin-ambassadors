import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How It Works — Renting & Sharing LinkedIn Accounts",
  description:
    "Step-by-step guide to how LinkedVelocity works. Rent a verified, pre-warmed LinkedIn account in minutes with GoLogin browser access, or earn $10-500/month sharing an account you no longer use.",
  alternates: { canonical: "/how-it-works" },
  openGraph: {
    title: "How LinkedVelocity Works — Rent or Share LinkedIn Accounts",
    description:
      "Browse, rent, and access pre-warmed LinkedIn accounts in minutes. Or earn passive income by sharing accounts you no longer use.",
    url: "https://linkedvelocity.com/how-it-works",
  },
};

const renterSteps = [
  {
    name: "Browse the catalogue",
    text: "Open linkedvelocity.com/catalogue and filter by industry, connection count, geography, and Sales Navigator availability. Every account shows price, account stats, and current status.",
  },
  {
    name: "Select your account(s)",
    text: "Tick one or more accounts and proceed to checkout. You can rent a single account or bulk-rent across a multi-account campaign in one flow.",
  },
  {
    name: "Top up your balance",
    text: "Add funds to your wallet balance — pay by card via Stripe, or deposit USDC on Base network from any wallet. Your balance updates within seconds.",
  },
  {
    name: "Pay and confirm rental",
    text: "Rentals are monthly subscriptions and renew automatically. Cancel anytime from your dashboard with no penalty.",
  },
  {
    name: "Open your account in GoLogin",
    text: "Each rented account's browser profile is shared straight to your own GoLogin account, each as its own isolated profile with a dedicated residential proxy.",
  },
  {
    name: "Open and run your campaigns",
    text: "Click the account to open it as a real Chrome session. Install Dripify, Expandi, Linked Helper, or any other extension. Run connection, intro, and open-profile campaigns exactly as you would on your own account.",
  },
];

const ambassadorSteps = [
  {
    name: "Apply for valuation",
    text: "Visit linkedvelocity.com/become-ambassador, fill in your LinkedIn URL and contact details. We instantly value your account based on connections, industry, age, and Sales Navigator.",
  },
  {
    name: "Onboard the account",
    text: "Our team imports your account into a managed GoLogin profile with a dedicated proxy. Your password, recovery email, and 2FA stay yours — LinkedVelocity never owns the account.",
  },
  {
    name: "Get paid monthly",
    text: "Earn $10-$500 per month while the account is rented. Payouts go out on the 1st of every month via USDC by default, or PayPal / Wise / bank transfer on request.",
  },
  {
    name: "Cancel anytime",
    text: "Give 30 days notice and we offboard the account. You keep all your contacts, content, and connections — nothing changes on your profile.",
  },
];

export default function HowItWorksPage() {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://linkedvelocity.com" },
      { "@type": "ListItem", position: 2, name: "How It Works", item: "https://linkedvelocity.com/how-it-works" },
    ],
  };

  const renterHowTo = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to rent a LinkedIn account on LinkedVelocity",
    description:
      "Rent a pre-warmed, verified LinkedIn account for outreach in minutes. Each rental includes GoLogin browser access with a dedicated residential proxy.",
    totalTime: "PT10M",
    estimatedCost: { "@type": "MonetaryAmount", currency: "USD", value: "10" },
    supply: [{ "@type": "HowToSupply", name: "Email address" }, { "@type": "HowToSupply", name: "USDC or credit card for monthly payment" }],
    tool: [{ "@type": "HowToTool", name: "GoLogin account (Mac/Windows)" }],
    step: renterSteps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };

  const ambassadorHowTo = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to share a LinkedIn account and earn passive income on LinkedVelocity",
    description:
      "Submit your LinkedIn profile for instant valuation. Earn $10-500/month per account while keeping full ownership and ability to use the profile yourself.",
    totalTime: "PT5M",
    step: ambassadorSteps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };

  return (
    <>
      <style>{`
        :root{
          --bg:#FAFAF8;--surface:#FFFFFF;--surface-alt:#F3F2EE;--text:#0F1419;--text-mid:#536471;--text-light:#8899A6;--border:#E8E6E1;
          --blue:#0A66C2;--blue-dark:#004182;--blue-light:#E8F1FA;--green:#00B85C;--green-dark:#007A3D;--green-light:#E6F9EE;
          --accent:#1D1B16;--radius:10px;--radius-lg:16px;--radius-xl:24px;
        }
        body{font-family:'Karla','Montserrat',system-ui,sans-serif;color:var(--text);background:var(--bg);-webkit-font-smoothing:antialiased}
        h1,h2,h3,h4,h5{font-family:'Montserrat','Karla',system-ui,sans-serif;font-weight:600;letter-spacing:-0.02em}
        .hiw-page{max-width:1100px;margin:0 auto;padding:64px 40px 120px}
        .hiw-crumb{font-size:13px;color:var(--text-light);margin-bottom:24px}
        .hiw-crumb a{color:var(--text-light);text-decoration:none}
        .hiw-crumb a:hover{color:var(--text)}
        .hiw-header{margin-bottom:56px;max-width:760px}
        .hiw-label{font-size:12px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:var(--blue);margin-bottom:12px}
        .hiw-title{font-size:clamp(32px,4vw,52px);line-height:1.1;letter-spacing:-0.03em;margin-bottom:16px}
        .hiw-subtitle{font-size:18px;color:var(--text-mid);line-height:1.6}
        .hiw-section{margin-top:64px;padding-top:48px;border-top:1px solid var(--border)}
        .hiw-section:first-of-type{border-top:none;padding-top:0;margin-top:0}
        .hiw-section-header{display:flex;align-items:baseline;justify-content:space-between;gap:24px;flex-wrap:wrap;margin-bottom:32px}
        .hiw-section-header h2{font-size:clamp(24px,2.5vw,32px);margin:0}
        .hiw-section-tag{font-size:13px;color:var(--text-light);background:var(--surface-alt);padding:4px 12px;border-radius:100px}
        .hiw-section-lede{font-size:15px;color:var(--text-mid);line-height:1.7;margin-bottom:32px;max-width:720px}
        .hiw-steps{display:flex;flex-direction:column;gap:0;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden}
        .hiw-step{display:grid;grid-template-columns:56px 1fr;gap:20px;padding:24px 28px;border-bottom:1px solid var(--border)}
        .hiw-step:last-child{border-bottom:none}
        .hiw-step-num{width:36px;height:36px;border-radius:10px;background:var(--blue-light);color:var(--blue);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;font-family:'Montserrat',sans-serif}
        .hiw-step-num.green{background:var(--green-light);color:var(--green-dark)}
        .hiw-step-body h3{font-size:17px;margin:0 0 6px;font-weight:600}
        .hiw-step-body p{font-size:14px;color:var(--text-mid);line-height:1.65;margin:0}
        .hiw-cta-row{display:flex;gap:12px;margin-top:32px;flex-wrap:wrap}
        .hiw-btn-primary{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;border-radius:var(--radius);background:var(--blue);color:#fff;font-size:15px;font-weight:600;text-decoration:none;transition:all .2s}
        .hiw-btn-primary:hover{background:var(--blue-dark)}
        .hiw-btn-secondary{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;border-radius:var(--radius);background:#fff;color:var(--text);font-size:15px;font-weight:600;text-decoration:none;border:1px solid var(--border);transition:all .2s}
        .hiw-btn-secondary:hover{border-color:var(--text)}
        .hiw-note{background:var(--surface-alt);border-radius:var(--radius-lg);padding:24px 28px;margin-top:32px;font-size:14px;color:var(--text-mid);line-height:1.7}
        .hiw-note strong{color:var(--text)}
        @media(max-width:700px){
          .hiw-page{padding:32px 16px 80px}
          .hiw-step{grid-template-columns:40px 1fr;gap:14px;padding:18px 18px}
          .hiw-step-num{width:28px;height:28px;font-size:13px;border-radius:8px}
        }
      `}</style>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(renterHowTo) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ambassadorHowTo) }} />

      <div className="hiw-page">
        <div className="hiw-crumb">
          <Link href="/">Home</Link> · How It Works
        </div>

        <div className="hiw-header">
          <div className="hiw-label">How it works</div>
          <h1 className="hiw-title">Rent a LinkedIn account in minutes. Or earn from one you don&apos;t use.</h1>
          <p className="hiw-subtitle">
            LinkedVelocity is a two-sided marketplace. Growth teams rent pre-warmed, verified LinkedIn
            accounts for outreach. Professionals with dormant profiles earn $10-500/month while
            keeping full ownership. Here&apos;s exactly how each side works.
          </p>
        </div>

        <section className="hiw-section">
          <div className="hiw-section-header">
            <h2>For renters — growth teams, agencies, SDRs</h2>
            <span className="hiw-section-tag">~10 minutes end-to-end</span>
          </div>
          <p className="hiw-section-lede">
            Every rented account comes with its own GoLogin anti-detect browser profile and
            dedicated residential proxy. There&apos;s no password to manage, no verification step,
            no setup wizard. Click an account and you&apos;re in.
          </p>

          <div className="hiw-steps">
            {renterSteps.map((s, i) => (
              <div className="hiw-step" key={s.name}>
                <div className="hiw-step-num">{i + 1}</div>
                <div className="hiw-step-body">
                  <h3>{s.name}</h3>
                  <p>{s.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="hiw-cta-row">
            <Link href="/catalogue" className="hiw-btn-primary">Browse Available Accounts →</Link>
            <Link href="/faqs" className="hiw-btn-secondary">Renter FAQs</Link>
          </div>

          <div className="hiw-note">
            <strong>Why GoLogin matters.</strong> Each rented account runs in an isolated browser
            fingerprint with its own residential IP. To LinkedIn, the session looks identical to
            the original account holder logging in from their usual location — which is why
            LinkedVelocity has maintained a 0% restriction rate across all rentals.
          </div>
        </section>

        <section className="hiw-section">
          <div className="hiw-section-header">
            <h2>For ambassadors — professionals with unused accounts</h2>
            <span className="hiw-section-tag">$10-500 per account per month</span>
          </div>
          <p className="hiw-section-lede">
            If you have a LinkedIn account you don&apos;t actively use, LinkedVelocity turns it into a
            monthly income stream. You retain ownership, you&apos;re never locked out, and renters
            cannot change your profile content.
          </p>

          <div className="hiw-steps">
            {ambassadorSteps.map((s, i) => (
              <div className="hiw-step" key={s.name}>
                <div className="hiw-step-num green">{i + 1}</div>
                <div className="hiw-step-body">
                  <h3>{s.name}</h3>
                  <p>{s.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="hiw-cta-row">
            <Link href="/become-ambassador" className="hiw-btn-primary">Get Your Profile Valuation →</Link>
            <Link
              href="https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ1he_qAS5s8faJzrAIjTJi8KIX9xvPhGbC4Ipn38lPTLzkfSuoyMIiqUrB0viY2jpXr_W_zLSdq"
              className="hiw-btn-secondary"
            >
              Book a Meeting
            </Link>
          </div>

          <div className="hiw-note">
            <strong>You&apos;re not selling the account.</strong> LinkedVelocity never asks for ownership
            transfer, and LinkedIn&apos;s terms prohibit account sales — not shared browser
            sessions. Because you keep the credentials, you can revoke access at any time.
          </div>
        </section>
      </div>
    </>
  );
}
