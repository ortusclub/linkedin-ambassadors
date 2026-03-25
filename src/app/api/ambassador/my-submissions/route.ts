import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

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
      where: { email: user.email },
      orderBy: { createdAt: "desc" },
    });

    // For onboarded submissions, find the matching LinkedIn account's GoLogin share link
    const linkedinUrls = submissions
      .filter((s) => s.status === "onboarded" || s.status === "approved")
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

    const enrichedSubmissions = submissions.map((sub) => ({
      ...sub,
      gologinShareLink: gologinLinks[sub.linkedinUrl] || MANUAL_SHARE_LINKS[sub.linkedinUrl] || null,
    }));

    return NextResponse.json({ submissions: enrichedSubmissions });
  } catch {
    return NextResponse.json({ submissions: [] });
  }
}
