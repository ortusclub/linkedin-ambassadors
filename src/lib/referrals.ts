// Single source of truth for "this referred signup has earned the marketer their fee".
//
// A signup only *converts* — and only becomes payable — once the referred account is
// fully onboarded AND we've confirmed it's good to pay (verifiedAt = the admin "○ Confirm
// ok to pay" toggle). Being merely "onboarded" (accepted / transferred onto inventory) is
// NOT enough: we confirm the account is genuinely usable first, THEN the referrer earns.
//
// verifiedAt is the deliberate decision to pay the referrer. Once it's set, the referral
// is earned PERMANENTLY — a later account restriction (accountIssue) is an account-health
// problem, not a reason to un-earn (and definitely not to claw back a commission already
// paid). Earlier this also required `!accountIssue`, which caused a paid-then-restricted
// conversion to silently drop out of "earned" while its payment stayed counted — making
// the referrer's owed balance understate by that amount. So accountIssue no longer gates
// this. (To hold an as-yet-unpaid conversion, un-set verifiedAt / un-confirm it instead.)
//
// Shared by the marketer portal, the admin Referrals tab, and the payouts digest so all
// three agree on who has actually converted and what is owed.
export interface ReferralGate {
  status: string;
  verifiedAt?: Date | string | null;
  accountIssue?: string | null;
}

export function isReferralEarned(a: ReferralGate): boolean {
  return a.status === "onboarded" && !!a.verifiedAt;
}
