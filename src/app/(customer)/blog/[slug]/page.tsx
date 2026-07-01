import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBlogPost, getAllBlogPosts } from "@/lib/blog-posts";
import { blogFontVars } from "@/lib/blog-fonts";
import ArticleView from "./article-view";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return { title: "Post Not Found" };
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { title: post.title, description: post.description, url: `https://linkedvelocity.com/blog/${post.slug}`, type: "article", publishedTime: post.date },
    twitter: { card: "summary_large_image", title: post.title, description: post.description },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();

  const html = markdownToHtml(post.content);

  const all = await getAllBlogPosts();
  const related = all
    .filter((p) => p.slug !== post.slug)
    .sort((a, b) => {
      const ca = a.category === post.category ? 1 : 0, cb = b.category === post.category ? 1 : 0;
      return cb !== ca ? cb - ca : b.date.localeCompare(a.date);
    })
    .slice(0, 3)
    .map((p) => ({ slug: p.slug, title: p.title, description: p.description, category: p.category, date: p.date, readTime: p.readTime }));

  const articleSchema = {
    "@context": "https://schema.org", "@type": "Article", headline: post.title, description: post.description, datePublished: post.date,
    author: { "@type": "Organization", name: "LinkedVelocity" },
    publisher: { "@type": "Organization", name: "LinkedVelocity", url: "https://linkedvelocity.com" },
    mainEntityOfPage: `https://linkedvelocity.com/blog/${post.slug}`,
  };

  return (
    <div className={blogFontVars}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <ArticleView post={{ slug: post.slug, title: post.title, description: post.description, category: post.category, date: post.date, readTime: post.readTime }} html={html} related={related} />
    </div>
  );
}

function markdownToHtml(md: string): string {
  let html = md;
  // Tables
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
  // Blockquotes (one or more consecutive "> " lines → a styled pull-quote)
  html = html.replace(/(?:^>.*$\n?)+/gm, (m) => {
    const inner = m.trim().split("\n").map((l) => l.replace(/^>\s?/, "")).filter(Boolean).join("<br />");
    return `<blockquote><p>${inner}</p></blockquote>`;
  });
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
