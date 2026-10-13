import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { generateProfile, PROFILE_LANES, type ProfileLane } from "@/lib/profile-generator";

// Generate a Level-4 profile to copy-paste into the LinkedIn account. Curated pools (no AI):
// US location + industry, PH work history (2 past roles) + PH school, lane capped at manager.
// Saves the full build to profileBuild and mirrors headline/industry/location onto the account.
const schema = z.object({ lane: z.enum(["auto", ...PROFILE_LANES] as [string, ...string[]]).optional() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const { lane } = schema.parse(await req.json().catch(() => ({})));
    const account = await prisma.linkedInAccount.findUnique({ where: { id }, select: { id: true, linkedinName: true } });
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    const build = generateProfile(account.linkedinName || "Account", (lane as ProfileLane | "auto") || "auto");

    await prisma.linkedInAccount.update({
      where: { id },
      data: {
        profileBuild: build as unknown as Prisma.InputJsonValue,
        linkedinHeadline: build.headline,
        industry: build.industry,
        location: build.location,
      },
    });
    return NextResponse.json({ ok: true, profileBuild: build });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    if (error instanceof Error && error.message === "Forbidden") return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
