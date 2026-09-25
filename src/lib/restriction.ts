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

// Restriction can be flagged on an application (accountIssue free-text) BEFORE an account
// exists — that's the only place to record it for an account-less lead. These helpers move
// that flag onto the account once one is linked, so the account stays the single source of
// truth. "permanent" issues mean retired, handled separately, so they don't count here.
export function appIssueIsRestricted(accountIssue?: string | null): boolean {
  const s = (accountIssue || "").toLowerCase();
  return s.includes("restrict") && !s.includes("permanent");
}

// When an account becomes linked to an application, carry a pending pipeline-side
// restriction flag onto the account (logging it), then clear the keyword from the
// application so the two views agree. Safe to call whenever an account is created/linked:
// it no-ops if the app isn't flagged or the account is already restricted. Pass a tx-bound
// client (or the default prisma) so it can run inside the caller's transaction.
export async function carryAppRestrictionToAccount(
  accountId: string,
  app: { id: string; accountIssue: string | null } | null | undefined,
  db: { linkedInAccount: typeof prisma.linkedInAccount; ambassadorApplication: typeof prisma.ambassadorApplication } = prisma,
): Promise<boolean> {
  if (!app || !appIssueIsRestricted(app.accountIssue)) return false;
  const acct = await db.linkedInAccount.findUnique({
    where: { id: accountId },
    select: { id: true, restrictedAt: true, restrictionLog: true },
  });
  if (!acct || acct.restrictedAt) return false; // no account, or already restricted → nothing to carry
  const fields = await restrictionUpdate(acct, true, "Carried over from pipeline restriction flag");
  await db.linkedInAccount.update({
    where: { id: accountId },
    data: { restrictedAt: fields.restrictedAt, ...(fields.restrictionLog ? { restrictionLog: fields.restrictionLog } : {}) },
  });
  // Remove the restriction keyword from the app now that the account owns the state.
  await db.ambassadorApplication.update({ where: { id: app.id }, data: { accountIssue: null } });
  return true;
}
