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
import type { ReferralTiers } from "@/lib/referral-currency";

export interface ReferralGate {
  status: string;
  verifiedAt?: Date | string | null;
  accountIssue?: string | null;
  onboardedAt?: Date | string | null;
  referralSource?: string | null;
  // For the tiered DIY commission: how the onboarding was done, and whether the
  // account was ID-verified AT onboarding (a snapshot — NOT the live linkedinVerified,
  // and NOT the admin verifiedAt "ok to pay" flag above). Locked at onboarding.
  onboardingMethod?: string | null;
  onboardingVerified?: boolean | null;
}

// Whether the referred account is onboarded. The `status` string is the intended signal,
// but some write paths (paying the setup fee, the owners-page onboarded-date field) set
// onboarded_at without flipping status off "approved"/"onboarding" — which used to make a
// genuinely-onboarded referral silently drop out of the referrer's converted/owed totals.
// onboarded_at set is an equally valid signal, so honour either.
export function isReferralOnboarded(a: ReferralGate): boolean {
  return a.status === "onboarded" || !!a.onboardedAt;
}

export function isReferralEarned(a: ReferralGate): boolean {
  return isReferralOnboarded(a) && !!a.verifiedAt;
}

// Tiered referral commission. A plain referral (LV onboards) pays the base `referral`
// rate. A DIY (self-service) onboarding pays more, by how it was done and whether the
// account is ID-verified:
//   phone    (referrer chased it, LV signed in) → phone.base / phone.verified
//   computer (referrer did the guided sign-in)  → computer.base / computer.verified
// `verified` is the snapshot taken AT onboarding (onboardingVerified), so the amount is
// locked then — verifying the account afterwards does NOT change what the referrer earns.
// Self-service rows without a recorded method (only pre-tier rows, since new onboardings
// always stamp it) fall back to the computer tier so the amount is never understated.
export function referralCommissionAmount(a: ReferralGate, tiers: ReferralTiers): number {
  if (a.referralSource !== "self-service") return tiers.referral;
  const verified = !!a.onboardingVerified;
  const band = a.onboardingMethod === "phone" ? tiers.phone : tiers.computer;
  return verified ? band.verified : band.base;
}
