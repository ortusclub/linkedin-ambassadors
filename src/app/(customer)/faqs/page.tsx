import Link from "next/link";

export default function FAQsPage() {
  return (
    <>
      <style>{`
        :root{
          --bg:#FAFAF8;--surface:#FFFFFF;--surface-alt:#F3F2EE;--text:#0F1419;--text-mid:#536471;--text-light:#8899A6;--border:#E8E6E1;
          --blue:#0A66C2;--blue-dark:#004182;--blue-light:#E8F1FA;--green:#00B85C;--green-dark:#007A3D;--green-light:#E6F9EE;
          --accent:#1D1B16;--radius:10px;--radius-lg:16px;--radius-xl:24px;
        }
        body{font-family:'DM Sans','Instrument Sans',system-ui,sans-serif;color:var(--text);background:var(--bg);-webkit-font-smoothing:antialiased}
        h1,h2,h3,h4,h5{font-family:'Instrument Sans','DM Sans',system-ui,sans-serif;font-weight:600;letter-spacing:-0.02em}
        .faq-page{max-width:1200px;margin:0 auto;padding:80px 40px 120px}
        .faq-header{text-align:center;margin-bottom:64px}
        .faq-label{font-size:12px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:var(--blue);margin-bottom:12px}
        .faq-title{font-size:clamp(28px,3.5vw,42px);line-height:1.15;letter-spacing:-0.03em;margin-bottom:16px}
        .faq-subtitle{font-size:16px;color:var(--text-mid);line-height:1.6;max-width:520px;margin:0 auto}
        .faq-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px}
        .faq-card{padding:28px;border-radius:var(--radius-lg);background:var(--surface);border:1px solid var(--border);transition:all .2s}
        .faq-card:hover{border-color:var(--blue);box-shadow:0 8px 24px rgba(10,102,194,0.06);transform:translateY(-2px)}
        .faq-card h4{font-size:16px;margin-bottom:10px;font-weight:600;color:var(--text)}
        .faq-card p{font-size:14px;color:var(--text-mid);line-height:1.7}
        .faq-cta{text-align:center;margin-top:64px}
        .faq-cta p{font-size:16px;color:var(--text-mid);margin-bottom:20px}
        .faq-cta-btn{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;border-radius:var(--radius);background:var(--blue);color:#fff;font-size:15px;font-weight:600;text-decoration:none;transition:all .2s;border:none;cursor:pointer}
        .faq-cta-btn:hover{background:var(--blue-dark);transform:translateY(-1px);box-shadow:0 8px 24px rgba(10,102,194,0.2)}
        @media(max-width:900px){
          .faq-page{padding:48px 16px 80px}
          .faq-grid{grid-template-columns:1fr}
        }
      `}</style>

      <div className="faq-page">
        <div className="faq-header">
          <div className="faq-label">Frequently asked questions</div>
          <h1 className="faq-title">Everything you need to know</h1>
          <p className="faq-subtitle">Got questions about renting or sharing LinkedIn accounts? We&apos;ve got answers.</p>
        </div>

        <div className="faq-grid">
          <div className="faq-card">
            <h4>What is Klabber?</h4>
            <p>Klabber is a marketplace where growth teams can rent verified LinkedIn accounts for outreach, and professionals can earn passive income by sharing accounts they no longer actively use.</p>
          </div>
          <div className="faq-card">
            <h4>Will my LinkedIn account get restricted?</h4>
            <p>No. Every session runs through GoLogin&apos;s anti-detect browser with dedicated proxies, fingerprint isolation, and shared cookie environments. We&apos;ve maintained a 0% restriction rate across all accounts on the platform.</p>
          </div>
          <div className="faq-card">
            <h4>Can I still use my account while it&apos;s rented?</h4>
            <p>Yes. GoLogin allows simultaneous access, so you and the renter can use the account at the same time without conflicts or session clashes.</p>
          </div>
          <div className="faq-card">
            <h4>How much can I earn as an ambassador?</h4>
            <p>Ambassadors earn between $10 and $500 per month per account, depending on connection count, industry, and account age. Payments are guaranteed on the 1st of every month.</p>
          </div>
          <div className="faq-card">
            <h4>How are renters charged?</h4>
            <p>Renters pay a monthly subscription per account. You can pay with a credit card via Stripe or with USDC. Cancel anytime — no long-term contracts.</p>
          </div>
          <div className="faq-card">
            <h4>Will renters change my profile information?</h4>
            <p>No. Your name, photo, headline, and profile content stay exactly as they are. Renters only use the account for connection requests and messaging — no profile edits allowed.</p>
          </div>
          <div className="faq-card">
            <h4>What tools work with rented accounts?</h4>
            <p>Any Chrome extension or LinkedIn automation tool works — including Dripify, Expandi, Linked Helper, and others. The GoLogin browser session supports all standard extensions.</p>
          </div>
          <div className="faq-card">
            <h4>How do ambassador payouts work?</h4>
            <p>Payouts are sent on the 1st of every month via USDC (crypto) by default. If you prefer bank transfer, PayPal, or Wise, just let us know during onboarding.</p>
          </div>
        </div>

        <div className="faq-cta">
          <p>Still have questions? We&apos;re happy to help.</p>
          <a href="https://t.me/klabber_support_bot" target="_blank" rel="noopener noreferrer" className="faq-cta-btn">Chat with us on Telegram →</a>
        </div>
      </div>
    </>
  );
}
