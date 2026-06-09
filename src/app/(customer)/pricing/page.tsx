import type { Metadata } from "next";
import Link from "next/link";
import { Montserrat, Karla } from "next/font/google";

const dmSans = Karla({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-dm-sans" });
const instrumentSans = Montserrat({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-instrument-sans" });

export const metadata: Metadata = {
  title: "Pricing — How LinkedVelocity Account Rental Pricing Works",
  description:
    "Every LinkedIn account is priced by quality — connections, account age, Sales Navigator and more. See the pricing tiers and what sets each price.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return (
    <>
      <style>{`
        .pp{font-family:var(--font-dm-sans),'Karla',system-ui,sans-serif;color:#0F1419;background:#FAFAF8}
        .pp h1,.pp h2,.pp h3,.pp h4{font-family:var(--font-instrument-sans),'Montserrat',system-ui,sans-serif;letter-spacing:-0.02em}
        .pp-hero{position:relative;overflow:hidden;text-align:center;padding:72px 40px 26px}
        .pp-hero::before{content:'';position:absolute;top:-40px;left:50%;transform:translateX(-50%);width:600px;height:320px;background:radial-gradient(closest-side,rgba(10,102,194,0.13),transparent 70%);pointer-events:none}
        .pp-hero > *{position:relative;z-index:1}
        .pp-pill{display:inline-flex;align-items:center;gap:8px;font-size:12.5px;font-weight:600;letter-spacing:.04em;color:#0F1419;background:#fff;border:1px solid #E8E6E1;border-radius:999px;padding:6px 14px}
        .pp-pill .d{width:7px;height:7px;border-radius:50%;background:#00B85C;box-shadow:0 0 0 3px rgba(0,184,92,0.2)}
        .pp-hero h1{font-size:clamp(34px,4.5vw,52px);font-weight:800;letter-spacing:-0.035em;margin:18px auto 12px;max-width:640px;line-height:1.08}
        .pp-hero p{font-size:17px;color:#536471;max-width:560px;margin:0 auto;line-height:1.6}
        .pp-wrap{max-width:1080px;margin:0 auto;padding:30px 40px 40px}
        .pp-tiers{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
        .pp-tiers{align-items:start}
        .pp-tier{position:relative;border:1px solid #E8E6E1;border-radius:18px;padding:30px 28px;background:#fff;transition:.2s}
        .pp-tier::before{content:'';position:absolute;top:0;left:0;right:0;height:5px;border-radius:18px 18px 0 0;background:#9cc1ec}
        .pp-tier.t-est::before{background:#0A66C2}
        .pp-tier.t-prem::before{background:#0B2A52}
        .pp-tier:hover{transform:translateY(-4px);box-shadow:0 22px 44px -24px rgba(10,102,194,0.3)}
        .pp-tier.feat{border:2px solid #0A66C2;box-shadow:0 30px 60px -26px rgba(10,102,194,0.55);transform:translateY(-14px)}
        .pp-tier.feat:hover{transform:translateY(-18px)}
        .pp-strength{display:inline-flex;gap:4px;margin-left:9px;vertical-align:middle}
        .pp-strength i{width:7px;height:7px;border-radius:50%;background:#D5DBE3;display:inline-block}
        .pp-strength i.on{background:#0A66C2}
        .pp-tier.t-prem .pp-strength i.on{background:#0B2A52}
        .pp-badge{position:absolute;top:-11px;left:28px;font-size:10.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#fff;background:linear-gradient(135deg,#00B85C,#007A3D);padding:4px 11px;border-radius:999px}
        .pp-cat{font-size:10.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#0A66C2;background:#E8F1FA;border-radius:999px;padding:4px 11px;display:inline-block}
        .pp-tier.t-est .pp-cat{color:#fff;background:#0A66C2}
        .pp-tier.t-prem .pp-cat{color:#fff;background:#0B2A52}
        .pp-tier h3{font-size:20px;margin:14px 0 4px}
        .pp-tier .desc{font-size:13.5px;color:#536471;min-height:44px;line-height:1.5}
        .pp-band{font-size:16px;font-weight:800;color:#0A66C2;margin:16px 0 4px}
        .pp-band small{color:#8899A6;font-weight:600}
        .pp-eg{display:flex;align-items:center;gap:11px;margin:14px 0 10px;padding:11px 12px;border:1px solid #E8E6E1;border-radius:12px;background:#FAFBFC}
        .pp-eg-av{width:42px;height:42px;border-radius:50%;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;position:relative;flex:0 0 42px}
        .pp-eg-dot{position:absolute;right:-1px;bottom:-1px;width:11px;height:11px;border-radius:50%;background:#00B85C;border:2px solid #FAFBFC}
        .pp-eg-name{font-weight:700;font-size:14px}
        .pp-eg-tag{font-size:9px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#8899A6;background:#EEF0F4;border-radius:6px;padding:2px 6px;margin-left:6px;vertical-align:middle}
        .pp-eg-role{font-size:12px;color:#536471}
        .pp-egstats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:6px}
        .pp-egstats > div{background:#F4F7FB;border-radius:9px;padding:8px 6px;text-align:center}
        .pp-egstats b{display:block;font-family:var(--font-instrument-sans),'Montserrat',sans-serif;font-size:15px;color:#0A66C2}
        .pp-egstats span{font-size:10px;color:#8899A6}
        .pp-tier ul{margin:12px 0 0;padding:0;list-style:none}
        .pp-tier li{font-size:13.5px;color:#3b4658;padding:5px 0 5px 24px;position:relative}
        .pp-tier li::before{content:'✓';position:absolute;left:0;color:#00B85C;font-weight:800}
        .pp-factors{margin:30px 0 0;border:1px solid #E8E6E1;border-radius:18px;background:#fff;padding:26px}
        .pp-factors h2{font-size:21px;margin:0 0 4px}
        .pp-factors .lead{font-size:14px;color:#536471;margin:0 0 18px}
        .pp-frow{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}
        .pp-f{background:#F8F9FC;border:1px solid #eef0f5;border-radius:14px;padding:14px;text-align:center}
        .pp-f .ic{font-size:22px}
        .pp-f h4{margin:8px 0 3px;font-size:13.5px}
        .pp-f p{margin:0;font-size:11.5px;color:#536471;line-height:1.4}
        .pp-note{margin:22px 0 0;background:#E8F1FA;border:1px solid #bcd9f5;border-radius:14px;color:#0A3161;font-size:13.5px;padding:13px 16px}
        .pp-cta{margin:40px;border-radius:24px;text-align:center;padding:64px 32px;color:#fff;position:relative;overflow:hidden;background:linear-gradient(160deg,#0B1A2E 0%,#0A3161 45%,#0A66C2 120%)}
        .pp-cta::before{content:'';position:absolute;top:-60px;left:50%;transform:translateX(-50%);width:520px;height:300px;background:radial-gradient(closest-side,rgba(0,184,92,0.2),transparent 70%);pointer-events:none}
        .pp-cta > *{position:relative;z-index:1}
        .pp-cta h2{font-size:clamp(26px,3vw,38px);margin-bottom:10px}
        .pp-cta p{color:rgba(255,255,255,0.82);margin-bottom:24px}
        .pp-btn{display:inline-flex;background:#fff;color:#0B1A2E;font-weight:700;padding:14px 28px;border-radius:12px;text-decoration:none;transition:.18s}
        .pp-btn:hover{transform:translateY(-2px)}
        @media(max-width:860px){.pp-tiers,.pp-frow{grid-template-columns:1fr}.pp-hero{padding:48px 22px 20px}.pp-wrap{padding:24px 20px}.pp-cta{margin:24px 16px;padding:44px 24px}}
      `}</style>

      <div className={`pp ${dmSans.variable} ${instrumentSans.variable}`}>
        <section className="pp-hero">
          <span className="pp-pill"><span className="d" /> Pricing</span>
          <h1>Pay per account — priced by quality</h1>
          <p>Every profile is priced on its own merits, so costs range. Here&apos;s what you&apos;re paying for, and how to pick the right fit.</p>
        </section>

        <div className="pp-wrap">
          {/* TODO before full launch: replace the illustrative price bands below with real ranges */}
          <div className="pp-tiers">
            <div className="pp-tier t-basic">
              <span className="pp-cat">Entry</span>
              <h3>New / Basic <span className="pp-strength"><i className="on" /><i /><i /></span></h3>
              <div className="pp-eg">
                <div className="pp-eg-av" style={{ background: "linear-gradient(135deg,#9cc1ec,#5b91d1)" }}>JT<span className="pp-eg-dot" /></div>
                <div>
                  <div><span className="pp-eg-name">Jordan T.</span><span className="pp-eg-tag">Example</span></div>
                  <div className="pp-eg-role">Sales Associate</div>
                </div>
              </div>
              <div className="pp-egstats">
                <div><b>~900</b><span>connections</span></div>
                <div><b>1 yr</b><span>account age</span></div>
                <div><b style={{ color: "#C4CAD3" }}>—</b><span>Sales Nav</span></div>
              </div>
              <div className="desc">Newer profiles with fewer connections. Great for testing or higher-volume, lower-stakes outreach.</div>
              <div className="pp-band">Lower price <small>· e.g. from ~$40/mo</small></div>
            </div>
            <div className="pp-tier feat t-est">
              <span className="pp-badge">Most popular</span>
              <span className="pp-cat">Sweet spot</span>
              <h3>Established <span className="pp-strength"><i className="on" /><i className="on" /><i /></span></h3>
              <div className="pp-eg">
                <div className="pp-eg-av" style={{ background: "linear-gradient(135deg,#4f90d9,#0A66C2)" }}>AK<span className="pp-eg-dot" /></div>
                <div>
                  <div><span className="pp-eg-name">Anna K.</span><span className="pp-eg-tag">Example</span></div>
                  <div className="pp-eg-role">Marketing Manager</div>
                </div>
              </div>
              <div className="pp-egstats">
                <div><b>4,200</b><span>connections</span></div>
                <div><b>4 yrs</b><span>account age</span></div>
                <div><b style={{ color: "#00B85C" }}>✓</b><span>Sales Nav</span></div>
              </div>
              <div className="desc">Solid connection counts and an active history. The reliable middle ground most renters choose.</div>
              <div className="pp-band">Mid price <small>· e.g. ~$90–$130/mo</small></div>
            </div>
            <div className="pp-tier t-prem">
              <span className="pp-cat">Top tier</span>
              <h3>Premium <span className="pp-strength"><i className="on" /><i className="on" /><i className="on" /></span></h3>
              <div className="pp-eg">
                <div className="pp-eg-av" style={{ background: "linear-gradient(135deg,#0A66C2,#0B2A52)" }}>ML<span className="pp-eg-dot" /></div>
                <div>
                  <div><span className="pp-eg-name">Marcus L.</span><span className="pp-eg-tag">Example</span></div>
                  <div className="pp-eg-role">VP of Sales</div>
                </div>
              </div>
              <div className="pp-egstats">
                <div><b>12,000</b><span>connections</span></div>
                <div><b>9 yrs</b><span>account age</span></div>
                <div><b style={{ color: "#00B85C" }}>✓</b><span>Sales Nav</span></div>
              </div>
              <div className="desc">Senior, large networks with Sales Navigator. Maximum reach and credibility for serious outreach.</div>
              <div className="pp-band">Top price <small>· e.g. $150+/mo</small></div>
            </div>
          </div>

          <div className="pp-factors">
            <h2>What sets each price</h2>
            <p className="lead">Every account is scored on the same factors — the higher it scores, the more reach and trust it carries (and the more it costs).</p>
            <div className="pp-frow">
              <div className="pp-f"><div className="ic">🔗</div><h4>Connections</h4><p>More connections = more reach.</p></div>
              <div className="pp-f"><div className="ic">📅</div><h4>Account age</h4><p>Older = more trusted, lower risk.</p></div>
              <div className="pp-f"><div className="ic">🎯</div><h4>Sales Navigator</h4><p>Premium outreach power.</p></div>
              <div className="pp-f"><div className="ic">🖼️</div><h4>Photo &amp; verification</h4><p>Signals a real, credible profile.</p></div>
              <div className="pp-f"><div className="ic">💼</div><h4>Seniority &amp; industry</h4><p>Senior titles open more doors.</p></div>
            </div>
          </div>

          <div className="pp-note">💡 Exact prices are set per profile and shown on each listing — these tiers just explain the <em>why</em>. You&apos;ll always see the real monthly price before you rent. No hidden fees, cancel anytime.</div>
        </div>

        <section className="pp-cta">
          <h2>Find the right account for your budget</h2>
          <p>Browse live profiles and see the real price for each.</p>
          <Link href="/catalogue" className="pp-btn">Browse available profiles →</Link>
        </section>
      </div>
    </>
  );
}
