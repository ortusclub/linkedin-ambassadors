import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  linkedinName: z.string().optional(),
  linkedinHeadline: z.string().nullable().optional(),
  linkedinUrl: z.string().nullable().optional(),
  connectionCount: z.number().int().optional(),
  industry: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  profileScreenshotUrl: z.string().nullable().optional(),
  profilePhotoUrl: z.string().nullable().optional(),
  proxyHost: z.string().nullable().optional(),
  proxyPort: z.number().int().nullable().optional(),
  proxyUsername: z.string().nullable().optional(),
  proxyPassword: z.string().nullable().optional(),
  accountAgeMonths: z.number().int().nullable().optional(),
  hasSalesNav: z.boolean().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(["available", "rented", "maintenance", "retired"]).optional(),
  gologinProfileId: z.string().nullable().optional(),
}).partial();

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const account = await prisma.linkedInAccount.findUnique({
      where: { id },
      include: {
        rentals: {
          include: { user: { select: { id: true, fullName: true, email: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!account) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ account });
  } catch (error) {
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const data = updateSchema.parse(body);

    const account = await prisma.linkedInAccount.update({
      where: { id },
      data,
    });

    // Sync proxy to GoLogin profile if it has one
    if (account.gologinProfileId && (data.proxyHost || data.proxyPort || data.proxyUsername || data.proxyPassword)) {
      try {
        const token = process.env.GOLOGIN_API_TOKEN!;
        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };

        // GoLogin PUT requires all required fields, so fetch profile first
        const profileRes = await fetch(
          `https://api.gologin.com/browser/${account.gologinProfileId}`,
          { headers }
        );
        if (profileRes.ok) {
          const profile = await profileRes.json();
          const payload = {
            name: profile.name,
            browserType: profile.browserType || "chrome",
            os: profile.os || "mac",
            navigator: profile.navigator,
            proxy: account.proxyHost
              ? {
                  mode: "http",
                  host: account.proxyHost,
                  port: account.proxyPort || 80,
                  username: account.proxyUsername || "",
                  password: account.proxyPassword || "",
                }
              : { mode: "none" },
          };

          await fetch(
            `https://api.gologin.com/browser/${account.gologinProfileId}`,
            { method: "PUT", headers, body: JSON.stringify(payload) }
          );
        }
      } catch (e) {
        console.error("Failed to sync proxy to GoLogin:", e);
      }
    }

    return NextResponse.json({ account });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const account = await prisma.linkedInAccount.findUnique({ where: { id } });
    if (!account) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (account.status === "rented") {
      return NextResponse.json(
        { error: "Cannot delete a currently rented account" },
        { status: 400 }
      );
    }

    await prisma.linkedInAccount.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
