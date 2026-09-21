// Internal/company email domains — logins we issue and hold. Two uses:
//  1. Owner labeling / payouts read the ambassador's OWN email against this list to
//     tell company-owned accounts from external ambassadors.
//  2. The inventory stage logic and proxy naming read the LOGIN email against it to
//     tell whether we hold a usable company login for the account.
// The disposable-email rollout issues logins on varied LV-owned domains (lotuspost.*,
// islandcorrespondence.lol); these are our logins too, so they must count here or the
// accounts read as "Initial" and drop out of inventory. Safe for payouts: owner emails
// are the ambassador's own gmail, never one of these.
export const INTERNAL_DOMAINS = [
  "ortus.solutions", "linkedvelocity.com", "ortusclub.com", "klabber.co",
  "lotuspost.fyi", "lotuspost.co.uk", "islandcorrespondence.lol",
];

export function isCompanyEmail(email?: string | null): boolean {
  const e = (email || "").toLowerCase();
  return INTERNAL_DOMAINS.some((d) => e.endsWith("@" + d));
}
