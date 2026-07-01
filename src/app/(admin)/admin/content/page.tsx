"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface Post {
  id: string;
  slug: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  scheduledFor: string | null;
  publishedAt: string | null;
  updatedAt: string;
  linkedinPost?: string | null;
  linkedinPostedAt?: string | null;
}

const F_SANS = "var(--font-sans),system-ui,sans-serif";
const F_GRO = "var(--font-grotesk),system-ui,sans-serif";

const CATEGORIES = ["LinkedIn Strategy", "Getting Started", "LinkedIn Compliance", "Tools", "LinkedIn Limits", "Sales Strategy", "Market & Competitive"];
const PRIORITIES = ["P1", "P2", "P3"];
const PRIORITY_RANK: Record<string, number> = { P1: 0, P2: 1, P3: 2 };

const LANES = [
  { key: "idea", label: "Idea Backlog" },
  { key: "draft", label: "Draft" },
  { key: "in_review", label: "In Review" },
  { key: "approved", label: "Approved" },
  { key: "published", label: "Published" },
];
const STATUS_LABEL: Record<string, string> = { idea: "Idea", draft: "Draft", in_review: "In Review", approved: "Approved", published: "Published" };
// status -> css-var key (in_review is "review" in the palette)
const ctKey = (s: string) => (s === "in_review" ? "review" : s);
const PRI_KEY: Record<string, string> = { P1: "p1", P2: "p2", P3: "p3" };
const priStyle = (p: string): React.CSSProperties => ({ background: `var(--pri-${PRI_KEY[p] || "p3"}-bg)`, color: `var(--pri-${PRI_KEY[p] || "p3"}-fg)` });
const stStyle = (s: string): React.CSSProperties => ({ background: `var(--ct-${ctKey(s)}-bg)`, color: `var(--ct-${ctKey(s)}-fg)` });

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MON_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmtShort = (iso: string | null) => { if (!iso) return "—"; const p = iso.slice(0, 10).split("-"); return `${MON[+p[1] - 1]} ${+p[2]}`; };
const fmtFull = (iso: string | null) => { if (!iso) return "—"; const p = iso.slice(0, 10).split("-"); return `${p[1]}/${p[2]}/${p[0]}`; };

export default function AdminContentPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"board" | "list" | "calendar">("board");
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [allUrl, setAllUrl] = useState<string | null>(null);
  const [sheetConfigured, setSheetConfigured] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);
  // quick-add idea
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState("P2");
  const [newCategory, setNewCategory] = useState("LinkedIn Strategy");
  const [adding, setAdding] = useState(false);
  // drag + drop
  const [dragId, setDragId] = useState<string | null>(null);
  const [hoverLane, setHoverLane] = useState<string | null>(null);

  const reload = () => fetch("/api/admin/content").then((r) => r.json()).then((d) => setPosts(d.posts || []));

  useEffect(() => {
    reload().finally(() => setLoading(false));
    fetch("/api/admin/content/export-url").then((r) => r.json())
      .then((d) => { setSheetConfigured(!!d.configured); setAllUrl(d.allUrl || null); })
      .catch(() => setSheetConfigured(false));
  }, []);

  const copyFormula = () => {
    if (!allUrl) return;
    navigator.clipboard.writeText(`=IMPORTDATA("${allUrl}")`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const patch = async (id: string, p: Partial<Post>) => {
    setPosts((prev) => prev.map((x) => (x.id === id ? { ...x, ...p } : x)));
    await fetch(`/api/admin/content/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
  };

  const addIdea = async () => {
    if (!newTitle.trim() || adding) return;
    setAdding(true);
    const res = await fetch("/api/admin/content", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim(), priority: newPriority, category: newCategory }),
    });
    const d = await res.json();
    if (d.post) setPosts((prev) => [d.post, ...prev]);
    setNewTitle(""); setAdding(false);
  };

  const removePost = async (id: string) => {
    if (!confirm("Delete this post?")) return;
    setPosts((prev) => prev.filter((x) => x.id !== id));
    await fetch(`/api/admin/content/${id}`, { method: "DELETE" });
  };

  const open = (id: string) => router.push(`/admin/content/${id}`);

  const onDrop = (lane: string) => {
    setHoverLane(null);
    if (!dragId) return;
    const p = posts.find((x) => x.id === dragId);
    setDragId(null);
    if (p && p.status !== lane) patch(dragId, { status: lane } as Partial<Post>);
  };

  const byStatus = (s: string) => posts.filter((p) => p.status === s)
    .sort((a, b) => s === "idea"
      ? (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1)
      : ((a.scheduledFor || a.publishedAt || "") as string).localeCompare((b.scheduledFor || b.publishedAt || "") as string));

  const listRows = useMemo(() => {
    const RANK: Record<string, number> = { idea: 0, draft: 1, in_review: 2, approved: 3, published: 4 };
    return [...posts].sort((a, b) => (RANK[a.status] ?? 9) - (RANK[b.status] ?? 9) || ((a.scheduledFor || a.publishedAt || "") as string).localeCompare((b.scheduledFor || b.publishedAt || "") as string));
  }, [posts]);

  const byDate = useMemo(() => {
    const map: Record<string, { p: Post; li?: boolean }[]> = {};
    for (const p of posts) {
      // blog schedule / publish date
      const when = p.scheduledFor || p.publishedAt;
      if (when && p.status !== "idea") (map[when.slice(0, 10)] ||= []).push({ p });
      // LinkedIn posts land on the day they were shared
      if (p.linkedinPostedAt) (map[p.linkedinPostedAt.slice(0, 10)] ||= []).push({ p, li: true });
    }
    return map;
  }, [posts]);

  const grid = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const cells: (Date | null)[] = [];
    for (let i = 0; i < first.getDay(); i++) cells.push(null);
    const days = new Date(cursor.y, cursor.m + 1, 0).getDate();
    for (let d = 1; d <= days; d++) cells.push(new Date(cursor.y, cursor.m, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  // ── shared style atoms ──
  const inputStyle: React.CSSProperties = { background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: 8, padding: "9px 12px", font: `500 13px ${F_SANS}`, color: "var(--input-fg)", outline: "none", cursor: "pointer" };
  const tag: React.CSSProperties = { font: `600 9.5px ${F_SANS}`, padding: "3px 7px", borderRadius: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", background: "var(--tag-bg)", color: "var(--tag-fg)" };
  const viewBtn = (active: boolean): React.CSSProperties => ({ font: `600 12.5px ${F_SANS}`, padding: "7px 14px", borderRadius: 7, cursor: "pointer", border: "none", background: active ? "var(--text)" : "transparent", color: active ? "var(--page-bg)" : "var(--muted)" });
  const colLabel: React.CSSProperties = { font: `700 10px ${F_SANS}`, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--label)" };

  const Card = ({ p, showPriority }: { p: Post; showPriority?: boolean }) => (
    <div
      draggable
      onDragStart={() => setDragId(p.id)}
      onDragEnd={() => { setDragId(null); setHoverLane(null); }}
      onClick={() => open(p.id)}
      style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 10, padding: "11px 12px", boxShadow: "var(--card-shadow)", cursor: "grab", opacity: dragId === p.id ? 0.35 : 1 }}
    >
      <div style={{ font: `600 13px/1.35 ${F_SANS}`, color: "var(--text)", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", marginBottom: 10 }}>{p.title}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          {showPriority && <span style={{ font: `700 9.5px ${F_SANS}`, padding: "2px 6px", borderRadius: 5, flex: "none", ...priStyle(p.priority) }}>{p.priority}</span>}
          <span style={tag}>{p.category}</span>
          {p.linkedinPost && <span title={p.linkedinPostedAt ? "LinkedIn post — shared" : "LinkedIn post — ready"} style={{ font: `700 8.5px ${F_SANS}`, padding: "2px 5px", borderRadius: 4, flex: "none", ...(p.linkedinPostedAt ? { background: "var(--st-active-bg)", color: "var(--st-active-fg)" } : { background: "var(--blue-chip-bg)", color: "var(--blue-chip-text)" }) }}>in</span>}
        </div>
        <span style={{ font: `500 11px ${F_SANS}`, color: "var(--date-color)", whiteSpace: "nowrap", flex: "none" }}>{fmtShort(p.scheduledFor || p.publishedAt)}</span>
      </div>
    </div>
  );

  return (
    <div>
      {/* title + view switch */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ maxWidth: 680 }}>
          <h1 style={{ font: `600 30px/1 ${F_GRO}`, color: "var(--text)", margin: "0 0 8px", letterSpacing: "-.02em" }}>Content</h1>
          <p style={{ font: `500 13.5px/1.5 ${F_SANS}`, color: "var(--muted)", margin: 0 }}>Jot blog ideas, pick one, and watch it move through writing → review → publish.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {sheetConfigured === true && (
            <div style={{ display: "flex", alignItems: "center", gap: 9, background: "var(--sheets-bg)", border: "1px solid var(--sheets-border)", padding: "6px 8px 6px 12px", borderRadius: 10 }}>
              <span style={{ font: `600 12px ${F_SANS}`, color: "var(--sheets-fg)" }}>Live Google Sheets</span>
              <button onClick={copyFormula} style={{ font: `600 11.5px ${F_SANS}`, color: "#fff", background: "var(--sheets-btn-bg)", border: "none", padding: "5px 11px", borderRadius: 7, cursor: "pointer" }}>{copied ? "Copied ✓" : "Copy formula"}</button>
            </div>
          )}
          <div style={{ display: "flex", background: "var(--seg-bg)", border: "1px solid var(--seg-border)", borderRadius: 10, padding: 3 }}>
            {(["board", "list", "calendar"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} style={viewBtn(view === v)}>{v[0].toUpperCase() + v.slice(1)}</button>
            ))}
          </div>
        </div>
      </div>

      {sheetConfigured === false && (
        <div style={{ font: `500 12px ${F_SANS}`, color: "var(--warn-badge-text)", background: "var(--warn-badge-bg)", borderRadius: 9, padding: "8px 13px", marginBottom: 16 }}>
          Live Sheets link not active yet — set <code>RENTALS_EXPORT_KEY</code> in Vercel to enable the auto-updating export.
        </div>
      )}

      {/* quick add idea */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--panel)", border: "1px solid var(--panel-border)", borderRadius: 14, padding: "12px 14px", marginBottom: 20, boxShadow: "var(--panel-shadow)", flexWrap: "wrap" }}>
        <span style={{ font: `600 11px ${F_SANS}`, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--label)", flex: "none" }}>New idea</span>
        <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)} style={{ ...inputStyle, flex: "none", fontWeight: 600 }}>
          {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
        </select>
        <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addIdea(); }} placeholder="Type a title and hit Add…"
          style={{ ...inputStyle, flex: 1, minWidth: 180, cursor: "text" }} />
        <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} style={{ ...inputStyle, flex: "none" }}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <button onClick={addIdea} disabled={!newTitle.trim() || adding} style={{ flex: "none", font: `600 13px ${F_SANS}`, color: "#fff", background: "var(--btn-primary-bg)", border: "none", padding: "9px 18px", borderRadius: 9, cursor: "pointer", opacity: !newTitle.trim() || adding ? 0.45 : 1 }}>+ Add idea</button>
      </div>

      {/* ===== BOARD ===== */}
      {view === "board" && (
        <div data-content-board style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, alignItems: "start" }}>
          {LANES.map((lane) => {
            const items = byStatus(lane.key);
            return (
              <div key={lane.key} style={{ background: "var(--lane)", borderRadius: 14, display: "flex", flexDirection: "column", maxHeight: 660 }}>
                <div style={{ padding: "14px 14px 11px", display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: `var(--ct-${ctKey(lane.key)}-fg)` }} />
                  <span style={{ font: `600 12.5px ${F_SANS}`, color: "var(--text)" }}>{lane.label}</span>
                  <span style={{ marginLeft: "auto", font: `600 11px ${F_SANS}`, color: "var(--muted)", background: "var(--lane-badge)", padding: "2px 8px", borderRadius: 999 }}>{items.length}</span>
                </div>
                <div
                  onDragOver={(e) => { e.preventDefault(); setHoverLane(lane.key); }}
                  onDragLeave={(e) => { if (e.currentTarget === e.target) setHoverLane(null); }}
                  onDrop={() => onDrop(lane.key)}
                  style={{ padding: "0 10px 12px", display: "flex", flexDirection: "column", gap: 9, overflowY: "auto", minHeight: 60, borderRadius: 12, boxShadow: hoverLane === lane.key ? "inset 0 0 0 2px var(--accent)" : "none" }}
                >
                  {items.map((p) => <Card key={p.id} p={p} showPriority={lane.key === "idea"} />)}
                  {!loading && items.length === 0 && <div style={{ font: `500 11.5px ${F_SANS}`, color: "var(--muted)", padding: "10px 4px", textAlign: "center" }}>—</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== LIST ===== */}
      {view === "list" && (
        <div style={{ background: "var(--panel)", border: "1px solid var(--panel-border)", borderRadius: 16, overflow: "hidden", boxShadow: "var(--panel-shadow)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 150px 190px 120px 40px", gap: 16, padding: "14px 22px", borderBottom: "1px solid var(--divider)" }}>
            {["Title", "Status", "Category", "Date", ""].map((h, i) => <span key={i} style={colLabel}>{h}</span>)}
          </div>
          {listRows.length === 0 && <div style={{ padding: "26px", textAlign: "center", font: `500 13px ${F_SANS}`, color: "var(--muted)" }}>No posts yet — add an idea above.</div>}
          {listRows.map((p) => (
            <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr 150px 190px 120px 40px", gap: 16, alignItems: "center", padding: "11px 22px", borderBottom: "1px solid var(--divider)" }}>
              <button onClick={() => open(p.id)} style={{ font: `600 13.5px ${F_SANS}`, color: "var(--text)", background: "none", border: "none", textAlign: "left", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: 0 }}>{p.title}</button>
              <select value={p.status} onChange={(e) => patch(p.id, { status: e.target.value } as Partial<Post>)}
                style={{ justifySelf: "start", font: `600 11px ${F_SANS}`, padding: "4px 11px", borderRadius: 999, border: "none", cursor: "pointer", ...stStyle(p.status) }}>
                {LANES.map((l) => <option key={l.key} value={l.key}>{STATUS_LABEL[l.key]}</option>)}
              </select>
              <select value={CATEGORIES.includes(p.category) ? p.category : "__"} onChange={(e) => patch(p.id, { category: e.target.value })} style={{ ...inputStyle, justifySelf: "start", padding: "5px 9px", font: `500 12.5px ${F_SANS}` }}>
                {!CATEGORIES.includes(p.category) && <option value="__">{p.category}</option>}
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="date" value={(p.scheduledFor || p.publishedAt)?.slice(0, 10) || ""} onChange={(e) => patch(p.id, { scheduledFor: e.target.value || null } as Partial<Post>)}
                style={{ ...inputStyle, padding: "5px 8px", font: `500 12.5px ${F_SANS}`, cursor: "text" }} />
              <button onClick={() => removePost(p.id)} title="Delete" style={{ font: `600 13px ${F_SANS}`, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", justifySelf: "center" }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* ===== CALENDAR ===== */}
      {view === "calendar" && (
        <div style={{ background: "var(--panel)", border: "1px solid var(--panel-border)", borderRadius: 16, padding: "20px 22px", boxShadow: "var(--panel-shadow)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <span style={{ font: `600 18px ${F_GRO}`, color: "var(--text)" }}>{MON_FULL[cursor.m]} {cursor.y}</span>
              <div style={{ display: "flex", gap: 6 }}>
                {(["prev", "next"] as const).map((dir) => (
                  <button key={dir} onClick={() => setCursor((c) => { const d = new Date(c.y, c.m + (dir === "prev" ? -1 : 1), 1); return { y: d.getFullYear(), m: d.getMonth() }; })}
                    style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--btn-secondary-border)", background: "var(--btn-secondary-bg)", color: "var(--text)", cursor: "pointer", font: `600 15px ${F_SANS}` }}>{dir === "prev" ? "‹" : "›"}</button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              {[["In Review", "var(--ct-review-fg)"], ["Approved", "var(--ct-approved-fg)"], ["Published", "var(--ct-published-fg)"], ["LinkedIn", "var(--blue-chip-text)"]].map(([lbl, col]) => (
                <span key={lbl} style={{ display: "inline-flex", alignItems: "center", gap: 6, font: `500 11.5px ${F_SANS}`, color: "var(--muted)" }}><span style={{ width: 8, height: 8, borderRadius: 999, background: col }} />{lbl}</span>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => <div key={w} style={{ font: `600 10px ${F_SANS}`, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--label)", padding: "2px 6px 6px" }}>{w}</div>)}
            {grid.map((date, i) => {
              const items = date ? byDate[ymd(date)] || [] : [];
              return (
                <div key={date ? ymd(date) : `e${i}`} style={{ minHeight: 96, border: "1px solid", borderColor: date ? "var(--card-border)" : "transparent", borderRadius: 9, padding: 6, display: "flex", flexDirection: "column", gap: 4, overflow: "hidden", background: date ? "var(--card)" : "transparent" }}>
                  {date && <div style={{ font: `600 11px ${F_GRO}`, color: "var(--muted)", marginBottom: 1 }}>{date.getDate()}</div>}
                  {items.slice(0, 3).map((it, idx) => (
                    <button key={it.p.id + (it.li ? "-li" : "") + idx} onClick={() => open(it.p.id)} title={it.li ? "LinkedIn post — shared this day" : undefined} style={{ font: `600 9.5px ${F_SANS}`, padding: "3px 6px", borderRadius: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", border: "none", cursor: "pointer", textAlign: "left", ...(it.li ? { background: "var(--blue-chip-bg)", color: "var(--blue-chip-text)" } : stStyle(it.p.status)) }}>{it.li ? "in  " : ""}{it.p.title}</button>
                  ))}
                  {items.length > 3 && <div style={{ font: `500 9px ${F_SANS}`, color: "var(--muted)" }}>+{items.length - 3} more</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`@media (max-width:1024px){ [data-content-board]{grid-template-columns:repeat(2,1fr) !important} }`}</style>
    </div>
  );
}
