import Link from "next/link";
import type { Metadata } from "next";
import { Montserrat, Karla } from "next/font/google";

const heading = Montserrat({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-heading" });
const body = Karla({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "Renter Guide — How it works & using LinkedIn safely | LinkedVelocity",
  description: "Everything you need to rent a LinkedIn account on LinkedVelocity: setting up GoLogin, daily limits, what to expect, do's & don'ts, and using your rented account safely.",
};

const STEPS = [
  { n: "1", title: "Sign up & browse the catalogue", body: "Create your account on linkedvelocity.com and browse available profiles. Each listing shows the account's location, connection count, and industry." },
  { n: "2", title: "Select an account & pay", body: "Choose the account that fits your target audience and pay securely (card or wallet). The account is reserved for you and you'll get a confirmation email straight away." },
  { n: "3", title: "Download & set up GoLogin", body: "GoLogin is the tool that gives you secure access to the rented account. Create it with the same email you used here (steps below) so we can share the profile to you." },
  { n: "4", title: "We prepare & share it (within 24h)", body: "Our team verifies the account and frees it for you, then shares the profile to your GoLogin. You'll get a 'your account is ready' email — sharing can take a few minutes to appear." },
  { n: "5", title: "Run your outreach campaign", body: "You're live! Open the profile in GoLogin (LinkedIn already logged in) and start sending connection requests and messages. Stay within the daily limits below to keep the account healthy." },
  { n: "6", title: "Renew or cancel", body: "Accounts renew monthly. You'll get a reminder before your next billing date — cancel any time before renewal if you no longer need the account." },
];

const LIMITS = [
  { activity: "Connection requests", limit: "20–30 per day maximum" },
  { activity: "Messages to connections", limit: "50–80 per day" },
  { activity: "Profile views", limit: "Keep natural — don't bulk view hundreds at once" },
  { activity: "InMail messages", limit: "Use sparingly — only to 2nd/3rd degree connections" },
  { activity: "Endorsements / reactions", limit: "Keep minimal — focus on outreach only" },
];

const GET = [
  "A real, aged LinkedIn account with established connections and history",
  "Secure access through GoLogin's anti-detect browser — same proxy, cookies and fingerprint every time",
  "Simultaneous access (you and the owner never clash)",
  "Pause, resume and cancellation handled by us if anything comes up",
];

const DOS = [
  "Stay within the daily limits above.",
  "Keep messaging natural and personalised — avoid copy-paste spam.",
  "Target a relevant, specific audience for better results.",
  "Contact us immediately if you notice anything unusual on the account.",
  "Use GoLogin every time — no exceptions.",
  "Let us know your campaign goals so we can match you with the right account.",
];

const DONTS = [
  "Log into the account directly on LinkedIn.com or the LinkedIn app.",
  "Change any profile details — name, photo, headline, or about section.",
  "Connect with or message people the account owner knows personally.",
  "Use automation tools on top of the rented account.",
  "Share account access with anyone outside your immediate team.",
  "Send misleading, spammy, or inappropriate messages.",
];

const GOLOGIN_STEPS = [
  "Go to gologin.com and create a free account using the same email you registered with on LinkedVelocity.",
  "Download and install the GoLogin desktop app on your computer.",
  "Open the app and log in with your GoLogin account.",
  "Your rented profile will appear automatically in your dashboard — we share it directly to your account.",
  "Click 'Run' on the profile to open a browser session.",
  "The LinkedIn account loads automatically — you're now logged in securely.",
];

export default function GuidePage() {
  return (
    <div className={`${heading.variable} ${body.variable}`} style={{ fontFamily: "var(--font-body),system-ui,sans-serif", color: "#0F1419", background: "#FAFAF8" }}>
      <style>{`
        .g-h{font-family:var(--font-heading),system-ui,sans-serif;letter-spacing:-0.02em}
        .g-wrap{max-width:880px;margin:0 auto;padding:0 24px}
        .g-card{background:#fff;border:1px solid #E8E6E1;border-radius:16px;padding:24px 26px}
        .g-hl{color:#34d399}
        .g-limit-row{display:grid;grid-template-columns:1fr 1.4fr;gap:16px;padding:14px 0;border-bottom:1px solid #F0EFEB;font-size:14.5px}
        .g-limit-row:last-child{border-bottom:none}
        @media(max-width:680px){.g-grid{grid-template-columns:1fr !important}.g-limit-row{grid-template-columns:1fr;gap:2px}}
      `}</style>

      {/* Hero */}
      <section style={{ background: "radial-gradient(circle at 50% 14%,#103a6b 0%,#0B1A2E 64%)", color: "#fff", padding: "72px 24px 64px", textAlign: "center" }}>
        <div className="g-wrap">
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 600, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 999, padding: "6px 14px", marginBottom: 18 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#34d399" }} /> Renter guide
          </div>
          <h1 className="g-h" style={{ fontSize: "clamp(32px,5vw,48px)", fontWeight: 800, margin: "0 auto 14px", maxWidth: 660 }}>How renting works — and using LinkedIn <span className="g-hl">safely with us</span></h1>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.82)", maxWidth: 560, margin: "0 auto", lineHeight: 1.6 }}>Everything you need to get started, run your first campaign, and keep your rented account healthy. Give it a read before you begin.</p>
        </div>
      </section>

      {/* What is LinkedVelocity */}
      <section style={{ padding: "56px 0 0" }}>
        <div className="g-wrap">
          <h2 className="g-h" style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>What is LinkedVelocity?</h2>
          <p style={{ fontSize: 15.5, color: "#374151", lineHeight: 1.7, margin: "0 0 12px" }}>
            LinkedVelocity is a B2B marketplace that gives your sales team access to additional LinkedIn accounts — so you can run outreach at greater scale without creating new profiles or hiring more people.
          </p>
          <p style={{ fontSize: 15.5, color: "#374151", lineHeight: 1.7, margin: 0 }}>
            You rent access to a real, established LinkedIn profile and use it to send connection requests and messages to your target audience. Simple as that.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section style={{ padding: "48px 0 0" }}>
        <div className="g-wrap">
          <h2 className="g-h" style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>How it works, start to finish</h2>
          <div style={{ display: "grid", gap: 14 }}>
            {STEPS.map((s) => (
              <div key={s.n} className="g-card" style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
                <div className="g-h" style={{ flex: "0 0 40px", width: 40, height: 40, borderRadius: 11, background: "linear-gradient(135deg,#0A66C2,#004182)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16 }}>{s.n}</div>
                <div>
                  <h3 className="g-h" style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{s.title}</h3>
                  <p style={{ fontSize: 15, color: "#536471", lineHeight: 1.6, margin: 0 }}>{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GoLogin setup */}
      <section style={{ padding: "48px 0 0" }}>
        <div className="g-wrap">
          <div className="g-card" style={{ background: "#F3F8FE", borderColor: "#D6E3F2" }}>
            <h2 className="g-h" style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: "#0A66C2" }}>Setting up GoLogin</h2>
            <p style={{ fontSize: 15, color: "#374151", lineHeight: 1.7, margin: "0 0 16px" }}>
              GoLogin is what lets you securely access the rented account without triggering any flags — LinkedIn always sees one consistent device, proxy and fingerprint. <strong>Use the same email you registered with on LinkedVelocity</strong> — that&apos;s how we share your rented profile directly to your account.
            </p>
            <ol style={{ fontSize: 15, color: "#374151", lineHeight: 1.85, margin: "0 0 18px", paddingLeft: 20 }}>
              {GOLOGIN_STEPS.map((s) => <li key={s}>{s}</li>)}
            </ol>
            <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 10, padding: "12px 14px", marginBottom: 18, fontSize: 14, color: "#9A3412", lineHeight: 1.6 }}>
              <strong>Important:</strong> Always access the account through GoLogin. Never log in directly on linkedin.com or the LinkedIn phone app — this can trigger a security flag on the account.
            </div>
            <a href="https://gologin.com/download" target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", background: "#0A66C2", color: "#fff", textDecoration: "none", fontWeight: 600, fontSize: 14, padding: "12px 22px", borderRadius: 10 }}>Download GoLogin</a>
          </div>
        </div>
      </section>

      {/* Daily limits */}
      <section style={{ padding: "48px 0 0" }}>
        <div className="g-wrap">
          <h2 className="g-h" style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Daily limits — keep the account safe</h2>
          <p style={{ fontSize: 15, color: "#536471", lineHeight: 1.6, margin: "0 0 20px", maxWidth: 620 }}>LinkedIn monitors account activity closely. Stay within these limits to avoid restrictions.</p>
          <div className="g-card">
            <div className="g-limit-row g-h" style={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "#8899A6" }}>
              <div>Activity</div><div>Recommended daily limit</div>
            </div>
            {LIMITS.map((l) => (
              <div key={l.activity} className="g-limit-row">
                <div style={{ fontWeight: 600 }}>{l.activity}</div>
                <div style={{ color: "#536471" }}>{l.limit}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What you get */}
      <section style={{ padding: "48px 0 0" }}>
        <div className="g-wrap">
          <h2 className="g-h" style={{ fontSize: 28, fontWeight: 700, marginBottom: 20 }}>What you get</h2>
          <div className="g-card">
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
              {GET.map((g) => (
                <li key={g} style={{ display: "flex", gap: 12, alignItems: "flex-start", fontSize: 15, color: "#374151", lineHeight: 1.5 }}>
                  <span style={{ flex: "0 0 20px", width: 20, height: 20, borderRadius: "50%", background: "#E6F9EE", color: "#00B85C", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, marginTop: 1 }}>✓</span>
                  {g}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Do's & Don'ts */}
      <section style={{ padding: "48px 0 0" }}>
        <div className="g-wrap">
          <h2 className="g-h" style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Do&apos;s and don&apos;ts</h2>
          <p style={{ fontSize: 15, color: "#536471", lineHeight: 1.6, margin: "0 0 24px", maxWidth: 620 }}>These accounts belong to real people who trust us with them. Following these keeps the account healthy — and keeps your access uninterrupted.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="g-grid">
            <div className="g-card">
              <h3 className="g-h" style={{ fontSize: 17, fontWeight: 700, marginBottom: 12, color: "#00B85C" }}>✅ Do</h3>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
                {DOS.map((d) => (
                  <li key={d} style={{ display: "flex", gap: 10, fontSize: 14, color: "#374151", lineHeight: 1.5 }}>
                    <span style={{ color: "#00B85C", fontWeight: 800 }}>✓</span>{d}
                  </li>
                ))}
              </ul>
            </div>
            <div className="g-card">
              <h3 className="g-h" style={{ fontSize: 17, fontWeight: 700, marginBottom: 12, color: "#DC2626" }}>❌ Don&apos;t</h3>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
                {DONTS.map((d) => (
                  <li key={d} style={{ display: "flex", gap: 10, fontSize: 14, color: "#374151", lineHeight: 1.5 }}>
                    <span style={{ color: "#DC2626", fontWeight: 800 }}>✕</span>{d}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* If something goes wrong */}
      <section style={{ padding: "48px 0 0" }}>
        <div className="g-wrap">
          <div className="g-card" style={{ background: "#FEF2F2", borderColor: "#FECACA" }}>
            <h2 className="g-h" style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: "#B91C1C" }}>If something goes wrong</h2>
            <p style={{ fontSize: 15, color: "#374151", lineHeight: 1.7, margin: "0 0 12px" }}>
              If the account gets flagged or restricted, or you notice unusual activity — <strong>contact us on Telegram immediately</strong> (<a href="https://t.me/klabber_support_bot" target="_blank" rel="noopener noreferrer" style={{ color: "#B91C1C", fontWeight: 700 }}>@klabber_support_bot</a>). Don&apos;t try to fix it yourself.
            </p>
            <p style={{ fontSize: 15, color: "#374151", lineHeight: 1.7, margin: "0 0 12px" }}>
              We stay in direct contact with all account owners so we can resolve issues quickly. In most cases we can recover a flagged account or provide a replacement.
            </p>
            <p style={{ fontSize: 15, color: "#374151", lineHeight: 1.7, margin: 0 }}>
              <strong>Never appeal a LinkedIn restriction yourself</strong> on a rented account. Always contact us first so we can coordinate with the owner directly.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing & billing */}
      <section style={{ padding: "48px 0 0" }}>
        <div className="g-wrap">
          <h2 className="g-h" style={{ fontSize: 28, fontWeight: 700, marginBottom: 20 }}>Pricing &amp; billing</h2>
          <div className="g-card">
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
              {[
                "Accounts are billed monthly from your start date.",
                "Payment is processed automatically (card via Stripe, or from your wallet balance).",
                "You'll receive a reminder before your renewal date.",
                "To cancel, turn off renewal (or notify us) at least 48 hours before your renewal date.",
                "Volume discounts available for 10+ accounts — contact us to discuss.",
              ].map((p) => (
                <li key={p} style={{ display: "flex", gap: 12, alignItems: "flex-start", fontSize: 15, color: "#374151", lineHeight: 1.5 }}>
                  <span style={{ flex: "0 0 6px", width: 6, height: 6, borderRadius: "50%", background: "#0A66C2", marginTop: 8 }} />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Need help / CTA */}
      <section style={{ padding: "48px 24px 80px" }}>
        <div className="g-wrap">
          <div className="g-card" style={{ textAlign: "center", padding: "40px 26px" }}>
            <h2 className="g-h" style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Need help?</h2>
            <p style={{ fontSize: 15, color: "#536471", margin: "0 0 6px", lineHeight: 1.6 }}>We&apos;re here to make sure your campaigns run smoothly. Reach out any time.</p>
            <p style={{ fontSize: 14, color: "#8899A6", margin: "0 0 22px" }}>Telegram <a href="https://t.me/klabber_support_bot" target="_blank" rel="noopener noreferrer" style={{ color: "#0A66C2", fontWeight: 700, textDecoration: "none" }}>@klabber_support_bot</a> &nbsp;·&nbsp; Response within a few hours during business hours</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/catalogue" style={{ background: "#0A66C2", color: "#fff", textDecoration: "none", fontWeight: 600, fontSize: 14, padding: "12px 22px", borderRadius: 10 }}>Browse accounts</Link>
              <Link href="/dashboard" style={{ background: "#F3F2EE", color: "#0F1419", textDecoration: "none", fontWeight: 600, fontSize: 14, padding: "12px 22px", borderRadius: 10 }}>Go to dashboard</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
