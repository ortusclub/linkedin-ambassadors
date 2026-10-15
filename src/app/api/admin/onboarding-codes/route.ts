import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// Recently-captured LinkedIn verification emails (confirm link + code) for any address on our
// onboarding domains — including addresses added to LinkedIn manually that never went through
// the wizard. Lets the team read the confirmation for a manually-onboarded email.
export async function GET(req: Request) {
  try {
    await requireAdmin();
    const q = new URL(req.url).searchParams.get("q")?.trim().toLowerCase() || "";
    const rows = await prisma.capturedVerification.findMany({
      where: q ? { OR: [{ address: { contains: q } }, { subject: { contains: q, mode: "insensitive" } }] } : undefined,
      orderBy: { receivedAt: "desc" },
      take: 100,
      select: { id: true, address: true, subject: true, confirmUrl: true, code: true, receivedAt: true },
    });
    return NextResponse.json({ rows });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
