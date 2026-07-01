"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { catColor } from "@/lib/blog-fonts";
import type { BlogCard } from "../blog-index";

const F_POP = "var(--font-poppins),system-ui,sans-serif";
const F_INT = "var(--font-inter),system-ui,sans-serif";
const F_MONO = "var(--font-jbmono),monospace";
const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
const thumbBg = (cat: string) => { const [bg] = catColor(cat); return `repeating-linear-gradient(135deg, ${bg} 0, ${bg} 15px, #FFFFFF 15px, #FFFFFF 30px)`; };
const pill = (cat: string): React.CSSProperties => { const [bg, fg] = catColor(cat); return { display: "inline-block", background: bg, color: fg, fontFamily: F_MONO, fontSize: 11, fontWeight: 500, letterSpacing: ".08em", textTransform: "uppercase", padding: "5px 11px", borderRadius: 6 }; };

interface Post { slug: string; title: string; description: string; category: string; date: string; readTime: string; }

export default function ArticleView({ post, html, related }: { post: Post; html: string; related: BlogCard[] }) {
  const [progress, setProgress] = useState(0);
  const [toc, setToc] = useState<{ id: string; label: string }[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onScroll = () => { const max = document.documentElement.scrollHeight - window.innerHeight; setProgress(max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0); };
    window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
    // build TOC from the rendered h2s
    const art = document.getElementById("lv-article");
    let io: IntersectionObserver | undefined;
    if (art) {
      const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const hs = Array.from(art.querySelectorAll("h2"));
      hs.forEach((h) => { if (!h.id) h.id = slug(h.textContent || ""); });
      setToc(hs.map((h) => ({ id: h.id, label: h.textContent || "" })));
      io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) setActiveId((e.target as HTMLElement).id); }), { rootMargin: "-84px 0px -68% 0px" });
      hs.forEach((h) => io!.observe(h));
    }
    return () => { window.removeEventListener("scroll", onScroll); io?.disconnect(); };
  }, [html]);

  const go = (id: string) => { const el = document.getElementById(id); if (!el) return; window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 90, behavior: "smooth" }); setActiveId(id); };
  const shareUrl = typeof window !== "undefined" ? window.location.href : `https://linkedvelocity.com/blog/${post.slug}`;
  const copyLink = () => { navigator.clipboard?.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1600); };
  const iconBtn: React.CSSProperties = { width: 34, height: 34, borderRadius: 9, border: "1px solid #E1E4EA", display: "flex", alignItems: "center", justifyContent: "center", color: "#5A6473", fontSize: 13, textDecoration: "none", cursor: "pointer" };

  return (
    <div style={{ fontFamily: F_INT, color: "#0B1220", background: "#fff" }}>
      {/* progress bar */}
      <div style={{ position: "fixed", top: 0, left: 0, height: 3, width: `${progress}%`, background: "linear-gradient(90deg,#0A66C2,#00B85C)", zIndex: 60, transition: "width .08s linear" }} />

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "34px 40px 0" }}>
        <Link href="/blog" style={{ fontSize: 14, color: "#5A6473", textDecoration: "none", fontWeight: 500 }}>← Back to Blog</Link>
      </div>

      {/* header */}
      <header style={{ maxWidth: 780, margin: "0 auto", padding: "26px 40px 34px", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 20 }}>
          <span style={pill(post.category)}>{post.category}</span>
          <span style={{ fontSize: 13.5, color: "#8A93A2" }}>{fmtDate(post.date)} · {post.readTime}</span>
        </div>
        <h1 style={{ fontFamily: F_POP, fontWeight: 700, fontSize: 46, lineHeight: 1.1, letterSpacing: "-.025em", margin: "0 0 20px" }}>{post.title}</h1>
        <p style={{ fontSize: 20, lineHeight: 1.55, color: "#5A6473", margin: "0 auto", maxWidth: 640 }}>{post.description}</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 26 }}>
          <span style={{ width: 40, height: 40, borderRadius: "50%", background: "#0A66C2", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F_POP, fontWeight: 600, fontSize: 14 }}>LV</span>
          <div style={{ textAlign: "left" }}><div style={{ fontSize: 14.5, fontWeight: 600 }}>LinkedVelocity Team</div><div style={{ fontSize: 13, color: "#8A93A2" }}>Growth &amp; Outbound</div></div>
          <div style={{ width: 1, height: 28, background: "#E6E8EC", margin: "0 6px" }} />
          <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" style={iconBtn}>in</a>
          <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(post.title)}`} target="_blank" rel="noopener noreferrer" style={iconBtn}>𝕏</a>
          <button onClick={copyLink} style={{ ...iconBtn, width: "auto", padding: "0 14px", background: "#fff" }}>{copied ? "Copied ✓" : "Copy link"}</button>
        </div>
      </header>

      {/* cover */}
      <div style={{ maxWidth: 980, margin: "0 auto 8px", padding: "0 40px" }}>
        <div style={{ width: "100%", height: 440, borderRadius: 18, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", backgroundImage: thumbBg(post.category) }}>
          <span style={{ fontFamily: F_MONO, fontSize: 14, letterSpacing: ".18em", textTransform: "uppercase", color: catColor(post.category)[1], opacity: 0.7 }}>{post.category}</span>
        </div>
      </div>

      {/* body grid */}
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 40px 20px", display: "grid", gridTemplateColumns: "240px minmax(0,720px)", gap: 72, justifyContent: "center", alignItems: "start" }}>
        <aside style={{ position: "sticky", top: 96, alignSelf: "start" }} className="lv-toc">
          <div style={{ fontFamily: F_MONO, fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "#8A93A2", marginBottom: 16, paddingLeft: 16 }}>On this page</div>
          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {toc.map((t, i) => (
              <button key={t.id} onClick={() => go(t.id)} style={{ display: "block", width: "100%", textAlign: "left", cursor: "pointer", fontFamily: F_INT, fontSize: 13.5, lineHeight: 1.4, fontWeight: t.id === activeId ? 600 : 500, color: t.id === activeId ? "#0B1220" : "#5A6473", background: "transparent", border: "none", borderLeft: "2px solid " + (t.id === activeId ? "#0A66C2" : "#E6E8EC"), padding: "8px 0 8px 14px" }}><span style={{ fontFamily: F_MONO, fontSize: 11, color: t.id === activeId ? "#0A66C2" : "#B0B7C2", marginRight: 10 }}>{("0" + (i + 1)).slice(-2)}</span>{t.label}</button>
            ))}
          </nav>
          <div style={{ marginTop: 26, padding: 18, background: "#F6F8FA", border: "1px solid #E6E8EC", borderRadius: 12 }}>
            <div style={{ fontSize: 13, color: "#5A6473", lineHeight: 1.5, marginBottom: 12 }}>Ready to scale your outreach?</div>
            <Link href="/catalogue" style={{ fontSize: 13.5, fontWeight: 600, color: "#0A66C2", textDecoration: "none" }}>Browse accounts →</Link>
          </div>
        </aside>

        <article id="lv-article" className="lv-prose" dangerouslySetInnerHTML={{ __html: html }} />
      </div>

      {/* CTA */}
      <div style={{ maxWidth: 980, margin: "24px auto 0", padding: "0 40px" }}>
        <div style={{ background: "radial-gradient(120% 120% at 15% 0%, #12305F 0%, #0A1826 60%)", borderRadius: 20, padding: "44px 48px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 32, flexWrap: "wrap", color: "#EAF0FA" }}>
          <div style={{ maxWidth: 520 }}>
            <div style={{ fontFamily: F_POP, fontWeight: 700, fontSize: 26, lineHeight: 1.2, color: "#fff", marginBottom: 10 }}>Scale your LinkedIn outreach</div>
            <p style={{ fontSize: 16, lineHeight: 1.55, color: "#AFC0D6", margin: 0 }}>Browse pre-warmed, verified LinkedIn accounts ready for campaigns. Instant access, cancel anytime.</p>
          </div>
          <Link href="/catalogue" style={{ fontSize: 16, fontWeight: 600, color: "#0B1220", background: "#fff", padding: "15px 26px", borderRadius: 12, whiteSpace: "nowrap", textDecoration: "none" }}>Browse Available Accounts →</Link>
        </div>
      </div>

      {/* author bio */}
      <div style={{ maxWidth: 980, margin: "28px auto 0", padding: "0 40px" }}>
        <div style={{ display: "flex", gap: 18, alignItems: "flex-start", background: "#F7F8FA", border: "1px solid #E6E8EC", borderRadius: 16, padding: "24px 26px" }}>
          <span style={{ width: 56, height: 56, borderRadius: "50%", background: "#0A66C2", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F_POP, fontWeight: 600, fontSize: 18, flexShrink: 0 }}>LV</span>
          <div>
            <div style={{ fontFamily: F_MONO, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "#8A93A2", marginBottom: 6 }}>Written by</div>
            <div style={{ fontFamily: F_POP, fontWeight: 600, fontSize: 17, marginBottom: 6 }}>The LinkedVelocity Team</div>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "#5A6473", margin: 0, maxWidth: 620 }}>We help B2B teams scale LinkedIn outreach — credibly and safely. We write about prospecting, deliverability, and running outreach at scale without tripping restrictions.</p>
          </div>
        </div>
      </div>

      {/* related */}
      {related.length > 0 && (
        <div style={{ maxWidth: 1180, margin: "56px auto 0", padding: "0 40px 72px" }}>
          <div style={{ fontFamily: F_POP, fontWeight: 600, fontSize: 22, marginBottom: 20 }}>Keep reading</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 22 }}>
            {related.map((r) => (
              <Link key={r.slug} href={`/blog/${r.slug}`} style={{ background: "#fff", border: "1px solid #E6E8EC", borderRadius: 16, overflow: "hidden", textDecoration: "none", color: "inherit" }}>
                <div style={{ width: "100%", height: 150, display: "flex", alignItems: "center", justifyContent: "center", backgroundImage: thumbBg(r.category) }}><span style={{ fontFamily: F_MONO, fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: catColor(r.category)[1], opacity: 0.7 }}>{r.category}</span></div>
                <div style={{ padding: "16px 18px 18px" }}>
                  <span style={{ ...pill(r.category), fontSize: 10.5, marginBottom: 10 }}>{r.category}</span>
                  <h4 style={{ fontFamily: F_POP, fontWeight: 600, fontSize: 16, lineHeight: 1.3, margin: "10px 0 0" }}>{r.title}</h4>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* scoped prose + responsive */}
      <style>{`
        .lv-prose{min-width:0;font-family:${F_INT}}
        .lv-prose > p{font-size:17px;line-height:1.8;color:#37424F;margin:0 0 22px}
        .lv-prose h2{font-family:${F_POP};font-weight:700;font-size:30px;line-height:1.2;letter-spacing:-.02em;margin:52px 0 16px;color:#0B1220}
        .lv-prose h3{font-family:${F_POP};font-weight:600;font-size:20px;color:#0B1220;margin:34px 0 12px}
        .lv-prose ul,.lv-prose ol{margin:0 0 22px;padding-left:22px}
        .lv-prose li{font-size:17px;line-height:1.7;color:#37424F;margin-bottom:10px}
        .lv-prose strong{font-weight:700;color:#0B1220}
        .lv-prose em{color:#5A6473}
        .lv-prose a{color:#0A66C2;text-decoration:underline;text-underline-offset:2px;font-weight:500}
        .lv-prose a:hover{color:#084d93}
        .lv-prose blockquote{margin:34px 0;padding:6px 0 6px 26px;border-left:4px solid #0A66C2}
        .lv-prose blockquote p{font-family:${F_POP};font-weight:600;font-size:23px;line-height:1.4;color:#0B1220;margin:0}
        .lv-prose table{width:100%;border-collapse:collapse;font-size:15px;margin:24px 0}
        .lv-prose th{background:#0F2439;color:#fff;text-align:left;padding:13px 16px;font-weight:600}
        .lv-prose td{padding:13px 16px;border-bottom:1px solid #EAECEF;color:#37424F}
        .lv-prose tbody tr:nth-child(even){background:#F7F9FC}
        .lv-prose hr{border:none;border-top:1px solid #E6E8EC;margin:38px 0}
        @media(max-width:900px){
          .lv-toc{display:none}
          .lv-prose{grid-column:1 / -1}
        }
      `}</style>
    </div>
  );
}
