// Internal/company email domains — accounts owned via these are "us" (company-owned),
// NOT external ambassadors. Used to exclude from ambassador payouts and to label the
// Owner column as "Ortus".
export const INTERNAL_DOMAINS = ["ortus.solutions", "linkedvelocity.com", "ortusclub.com", "klabber.co"];

export function isCompanyEmail(email?: string | null): boolean {
  const e = (email || "").toLowerCase();
  return INTERNAL_DOMAINS.some((d) => e.endsWith("@" + d));
}
