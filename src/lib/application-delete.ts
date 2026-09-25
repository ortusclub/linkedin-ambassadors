import { prisma } from "@/lib/prisma";

// Permanently remove an ambassador application and its onboarding tail.
//
// A plain application deletes directly. A DIY (self-service) application also has a
// SelfServiceOnboarding row (+ its email setup/deliveries and any owner invite) and a
// LinkedInAccount that foreign-key it, so a bare delete fails with a FK violation. We
// cascade those child rows in a transaction. The created LinkedInAccount is only removed
// when it's safe throwaway data — not listed in inventory and never rented; a real live
// account is left in place (its onboarding link is cleared) and we report that back.
//
// Shared by the admin "delete signup" action and the referrer portal "delete application"
// action, so both go through exactly one cascade. Callers own their OWN authorization and
// eligibility checks (the portal only allows this before onboarding finishes / payment).
export async function deleteApplicationCascade(applicationId: string): Promise<{ accountDeleted: boolean; accountKept: boolean }> {
  const onboarding = await prisma.selfServiceOnboarding.findUnique({
    where: { applicationId },
    select: { id: true, accountId: true },
  });

  // Simple case: no DIY onboarding attached — delete the application directly.
  if (!onboarding) {
    await prisma.ambassadorApplication.delete({ where: { id: applicationId } });
    return { accountDeleted: false, accountKept: false };
  }

  // DIY case: decide whether the created account is safe to remove.
  const account = await prisma.linkedInAccount.findUnique({
    where: { id: onboarding.accountId },
    select: { id: true, listed: true, _count: { select: { rentals: true } } },
  });
  const accountSafeToDelete = !!account && !account.listed && account._count.rentals === 0;

  await prisma.$transaction(async (tx) => {
    // Onboarding email records (session_id -> SelfServiceOnboarding.id).
    await tx.onboardingEmailDelivery.deleteMany({ where: { sessionId: onboarding.id } });
    await tx.onboardingEmailSetup.deleteMany({ where: { sessionId: onboarding.id } });
    // Any per-owner invite that pointed at this session (avoid orphaned invites).
    await tx.onboardingInvite.deleteMany({ where: { sessionId: onboarding.id } });
    // The onboarding row itself (FKs the application + the account).
    await tx.selfServiceOnboarding.delete({ where: { id: onboarding.id } });
    // Now the application FK is free.
    await tx.ambassadorApplication.delete({ where: { id: applicationId } });
    // Only clear away the created account if it's throwaway data.
    if (accountSafeToDelete) {
      await tx.waitlist.deleteMany({ where: { linkedinAccountId: onboarding.accountId } });
      await tx.cryptoPayment.deleteMany({ where: { linkedinAccountId: onboarding.accountId } });
      await tx.linkedInAccount.delete({ where: { id: onboarding.accountId } });
    }
  });

  return { accountDeleted: accountSafeToDelete, accountKept: !accountSafeToDelete };
}
