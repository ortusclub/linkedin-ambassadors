// End-of-rental lockdown: when a rental ends, lock the account down before it can go back to
// Available — only for what the renter actually had access to. GoLogin-share revoke, billing stop
// and proxy health are auto-checked; 2FA/password/session/tool items need a human in LinkedIn.
// Pure data + helpers (no server imports) so the client component can use it too.

export type SharedWithRenter = { gologin: boolean; totp: boolean; password: boolean; workEmail: boolean };
export type Offboarding = {
  open?: boolean;
  shared?: Partial<SharedWithRenter>;
  ticks?: Record<string, boolean>;
  openedBy?: string | null; openedAt?: string | null;
  closedBy?: string | null; closedAt?: string | null;
};

// "What did the renter have?" toggles. gologin is always-on (the profile is always shared).
export const SHARED_TOGGLES: { key: keyof SharedWithRenter; label: string; locked?: boolean; hint?: string }[] = [
  { key: "gologin", label: "GoLogin profile", locked: true, hint: "Always shared — the share is revoked automatically." },
  { key: "totp", label: "2FA secret", hint: "They had the TOTP secret, not just codes." },
  { key: "password", label: "Password", hint: "They knew the LinkedIn password." },
  { key: "workEmail", label: "Work email login", hint: "They had access to the work inbox." },
];

// Manual lockdown items. `needs` gates whether the item shows (based on what was shared).
export const OFFBOARDING_ITEMS: { key: string; label: string; hint: string; needs?: keyof SharedWithRenter; optional?: boolean }[] = [
  { key: "fa", label: "Rotate 2FA key", hint: "Turn 2FA off/on in LinkedIn, paste the new secret in Log in.", needs: "totp" },
  { key: "pw", label: "Change LinkedIn password", hint: "Set a new one and update it in Log in.", needs: "password" },
  { key: "em", label: "Change work email password", hint: "Reset the mailbox password; sign out its sessions.", needs: "workEmail" },
  { key: "sessions", label: "Sign out all other sessions", hint: "LinkedIn → Settings → Sign out of all sessions." },
  { key: "tools", label: "Disconnect renter's tools", hint: "Remove any outreach/automation app they connected." },
  { key: "added", label: "Remove anything they added", hint: "Their email, phone, apps or recovery details." },
  { key: "msgs", label: "Archive renter conversations", hint: "Keeps the inbox clean for the next renter.", optional: true },
];

export type OffboardAccount = { gologinShared?: boolean; hasActiveRental?: boolean; proxyHost: string | null };

// Auto conditions the system verifies when closing out a rental.
export function offboardingAuto(a: OffboardAccount): { key: string; label: string; ok: boolean; failText?: string }[] {
  return [
    { key: "share", label: "GoLogin share revoked", ok: !a.gologinShared },
    { key: "billing", label: "Billing stopped · renter unlinked", ok: !a.hasActiveRental },
    { key: "proxy", label: a.proxyHost ? "Proxy healthy" : "Proxy down — swap before re-renting", ok: !!a.proxyHost, failText: "Proxy down — swap before re-renting" },
  ];
}

// Required manual items for the current "shared" selection (optional items excluded).
export function requiredOffboardingItems(shared: Partial<SharedWithRenter> | undefined) {
  return OFFBOARDING_ITEMS.filter((i) => !i.optional && (!i.needs || shared?.[i.needs]));
}

// How many items are left before the rental can be closed out (required manual undone + auto fails).
export function offboardingLeft(a: OffboardAccount, ob: Offboarding | null | undefined): number {
  const ticks = ob?.ticks || {};
  const missing = requiredOffboardingItems(ob?.shared).filter((i) => !ticks[i.key]).length;
  const autoFail = offboardingAuto(a).filter((c) => !c.ok).length;
  return missing + autoFail;
}

export const offboardingOpen = (ob: Offboarding | null | undefined): boolean => !!ob?.open;
