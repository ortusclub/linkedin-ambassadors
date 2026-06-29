"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";

interface Post {
  id: string;
  slug: string;
  title: string;
  category: string;
  status: string;
  scheduledFor: string | null;
  publishedAt: string | null;
  updatedAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  in_review: "In Review",
  approved: "Approved",
  published: "Published",
};
const STATUS_BADGE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  in_review: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  published: "bg-green-100 text-green-700",
};
const STATUS_DOT: Record<string, string> = {
  draft: "bg-gray-400",
  in_review: "bg-amber-500",
  approved: "bg-blue-500",
  published: "bg-green-500",
};

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function AdminContentPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [creating, setCreating] = useState(false);
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });

  useEffect(() => {
    fetch("/api/admin/content")
      .then((r) => r.json())
      .then((d) => setPosts(d.posts || []))
      .finally(() => setLoading(false));
  }, []);

  const newPost = async () => {
    setCreating(true);
    const res = await fetch("/api/admin/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled draft" }),
    });
    const d = await res.json();
    if (d.post?.id) router.push(`/admin/content/${d.post.id}`);
    else setCreating(false);
  };

  // group posts by scheduled (or published) date for the calendar
  const byDate = useMemo(() => {
    const map: Record<string, Post[]> = {};
    for (const p of posts) {
      const when = p.scheduledFor || p.publishedAt;
      if (!when) continue;
      const key = when.slice(0, 10);
      (map[key] ||= []).push(p);
    }
    return map;
  }, [posts]);

  const unscheduled = posts.filter((p) => !p.scheduledFor && !p.publishedAt);

  // build calendar grid
  const grid = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const startDow = first.getDay(); // 0 Sun
    const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.y, cursor.m, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  const shiftMonth = (delta: number) => {
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  const todayStr = ymd(new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Content</h1>
          <p className="text-sm text-gray-500">Plan, draft, and publish blog articles. Drafts stay private until published.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button onClick={() => setView("calendar")} className={`px-3 py-1.5 text-sm ${view === "calendar" ? "bg-gray-900 text-white" : "bg-white text-gray-600"}`}>Calendar</button>
            <button onClick={() => setView("list")} className={`px-3 py-1.5 text-sm ${view === "list" ? "bg-gray-900 text-white" : "bg-white text-gray-600"}`}>List</button>
          </div>
          <button onClick={newPost} disabled={creating} className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
            {creating ? "Creating…" : "+ New post"}
          </button>
        </div>
      </div>

      {/* legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
        {Object.keys(STATUS_LABEL).map((s) => (
          <span key={s} className="flex items-center gap-1.5"><span className={`inline-block w-2.5 h-2.5 rounded-full ${STATUS_DOT[s]}`} />{STATUS_LABEL[s]}</span>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : view === "calendar" ? (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => shiftMonth(-1)} className="px-2 py-1 text-gray-500 hover:text-gray-900">←</button>
              <h2 className="font-semibold">{MONTHS[cursor.m]} {cursor.y}</h2>
              <button onClick={() => shiftMonth(1)} className="px-2 py-1 text-gray-500 hover:text-gray-900">→</button>
            </div>
            <div className="grid grid-cols-7 gap-px bg-gray-100 border border-gray-100 rounded-lg overflow-hidden">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="bg-gray-50 text-[11px] font-semibold text-gray-400 text-center py-1.5">{d}</div>
              ))}
              {grid.map((date, i) => {
                const key = date ? ymd(date) : `e${i}`;
                const items = date ? byDate[ymd(date)] || [] : [];
                return (
                  <div key={key} className={`bg-white min-h-[92px] p-1.5 ${date && ymd(date) === todayStr ? "ring-1 ring-inset ring-green-400" : ""}`}>
                    {date && <div className="text-[11px] text-gray-400 mb-1">{date.getDate()}</div>}
                    <div className="space-y-1">
                      {items.map((p) => (
                        <button key={p.id} onClick={() => router.push(`/admin/content/${p.id}`)}
                          className="w-full text-left text-[11px] leading-tight px-1.5 py-1 rounded bg-gray-50 hover:bg-gray-100 flex items-start gap-1">
                          <span className={`inline-block w-2 h-2 rounded-full mt-0.5 shrink-0 ${STATUS_DOT[p.status]}`} />
                          <span className="truncate">{p.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            {unscheduled.length > 0 && (
              <div className="mt-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Unscheduled ({unscheduled.length})</h3>
                <div className="flex flex-wrap gap-2">
                  {unscheduled.map((p) => (
                    <button key={p.id} onClick={() => router.push(`/admin/content/${p.id}`)}
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-gray-400 flex items-center gap-1.5">
                      <span className={`inline-block w-2 h-2 rounded-full ${STATUS_DOT[p.status]}`} />{p.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Scheduled</th>
                </tr>
              </thead>
              <tbody>
                {posts.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No posts yet. Click “New post”.</td></tr>
                )}
                {posts.map((p) => (
                  <tr key={p.id} onClick={() => router.push(`/admin/content/${p.id}`)} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer">
                    <td className="px-4 py-3 font-medium">{p.title}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[p.status]}`}>{STATUS_LABEL[p.status]}</span></td>
                    <td className="px-4 py-3 text-gray-500">{p.category}</td>
                    <td className="px-4 py-3 text-gray-500">{(p.scheduledFor || p.publishedAt)?.slice(0, 10) || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
