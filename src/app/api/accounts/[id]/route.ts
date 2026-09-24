import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { maskPublicAccount } from "@/lib/mask";

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
      notes: true,
      inventoryPool: true,
    },
  });

  // Ortus-pool accounts are segregated inventory — not exposed via the public detail
  // endpoint (they're only reachable by info@ortus.solutions through their dashboard).
  if (!account || account.inventoryPool === "ortus") {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  return NextResponse.json({ account: maskPublicAccount(account) });
}
