import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

const TRIAL_DAYS = 3;

async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== "admin") throw new Error("Forbidden");
  return user;
}

// POST — start a 3-day trial hold on an available account.
// Moves it out of Available (status=trial, unlisted) so it can't be double-booked.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const account = await prisma.linkedInAccount.findUnique({ where: { id } });
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    if (account.status !== "available") {
      return NextResponse.json({ error: "Only available accounts can be put on trial" }, { status: 400 });
    }
    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    const updated = await prisma.linkedInAccount.update({
      where: { id },
      data: { status: "trial", trialEndsAt, listed: false },
    });
    return NextResponse.json({ status: updated.status, trialEndsAt: updated.trialEndsAt });
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE — end a trial (cancel early OR acknowledge an expired one): back to Available.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const account = await prisma.linkedInAccount.findUnique({ where: { id } });
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    if (account.status !== "trial") {
      return NextResponse.json({ error: "Account is not on trial" }, { status: 400 });
    }
    const updated = await prisma.linkedInAccount.update({
      where: { id },
      data: { status: "available", trialEndsAt: null, listed: true },
    });
    return NextResponse.json({ status: updated.status });
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
