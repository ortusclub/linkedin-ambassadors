"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";

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
}

const CATEGORIES = ["LinkedIn Limits", "LinkedIn Strategy", "LinkedIn Compliance", "Tools", "Sales Strategy", "Getting Started", "Market & Competitive"];
const PRIORITIES = ["P1", "P2", "P3"];
const PRIORITY_BADGE: Record<string, string> = {
  P1: "bg-red-100 text-red-700 border-red-200",
  P2: "bg-amber-100 text-amber-700 border-amber-200",
  P3: "bg-gray-100 text-gray-500 border-gray-200",
};
const PRIORITY_RANK: Record<string, number> = { P1: 0, P2: 1, P3: 2 };

const STATUS_LABEL: Record<string, string> = { idea: "Idea", draft: "Draft", in_review: "In Review", approved: "Approved", published: "Published" };
const STATUS_BADGE: Record<string, string> = {
  idea: "bg-violet-100 text-violet-700",
  draft: "bg-gray-100 text-gray-600",
  in_review: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  published: "bg-green-100 text-green-700",
};
const STATUS_DOT: Record<string, string> = {
  draft: "bg-gray-400", in_review: "bg-amber-500", approved: "bg-blue-500", published: "bg-green-500",
};

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function AdminContentPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"calendar" | "list">("list");
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [allUrl, setAllUrl] = useState<string | null>(null);
  const [sheetConfigured, setSheetConfigured] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);
  // quick-add idea
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState("P2");
  const [newCategory, setNewCategory] = useState("LinkedIn Strategy");
  const [adding, setAdding] = useState(false);

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

  // patch a field on a post (optimistic)
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

  const makePost = async (id: string) => {
    await fetch(`/api/admin/content/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "draft" }) });
    router.push(`/admin/content/${id}`);
  };

  const removePost = async (id: string) => {
    if (!confirm("Delete this idea?")) return;
    setPosts((prev) => prev.filter((x) => x.id !== id));
    await fetch(`/api/admin/content/${id}`, { method: "DELETE" });
  };

  const ideas = useMemo(
    () => posts.filter((p) => p.status === "idea").sort((a, b) => (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1)),
    [posts]
  );
  // pipeline order: approved/scheduled on top, then in-review, draft, and published at the bottom
  const PIPE_RANK: Record<string, number> = { approved: 0, in_review: 1, draft: 2, published: 3 };
  const pipeline = useMemo(
    () => posts.filter((p) => p.status !== "idea").sort((a, b) => {
      const r = (PIPE_RANK[a.status] ?? 9) - (PIPE_RANK[b.status] ?? 9);
      if (r !== 0) return r;
      const da = (a.scheduledFor || a.publishedAt || "") as string;
      const db = (b.scheduledFor || b.publishedAt || "") as string;
      return da.localeCompare(db);
    }),
    [posts]
  );

  const byDate = useMemo(() => {
    const map: Record<string, Post[]> = {};
    for (const p of pipeline) {
      const when = p.scheduledFor || p.publishedAt;
      if (!when) continue;
      (map[when.slice(0, 10)] ||= []).push(p);
    }
    return map;
  }, [pipeline]);

  const grid = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const cells: (Date | null)[] = [];
    for (let i = 0; i < first.getDay(); i++) cells.push(null);
    const days = new Date(cursor.y, cursor.m + 1, 0).getDate();
    for (let d = 1; d <= days; d++) cells.push(new Date(cursor.y, cursor.m, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  const inputCls = "border border-gray-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-400";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Content</h1>
        <p className="text-sm text-gray-500">Jot blog ideas below. Pick one, hit “Make blog post”, and it moves into writing → review → publish.</p>
      </div>

      {sheetConfigured === true && (
        <div className="flex items-center gap-3 flex-wrap text-sm bg-green-50 border border-green-100 rounded-lg px-4 py-3">
          <span className="font-semibold text-green-800">Live Google Sheets link</span>
          <button onClick={copyFormula} className="px-3 py-1 text-xs font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700">{copied ? "Copied ✓" : "Copy formula"}</button>
          <span className="text-xs text-gray-500">Auto-refreshes in State of LV.</span>
        </div>
      )}
      {sheetConfigured === false && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-4 py-2">
          Live sheet link not active yet — set <code>RENTALS_EXPORT_KEY</code> in Vercel to enable the auto-updating export.
        </div>
      )}

      {/* ───────────── IDEAS (simple list) ───────────── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">💡 Idea backlog</h2>
        <Card><CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
                <th className="px-3 py-2 w-20">Priority</th>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2 w-48">Category</th>
                <th className="px-3 py-2 w-36">Target date</th>
                <th className="px-3 py-2 w-44"></th>
              </tr>
            </thead>
            <tbody>
              {/* quick add row */}
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <td className="px-3 py-2">
                  <select className={inputCls} value={newPriority} onChange={(e) => setNewPriority(e.target.value)}>
                    {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input className={`${inputCls} w-full`} placeholder="New idea — type a title and press Enter…" value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addIdea(); }} />
                </td>
                <td className="px-3 py-2">
                  <select className={inputCls} value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2 text-gray-300">—</td>
                <td className="px-3 py-2">
                  <button onClick={addIdea} disabled={!newTitle.trim() || adding} className="px-3 py-1 text-xs font-semibold rounded-lg bg-gray-900 text-white hover:bg-black disabled:opacity-40">+ Add idea</button>
                </td>
              </tr>

              {ideas.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <select value={p.priority} onChange={(e) => patch(p.id, { priority: e.target.value })}
                      className={`text-xs font-semibold rounded-md border px-1.5 py-1 ${PRIORITY_BADGE[p.priority] || PRIORITY_BADGE.P2}`}>
                      {PRIORITIES.map((x) => <option key={x}>{x}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input className="w-full bg-transparent focus:outline-none focus:bg-white focus:border focus:border-gray-200 rounded px-1 py-0.5"
                      defaultValue={p.title} onBlur={(e) => { if (e.target.value !== p.title) patch(p.id, { title: e.target.value }); }} />
                  </td>
                  <td className="px-3 py-2">
                    <select className={inputCls} value={p.category} onChange={(e) => patch(p.id, { category: e.target.value })}>
                      {CATEGORIES.includes(p.category) ? null : <option>{p.category}</option>}
                      {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input type="date" className={inputCls} value={p.scheduledFor ? p.scheduledFor.slice(0, 10) : ""}
                      onChange={(e) => patch(p.id, { scheduledFor: e.target.value || null } as Partial<Post>)} />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <button onClick={() => makePost(p.id)} className="px-3 py-1 text-xs font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700">Make blog post →</button>
                    <button onClick={() => removePost(p.id)} className="ml-2 text-xs text-gray-400 hover:text-red-600">✕</button>
                  </td>
                </tr>
              ))}
              {!loading && ideas.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-5 text-center text-gray-400 text-sm">No ideas yet — add one above.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent></Card>
      </div>

      {/* ───────────── PIPELINE (writing → publish) ───────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-700">📝 In progress &amp; published</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 text-[11px] text-gray-400">
              {["draft", "in_review", "approved", "published"].map((s) => (
                <span key={s} className="flex items-center gap-1"><span className={`inline-block w-2 h-2 rounded-full ${STATUS_DOT[s]}`} />{STATUS_LABEL[s]}</span>
              ))}
            </div>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button onClick={() => setView("list")} className={`px-3 py-1 text-xs ${view === "list" ? "bg-gray-900 text-white" : "bg-white text-gray-600"}`}>List</button>
              <button onClick={() => setView("calendar")} className={`px-3 py-1 text-xs ${view === "calendar" ? "bg-gray-900 text-white" : "bg-white text-gray-600"}`}>Calendar</button>
            </div>
          </div>
        </div>

        {view === "list" ? (
          <Card><CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
                  <th className="px-4 py-3">Title</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {pipeline.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">Nothing in progress yet — promote an idea above.</td></tr>}
                {pipeline.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <button onClick={() => router.push(`/admin/content/${p.id}`)} className="font-medium text-left hover:text-blue-600 hover:underline">{p.title}</button>
                    </td>
                    <td className="px-4 py-3">
                      <select value={p.status} onChange={(e) => patch(p.id, { status: e.target.value } as Partial<Post>)}
                        className={`text-xs font-medium rounded-full px-2 py-1 border-0 cursor-pointer ${STATUS_BADGE[p.status] || "bg-gray-100 text-gray-600"}`}>
                        {["idea", "draft", "in_review", "approved", "published"].map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select className={inputCls} value={p.category} onChange={(e) => patch(p.id, { category: e.target.value })}>
                        {CATEGORIES.includes(p.category) ? null : <option>{p.category}</option>}
                        {CATEGORIES.map((cc) => <option key={cc} value={cc}>{cc}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input type="date" className={inputCls} value={(p.scheduledFor || p.publishedAt)?.slice(0, 10) || ""} onChange={(e) => patch(p.id, { scheduledFor: e.target.value || null } as Partial<Post>)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>
        ) : (
          <Card><CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setCursor((c) => { const d = new Date(c.y, c.m - 1, 1); return { y: d.getFullYear(), m: d.getMonth() }; })} className="px-2 text-gray-500 hover:text-gray-900">←</button>
              <h3 className="font-semibold text-sm">{MONTHS[cursor.m]} {cursor.y}</h3>
              <button onClick={() => setCursor((c) => { const d = new Date(c.y, c.m + 1, 1); return { y: d.getFullYear(), m: d.getMonth() }; })} className="px-2 text-gray-500 hover:text-gray-900">→</button>
            </div>
            <div className="grid grid-cols-7 gap-px bg-gray-100 border border-gray-100 rounded-lg overflow-hidden">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="bg-gray-50 text-[11px] font-semibold text-gray-400 text-center py-1.5">{d}</div>)}
              {grid.map((date, i) => {
                const items = date ? byDate[ymd(date)] || [] : [];
                return (
                  <div key={date ? ymd(date) : `e${i}`} className="bg-white min-h-[84px] p-1.5">
                    {date && <div className="text-[11px] text-gray-400 mb-1">{date.getDate()}</div>}
                    <div className="space-y-1">
                      {items.map((p) => (
                        <button key={p.id} onClick={() => router.push(`/admin/content/${p.id}`)} className="w-full text-left text-[11px] leading-tight px-1.5 py-1 rounded bg-gray-50 hover:bg-gray-100 flex items-start gap-1">
                          <span className={`inline-block w-2 h-2 rounded-full mt-0.5 shrink-0 ${STATUS_DOT[p.status]}`} /><span className="truncate">{p.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent></Card>
        )}
      </div>
    </div>
  );
}
