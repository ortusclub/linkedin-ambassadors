import { prisma } from "@/lib/prisma";

export const EXISTING_ACCOUNT_NOTE = "[Existing account submission]";

export async function existingApplicationAccount(email: string, linkedinUrl?: string) {
  const address = email.trim().toLowerCase();
  const slug = linkedinUrl?.match(/linkedin\.com\/in\/([^/?#]+)/i)?.[1];
  const urlMatch = slug ? [{ linkedinUrl: { equals: `https://www.linkedin.com/in/${slug}`, mode: "insensitive" as const } }, { linkedinUrl: { endsWith: `/in/${slug}/`, mode: "insensitive" as const } }, { linkedinUrl: { endsWith: `/in/${slug}`, mode: "insensitive" as const } }, { linkedinUrl: { contains: `/in/${slug}?`, mode: "insensitive" as const } }] : [];
  const [application, account] = await Promise.all([
    prisma.ambassadorApplication.findFirst({ where: { OR: [{ email: { equals: address, mode: "insensitive" } }, { linkedinEmail: { equals: address, mode: "insensitive" } }, ...urlMatch] }, select: { id: true } }),
    prisma.linkedInAccount.findFirst({ where: { OR: [{ personalEmail: { equals: address, mode: "insensitive" } }, { loginEmail: { equals: address, mode: "insensitive" } }, ...urlMatch] }, select: { id: true } }),
  ]);
  return application || account ? `${EXISTING_ACCOUNT_NOTE} Review before creating another account or payout.${application ? ` Existing application: ${application.id}.` : ""}${account ? ` Existing inventory account: ${account.id}.` : ""}` : null;
}
