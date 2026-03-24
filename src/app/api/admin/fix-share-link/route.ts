import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// One-time endpoint to set GoLogin share link
// DELETE THIS FILE after use
export async function POST(req: Request) {
  try {
    const { secret, action } = await req.json();
    if (secret !== "klabber-fix-2026") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Debug: list all LinkedIn accounts to find the right one
    if (action === "list") {
      const accounts = await prisma.linkedInAccount.findMany({
        select: { id: true, linkedinName: true, linkedinUrl: true, gologinShareLink: true },
      });
      return NextResponse.json({ accounts });
    }

    // Try multiple search strategies
    let account = await prisma.linkedInAccount.findFirst({
      where: { linkedinUrl: { contains: "ramon" } },
    });
    if (!account) {
      account = await prisma.linkedInAccount.findFirst({
        where: { linkedinName: { contains: "Ramon", mode: "insensitive" } },
      });
    }
    if (!account) {
      account = await prisma.linkedInAccount.findFirst({
        where: { notes: { contains: "ramon", mode: "insensitive" } },
      });
    }

    if (!account) {
      return NextResponse.json({ error: "Account not found. Use action: list to see all accounts." }, { status: 404 });
    }

    await prisma.linkedInAccount.update({
      where: { id: account.id },
      data: { gologinShareLink: "https://g.camp/share/ramon.almeda%40ortus.solutions/qvx8S6GXcr" },
    });

    return NextResponse.json({ success: true, accountId: account.id, name: account.linkedinName });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
