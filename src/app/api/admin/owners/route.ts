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

    // Find all LinkedIn accounts that have an owner in notes
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

    // Group by owner email
    const ownerMap = new Map<string, {
      email: string;
      accounts: typeof accounts;
    }>();

    for (const account of accounts) {
      const ownerEmail = (account.notes || "").match(/Owner:\s*(\S+@\S+)/)?.[1]?.replace(/\.$/, "") || "";
      if (!ownerEmail) continue;
      if (!ownerMap.has(ownerEmail)) {
        ownerMap.set(ownerEmail, { email: ownerEmail, accounts: [] });
      }
      ownerMap.get(ownerEmail)!.accounts.push(account);
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

    // Look up payment methods from ambassador applications
    const applications = emails.length > 0
      ? await prisma.ambassadorApplication.findMany({
          where: { email: { in: emails } },
          select: { email: true, paymentMethod: true },
          orderBy: { createdAt: "desc" },
        })
      : [];

    const paymentMap = new Map<string, string>();
    for (const app of applications) {
      if (app.paymentMethod && !paymentMap.has(app.email)) {
        paymentMap.set(app.email, app.paymentMethod);
      }
    }

    const owners = Array.from(ownerMap.entries()).map(([email, data]) => {
      const user = userMap.get(email);
      const monthlyPayout = data.accounts.reduce((sum, a) => sum + Number(a.ambassadorPayment || 0), 0);
      return {
        email,
        fullName: user?.fullName || email,
        joinedAt: user?.createdAt || null,
        accountCount: data.accounts.length,
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

    return NextResponse.json({ owners });
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
