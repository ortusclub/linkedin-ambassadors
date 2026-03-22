import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const account = await prisma.linkedInAccount.findUnique({
    where: { id },
    select: {
      id: true,
      linkedinName: true,
      linkedinHeadline: true,
      linkedinUrl: true,
      connectionCount: true,
      industry: true,
      location: true,
      profileScreenshotUrl: true,
      profilePhotoUrl: true,
      accountAgeMonths: true,
      hasSalesNav: true,
      monthlyPrice: true,
      status: true,
    },
  });

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  return NextResponse.json({ account });
}
