import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";
import * as gologin from "@/services/gologin";

const createAccountSchema = z.object({
  linkedinName: z.string().min(1),
  linkedinHeadline: z.string().optional(),
  linkedinUrl: z.string().optional(),
  connectionCount: z.number().int().min(0).default(0),
  industry: z.string().optional(),
  location: z.string().optional(),
  profileScreenshotUrl: z.string().optional(),
  profilePhotoUrl: z.string().optional(),
  proxyHost: z.string().optional(),
  proxyPort: z.number().int().optional(),
  proxyUsername: z.string().optional(),
  proxyPassword: z.string().optional(),
  accountAgeMonths: z.number().int().optional(),
  hasSalesNav: z.boolean().default(false),
  monthlyPrice: z.number().optional(),
  ambassadorPayment: z.number().optional(),
  notes: z.string().optional(),
  cookies: z.array(z.record(z.string(), z.unknown())).optional(),
  createGologinProfile: z.boolean().default(false),
  status: z.enum(["under_review", "available", "unavailable", "rented", "maintenance", "retired"]).default("under_review"),
});

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const accounts = await prisma.linkedInAccount.findMany({
      where,
      include: {
        rentals: {
          where: { status: "active" },
          include: { user: { select: { fullName: true, email: true } } },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Resolve owner names from notes
    const ownerEmails = accounts
      .map((a) => (a.notes || "").match(/Owner:\s*(\S+@\S+)/)?.[1]?.replace(/\.$/, ""))
      .filter(Boolean) as string[];

    const ownerUsers = ownerEmails.length > 0
      ? await prisma.user.findMany({
          where: { email: { in: ownerEmails } },
          select: { email: true, fullName: true },
        })
      : [];

    const ownerMap = new Map(ownerUsers.map((u) => [u.email, u.fullName]));

    const accountsWithOwner = accounts.map((a) => {
      const ownerEmail = (a.notes || "").match(/Owner:\s*(\S+@\S+)/)?.[1]?.replace(/\.$/, "") || "";
      return {
        ...a,
        ownerName: ownerMap.get(ownerEmail) || ownerEmail || null,
        ownerEmail: ownerEmail || null,
      };
    });

    return NextResponse.json({ accounts: accountsWithOwner });
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json();
    const data = createAccountSchema.parse(body);

    let gologinProfileId: string | undefined;

    // Create GoLogin profile if requested
    if (data.createGologinProfile) {
      try {
        const profile = await gologin.createProfile({
          name: data.linkedinName,
          proxy:
            data.proxyHost && data.proxyPort
              ? {
                  host: data.proxyHost,
                  port: data.proxyPort,
                  username: data.proxyUsername || undefined,
                  password: data.proxyPassword || undefined,
                }
              : undefined,
        });
        gologinProfileId = profile.id;

        if (data.cookies && gologinProfileId) {
          await gologin.addCookies(gologinProfileId, data.cookies);
        }
      } catch (err) {
        console.error("GoLogin profile creation failed:", err);
      }
    }

    const account = await prisma.linkedInAccount.create({
      data: {
        gologinProfileId,
        linkedinName: data.linkedinName,
        linkedinHeadline: data.linkedinHeadline,
        linkedinUrl: data.linkedinUrl,
        connectionCount: data.connectionCount,
        industry: data.industry,
        location: data.location,
        profileScreenshotUrl: data.profileScreenshotUrl,
        profilePhotoUrl: data.profilePhotoUrl,
        proxyHost: data.proxyHost,
        proxyPort: data.proxyPort,
        proxyUsername: data.proxyUsername,
        proxyPassword: data.proxyPassword,
        accountAgeMonths: data.accountAgeMonths,
        hasSalesNav: data.hasSalesNav,
        monthlyPrice: data.monthlyPrice || 0,
        ambassadorPayment: data.ambassadorPayment || 0,
        notes: data.notes,
        status: data.status,
      },
    });

    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Create account error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
