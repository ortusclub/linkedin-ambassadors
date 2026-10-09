import { monthlyRentalPrice } from "@/lib/account-pricing";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { maskPublicAccount } from "@/lib/mask";
import { getSession } from "@/lib/auth";
import { publicInventorySlice } from "@/lib/public-inventory";

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
  const where: Record<string, unknown> = {};
  const and: Record<string, unknown>[] = [];
  // Only a fixed slice of the roster is ever served here (see lib/public-inventory):
  // PUBLIC_AVAILABLE_CAP rentable + PUBLIC_RENTED_CAP rented/trial/shadow-held teasers.
  // Applies to anonymous visitors and signed-in renters alike, and search / filters only
  // narrow within the slice — so nobody can page through the whole inventory. Segregated
  // pools (Ortus / Apex) are excluded by the slice itself.
  const { availableIds, rentedIds, shadowIds } = await publicInventorySlice();
  // A signed-in renter always sees the accounts they currently rent ("Rented by you"),
  // even if those fall outside the public slice.
  const session = await getSession().catch(() => null);
  let ownIds: string[] = [];
  if (session) {
    const own = await prisma.rental.findMany({
      where: { userId: session.id, status: { in: ["active", "pending_access", "payment_failed"] } },
      select: { linkedinAccountId: true },
    });
    ownIds = own.map((r) => r.linkedinAccountId);
  }
  if (statusFilter === "available") where.id = { in: availableIds };
  else if (statusFilter) { where.id = { in: [...rentedIds, ...ownIds] }; where.status = statusFilter; }
  else where.id = { in: [...availableIds, ...rentedIds, ...ownIds] };

  if (industry) where.industry = industry;
  if (location) where.location = { contains: location, mode: "insensitive" };
  if (minConnections) where.connectionCount = { ...((where.connectionCount as object) || {}), gte: parseInt(minConnections) };
  if (maxConnections) where.connectionCount = { ...((where.connectionCount as object) || {}), lte: parseInt(maxConnections) };
  if (hasSalesNav === "true") where.hasSalesNav = true;
  if (search) {
    and.push({ OR: [
      { linkedinName: { contains: search, mode: "insensitive" } },
      { linkedinHeadline: { contains: search, mode: "insensitive" } },
      { industry: { contains: search, mode: "insensitive" } },
    ] });
  }
  if (and.length) where.AND = and;

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
      linkedinVerified: true,
      monthlyPrice: true,
      status: true,
      linkedinUrl: true,
      notes: true,
    },
  });

  return NextResponse.json({
    // `availableSoon` = currently shadow-held by Apex / Ortus; rendered as a non-rentable
    // teaser in the catalogue (checkout + account-detail already block non-available ones).
    accounts: accounts.map((a) =>
      maskPublicAccount({
        ...a,
        availableSoon: shadowIds.has(a.id),
        monthlyPrice: monthlyRentalPrice(a),
      }),
    ),
  });
}
