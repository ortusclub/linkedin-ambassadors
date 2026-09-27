import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { onboardingMailRequest } from "@/services/onboarding-mail";

const schema = z.object({ recipient: z.enum(["ambassador", "referrer"]), issue: z.enum(["restricted", "lost_access"]), details: z.string().trim().min(1).max(3000), subject: z.string().trim().min(1).max(200), text: z.string().trim().min(1).max(15000), requestId: z.string().uuid() });
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const input = schema.parse(await req.json());
    const { id } = await params;
    const account = await prisma.linkedInAccount.findUnique({ where: { id }, select: { linkedinName: true, linkedinUrl: true, notes: true, selfServiceOnboarding: { select: { applicationId: true } } } });
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    const owner = (account.notes || "").match(/Owner:\s*(\S+@\S+)/)?.[1]?.replace(/\.$/, "");
    const apps = await prisma.ambassadorApplication.findMany({ select: { id: true, email: true, linkedinUrl: true, referredBy: true } });
    const norm = (s: string | null) => (s || "").toLowerCase().replace(/^https?:\/\/(www\.)?/, "").split("?")[0].replace(/\/+$/, "");
    const matched = account.selfServiceOnboarding ? apps.filter(a => a.id === account.selfServiceOnboarding!.applicationId) : apps.filter(a => norm(account.linkedinUrl) && norm(a.linkedinUrl) === norm(account.linkedinUrl));
    const candidates = matched.length ? matched : apps.filter(a => owner && a.email.toLowerCase() === owner.toLowerCase());
    if (candidates.length !== 1) return NextResponse.json({ error: "A unique ambassador application must be linked before emailing." }, { status: 400 });
    const app = candidates[0];
    let to = app.email;
    if (input.recipient === "referrer") {
      const ref = app.referredBy ? await prisma.referrer.findFirst({ where: { slug: { equals: app.referredBy, mode: "insensitive" } }, select: { email: true, contacts: true } }) : null;
      const contacts = (Array.isArray(ref?.contacts) ? ref.contacts : []) as Array<{ method?: string; handle?: string }>;
      to = ref?.email || contacts.find(c => c.method?.toLowerCase() === "email")?.handle || "";
    }
    if (!z.string().email().safeParse(to).success) return NextResponse.json({ error: `No valid ${input.recipient} email is saved.` }, { status: 400 });
    const message = { subject: input.subject, text: input.text };
    await onboardingMailRequest("/emails", { from: process.env.RESEND_FROM_EMAIL || "LinkedVelocity <info@linkedvelocity.com>", reply_to: process.env.ADMIN_NOTIFICATION_EMAIL || "info@linkedvelocity.com", to: [to], ...message }, `account-issue-${id}-${input.requestId}`);
    const entry = `[${new Date().toISOString()}] Emailed ${input.recipient} (${to}): ${message.subject}. ${input.issue === "restricted" ? "Account restricted" : "Lost access"}. ${input.details}\nMessage sent:\n${message.text}`;
    await prisma.$executeRaw`UPDATE linkedin_accounts SET notes = concat_ws(E'\n', nullif(notes, ''), ${entry}::text), updated_at = NOW() WHERE id = ${id}::uuid`;
    return NextResponse.json({ ok: true, to });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Choose an issue and enter the required action." }, { status: 400 });
    const message = error instanceof Error ? error.message : "Could not send email";
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500 });
  }
}
