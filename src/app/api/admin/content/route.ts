import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80) || "untitled";
}

// GET /api/admin/content — list ALL posts (any status) for the admin views.
export async function GET() {
  try {
    await requireAdmin();
    const posts = await prisma.blogPost.findMany({
      orderBy: [{ scheduledFor: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ posts });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const code = msg === "Forbidden" ? 403 : msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}

// POST /api/admin/content — create a new draft.
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const title: string = (body.title || "Untitled draft").toString();

    // ensure a unique slug
    let base = body.slug ? slugify(body.slug) : slugify(title);
    let slug = base;
    let n = 1;
    while (await prisma.blogPost.findUnique({ where: { slug } })) {
      slug = `${base}-${n++}`;
    }

    const post = await prisma.blogPost.create({
      data: {
        title,
        slug,
        description: body.description || "",
        category: body.category || "LinkedIn Strategy",
        keyword: body.keyword || null,
        pillar: body.pillar || null,
        content: body.content || "",
        readTime: body.readTime || null,
        status: "draft",
        scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : null,
        authorEmail: admin.email,
      },
    });
    return NextResponse.json({ post });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const code = msg === "Forbidden" ? 403 : msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
