import type { Metadata } from "next";
import { getAllBlogPosts } from "@/lib/blog-posts";
import { blogFontVars } from "@/lib/blog-fonts";
import BlogIndex from "./blog-index";

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
  const cards = posts.map((p) => ({ slug: p.slug, title: p.title, description: p.description, category: p.category, date: p.date, readTime: p.readTime }));
  return (
    <div className={blogFontVars} style={{ background: "#F6F7F9", minHeight: "100vh" }}>
      <BlogIndex posts={cards} />
    </div>
  );
}
