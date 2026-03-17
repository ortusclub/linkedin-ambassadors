import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatNumber, formatCurrency } from "@/lib/utils";

const AVATAR_COLORS = [
  "linear-gradient(135deg,#0A66C2,#004182)",
  "linear-gradient(135deg,#00B85C,#007A3D)",
  "linear-gradient(135deg,#7C3AED,#5B21B6)",
  "linear-gradient(135deg,#DC2626,#991B1B)",
  "linear-gradient(135deg,#D97706,#92400E)",
  "linear-gradient(135deg,#0891B2,#155E75)",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  return name.replace(/\s*\(.*\)\s*$/, "").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

export default async function HomePage() {
  const accounts = await prisma.linkedInAccount.findMany({
    where: { status: "available" },
    orderBy: { connectionCount: "desc" },
    take: 4,
  });
  return (
    <>
      <style>{`
        /* Hide the default layout navbar on the homepage */
        body > nav, body > main > nav { display: none !important; }
        *{margin:0;padding:0;box-sizing:border-box}
        :root{
          --bg:#FAFAF8;--surface:#FFFFFF;--surface-alt:#F3F2EE;--text:#0F1419;--text-mid:#536471;--text-light:#8899A6;--border:#E8E6E1;
          --blue:#0A66C2;--blue-dark:#004182;--blue-light:#E8F1FA;--green:#00B85C;--green-dark:#007A3D;--green-light:#E6F9EE;
          --accent:#1D1B16;--radius:10px;--radius-lg:16px;--radius-xl:24px;
        }
        html{scroll-behavior:smooth}
        body{font-family:'DM Sans','Instrument Sans',system-ui,sans-serif;color:var(--text);background:var(--bg) !important;-webkit-font-smoothing:antialiased;overflow-x:hidden}
        .kl-page h1,.kl-page h2,.kl-page h3,.kl-page h4,.kl-page h5{font-family:'Instrument Sans','DM Sans',system-ui,sans-serif;font-weight:600;letter-spacing:-0.02em}
        .kl-nav{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(250,250,248,0.92);backdrop-filter:blur(20px);border-bottom:1px solid var(--border)}
        .nav-inner{max-width:1200px;margin:0 auto;padding:0 40px;height:64px;display:flex;align-items:center;justify-content:space-between}
        .logo{font-family:'Instrument Sans',sans-serif;font-weight:700;font-size:22px;letter-spacing:-0.03em;color:var(--accent);text-decoration:none;display:flex;align-items:center;gap:8px}
        .logo-mark{width:36px;height:36px;background:var(--accent);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;font-weight:700;flex-shrink:0;letter-spacing:-0.03em}
        .nav-links{display:flex;align-items:center;gap:32px}
        .nav-links a{font-size:14px;color:var(--text-mid);text-decoration:none;font-weight:500;transition:color .15s}
        .nav-links a:hover{color:var(--text)}
        .nav-cta{padding:8px 20px;background:var(--accent);color:#fff !important;border-radius:var(--radius);font-size:13px;font-weight:600;text-decoration:none;transition:transform .15s,box-shadow .15s}
        .nav-cta:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(15,20,25,0.15)}
        .hero{margin-top:64px;min-height:calc(100vh - 64px);display:grid;grid-template-columns:1fr 1fr;position:relative}
        .hero-side{padding:80px 60px 60px;display:flex;flex-direction:column;justify-content:center;position:relative;overflow:hidden}
        .hero-rent{background:linear-gradient(160deg,#0B1A2E 0%,#0A3161 40%,#0A66C2 100%);color:#fff}
        .hero-earn{background:linear-gradient(160deg,#0A2618 0%,#0A4D30 40%,#00B85C 100%);color:#fff}
        .hero-side::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 30% 70%,rgba(255,255,255,0.06) 0%,transparent 60%);pointer-events:none}
        .hero-label{font-size:12px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;opacity:0.6;margin-bottom:24px}
        .hero-title{font-size:clamp(32px,4vw,48px);line-height:1.1;margin-bottom:16px;font-weight:700;letter-spacing:-0.03em;max-width:460px}
        .hero-desc{font-size:16px;line-height:1.6;opacity:0.8;max-width:400px;margin-bottom:32px}
        .hero-btn{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;border-radius:var(--radius);font-size:15px;font-weight:600;text-decoration:none;transition:all .2s;border:none;cursor:pointer}
        .hero-btn-white{background:rgba(255,255,255,0.15);color:#fff;backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.2)}
        .hero-btn-white:hover{background:rgba(255,255,255,0.25);transform:translateY(-1px)}
        .hero-btn-solid{background:#fff;color:var(--accent)}
        .hero-btn-solid:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(0,0,0,0.15)}
        .hero-stats{display:flex;gap:32px;margin-top:40px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.15)}
        .hero-stat-num{font-size:28px;font-weight:700;font-family:'Instrument Sans',sans-serif;letter-spacing:-0.03em}
        .hero-stat-label{font-size:12px;opacity:0.6;margin-top:2px}
        .hero-divider{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:10;width:56px;height:56px;border-radius:50%;background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:var(--text-mid);box-shadow:0 4px 24px rgba(0,0,0,0.1)}
        .proof-bar{background:var(--surface);border-bottom:1px solid var(--border);padding:20px 0}
        .proof-inner{max-width:1200px;margin:0 auto;padding:0 40px;display:flex;align-items:center;justify-content:space-between;gap:40px}
        .proof-logos{display:flex;align-items:center;gap:24px}
        .proof-logo{font-size:13px;font-weight:600;color:var(--text-light);letter-spacing:-0.01em;opacity:0.5}
        .proof-stats{display:flex;gap:40px}
        .proof-stat{text-align:center}
        .proof-stat-num{font-size:20px;font-weight:700;font-family:'Instrument Sans',sans-serif;color:var(--text);letter-spacing:-0.02em}
        .proof-stat-label{font-size:11px;color:var(--text-light);margin-top:2px}
        .kl-section{padding:100px 40px;max-width:1200px;margin:0 auto}
        .section-label{font-size:12px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:var(--blue);margin-bottom:12px}
        .section-title{font-size:clamp(28px,3.5vw,42px);line-height:1.15;letter-spacing:-0.03em;margin-bottom:16px;max-width:600px}
        .section-desc{font-size:16px;color:var(--text-mid);line-height:1.6;max-width:520px;margin-bottom:48px}
        .how-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
        .how-card{padding:36px 32px;border-radius:var(--radius-lg);background:var(--surface);border:1px solid var(--border);position:relative;transition:all .2s}
        .how-card:hover{border-color:var(--blue);transform:translateY(-2px);box-shadow:0 12px 32px rgba(10,102,194,0.08)}
        .how-num{width:36px;height:36px;border-radius:50%;background:var(--blue-light);color:var(--blue);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;margin-bottom:20px}
        .how-card h4{font-size:18px;margin-bottom:8px}
        .how-card p{font-size:14px;color:var(--text-mid);line-height:1.6}
        .marketplace-bg{background:var(--surface);border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
        .marketplace-header{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:32px;flex-wrap:wrap;gap:16px}
        .filter-row{display:flex;gap:8px;flex-wrap:wrap}
        .filter-chip{padding:8px 16px;border-radius:100px;font-size:13px;font-weight:500;border:1px solid var(--border);background:var(--surface);color:var(--text-mid);cursor:pointer;transition:all .15s}
        .filter-chip:hover,.filter-chip.active{background:var(--accent);color:#fff;border-color:var(--accent)}
        .account-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
        .account-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px;transition:all .2s;cursor:pointer;position:relative}
        .account-card:hover{border-color:var(--blue);box-shadow:0 8px 24px rgba(10,102,194,0.08);transform:translateY(-2px)}
        .account-header{display:flex;align-items:center;gap:14px;margin-bottom:16px}
        .account-avatar{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;color:#fff}
        .account-name{font-weight:600;font-size:15px;margin-bottom:2px}
        .account-role{font-size:13px;color:var(--text-mid)}
        .account-meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px}
        .account-meta-item{background:var(--surface-alt);padding:8px 12px;border-radius:8px}
        .account-meta-item .val{font-size:15px;font-weight:600;font-family:'Instrument Sans',sans-serif}
        .account-meta-item .lbl{font-size:11px;color:var(--text-light);margin-top:1px}
        .account-tags{display:flex;gap:6px;flex-wrap:wrap}
        .account-tag{font-size:11px;padding:4px 10px;border-radius:100px;background:var(--blue-light);color:var(--blue);font-weight:500}
        .account-tag.green{background:var(--green-light);color:var(--green-dark)}
        .account-badge{position:absolute;top:12px;right:12px;font-size:10px;font-weight:600;padding:4px 10px;border-radius:100px;background:var(--green-light);color:var(--green-dark)}
        .account-price{margin-top:16px;padding-top:16px;border-top:1px solid var(--border);display:flex;align-items:baseline;justify-content:space-between}
        .account-price .price{font-size:22px;font-weight:700;font-family:'Instrument Sans',sans-serif;letter-spacing:-0.02em}
        .account-price .period{font-size:13px;color:var(--text-light)}
        .account-price .rent-btn{padding:8px 18px;border-radius:var(--radius);background:var(--blue);color:#fff;font-size:13px;font-weight:600;border:none;cursor:pointer;transition:all .15s}
        .account-price .rent-btn:hover{background:var(--blue-dark);transform:translateY(-1px)}
        .browse-all{display:flex;justify-content:center;margin-top:40px}
        .browse-all a{display:inline-flex;align-items:center;gap:8px;padding:14px 32px;border-radius:var(--radius);border:1px solid var(--border);font-size:14px;font-weight:600;color:var(--text);text-decoration:none;transition:all .15s}
        .browse-all a:hover{border-color:var(--accent);background:var(--surface);transform:translateY(-1px)}
        .browser-section{background:var(--surface);border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
        .browser-features{display:flex;flex-direction:column;gap:20px;margin-top:8px}
        .browser-feature{display:flex;gap:16px;align-items:flex-start}
        .browser-feature-icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .browser-feature h4{font-size:15px;margin-bottom:4px;font-weight:600}
        .browser-feature p{font-size:13px;color:var(--text-mid);line-height:1.6}
        .browser-visual{display:flex;justify-content:center}
        .browser-mockup{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.08);width:100%;max-width:440px}
        .browser-chrome{background:var(--surface-alt);padding:10px 14px;display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--border)}
        .browser-dots{display:flex;gap:6px}
        .browser-dots span{width:10px;height:10px;border-radius:50%;background:var(--border)}
        .browser-dots span:first-child{background:#FF5F57}
        .browser-dots span:nth-child(2){background:#FFBD2E}
        .browser-dots span:last-child{background:#27C93F}
        .browser-url{flex:1;background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:6px 10px;font-size:12px;color:var(--text-mid);display:flex;align-items:center;gap:6px}
        .browser-body{padding:20px}
        .browser-status{margin-bottom:16px;display:flex;flex-direction:column;gap:8px}
        .status-row{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:500;color:var(--text)}
        .status-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
        .green-dot{background:#00B85C;box-shadow:0 0 6px rgba(0,184,92,0.4)}
        .blue-dot{background:#0A66C2;box-shadow:0 0 6px rgba(10,102,194,0.4)}
        .status-location{font-size:11px;color:var(--text-light);font-weight:400;margin-left:auto}
        .browser-linkedin-mock{background:var(--surface-alt);border-radius:var(--radius);padding:16px;margin-bottom:12px}
        .li-header{display:flex;align-items:center;gap:12px;margin-bottom:14px}
        .li-avatar{width:40px;height:40px;border-radius:50%;background:var(--blue);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px}
        .li-name{font-weight:600;font-size:14px}
        .li-role{font-size:12px;color:var(--text-mid)}
        .li-stats-row{display:flex;gap:16px}
        .li-stat{display:flex;flex-direction:column;align-items:center;flex:1;padding:8px;background:var(--surface);border-radius:8px}
        .li-stat-num{font-size:16px;font-weight:700;font-family:'Instrument Sans',sans-serif}
        .li-stat-lbl{font-size:10px;color:var(--text-light)}
        .browser-shield{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--green);font-weight:500;padding:10px 14px;background:var(--green-light);border-radius:8px}
        .ambassador-section{background:linear-gradient(160deg,#0A2618 0%,#0A4D30 40%,#00B85C 100%);color:#fff;border-radius:var(--radius-xl);margin:0 40px;padding:80px 60px;position:relative;overflow:hidden}
        .ambassador-section::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 80% 20%,rgba(255,255,255,0.08) 0%,transparent 50%);pointer-events:none}
        .ambassador-section .section-label{color:rgba(255,255,255,0.5)}
        .ambassador-section .section-title{color:#fff;max-width:500px}
        .ambassador-section .section-desc{color:rgba(255,255,255,0.7);max-width:440px}
        .earn-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:48px}
        .earn-card{padding:28px 24px;border-radius:var(--radius-lg);background:rgba(255,255,255,0.08);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.1)}
        .earn-card h4{font-size:16px;margin-bottom:6px;font-weight:600}
        .earn-card p{font-size:13px;opacity:0.7;line-height:1.5}
        .earn-card .earn-amount{font-size:32px;font-weight:700;font-family:'Instrument Sans',sans-serif;letter-spacing:-0.03em;margin-bottom:4px}
        .trust-grid{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center}
        .comparison-table{border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;background:var(--surface)}
        .comparison-table .row{display:grid;grid-template-columns:1fr 1fr 1fr;border-bottom:1px solid var(--border);font-size:14px}
        .comparison-table .row:last-child{border-bottom:none}
        .comparison-table .row.header{font-weight:600;font-size:13px;background:var(--surface-alt)}
        .comparison-table .cell{padding:14px 20px}
        .comparison-table .cell.feature{color:var(--text-mid);font-weight:500}
        .comparison-table .cell.solo{color:var(--text-light)}
        .comparison-table .cell.klabber{color:var(--blue);font-weight:600}
        .testimonials-bg{background:var(--surface-alt)}
        .testimonial-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
        .testimonial-card{padding:28px;border-radius:var(--radius-lg);background:var(--surface);border:1px solid var(--border)}
        .testimonial-quote{font-size:15px;line-height:1.6;color:var(--text);margin-bottom:20px;font-style:italic}
        .testimonial-author{display:flex;align-items:center;gap:12px}
        .testimonial-avatar{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:13px;color:#fff}
        .testimonial-name{font-weight:600;font-size:13px}
        .testimonial-role{font-size:12px;color:var(--text-light)}
        .final-cta{text-align:center;padding:120px 40px;max-width:700px;margin:0 auto}
        .final-cta h2{font-size:clamp(32px,4vw,48px);letter-spacing:-0.03em;margin-bottom:16px}
        .final-cta p{font-size:16px;color:var(--text-mid);margin-bottom:36px;line-height:1.6}
        .cta-row{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
        .btn-blue{padding:16px 32px;border-radius:var(--radius);background:var(--blue);color:#fff;font-size:15px;font-weight:600;text-decoration:none;transition:all .2s;border:none;cursor:pointer}
        .btn-blue:hover{background:var(--blue-dark);transform:translateY(-1px);box-shadow:0 8px 24px rgba(10,102,194,0.2)}
        .btn-green-solid{padding:16px 32px;border-radius:var(--radius);background:var(--green);color:#fff;font-size:15px;font-weight:600;text-decoration:none;transition:all .2s;border:none;cursor:pointer}
        .btn-green-solid:hover{background:var(--green-dark);transform:translateY(-1px);box-shadow:0 8px 24px rgba(0,184,92,0.2)}
        .kl-footer{border-top:1px solid var(--border);padding:40px;text-align:center;font-size:13px;color:var(--text-light)}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        .fade-up{animation:fadeUp .6s ease-out both}
        .d1{animation-delay:.1s}.d2{animation-delay:.2s}.d3{animation-delay:.3s}.d4{animation-delay:.4s}
        @media(max-width:900px){
          .hero{grid-template-columns:1fr;min-height:auto}
          .hero-side{padding:60px 32px 48px}
          .hero-divider{position:relative;top:auto;left:auto;transform:none;margin:-28px auto}
          .how-grid,.earn-grid,.testimonial-grid{grid-template-columns:1fr}
          .trust-grid{grid-template-columns:1fr}
          .browser-section .kl-section > div{grid-template-columns:1fr}
          .account-grid{grid-template-columns:1fr}
          .nav-links{display:none}
          .proof-inner{flex-direction:column;text-align:center}
          .ambassador-section{margin:0 16px;padding:48px 24px}
          .kl-section{padding:60px 24px}
        }
      `}</style>

      {/* Google Fonts */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet" />

      <div className="kl-page">
        {/* NAV */}
        <nav className="kl-nav">
          <div className="nav-inner">
            <Link href="/" className="logo"><span className="logo-mark">kl</span>Klabber</Link>
            <div className="nav-links">
              <Link href="/catalogue">Browse Accounts</Link>
              <Link href="/become-ambassador">Become an Ambassador</Link>
              <a href="#how">How It Works</a>
              <Link href="/catalogue" className="nav-cta">Get Started</Link>
            </div>
          </div>
        </nav>

        {/* HERO SPLIT */}
        <section className="hero">
          <div className="hero-side hero-rent">
            <div className="hero-label fade-up">For growth teams</div>
            <h1 className="hero-title fade-up d1">Scale LinkedIn outreach without the limits</h1>
            <p className="hero-desc fade-up d2">Rent verified, pre-warmed LinkedIn accounts with real connections and established histories. Run parallel campaigns and hit pipeline targets in weeks, not quarters.</p>
            <div className="fade-up d3">
              <Link href="/catalogue" className="hero-btn hero-btn-solid">Browse Available Accounts →</Link>
            </div>
            <div className="hero-stats fade-up d4">
              <div><div className="hero-stat-num">847</div><div className="hero-stat-label">Accounts live</div></div>
              <div><div className="hero-stat-num">3.2M</div><div className="hero-stat-label">Messages sent</div></div>
              <div><div className="hero-stat-num">98%</div><div className="hero-stat-label">Uptime</div></div>
            </div>
          </div>
          <div className="hero-divider">or</div>
          <div className="hero-side hero-earn">
            <div className="hero-label fade-up">For professionals</div>
            <h1 className="hero-title fade-up d1">Earn $10–$500/mo from your LinkedIn</h1>
            <p className="hero-desc fade-up d2">Every LinkedIn profile has value — from brand new to well-established. List yours on Klabber and get paid every month, guaranteed, whether we find a renter or not.</p>
            <div className="fade-up d3">
              <Link href="/become-ambassador" className="hero-btn hero-btn-white">Become an Ambassador →</Link>
            </div>
            <div className="hero-stats fade-up d4">
              <div><div className="hero-stat-num">$85</div><div className="hero-stat-label">Avg. monthly earnings</div></div>
              <div><div className="hero-stat-num">240+</div><div className="hero-stat-label">Ambassadors</div></div>
              <div><div className="hero-stat-num">48hr</div><div className="hero-stat-label">Avg. payout</div></div>
            </div>
          </div>
        </section>

        {/* SOCIAL PROOF BAR */}
        <div className="proof-bar">
          <div className="proof-inner">
            <div className="proof-logos">
              <span style={{fontSize:12,color:'var(--text-light)',fontWeight:500,whiteSpace:'nowrap'}}>Trusted by teams at</span>
              <span className="proof-logo">Salesforce</span>
              <span className="proof-logo">HubSpot</span>
              <span className="proof-logo">Outreach</span>
              <span className="proof-logo">Apollo</span>
              <span className="proof-logo">Lemlist</span>
              <span className="proof-logo">Reply.io</span>
            </div>
            <div className="proof-stats">
              <div className="proof-stat"><div className="proof-stat-num">12,400</div><div className="proof-stat-label">Campaigns running</div></div>
              <div className="proof-stat"><div className="proof-stat-num">94%</div><div className="proof-stat-label">Renewal rate</div></div>
            </div>
          </div>
        </div>

        {/* HOW IT WORKS */}
        <section className="kl-section" id="how">
          <div className="section-label">How it works</div>
          <div className="section-title">Three steps to unlimited LinkedIn outreach</div>
          <div className="section-desc">No warm-up period. No account flagging. No limits on your growth.</div>
          <div className="how-grid">
            <div className="how-card">
              <div className="how-num">1</div>
              <h4>Browse &amp; select</h4>
              <p>Filter accounts by industry, geography, connection count, and SSI score. Every account is verified with real history and an established network.</p>
            </div>
            <div className="how-card">
              <div className="how-num">2</div>
              <h4>Rent monthly</h4>
              <p>Pay a flat monthly fee per account. No contracts, no setup fees. Scale up or down anytime — add 3 accounts this month, 10 next month.</p>
            </div>
            <div className="how-card">
              <div className="how-num">3</div>
              <h4>Launch campaigns</h4>
              <p>Connect your outreach tool. Each account gets its own connection and messaging limits — multiply your reach without multiplying your risk.</p>
            </div>
          </div>
        </section>

        {/* KLABBER BROWSER */}
        <section className="browser-section">
          <div className="kl-section">
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:60,alignItems:'center'}}>
              <div>
                <div className="section-label">Powered by Klabber Browser</div>
                <div className="section-title">Our proprietary Chromium browser makes sharing seamless — and invisible to LinkedIn</div>
                <div className="section-desc">The biggest risk with account sharing is LinkedIn detecting multiple logins from different locations. Klabber Browser eliminates that entirely.</div>
                <div className="browser-features">
                  <div className="browser-feature">
                    <div className="browser-feature-icon" style={{background:'var(--blue-light)',color:'var(--blue)'}}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    </div>
                    <div>
                      <h4>Shared proxy session</h4>
                      <p>Both the ambassador and renter connect through the same proxy location. LinkedIn sees one consistent login origin — no flags, no suspicion.</p>
                    </div>
                  </div>
                  <div className="browser-feature">
                    <div className="browser-feature-icon" style={{background:'var(--green-light)',color:'var(--green)'}}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                    </div>
                    <div>
                      <h4>Unified cookie environment</h4>
                      <p>Both parties share the same browser cookies and session data. No conflicting logins, no &quot;new device&quot; alerts. It looks like one person, one device.</p>
                    </div>
                  </div>
                  <div className="browser-feature">
                    <div className="browser-feature-icon" style={{background:'#F3EEFF',color:'#7C3AED'}}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    </div>
                    <div>
                      <h4>Simultaneous access</h4>
                      <p>Both the ambassador and renter can be logged in at the same time. No kicking each other out, no session conflicts — it just works throughout the rental period.</p>
                    </div>
                  </div>
                  <div className="browser-feature">
                    <div className="browser-feature-icon" style={{background:'#FFF3E6',color:'#D97706'}}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </div>
                    <div>
                      <h4>Zero detection in 12 months</h4>
                      <p>Across thousands of active rentals, not a single account has been flagged by LinkedIn. The proxy + cookie architecture makes shared access indistinguishable from normal use.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="browser-visual">
                <div className="browser-mockup">
                  <div className="browser-chrome">
                    <div className="browser-dots"><span></span><span></span><span></span></div>
                    <div className="browser-url">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.4}}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      <span>linkedin.com/in/enterprise-leader</span>
                    </div>
                  </div>
                  <div className="browser-body">
                    <div className="browser-status">
                      <div className="status-row">
                        <div className="status-dot green-dot"></div>
                        <span>Ambassador connected</span>
                        <span className="status-location">via proxy: San Francisco, CA</span>
                      </div>
                      <div className="status-row">
                        <div className="status-dot blue-dot"></div>
                        <span>Renter connected</span>
                        <span className="status-location">via proxy: San Francisco, CA</span>
                      </div>
                    </div>
                    <div className="browser-linkedin-mock">
                      <div className="li-header">
                        <div className="li-avatar">JK</div>
                        <div>
                          <div className="li-name">James K.</div>
                          <div className="li-role">VP Sales · Enterprise SaaS</div>
                        </div>
                      </div>
                      <div className="li-stats-row">
                        <div className="li-stat"><span className="li-stat-num">4,200</span><span className="li-stat-lbl">Connections</span></div>
                        <div className="li-stat"><span className="li-stat-num">82</span><span className="li-stat-lbl">SSI</span></div>
                        <div className="li-stat"><span className="li-stat-num">142</span><span className="li-stat-lbl">Pending</span></div>
                      </div>
                    </div>
                    <div className="browser-shield">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00B85C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
                      <span>Session protected · Same origin · No flags</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* MARKETPLACE PREVIEW */}
        <section className="marketplace-bg" id="marketplace">
          <div className="kl-section" style={{paddingBottom:80}}>
            <div className="marketplace-header">
              <div>
                <div className="section-label">Marketplace</div>
                <div className="section-title" style={{marginBottom:8}}>Browse available accounts</div>
                <p style={{fontSize:14,color:'var(--text-mid)'}}>{accounts.length} accounts ready to rent right now</p>
              </div>
            </div>
            <div className="account-grid">
              {accounts.map((a) => {
                const displayName = a.linkedinName.replace(/\s*\(.*\)\s*$/, "");
                const initials = getInitials(a.linkedinName);
                const ageYears = a.accountAgeMonths ? Math.floor(a.accountAgeMonths / 12) : null;
                const price = Number(a.monthlyPrice);
                return (
                  <Link key={a.id} href={`/account/${a.id}`} className="account-card" style={{textDecoration:'none',color:'inherit'}}>
                    <div className="account-header">
                      <div className="account-avatar" style={{background: getAvatarColor(a.linkedinName), overflow:'hidden'}}>
                        {a.profilePhotoUrl ? (
                          <img src={a.profilePhotoUrl} alt={displayName} style={{width:'100%',height:'100%',objectFit:'cover'}} />
                        ) : initials}
                      </div>
                      <div>
                        <div className="account-name">{displayName}</div>
                        <div className="account-role">{a.linkedinHeadline || [a.industry, a.location].filter(Boolean).join(" · ") || ""}</div>
                      </div>
                    </div>
                    <div className="account-meta">
                      {a.connectionCount > 0 && (
                        <div className="account-meta-item"><div className="val">{formatNumber(a.connectionCount)}</div><div className="lbl">Connections</div></div>
                      )}
                      {ageYears && ageYears > 0 ? (
                        <div className="account-meta-item"><div className="val">{ageYears}+ yrs</div><div className="lbl">Account age</div></div>
                      ) : null}
                      {a.hasSalesNav && (
                        <div className="account-meta-item"><div className="val">SN</div><div className="lbl">Sales Nav included</div></div>
                      )}
                    </div>
                    <div className="account-tags">
                      {a.industry && <span className="account-tag">{a.industry}</span>}
                      {a.location && <span className="account-tag">{a.location}</span>}
                    </div>
                    <div className="account-price">
                      <div><span className="price">{formatCurrency(price)}</span><span className="period">/month</span></div>
                      <span className="rent-btn">View Profile</span>
                    </div>
                  </Link>
                );
              })}
              {accounts.length === 0 && (
                <div style={{gridColumn:'1/-1',textAlign:'center',padding:'60px 20px',color:'var(--text-mid)'}}>
                  <p style={{fontSize:16,fontWeight:500}}>No accounts available yet</p>
                  <p style={{fontSize:14,marginTop:8}}>Check back soon or become an ambassador to list yours.</p>
                </div>
              )}
            </div>
            <div className="browse-all"><Link href="/catalogue">View all accounts →</Link></div>
          </div>
        </section>

        {/* COMPARISON TABLE */}
        <section className="kl-section">
          <div className="trust-grid">
            <div>
              <div className="section-label">Why Klabber</div>
              <div className="section-title">74% cheaper than hiring another SDR</div>
              <div className="section-desc">A single SDR costs $4,500–6,000/month in salary alone. With Klabber, you get the same outreach volume for a fraction of the cost — and you can scale instantly.</div>
              <Link href="/catalogue" className="hero-btn hero-btn-solid" style={{background:'var(--blue)',color:'#fff',display:'inline-flex',textDecoration:'none'}}>Calculate your ROI →</Link>
            </div>
            <div className="comparison-table">
              <div className="row header">
                <div className="cell feature"></div>
                <div className="cell solo">Solo account</div>
                <div className="cell klabber">With Klabber</div>
              </div>
              <div className="row"><div className="cell feature">Weekly connections</div><div className="cell solo">100</div><div className="cell klabber">1,000+</div></div>
              <div className="row"><div className="cell feature">Parallel campaigns</div><div className="cell solo">1</div><div className="cell klabber">10+</div></div>
              <div className="row"><div className="cell feature">Account risk</div><div className="cell solo">High</div><div className="cell klabber">Distributed</div></div>
              <div className="row"><div className="cell feature">Monthly cost</div><div className="cell solo">$4,500+ (SDR)</div><div className="cell klabber">From $199</div></div>
              <div className="row"><div className="cell feature">Ramp-up time</div><div className="cell solo">Weeks</div><div className="cell klabber">Instant</div></div>
              <div className="row"><div className="cell feature">Sales Navigator</div><div className="cell solo">Extra cost</div><div className="cell klabber">Included</div></div>
            </div>
          </div>
        </section>

        {/* AMBASSADOR CTA */}
        <section id="ambassador" style={{padding:'20px 0 100px'}}>
          <div className="ambassador-section">
            <div className="section-label">For professionals</div>
            <div className="section-title">Your LinkedIn has been earning you connections. Now let it earn you cash.</div>
            <div className="section-desc">Any LinkedIn account qualifies — new or established. List yours and start earning immediately. We pay you every month, guaranteed, whether we find a renter or not.</div>
            <div style={{marginTop:32}}><Link href="/become-ambassador" className="hero-btn hero-btn-white" style={{display:'inline-flex',textDecoration:'none'}}>Apply to become an Ambassador →</Link></div>
            <div className="earn-grid">
              <div className="earn-card">
                <div className="earn-amount">$10–$500</div>
                <h4>Monthly earnings</h4>
                <p>Based on your connection count, industry relevance, SSI score, and account age.</p>
              </div>
              <div className="earn-card">
                <div className="earn-amount">100%</div>
                <h4>Identity control</h4>
                <p>Your name, photo, and headline stay yours. Renters use the account for outreach only — no profile changes.</p>
              </div>
              <div className="earn-card">
                <div className="earn-amount">48hr</div>
                <h4>Fast payouts</h4>
                <p>Get paid within 48 hours of each billing cycle. Direct to your bank or PayPal.</p>
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="testimonials-bg">
          <div className="kl-section">
            <div className="section-label">What people say</div>
            <div className="section-title" style={{marginBottom:40}}>Trusted by growth teams and professionals worldwide</div>
            <div className="testimonial-grid">
              <div className="testimonial-card">
                <div className="testimonial-quote">&quot;We went from 200 connection requests a week to over 2,000. Our pipeline tripled in the first month. Klabber is a no-brainer for any outbound team.&quot;</div>
                <div className="testimonial-author">
                  <div className="testimonial-avatar" style={{background:'var(--blue)'}}>DM</div>
                  <div><div className="testimonial-name">David M.</div><div className="testimonial-role">Head of Growth, Series B SaaS</div></div>
                </div>
              </div>
              <div className="testimonial-card">
                <div className="testimonial-quote">&quot;I earn $650 a month from an account I barely use anymore. The setup took 10 minutes and I haven&apos;t had to do anything since.&quot;</div>
                <div className="testimonial-author">
                  <div className="testimonial-avatar" style={{background:'var(--green)'}}>SK</div>
                  <div><div className="testimonial-name">Sarah K.</div><div className="testimonial-role">Former VP Marketing, Ambassador</div></div>
                </div>
              </div>
              <div className="testimonial-card">
                <div className="testimonial-quote">&quot;The distributed risk model is what sold us. Instead of burning our CEO&apos;s account, we rent 5 accounts and spread the outreach. Zero flags in 6 months.&quot;</div>
                <div className="testimonial-author">
                  <div className="testimonial-avatar" style={{background:'#7C3AED'}}>JP</div>
                  <div><div className="testimonial-name">James P.</div><div className="testimonial-role">RevOps Lead, Enterprise SaaS</div></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="final-cta">
          <h2>Ready to break through LinkedIn&apos;s ceiling?</h2>
          <p>Whether you want to scale your outreach or monetize your professional network, Klabber makes it happen.</p>
          <div className="cta-row">
            <Link href="/catalogue" className="btn-blue">Browse Accounts →</Link>
            <Link href="/become-ambassador" className="btn-green-solid">Become an Ambassador →</Link>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="kl-footer">
          <div style={{maxWidth:1200,margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:16}}>
            <span className="logo" style={{fontSize:18}}><span className="logo-mark" style={{width:30,height:30,fontSize:15}}>kl</span>Klabber</span>
            <div style={{display:'flex',gap:24}}>
              <a href="#" style={{color:'var(--text-light)',textDecoration:'none',fontSize:13}}>Privacy</a>
              <a href="#" style={{color:'var(--text-light)',textDecoration:'none',fontSize:13}}>Terms</a>
              <a href="#" style={{color:'var(--text-light)',textDecoration:'none',fontSize:13}}>Contact</a>
            </div>
            <div>© 2026 Klabber. All rights reserved.</div>
          </div>
        </footer>
      </div>
    </>
  );
}
