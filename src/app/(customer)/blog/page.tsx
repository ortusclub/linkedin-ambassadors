import type { Metadata } from "next";
import Link from "next/link";
import { getAllBlogPosts } from "@/lib/blog-posts";

export const metadata: Metadata = {
  title: "Blog — LinkedIn Outreach Tips, Strategy & Compliance",
  description:
    "Expert guides on LinkedIn outreach campaigns, connection limits, automation compliance, and scaling B2B lead generation. Updated for 2026.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "LinkedVelocity Blog — LinkedIn Outreach Strategy",
    description: "Expert guides on LinkedIn outreach, limits, and scaling lead generation.",
    url: "https://linkedvelocity.com/blog",
  },
};

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const posts = await getAllBlogPosts();

  return (
    <>
      <style>{`
        :root{--bg:#FAFAF8;--surface:#FFFFFF;--surface-alt:#F3F2EE;--text:#0F1419;--text-mid:#536471;--text-light:#8899A6;--border:#E8E6E1;--blue:#0A66C2;--blue-dark:#004182;--blue-light:#E8F1FA;--accent:#1D1B16;--radius:10px;--radius-lg:16px}
        body{font-family:'Karla',system-ui,sans-serif;color:var(--text);background:var(--bg);-webkit-font-smoothing:antialiased}
        .blog-page{max-width:900px;margin:0 auto;padding:80px 24px 120px}
        .blog-header{margin-bottom:64px}
        .blog-label{font-size:12px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:var(--blue);margin-bottom:12px}
        .blog-title{font-size:clamp(32px,4vw,48px);font-weight:700;letter-spacing:-0.03em;line-height:1.1;margin-bottom:16px}
        .blog-subtitle{font-size:17px;color:var(--text-mid);line-height:1.6;max-width:560px}
        .blog-grid{display:flex;flex-direction:column;gap:24px}
        .blog-card{display:block;padding:32px;border-radius:var(--radius-lg);background:var(--surface);border:1px solid var(--border);transition:all .2s;text-decoration:none;color:inherit}
        .blog-card:hover{border-color:var(--blue);box-shadow:0 8px 24px rgba(10,102,194,0.06);transform:translateY(-2px)}
        .blog-card-meta{display:flex;align-items:center;gap:12px;margin-bottom:12px}
        .blog-card-category{font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--blue);background:var(--blue-light);padding:4px 10px;border-radius:100px}
        .blog-card-date{font-size:13px;color:var(--text-light)}
        .blog-card-read{font-size:13px;color:var(--text-light)}
        .blog-card h2{font-size:22px;font-weight:600;letter-spacing:-0.02em;margin-bottom:8px;line-height:1.3}
        .blog-card p{font-size:15px;color:var(--text-mid);line-height:1.6}
        .blog-card-arrow{font-size:14px;color:var(--blue);font-weight:600;margin-top:12px;display:inline-block}
      `}</style>

      <div className="blog-page">
        <div className="blog-header">
          <div className="blog-label">Blog</div>
          <h1 className="blog-title">LinkedIn Outreach Insights</h1>
          <p className="blog-subtitle">
            Guides, strategies, and compliance tips for scaling B2B outreach on LinkedIn.
          </p>
        </div>

        <div className="blog-grid">
          {posts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="blog-card">
              <div className="blog-card-meta">
                <span className="blog-card-category">{post.category}</span>
                <span className="blog-card-date">{new Date(post.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                <span className="blog-card-read">{post.readTime}</span>
              </div>
              <h2>{post.title}</h2>
              <p>{post.description}</p>
              <span className="blog-card-arrow">Read article →</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
