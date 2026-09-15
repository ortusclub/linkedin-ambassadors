import { prisma } from "@/lib/prisma";
import { currencyConfig } from "@/lib/referral-currency";
import { setupDueDate } from "@/lib/payment-schedule";
import { createProfile, createPublicShareLink, findProfileByName, getPublicShareLink } from "@/services/gologin";
import { selfServiceInput } from "@/lib/self-service-input";
import { z } from "zod";
import { countryCode } from "@/lib/countries";
import { proxyPurchaseLimits, quoteCheapestStaticProxy, quoteStaticProxy, purchaseStaticProxy, readPurchasedProxy, ProxyPurchaseNotSubmitted, PURCHASE_PROXY_COUNTRIES } from "@/services/proxy-cheap";
import { Prisma } from "@/generated/prisma/client";
import { availableProxySlots } from "@/lib/onboarding-proxy-pool";
import { emailSetupSummary, requireEmailSetup } from "@/lib/onboarding-email";
import { assertPhoneVerificationToken, phoneVerificationConfigured } from "@/lib/phone-verification";
import { encryptSecret, decryptSecret } from "@/lib/crypto-creds";
import { randomBytes } from "crypto";

export class OnboardingError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

// ---- Per-owner invites (unique link + status the referrer can watch) ----------------

// The referrer creates one link per person they onboard, so they can see who has filled
// theirs in. The owner submits through it; the created session is linked back for status.
export async function createInvite(referrerId: string, ownerName: string) {
  const name = ownerName.trim().slice(0, 120);
  if (name.length < 2) throw new OnboardingError("Enter the person's name.");
  const token = "inv_" + randomBytes(18).toString("base64url");
  await prisma.onboardingInvite.create({ data: { referrerId, ownerName: name, token } });
  return token;
}

export async function inviteForOwner(token: string) {
  return prisma.onboardingInvite.findUnique({ where: { token } });
}

export async function markInviteFilled(token: string, sessionId: string) {
  await prisma.onboardingInvite.updateMany({ where: { token, filledAt: null }, data: { filledAt: new Date(), sessionId } });
}

// A referrer-facing status that mirrors the stages the admin sees on the pipeline, so
// both stay in sync: waiting → details in → ready to sign in → handed off → checking → done.
type InviteRow = { token: string; ownerName: string; filled: boolean; sessionId: string | null; statusKey: string; statusLabel: string };
export async function listReferrerInvites(referrerId: string): Promise<InviteRow[]> {
  // Tolerate the table not existing yet (migration applied separately) so the referrer
  // console still loads instead of hard-failing on the bootstrap fetch.
  const invites = await prisma.onboardingInvite.findMany({ where: { referrerId }, orderBy: { createdAt: "desc" }, take: 60 }).catch((e) => {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") return [];
    throw e;
  });
  const sessionIds = invites.map((i) => i.sessionId).filter((v): v is string => !!v);
  const sessions = sessionIds.length
    ? await prisma.selfServiceOnboarding.findMany({ where: { id: { in: sessionIds } }, include: { application: { select: { fullName: true, status: true, verifiedAt: true, paidAt: true } }, emailSetup: { select: { primaryConfirmedAt: true } } } })
    : [];
  const byId = new Map(sessions.map((s) => [s.id, s]));
  return invites.map((i) => {
    const s = i.sessionId ? byId.get(i.sessionId) : null;
    let statusKey = "waiting", statusLabel = "Waiting for the owner to fill in their details";
    if (s) {
      const app = s.application;
      if (app.paidAt) { statusKey = "done"; statusLabel = "Setup fee sent · done"; }
      else if (app.verifiedAt) { statusKey = "checking"; statusLabel = "Account verified · payout due"; }
      else if (s.state === "confirmed" || app.status === "onboarded") { statusKey = "checking"; statusLabel = "Signed in · we're checking the account"; }
      else if (s.state === "handed_off") { statusKey = "handed_off"; statusLabel = "Handed off to us · we'll sign in"; }
      else if (s.emailSetup?.primaryConfirmedAt) { statusKey = "ready"; statusLabel = "Ready · time to sign in"; }
      else { statusKey = "details_in"; statusLabel = "Details in · add the secure email"; }
    }
    return { token: i.token, ownerName: s?.application.fullName || i.ownerName, filled: !!i.filledAt, sessionId: i.sessionId, statusKey, statusLabel };
  });
}

async function availableProxies(db: Prisma.TransactionClient = prisma) {
  const [proxies, accounts, reservations] = await Promise.all([
    db.proxy.findMany({ orderBy: { createdAt: "asc" } }),
    db.linkedInAccount.findMany({ where: { proxyHost: { not: null } }, select: { id: true, proxyHost: true, proxyPort: true, proxyUsername: true, proxyPassword: true, proxyLocation: true } }),
    db.selfServiceOnboarding.findMany({ where: { proxyId: { not: null } }, select: { accountId: true, proxyId: true, proxySlot: true } }),
  ]);
  return availableProxySlots(proxies, accounts, reservations);
}

function reusableProxy(slots: Awaited<ReturnType<typeof availableProxies>>, accountCountry: string) {
  return PURCHASE_PROXY_COUNTRIES.includes(accountCountry as typeof PURCHASE_PROXY_COUNTRIES[number])
    ? slots.find((proxy) => proxy.country === accountCountry)
    : slots.find((proxy) => PURCHASE_PROXY_COUNTRIES.includes(proxy.country as typeof PURCHASE_PROXY_COUNTRIES[number]));
}

export async function onboardingCountries() {
  return [...new Set((await availableProxies()).map((p) => p.country))].sort();
}

export async function onboardingSummary(id: string, referrerId: string, opts?: { includeCredentials?: boolean }) {
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
    // Only a ready, owned session may expose a browser capability.
    shareLink: s.state === "ready" && (!emailSetup || emailSetup.primaryConfirmed) ? s.account.gologinShareLink : null,
    confirmedAt: s.confirmedAt,
    setupDueAt: s.confirmedAt ? setupDueDate(s.confirmedAt, s.application.accountFreshness) : null,
    setupAmount: cfg.offer.setup, monthlyAmount: cfg.offer.monthly,
    commission: `${cfg.symbol}${cfg.rate * 2}`, verified: !!s.application.verifiedAt,
    // Login the OWNER supplied, revealed only to the referrer doing the PC sign-in
    // (never the payout — that stays owner-only). Decrypted at rest.
    ...(opts?.includeCredentials ? {
      credentials: {
        loginEmail: s.account.loginEmail || emailSetup?.address || s.account.personalEmail || null,
        password: decryptSecret(s.account.accountPassword) || null,
        twoFactor: decryptSecret(s.account.twoFactor) || null,
      },
    } : {}),
  };
}

// The owner supplied a login in their intake form; store it encrypted on the account so
// the referrer (PC) or the team (phone) can sign in. No state change — the wizard drives
// state — just the credential capture.
export async function captureOnboardingCredentials(id: string, referrerId: string, input: { password: string; twoFactorKey: string }) {
  const s = await prisma.selfServiceOnboarding.findFirst({ where: { id, referrerId }, select: { accountId: true } });
  if (!s) throw new OnboardingError("Onboarding not found.", 404);
  await prisma.linkedInAccount.update({ where: { id: s.accountId }, data: {
    accountPassword: encryptSecret(input.password),
    ...(input.twoFactorKey ? { twoFactor: encryptSecret(input.twoFactorKey) } : {}),
  } });
}

export async function reserveOnboarding(referrer: { id: string; slug: string; name: string }, input: z.infer<typeof selfServiceInput>) {
  if (phoneVerificationConfigured()) assertPhoneVerificationToken(input.phoneVerificationToken, input.contactNumber, referrer.id);
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
    const proxy = reusableProxy(await availableProxies(tx), country);
    if (!proxy && !proxyPurchaseLimits().enabled) throw new OnboardingError("No dedicated proxy is available for this country yet. Ask the team to add one, then try again.", 409);
    const now = new Date();
    const app = await tx.ambassadorApplication.create({ data: {
      fullName: input.fullName, email: input.email, linkedinEmail: input.email,
      linkedinUrl: input.linkedinUrl, location: country, contactNumber: input.contactNumber,
      accountFreshness: input.accountFreshness, paymentMethod: input.paymentMethod,
      paymentDetails: input.paymentDetails, payoutName: input.payoutName,
      bankName: input.bankName || null, bankAccountNumber: input.bankAccountNumber || null,
      bankRoutingNumber: input.bankRoutingNumber || null,
      referredBy: referrer.slug, referralSource: "self-service", poc: referrer.name,
      status: "onboarding", ownerStatus: "onboarding", onboardingStartedAt: now,
      payoutCurrency: cfg.currency, offeredAmount: cfg.monthlyAmount,
      adminNotes: `Self-service onboarding; owner consent and LinkedIn minimum-age confirmation (16, or older where local law requires) recorded ${now.toISOString()}. Login not yet confirmed.${input.hasGovernmentId ? " Owner confirmed they have a physical government ID." : " Owner did NOT confirm a physical government ID."}${input.nameMatchesId ? " Name confirmed to match their ID." : ""}${input.ownerPhotoUrl ? ` Owner photo: ${input.ownerPhotoUrl}` : ""}`,
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
  const proxy = reusableProxy(await availableProxies(tx), country);
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
  let proxyCountry = countryCode(s.account.proxyLocation);
  let orderId = s.proxyOrderId;
  if (!orderId) {
    if (s.state !== "reserved") throw new OnboardingError("The proxy purchase is running or needs a team check. Your progress is saved.", 409);
    const reused = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(69100901)`;
      return reuseProxy(tx, id, referrerId, country);
    });
    if (reused) return true;
    let quote;
    try {
      quote = PURCHASE_PROXY_COUNTRIES.includes(country as typeof PURCHASE_PROXY_COUNTRIES[number])
        ? await quoteStaticProxy(country)
        : await quoteCheapestStaticProxy();
      proxyCountry = quote.order.country;
    } catch (e) {
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
      await tx.linkedInAccount.update({ where: { id: s.accountId }, data: { proxyLocation: quote.order.country } });
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
  proxyCountry ||= PURCHASE_PROXY_COUNTRIES.includes(country as typeof PURCHASE_PROXY_COUNTRIES[number]) ? country : null;
  if (!proxyCountry || !PURCHASE_PROXY_COUNTRIES.includes(proxyCountry as typeof PURCHASE_PROXY_COUNTRIES[number])) {
    throw new OnboardingError("The proxy order country needs a team check.", 409);
  }
  let connection;
  try { connection = await readPurchasedProxy(orderId, proxyCountry); } catch {
    throw new OnboardingError("The purchased proxy is not ready to use. Refresh its delivery status or ask the team to check the saved order.", 502);
  }
  if (!connection) return false;
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(69100901)`;
    const current = await tx.selfServiceOnboarding.findUniqueOrThrow({ where: { id } });
    if (current.proxyId) return;
    const proxy = await tx.proxy.upsert({ where: { host_port: { host: connection.host, port: connection.port } },
      create: { ...connection, country: proxyCountry, type: "residential", provider: "proxy-cheap", status: "active", notes: `Dedicated static residential IPv4; order ${orderId}; auto-renew disabled.` },
      update: { ...connection, country: proxyCountry, type: "residential", provider: "proxy-cheap", status: "active" },
    });
    const [linked, reservations] = await Promise.all([
      tx.linkedInAccount.findMany({ where: { proxyHost: connection.host, proxyPort: connection.port }, select: { id: true } }),
      tx.selfServiceOnboarding.findMany({ where: { proxyId: proxy.id }, select: { accountId: true, proxySlot: true } }),
    ]);
    const used = new Set([...linked.map((account) => account.id), ...reservations.map((reservation) => reservation.accountId)]);
    if (used.size >= 2) throw new OnboardingError("The delivered proxy has reached its two-account limit. The team needs to check this order.", 409);
    const slot = [1, 2].find((candidate) => !reservations.some((reservation) => reservation.proxySlot === candidate));
    if (!slot) throw new OnboardingError("The delivered proxy has no available account slot. The team needs to check this order.", 409);
    await tx.linkedInAccount.update({ where: { id: s.accountId }, data: { proxyHost: connection.host, proxyPort: connection.port, proxyUsername: connection.username, proxyPassword: connection.password, proxyLocation: proxyCountry } });
    await tx.selfServiceOnboarding.update({ where: { id }, data: { proxyId: proxy.id, proxySlot: slot, state: "reserved" } });
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
  const s = await prisma.selfServiceOnboarding.findFirst({ where: { id, referrerId }, include: { account: true, emailSetup: true } });
  if (!s) throw new OnboardingError("Onboarding not found.", 404);
  if (["ready", "confirmed"].includes(s.state)) return;
  if (s.state === "creating") {
    throw new OnboardingError("Browser setup is still running or needs the team to check it. Your progress is saved; do not start a second signup.", 409);
  }
  let profileId = s.account.gologinProfileId;
  const issuedProfileName = s.emailSetup?.address || `onboarding-${id}`;
  if (s.state === "needs_help" && !profileId) {
    // A timed-out create can succeed upstream before our database receives the id.
    // Recover that exact named profile first; only create again when GoLogin confirms
    // that no such profile exists.
    const recovered = await findProfileByName(issuedProfileName, token);
    if (recovered) {
      await prisma.$transaction([
        prisma.linkedInAccount.update({ where: { id: s.accountId }, data: { gologinProfileId: recovered.id } }),
        prisma.selfServiceOnboarding.update({ where: { id }, data: { state: "link_pending" } }),
      ]);
      profileId = recovered.id;
    } else {
      await prisma.selfServiceOnboarding.update({ where: { id }, data: { state: "reserved" } });
    }
  }
  const claim = await prisma.selfServiceOnboarding.updateMany({ where: { id, referrerId, state: { in: ["reserved", "link_pending"] } }, data: { state: "creating" } });
  if (!claim.count) throw new OnboardingError("Setup is already in progress. Refresh to check it.", 409);
  // New profiles use the immutable issued address. Existing profiles retain their
  // real upstream name when recreating a share link (including legacy names).
  let profileName: string | undefined;
  try {
    if (!profileId) {
      profileName = issuedProfileName;
      const profile = await createProfile({
        name: profileName,
        proxy: { host: s.account.proxyHost!, port: s.account.proxyPort!, username: s.account.proxyUsername || undefined, password: s.account.proxyPassword || undefined },
      }, token);
      if (!profile || typeof profile.id !== "string") throw new Error("Missing profile id");
      // Persist before attempting the share link, so link retries reuse the profile.
      await prisma.linkedInAccount.update({ where: { id: s.accountId }, data: { gologinProfileId: profile.id } });
      profileId = profile.id;
    }
    const link = await getPublicShareLink(profileId!, profileName, token) || await createPublicShareLink(profileId!, profileName, token);
    await prisma.$transaction([
      prisma.linkedInAccount.update({ where: { id: s.accountId }, data: { gologinShareLink: link.publicUrl } }),
      prisma.selfServiceOnboarding.update({ where: { id }, data: { state: "ready" } }),
    ]);
  } catch (error) {
    console.error("Self-service GoLogin setup failed", {
      sessionId: id,
      phase: profileId ? "share-link" : "profile-create",
      message: error instanceof Error ? error.message.replace(/Bearer\s+\S+/gi, "Bearer [redacted]").slice(0, 500) : "Unknown error",
    });
    // A timed-out create may have succeeded upstream. Never blindly create twice.
    await prisma.selfServiceOnboarding.update({ where: { id }, data: { state: profileId ? "link_pending" : "needs_help" } });
    throw new OnboardingError(profileId ? "Your browser is saved, but its launch link is not ready. Please retry." : "The browser could not be prepared. Please try again.", 502);
  }
}

export async function confirmOnboarding(id: string, referrerId: string, creds?: { password?: string; twoFactorKey?: string }) {
  await requireEmailSetup(id, referrerId);
  // The PC flow also captures the login here so LinkedVelocity always holds the
  // credentials (same as the phone hand-off) instead of only a signed-in session.
  const hasPassword = !!creds?.password;
  const has2fa = !!creds?.twoFactorKey;
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
      adminNotes: `Self-service login confirmed by referrer at ${s.confirmedAt!.toISOString()}. Verify login, clear account issue, and confirm ok to pay after review.${hasPassword ? " Password saved." : " Password NOT captured."}${has2fa ? " 2FA key saved." : ""}`,
    } });
    // Keep inventory unlisted and in construction until the usual admin review.
    await tx.linkedInAccount.update({ where: { id: s.accountId }, data: {
      ...(hasPassword ? { accountPassword: encryptSecret(creds!.password!) } : {}),
      ...(has2fa ? { twoFactor: encryptSecret(creds!.twoFactorKey!) } : {}),
      notes: `${acc.notes || ""}\nLogin reported successful ${s.confirmedAt!.toISOString()}; awaiting team verification.${hasPassword ? " Password saved." : ""}${has2fa ? " 2FA key saved." : ""}`,
    } });
  });
}

// Phone hand-off: the referrer has no PC, so LinkedVelocity does the GoLogin sign-in.
// The owner normally already supplied the login in their intake form, so credentials
// are optional here; if any are passed (older client) we still store them.
export async function handoffOnboarding(id: string, referrerId: string, input?: { password?: string; twoFactorKey?: string }) {
  const s = await prisma.selfServiceOnboarding.findFirst({ where: { id, referrerId }, include: { account: true, application: true } });
  if (!s) throw new OnboardingError("Onboarding not found.", 404);
  if (s.state === "confirmed") throw new OnboardingError("This onboarding is already complete.", 409);
  const now = new Date();
  const hasPassword = !!input?.password;
  const has2fa = !!input?.twoFactorKey;
  await prisma.$transaction(async (tx) => {
    await tx.linkedInAccount.update({ where: { id: s.accountId }, data: {
      ...(hasPassword ? { accountPassword: encryptSecret(input!.password!) } : {}),
      ...(has2fa ? { twoFactor: encryptSecret(input!.twoFactorKey!) } : {}),
      notes: `${s.account.notes || ""}\nPHONE HAND-OFF ${now.toISOString()}: referrer has no PC. LV to create the proxy + GoLogin profile and sign in with the login the owner provided.`,
    } });
    // Distinct from "needs_help" (a failed browser prep) so the admin can tell a
    // phone hand-off awaiting our sign-in apart from a prep that needs a retry.
    await tx.selfServiceOnboarding.update({ where: { id }, data: { state: "handed_off" } });
    await tx.ambassadorApplication.update({ where: { id: s.applicationId }, data: {
      adminNotes: `${s.application.adminNotes || ""}\nPHONE HAND-OFF ${now.toISOString()}: owner on a phone. LV to complete the GoLogin sign-in using the login the owner supplied.`,
    } });
  });
}
