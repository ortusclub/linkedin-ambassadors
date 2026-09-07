import { prisma } from "@/lib/prisma";

// When an account becomes runnable — i.e. it has a GoLogin profile or share link —
// its owner's application is, by our own definition, onboarded. (That's the exact bar
// the Onboarding tab enforces by hand.) We flip the application to "onboarded"
// automatically so a referrer's conversion shows up the moment the account is set up,
// instead of waiting on someone to remember to advance the status by hand — the gap
// that kept referred signups (and the commission owed for them) invisible on the
// Referrals page.
//
// This only makes the conversion VISIBLE. It never marks the referrer as paid: the
// commission is still gated behind the deliberate "Confirm ok to pay" (verifiedAt),
// so auto-onboarding can't cause an accidental payout.
export async function markOwnerOnboardedIfReady(account: {
  notes: string | null;
  linkedinUrl: string | null;
  gologinProfileId: string | null;
  gologinShareLink: string | null;
}): Promise<void> {
  // Not runnable yet → not onboarded.
  if (!account.gologinProfileId && !account.gologinShareLink) return;

  const ownerEmail = (account.notes || "").match(/Owner:\s*(\S+@\S+)/)?.[1]?.replace(/\.$/, "") || null;
  if (!ownerEmail && !account.linkedinUrl) return;

  const url = account.linkedinUrl?.replace(/\/$/, "") || null;

  // Find this account's owner application. Match on the owner email in notes, or on the
  // profile URL. Never touch a rejected application (a deliberate "no") or one already
  // onboarded.
  const app = await prisma.ambassadorApplication.findFirst({
    where: {
      status: { notIn: ["onboarded", "rejected"] },
      OR: [
        ...(ownerEmail ? [{ email: { equals: ownerEmail, mode: "insensitive" as const } }] : []),
        ...(url ? [{ linkedinUrl: url }, { linkedinUrl: `${url}/` }] : []),
      ],
    },
    select: { id: true, onboardedAt: true },
  });
  if (!app) return;

  await prisma.ambassadorApplication.update({
    where: { id: app.id },
    data: {
      status: "onboarded",
      // Anchor the payout schedule (setup fee = login + 24h) the first time it lands.
      ...(app.onboardedAt ? {} : { onboardedAt: new Date() }),
    },
  });
}
