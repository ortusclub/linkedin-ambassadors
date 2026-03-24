import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// One-time endpoint to set GoLogin share link for Ramon Almeda's account
// DELETE THIS FILE after use
export async function POST(req: Request) {
  try {
    const { secret } = await req.json();
    if (secret !== "klabber-fix-2026") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const account = await prisma.linkedInAccount.findFirst({
      where: { linkedinUrl: { contains: "ramon-almeda" } },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    await prisma.linkedInAccount.update({
      where: { id: account.id },
      data: { gologinShareLink: "https://g.camp/share/ramon.almeda%40ortus.solutions/qvx8S6GXcr" },
    });

    return NextResponse.json({ success: true, accountId: account.id });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
