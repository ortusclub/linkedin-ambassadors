import { prisma } from "@/lib/prisma";

// Append-only restriction/recovery history for an account. `restrictedAt` only ever
// holds the CURRENT open restriction (wiped on recover), so the log is the record of
// every time an account was restricted or recovered. Both the pipeline and the
// inventory views write through this one helper, so the history is shared, not
// duplicated per surface.
export type RestrictionEvent = {
  at: string;
  event: "restricted" | "recovered";
  note?: string;
  creditedDays?: number;
};

type RestrictionAccount = {
  id: string;
  restrictedAt: Date | null;
  restrictionLog: unknown;
};

// Compute the account fields to write for a restrict (true) or recover (false) action,
// appending the event to the shared log. On recover, credit an active rental's downtime
// by extending its currentPeriodEnd (a side effect done here). Returns only the account
// fields to merge into a linkedInAccount update — the caller performs the write.
export async function restrictionUpdate(
  account: RestrictionAccount,
  restrict: boolean,
  note?: string,
): Promise<{ restrictedAt: Date | null; restrictionLog?: RestrictionEvent[]; creditedDays?: number }> {
  const log: RestrictionEvent[] = Array.isArray(account.restrictionLog)
    ? (account.restrictionLog as RestrictionEvent[])
    : [];
  const trimmed = note?.trim() || "";

  if (restrict) {
    // Already restricted → keep the original open timestamp and log nothing (no dupes).
    if (account.restrictedAt) return { restrictedAt: account.restrictedAt };
    const at = new Date();
    return {
      restrictedAt: at,
      restrictionLog: [...log, { at: at.toISOString(), event: "restricted", ...(trimmed ? { note: trimmed } : {}) }],
    };
  }

  // Recover: nothing to do if it wasn't restricted.
  if (!account.restrictedAt) return { restrictedAt: null };
  let creditedDays = 0;
  const downtimeMs = Date.now() - new Date(account.restrictedAt).getTime();
  const active = await prisma.rental.findFirst({
    where: { linkedinAccountId: account.id, status: { in: ["active", "pending_access"] } },
  });
  if (active?.currentPeriodEnd && downtimeMs > 0) {
    const extended = new Date(new Date(active.currentPeriodEnd).getTime() + downtimeMs);
    await prisma.rental.update({ where: { id: active.id }, data: { currentPeriodEnd: extended } });
    creditedDays = Math.round(downtimeMs / 86400000);
  }
  return {
    restrictedAt: null,
    restrictionLog: [
      ...log,
      { at: new Date().toISOString(), event: "recovered", ...(trimmed ? { note: trimmed } : {}), ...(creditedDays ? { creditedDays } : {}) },
    ],
    creditedDays,
  };
}
