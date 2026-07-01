"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { catColor } from "@/lib/blog-fonts";

export interface BlogCard { slug: string; title: string; description: string; category: string; date: string; readTime: string; }

const F_POP = "var(--font-poppins),system-ui,sans-serif";
const F_INT = "var(--font-inter),system-ui,sans-serif";
const F_MONO = "var(--font-jbmono),monospace";

const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
// branded fallback thumbnail: category-tinted diagonal pattern + label
const thumbBg = (cat: string) => { const [bg] = catColor(cat); return `repeating-linear-gradient(135deg, ${bg} 0, ${bg} 15px, #FFFFFF 15px, #FFFFFF 30px)`; };

const pill = (cat: string): React.CSSProperties => { const [bg, fg] = catColor(cat); return { display: "inline-block", background: bg, color: fg, fontFamily: F_MONO, fontSize: 10.5, fontWeight: 500, letterSpacing: ".08em", textTransform: "uppercase", padding: "4px 9px", borderRadius: 6, whiteSpace: "nowrap" }; };

export default function BlogIndex({ posts }: { posts: BlogCard[] }) {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState("All");
  const [view, setView] = useState<"grid" | "list">("grid");

  const sorted = useMemo(() => [...posts].sort((a, b) => b.date.localeCompare(a.date)), [posts]);
  const cats = useMemo(() => {
    const counts: Record<string, number> = {};
    sorted.forEach((p) => (counts[p.category] = (counts[p.category] || 0) + 1));
    const order = ["LinkedIn Strategy", "Sales Strategy", "Tools", "LinkedIn Compliance", "Compliance", "LinkedIn Limits", "Deliverability", "Getting Started", "Ambassadors", "Market & Competitive", "Case Studies"];
    const present = order.filter((c) => counts[c]);
    Object.keys(counts).forEach((c) => { if (!present.includes(c)) present.push(c); });
    return present.map((name) => ({ name, count: counts[name] }));
  }, [sorted]);

  const q = query.trim().toLowerCase();
  const filtered = sorted.filter((p) => (activeCat === "All" || p.category === activeCat) && (!q || `${p.title} ${p.description} ${p.category}`.toLowerCase().includes(q)));
  const showFeatured = activeCat === "All" && !q && filtered.length > 0;
  const featured = showFeatured ? filtered[0] : null;
  const grid = showFeatured ? filtered.filter((p) => p.slug !== featured!.slug) : filtered;

  let resultLine = activeCat !== "All" ? activeCat : q ? "Search results" : "All articles";
  resultLine += ` · ${filtered.length} article${filtered.length === 1 ? "" : "s"}`;

  const catPill = (active: boolean): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: F_INT, fontSize: 13.5, fontWeight: 600, padding: "8px 14px", borderRadius: 999, cursor: "pointer", border: "1px solid " + (active ? "#0A66C2" : "#E1E4EA"), background: active ? "#0A66C2" : "#fff", color: active ? "#fff" : "#3F4856" });
  const vbtn = (active: boolean): React.CSSProperties => ({ fontFamily: F_INT, fontSize: 13, fontWeight: 600, padding: "6px 13px", borderRadius: 7, cursor: "pointer", border: "none", background: active ? "#fff" : "transparent", color: active ? "#0B1220" : "#8A93A2", boxShadow: active ? "0 1px 2px rgba(11,18,32,.12)" : "none" });
  const sideRow = (active: boolean): React.CSSProperties => ({ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", fontFamily: F_INT, fontSize: 14, fontWeight: active ? 600 : 500, textAlign: "left", padding: "9px 11px", borderRadius: 9, cursor: "pointer", border: "none", background: active ? "#EAF1FA" : "transparent", color: active ? "#0A66C2" : "#3F4856" });

  const Thumb = ({ cat, h }: { cat: string; h: number | string }) => { const [, fg] = catColor(cat); return (
    <div style={{ position: "relative", width: "100%", height: h, display: "flex", alignItems: "center", justifyContent: "center", backgroundImage: thumbBg(cat) }}>
      <span style={{ fontFamily: F_MONO, fontSize: 12, letterSpacing: ".16em", textTransform: "uppercase", color: fg, opacity: 0.7, fontWeight: 500 }}>{cat}</span>
    </div>
  ); };

  const Card = ({ p }: { p: BlogCard }) => (
    <Link href={`/blog/${p.slug}`} className="lv-card" style={{ background: "#fff", border: "1px solid #E6E8EC", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: view === "list" ? "row" : "column", textDecoration: "none", color: "inherit", boxShadow: "0 1px 2px rgba(11,18,32,.04)" }}>
      <div style={{ flexShrink: 0, width: view === "list" ? 280 : "100%" }}><Thumb cat={p.category} h={view === "list" ? "100%" : 168} /></div>
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={pill(p.category)}>{p.category}</span><span style={{ fontSize: 12, color: "#8A93A2" }}>{p.readTime}</span></div>
        <h3 style={{ fontFamily: F_POP, fontWeight: 600, fontSize: view === "list" ? 21 : 18, lineHeight: 1.25, letterSpacing: "-.01em", color: "#0B1220", margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.title}</h3>
        <p style={{ fontSize: 14, lineHeight: 1.55, color: "#5A6473", margin: 0, display: "-webkit-box", WebkitLineClamp: view === "list" ? 3 : 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.description}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "auto", paddingTop: 12, borderTop: "1px solid #F0F1F4", fontSize: 12.5, color: "#8A93A2" }}>
          <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#EAF1FA", color: "#0A66C2", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F_POP, fontWeight: 600, fontSize: 10 }}>LV</span>
          <span>LinkedVelocity Team</span><span>·</span><span>{fmtDate(p.date)}</span>
        </div>
      </div>
    </Link>
  );

  return (
    <div style={{ maxWidth: 1220, margin: "0 auto", padding: "56px 40px 90px", fontFamily: F_INT, color: "#0B1220" }}>
      <style>{`.lv-card{transition:box-shadow .18s, transform .18s, border-color .18s} .lv-card:hover{border-color:#CFE0F3 !important; box-shadow:0 12px 30px -18px rgba(11,18,32,.28) !important; transform:translateY(-2px)}`}</style>

      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 40, flexWrap: "wrap", marginBottom: 34 }}>
        <div style={{ maxWidth: 640 }}>
          <div style={{ fontFamily: F_MONO, fontSize: 12, letterSpacing: ".2em", textTransform: "uppercase", color: "#0A66C2", marginBottom: 12 }}>Blog</div>
          <h1 style={{ fontFamily: F_POP, fontWeight: 700, fontSize: 48, lineHeight: 1.05, letterSpacing: "-.025em", margin: "0 0 14px" }}>LinkedIn Outreach Insights</h1>
          <p style={{ fontSize: 17, lineHeight: 1.55, color: "#5A6473", margin: 0 }}>Guides, playbooks, and compliance tips for scaling B2B outreach on LinkedIn — safely.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1px solid #E1E4EA", borderRadius: 12, padding: "11px 15px", minWidth: 280 }}>
          <span style={{ color: "#9AA4B2", fontSize: 15 }}>⌕</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search articles…" style={{ border: "none", outline: "none", fontFamily: F_INT, fontSize: 14.5, width: "100%", background: "transparent", color: "#0B1220" }} />
        </div>
      </div>

      {/* filter + view */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap", paddingBottom: 22, borderBottom: "1px solid #E6E8EC", marginBottom: 30 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
          {[{ name: "All", count: sorted.length }, ...cats].map((c) => (
            <button key={c.name} onClick={() => setActiveCat(c.name)} style={catPill(activeCat === c.name)}>{c.name} <span style={{ fontSize: 11, fontWeight: 700, color: activeCat === c.name ? "rgba(255,255,255,.75)" : "#9AA4B2" }}>{c.count}</span></button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#EEF0F3", borderRadius: 10, padding: 4 }}>
          <button onClick={() => setView("grid")} style={vbtn(view === "grid")}>▦ Grid</button>
          <button onClick={() => setView("list")} style={vbtn(view === "list")}>☰ List</button>
        </div>
      </div>

      {/* featured */}
      {featured && (
        <Link href={`/blog/${featured.slug}`} className="lv-card" style={{ display: "flex", gap: 0, background: "#fff", border: "1px solid #E6E8EC", borderRadius: 20, overflow: "hidden", marginBottom: 40, textDecoration: "none", color: "inherit", boxShadow: "0 12px 40px -28px rgba(11,18,32,.3)" }}>
          <div style={{ position: "relative", width: "44%", minHeight: 300, flexShrink: 0 }}>
            <Thumb cat={featured.category} h="100%" />
            <span style={{ position: "absolute", top: 16, left: 16, fontFamily: F_MONO, fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "#0B1220", background: "#fff", padding: "5px 10px", borderRadius: 999 }}>★ Featured</span>
          </div>
          <div style={{ flex: 1, padding: "38px 40px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}><span style={pill(featured.category)}>{featured.category}</span><span style={{ fontSize: 13, color: "#8A93A2" }}>{fmtDate(featured.date)} · {featured.readTime}</span></div>
            <h2 style={{ fontFamily: F_POP, fontWeight: 700, fontSize: 30, lineHeight: 1.15, letterSpacing: "-.02em", margin: "0 0 14px" }}>{featured.title}</h2>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: "#5A6473", margin: "0 0 22px", maxWidth: 560 }}>{featured.description}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 34, height: 34, borderRadius: "50%", background: "#0A66C2", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F_POP, fontWeight: 600, fontSize: 13 }}>LV</span>
              <span style={{ fontSize: 14, color: "#3F4856" }}>By LinkedVelocity Team</span>
              <span style={{ marginLeft: "auto", color: "#0A66C2", fontWeight: 600, fontSize: 14.5 }}>Read article →</span>
            </div>
          </div>
        </Link>
      )}

      {/* grid + sidebar */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 44, alignItems: "start" }}>
        <div>
          <div style={{ fontFamily: F_MONO, fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", color: "#8A93A2", marginBottom: 18 }}>{resultLine}</div>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "70px 20px", color: "#8A93A2" }}>
              <div style={{ fontSize: 16, marginBottom: 12 }}>No articles match that filter.</div>
              <button onClick={() => { setActiveCat("All"); setQuery(""); }} style={{ fontFamily: F_INT, fontSize: 14, fontWeight: 600, color: "#0A66C2", background: "#EAF1FA", border: "none", borderRadius: 10, padding: "10px 18px", cursor: "pointer" }}>Clear filters</button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: view === "list" ? "1fr" : "1fr 1fr", gap: 22 }}>
              {grid.map((p) => <Card key={p.slug} p={p} />)}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 26, position: "sticky", top: 92 }}>
          <div style={{ background: "#fff", border: "1px solid #E6E8EC", borderRadius: 16, padding: 22 }}>
            <div style={{ fontFamily: F_POP, fontWeight: 600, fontSize: 15, marginBottom: 14 }}>Browse by category</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {[{ name: "All articles", key: "All", count: sorted.length }, ...cats.map((c) => ({ name: c.name, key: c.name, count: c.count }))].map((c) => (
                <button key={c.key} onClick={() => setActiveCat(c.key)} style={sideRow(activeCat === c.key)}><span>{c.name}</span><span style={{ fontSize: 12, color: activeCat === c.key ? "#0A66C2" : "#9AA4B2", fontWeight: 600 }}>{c.count}</span></button>
              ))}
            </div>
          </div>

          <div style={{ background: "radial-gradient(120% 90% at 50% 0%, #12305F 0%, #0A1826 100%)", borderRadius: 16, padding: 24, color: "#EAF0FA" }}>
            <div style={{ fontFamily: F_POP, fontWeight: 700, fontSize: 17, lineHeight: 1.25, marginBottom: 8, color: "#fff" }}>Get the weekly outbound playbook</div>
            <div style={{ fontSize: 13.5, lineHeight: 1.5, color: "#AFC0D6", marginBottom: 16 }}>Tactics, templates, and compliance updates. No fluff.</div>
            <Link href="/how-it-works" style={{ display: "block", textAlign: "center", textDecoration: "none", border: "none", borderRadius: 10, padding: 11, fontFamily: F_INT, fontWeight: 600, fontSize: 14, color: "#fff", background: "#00A150" }}>Learn more →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
