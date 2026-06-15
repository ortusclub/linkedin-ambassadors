import Link from "next/link";
import type { Metadata } from "next";
import { Montserrat, Karla } from "next/font/google";

const heading = Montserrat({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-heading" });
const body = Karla({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "Renting Guide — How it works & using LinkedIn safely | LinkedVelocity",
  description: "How renting a LinkedIn account works on LinkedVelocity: setting up GoLogin, what to expect, and how to use your rented account safely.",
};

const STEPS = [
  {
    n: "1",
    title: "Rent an account",
    body: "Pick a verified account from the catalogue and pay by card or wallet. The account is reserved for you the moment you pay.",
  },
  {
    n: "2",
    title: "Set up GoLogin",
    body: "Download the free GoLogin app and create your account using the same email you signed up with. We can only share the account with the GoLogin account on that email.",
  },
  {
    n: "3",
    title: "We prepare it",
    body: "Our team verifies and prepares the account, then shares it to your GoLogin — usually within 24 hours. Sharing can take a few minutes to appear.",
  },
  {
    n: "4",
    title: "You're live",
    body: "You get a 'ready' email. Open the profile in GoLogin — LinkedIn is already logged in. Run your outreach for the rental period.",
  },
];

const GET = [
  "A real, aged LinkedIn account with established connections and history",
  "Secure access through GoLogin's anti-detect browser — same proxy, cookies and fingerprint every time",
  "Simultaneous access (you and the owner never clash)",
  "Pause, resume and cancellation handled by us if anything comes up",
];

const DOS = [
  "Use the account through GoLogin only — never log in from your normal browser or phone.",
  "Keep your outreach human-paced. Stay within LinkedIn's normal limits (~100 connection requests/week).",
  "Personalise your messages. Generic spam is what gets accounts flagged.",
  "Reach out to us early if anything looks off — a warning, a checkpoint, anything.",
];

const DONTS = [
  "Don't change the password, email, or profile details of the account.",
  "Don't run aggressive automation or scrapers that blast hundreds of actions an hour.",
  "Don't share your GoLogin access with anyone else.",
  "Don't post or message anything that violates LinkedIn's terms — it puts the account (and the owner) at risk.",
];

export default function GuidePage() {
  return (
    <div className={`${heading.variable} ${body.variable}`} style={{ fontFamily: "var(--font-body),system-ui,sans-serif", color: "#0F1419", background: "#FAFAF8" }}>
      <style>{`
        .g-h{font-family:var(--font-heading),system-ui,sans-serif;letter-spacing:-0.02em}
        .g-wrap{max-width:880px;margin:0 auto;padding:0 24px}
        .g-card{background:#fff;border:1px solid #E8E6E1;border-radius:16px;padding:24px 26px}
      `}</style>

      {/* Hero */}
      <section style={{ background: "radial-gradient(circle at 50% 14%,#103a6b 0%,#0B1A2E 64%)", color: "#fff", padding: "72px 24px 64px", textAlign: "center" }}>
        <div className="g-wrap">
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 600, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 999, padding: "6px 14px", marginBottom: 18 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#34d399" }} /> Renting guide
          </div>
          <h1 className="g-h" style={{ fontSize: "clamp(32px,5vw,48px)", fontWeight: 800, margin: "0 auto 14px", maxWidth: 640 }}>How renting works — and using LinkedIn safely with us</h1>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.82)", maxWidth: 540, margin: "0 auto", lineHeight: 1.6 }}>Everything you need to get started and keep your rented account healthy.</p>
        </div>
      </section>

      {/* Steps */}
      <section style={{ padding: "64px 0" }}>
        <div className="g-wrap">
          <h2 className="g-h" style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>The process, start to finish</h2>
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

      {/* GoLogin callout */}
      <section style={{ padding: "0 0 64px" }}>
        <div className="g-wrap">
          <div className="g-card" style={{ background: "#F3F8FE", borderColor: "#D6E3F2" }}>
            <h2 className="g-h" style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: "#0A66C2" }}>Setting up GoLogin (important)</h2>
            <p style={{ fontSize: 15, color: "#374151", lineHeight: 1.7, margin: "0 0 16px" }}>
              We share rented accounts through <strong>GoLogin</strong>, a secure anti-detect browser. This is what keeps the account safe — LinkedIn always sees one consistent device, proxy and fingerprint, no matter who&apos;s logged in.
            </p>
            <ol style={{ fontSize: 15, color: "#374151", lineHeight: 1.9, margin: "0 0 18px", paddingLeft: 20 }}>
              <li>Download GoLogin (free plan is fine) from <a href="https://gologin.com/download" style={{ color: "#0A66C2", fontWeight: 600 }}>gologin.com/download</a>.</li>
              <li>Create your GoLogin account using <strong>the same email you used on LinkedVelocity</strong>.</li>
              <li>Once we share the profile, find it in your GoLogin dashboard and click <strong>Start</strong>.</li>
            </ol>
            <a href="https://gologin.com/download" target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", background: "#0A66C2", color: "#fff", textDecoration: "none", fontWeight: 600, fontSize: 14, padding: "12px 22px", borderRadius: 10 }}>Download GoLogin</a>
          </div>
        </div>
      </section>

      {/* What you get */}
      <section style={{ padding: "0 0 64px" }}>
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

      {/* Safe use */}
      <section style={{ padding: "0 0 64px" }}>
        <div className="g-wrap">
          <h2 className="g-h" style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Using LinkedIn safely with us</h2>
          <p style={{ fontSize: 15, color: "#536471", lineHeight: 1.6, margin: "0 0 24px", maxWidth: 620 }}>These accounts belong to real people who trust us with them. Following these keeps the account healthy — and keeps your access uninterrupted.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="g-grid">
            <div className="g-card">
              <h3 className="g-h" style={{ fontSize: 17, fontWeight: 700, marginBottom: 12, color: "#00B85C" }}>Do</h3>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
                {DOS.map((d) => (
                  <li key={d} style={{ display: "flex", gap: 10, fontSize: 14, color: "#374151", lineHeight: 1.5 }}>
                    <span style={{ color: "#00B85C", fontWeight: 800 }}>✓</span>{d}
                  </li>
                ))}
              </ul>
            </div>
            <div className="g-card">
              <h3 className="g-h" style={{ fontSize: 17, fontWeight: 700, marginBottom: 12, color: "#DC2626" }}>Don&apos;t</h3>
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

      {/* CTA */}
      <section style={{ padding: "0 24px 80px" }}>
        <div className="g-wrap">
          <div className="g-card" style={{ textAlign: "center", padding: "40px 26px" }}>
            <h2 className="g-h" style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Still have a question?</h2>
            <p style={{ fontSize: 15, color: "#536471", margin: "0 0 20px" }}>Reach out any time — we&apos;re here to help you get the most out of your rental.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/catalogue" style={{ background: "#0A66C2", color: "#fff", textDecoration: "none", fontWeight: 600, fontSize: 14, padding: "12px 22px", borderRadius: 10 }}>Browse accounts</Link>
              <Link href="/dashboard" style={{ background: "#F3F2EE", color: "#0F1419", textDecoration: "none", fontWeight: 600, fontSize: 14, padding: "12px 22px", borderRadius: 10 }}>Go to dashboard</Link>
            </div>
          </div>
        </div>
      </section>

      <style>{`@media(max-width:680px){.g-grid{grid-template-columns:1fr !important}}`}</style>
    </div>
  );
}
