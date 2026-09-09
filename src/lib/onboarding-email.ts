import { randomInt } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assignedEmail, emailSetupConfig, EmailSetupError, forwardingActive, hashEmailCode, linkedinSender, forwardedText } from "@/lib/onboarding-email-policy";
import { onboardingMailRequest } from "@/services/onboarding-mail";

export const emailAction = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), destination: z.string().trim().email().max(254).transform(s => s.toLowerCase()), domain: z.string(), consent: z.literal(true) }),
  z.object({ action: z.literal("verify"), code: z.string().regex(/^\d{6}$/) }),
  z.object({ action: z.literal("primary"), consent: z.literal(true) }),
]);

export async function emailSetupSummary(id: string, referrerId: string) {
  const config = emailSetupConfig();
  if (!config.enabled) return null;
  const s = await prisma.selfServiceOnboarding.findFirst({ where: { id, referrerId }, select: { state: true, emailSetup: true } });
  if (!s) throw new EmailSetupError("Onboarding not found.", 404);
  const e = s.emailSetup;
  return { configured: config.ready, domains: config.domains, address: e?.address || null, destination: e?.destination || null,
    destinationVerified: !!e?.destinationVerifiedAt, primaryConfirmed: !!e?.primaryConfirmedAt,
    forwardingActive: !!e && forwardingActive(e, s.state), forwardingUntil: e?.forwardingUntil || null,
    lastForwardedAt: e?.lastForwardedAt || null };
}

export async function requireEmailSetup(id: string, referrerId: string) {
  const info = await emailSetupSummary(id, referrerId);
  if (info && (!info.configured || !info.primaryConfirmed)) throw new EmailSetupError("Complete the primary-email step before opening GoLogin.", 409);
}

export async function updateEmailSetup(id: string, referrerId: string, input: z.infer<typeof emailAction>) {
  const config = emailSetupConfig();
  if (!config.ready) throw new EmailSetupError("Email setup is not live yet. The team needs to verify receiving and forwarding first.", 503);
  const owner = await prisma.selfServiceOnboarding.findFirst({ where: { id, referrerId }, include: { application: { select: { fullName: true } } } });
  if (!owner || owner.state === "confirmed") throw new EmailSetupError("This onboarding cannot be changed.", 409);
  const now = new Date();
  if (input.action === "start") {
    if (!config.domains.includes(input.domain)) throw new EmailSetupError("Choose an enabled email domain.");
    if (config.domains.includes(input.destination.split("@")[1])) throw new EmailSetupError("Use an existing inbox, not an onboarding address.");
    const code = String(randomInt(100000, 1000000));
    const attempt = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(69100902)`;
      const prior = await tx.onboardingEmailSetup.findUnique({ where: { sessionId: id } });
      if (prior?.destinationVerifiedAt && (prior.destination !== input.destination || prior.address.split("@")[1] !== input.domain)) throw new EmailSetupError("A verified route cannot be reassigned. Ask the team for help.", 409);
      if (prior?.codeSentAt && now.getTime() - prior.codeSentAt.getTime() < 60000) throw new EmailSetupError("Wait one minute before requesting another code.", 429);
      if ((prior?.codeSends || 0) >= 5) throw new EmailSetupError("Verification send limit reached. Ask the team for help.", 429);
      const recent = await tx.onboardingEmailSetup.count({ where: { destination: input.destination, codeSentAt: { gt: new Date(now.getTime() - 60000) } } });
      if (recent) throw new EmailSetupError("A code was recently sent to this inbox. Wait one minute.", 429);
      return tx.onboardingEmailSetup.upsert({ where: { sessionId: id },
        create: { sessionId: id, address: assignedEmail(owner.application.fullName, id, input.domain), destination: input.destination, consentAt: now,
          codeHash: hashEmailCode(id, input.destination, code), codeExpiresAt: new Date(now.getTime() + 600000), codeSentAt: now, codeSends: 1 },
        update: { address: prior?.destinationVerifiedAt ? prior.address : assignedEmail(owner.application.fullName, id, input.domain), destination: input.destination, consentAt: now, codeHash: hashEmailCode(id, input.destination, code), codeExpiresAt: new Date(now.getTime() + 600000), codeSentAt: now, codeAttempts: 0, codeSends: { increment: 1 } },
      });
    });
    try {
      await onboardingMailRequest("/emails", { from: process.env.RESEND_FROM_EMAIL, to: [input.destination], subject: "Confirm your onboarding forwarding inbox",
        text: `Your verification code is ${code}. It expires in 10 minutes. Only enter it in the LinkedVelocity onboarding you started. If you did not request this, ignore this email.` }, `onboarding-inbox-${id}-${attempt.codeSends}`);
    } catch { throw new EmailSetupError("The verification email could not be confirmed as sent. Wait a minute, then request a new code.", 502); }
    return;
  }
  if (input.action === "verify") {
    const accepted = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(69100902)`;
      const e = await tx.onboardingEmailSetup.findUnique({ where: { sessionId: id } });
      if (!e?.codeHash || !e.codeExpiresAt || e.codeExpiresAt <= now || e.codeAttempts >= 5) return false;
      // Persist failed attempts: throwing inside the transaction would roll them back.
      await tx.onboardingEmailSetup.update({ where: { sessionId: id }, data: { codeAttempts: { increment: 1 } } });
      if (e.codeHash !== hashEmailCode(id, e.destination, input.code)) return false;
      await tx.onboardingEmailSetup.update({ where: { sessionId: id }, data: { destinationVerifiedAt: now, forwardingUntil: new Date(now.getTime() + 3600000), codeHash: null, codeExpiresAt: null } });
      return true;
    });
    if (!accepted) throw new EmailSetupError("Incorrect or expired code. Request a new code if needed.");
    return;
  }
  await prisma.$transaction(async tx => {
    const e = await tx.onboardingEmailSetup.findUnique({ where: { sessionId: id } });
    if (!e || !forwardingActive(e, owner.state) || !e.lastForwardedAt) throw new EmailSetupError("Verify the forwarding inbox and receive the LinkedIn message before confirming the primary address.", 409);
    if (e.primaryConfirmedAt) return;
    await tx.onboardingEmailSetup.update({ where: { sessionId: id }, data: { primaryConfirmedAt: now } });
    await tx.linkedInAccount.update({ where: { id: owner.accountId }, data: { loginEmail: e.address } });
    await tx.ambassadorApplication.update({ where: { id: owner.applicationId }, data: { linkedinEmail: e.address } });
    // This is a referrer attestation only. It does not verify LinkedIn ownership or authorize payout.
  });
}

const incomingEmail = z.object({ id: z.string(), from: z.string(), to: z.array(z.string()), created_at: z.string(), subject: z.string(), text: z.string().nullable(), html: z.string().nullable() });

export async function forwardOnboardingEmail(emailId: string) {
  const config = emailSetupConfig();
  if (!config.ready) throw new Error("Inbound routing is disabled");
  const msg = incomingEmail.parse(await onboardingMailRequest(`/emails/receiving/${encodeURIComponent(emailId)}`));
  if (msg.id !== emailId || !linkedinSender(msg.from)) return;
  // Never fan out a multi-recipient message across account owners or disclose its contents in logs.
  if (msg.to.length !== 1) return;
  const address = msg.to[0].trim().toLowerCase();
  if (!config.domains.includes(address.split("@")[1])) return;
  const e = await prisma.onboardingEmailSetup.findUnique({ where: { address }, include: { session: { select: { state: true, referrer: { select: { active: true } } } } } });
  const now = new Date();
  if (!e || !e.session.referrer.active || !forwardingActive(e, e.session.state, now)) return;
  const received = new Date(msg.created_at);
  if (!Number.isFinite(received.getTime()) || received < e.destinationVerifiedAt! || received > now || now.getTime() - received.getTime() > 3600000) return;
  const claimed = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(69100902)`;
    const prior = await tx.onboardingEmailDelivery.findUnique({ where: { emailId } });
    if (prior && (prior.status === "sent" || prior.createdAt.getTime() < now.getTime() - 23 * 3600000)) return false;
    if (prior?.leaseUntil && prior.leaseUntil > now) throw new Error("Delivery is in progress");
    if (!prior && await tx.onboardingEmailDelivery.count({ where: { sessionId: e.sessionId } }) >= 20) return false;
    await tx.onboardingEmailDelivery.upsert({ where: { emailId }, create: { emailId, sessionId: e.sessionId, leaseUntil: new Date(now.getTime() + 60000) }, update: { leaseUntil: new Date(now.getTime() + 60000) } });
    return true;
  });
  if (!claimed) return;
  // Plain text avoids remote tracking, executable markup and attachment disclosure.
  const content = forwardedText(msg.text, msg.html);
  try {
    const current = await prisma.onboardingEmailSetup.findUnique({ where: { sessionId: e.sessionId }, include: { session: { select: { state: true } } } });
    if (!current || !forwardingActive(current, current.session.state)) return;
    await onboardingMailRequest("/emails", { from: process.env.RESEND_FROM_EMAIL, to: [e.destination], subject: "LinkedIn onboarding message",
      text: `Message for ${e.address}\n\nOnly use this message for the onboarding you are performing with the account owner's consent. This forwarded message is not proof that the address is primary. Never share passwords.\n\n${content}` }, `onboarding-forward-${emailId}`);
    await prisma.$transaction([
      prisma.onboardingEmailDelivery.update({ where: { emailId }, data: { status: "sent", sentAt: new Date(), leaseUntil: null } }),
      prisma.onboardingEmailSetup.update({ where: { sessionId: e.sessionId }, data: { lastForwardedAt: new Date() } }),
    ]);
  } catch {
    await prisma.onboardingEmailDelivery.update({ where: { emailId }, data: { leaseUntil: null } });
    throw new Error("Forward delivery needs retry");
  }
}
