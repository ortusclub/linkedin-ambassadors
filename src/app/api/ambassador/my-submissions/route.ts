import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

import { currencyConfigFor } from "@/lib/referral-currency";
import { submittedApplicationsWhere } from "@/lib/application-ownership";

export const dynamic = "force-dynamic";

// Manual GoLogin share links for onboarded submissions that don't have
// a matching LinkedInAccount record yet
const MANUAL_SHARE_LINKS: Record<string, string> = {
  "https://www.linkedin.com/in/ramon-almeda-032123105": "https://g.camp/share/ramon.almeda%40ortus.solutions/qvx8S6GXcr",
  "https://www.linkedin.com/in/ramon-almeda-032123105/": "https://g.camp/share/ramon.almeda%40ortus.solutions/qvx8S6GXcr",
  "www.linkedin.com/in/ramon-almeda-032123105": "https://g.camp/share/ramon.almeda%40ortus.solutions/qvx8S6GXcr",
  "linkedin.com/in/ramon-almeda-032123105": "https://g.camp/share/ramon.almeda%40ortus.solutions/qvx8S6GXcr",
};

export async function GET() {
  try {
    const user = await requireAuth();

    const submissions = await prisma.ambassadorApplication.findMany({
      where: submittedApplicationsWhere(user),
      orderBy: { createdAt: "desc" },
      include: { scheduledMeeting: { select: { id: true, startsAt: true, inviteSentAt: true, sequence: true } } },
    });

    // For onboarded submissions, find the matching LinkedIn account's GoLogin share link
    const linkedinUrls = submissions
      .filter((s) => s.status === "onboarded" || s.status === "onboarding" || s.status === "approved")
      .map((s) => s.linkedinUrl);

    let gologinLinks: Record<string, string> = {};
    if (linkedinUrls.length > 0) {
      const accounts = await prisma.linkedInAccount.findMany({
        where: { linkedinUrl: { in: linkedinUrls } },
        select: { linkedinUrl: true, gologinShareLink: true },
      });
      for (const account of accounts) {
        if (account.linkedinUrl && account.gologinShareLink) {
          gologinLinks[account.linkedinUrl] = account.gologinShareLink;
        }
      }
    }

    const enrichedSubmissions = submissions.map((sub) => {
      const usd = currencyConfigFor("USD", sub.referredBy, sub);
      const php = currencyConfigFor("PHP", sub.referredBy, sub);
      return {
        ...sub,
        deal: { setupUsd: usd.setupAmount, setupPhp: php.setupAmount, monthlyUsd: usd.monthlyAmount, monthlyPhp: php.monthlyAmount },
        gologinShareLink: gologinLinks[sub.linkedinUrl] || MANUAL_SHARE_LINKS[sub.linkedinUrl] || null,
      };
    });

    return NextResponse.json({ submissions: enrichedSubmissions }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: "Could not load submissions." }, { status: message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500, headers: { "Cache-Control": "private, no-store" } });
  }
}
