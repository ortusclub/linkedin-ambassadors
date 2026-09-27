import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAccountCodeLink } from "@/lib/account-code-link";
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const headers = { "Cache-Control": "no-store" };
  try {
    await requireAdmin();
    const { id } = await params;
    const account = await prisma.linkedInAccount.findUnique({ where: { id }, select: { id: true, removedAt: true } });
    if (!account || account.removedAt) return NextResponse.json({ error: "Account not found" }, { status: 404, headers });
    return NextResponse.json({ url: await createAccountCodeLink(id) }, { headers });
  } catch (error) {
    const status = error instanceof Error && error.message === "Unauthorized" ? 401 : error instanceof Error && error.message === "Forbidden" ? 403 : 503;
    return NextResponse.json({ error: "Could not create an account code link." }, { status, headers });
  }
}
