import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== "admin") throw new Error("Forbidden");
  return user;
}

export async function GET() {
  try {
    await requireAdmin();

    // Source 1: LinkedIn accounts that have an owner in notes
    const accounts = await prisma.linkedInAccount.findMany({
      where: { notes: { contains: "Owner:" } },
      select: {
        id: true,
        linkedinName: true,
        status: true,
        monthlyPrice: true,
        ambassadorPayment: true,
        notes: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Source 2: All ambassador applications (approved, onboarded, or pending)
    const allApplications = await prisma.ambassadorApplication.findMany({
      select: {
        email: true,
        fullName: true,
        linkedinUrl: true,
        status: true,
        paymentMethod: true,
        offeredAmount: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Build owner map from both sources
    const ownerMap = new Map<string, {
      email: string;
      accounts: Array<{
        id: string;
        linkedinName: string;
        status: string;
        monthlyPrice: unknown;
        ambassadorPayment: unknown;
      }>;
      applicationCount: number;
      applicationStatus: string | null;
    }>();

    // Add owners from LinkedIn accounts (notes-based)
    for (const account of accounts) {
      const ownerEmail = (account.notes || "").match(/Owner:\s*(\S+@\S+)/)?.[1]?.replace(/\.$/, "") || "";
      if (!ownerEmail) continue;
      if (!ownerMap.has(ownerEmail)) {
        ownerMap.set(ownerEmail, { email: ownerEmail, accounts: [], applicationCount: 0, applicationStatus: null });
      }
      ownerMap.get(ownerEmail)!.accounts.push({
        id: account.id,
        linkedinName: account.linkedinName,
        status: account.status,
        monthlyPrice: account.monthlyPrice,
        ambassadorPayment: account.ambassadorPayment,
      });
    }

    // Add owners from ambassador applications
    for (const app of allApplications) {
      if (!ownerMap.has(app.email)) {
        ownerMap.set(app.email, { email: app.email, accounts: [], applicationCount: 0, applicationStatus: null });
      }
      const entry = ownerMap.get(app.email)!;
      entry.applicationCount++;
      // Keep the most advanced status
      if (!entry.applicationStatus ||
          (app.status === "onboarded" || app.status === "approved")) {
        entry.applicationStatus = app.status;
      }
    }

    // Look up user names
    const emails = Array.from(ownerMap.keys());
    const users = emails.length > 0
      ? await prisma.user.findMany({
          where: { email: { in: emails } },
          select: { email: true, fullName: true, createdAt: true },
        })
      : [];

    const userMap = new Map(users.map((u) => [u.email, u]));

    // Build payment method map from applications
    const paymentMap = new Map<string, string>();
    for (const app of allApplications) {
      if (app.paymentMethod && !paymentMap.has(app.email)) {
        paymentMap.set(app.email, app.paymentMethod);
      }
    }

    // Also try to match ambassador applications to LinkedIn accounts by LinkedIn URL
    // (for cases where the notes don't have Owner: but the application links to the account)
    const appsByUrl = new Map<string, string>();
    for (const app of allApplications) {
      if (app.linkedinUrl) {
        appsByUrl.set(app.linkedinUrl, app.email);
        // Also normalize without trailing slash
        appsByUrl.set(app.linkedinUrl.replace(/\/$/, ""), app.email);
      }
    }

    const allLinkedInAccounts = await prisma.linkedInAccount.findMany({
      select: {
        id: true,
        linkedinName: true,
        linkedinUrl: true,
        status: true,
        monthlyPrice: true,
        ambassadorPayment: true,
      },
    });

    for (const account of allLinkedInAccounts) {
      if (!account.linkedinUrl) continue;
      const ownerEmail = appsByUrl.get(account.linkedinUrl) || appsByUrl.get(account.linkedinUrl.replace(/\/$/, ""));
      if (!ownerEmail) continue;

      if (!ownerMap.has(ownerEmail)) {
        ownerMap.set(ownerEmail, { email: ownerEmail, accounts: [], applicationCount: 0, applicationStatus: null });
      }
      const entry = ownerMap.get(ownerEmail)!;
      // Don't add duplicate accounts
      if (!entry.accounts.some((a) => a.id === account.id)) {
        entry.accounts.push({
          id: account.id,
          linkedinName: account.linkedinName,
          status: account.status,
          monthlyPrice: account.monthlyPrice,
          ambassadorPayment: account.ambassadorPayment,
        });
      }
    }

    const owners = Array.from(ownerMap.entries()).map(([email, data]) => {
      const user = userMap.get(email);
      const monthlyPayout = data.accounts.reduce((sum, a) => sum + Number(a.ambassadorPayment || 0), 0);
      return {
        email,
        fullName: user?.fullName || allApplications.find((a) => a.email === email)?.fullName || email,
        joinedAt: user?.createdAt || null,
        accountCount: data.accounts.length,
        applicationCount: data.applicationCount,
        applicationStatus: data.applicationStatus,
        monthlyPayout,
        paymentMethod: paymentMap.get(email) || null,
        accounts: data.accounts.map((a) => ({
          id: a.id,
          linkedinName: a.linkedinName,
          status: a.status,
          monthlyPrice: a.monthlyPrice,
          ambassadorPayment: a.ambassadorPayment,
        })),
      };
    });

    // Sort: owners with accounts first, then by account count
    owners.sort((a, b) => b.accountCount - a.accountCount || b.applicationCount - a.applicationCount);

    return NextResponse.json({ owners });
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Owners API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
