import { monthlyRentalPrice } from "@/lib/account-pricing";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { maskPublicAccount } from "@/lib/mask";
import { activeShadowAccountIds } from "@/lib/shadow-rental";

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
  // Segregated pools (Ortus / Apex) are never shown in the public catalogue (or to
  // shadow renters) — they're owned by their pool account only.
  where.inventoryPool = { notIn: ["ortus", "apex"] };
  // Accounts currently shadow-rented by Apex / Ortus are surfaced as non-rentable
  // "Available soon" teasers (flagged below). They're in use by a shadow renter right
  // now but a real rental yields them, so they're coming back. Many get flipped to
  // status "unavailable" / unlisted while held, so we pull them in by id regardless of
  // status — checkout + the account-detail API still block anything not "available".
  const shadowIds = await activeShadowAccountIds();
  const shadowIdList = [...shadowIds];
  if (statusFilter) {
    where.status = statusFilter;
    where.listed = true;
    // Same guard when explicitly filtering to "available": don't surface restricted /
    // 2FA-reset accounts that still carry status "available".
    if (statusFilter === "available") { where.restrictedAt = null; where.twoFactorResetNeeded = false; }
  } else {
    // Available accounts must be listed to appear; rented AND trial accounts show
    // regardless of `listed` — displayed as "Rented" (social proof / real inventory,
    // including off-platform rentals which are held unlisted). Shadow-held accounts
    // surface by id as "Available soon" teasers.
    and.push({ OR: [
      // "Available" must also be genuinely rentable: a restricted (recovering) or
      // 2FA-reset-needed account keeps status "available" but must NOT be offered —
      // mirrors the admin canonicalStatus so the catalogue and inventory agree.
      { status: "available", listed: true, restrictedAt: null, twoFactorResetNeeded: false },
      { status: { in: ["rented", "trial"] } },
      { id: { in: shadowIdList } },
    ] });
  }

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
