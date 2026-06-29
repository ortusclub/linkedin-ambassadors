import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { staticBlogPosts } from "@/lib/blog-posts";

export const dynamic = "force-dynamic";

// One-time (idempotent) import of the original hardcoded posts into the DB as
// PUBLISHED, so the live blog keeps working after the switch to DB-backed posts.
// Protected by CRON_SECRET. Safe to re-run — upserts by slug.
async function seed(secret: string | null) {
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let created = 0, updated = 0;
  for (const p of staticBlogPosts) {
    const existing = await prisma.blogPost.findUnique({ where: { slug: p.slug } });
    const publishedAt = new Date(`${p.date}T12:00:00Z`);
    const data = {
      title: p.title,
      description: p.description,
      category: p.category,
      content: p.content,
      readTime: p.readTime,
      status: "published",
      publishedAt,
      scheduledFor: publishedAt,
    };
    if (existing) {
      await prisma.blogPost.update({ where: { slug: p.slug }, data });
      updated++;
    } else {
      await prisma.blogPost.create({ data: { slug: p.slug, ...data } });
      created++;
    }
  }
  const total = await prisma.blogPost.count();
  return NextResponse.json({ ok: true, created, updated, totalInDb: total });
}

export async function GET(req: Request) {
  return seed(new URL(req.url).searchParams.get("secret"));
}
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  return seed(body.secret ?? new URL(req.url).searchParams.get("secret"));
}
