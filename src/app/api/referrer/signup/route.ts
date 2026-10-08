import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendReferrerWelcomeEmail, sendReferrerSignupNotification } from "@/services/email";

// Public self-serve referrer sign-up (/become-a-referrer). Auto-creates a referrer
// record and returns their share link + dashboard immediately. No approval: a link
// only earns once someone they refer actually onboards. Dedupes by email so re-submits
// return the existing link instead of making a duplicate.
const schema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  contactMethod: z.enum(["whatsapp", "telegram", "viber"]),
  contactHandle: z.string().trim().min(1).max(120),
});

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://linkedvelocity.com";
const links = (slug: string, token: string) => ({ slug, token, shareUrl: `${APP_URL}/r/${slug}`, portalUrl: `${APP_URL}/m/${token}` });

export async function POST(req: Request) {
  try {
    const input = schema.parse(await req.json());
    const email = input.email.toLowerCase();

    // Already signed up with this email? Return their existing link (idempotent).
    const existing = await prisma.referrer.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { slug: true, token: true } });
    if (existing) return NextResponse.json({ ...links(existing.slug, existing.token), existing: true });

    const first = slugify(input.name.split(/\s+/)[0] || input.name) || "ref";
    let slug = "";
    do { slug = `${first}-${Math.floor(10 + Math.random() * 90)}`; } while (await prisma.referrer.findUnique({ where: { slug } }));
    const token = randomBytes(18).toString("base64url");

    await prisma.referrer.create({
      data: {
        slug, token, name: input.name, type: "marketer", email,
        contactMethod: input.contactMethod, contactHandle: input.contactHandle,
        contacts: [{ method: input.contactMethod, handle: input.contactHandle, preferred: true }],
      },
    });

    // Best-effort emails — never block signup on them.
    try { await sendReferrerWelcomeEmail(email, input.name, `${APP_URL}/r/${slug}`, `${APP_URL}/m/${token}`); } catch { /* shown on-page regardless */ }
    try { await sendReferrerSignupNotification(input.name, email, slug); } catch { /* team ping is best-effort */ }

    return NextResponse.json({ ...links(slug, token), existing: false }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Please fill in your name, a valid email, and a contact handle." }, { status: 400 });
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
