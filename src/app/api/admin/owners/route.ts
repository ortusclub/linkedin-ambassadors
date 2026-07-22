import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== "admin") throw new Error("Forbidden");
  return user;
}

interface OwnerAccount {
  id: string;
  linkedinName: string;
  status: string;
  linkedinUrl: string | null;
  monthlyPrice: unknown;
  ambassadorPayment: unknown;
  loginEmail: string | null;
  accountPassword: string | null;
  twoFactor: string | null;
  workEmail: string | null;
}

const ACCOUNT_SELECT = {
  id: true,
  linkedinName: true,
  status: true,
  linkedinUrl: true,
  monthlyPrice: true,
  ambassadorPayment: true,
  loginEmail: true,
  accountPassword: true,
  twoFactor: true,
  workEmail: true,
} as const;

function toAccount(a: {
  id: string; linkedinName: string; status: string; linkedinUrl: string | null;
  monthlyPrice: unknown; ambassadorPayment: unknown;
  loginEmail: string | null; accountPassword: string | null; twoFactor: string | null; workEmail: string | null;
}): OwnerAccount {
  return {
    id: a.id,
    linkedinName: a.linkedinName,
    status: a.status,
    linkedinUrl: a.linkedinUrl,
    monthlyPrice: a.monthlyPrice,
    ambassadorPayment: a.ambassadorPayment,
    loginEmail: a.loginEmail,
    accountPassword: a.accountPassword,
    twoFactor: a.twoFactor,
    workEmail: a.workEmail,
  };
}

export async function GET() {
  try {
    await requireAdmin();

    // Source 1: LinkedIn accounts that name an owner in notes.
    // Exclude removed/retired/under-review so only live inventory shows.
    const accounts = await prisma.linkedInAccount.findMany({
      where: { notes: { contains: "Owner:" }, status: { notIn: ["removed", "retired", "under_review"] } },
      select: { ...ACCOUNT_SELECT, notes: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    // Source 2: all ambassador applications (the person side — payout details live here).
    const allApplications = await prisma.ambassadorApplication.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        linkedinUrl: true,
        linkedinEmail: true,
        status: true,
        paymentMethod: true,
        paymentDetails: true,
        paidAt: true,
        monthlyPayouts: true,
        onboardedAt: true,
        verifiedAt: true,
        offeredAmount: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const ownerMap = new Map<string, {
      email: string;
      accounts: OwnerAccount[];
      applicationCount: number;
      applicationStatus: string | null;
    }>();

    // Owners from LinkedIn account notes ("Owner: someone@x.com")
    for (const account of accounts) {
      const ownerEmail = (account.notes || "").match(/Owner:\s*(\S+@\S+)/)?.[1]?.replace(/\.$/, "") || "";
      if (!ownerEmail) continue;
      if (!ownerMap.has(ownerEmail)) {
        ownerMap.set(ownerEmail, { email: ownerEmail, accounts: [], applicationCount: 0, applicationStatus: null });
      }
      ownerMap.get(ownerEmail)!.accounts.push(toAccount(account));
    }

    // Applications contribute owner status + the payout record.
    for (const app of allApplications) {
      if (!ownerMap.has(app.email)) {
        ownerMap.set(app.email, { email: app.email, accounts: [], applicationCount: 0, applicationStatus: null });
      }
      const entry = ownerMap.get(app.email)!;
      entry.applicationCount++;
      if (!entry.applicationStatus || app.status === "onboarded" || app.status === "approved") {
        entry.applicationStatus = app.status;
      }
    }

    // The most relevant application per owner (prefer onboarded/approved, else newest).
    const appByEmail = new Map<string, (typeof allApplications)[number]>();
    for (const app of allApplications) {
      const cur = appByEmail.get(app.email);
      if (!cur) { appByEmail.set(app.email, app); continue; }
      const rank = (s: string) => (s === "onboarded" ? 2 : s === "approved" ? 1 : 0);
      if (rank(app.status) > rank(cur.status)) appByEmail.set(app.email, app);
    }

    // Match applications to accounts by LinkedIn URL (covers accounts whose notes
    // don't carry an Owner: tag).
    const appsByUrl = new Map<string, string>();
    for (const app of allApplications) {
      if (app.linkedinUrl) {
        appsByUrl.set(app.linkedinUrl, app.email);
        appsByUrl.set(app.linkedinUrl.replace(/\/$/, ""), app.email);
      }
    }

    const allLinkedInAccounts = await prisma.linkedInAccount.findMany({
      where: { status: { notIn: ["removed", "retired", "under_review"] } },
      select: ACCOUNT_SELECT,
    });

    for (const account of allLinkedInAccounts) {
      if (!account.linkedinUrl) continue;
      const ownerEmail = appsByUrl.get(account.linkedinUrl) || appsByUrl.get(account.linkedinUrl.replace(/\/$/, ""));
      if (!ownerEmail) continue;
      if (!ownerMap.has(ownerEmail)) {
        ownerMap.set(ownerEmail, { email: ownerEmail, accounts: [], applicationCount: 0, applicationStatus: null });
      }
      const entry = ownerMap.get(ownerEmail)!;
      if (!entry.accounts.some((a) => a.id === account.id)) {
        entry.accounts.push(toAccount(account));
      }
    }

    // User names / join dates
    const emails = Array.from(ownerMap.keys());
    const users = emails.length > 0
      ? await prisma.user.findMany({
          where: { email: { in: emails } },
          select: { email: true, fullName: true, createdAt: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.email, u]));

    const owners = Array.from(ownerMap.entries()).map(([email, data]) => {
      const user = userMap.get(email);
      const app = appByEmail.get(email);
      const monthlyPayout = data.accounts.reduce((sum, a) => sum + Number(a.ambassadorPayment || 0), 0);
      return {
        email,
        fullName: user?.fullName || app?.fullName || email,
        joinedAt: user?.createdAt || null,
        accountCount: data.accounts.length,
        applicationCount: data.applicationCount,
        applicationStatus: data.applicationStatus,
        monthlyPayout,
        // Payout record (from the application)
        applicationId: app?.id || null,
        paymentMethod: app?.paymentMethod || null,
        paymentDetails: app?.paymentDetails || null,
        setupFeePaidAt: app?.paidAt || null,
        monthlyPayouts: Array.isArray(app?.monthlyPayouts) ? app!.monthlyPayouts : [],
        onboardedAt: app?.onboardedAt || null,
        verifiedAt: app?.verifiedAt || null,
        accounts: data.accounts,
      };
    });

    // Only converted + onboarded owners: those with at least one live inventory account.
    const onboardedOwners = owners.filter((o) => o.accountCount > 0);
    onboardedOwners.sort((a, b) => b.accountCount - a.accountCount || b.applicationCount - a.applicationCount);

    return NextResponse.json({ owners: onboardedOwners });
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Owners API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
