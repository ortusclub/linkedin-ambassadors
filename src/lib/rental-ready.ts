// Rental-ready housekeeping: what must be true before an account is listed Available, so a renter
// getting instant self-serve access can't (a) get the account restricted or (b) end up sharing it
// with the owner or a prior renter. Deliberately does NOT repeat what the pipeline proves by L5
// (login, email/2FA setup, verified, matured, paid) — only the delta that makes it safe to rent out.

export type ChecklistState = Record<string, { done?: boolean; by?: string | null; at?: string | null }>;

// Manual ticks that hard-gate listing (all required). The things we can't detect from data — they
// happen inside LinkedIn or in our heads. Proxy readiness and GoLogin-share-cleared are auto (below).
export const RENTAL_READY_ITEMS: { key: string; label: string; hint: string }[] = [
  { key: "sessions_out", label: "No other signed-in devices", hint: "Signed out of all other sessions in LinkedIn settings." },
  { key: "campaigns_off", label: "Campaigns / automation disconnected", hint: "No outreach tool is still connected or firing." },
  { key: "inbox_cleared", label: "Inbox cleared", hint: "No leftover messages from shadow or prior use." },
];

// Shown but NOT gated — fine to leave if the shadow renter only ran connection requests.
export const RENTAL_READY_OPTIONAL: { key: string; label: string; hint: string }[] = [
  { key: "pending_reqs", label: "Pending connection requests reviewed", hint: "Optional — leave if Apex/Ortus only sent connection requests (no messages)." },
];

export type ReadyAccount = {
  restrictedAt: Date | string | null;
  permanentlyRestricted: boolean;
  twoFactorResetNeeded: boolean;
  proxyHost: string | null;
  gologinShared?: boolean; // a rental still holds a live GoLogin share for this account
};

// Auto conditions (from data) that also gate listing, with a human reason when they fail. These are
// the ones the system can verify itself — proxy assigned, GoLogin share cleared, not restricted,
// 2FA not pending rotation.
export function rentalReadyAuto(a: ReadyAccount): { key: string; reason: string }[] {
  const fails: { key: string; reason: string }[] = [];
  if (a.restrictedAt || a.permanentlyRestricted) fails.push({ key: "restricted", reason: "Account is restricted" });
  if (a.twoFactorResetNeeded) fails.push({ key: "twofa_reset", reason: "2FA needs rotating (was exposed to the last renter)" });
  if (!a.proxyHost) fails.push({ key: "no_proxy", reason: "No proxy assigned yet" });
  if (a.gologinShared) fails.push({ key: "gologin_shared", reason: "A renter still has a live GoLogin share — revoke it" });
  return fails;
}

// Overall readiness: every gated manual item ticked AND every auto condition passing.
export function rentalReadyStatus(a: ReadyAccount, checklist: ChecklistState | null | undefined) {
  const c = checklist || {};
  const missing = RENTAL_READY_ITEMS.filter((i) => !c[i.key]?.done).map((i) => i.key);
  const autoFail = rentalReadyAuto(a);
  return { ready: missing.length === 0 && autoFail.length === 0, missing, autoFail };
}
