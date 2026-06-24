import { prisma } from "@/lib/prisma";
import { unshareProfile, regeneratePublicShareLink, deletePublicShareLink } from "@/services/gologin";
import { Prisma } from "@/generated/prisma/client";

export type ShareRef = { email: string; shareId: string };

// Grant (or re-grant) a rental's renter access via a PUBLIC g.camp share link.
// Regenerates a fresh link each time (an old renter's saved URL can never re-grant),
// stores it on the rental, and (re)activates the rental. Throws if no GoLogin profile.
// Unlike the old email share, this works immediately — the renter needs no GoLogin account.
export async function grantRentalAccess(
  rentalId: string
): Promise<{ publicUrl: string; linkId: string; email: string }> {
  const rental = await prisma.rental.findUnique({
    where: { id: rentalId },
    include: {
      user: { select: { email: true } },
      linkedinAccount: { select: { gologinProfileId: true, linkedinName: true } },
    },
  });
  if (!rental) throw new Error("Rental not found");
  const profileId = rental.linkedinAccount.gologinProfileId;
  if (!profileId) {
    throw new Error("This account has no GoLogin profile ID, so access can't be managed automatically.");
  }
  const email = rental.user.email;
  const link = await regeneratePublicShareLink(profileId, rental.linkedinAccount.linkedinName);
  await prisma.rental.update({
    where: { id: rentalId },
    data: {
      // Granting (re)activates the rental — revives a paused/ended one.
      status: "active",
      paused: false,
      gologinShareLinkId: link.linkId,
      gologinShareLinkUrl: link.publicUrl,
      accessGrantedAt: new Date(),
      accessRevokedAt: null,
    },
  });
  return { publicUrl: link.publicUrl, linkId: link.linkId, email };
}

// Revoke a rental's access: delete its public share link (the URL dies immediately)
// AND tear down any legacy email shares. Clears the stored link + sets accessRevokedAt.
// Does NOT change status/paused — the caller decides what the revoke means (pause vs end).
export async function revokeRentalAccess(
  rentalId: string
): Promise<{ ok: boolean; error?: string }[]> {
  const rental = await prisma.rental.findUnique({
    where: { id: rentalId },
    include: { linkedinAccount: { select: { gologinProfileId: true } } },
  });
  if (!rental) throw new Error("Rental not found");
  const results: { ok: boolean; error?: string }[] = [];

  // 1) Delete the public g.camp link (primary mechanism).
  const profileId = rental.linkedinAccount.gologinProfileId;
  if (rental.gologinShareLinkId && profileId) {
    try {
      await deletePublicShareLink(rental.gologinShareLinkId, profileId);
      results.push({ ok: true });
    } catch (e) {
      results.push({ ok: false, error: e instanceof Error ? e.message : "failed to delete share link" });
    }
  }

  // 2) Tear down any legacy email shares still on this rental.
  const legacy = (rental.gologinShareIds as unknown as ShareRef[] | null) || [];
  for (const s of legacy) {
    try {
      await unshareProfile(s.shareId);
      results.push({ ok: true });
    } catch (e) {
      results.push({ ok: false, error: e instanceof Error ? e.message : "failed to revoke legacy share" });
    }
  }

  await prisma.rental.update({
    where: { id: rentalId },
    data: {
      gologinShareLinkId: null,
      gologinShareLinkUrl: null,
      gologinShareIds: [] as unknown as Prisma.InputJsonValue,
      accessRevokedAt: new Date(),
    },
  });
  return results;
}
