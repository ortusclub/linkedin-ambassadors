// Internal/company email domains — logins we issue and hold. Two uses:
//  1. Owner labeling / payouts read the ambassador's OWN email against this list to
//     tell company-owned accounts from external ambassadors.
//  2. The inventory stage logic and proxy naming read the LOGIN email against it to
//     tell whether we hold a usable company login for the account.
// The disposable-email rollout issues logins on varied LV-owned catch-all domains (the
// disposable-emails repo's DOMAINS list); these are our logins too, so they must ALL count
// here or the accounts read as "Initial" and drop out of inventory. Safe for payouts: owner
// emails are the ambassador's own gmail, never one of these.
// NOTE: islandcorrespondence.lol is RETIRED for NEW emails (not offered in the portal, see
// ONBOARDING_EMAIL_DOMAINS), but it STAYS here so existing accounts on it still classify as
// ours. Retiring ≠ removing from recognition.
export const INTERNAL_DOMAINS = [
  "ortus.solutions", "linkedvelocity.com", "ortusclub.com", "klabber.co",
  "lotuspost.fyi", "lotuspost.co.uk",
  "harbourpost.co.uk", "northgatemail.co.uk", "oakfieldmail.co.uk", "industrial-renaissance-summit.com",
  "islandcorrespondence.lol", // retired for new emails; kept for existing accounts
];

export function isCompanyEmail(email?: string | null): boolean {
  const e = (email || "").toLowerCase();
  return INTERNAL_DOMAINS.some((d) => e.endsWith("@" + d));
}
