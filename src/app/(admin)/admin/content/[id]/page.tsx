"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";

interface Post {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  keyword: string | null;
  pillar: string | null;
  content: string;
  readTime: string | null;
  status: string;
  scheduledFor: string | null;
  publishedAt: string | null;
  reviewerNotes: string | null;
  authorEmail: string | null;
}

const CATEGORIES = ["LinkedIn Limits", "LinkedIn Strategy", "LinkedIn Compliance", "Tools", "Sales Strategy", "Getting Started", "Market & Competitive"];
const STATUS_LABEL: Record<string, string> = { idea: "Idea", draft: "Draft", in_review: "In Review", approved: "Approved", published: "Published" };
const STATUS_BADGE: Record<string, string> = {
  idea: "bg-violet-100 text-violet-700",
  draft: "bg-gray-100 text-gray-600",
  in_review: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  published: "bg-green-100 text-green-700",
};

// Same markdown rendering the public blog uses, mirrored for live preview.
function markdownToHtml(md: string): string {
  let html = md;
  html = html.replace(/\|(.+)\|\n\|[-| ]+\|\n((?:\|.+\|\n?)+)/g, (_, header, body) => {
    const ths = header.split("|").filter((c: string) => c.trim()).map((c: string) => `<th>${c.trim()}</th>`).join("");
    const rows = body.trim().split("\n").map((row: string) => {
      const tds = row.split("|").filter((c: string) => c.trim()).map((c: string) => `<td>${c.trim()}</td>`).join("");
      return `<tr>${tds}</tr>`;
    }).join("");
    return `<table><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table>`;
  });
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  html = html.replace(/(?:^- .+$\n?)+/gm, (m) => `<ul>${m.trim().split("\n").map((l) => `<li>${l.replace(/^- /, "")}</li>`).join("")}</ul>`);
  html = html.replace(/(?:^\d+\. .+$\n?)+/gm, (m) => `<ol>${m.trim().split("\n").map((l) => `<li>${l.replace(/^\d+\. /, "")}</li>`).join("")}</ol>`);
  html = html.replace(/^---$/gm, "<hr />");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.split("\n\n").map((block) => {
    const t = block.trim();
    if (!t) return "";
    if (t.startsWith("<h") || t.startsWith("<ul") || t.startsWith("<ol") || t.startsWith("<table") || t.startsWith("<hr") || t.startsWith("<blockquote")) return t;
    return `<p>${t}</p>`;
  }).join("\n");
  return html;
}

export default function ContentEditor() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch(`/api/admin/content/${id}`)
      .then((r) => r.json())
      .then((d) => setPost(d.post || null))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (patch: Partial<Post>) => setPost((p) => (p ? { ...p, ...patch } : p));

  const persist = async (extra: Partial<Post> & { status?: string } = {}) => {
    if (!post) return;
    setSaving(true);
    setMsg("");
    const payload = {
      title: post.title, slug: post.slug, description: post.description, category: post.category,
      keyword: post.keyword, pillar: post.pillar, content: post.content, readTime: post.readTime,
      reviewerNotes: post.reviewerNotes, scheduledFor: post.scheduledFor, ...extra,
    };
    const res = await fetch(`/api/admin/content/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const d = await res.json();
    setSaving(false);
    if (d.post) { setPost(d.post); setMsg("Saved ✓"); setTimeout(() => setMsg(""), 2000); }
    else setMsg(d.error || "Error saving");
  };

  const remove = async () => {
    if (!confirm("Delete this post permanently?")) return;
    await fetch(`/api/admin/content/${id}`, { method: "DELETE" });
    router.push("/admin/content");
  };

  if (loading) return <p className="text-gray-400 text-sm">Loading…</p>;
  if (!post) return <p className="text-gray-400 text-sm">Post not found. <button className="underline" onClick={() => router.push("/admin/content")}>Back</button></p>;

  // workflow actions available for the current status
  const actions: { label: string; status: string; cls: string }[] = [];
  if (post.status === "idea") actions.push({ label: "Move to drafting", status: "draft", cls: "bg-gray-700 hover:bg-gray-800" });
  if (post.status === "draft") {
    actions.push({ label: "Submit for review", status: "in_review", cls: "bg-amber-500 hover:bg-amber-600" });
    actions.push({ label: "Back to idea", status: "idea", cls: "bg-gray-400 hover:bg-gray-500" });
  }
  if (post.status === "in_review") {
    actions.push({ label: "Approve", status: "approved", cls: "bg-blue-600 hover:bg-blue-700" });
    actions.push({ label: "Send back to draft", status: "draft", cls: "bg-gray-500 hover:bg-gray-600" });
  }
  if (post.status === "approved") {
    actions.push({ label: "Publish", status: "published", cls: "bg-green-600 hover:bg-green-700" });
    actions.push({ label: "Back to review", status: "in_review", cls: "bg-gray-500 hover:bg-gray-600" });
  }
  if (post.status === "published") actions.push({ label: "Unpublish", status: "draft", cls: "bg-red-500 hover:bg-red-600" });

  const field = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-400";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/admin/content")} className="text-gray-400 hover:text-gray-900 text-sm">← Content</button>
          <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[post.status]}`}>{STATUS_LABEL[post.status]}</span>
          {post.status === "published" && <a href={`/blog/${post.slug}`} target="_blank" className="text-xs text-green-700 underline">View live ↗</a>}
        </div>
        <div className="flex items-center gap-2">
          {msg && <span className="text-xs text-gray-500">{msg}</span>}
          <button onClick={() => persist()} disabled={saving} className="px-4 py-1.5 text-sm font-semibold rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
          {actions.map((a) => (
            <button key={a.status} onClick={() => persist({ status: a.status })} disabled={saving}
              className={`px-4 py-1.5 text-sm font-semibold rounded-lg text-white disabled:opacity-50 ${a.cls}`}>{a.label}</button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* editor */}
        <div className="space-y-4">
          <Card><CardContent className="p-4 space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-500">Title</label>
              <input className={field} value={post.title} onChange={(e) => set({ title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500">Slug (URL)</label>
                <input className={field} value={post.slug} onChange={(e) => set({ slug: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Category</label>
                <select className={field} value={post.category} onChange={(e) => set({ category: e.target.value })}>
                  {CATEGORIES.includes(post.category) ? null : <option value={post.category}>{post.category}</option>}
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500">Scheduled date</label>
                <input type="date" className={field} value={post.scheduledFor ? post.scheduledFor.slice(0, 10) : ""} onChange={(e) => set({ scheduledFor: e.target.value || null })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Target keyword (SEO)</label>
                <input className={field} value={post.keyword || ""} onChange={(e) => set({ keyword: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Description (meta / preview)</label>
              <textarea className={field} rows={2} value={post.description} onChange={(e) => set({ description: e.target.value })} />
            </div>
          </CardContent></Card>

          <Card><CardContent className="p-4">
            <label className="text-xs font-semibold text-gray-500">Body (Markdown)</label>
            <textarea className={`${field} font-mono text-[13px] leading-relaxed`} rows={26} value={post.content}
              onChange={(e) => set({ content: e.target.value })}
              placeholder={"## Heading\n\nParagraph text with **bold** and [a link](https://...).\n\n- bullet\n- bullet"} />
            <p className="text-[11px] text-gray-400 mt-1">Supports ## / ### headings, **bold**, *italic*, - lists, 1. lists, [links](url), tables, --- rules.</p>
          </CardContent></Card>

          <Card><CardContent className="p-4">
            <label className="text-xs font-semibold text-gray-500">Reviewer notes (for Sam ↔ writer)</label>
            <textarea className={field} rows={3} value={post.reviewerNotes || ""} onChange={(e) => set({ reviewerNotes: e.target.value })}
              placeholder="Feedback / change requests before approval…" />
            <button onClick={remove} className="mt-3 text-xs text-red-500 hover:text-red-700">Delete post</button>
          </CardContent></Card>
        </div>

        {/* live preview */}
        <div>
          <Card><CardContent className="p-6">
            <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-3">Live preview</div>
            <h1 className="text-2xl font-bold mb-2">{post.title}</h1>
            <p className="text-gray-500 mb-5 pb-5 border-b border-gray-100">{post.description}</p>
            <div className="blog-preview" dangerouslySetInnerHTML={{ __html: markdownToHtml(post.content) }} />
          </CardContent></Card>
        </div>
      </div>

      <style>{`
        .blog-preview{font-size:15px;line-height:1.75;color:#1f2937}
        .blog-preview h2{font-size:22px;font-weight:700;margin:28px 0 10px}
        .blog-preview h3{font-size:18px;font-weight:600;margin:22px 0 8px}
        .blog-preview p{margin:0 0 14px}
        .blog-preview ul,.blog-preview ol{margin:0 0 14px 22px}
        .blog-preview li{margin:4px 0}
        .blog-preview strong{font-weight:600}
        .blog-preview a{color:#0A66C2;text-decoration:underline}
        .blog-preview table{width:100%;border-collapse:collapse;margin:16px 0;font-size:13px}
        .blog-preview th,.blog-preview td{border:1px solid #e5e7eb;padding:8px 10px;text-align:left}
        .blog-preview hr{border:none;border-top:1px solid #e5e7eb;margin:28px 0}
        .blog-preview blockquote{border-left:3px solid #1db954;padding:8px 16px;margin:16px 0;background:#f0fdf4;font-style:italic}
      `}</style>
    </div>
  );
}
