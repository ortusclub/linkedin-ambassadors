import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAccountCodeLink } from "@/lib/account-code-link";
import { decryptSecret } from "@/lib/crypto-creds";

// Pipeline/onboarding counterpart to /api/admin/accounts/[id]/code-link. The pipeline is keyed on
// the ambassador application, not a LinkedIn-account id, so resolve the account by its login email
// (admin-authorized), mint a private sign-in link, and return the saved credentials to include.
const schema = z.object({ loginEmail: z.string().email() });

export async function POST(req: Request) {
  const headers = { "Cache-Control": "no-store" };
  try {
    await requireAdmin();
    const { loginEmail } = schema.parse(await req.json());
    const account = await prisma.linkedInAccount.findFirst({
      where: { removedAt: null, loginEmail: { equals: loginEmail, mode: "insensitive" } },
      select: { id: true, loginEmail: true, accountPassword: true },
    });
    if (!account?.loginEmail) return NextResponse.json({ error: "No LinkedIn account found with that login email yet." }, { status: 404, headers });
    const password = decryptSecret(account.accountPassword) || "";
    if (!password) return NextResponse.json({ error: "Saved login password is missing for this account." }, { status: 404, headers });
    return NextResponse.json({ url: await createAccountCodeLink(account.id), email: account.loginEmail, password }, { headers });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "A valid login email is required." }, { status: 400, headers });
    const status = error instanceof Error && error.message === "Unauthorized" ? 401 : error instanceof Error && error.message === "Forbidden" ? 403 : 503;
    return NextResponse.json({ error: "Could not create a sign-in link." }, { status, headers });
  }
}
