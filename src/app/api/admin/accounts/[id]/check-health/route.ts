import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const account = await prisma.linkedInAccount.findUnique({ where: { id } });
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    if (!account.linkedinUrl) {
      // No URL to check — be honest: we can't tell, so record Unknown (never a fake Active).
      const u = await prisma.linkedInAccount.update({ where: { id }, data: { linkedinAccountHealth: "unknown", healthCheckedAt: new Date() } });
      return NextResponse.json({ health: u.linkedinAccountHealth, checkedAt: u.healthCheckedAt, reason: "No LinkedIn URL set" });
    }

    let url = account.linkedinUrl;
    if (!url.startsWith("http")) url = `https://${url}`;

    let health = "unknown";

    try {
      // NB: from Vercel's server IP, LinkedIn almost always serves a login wall rather than
      // the real profile — so this can only catch blatant "profile unavailable/restricted"
      // pages. Anything we can't confirm is reported as Unknown (not guessed as Active).
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          "Sec-Ch-Ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
          "Sec-Ch-Ua-Mobile": "?0",
          "Sec-Ch-Ua-Platform": '"macOS"',
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
          "Upgrade-Insecure-Requests": "1",
          "Cache-Control": "no-cache",
        },
        redirect: "follow",
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const html = await response.text();
      const htmlLower = html.toLowerCase();

      const restrictedSignals = ["this profile is not available", "profile-unavailable", "has been restricted", "temporarily restricted", "account has been restricted", "this page is not available", "couldn't find this page", "page not found"];
      // login wall / rate limit — means we did NOT see the real profile, so we can't tell
      const authWall = response.status === 999 || htmlLower.includes("authwall") || htmlLower.includes("join linkedin") || htmlLower.includes("join now to see") || htmlLower.includes("sign in to see") || htmlLower.includes("please sign in");
      // strong markers that we actually got the real public profile page
      const looksLikeProfile = htmlLower.includes('"@type":"person"') || htmlLower.includes("profile-topcard") || htmlLower.includes("pv-top-card");

      if (restrictedSignals.some((s) => htmlLower.includes(s))) {
        health = "restricted";
      } else if (response.status === 404) {
        health = "not_found";
      } else if (looksLikeProfile && !authWall) {
        // we can actually see the real profile content and it's not restricted
        health = "active";
      } else {
        // login wall / rate-limited / couldn't confirm — be honest rather than guess "active"
        health = "unknown";
      }
    } catch {
      health = "error";
    }

    const updated = await prisma.linkedInAccount.update({
      where: { id },
      data: {
        linkedinAccountHealth: health,
        healthCheckedAt: new Date(),
      },
    });

    return NextResponse.json({
      health: updated.linkedinAccountHealth,
      checkedAt: updated.healthCheckedAt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
