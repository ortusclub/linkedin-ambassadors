import { NextResponse } from "next/server";

// Short share link for marketers: /r/<slug> -> the ambassador signup form with
// their referral tag attached. Keeps the QR/link short and clean.
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dest = new URL(`/become-ambassador?ref=${encodeURIComponent(slug)}`, req.url);
  return NextResponse.redirect(dest);
}
