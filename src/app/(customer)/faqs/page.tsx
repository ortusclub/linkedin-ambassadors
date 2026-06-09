import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQs — LinkedIn Account Rental Questions Answered",
  description:
    "Common questions about renting LinkedIn accounts on LinkedVelocity, and about earning as an ambassador — safety, pricing, payouts, and more.",
  alternates: { canonical: "/faqs" },
  openGraph: {
    title: "Frequently Asked Questions | LinkedVelocity",
    description:
      "Everything you need to know about renting LinkedIn accounts safely and earning as an ambassador.",
    url: "https://linkedvelocity.com/faqs",
  },
};

const RENTER_FAQS = [
  {
    q: "What is LinkedVelocity?",
    a: "A marketplace where growth teams rent verified, pre-warmed LinkedIn accounts for outreach — and professionals earn by sharing accounts they no longer actively use.",
  },
  {
    q: "How does renting work?",
    a: "Browse the catalogue, rent a profile monthly, and open it in a secure browser. You're running outreach from an established account in minutes — no warm-up period.",
  },
  {
    q: "Will a rented account get restricted?",
    a: "No. Every session runs through an anti-detect browser with a dedicated proxy and isolated fingerprint, so LinkedIn sees one consistent user. We've maintained a 0% restriction rate across the platform.",
  },
  {
    q: "What tools can I use with a rented account?",
    a: "Any Chrome extension or LinkedIn automation tool — Dripify, Expandi, Linked Helper and others all work inside the browser session.",
  },
  {
    q: "How am I charged, and can I cancel?",
    a: "A flat monthly fee per account, paid by card (Stripe) or USDC. No contracts — cancel anytime and the account is freed up immediately.",
  },
];

const AMBASSADOR_FAQS = [
  {
    q: "How much can I earn as an ambassador?",
    a: "$10–$500 per account per month, based on connection count, industry, and account age — paid guaranteed on the 1st of every month, whether or not your account is rented.",
  },
  {
    q: "Will sharing my account affect it?",
    a: "No. Access is proxy-protected and human-paced within LinkedIn's limits, so your profile stays safe. Real, established accounts used for normal outreach don't get flagged.",
  },
  {
    q: "Can I still use my account while it's shared?",
    a: "Yes. Simultaneous access means you and the renter can both be logged in at the same time, with no conflicts or session clashes.",
  },
  {
    q: "Will renters change my profile?",
    a: "Never. Your name, photo, and headline stay exactly as they are. The account is used only for connection requests and messaging — no profile edits allowed.",
  },
  {
    q: "When and how do I get paid?",
    a: "On the 1st of every month, via USDC (crypto) by default. Prefer PayPal or Wise? Just let us know during onboarding.",
  },
  {
    q: "Can I stop anytime?",
    a: "Yes — you can withdraw your account whenever you like. There's no lock-in and no penalties.",
  },
];

export default function FAQsPage() {
  return (
    <>
      <style>{`
        :root{
          --bg:#FAFAF8;--surface:#FFFFFF;--surface-alt:#F3F2EE;--text:#0F1419;--text-mid:#536471;--text-light:#8899A6;--border:#E8E6E1;
          --blue:#0A66C2;--blue-dark:#004182;--blue-light:#E8F1FA;--green:#00B85C;--green-dark:#007A3D;--green-light:#E6F9EE;
          --accent:#1D1B16;--radius:10px;--radius-lg:16px;--radius-xl:24px;
        }
        body{font-family:'Karla','Montserrat',system-ui,sans-serif;color:var(--text);background:var(--bg);-webkit-font-smoothing:antialiased}
        h1,h2,h3{font-family:'Montserrat','Karla',system-ui,sans-serif;letter-spacing:-0.02em}
        .faq-page{max-width:820px;margin:0 auto;padding:80px 24px 100px}
        .faq-header{text-align:center;margin-bottom:36px}
        .faq-label{font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--blue);margin-bottom:12px}
        .faq-title{font-size:clamp(30px,3.5vw,44px);line-height:1.12;letter-spacing:-0.03em;margin-bottom:14px;font-weight:800}
        .faq-subtitle{font-size:16px;color:var(--text-mid);line-height:1.6;max-width:520px;margin:0 auto}
        .faq-group{margin-top:44px}
        .faq-grouplabel{font-size:12px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:6px}
        .faq-group.renter .faq-grouplabel{color:var(--blue)}
        .faq-group.amb .faq-grouplabel{color:var(--green-dark)}
        .faq-group h2{font-size:24px;font-weight:700;margin-bottom:8px}
        .faq-q{border-bottom:1px solid var(--border)}
        .faq-q summary{display:flex;align-items:center;justify-content:space-between;gap:16px;cursor:pointer;list-style:none;padding:18px 2px;font-weight:700;font-size:16px;color:var(--text)}
        .faq-q summary::-webkit-details-marker{display:none}
        .faq-q .plus{font-size:24px;line-height:1;flex-shrink:0;transition:transform .2s ease}
        .faq-group.renter .faq-q .plus{color:var(--blue)}
        .faq-group.amb .faq-q .plus{color:var(--green)}
        .faq-q[open] .plus{transform:rotate(45deg)}
        .faq-q p{font-size:14.5px;color:var(--text-mid);line-height:1.7;padding:0 2px 18px;margin:0;max-width:680px}
        .faq-cta{text-align:center;margin-top:56px;padding-top:40px;border-top:1px solid var(--border)}
        .faq-cta p{font-size:16px;color:var(--text-mid);margin-bottom:20px}
        .faq-cta-actions{display:inline-flex;gap:12px;flex-wrap:wrap;justify-content:center}
        .faq-cta-btn{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;border-radius:var(--radius);background:var(--blue);color:#fff;font-size:15px;font-weight:700;text-decoration:none;transition:all .2s;border:none;cursor:pointer}
        .faq-cta-btn:hover{background:var(--blue-dark);transform:translateY(-1px);box-shadow:0 8px 24px rgba(10,102,194,0.2)}
        .faq-cta-btn-alt{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;border-radius:var(--radius);background:#fff;color:var(--text);font-size:15px;font-weight:700;text-decoration:none;transition:all .2s;border:1px solid var(--border);cursor:pointer}
        .faq-cta-btn-alt:hover{border-color:var(--accent);transform:translateY(-1px)}
        @media(max-width:900px){.faq-page{padding:48px 16px 80px}}
      `}</style>

      <div className="faq-page">
        <div className="faq-header">
          <div className="faq-label">Frequently asked questions</div>
          <h1 className="faq-title">Questions, answered</h1>
          <p className="faq-subtitle">Renting a profile or sharing yours? Here&apos;s everything you need to know.</p>
        </div>

        <div className="faq-group renter">
          <div className="faq-grouplabel">For renters</div>
          <h2>Renting an account</h2>
          {RENTER_FAQS.map((f, i) => (
            <details key={i} className="faq-q">
              <summary>{f.q}<span className="plus">+</span></summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>

        <div className="faq-group amb">
          <div className="faq-grouplabel">For ambassadors</div>
          <h2>Sharing your account</h2>
          {AMBASSADOR_FAQS.map((f, i) => (
            <details key={i} className="faq-q">
              <summary>{f.q}<span className="plus">+</span></summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>

        <div className="faq-cta">
          <p>Still have questions? We&apos;re happy to help.</p>
          <div className="faq-cta-actions">
            <a href="https://t.me/linkedvelocity_support_bot" target="_blank" rel="noopener noreferrer" className="faq-cta-btn">Chat with us on Telegram →</a>
            <a href="https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ1he_qAS5s8faJzrAIjTJi8KIX9xvPhGbC4Ipn38lPTLzkfSuoyMIiqUrB0viY2jpXr_W_zLSdq" target="_blank" rel="noopener noreferrer" className="faq-cta-btn-alt">Book a Meeting →</a>
          </div>
        </div>
      </div>
    </>
  );
}
