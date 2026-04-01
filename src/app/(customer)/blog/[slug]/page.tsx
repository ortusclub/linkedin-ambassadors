import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBlogPost, getAllBlogPosts } from "@/lib/blog-posts";

export async function generateStaticParams() {
  return getAllBlogPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return { title: "Post Not Found" };

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://klabber.co/blog/${post.slug}`,
      type: "article",
      publishedTime: post.date,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  // Convert markdown-like content to HTML
  const htmlContent = markdownToHtml(post.content);

  // Article JSON-LD
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: { "@type": "Organization", name: "Klabber" },
    publisher: {
      "@type": "Organization",
      name: "Klabber",
      url: "https://klabber.co",
    },
    mainEntityOfPage: `https://klabber.co/blog/${post.slug}`,
  };

  return (
    <>
      <style>{`
        :root{--bg:#FAFAF8;--surface:#FFFFFF;--text:#0F1419;--text-mid:#536471;--text-light:#8899A6;--border:#E8E6E1;--blue:#0A66C2;--blue-dark:#004182;--blue-light:#E8F1FA;--accent:#1D1B16;--radius:10px;--radius-lg:16px}
        body{font-family:'DM Sans',system-ui,sans-serif;color:var(--text);background:var(--bg);-webkit-font-smoothing:antialiased}
        .article-page{max-width:760px;margin:0 auto;padding:60px 24px 120px}
        .article-back{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--text-mid);text-decoration:none;margin-bottom:32px;font-weight:500;transition:color .2s}
        .article-back:hover{color:var(--blue)}
        .article-meta{display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap}
        .article-category{font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--blue);background:var(--blue-light);padding:4px 10px;border-radius:100px}
        .article-date,.article-read{font-size:13px;color:var(--text-light)}
        .article-title{font-size:clamp(28px,4vw,42px);font-weight:700;letter-spacing:-0.03em;line-height:1.15;margin-bottom:16px}
        .article-desc{font-size:18px;color:var(--text-mid);line-height:1.6;margin-bottom:40px;padding-bottom:40px;border-bottom:1px solid var(--border)}
        .article-body{line-height:1.8;font-size:16px}
        .article-body h2{font-size:28px;font-weight:700;letter-spacing:-0.02em;margin:48px 0 16px;line-height:1.2}
        .article-body h3{font-size:22px;font-weight:600;letter-spacing:-0.01em;margin:36px 0 12px;line-height:1.3}
        .article-body p{margin-bottom:20px;color:var(--text)}
        .article-body ul,.article-body ol{margin:0 0 20px 24px}
        .article-body li{margin-bottom:8px;line-height:1.7}
        .article-body strong{font-weight:600;color:var(--text)}
        .article-body a{color:var(--blue);text-decoration:underline;text-underline-offset:2px}
        .article-body a:hover{color:var(--blue-dark)}
        .article-body blockquote{border-left:3px solid var(--blue);padding:12px 20px;margin:24px 0;background:var(--blue-light);border-radius:0 var(--radius) var(--radius) 0;font-style:italic;color:var(--text-mid)}
        .article-body table{width:100%;border-collapse:collapse;margin:24px 0;font-size:14px}
        .article-body th{text-align:left;padding:10px 14px;background:var(--surface);border:1px solid var(--border);font-weight:600;font-size:13px}
        .article-body td{padding:10px 14px;border:1px solid var(--border)}
        .article-body hr{border:none;border-top:1px solid var(--border);margin:48px 0}
        .article-body em{font-style:italic;color:var(--text-mid)}
        .article-cta{margin-top:48px;padding:32px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);text-align:center}
        .article-cta h3{font-size:22px;font-weight:600;margin-bottom:12px}
        .article-cta p{font-size:15px;color:var(--text-mid);margin-bottom:20px}
        .article-cta a{display:inline-block;padding:12px 28px;background:var(--blue);color:#fff;border-radius:var(--radius);font-size:14px;font-weight:600;text-decoration:none;transition:all .2s}
        .article-cta a:hover{background:var(--blue-dark);transform:translateY(-1px)}
        @media(max-width:640px){.article-page{padding:40px 16px 80px}}
      `}</style>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <article className="article-page">
        <Link href="/blog" className="article-back">
          ← Back to Blog
        </Link>

        <div className="article-meta">
          <span className="article-category">{post.category}</span>
          <span className="article-date">
            {new Date(post.date).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <span className="article-read">{post.readTime}</span>
        </div>

        <h1 className="article-title">{post.title}</h1>
        <p className="article-desc">{post.description}</p>

        <div
          className="article-body"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />

        <div className="article-cta">
          <h3>Scale Your LinkedIn Outreach</h3>
          <p>
            Browse pre-warmed, verified LinkedIn accounts ready for campaigns.
            Instant access, cancel anytime.
          </p>
          <Link href="/catalogue">Browse Available Accounts →</Link>
        </div>
      </article>
    </>
  );
}

function markdownToHtml(md: string): string {
  let html = md;

  // Tables
  html = html.replace(
    /\|(.+)\|\n\|[-| ]+\|\n((?:\|.+\|\n?)+)/g,
    (_, header, body) => {
      const ths = header
        .split("|")
        .filter((c: string) => c.trim())
        .map((c: string) => `<th>${c.trim()}</th>`)
        .join("");
      const rows = body
        .trim()
        .split("\n")
        .map((row: string) => {
          const tds = row
            .split("|")
            .filter((c: string) => c.trim())
            .map((c: string) => `<td>${c.trim()}</td>`)
            .join("");
          return `<tr>${tds}</tr>`;
        })
        .join("");
      return `<table><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table>`;
    }
  );

  // Headings
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Links
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2">$1</a>'
  );

  // Unordered lists
  html = html.replace(
    /(?:^- .+$\n?)+/gm,
    (match) => {
      const items = match
        .trim()
        .split("\n")
        .map((line) => `<li>${line.replace(/^- /, "")}</li>`)
        .join("");
      return `<ul>${items}</ul>`;
    }
  );

  // Ordered lists
  html = html.replace(
    /(?:^\d+\. .+$\n?)+/gm,
    (match) => {
      const items = match
        .trim()
        .split("\n")
        .map((line) => `<li>${line.replace(/^\d+\. /, "")}</li>`)
        .join("");
      return `<ol>${items}</ol>`;
    }
  );

  // Horizontal rules
  html = html.replace(/^---$/gm, "<hr />");

  // Italic (after bold to avoid conflicts)
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Paragraphs — wrap remaining text blocks
  html = html
    .split("\n\n")
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (
        trimmed.startsWith("<h") ||
        trimmed.startsWith("<ul") ||
        trimmed.startsWith("<ol") ||
        trimmed.startsWith("<table") ||
        trimmed.startsWith("<hr") ||
        trimmed.startsWith("<blockquote")
      ) {
        return trimmed;
      }
      return `<p>${trimmed}</p>`;
    })
    .join("\n");

  return html;
}
