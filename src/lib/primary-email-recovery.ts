import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { emailSetupConfig, EmailSetupError, hashEmailCode, onboardingEmailFrom, linkedinSender, forwardedText } from "@/lib/onboarding-email-policy";
import { onboardingMailRequest } from "@/services/onboarding-mail";
import { ownerMatches, emailConfirmation } from "@/lib/primary-email-policy";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const accountSelect = { id: true, loginEmail: true, personalEmail: true, linkedinUrl: true, notes: true, selfServiceOnboarding: { select: { applicationId: true } } } as const;
async function resolveOwner(destination: string) {
  const [accounts, apps] = await Promise.all([
    prisma.linkedInAccount.findMany({ where: { removedAt: null }, select: accountSelect }),
    prisma.ambassadorApplication.findMany({ select: { id: true, email: true, linkedinUrl: true } }),
  ]);
  const matches = accounts.filter(a => ownerMatches(a, apps, destination));
  if (matches.length !== 1) return null;
  const account = matches[0];
  const address = account.loginEmail?.trim().toLowerCase();
  if (!address || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return null;
  if (accounts.filter(a => a.loginEmail?.trim().toLowerCase() === address).length !== 1) return null;
  return { id: account.id, address };
}

export async function startPrimaryRecovery(destination: string, ip: string) {
  if (!emailSetupConfig().ready) throw new EmailSetupError("Email verification is temporarily unavailable. Please book a call with our team.", 503);
  const token = randomBytes(32).toString("hex"), id = hash(token), ipHash = hash(ip);
  const code = String(randomInt(100000, 1000000));
  const now = new Date();
  // Check rate limits before matching records, and consume an attempt for unknown addresses too.
  await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(69100903)`;
    const day = new Date(now.getTime() - 86400000), hour = new Date(now.getTime() - 3600000);
    const [recent, daily, perIp, global] = await Promise.all([
      tx.primaryEmailRecovery.count({ where: { destination, createdAt: { gt: new Date(now.getTime() - 60000) } } }),
      tx.primaryEmailRecovery.count({ where: { destination, createdAt: { gt: day } } }),
      tx.primaryEmailRecovery.count({ where: { ipHash, createdAt: { gt: hour } } }),
      tx.primaryEmailRecovery.count({ where: { createdAt: { gt: hour } } }),
    ]);
    if (recent || daily >= 5 || perIp >= 20 || global >= 200) throw new EmailSetupError("Please wait before requesting another code. Contact our team if you need help.", 429);
    await tx.primaryEmailRecovery.create({ data: { id, destination, ipHash, codeHash: hashEmailCode(id, destination, code), expiresAt: new Date(now.getTime() + 600000) } });
  });
  await onboardingMailRequest("/emails", { from: onboardingEmailFrom(), to: [destination], subject: "Verify your email for LinkedVelocity account help",
      text: `Your LinkedVelocity verification code is ${code}. It expires in 10 minutes. Enter it on the primary-email guide you opened. For supported LV addresses, this lets us forward LinkedIn’s email-address confirmation to this inbox for 30 minutes. The guide will tell you if your address needs help from our team instead. If you did not request this, ignore this email.` }, `primary-email-verify-${id}`);
  return { token, message: "We sent a verification code to your email. Check your inbox and spam folder. The code expires in 10 minutes." };
}

export async function verifyPrimaryRecovery(token: string, code: string) {
  const id = hash(token), now = new Date();
  const accepted = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(69100903)`;
    const e = await tx.primaryEmailRecovery.findUnique({ where: { id } });
    if (!e || e.verifiedAt || e.expiresAt <= now || e.attempts >= 5) return false;
    await tx.primaryEmailRecovery.update({ where: { id }, data: { attempts: { increment: 1 } } });
    if (!timingSafeEqual(Buffer.from(e.codeHash), Buffer.from(hashEmailCode(id, e.destination, code)))) return false;
    // Only one active recovery per account; stop any older forwarding window.
    if (e.accountId) await tx.primaryEmailRecovery.updateMany({ where: { accountId: e.accountId, verifiedAt: { not: null }, completedAt: null }, data: { forwardingUntil: now } });
    await tx.primaryEmailRecovery.update({ where: { id }, data: { verifiedAt: now, forwardingUntil: new Date(now.getTime() + 1800000) } });
    return true;
  });
  if (!accepted) throw new EmailSetupError("The code is incorrect, expired, or already used. Request a new code if needed.");
  const verified = await prisma.primaryEmailRecovery.findUnique({ where: { id } });
  const owner = await resolveOwner(verified!.destination);
  if (owner) await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(69100903)`;
    await tx.primaryEmailRecovery.updateMany({ where: { accountId: owner.id, id: { not: id }, verifiedAt: { not: null }, completedAt: null }, data: { forwardingUntil: new Date() } });
    await tx.primaryEmailRecovery.update({ where: { id }, data: { accountId: owner.id, address: owner.address, forwardingUntil: new Date(Date.now() + 1800000) } });
  });
  return primaryRecoveryStatus(token);
}

async function activeRecovery(id: string) {
  const e = await prisma.primaryEmailRecovery.findUnique({ where: { id } });
  if (!e?.verifiedAt || !e.forwardingUntil || e.forwardingUntil <= new Date() || e.completedAt) throw new EmailSetupError("This session has ended. Verify your personal email again to continue.", 403);
  if (!e.accountId) return e;
  const owner = await resolveOwner(e.destination);
  if (!owner || owner.id !== e.accountId || owner.address !== e.address) throw new EmailSetupError("The saved account details have changed. Please contact our team.", 403);
  return e;
}
export async function primaryRecoveryStatus(token: string) {
  const e = await activeRecovery(hash(token));
  return { forwardingAvailable: !!e.address && emailSetupConfig().domains.includes(e.address.split("@")[1]), address: e.address, destination: e.destination, forwardingUntil: e.forwardingUntil, lastForwardedAt: e.lastForwardedAt };
}
// A fresh address belongs only to this verified setup; it never re-routes an existing account.
export async function allocatePrimaryEmail(token: string) {
  const e = await activeRecovery(hash(token));
  if (e.address) return primaryRecoveryStatus(token);
  const config = emailSetupConfig();
  if (!config.ready) throw new EmailSetupError("Email setup is temporarily unavailable.", 503);
  await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(69100902)`;
    const current = await tx.primaryEmailRecovery.findUnique({ where: { id: e.id } });
    if (current?.address) return;
    if (!current?.verifiedAt || current.completedAt || !current.forwardingUntil || current.forwardingUntil <= new Date()) throw new EmailSetupError("Verify your personal email again to continue.", 403);
    const domain = config.domains[parseInt(e.id.slice(0, 8), 16) % config.domains.length];
    const address = `setup-${e.id.slice(0, 20)}@${domain}`;
    const [account, onboarding, recovery] = await Promise.all([
      tx.linkedInAccount.findFirst({ where: { OR: [{ loginEmail: { equals: address, mode: "insensitive" } }, { personalEmail: { equals: address, mode: "insensitive" } }] }, select: { id: true } }),
      tx.onboardingEmailSetup.findUnique({ where: { address }, select: { sessionId: true } }),
      tx.primaryEmailRecovery.findFirst({ where: { address }, select: { id: true } }),
    ]);
    if (account || onboarding || recovery) throw new EmailSetupError("Please restart verification to generate another address.", 409);
    await tx.primaryEmailRecovery.update({ where: { id: e.id }, data: { address, forwardingUntil: new Date(Date.now() + 1800000) } });
  });
  return primaryRecoveryStatus(token);
}

export async function completePrimaryRecovery(token: string) {
  const e = await activeRecovery(hash(token));
  if (!e.address) throw new EmailSetupError("Choose your LV email before confirming it as primary.");
  await prisma.$transaction(async tx => {
    const changed = await tx.primaryEmailRecovery.updateMany({ where: { id: e.id, completedAt: null }, data: { completedAt: new Date(), forwardingUntil: new Date() } });
    if (changed.count && e.accountId) {
      const note = `[${new Date().toISOString()}] Owner confirmed ${e.address} is verified and primary via the primary-email guide. Team must still verify access; this does not change availability or payments.`;
      await tx.$executeRaw`UPDATE linkedin_accounts SET notes = concat_ws(E'\n', nullif(notes, ''), ${note}::text), updated_at = NOW() WHERE id = ${e.accountId}::uuid`;
    }
  });
  return { completed: true };
}

// Called by the signed inbound webhook before the older onboarding routing.
// Returning true reserves an active recovery inbox even for a message we deliberately do not forward.
export async function forwardPrimaryRecoveryEmail(emailId: string, msg: { id: string; from: string; to: string[]; created_at: string; subject: string; text: string | null; html: string | null }) {
  if (msg.id !== emailId || msg.to.length !== 1) return false;
  const address = msg.to[0].trim().toLowerCase(), now = new Date();
  const rows = await prisma.primaryEmailRecovery.findMany({ where: { address, verifiedAt: { not: null }, completedAt: null, forwardingUntil: { gt: now } }, take: 2 });
  if (!rows.length) return false;
  if (!emailSetupConfig().domains.includes(address.split("@")[1])) return true;
  if (rows.length !== 1 || !linkedinSender(msg.from)) return true;
  const e = rows[0];
  const received = new Date(msg.created_at);
  if (!Number.isFinite(received.getTime()) || received < e.verifiedAt! || received > now) return true;
  const content = emailConfirmation(msg.subject, forwardedText(msg.text, msg.html));
  if (!content) return true;
  try { await activeRecovery(e.id); } catch (error) { if (error instanceof EmailSetupError) return true; throw error; }
  const claimed = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(69100903)`;
    const prior = await tx.primaryEmailDelivery.findUnique({ where: { emailId } });
    if (prior?.sentAt || (prior && prior.createdAt.getTime() < now.getTime() - 23 * 3600000)) return false;
    if (prior && prior.recoveryId !== e.id) return false;
    if (prior?.leaseUntil && prior.leaseUntil > now) throw new Error("Delivery in progress");
    if (!prior && await tx.primaryEmailDelivery.count({ where: { recoveryId: e.id } }) >= 10) return false;
    await tx.primaryEmailDelivery.upsert({ where: { emailId }, create: { emailId, recoveryId: e.id, leaseUntil: new Date(now.getTime() + 60000) }, update: { leaseUntil: new Date(now.getTime() + 60000) } });
    return true;
  });
  if (!claimed) return true;
  try {
    await activeRecovery(e.id);
    await onboardingMailRequest("/emails", { from: onboardingEmailFrom(), to: [e.destination], subject: "Confirm your LinkedVelocity email on LinkedIn",
      text: `You requested help restoring ${e.address} to your LinkedIn account.\n\n${content}\n\nAfter confirming it on LinkedIn, choose Make primary beside ${e.address}. Keep your personal email as a secondary address.\n\nReturn to the guide and select “I have made it primary” when done:\nhttps://linkedvelocity.com/guide/primary-email\n\nNeed help? https://calendly.com/linkedvelocity-info/30min` }, `primary-email-forward-${emailId}`);
    await prisma.$transaction([
      prisma.primaryEmailDelivery.update({ where: { emailId }, data: { sentAt: new Date(), leaseUntil: null } }),
      prisma.primaryEmailRecovery.update({ where: { id: e.id }, data: { lastForwardedAt: new Date() } }),
    ]);
  } catch {
    await prisma.primaryEmailDelivery.update({ where: { emailId }, data: { leaseUntil: null } });
    throw new Error("Primary email confirmation needs retry");
  }
  return true;
}
