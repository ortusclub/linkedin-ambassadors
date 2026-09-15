import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import { v4 as uuid } from "uuid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const TYPES: Record<string, string> = {
  "image/jpeg": "jpg", "image/pjpeg": "jpg", "image/png": "png",
  "image/webp": "webp", "image/heic": "heic", "image/heif": "heif",
};

// Token-gated so the owner can attach a profile photo during self-service onboarding.
// (The admin /api/upload route requires an admin session, which the wizard does not have.)
export async function POST(req: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const origin = req.headers.get("origin");
    if (origin && origin !== new URL(req.url).origin) return NextResponse.json({ error: "Request origin not allowed." }, { status: 403 });
    const me = await prisma.referrer.findUnique({ where: { token } });
    if (!me || !me.active) return NextResponse.json({ error: "This referral portal is not available." }, { status: 404 });

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "No image provided." }, { status: 400 });
    const ext = TYPES[file.type];
    if (!ext) return NextResponse.json({ error: "Upload a JPG, PNG or WEBP image." }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image must be 8MB or smaller." }, { status: 400 });

    const blob = await put(`onboarding-photos/${uuid()}.${ext}`, file, { access: "public", contentType: file.type });
    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Onboarding photo upload failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
