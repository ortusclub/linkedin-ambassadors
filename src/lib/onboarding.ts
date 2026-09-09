import { prisma } from "@/lib/prisma";

// When an account becomes runnable — i.e. it has a GoLogin profile or share link — its
// owner has reached LEVEL 2: "GoLogin ready, verifying before payout" (status
// "approved"). We advance them there automatically so the account's stage tracks its
// real readiness, instead of waiting on someone to bump the status by hand.
//
// It deliberately does NOT mark them "onboarded" and does NOT stamp onboardedAt.
// Onboarded is the END of the flow (logged in → stability check → setup fee paid), a
// deliberate step — a GoLogin being attached is not the same as a working, paid,
// earning account. (Because Referrals counts a conversion at status "onboarded", a
// referrer's conversion now shows once the owner is actually onboarded, not the moment
// a GoLogin is attached.) It only advances owners who haven't reached Level 2 yet, and
// never downgrades or resurrects a rejected/unreachable lead.
export async function markOwnerOnboardedIfReady(account: {
  notes: string | null;
  linkedinUrl: string | null;
  gologinProfileId: string | null;
  gologinShareLink: string | null;
}): Promise<void> {
  // Not runnable yet → nothing to advance.
  if (!account.gologinProfileId && !account.gologinShareLink) return;

  const ownerEmail = (account.notes || "").match(/Owner:\s*(\S+@\S+)/)?.[1]?.replace(/\.$/, "") || null;
  if (!ownerEmail && !account.linkedinUrl) return;

  const url = account.linkedinUrl?.replace(/\/$/, "") || null;

  // Match on the owner email in notes, or on the profile URL. Only advance an owner who
  // is still BEFORE Level 2 — never touch approved/onboarded (already there or past it),
  // rejected (a deliberate "no"), or unreachable (a dead lead).
  const app = await prisma.ambassadorApplication.findFirst({
    where: {
      status: { in: ["pending", "contacted", "reviewing", "onboarding", "on_hold"] },
      OR: [
        ...(ownerEmail ? [{ email: { equals: ownerEmail, mode: "insensitive" as const } }] : []),
        ...(url ? [{ linkedinUrl: url }, { linkedinUrl: `${url}/` }] : []),
      ],
    },
    select: { id: true },
  });
  if (!app) return;

  await prisma.ambassadorApplication.update({
    where: { id: app.id },
    data: { status: "approved" }, // Level 2 — GoLogin ready, verifying before payout.
  });
}
