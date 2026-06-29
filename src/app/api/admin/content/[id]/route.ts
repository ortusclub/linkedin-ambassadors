import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const VALID_STATUS = ["idea", "draft", "in_review", "approved", "published"];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80) || "untitled";
}

// GET /api/admin/content/[id]
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const post = await prisma.blogPost.findUnique({ where: { id } });
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ post });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const code = msg === "Forbidden" ? 403 : msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}

// PATCH /api/admin/content/[id] — update fields and/or move through the workflow.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const existing = await prisma.blogPost.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const data: Record<string, unknown> = {};

    if (typeof body.title === "string") data.title = body.title;
    if (typeof body.description === "string") data.description = body.description;
    if (typeof body.category === "string") data.category = body.category;
    if ("keyword" in body) data.keyword = body.keyword || null;
    if ("pillar" in body) data.pillar = body.pillar || null;
    if (typeof body.content === "string") data.content = body.content;
    if ("readTime" in body) data.readTime = body.readTime || null;
    if ("reviewerNotes" in body) data.reviewerNotes = body.reviewerNotes || null;
    if ("scheduledFor" in body) data.scheduledFor = body.scheduledFor ? new Date(body.scheduledFor) : null;

    // slug change (keep unique)
    if (typeof body.slug === "string" && body.slug.trim()) {
      let slug = slugify(body.slug);
      let base = slug, n = 1;
      while (true) {
        const clash = await prisma.blogPost.findUnique({ where: { slug } });
        if (!clash || clash.id === id) break;
        slug = `${base}-${n++}`;
      }
      data.slug = slug;
    }

    // status / workflow transition
    if (typeof body.status === "string") {
      if (!VALID_STATUS.includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      data.status = body.status;
      if (body.status === "published") {
        // stamp publish time the first time it goes live
        data.publishedAt = existing.publishedAt ?? new Date();
      }
      if (body.status !== "published" && existing.status === "published") {
        // un-publishing pulls it from the live site (keep publishedAt history? clear it)
        data.publishedAt = null;
      }
    }

    const post = await prisma.blogPost.update({ where: { id }, data });
    return NextResponse.json({ post });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const code = msg === "Forbidden" ? 403 : msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}

// DELETE /api/admin/content/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.blogPost.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const code = msg === "Forbidden" ? 403 : msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
