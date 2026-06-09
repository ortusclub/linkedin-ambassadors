export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { formatNumber, formatCurrency } from "@/lib/utils";
import { DM_Sans, Instrument_Sans } from "next/font/google";
import { TestAccountGate } from "@/components/test-account-gate";

const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dm-sans" });
const instrumentSans = Instrument_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-instrument-sans" });

const AVATAR_COLORS = [
  "linear-gradient(135deg,#0A66C2,#004182)",
  "linear-gradient(135deg,#00B85C,#007A3D)",
  "linear-gradient(135deg,#7C3AED,#5B21B6)",
  "linear-gradient(135deg,#DC2626,#991B1B)",
  "linear-gradient(135deg,#D97706,#92400E)",
  "linear-gradient(135deg,#0891B2,#155E75)",
];

const HERO_CARD_COLORS = [
  "linear-gradient(135deg,#7da7e8,#0A66C2)",
  "linear-gradient(135deg,#7fe0ab,#00B85C)",
  "linear-gradient(135deg,#f3a8cf,#d6609e)",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  return name.replace(/\s*\(.*\)\s*$/, "").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

const SAMPLE_ACCOUNTS = [
  { id: "1", linkedinName: "Alex Chen", linkedinHeadline: "VP of Engineering", connectionCount: 8500, industry: "Technology", location: "San Francisco, CA", accountAgeMonths: 96, monthlyPrice: 350, status: "available" as const, profilePhotoUrl: null, hasSalesNav: false },
  { id: "2", linkedinName: "Maria Santos", linkedinHeadline: "Head of Sales", connectionCount: 6200, industry: "SaaS", location: "New York, NY", accountAgeMonths: 72, monthlyPrice: 275, status: "available" as const, profilePhotoUrl: null, hasSalesNav: false },
  { id: "3", linkedinName: "James Wright", linkedinHeadline: "Marketing Director", connectionCount: 5100, industry: "Marketing", location: "Chicago, IL", accountAgeMonths: 60, monthlyPrice: 220, status: "available" as const, profilePhotoUrl: null, hasSalesNav: false },
  { id: "4", linkedinName: "Priya Patel", linkedinHeadline: "Senior Recruiter", connectionCount: 4800, industry: "Recruiting", location: "Austin, TX", accountAgeMonths: 48, monthlyPrice: 200, status: "available" as const, profilePhotoUrl: null, hasSalesNav: true },
  { id: "5", linkedinName: "Tom Nielsen", linkedinHeadline: "Founder & CEO", connectionCount: 3900, industry: "FinTech", location: "Miami, FL", accountAgeMonths: 84, monthlyPrice: 180, status: "available" as const, profilePhotoUrl: null, hasSalesNav: false },
];

export default async function HomePage() {
  let accounts;
  try {
    accounts = await prisma.linkedInAccount.findMany({
      where: { status: "available", listed: true },
      orderBy: { connectionCount: "desc" },
      take: 10,
    });
  } catch {
    accounts = SAMPLE_ACCOUNTS;
  }
  const heroAccounts = accounts.slice(0, 3);
  return (
    <>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box}
        :root{
          --bg:#FAFAF8;--surface:#FFFFFF;--surface-alt:#F3F2EE;--text:#0F1419;--text-mid:#536471;--text-light:#8899A6;--border:#E8E6E1;
          --blue:#0A66C2;--blue-dark:#004182;--blue-light:#E8F1FA;--green:#00B85C;--green-dark:#007A3D;--green-light:#E6F9EE;
          --accent:#1D1B16;--radius:10px;--radius-lg:16px;--radius-xl:24px;
        }
        html{scroll-behavior:smooth}
        body{font-family:var(--font-dm-sans),'DM Sans',system-ui,sans-serif;color:var(--text);background:var(--bg) !important;-webkit-font-smoothing:antialiased;overflow-x:hidden;max-width:100vw}
        .kl-page{overflow-x:hidden}
        .kl-page h1,.kl-page h2,.kl-page h3,.kl-page h4,.kl-page h5{font-family:var(--font-instrument-sans),'Instrument Sans',system-ui,sans-serif;font-weight:600;letter-spacing:-0.02em}
        .nav-cta{padding:8px 20px;background:var(--accent);color:#fff !important;border-radius:var(--radius);font-size:13px;font-weight:600;text-decoration:none;transition:transform .15s,box-shadow .15s}
        .nav-cta:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(15,20,25,0.15)}
        .hero-single{min-height:calc(78vh - 64px);display:flex;align-items:center;position:relative;overflow:hidden;padding:96px 40px;background:linear-gradient(160deg,#0B1A2E 0%,#0A3161 40%,#0A66C2 100%);color:#fff}
        .hero-single::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 22% 72%,rgba(255,255,255,0.07) 0%,transparent 60%);pointer-events:none}
        .hero-single-inner{max-width:1200px;margin:0 auto;width:100%;position:relative}
        .hero-title-lg{font-size:clamp(36px,5vw,58px);line-height:1.08;font-weight:700;letter-spacing:-0.03em;max-width:740px;margin-bottom:20px}
        .hero-desc-lg{font-size:18px;line-height:1.6;opacity:0.82;max-width:560px;margin-bottom:32px}
        .hero-pill{display:inline-flex;align-items:center;gap:8px;font-size:12.5px;font-weight:600;letter-spacing:.04em;color:#fff;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.18);border-radius:999px;padding:6px 14px;margin-bottom:18px}
        .hero-pill-dot{width:7px;height:7px;border-radius:50%;background:#34d399;box-shadow:0 0 0 3px rgba(52,211,153,0.25)}
        .hero-title-lg .hl{color:#34d399;white-space:nowrap}
        .hero-sidedoor{display:inline-flex;align-items:center;gap:6px;margin-top:28px;font-size:14px;color:rgba(255,255,255,0.72);text-decoration:none;transition:color .15s}
        .hero-sidedoor:hover{color:#fff}
        .hero-sidedoor strong{color:#fff;font-weight:600;margin-left:5px}
        .hero-single::after{content:'';position:absolute;bottom:-140px;right:-60px;width:460px;height:460px;background:radial-gradient(closest-side,rgba(0,184,92,0.12),transparent 70%);pointer-events:none}
        .hero-grid{display:grid;grid-template-columns:1.05fr 1fr;gap:48px;align-items:center}
        .hero-cards{position:relative;min-height:360px}
        .gcard{position:absolute;width:300px;background:rgba(255,255,255,0.1);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,0.18);border-radius:16px;padding:16px 18px;box-shadow:0 26px 50px -20px rgba(0,0,0,0.6)}
        .gcard .grow{display:flex;align-items:center;gap:11px}
        .gcard .gav{width:42px;height:42px;border-radius:50%;flex:0 0 42px;position:relative;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:#fff;overflow:hidden}
        .gcard .gav .on{position:absolute;right:-1px;bottom:-1px;width:11px;height:11px;border-radius:50%;background:#34d399;border:2px solid #0a3161}
        .gcard .gnm{font-weight:700;font-size:14px;display:flex;align-items:center;gap:5px}
        .gcard .gvf{color:#7FD3FF}
        .gcard .grl{font-size:12px;color:rgba(255,255,255,0.65);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .gcard .gft{display:flex;align-items:center;justify-content:space-between;margin-top:13px;padding-top:11px;border-top:1px solid rgba(255,255,255,0.14)}
        .gcard .gpr{font-family:var(--font-instrument-sans),'Instrument Sans',sans-serif;font-weight:700;font-size:18px}
        .gcard .gpr small{font-size:11px;color:rgba(255,255,255,0.6);font-weight:400}
        .gcard .gtg{font-size:10.5px;font-weight:600;padding:3px 9px;border-radius:100px;background:rgba(127,211,255,0.18);color:#bfe6ff}
        .gc1{top:0;left:20px;transform:rotate(-3deg);z-index:3}
        .gc2{top:118px;left:120px;transform:rotate(2deg);z-index:2}
        .gc3{top:236px;left:30px;transform:rotate(-1deg);z-index:1;opacity:.95}
        .hero{min-height:calc(100vh - 64px);display:grid;grid-template-columns:1fr 1fr;position:relative}
        .hero-side{padding:80px 60px 60px;display:flex;flex-direction:column;justify-content:flex-end;position:relative;overflow:hidden}
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
        .hero-video-btn{display:inline-flex;align-items:center;gap:10px;background:none;border:none;cursor:pointer;padding:0;transition:opacity .2s;text-decoration:none}
        .hero-video-btn:hover{opacity:0.8}
        .hero-video-play{width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.2);backdrop-filter:blur(8px);border:1.5px solid rgba(255,255,255,0.35);display:flex;align-items:center;justify-content:center;transition:all .2s}
        .hero-video-btn:hover .hero-video-play{background:rgba(255,255,255,0.3);transform:scale(1.08)}
        .hero-video-text{font-size:14px;font-weight:500;color:rgba(255,255,255,0.8);font-family:'DM Sans',system-ui,sans-serif}
        .hero-stats{display:flex;gap:32px;margin-top:40px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.15)}
        .hero-stat-num{font-size:28px;font-weight:700;font-family:var(--font-instrument-sans),'Instrument Sans',sans-serif;letter-spacing:-0.03em}
        .hero-stat-label{font-size:12px;opacity:0.6;margin-top:2px}
        .hero-divider{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:10;width:56px;height:56px;border-radius:50%;background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:var(--text-mid);box-shadow:0 4px 24px rgba(0,0,0,0.1)}
        .proof-bar{background:linear-gradient(180deg,#F3F2EE 0%,#FAFAF8 100%);border-bottom:1px solid var(--border);padding:28px 0}
        .proof-card{background:#fff;border:1px solid var(--border);border-radius:14px;padding:16px 32px;text-align:center;min-width:190px;box-shadow:0 1px 3px rgba(16,24,40,0.04)}
        .proof-inner{max-width:1200px;margin:0 auto;padding:0 40px;display:flex;align-items:center;justify-content:space-between;gap:40px}
        .proof-logos{display:flex;align-items:center;gap:24px}
        .proof-logo{font-size:13px;font-weight:600;color:var(--text-light);letter-spacing:-0.01em;opacity:0.5}
        .proof-stats{display:flex;gap:40px}
        .proof-stat{text-align:center}
        .proof-stat-num{font-size:26px;font-weight:700;font-family:var(--font-instrument-sans),'Instrument Sans',sans-serif;color:var(--blue);letter-spacing:-0.02em}
        .proof-stat-label{font-size:11px;color:var(--text-light);margin-top:2px}
        .kl-section{padding:100px 40px;max-width:1200px;margin:0 auto}
        .section-label{font-size:12px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:var(--blue);margin-bottom:12px}
        .section-title{font-size:clamp(28px,3.5vw,42px);line-height:1.15;letter-spacing:-0.03em;margin-bottom:16px;max-width:600px}
        .section-desc{font-size:16px;color:var(--text-mid);line-height:1.6;max-width:520px;margin-bottom:48px}
        .how-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
        .how-card{padding:36px 32px;border-radius:var(--radius-lg);background:var(--surface);border:1px solid var(--border);position:relative;transition:all .2s}
        .how-card:hover{border-color:var(--green);transform:translateY(-2px);box-shadow:0 16px 36px rgba(0,184,92,0.12)}
        .how-num{width:36px;height:36px;border-radius:11px;background:linear-gradient(135deg,#00B85C,#007A3D);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;margin-bottom:20px;box-shadow:0 10px 20px -8px rgba(0,184,92,0.6)}
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
        .account-meta-item .val{font-size:15px;font-weight:600;font-family:var(--font-instrument-sans),'Instrument Sans',sans-serif}
        .account-meta-item .lbl{font-size:11px;color:var(--text-light);margin-top:1px}
        .account-tags{display:flex;gap:6px;flex-wrap:wrap}
        .account-tag{font-size:11px;padding:4px 10px;border-radius:100px;background:var(--blue-light);color:var(--blue);font-weight:500}
        .account-tag.green{background:var(--green-light);color:var(--green-dark)}
        .account-badge{position:absolute;top:12px;right:12px;font-size:10px;font-weight:600;padding:4px 10px;border-radius:100px;background:var(--green-light);color:var(--green-dark)}
        .account-price{margin-top:16px;padding-top:16px;border-top:1px solid var(--border);display:flex;align-items:baseline;justify-content:space-between}
        .account-price .price{font-size:22px;font-weight:700;font-family:var(--font-instrument-sans),'Instrument Sans',sans-serif;letter-spacing:-0.02em}
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
        .li-stat-num{font-size:16px;font-weight:700;font-family:var(--font-instrument-sans),'Instrument Sans',sans-serif}
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
        .earn-card .earn-amount{font-size:32px;font-weight:700;font-family:var(--font-instrument-sans),'Instrument Sans',sans-serif;letter-spacing:-0.03em;margin-bottom:4px}
        .trust-grid{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center}
        .comparison-table{border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;background:var(--surface)}
        .comparison-table .row{display:grid;grid-template-columns:1fr 1fr 1fr;border-bottom:1px solid var(--border);font-size:14px}
        .comparison-table .row:last-child{border-bottom:none}
        .comparison-table .row.header{font-weight:600;font-size:13px;background:var(--surface-alt)}
        .comparison-table .cell{padding:14px 20px}
        .comparison-table .cell.feature{color:var(--text-mid);font-weight:500}
        .comparison-table .cell.solo{color:var(--text-light)}
        .comparison-table .cell.linkedvelocity{color:var(--blue);font-weight:600}
        .testimonials-bg{background:linear-gradient(160deg,#0B1A2E 0%,#0A3161 45%,#0A66C2 115%);position:relative;overflow:hidden}
        .testimonials-bg::before{content:'';position:absolute;top:-80px;left:10%;width:420px;height:340px;background:radial-gradient(closest-side,rgba(0,184,92,0.16),transparent 70%);pointer-events:none}
        .testimonials-bg .section-label{color:rgba(255,255,255,0.55)}
        .testimonials-bg .section-title{color:#fff}
        .testimonial-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
        .testimonial-card{padding:28px;border-radius:var(--radius-lg);background:rgba(255,255,255,0.08);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,0.14);box-shadow:0 22px 44px -26px rgba(0,0,0,0.5);position:relative}
        .testimonial-quote{font-size:15px;line-height:1.6;color:#fff;margin-bottom:20px;font-style:italic}
        .testimonial-author{display:flex;align-items:center;gap:12px}
        .testimonial-avatar{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:13px;color:#fff}
        .testimonial-name{font-weight:600;font-size:13px;color:#fff}
        .testimonial-role{font-size:12px;color:rgba(255,255,255,0.6)}
        .final-cta{text-align:center;padding:120px 40px;max-width:700px;margin:0 auto;position:relative}
        .final-cta::before{content:'';position:absolute;top:40px;left:50%;transform:translateX(-50%);width:560px;height:300px;background:radial-gradient(closest-side,rgba(0,184,92,0.10),transparent 70%);pointer-events:none;z-index:0}
        .final-cta > *{position:relative;z-index:1}
        .final-cta h2{font-size:clamp(32px,4vw,48px);letter-spacing:-0.03em;margin-bottom:16px}
        .final-cta p{font-size:16px;color:var(--text-mid);margin-bottom:36px;line-height:1.6}
        .cta-row{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
        .btn-blue{padding:16px 32px;border-radius:var(--radius);background:var(--blue);color:#fff;font-size:15px;font-weight:600;text-decoration:none;transition:all .2s;border:none;cursor:pointer}
        .btn-blue:hover{background:var(--blue-dark);transform:translateY(-1px);box-shadow:0 8px 24px rgba(10,102,194,0.2)}
        .btn-green-solid{padding:16px 32px;border-radius:var(--radius);background:var(--green);color:#fff;font-size:15px;font-weight:600;text-decoration:none;transition:all .2s;border:none;cursor:pointer}
        .btn-green-solid:hover{background:var(--green-dark);transform:translateY(-1px);box-shadow:0 8px 24px rgba(0,184,92,0.2)}
        .amb-band{display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap;background:linear-gradient(160deg,#0A2618 0%,#0A4D30 45%,#00B85C 120%);border-radius:var(--radius-xl);padding:36px 44px;color:#fff}
        .amb-band-label{font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,0.55);margin-bottom:8px}
        .amb-band-title{font-family:var(--font-instrument-sans),'Instrument Sans',sans-serif;font-size:24px;font-weight:700;letter-spacing:-0.02em}
        .amb-band-desc{font-size:14px;color:rgba(255,255,255,0.78);margin-top:6px}
        .amb-band-btn{flex-shrink:0;background:#fff;color:#007A3D;font-weight:700;padding:13px 24px;border-radius:var(--radius);text-decoration:none;transition:transform .15s}
        .amb-band-btn:hover{transform:translateY(-1px)}
        .tryit-card{position:relative;overflow:hidden;text-align:center;padding:72px 32px;border-radius:var(--radius-xl);background:linear-gradient(160deg,#0B1A2E 0%,#0A3161 45%,#0A66C2 120%);color:#fff}
        .tryit-card::before{content:'';position:absolute;top:-60px;left:50%;transform:translateX(-50%);width:520px;height:300px;background:radial-gradient(closest-side,rgba(0,184,92,0.2),transparent 70%);pointer-events:none}
        .tryit-card > *{position:relative;z-index:1}
        .tryit-pill{display:inline-flex;align-items:center;gap:8px;font-size:12.5px;font-weight:600;letter-spacing:.04em;color:#fff;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.18);border-radius:999px;padding:6px 14px;margin-bottom:18px}
        .tryit-dot{width:7px;height:7px;border-radius:50%;background:#34d399;box-shadow:0 0 0 3px rgba(52,211,153,0.25)}
        .tryit-title{font-family:var(--font-instrument-sans),'Instrument Sans',sans-serif;font-size:clamp(26px,3vw,38px);font-weight:700;letter-spacing:-0.03em;max-width:600px;margin:0 auto 14px;color:#fff}
        .tryit-desc{font-size:16px;color:rgba(255,255,255,0.82);max-width:520px;margin:0 auto;line-height:1.6}
        .pricing-bg{background:#F3F2EE;border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
        .price-snap{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;align-items:start}
        .price-snap .pt{position:relative;padding:30px 26px;border-radius:var(--radius-lg);background:var(--surface);border:1px solid var(--border);transition:all .2s}
        .price-snap .pt::before{content:'';position:absolute;top:0;left:0;right:0;height:5px;border-radius:var(--radius-lg) var(--radius-lg) 0 0;background:#9cc1ec}
        .price-snap .pt.t-est::before{background:var(--blue)}
        .price-snap .pt.t-prem::before{background:#0B2A52}
        .price-snap .pt:hover{transform:translateY(-4px);box-shadow:0 22px 44px -24px rgba(10,102,194,0.3);border-color:var(--blue)}
        .price-snap .pt.feat{border:2px solid var(--blue);box-shadow:0 30px 60px -26px rgba(10,102,194,0.5);transform:translateY(-14px)}
        .price-snap .pt.feat:hover{transform:translateY(-18px)}
        .price-snap .pt-badge{position:absolute;top:-11px;left:24px;font-size:10.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#fff;background:linear-gradient(135deg,#00B85C,#007A3D);padding:4px 11px;border-radius:999px}
        .price-snap .pt-cat{font-size:10.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--blue);background:var(--blue-light);border-radius:999px;padding:4px 11px;display:inline-block}
        .price-snap .pt.t-est .pt-cat{color:#fff;background:var(--blue)}
        .price-snap .pt.t-prem .pt-cat{color:#fff;background:#0B2A52}
        .price-snap .pt-name{font-family:var(--font-instrument-sans),'Instrument Sans',sans-serif;font-size:19px;font-weight:700;margin-top:13px}
        .price-snap .pt-strength{display:inline-flex;gap:4px;margin-left:9px;vertical-align:middle}
        .price-snap .pt-strength i{width:7px;height:7px;border-radius:50%;background:#D5DBE3;display:inline-block}
        .price-snap .pt-strength i.on{background:var(--blue)}
        .price-snap .pt.t-prem .pt-strength i.on{background:#0B2A52}
        .price-snap .pt-eg{display:flex;align-items:center;gap:11px;margin:14px 0 10px;padding:11px 12px;border:1px solid var(--border);border-radius:12px;background:#FAFBFC}
        .price-snap .pt-eg-av{width:42px;height:42px;border-radius:50%;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;position:relative;flex:0 0 42px}
        .price-snap .pt-eg-dot{position:absolute;right:-1px;bottom:-1px;width:11px;height:11px;border-radius:50%;background:var(--green);border:2px solid #FAFBFC}
        .price-snap .pt-eg-name{font-weight:700;font-size:14px}
        .price-snap .pt-eg-tag{font-size:9px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--text-light);background:#EEF0F4;border-radius:6px;padding:2px 6px;margin-left:6px}
        .price-snap .pt-eg-role{font-size:12px;color:var(--text-mid)}
        .price-snap .pt-egstats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:6px}
        .price-snap .pt-egstats > div{background:#F4F7FB;border-radius:9px;padding:8px 6px;text-align:center}
        .price-snap .pt-egstats b{display:block;font-family:var(--font-instrument-sans),'Instrument Sans',sans-serif;font-size:15px;color:var(--blue)}
        .price-snap .pt-egstats span{font-size:10px;color:var(--text-light)}
        .price-snap .pt p{font-size:13.5px;color:var(--text-mid);line-height:1.55;margin:10px 0 0}
        .price-snap .pt-band{font-size:16px;font-weight:800;color:var(--blue);margin:14px 0 0}
        .price-snap .pt-band small{color:var(--text-light);font-weight:600}
        .kl-footer{background:#0B1A2E;color:rgba(255,255,255,0.7);font-size:13px;text-align:left}
        .foot-inner{max-width:1200px;margin:0 auto;padding:56px 40px 36px;display:grid;grid-template-columns:1.3fr 2fr;gap:48px}
        .foot-logo{display:flex;align-items:center;gap:9px;font-family:var(--font-instrument-sans),'Instrument Sans',sans-serif;font-weight:700;font-size:20px;color:#fff;letter-spacing:-0.02em}
        .foot-mark{width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,var(--blue),#0a4f96);display:flex;align-items:center;justify-content:center;font-size:13px;color:#fff}
        .foot-tag{margin:14px 0 16px;max-width:300px;line-height:1.6;color:rgba(255,255,255,0.6)}
        .foot-chat{display:inline-flex;align-items:center;gap:8px;color:#fff;text-decoration:none;font-weight:600;border:1px solid rgba(255,255,255,0.18);border-radius:10px;padding:9px 14px;font-size:13px;transition:background .15s}
        .foot-chat:hover{background:rgba(255,255,255,0.08)}
        .foot-cols{display:grid;grid-template-columns:repeat(3,1fr);gap:32px}
        .foot-col b{display:block;color:#fff;font-size:12px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:14px;font-weight:700}
        .foot-col a{display:block;color:rgba(255,255,255,0.62);text-decoration:none;margin:9px 0;font-size:14px;transition:color .15s}
        .foot-col a:hover{color:#fff}
        .foot-bottom{border-top:1px solid rgba(255,255,255,0.1);max-width:1200px;margin:0 auto;padding:20px 40px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;color:rgba(255,255,255,0.5);font-size:12.5px}
        .foot-legal{display:flex;gap:20px}
        .foot-legal a{color:rgba(255,255,255,0.5);text-decoration:none}
        .foot-legal a:hover{color:#fff}
        @media(max-width:760px){.foot-inner{grid-template-columns:1fr;gap:32px;padding:40px 20px 28px}.foot-cols{grid-template-columns:1fr 1fr}.foot-bottom{padding:18px 20px}}
        .tg-float{position:fixed;bottom:24px;right:24px;z-index:50;width:56px;height:56px;border-radius:50%;background:#0088cc;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,0.2);transition:transform 0.2s,box-shadow 0.2s;text-decoration:none}
        .tg-float:hover{transform:scale(1.1);box-shadow:0 6px 24px rgba(0,0,0,0.25)}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        .fade-up{animation:fadeUp .6s ease-out both}
        .d1{animation-delay:.1s}.d2{animation-delay:.2s}.d3{animation-delay:.3s}.d4{animation-delay:.4s}
        .mobile-2col{display:grid;grid-template-columns:1fr 1fr;gap:20px}
        .mobile-2col-wide{display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center}
        .mobile-table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
        .mobile-section-pad{padding:80px 40px}
        @media(max-width:900px){
          .hero{grid-template-columns:1fr;min-height:auto}
          .hero-side{padding:48px 24px 40px}
          .hero-title{font-size:28px}
          .hero-desc{font-size:14px}
          .hero-stats{gap:20px;flex-wrap:wrap}
          .hero-stat-num{font-size:22px}
          .hero-divider{position:relative;top:auto;left:auto;transform:none;margin:-28px auto}
          .how-grid,.earn-grid,.testimonial-grid,.price-snap{grid-template-columns:1fr}
          .trust-grid{grid-template-columns:1fr}
          .browser-section .kl-section > div{grid-template-columns:1fr}
          .account-grid{grid-template-columns:1fr}
          .nav-links{display:none}
          .proof-inner{flex-direction:column;text-align:center}
          .ambassador-section{margin:0 16px;padding:40px 20px}
          .kl-section{padding:48px 16px}
          .mobile-2col,.mobile-2col-wide{grid-template-columns:1fr;gap:20px}
          .mobile-section-pad{padding:48px 16px !important}
          .cat-inner{padding:24px 16px 60px}
          .hero-btn{padding:12px 20px;font-size:13px}
          .hero-single{padding:48px 20px;min-height:auto}
          .hero-title-lg{font-size:30px}
          .hero-desc-lg{font-size:15px}
          .hero-grid{grid-template-columns:1fr;gap:28px}
          .hero-cards{min-height:0;display:flex;flex-direction:column;gap:14px;margin-top:8px}
          .gcard{position:static;width:100%}
          .gc1,.gc2,.gc3{transform:none}
          .hero-video-text{display:none}
        }
      `}</style>

      <div className={`kl-page ${dmSans.variable} ${instrumentSans.variable}`}>
        {/* HERO — renter-first. Headline + real available-account cards. Ambassador entry is a discreet side door. */}
        <section className="hero-single">
          <div className="hero-single-inner hero-grid">
            <div>
              <div className="hero-pill fade-up"><span className="hero-pill-dot" /> For growth &amp; outreach teams</div>
              <h1 className="hero-title-lg fade-up d1">Scale LinkedIn outreach<br /><span className="hl">without the limits</span></h1>
              <p className="hero-desc-lg fade-up d2">Rent verified, pre-warmed LinkedIn accounts with real connections and established histories. Run parallel campaigns and hit pipeline targets in weeks, not quarters.</p>
              <div className="fade-up d3" style={{display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
                <Link href="/catalogue" className="hero-btn hero-btn-solid">Browse Available Accounts →</Link>
                <a href="#how" className="hero-btn hero-btn-white">See how it works</a>
              </div>
              <div className="hero-stats fade-up d4">
                <div><div className="hero-stat-num">847</div><div className="hero-stat-label">Accounts live</div></div>
                <div><div className="hero-stat-num">3.2M</div><div className="hero-stat-label">Messages sent</div></div>
                <div><div className="hero-stat-num">98%</div><div className="hero-stat-label">Uptime</div></div>
              </div>
              <Link href="/become-ambassador" className="hero-sidedoor fade-up d4">Own a LinkedIn account? <strong>Earn $10–$500/mo sharing it →</strong></Link>
            </div>
            <div className="hero-cards fade-up d3">
              {heroAccounts.map((a, i) => {
                const dn = a.linkedinName.replace(/\s*\(.*\)\s*$/, "");
                const tag = `${a.connectionCount > 0 ? formatNumber(a.connectionCount) + " conn." : "Established"}${a.hasSalesNav ? " · Sales Nav" : ""}`;
                return (
                  <div key={a.id} className={`gcard gc${i + 1}`}>
                    <div className="grow">
                      <div className="gav" style={{background:HERO_CARD_COLORS[i % HERO_CARD_COLORS.length]}}>
                        {getInitials(a.linkedinName)}
                        <span className="on" />
                      </div>
                      <div>
                        <div className="gnm">{dn} <span className="gvf">✔</span></div>
                        <div className="grl">{a.linkedinHeadline || a.industry || "LinkedIn account"}</div>
                      </div>
                    </div>
                    <div className="gft">
                      <span className="gtg">{tag}</span>
                      <span className="gpr">{formatCurrency(Number(a.monthlyPrice))}<small>/mo</small></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* SOCIAL PROOF BAR */}
        {/* TODO before full launch: replace these placeholder numbers (237 / 847 / 0) with real figures */}
        <div className="proof-bar">
          <div className="proof-inner" style={{justifyContent:'center',gap:20}}>
            <div className="proof-card">
              <div className="proof-stat-num" id="counter-teams" suppressHydrationWarning>237</div>
              <div className="proof-stat-label">Teams using LinkedVelocity</div>
            </div>
            <div className="proof-card">
              <div className="proof-stat-num" id="counter-accounts" suppressHydrationWarning>847</div>
              <div className="proof-stat-label">Verified accounts provided</div>
            </div>
            <div className="proof-card">
              <div className="proof-stat-num" style={{color:'#00B85C'}}>0</div>
              <div className="proof-stat-label">Accounts restricted</div>
            </div>
          </div>
        </div>
        <script dangerouslySetInnerHTML={{__html: `
          (function(){
            function animateCounter(id, target, duration) {
              var el = document.getElementById(id);
              if (!el) return;
              var start = 0, startTime = null;
              function step(ts) {
                if (!startTime) startTime = ts;
                var progress = Math.min((ts - startTime) / duration, 1);
                var ease = 1 - Math.pow(1 - progress, 3);
                var current = Math.floor(ease * target);
                el.textContent = current.toLocaleString();
                if (progress < 1) requestAnimationFrame(step);
              }
              requestAnimationFrame(step);
              // Slowly increment after initial animation
              setTimeout(function() {
                setInterval(function() {
                  target += 1;
                  el.textContent = target.toLocaleString();
                }, Math.random() * 8000 + 12000);
              }, duration + 1000);
            }
            animateCounter('counter-teams', 237, 2000);
            animateCounter('counter-accounts', 847, 2500);
          })();
        `}} />

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

        {/* PRICING SNAPSHOT — full tier cards; deeper explainer at /pricing */}
        {/* TODO before full launch: replace illustrative price bands with real ranges */}
        <section className="pricing-bg" id="pricing">
          <div className="kl-section">
            <div className="section-label">Pricing</div>
            <div className="section-title">Pay per account — priced by quality</div>
            <div className="section-desc">Every profile is priced on its own merits. Compare the tiers, then see full details.</div>
            <div className="price-snap">
              <div className="pt t-basic">
                <span className="pt-cat">Entry</span>
                <div className="pt-name">New / Basic <span className="pt-strength"><i className="on" /><i /><i /></span></div>
                <div className="pt-eg">
                  <div className="pt-eg-av" style={{background:'linear-gradient(135deg,#9cc1ec,#5b91d1)'}}>JT<span className="pt-eg-dot" /></div>
                  <div><div><span className="pt-eg-name">Jordan T.</span><span className="pt-eg-tag">Example</span></div><div className="pt-eg-role">Sales Associate</div></div>
                </div>
                <div className="pt-egstats">
                  <div><b>~900</b><span>connections</span></div>
                  <div><b>1 yr</b><span>account age</span></div>
                  <div><b style={{color:'#C4CAD3'}}>—</b><span>Sales Nav</span></div>
                </div>
                <p>Newer profiles, fewer connections. Great for testing.</p>
                <div className="pt-band">Lower price <small>· from ~$40/mo</small></div>
              </div>
              <div className="pt feat t-est">
                <span className="pt-badge">Most popular</span>
                <span className="pt-cat">Sweet spot</span>
                <div className="pt-name">Established <span className="pt-strength"><i className="on" /><i className="on" /><i /></span></div>
                <div className="pt-eg">
                  <div className="pt-eg-av" style={{background:'linear-gradient(135deg,#4f90d9,#0A66C2)'}}>AK<span className="pt-eg-dot" /></div>
                  <div><div><span className="pt-eg-name">Anna K.</span><span className="pt-eg-tag">Example</span></div><div className="pt-eg-role">Marketing Manager</div></div>
                </div>
                <div className="pt-egstats">
                  <div><b>4,200</b><span>connections</span></div>
                  <div><b>4 yrs</b><span>account age</span></div>
                  <div><b style={{color:'#00B85C'}}>✓</b><span>Sales Nav</span></div>
                </div>
                <p>Solid connections, aged &amp; trusted. The sweet spot.</p>
                <div className="pt-band">Mid price <small>· ~$90–$130/mo</small></div>
              </div>
              <div className="pt t-prem">
                <span className="pt-cat">Top tier</span>
                <div className="pt-name">Premium <span className="pt-strength"><i className="on" /><i className="on" /><i className="on" /></span></div>
                <div className="pt-eg">
                  <div className="pt-eg-av" style={{background:'linear-gradient(135deg,#0A66C2,#0B2A52)'}}>ML<span className="pt-eg-dot" /></div>
                  <div><div><span className="pt-eg-name">Marcus L.</span><span className="pt-eg-tag">Example</span></div><div className="pt-eg-role">VP of Sales</div></div>
                </div>
                <div className="pt-egstats">
                  <div><b>12,000</b><span>connections</span></div>
                  <div><b>9 yrs</b><span>account age</span></div>
                  <div><b style={{color:'#00B85C'}}>✓</b><span>Sales Nav</span></div>
                </div>
                <p>Large senior network + Sales Navigator. Maximum reach.</p>
                <div className="pt-band">Top price <small>· $150+/mo</small></div>
              </div>
            </div>
            <div className="browse-all"><Link href="/pricing">See full pricing details →</Link></div>
          </div>
        </section>

        {/* LINKEDVELOCITY BROWSER */}
        <section className="browser-section">
          <div className="kl-section">
            <div className="mobile-2col-wide">
              <div>
                <div className="section-label" style={{display:'flex',alignItems:'center',gap:8}}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="11" stroke="#FF6B00" strokeWidth="2"/><path d="M8 12.5L11 15.5L16.5 9" stroke="#FF6B00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Powered by GoLogin
                </div>
                <div className="section-title">Seamless account sharing powered by GoLogin — invisible to LinkedIn</div>
                <div className="section-desc">We&apos;ve partnered with <strong>GoLogin</strong>, the industry-leading anti-detect browser, to make account sharing completely seamless. Each shared account runs through a dedicated browser profile with its own proxy, cookies, and fingerprint — so LinkedIn sees one consistent user, no matter who&apos;s logged in.</div>
                <div className="browser-features">
                  <div className="browser-feature">
                    <div className="browser-feature-icon" style={{background:'var(--blue-light)',color:'var(--blue)'}}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    </div>
                    <div>
                      <h4>Shared proxy session</h4>
                      <p>Both the account owner and renter connect through the same proxy location via GoLogin. LinkedIn sees one consistent login origin — no flags, no suspicion.</p>
                    </div>
                  </div>
                  <div className="browser-feature">
                    <div className="browser-feature-icon" style={{background:'var(--green-light)',color:'var(--green)'}}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                    </div>
                    <div>
                      <h4>Unified cookie environment</h4>
                      <p>GoLogin keeps both parties sharing the same browser cookies and session data. No conflicting logins, no &quot;new device&quot; alerts. It looks like one person, one device.</p>
                    </div>
                  </div>
                  <div className="browser-feature">
                    <div className="browser-feature-icon" style={{background:'var(--blue-light)',color:'var(--blue)'}}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    </div>
                    <div>
                      <h4>Simultaneous access</h4>
                      <p>Both the account owner and renter can be logged in at the same time. No kicking each other out, no session conflicts — it just works throughout the rental period.</p>
                    </div>
                  </div>
                  <div className="browser-feature">
                    <div className="browser-feature-icon" style={{background:'var(--green-light)',color:'var(--green)'}}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </div>
                    <div>
                      <h4>Zero detection in 12 months</h4>
                      <p>Across thousands of active rentals, not a single account has been flagged by LinkedIn. GoLogin&apos;s anti-detect technology makes shared access indistinguishable from normal use.</p>
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

        {/* TRY IT YOURSELF */}
        <section>
          <div className="kl-section">
            <div className="tryit-card">
              <div className="tryit-pill"><span className="tryit-dot" /> Interactive demo</div>
              <h2 className="tryit-title">Don&apos;t take our word for it — open a real account</h2>
              <p className="tryit-desc">Click below and a live LinkedIn account opens right in your browser — no password, no verification, no setup. Exactly what every renter gets on LinkedVelocity.</p>
              <TestAccountGate />
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
            {accounts.length === 0 ? (
              <div style={{textAlign:'center',padding:'60px 20px',color:'var(--text-mid)'}}>
                <p style={{fontSize:16,fontWeight:500}}>No accounts available yet</p>
                <p style={{fontSize:14,marginTop:8}}>Check back soon — new profiles are added regularly.</p>
              </div>
            ) : (
              <div className="account-grid">
                {accounts.slice(0, 6).map((a) => {
                  const displayName = a.linkedinName.replace(/\s*\(.*\)\s*$/, "");
                  const initials = getInitials(a.linkedinName);
                  const ageYears = a.accountAgeMonths ? Math.floor(a.accountAgeMonths / 12) : null;
                  const price = Number(a.monthlyPrice);
                  return (
                    <Link href={`/account/${a.id}`} key={a.id} className="account-card" style={{display:'block',textDecoration:'none',color:'inherit'}}>
                      <div className="account-badge">Available</div>
                      <div className="account-header">
                        <div className="account-avatar" style={{background:getAvatarColor(a.linkedinName)}}>
                          {a.profilePhotoUrl ? (
                            <Image src={a.profilePhotoUrl} alt={displayName} width={48} height={48} style={{objectFit:'cover',borderRadius:12}} loading="lazy" />
                          ) : initials}
                        </div>
                        <div>
                          <div className="account-name">{displayName}</div>
                          <div className="account-role">{a.linkedinHeadline || a.industry || 'LinkedIn account'}</div>
                        </div>
                      </div>
                      <div className="account-meta">
                        <div className="account-meta-item"><div className="val">{a.connectionCount > 0 ? formatNumber(a.connectionCount) : '—'}</div><div className="lbl">Connections</div></div>
                        <div className="account-meta-item"><div className="val">{ageYears && ageYears > 0 ? `${ageYears}+ yrs` : '—'}</div><div className="lbl">Account age</div></div>
                      </div>
                      <div className="account-tags">
                        {a.industry && <span className="account-tag">{a.industry}</span>}
                        {a.hasSalesNav && <span className="account-tag green">Sales Nav</span>}
                        {a.location && <span className="account-tag">{a.location}</span>}
                      </div>
                      <div className="account-price">
                        <div><span className="price">{formatCurrency(price)}</span><span className="period">/mo</span></div>
                        <span className="rent-btn">View profile</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
            <div className="browse-all"><Link href="/catalogue">View all accounts →</Link></div>
          </div>
        </section>

        {/* WHY RENT ACCOUNTS */}
        <section className="mobile-section-pad" style={{background:'linear-gradient(160deg,#0B1A2E 0%,#0A3161 40%,#0A66C2 100%)',padding:'80px 40px',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',inset:0,background:'radial-gradient(circle at 70% 30%,rgba(255,255,255,0.05) 0%,transparent 60%)',pointerEvents:'none'}} />
          <div style={{maxWidth:1200,margin:'0 auto',position:'relative'}}>
            <div style={{textAlign:'center',marginBottom:48}}>
              <div style={{fontSize:12,fontWeight:600,letterSpacing:'0.12em',textTransform:'uppercase',color:'rgba(255,255,255,0.5)',marginBottom:12}}>Why rent accounts</div>
              <h2 style={{fontSize:'clamp(28px,3.5vw,40px)',fontWeight:700,letterSpacing:'-0.03em',color:'#fff',marginBottom:16,fontFamily:'Instrument Sans,sans-serif'}}>LinkedIn is powerful — but limited</h2>
              <p style={{fontSize:16,color:'rgba(255,255,255,0.7)',maxWidth:600,margin:'0 auto',lineHeight:1.7}}>
                With a single account, you&#39;re limited to around 100 connection requests per week, approximately 50 messages and InMails, and just one campaign at a time. LinkedVelocity removes those limits by giving you access to multiple verified accounts.
              </p>
            </div>

            <div style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.14)',borderRadius:16,padding:'24px 16px',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)'}}>
              <h3 style={{fontSize:22,fontWeight:700,letterSpacing:'-0.02em',color:'#fff',marginBottom:24,fontFamily:'Instrument Sans,sans-serif'}}>Scale with real, verified accounts</h3>
              <div className="mobile-2col">
                <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
                  <div style={{width:32,height:32,borderRadius:'50%',background:'rgba(0,184,92,0.28)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="#fff"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  </div>
                  <div>
                    <h4 style={{fontSize:14,fontWeight:600,color:'#fff',marginBottom:2}}>Real people, verified by LinkedIn</h4>
                    <p style={{fontSize:13,color:'rgba(255,255,255,0.6)',lineHeight:1.5}}>No bots or fakes. Accounts that won&#39;t get restricted.</p>
                  </div>
                </div>
                <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
                  <div style={{width:32,height:32,borderRadius:'50%',background:'rgba(0,184,92,0.28)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="#fff"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  </div>
                  <div>
                    <h4 style={{fontSize:14,fontWeight:600,color:'#fff',marginBottom:2}}>Works with Chrome extensions</h4>
                    <p style={{fontSize:13,color:'rgba(255,255,255,0.6)',lineHeight:1.5}}>PhantomBuster, custom AI tools, or any automation you use.</p>
                  </div>
                </div>
                <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
                  <div style={{width:32,height:32,borderRadius:'50%',background:'rgba(0,184,92,0.28)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="#fff"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  </div>
                  <div>
                    <h4 style={{fontSize:14,fontWeight:600,color:'#fff',marginBottom:2}}>Scale in minutes</h4>
                    <p style={{fontSize:13,color:'rgba(255,255,255,0.6)',lineHeight:1.5}}>Go from one campaign to ten without hiring.</p>
                  </div>
                </div>
                <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
                  <div style={{width:32,height:32,borderRadius:'50%',background:'rgba(0,184,92,0.28)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="#fff"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  </div>
                  <div>
                    <h4 style={{fontSize:14,fontWeight:600,color:'#fff',marginBottom:2}}>No restriction risk</h4>
                    <p style={{fontSize:13,color:'rgba(255,255,255,0.6)',lineHeight:1.5}}>Genuine profiles don&#39;t trigger LinkedIn&#39;s spam detection.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* AMBASSADOR — slim band that routes to the dedicated ambassador page */}
        <section id="ambassador" style={{padding:'20px 40px 100px'}}>
          <div style={{maxWidth:1200,margin:'0 auto'}}>
            <div className="amb-band">
              <div>
                <div className="amb-band-label">For professionals</div>
                <div className="amb-band-title">Own a LinkedIn account? Earn $10–$500/mo.</div>
                <p className="amb-band-desc">List your profile and get paid every month — guaranteed, whether we find a renter or not.</p>
              </div>
              <Link href="/become-ambassador" className="amb-band-btn">Learn about earning →</Link>
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
                <div className="testimonial-quote">&quot;We went from 200 connection requests a week to over 2,000. Our pipeline tripled in the first month. LinkedVelocity is a no-brainer for any outbound team.&quot;</div>
                <div className="testimonial-author">
                  <div className="testimonial-avatar" style={{background:'var(--blue)'}}>DM</div>
                  <div><div className="testimonial-name">David M.</div><div className="testimonial-role">Head of Growth, Series B SaaS</div></div>
                </div>
              </div>
              <div className="testimonial-card">
                <div className="testimonial-quote">&quot;We spun up five accounts and split our outreach across industries. We booked more qualified demos in a month than the whole previous quarter.&quot;</div>
                <div className="testimonial-author">
                  <div className="testimonial-avatar" style={{background:'var(--green)'}}>SK</div>
                  <div><div className="testimonial-name">Sana K.</div><div className="testimonial-role">Demand Gen Lead, B2B SaaS</div></div>
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

        {/* FINAL CTA — renter-focused */}
        <section className="final-cta">
          <h2>Ready to break through LinkedIn&apos;s ceiling?</h2>
          <p>Rent verified, pre-warmed accounts and scale your outreach today.</p>
          <div className="cta-row">
            <Link href="/catalogue" className="btn-blue">Browse Accounts →</Link>
          </div>
          <p style={{marginTop:20,fontSize:14,color:'var(--text-mid)'}}>Own a LinkedIn account? <Link href="/become-ambassador" style={{color:'var(--blue)',fontWeight:600,textDecoration:'none'}}>Earn by sharing it →</Link></p>
        </section>

        {/* Footer is now global (src/components/layout/footer.tsx) via the root layout */}

        {/* Telegram floating chat button */}
        <a
          href="https://t.me/linkedvelocity_support_bot"
          target="_blank"
          rel="noopener noreferrer"
          className="tg-float"
          aria-label="Chat with us on Telegram"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
        </a>
      </div>
    </>
  );
}
