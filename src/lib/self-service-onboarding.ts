import { prisma } from "@/lib/prisma";
import { currencyConfig } from "@/lib/referral-currency";
import { setupDueDate } from "@/lib/payment-schedule";
import { createProfile, createPublicShareLink, getPublicShareLink } from "@/services/gologin";
import { selfServiceInput } from "@/lib/self-service-input";
import { z } from "zod";
import { countryCode } from "@/lib/countries";
import { proxyPurchaseLimits, quoteStaticProxy, purchaseStaticProxy, readPurchasedProxy, ProxyPurchaseNotSubmitted } from "@/services/proxy-cheap";
import type { Prisma } from "@/generated/prisma/client";
import { availableProxySlots } from "@/lib/onboarding-proxy-pool";
import { emailSetupSummary, requireEmailSetup } from "@/lib/onboarding-email";

export class OnboardingError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

async function availableProxies(db: Prisma.TransactionClient = prisma) {
  const [proxies, accounts, reservations] = await Promise.all([
    db.proxy.findMany({ orderBy: { createdAt: "asc" } }),
    db.linkedInAccount.findMany({ where: { proxyHost: { not: null } }, select: { id: true, proxyHost: true, proxyPort: true, proxyUsername: true, proxyPassword: true, proxyLocation: true } }),
    db.selfServiceOnboarding.findMany({ where: { proxyId: { not: null } }, select: { accountId: true, proxyId: true, proxySlot: true } }),
  ]);
  return availableProxySlots(proxies, accounts, reservations);
}

export async function onboardingCountries() {
  return [...new Set((await availableProxies()).map((p) => p.country))].sort();
}

export async function onboardingSummary(id: string, referrerId: string) {
  const s = await prisma.selfServiceOnboarding.findFirst({
    where: { id, referrerId }, include: { account: true, application: true, referrer: true },
  });
  if (!s) throw new OnboardingError("Onboarding not found.", 404);
  const cfg = currencyConfig(s.referrer.slug);
  const emailSetup = await emailSetupSummary(id, referrerId);
  return {
    emailSetup,
    id: s.id, name: s.application.fullName, state: s.state, opened: !!s.openedAt,
    country: countryCode(s.account.location),
    proxyAssigned: !!s.proxyId,
    proxyPriceLimit: proxyPurchaseLimits().perProxy,
    // Only a ready, owned session may expose a browser capability. Never expose credentials.
    shareLink: s.state === "ready" && (!emailSetup || emailSetup.primaryConfirmed) ? s.account.gologinShareLink : null,
    confirmedAt: s.confirmedAt,
    setupDueAt: s.confirmedAt ? setupDueDate(s.confirmedAt) : null,
    setupAmount: cfg.offer.setup, monthlyAmount: cfg.offer.monthly,
    commission: `${cfg.symbol}${cfg.rate}`, verified: !!s.application.verifiedAt,
  };
}

export async function reserveOnboarding(referrer: { id: string; slug: string; name: string }, input: z.infer<typeof selfServiceInput>) {
  const cfg = currencyConfig(referrer.slug);
  const country = countryCode(input.country);
  if (!country) throw new OnboardingError("Choose a valid country.");
  if (!cfg.payoutMethods.includes(input.paymentMethod)) throw new OnboardingError("Choose a supported payout method.");
  // Short database-only transaction; external provisioning happens after commit.
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(69100901)`;
    const existing = await tx.selfServiceOnboarding.findFirst({ where: { OR: [{ email: input.email }, { linkedinUrl: input.linkedinUrl }] } });
    if (existing) {
      if (existing.referrerId !== referrer.id || existing.email !== input.email || existing.linkedinUrl !== input.linkedinUrl) {
        throw new OnboardingError("This person already has onboarding in progress. Contact the team to locate it.", 409);
      }
      return existing.id;
    }
    const urlSlug = input.linkedinUrl.split("/in/")[1];
    const [application, account] = await Promise.all([
      tx.ambassadorApplication.findFirst({ where: { OR: [{ email: { equals: input.email, mode: "insensitive" } }, { linkedinUrl: { contains: `/in/${urlSlug}`, mode: "insensitive" } }] }, select: { id: true } }),
      tx.linkedInAccount.findFirst({ where: { OR: [{ personalEmail: { equals: input.email, mode: "insensitive" } }, { loginEmail: { equals: input.email, mode: "insensitive" } }, { linkedinUrl: { contains: `/in/${urlSlug}`, mode: "insensitive" } }] }, select: { id: true } }),
    ]);
    if (application || account) throw new OnboardingError("This person is already in our system. Ask the team to continue their existing onboarding.", 409);
    const proxy = (await availableProxies(tx)).find((p) => p.country === country);
    if (!proxy && !proxyPurchaseLimits().enabled) throw new OnboardingError("No dedicated proxy is available for this country yet. Ask the team to add one, then try again.", 409);
    const now = new Date();
    const app = await tx.ambassadorApplication.create({ data: {
      fullName: input.fullName, email: input.email, linkedinEmail: input.email,
      linkedinUrl: input.linkedinUrl, location: country, contactNumber: input.contactNumber,
      accountFreshness: input.accountFreshness, paymentMethod: input.paymentMethod,
      paymentDetails: input.paymentDetails, payoutName: input.payoutName,
      referredBy: referrer.slug, referralSource: "self-service", poc: referrer.name,
      status: "onboarding", ownerStatus: "onboarding", onboardingStartedAt: now,
      payoutCurrency: cfg.currency, offeredAmount: cfg.monthlyAmount,
      adminNotes: `Self-service onboarding; owner consent and LinkedIn minimum-age confirmation (16, or older where local law requires) recorded ${now.toISOString()}. Login not yet confirmed.`,
    } });
    const acc = await tx.linkedInAccount.create({ data: {
      linkedinName: input.fullName, linkedinUrl: input.linkedinUrl, personalEmail: input.email,
      location: country, gologinAccount: "klabber", status: "under_construction", listed: false,
      ambassadorPayment: cfg.monthlyAmount,
      proxyHost: proxy?.host, proxyPort: proxy?.port, proxyUsername: proxy?.username, proxyPassword: proxy?.password, proxyLocation: proxy?.country,
      notes: `Owner: ${input.email}\nSelf-service onboarding via ${referrer.slug}. Awaiting owner login confirmation.`,
    } });
    const session = await tx.selfServiceOnboarding.create({ data: {
      referrerId: referrer.id, applicationId: app.id, accountId: acc.id,
      proxyId: proxy?.id, proxySlot: proxy?.slot, email: input.email, linkedinUrl: input.linkedinUrl, consentAt: now,
    } });
    return session.id;
  }, { timeout: 15000 });
}

// Called under the allocation lock, including immediately before reserving a purchase.
async function reuseProxy(tx: Prisma.TransactionClient, id: string, referrerId: string, country: string) {
  const current = await tx.selfServiceOnboarding.findFirstOrThrow({ where: { id, referrerId } });
  if (current.proxyId) return true;
  if (current.state !== "reserved" || current.proxyPurchaseAt || current.proxyOrderId) return false;
  const proxy = (await availableProxies(tx)).find((p) => p.country === country);
  if (!proxy) return false;
  await tx.linkedInAccount.update({ where: { id: current.accountId }, data: {
    proxyHost: proxy.host, proxyPort: proxy.port, proxyUsername: proxy.username,
    proxyPassword: proxy.password, proxyLocation: proxy.country,
  } });
  await tx.selfServiceOnboarding.update({ where: { id }, data: { proxyId: proxy.id, proxySlot: proxy.slot } });
  return true;
}

async function acquireProxy(id: string, referrerId: string): Promise<boolean> {
  const s = await prisma.selfServiceOnboarding.findFirstOrThrow({ where: { id, referrerId }, include: { account: true } });
  if (s.proxyId) return true;
  const country = countryCode(s.account.location);
  if (!country) throw new OnboardingError("The account country needs a team check.", 409);
  let orderId = s.proxyOrderId;
  if (!orderId) {
    if (s.state !== "reserved") throw new OnboardingError("The proxy purchase is running or needs a team check. Your progress is saved.", 409);
    const reused = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(69100901)`;
      return reuseProxy(tx, id, referrerId, country);
    });
    if (reused) return true;
    let quote;
    try { quote = await quoteStaticProxy(country); } catch (e) {
      throw new OnboardingError(e instanceof Error && !(e instanceof z.ZodError) ? e.message : "Could not check proxy availability. Please try again.", 409);
    }
    const limits = proxyPurchaseLimits();
    const reusedBeforePurchase = await prisma.$transaction(async (tx) => {
      // Serialize budget reservations across all referrers; include unresolved orders.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(69100901)`;
      if (await reuseProxy(tx, id, referrerId, country)) return true;
      const now = new Date();
      const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const spent = await tx.selfServiceOnboarding.aggregate({ where: { OR: [
        { proxyPurchaseAt: { gte: month } },
        { proxyBudgetReserved: { not: null }, state: { in: ["purchasing", "purchase_unknown"] } },
      ] }, _sum: { proxyBudgetReserved: true } });
      if (limits.monthly !== null && Math.round((Number(spent._sum.proxyBudgetReserved || 0) + quote.price) * 100) > Math.round(limits.monthly * 100)) throw new OnboardingError("The monthly proxy purchase budget has been reached. Ask the team for help.", 409);
      const claim = await tx.selfServiceOnboarding.updateMany({ where: { id, referrerId, state: "reserved", proxyId: null, proxyOrderId: null, proxyPurchaseAt: null }, data: { state: "purchasing", proxyBudgetReserved: quote.price, proxyPurchaseAt: now } });
      if (!claim.count) throw new OnboardingError("This proxy purchase is already in progress. Refresh to check it.", 409);
      return false;
    });
    if (reusedBeforePurchase) return true;
    try {
      const order = await purchaseStaticProxy(quote);
      await prisma.selfServiceOnboarding.update({ where: { id }, data: { proxyOrderId: order.id, proxyBudgetReserved: order.totalPrice, state: "proxy_pending" } });
      orderId = order.id;
    } catch (error) {
      if (error instanceof ProxyPurchaseNotSubmitted) {
        await prisma.selfServiceOnboarding.update({ where: { id }, data: { state: "reserved", proxyBudgetReserved: null, proxyPurchaseAt: null } });
        throw new OnboardingError(error.message, 409);
      }
      // Never retry a charge whose outcome is uncertain, even on a future request.
      await prisma.selfServiceOnboarding.update({ where: { id }, data: { state: "purchase_unknown" } });
      throw new OnboardingError("The proxy order needs a team check. No second purchase will be attempted.", 502);
    }
  }
  let connection;
  try { connection = await readPurchasedProxy(orderId, country); } catch {
    throw new OnboardingError("The purchased proxy is not ready to use. Refresh its delivery status or ask the team to check the saved order.", 502);
  }
  if (!connection) return false;
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(69100901)`;
    const current = await tx.selfServiceOnboarding.findUniqueOrThrow({ where: { id } });
    if (current.proxyId) return;
    const used = await tx.linkedInAccount.findFirst({ where: { proxyHost: connection.host, proxyPort: connection.port } });
    if (used) throw new OnboardingError("The delivered proxy is already assigned. The team needs to check this order.", 409);
    const proxy = await tx.proxy.upsert({ where: { host_port: { host: connection.host, port: connection.port } },
      create: { ...connection, country, type: "residential", provider: "proxy-cheap", status: "active", notes: `Dedicated static residential IPv4; order ${orderId}; auto-renew disabled.` },
      update: { ...connection, country, type: "residential", provider: "proxy-cheap", status: "active" },
    });
    await tx.linkedInAccount.update({ where: { id: s.accountId }, data: { proxyHost: connection.host, proxyPort: connection.port, proxyUsername: connection.username, proxyPassword: connection.password, proxyLocation: country } });
    await tx.selfServiceOnboarding.update({ where: { id }, data: { proxyId: proxy.id, proxySlot: 1, state: "reserved" } });
  });
  return true;
}

export async function prepareOnboarding(id: string, referrerId: string) {
  await requireEmailSetup(id, referrerId);
  const token = process.env.GOLOGIN_API_TOKEN_KLABBER;
  if (!token) throw new OnboardingError("Browser setup is not configured yet. Please contact the team.", 503);
  const owned = await prisma.selfServiceOnboarding.findFirst({ where: { id, referrerId }, select: { id: true } });
  if (!owned) throw new OnboardingError("Onboarding not found.", 404);
  if (!await acquireProxy(id, referrerId)) return;
  const s = await prisma.selfServiceOnboarding.findFirst({ where: { id, referrerId }, include: { account: true } });
  if (!s) throw new OnboardingError("Onboarding not found.", 404);
  if (["ready", "confirmed"].includes(s.state)) return;
  if (s.state === "creating" || s.state === "needs_help") {
    throw new OnboardingError("Browser setup is still running or needs the team to check it. Your progress is saved; do not start a second signup.", 409);
  }
  const claim = await prisma.selfServiceOnboarding.updateMany({ where: { id, referrerId, state: { in: ["reserved", "link_pending"] } }, data: { state: "creating" } });
  if (!claim.count) throw new OnboardingError("Setup is already in progress. Refresh to check it.", 409);
  let profileId = s.account.gologinProfileId;
  try {
    if (!profileId) {
      const profile = await createProfile({
        name: `onboarding-${id}`,
        proxy: { host: s.account.proxyHost!, port: s.account.proxyPort!, username: s.account.proxyUsername || undefined, password: s.account.proxyPassword || undefined },
      }, token);
      if (!profile || typeof profile.id !== "string") throw new Error("Missing profile id");
      // Persist before attempting the share link, so link retries reuse the profile.
      await prisma.linkedInAccount.update({ where: { id: s.accountId }, data: { gologinProfileId: profile.id } });
      profileId = profile.id;
    }
    const name = `onboarding-${id}`;
    const link = await getPublicShareLink(profileId!, name, token) || await createPublicShareLink(profileId!, name, token);
    await prisma.$transaction([
      prisma.linkedInAccount.update({ where: { id: s.accountId }, data: { gologinShareLink: link.publicUrl } }),
      prisma.selfServiceOnboarding.update({ where: { id }, data: { state: "ready" } }),
    ]);
  } catch {
    // A timed-out create may have succeeded upstream. Never blindly create twice.
    await prisma.selfServiceOnboarding.update({ where: { id }, data: { state: profileId ? "link_pending" : "needs_help" } });
    throw new OnboardingError(profileId ? "Your browser is saved, but its launch link is not ready. Please retry." : "Browser setup needs a team check. Your signup and proxy are saved.", 502);
  }
}

export async function confirmOnboarding(id: string, referrerId: string) {
  await requireEmailSetup(id, referrerId);
  await prisma.$transaction(async (tx) => {
    const claim = await tx.selfServiceOnboarding.updateMany({ where: { id, referrerId, state: "ready", openedAt: { not: null } }, data: { state: "confirmed", confirmedAt: new Date() } });
    const s = await tx.selfServiceOnboarding.findFirst({ where: { id, referrerId } });
    if (!s) throw new OnboardingError("Onboarding not found.", 404);
    if (!claim.count) {
      if (s.state === "confirmed") return;
      throw new OnboardingError("Open the prepared browser and finish signing into LinkedIn first.", 409);
    }
    const acc = await tx.linkedInAccount.findUniqueOrThrow({ where: { id: s.accountId } });
    if (!acc.gologinProfileId || !acc.gologinShareLink || acc.restrictedAt || acc.status !== "under_construction") {
      throw new OnboardingError("The team needs to check this account before it can be completed.", 409);
    }
    await tx.ambassadorApplication.update({ where: { id: s.applicationId }, data: {
      status: "onboarded", onboardedAt: s.confirmedAt, ownerStatus: "active",
      // Keep payment blocked until an admin checks the self-reported login.
      accountIssue: "Self-service login reported; awaiting team verification before payout.",
      adminNotes: `Self-service login confirmed by referrer at ${s.confirmedAt!.toISOString()}. Verify login, clear account issue, and confirm ok to pay after review.`,
    } });
    // Keep inventory unlisted and in construction until the usual admin review.
    await tx.linkedInAccount.update({ where: { id: s.accountId }, data: {
      notes: `${acc.notes || ""}\nLogin reported successful ${s.confirmedAt!.toISOString()}; awaiting team verification.`,
    } });
  });
}
