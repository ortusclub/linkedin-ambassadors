import type { Prisma } from "@/generated/prisma/client";

// Explicit attribution takes precedence; email is only a legacy/anonymous fallback.
export function submittedApplicationsWhere(user: { id: string; email: string }): Prisma.AmbassadorApplicationWhereInput {
  return { OR: [
    { submittedByUserId: user.id },
    { submittedByUserId: null, email: { equals: user.email, mode: "insensitive" } },
  ] };
}
