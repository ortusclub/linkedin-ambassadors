import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getNextProxy } from "@/lib/proxy-pool";

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
      return NextResponse.json({ error: "No LinkedIn URL set" }, { status: 400 });
    }

    let url = account.linkedinUrl;
    if (!url.startsWith("http")) url = `https://${url}`;

    let health = "unknown";

    try {
      // Use a proxy from the pool so LinkedIn doesn't block the request
      const proxy = getNextProxy();
      const proxyUrl = `http://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`;

      // Use the proxy via a CONNECT-style fetch with ProxyAgent
      // Vercel doesn't support native proxy, so we'll use direct fetch with proxy headers
      // Fallback: try direct fetch with realistic browser headers
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

      // Check for restricted/unavailable signals first
      if (
        htmlLower.includes("this profile is not available") ||
        htmlLower.includes("profile-unavailable") ||
        htmlLower.includes("has been restricted") ||
        htmlLower.includes("temporarily restricted") ||
        htmlLower.includes("account has been restricted") ||
        htmlLower.includes("this page is not available") ||
        htmlLower.includes("couldn't find this page") ||
        htmlLower.includes("page not found")
      ) {
        health = "restricted";
      } else if (response.status === 404) {
        health = "not_found";
      } else if (
        htmlLower.includes("linkedin") &&
        (response.ok || response.status === 999 || response.status === 302)
      ) {
        // LinkedIn returned a page mentioning LinkedIn — profile exists
        // Status 999 = rate limited but profile exists
        // Auth wall also means profile exists and is active
        health = "active";
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
