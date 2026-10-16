import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { User } from "@/generated/prisma/client";

// Admin "view as client": an admin may append ?view_as=<userId> to a GET so the renter's
// own data renders exactly as they'd see it on their dashboard. This is honoured ONLY when
// the caller is an admin, and ONLY on reads — no write endpoint ever consults it, so viewing
// as a renter can never mutate their account. That makes the whole feature see-only by
// construction (the admin stays themselves for every write, which simply hits their own id).
export async function resolveViewUser(
  req: NextRequest
): Promise<{ user: User; viewAs: boolean; admin: User }> {
  const admin = await requireAuth();
  const viewAsId = req.nextUrl.searchParams.get("view_as");
  if (viewAsId && admin.role === "admin" && viewAsId !== admin.id) {
    const target = await prisma.user.findUnique({ where: { id: viewAsId } });
    if (target) return { user: target, viewAs: true, admin };
  }
  return { user: admin, viewAs: false, admin };
}
