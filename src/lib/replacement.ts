// Self-serve replacement: when a rented account is restricted by LinkedIn we try to recover
// it first. The renter can only swap it for another account once it's been down for the
// recovery hold below (so we get a fair window to recover it before they move on).
export const REPLACEMENT_HOLD_MS = 2 * 24 * 60 * 60 * 1000; // 2 days

/** When the "Replace" action unlocks for an account restricted at `restrictedAt`. */
export function replacementUnlockAt(restrictedAt: Date | string): number {
  return new Date(restrictedAt).getTime() + REPLACEMENT_HOLD_MS;
}

/** True once the 2-day recovery hold has elapsed for a restricted account. */
export function canReplaceNow(restrictedAt: Date | string | null | undefined): boolean {
  if (!restrictedAt) return false;
  return Date.now() >= replacementUnlockAt(restrictedAt);
}
