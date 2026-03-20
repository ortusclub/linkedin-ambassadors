import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

async function getUser() {
  const headerList = await headers();
  const authHeader = headerList.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });
    if (session && session.expiresAt > new Date()) {
      return session.user;
    }
  }
  return requireAuth();
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    const { id } = await params;

    // Find the account — must belong to this user (owner email in notes)
    const account = await prisma.linkedInAccount.findUnique({ where: { id } });

    if (!account) {
      // Also try matching by gologinProfileId
      const byProfile = await prisma.linkedInAccount.findFirst({ where: { gologinProfileId: id } });
      if (!byProfile) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }

      const ownerEmail = (byProfile.notes || "").match(/Owner:\s*([^\s.]+(?:\.[^\s.]+)*@[^\s.]+(?:\.[^\s.]+)+)/)?.[1] || "";
      if (ownerEmail !== user.email) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
      }

      // Delete any rentals first, then the account
      await prisma.rental.deleteMany({ where: { linkedinAccountId: byProfile.id } });
      await prisma.waitlist.deleteMany({ where: { linkedinAccountId: byProfile.id } });
      await prisma.linkedInAccount.delete({ where: { id: byProfile.id } });
      return NextResponse.json({ success: true });
    }

    const ownerEmail = (account.notes || "").match(/Owner:\s*([^\s.]+(?:\.[^\s.]+)*@[^\s.]+(?:\.[^\s.]+)+)/)?.[1] || "";
    if (ownerEmail !== user.email) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    await prisma.rental.deleteMany({ where: { linkedinAccountId: account.id } });
    await prisma.waitlist.deleteMany({ where: { linkedinAccountId: account.id } });
    await prisma.linkedInAccount.delete({ where: { id: account.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
