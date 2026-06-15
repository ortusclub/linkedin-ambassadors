import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { shareProfile, unshareProfile } from "@/services/gologin";

type ShareRef = { email: string; shareId: string };

// Pause = revoke the renter's GoLogin access; Resume/Grant = (re)share it.
// Body: { action: "grant" | "revoke" }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const { action } = await req.json();
    if (action !== "grant" && action !== "revoke") {
      return NextResponse.json({ error: "action must be 'grant' or 'revoke'" }, { status: 400 });
    }

    const rental = await prisma.rental.findUnique({
      where: { id },
      include: {
        user: { select: { email: true } },
        linkedinAccount: { select: { gologinProfileId: true, linkedinName: true } },
      },
    });
    if (!rental) return NextResponse.json({ error: "Rental not found" }, { status: 404 });

    const profileId = rental.linkedinAccount.gologinProfileId;
    if (!profileId) {
      return NextResponse.json(
        { error: "This account has no GoLogin profile ID saved, so access can't be managed automatically." },
        { status: 400 }
      );
    }

    const current = (rental.gologinShareIds as unknown as ShareRef[] | null) || [];

    if (action === "revoke") {
      // Revoke every share we created for this rental.
      const results: { shareId: string; ok: boolean; error?: string }[] = [];
      for (const s of current) {
        try {
          await unshareProfile(s.shareId);
          results.push({ shareId: s.shareId, ok: true });
        } catch (e) {
          results.push({ shareId: s.shareId, ok: false, error: e instanceof Error ? e.message : "failed" });
        }
      }
      await prisma.rental.update({
        where: { id },
        data: { paused: true, gologinShareIds: [], accessRevokedAt: new Date() },
      });
      return NextResponse.json({ ok: true, action, revoked: results });
    }

    // action === "grant" (initial grant or resume)
    const email = rental.user.email;
    const result = await shareProfile(profileId, email);
    const shareId = Array.isArray(result) ? result[0]?.id : (result as { id?: string })?.id;
    if (!shareId) {
      return NextResponse.json({ ok: false, error: "GoLogin did not return a share id", result }, { status: 502 });
    }
    const next: ShareRef[] = [...current.filter((s) => s.email !== email), { email, shareId }];
    await prisma.rental.update({
      where: { id },
      data: { paused: false, gologinShareIds: next, accessGrantedAt: new Date(), accessRevokedAt: null },
    });
    return NextResponse.json({ ok: true, action, shareId, sharedWith: email });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    if (msg === "Forbidden" || msg === "Unauthorized") {
      return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 401 });
    }
    console.error("Rental access action error:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
