import { prisma } from "@/lib/prisma";
import { shareProfile, unshareProfile } from "@/services/gologin";
import { Prisma } from "@/generated/prisma/client";

export type ShareRef = { email: string; shareId: string };

// Grant (or re-grant) a rental's renter GoLogin access, storing the Share ID so it
// can be revoked later. Throws on error (no profile id / no share id).
export async function grantRentalAccess(rentalId: string): Promise<{ shareId: string; email: string }> {
  const rental = await prisma.rental.findUnique({
    where: { id: rentalId },
    include: {
      user: { select: { email: true } },
      linkedinAccount: { select: { gologinProfileId: true } },
    },
  });
  if (!rental) throw new Error("Rental not found");
  const profileId = rental.linkedinAccount.gologinProfileId;
  if (!profileId) {
    throw new Error("This account has no GoLogin profile ID, so access can't be managed automatically.");
  }
  const email = rental.user.email;
  const result = await shareProfile(profileId, email);
  const shareId = Array.isArray(result) ? result[0]?.id : (result as { id?: string } | null)?.id;
  if (!shareId) {
    throw new Error("GoLogin did not return a share id (the renter may already be shared on this profile — clear it first).");
  }
  const current = (rental.gologinShareIds as unknown as ShareRef[] | null) || [];
  const next: ShareRef[] = [...current.filter((s) => s.email !== email), { email, shareId }];
  await prisma.rental.update({
    where: { id: rentalId },
    data: {
      paused: false,
      gologinShareIds: next as unknown as Prisma.InputJsonValue,
      accessGrantedAt: new Date(),
      accessRevokedAt: null,
    },
  });
  return { shareId, email };
}

// Revoke ALL of a rental's GoLogin shares (cut the renter off) and clear the stored IDs.
// Does NOT change status/paused — the caller decides what the revoke means (pause vs end).
export async function revokeRentalAccess(rentalId: string): Promise<{ shareId: string; ok: boolean; error?: string }[]> {
  const rental = await prisma.rental.findUnique({ where: { id: rentalId } });
  if (!rental) throw new Error("Rental not found");
  const current = (rental.gologinShareIds as unknown as ShareRef[] | null) || [];
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
    where: { id: rentalId },
    data: { gologinShareIds: [] as unknown as Prisma.InputJsonValue, accessRevokedAt: new Date() },
  });
  return results;
}
