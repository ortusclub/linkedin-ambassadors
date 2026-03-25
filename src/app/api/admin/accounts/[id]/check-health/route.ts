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
      return NextResponse.json({ error: "No LinkedIn URL set for this account" }, { status: 400 });
    }

    // Normalize the LinkedIn URL
    let url = account.linkedinUrl;
    if (!url.startsWith("http")) {
      url = `https://${url}`;
    }

    let health = "unknown";

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
        },
        redirect: "follow",
      });

      const html = await response.text();

      // Check for restricted/unavailable signals
      const restrictedSignals = [
        "this profile is not available",
        "This LinkedIn Page isn",
        "profile-unavailable",
        "has been restricted",
        "temporarily restricted",
        "account has been restricted",
        "this account is not available",
      ];

      const isRestricted = restrictedSignals.some((signal) =>
        html.toLowerCase().includes(signal.toLowerCase())
      );

      if (response.status === 404) {
        health = "not_found";
      } else if (isRestricted) {
        health = "restricted";
      } else if (response.status === 999) {
        // LinkedIn rate-limited but didn't say restricted — profile likely exists
        health = "active";
      } else if (
        html.includes("linkedin.com") ||
        html.includes("authwall") ||
        html.includes("auth_wall") ||
        html.includes("Sign in") ||
        html.includes("join LinkedIn") ||
        html.includes("LinkedIn") ||
        response.ok
      ) {
        // If LinkedIn returns any page (including auth wall), the profile exists
        // A restricted profile would have been caught above
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
