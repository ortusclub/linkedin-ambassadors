// Single source of truth for "this referred signup has earned the marketer their fee".
//
// A signup only *converts* — and only becomes payable — once the referred account is
// fully onboarded AND we've confirmed it's good to pay (verifiedAt = the admin "○ Confirm
// ok to pay" toggle) with no unresolved login issue (accountIssue). Being merely
// "onboarded" (accepted / transferred onto inventory) is NOT enough: we pay the
// ambassador and confirm the account is genuinely usable first, THEN the referrer earns.
//
// Shared by the marketer portal, the admin Referrals tab, and the payouts digest so all
// three agree on who has actually converted and what is owed.
export interface ReferralGate {
  status: string;
  verifiedAt?: Date | string | null;
  accountIssue?: string | null;
}

export function isReferralEarned(a: ReferralGate): boolean {
  return a.status === "onboarded" && !!a.verifiedAt && !a.accountIssue;
}
