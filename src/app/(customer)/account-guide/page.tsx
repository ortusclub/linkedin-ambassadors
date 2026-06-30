import Link from "next/link";
import type { Metadata } from "next";
import { Montserrat, Karla } from "next/font/google";

const heading = Montserrat({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-heading" });
const body = Karla({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "Your Account Guide — using your rented account | LinkedVelocity",
  description: "How to use your rented LinkedIn account: getting in via GoLogin, daily limits, do's & don'ts, and exactly what happens if an account gets restricted.",
};

const ACCESS = [
  "Open the GoLogin app (or web), signed in with the email you rented with.",
  'Find your profile under "Shared with me." Don\'t see it yet? Refresh — it can take a minute or two to appear after renting.',
  "Hit Start to launch the browser with LinkedIn already logged in. That's it — you're in.",
];

const LIMITS = [
  { activity: "Connection requests", limit: "20–30 per day maximum" },
  { activity: "Messages to connections", limit: "50–80 per day" },
  { activity: "Profile views", limit: "Keep natural — don't bulk view hundreds at once" },
  { activity: "InMail messages", limit: "Use sparingly — only to 2nd/3rd degree connections" },
  { activity: "Endorsements / reactions", limit: "Keep minimal — focus on outreach only" },
];

const DOS = [
  "Always open the account through your GoLogin profile.",
  "Send natural, personalised B2B messages.",
  "Stay within the daily limits above.",
  "Ask us for any profile changes (headline, experience, location) — we'll do it for you.",
  "Give us a heads-up if you connect any tool.",
];

const DONTS = [
  "Log in directly on LinkedIn.com or the app, or share the login.",
  "Change the name, photo, email, password, or security settings.",
  "Run scrapers or cloud tools that log in separately.",
  "Delete connections, link a payment card, or create a LinkedIn Ads account.",
  "Never use it for anything illegal, fraudulent, or deceptive.",
];

const LADDER = [
  { n: "1", bg: "#E6F9EE", fg: "#0a8f43", title: "First time", body: "A friendly heads-up and a quick refresher on the tips. No penalty — everyone gets the benefit of the doubt." },
  { n: "2", bg: "#FFF3E0", fg: "#B8741A", title: "If it happens again", body: "We'll briefly pause access and look at the usage together, to get you back on track." },
  { n: "3", bg: "#FDECEA", fg: "#C0392B", title: "If it keeps happening", body: "We may need to end the rental, but we'd always talk it through with you first." },
];

export default function AccountGuidePage() {
  return (
    <div className={`${heading.variable} ${body.variable}`} style={{ fontFamily: "var(--font-body),system-ui,sans-serif", color: "#0F1419", background: "#FAFAF8" }}>
      <style>{`
        .g-h{font-family:var(--font-heading),system-ui,sans-serif;letter-spacing:-0.02em}
        .g-wrap{max-width:760px;margin:0 auto;padding:0 24px}
        .g-card{background:#fff;border:1px solid #E8E6E1;border-radius:16px;padding:24px 26px}
        .g-hl{color:#34d399}
        .g-limit-row{display:grid;grid-template-columns:1fr 1.4fr;gap:16px;padding:14px 0;border-bottom:1px solid #F0EFEB;font-size:14.5px}
        .g-limit-row:last-child{border-bottom:none}
        @media(max-width:680px){.g-grid{grid-template-columns:1fr !important}.g-limit-row{grid-template-columns:1fr;gap:2px}}
      `}</style>

      {/* Hero */}
      <section style={{ background: "radial-gradient(circle at 50% 14%,#103a6b 0%,#0B1A2E 64%)", color: "#fff", padding: "64px 24px 56px", textAlign: "center" }}>
        <div className="g-wrap">
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 600, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 999, padding: "6px 14px", marginBottom: 18 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#34d399" }} /> Your account guide
          </div>
          <h1 className="g-h" style={{ fontSize: "clamp(30px,5vw,44px)", fontWeight: 800, margin: "0 auto 14px", maxWidth: 600 }}>Getting the most from your <span className="g-hl">rented account</span></h1>
          <p style={{ fontSize: 16.5, color: "rgba(255,255,255,0.82)", maxWidth: 540, margin: "0 auto", lineHeight: 1.6 }}>Everything you need to run your account well and keep it healthy. It&apos;s short, and mostly common sense.</p>
        </div>
      </section>

      {/* Getting in */}
      <section style={{ padding: "52px 0 0" }}>
        <div className="g-wrap">
          <h2 className="g-h" style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>Getting in</h2>
          <p style={{ fontSize: 15, color: "#536471", lineHeight: 1.6, margin: "0 0 20px" }}>We&apos;ve set up a secure GoLogin profile just for you — that&apos;s how you use the account.</p>
          <div className="g-card">
            <div style={{ display: "grid", gap: 14 }}>
              {ACCESS.map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div className="g-h" style={{ flex: "0 0 28px", width: 28, height: 28, borderRadius: 9, background: "linear-gradient(135deg,#0A66C2,#004182)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>{i + 1}</div>
                  <p style={{ fontSize: 15, color: "#374151", lineHeight: 1.6, margin: "2px 0" }}>{s}</p>
                </div>
              ))}
            </div>
            <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 10, padding: "12px 14px", marginTop: 16, fontSize: 14, color: "#9A3412", lineHeight: 1.6 }}>
              <strong>Always use the account through GoLogin.</strong> Please don&apos;t log in on LinkedIn.com or the app directly, or share the login — that&apos;s what keeps the account safe and consistent.
            </div>
          </div>
        </div>
      </section>

      {/* Daily limits */}
      <section style={{ padding: "48px 0 0" }}>
        <div className="g-wrap">
          <h2 className="g-h" style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>Your daily limits</h2>
          <p style={{ fontSize: 15, color: "#536471", lineHeight: 1.6, margin: "0 0 20px", maxWidth: 620 }}>Staying inside these keeps your account healthy and well under LinkedIn&apos;s radar.</p>
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
          <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 10, padding: "12px 14px", marginTop: 16, fontSize: 14, color: "#9A3412", lineHeight: 1.6 }}>
            <strong>Warm-up:</strong> for the first week on a fresh account, start lower (~5–10 a day) and build up. If LinkedIn ever shows a warning, just pause for a couple of days and ease back in — it usually settles on its own.
          </div>
        </div>
      </section>

      {/* Do's & Don'ts */}
      <section style={{ padding: "48px 0 0" }}>
        <div className="g-wrap">
          <h2 className="g-h" style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>Do&apos;s and don&apos;ts</h2>
          <p style={{ fontSize: 15, color: "#536471", lineHeight: 1.6, margin: "0 0 24px", maxWidth: 620 }}>Want the profile tailored to your outreach — a different headline, experience, or location? Just message us and we&apos;ll handle it (we can change anything except the name and photo).</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="g-grid">
            <div className="g-card" style={{ background: "#EFFBF3", borderColor: "#BBE9CC" }}>
              <h3 className="g-h" style={{ fontSize: 17, fontWeight: 700, marginBottom: 12, color: "#0a8f43" }}>✅ Do</h3>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
                {DOS.map((d) => (
                  <li key={d} style={{ display: "flex", gap: 10, fontSize: 14, color: "#374151", lineHeight: 1.5 }}>
                    <span style={{ color: "#00B85C", fontWeight: 800 }}>✓</span>{d}
                  </li>
                ))}
              </ul>
            </div>
            <div className="g-card" style={{ background: "#FEF2F2", borderColor: "#FBD0D0" }}>
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
          <h2 className="g-h" style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>If something goes wrong</h2>
          <p style={{ fontSize: 15, color: "#536471", lineHeight: 1.6, margin: "0 0 20px", maxWidth: 620 }}>Restrictions happen now and then, even to careful users — it&apos;s part of LinkedIn, and most are temporary. Here&apos;s exactly how we handle it, so there are never surprises.</p>
          <div className="g-card" style={{ marginBottom: 14 }}>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
              <li style={{ fontSize: 14.5, color: "#374151", lineHeight: 1.55 }}><strong>Let us handle the recovery — don&apos;t appeal it yourself.</strong> If an account gets restricted, please don&apos;t try to appeal or contact LinkedIn on your own. Just flag it to us and we&apos;ll sort it out — appealing yourself can make it harder to get back.</li>
              <li style={{ fontSize: 14.5, color: "#374151", lineHeight: 1.55 }}><strong>We&apos;ll always work to get it back.</strong> Whatever caused it, we jump on recovery straight away.</li>
              <li style={{ fontSize: 14.5, color: "#374151", lineHeight: 1.55 }}><strong>Stick to the guidelines and you&apos;re covered.</strong> If it happened even though you followed the tips above, there&apos;s no penalty — we credit your downtime, and if it can&apos;t come back we&apos;ll swap it for another.</li>
            </ul>
          </div>

          <p style={{ fontSize: 14.5, fontWeight: 700, margin: "0 0 10px" }}>And if an account keeps getting restricted from heavy use, here&apos;s what happens — we keep it fair and predictable:</p>
          <div style={{ display: "grid", gap: 10 }}>
            {LADDER.map((s) => (
              <div key={s.n} className="g-card" style={{ display: "flex", gap: 13, alignItems: "flex-start", padding: "14px 16px" }}>
                <span style={{ flexShrink: 0, width: 28, height: 28, borderRadius: "50%", background: s.bg, color: s.fg, fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>{s.n}</span>
                <div style={{ fontSize: 14.5, color: "#374151", lineHeight: 1.55 }}><strong>{s.title}</strong> — {s.body}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 13, color: "#8899A6", lineHeight: 1.6, margin: "10px 0 0" }}>Only repeated heavy use counts toward this — a one-off, or a restriction that wasn&apos;t your fault, never does.</p>

          <div className="g-card" style={{ background: "#FFF7ED", borderColor: "#F59E0B", borderWidth: 2, marginTop: 16 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "#B45309", background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: 999, padding: "4px 12px", marginBottom: 12 }}>⚠️ Please take note</div>
            <p style={{ fontSize: 15.5, color: "#9A3412", lineHeight: 1.65, margin: 0 }}>
              <strong>Above all — these are real people.</strong> Every account belongs to a real, consenting professional who&apos;s trusted us with their profile. Please only ever use it for genuine, legitimate business — never anything illegal, fraudulent, or deceptive. If we spot something serious, we&apos;ll pause access and ask what happened, and a genuine breach ends the rental (no refund).
            </p>
          </div>
        </div>
      </section>

      {/* Need help / CTA */}
      <section style={{ padding: "48px 24px 80px" }}>
        <div className="g-wrap">
          <div className="g-card" style={{ textAlign: "center", padding: "40px 26px" }}>
            <h2 className="g-h" style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Questions?</h2>
            <p style={{ fontSize: 15, color: "#536471", margin: "0 0 6px", lineHeight: 1.6 }}>A profile tweak, a tool you want to use, or a restriction — just reach out and we&apos;ll sort it.</p>
            <p style={{ fontSize: 14, color: "#8899A6", margin: "0 0 22px" }}>Telegram <a href="https://t.me/linkedvelocity_support_bot" target="_blank" rel="noopener noreferrer" style={{ color: "#0A66C2", fontWeight: 700, textDecoration: "none" }}>@linkedvelocity_support_bot</a></p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/dashboard" style={{ background: "#0A66C2", color: "#fff", textDecoration: "none", fontWeight: 600, fontSize: 14, padding: "12px 22px", borderRadius: 10 }}>Go to dashboard</Link>
              <Link href="/guide" style={{ background: "#F3F2EE", color: "#0F1419", textDecoration: "none", fontWeight: 600, fontSize: 14, padding: "12px 22px", borderRadius: 10 }}>How renting works</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
