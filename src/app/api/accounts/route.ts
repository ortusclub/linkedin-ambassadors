import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const industry = searchParams.get("industry");
  const location = searchParams.get("location");
  const minConnections = searchParams.get("minConnections");
  const maxConnections = searchParams.get("maxConnections");
  const hasSalesNav = searchParams.get("hasSalesNav");
  const sort = searchParams.get("sort") || "connectionCount";
  const search = searchParams.get("search");

  const statusFilter = searchParams.get("status");
  const where: Record<string, unknown> = { listed: true };
  if (statusFilter) {
    where.status = statusFilter;
  } else {
    where.status = { in: ["available", "rented"] };
  }

  if (industry) where.industry = industry;
  if (location) where.location = { contains: location, mode: "insensitive" };
  if (minConnections) where.connectionCount = { ...((where.connectionCount as object) || {}), gte: parseInt(minConnections) };
  if (maxConnections) where.connectionCount = { ...((where.connectionCount as object) || {}), lte: parseInt(maxConnections) };
  if (hasSalesNav === "true") where.hasSalesNav = true;
  if (search) {
    where.OR = [
      { linkedinName: { contains: search, mode: "insensitive" } },
      { linkedinHeadline: { contains: search, mode: "insensitive" } },
      { industry: { contains: search, mode: "insensitive" } },
    ];
  }

  const orderBy: Record<string, string> = {};
  if (sort === "connectionCount") orderBy.connectionCount = "desc";
  else if (sort === "accountAge") orderBy.accountAgeMonths = "desc";
  else if (sort === "newest") orderBy.createdAt = "desc";

  const accounts = await prisma.linkedInAccount.findMany({
    where,
    orderBy,
    select: {
      id: true,
      linkedinName: true,
      linkedinHeadline: true,
      connectionCount: true,
      industry: true,
      location: true,
      profilePhotoUrl: true,
      accountAgeMonths: true,
      hasSalesNav: true,
      monthlyPrice: true,
      status: true,
      linkedinUrl: true,
    },
  });

  return NextResponse.json({ accounts });
}
