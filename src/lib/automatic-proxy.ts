import { prisma } from "@/lib/prisma";
import { acquireProxy, availableProxies } from "@/lib/self-service-onboarding";
import { quoteCheapestStaticProxy, purchaseStaticProxy, readPurchasedProxy, proxyPurchaseLimits, ProxyPurchaseNotSubmitted } from "@/services/proxy-cheap";

type Attempt = { state: string; amount: number; country: string; order_id: string | null };
export async function assignAutomaticProxy(accountId: string) {
  const session = await prisma.selfServiceOnboarding.findUnique({ where: { accountId } });
  if (session) {
    if (!await acquireProxy(session.id, session.referrerId)) throw new Error("Proxy order is pending delivery. Retry to check delivery; no duplicate purchase will be made.");
    return prisma.linkedInAccount.findUniqueOrThrow({ where: { id: accountId } });
  }
  const reused = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(69100901)`;
    const account = await tx.linkedInAccount.findUniqueOrThrow({ where: { id: accountId } });
    if (account.proxyHost && account.proxyPort) return account;
    const attempt = await tx.$queryRaw<Attempt[]>`SELECT * FROM proxy_purchase_attempts WHERE account_id=${accountId}::uuid`;
    if (attempt.length) return null;
    const pool = await availableProxies(tx);
    const picked = pool.find(p => p.country === account.proxyLocation) || pool[0];
    if (!picked) return null;
    return tx.linkedInAccount.update({ where: { id: accountId }, data: { proxyHost: picked.host, proxyPort: picked.port, proxyUsername: picked.username, proxyPassword: picked.password, proxyLocation: picked.country, provisionStatus: null } });
  }, { timeout: 15000 });
  if (reused) return reused;
  let [attempt] = await prisma.$queryRaw<Attempt[]>`SELECT * FROM proxy_purchase_attempts WHERE account_id=${accountId}::uuid`;
  if (!attempt) {
    const quote = await quoteCheapestStaticProxy();
    await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(69100901)`;
      const existing = await tx.$queryRaw<Attempt[]>`SELECT * FROM proxy_purchase_attempts WHERE account_id=${accountId}::uuid`;
      if (existing.length) throw new Error("Proxy purchase already in progress. Retry to check its status.");
      const month = new Date(); month.setUTCDate(1); month.setUTCHours(0,0,0,0);
      const legacy = await tx.selfServiceOnboarding.aggregate({ where: { OR: [{ proxyPurchaseAt: { gte: month } }, { state: { in: ["purchasing", "purchase_unknown", "proxy_pending"] }, proxyBudgetReserved: { not: null } }] }, _sum: { proxyBudgetReserved: true } });
      const totals = await tx.$queryRaw<Array<{ total: number }>>`SELECT COALESCE(SUM(amount),0)::float AS total FROM proxy_purchase_attempts WHERE created_at>=${month} OR state IN ('purchasing','unknown','pending')`;
      if (Number(legacy._sum.proxyBudgetReserved || 0) + Number(totals[0]?.total || 0) + quote.price > proxyPurchaseLimits().monthly) throw new Error("The US$100 monthly proxy purchase budget has been reached.");
      await tx.$executeRaw`INSERT INTO proxy_purchase_attempts(account_id,state,amount,country) VALUES (${accountId}::uuid,'purchasing',${quote.price},${quote.order.country})`;
    });
    try {
      const order = await purchaseStaticProxy(quote);
      await prisma.$executeRaw`UPDATE proxy_purchase_attempts SET state='pending',order_id=${order.id},amount=${order.totalPrice} WHERE account_id=${accountId}::uuid`;
    } catch (error) {
      if (error instanceof ProxyPurchaseNotSubmitted) await prisma.$executeRaw`DELETE FROM proxy_purchase_attempts WHERE account_id=${accountId}::uuid AND state='purchasing'`;
      else await prisma.$executeRaw`UPDATE proxy_purchase_attempts SET state='unknown' WHERE account_id=${accountId}::uuid`;
      throw error;
    }
    [attempt] = await prisma.$queryRaw<Attempt[]>`SELECT * FROM proxy_purchase_attempts WHERE account_id=${accountId}::uuid`;
  }
  if (!attempt.order_id) throw new Error("A proxy purchase is running or needs review. No duplicate purchase will be attempted.");
  const connection = await readPurchasedProxy(attempt.order_id, attempt.country);
  if (!connection) throw new Error("Proxy purchased; awaiting delivery. Retry to check delivery.");
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(69100901)`;
    const used = await tx.linkedInAccount.count({ where: { id: { not: accountId }, status: { not: "removed" }, proxyHost: connection.host, proxyPort: connection.port } });
    if (used >= 4) throw new Error("Delivered proxy is already at its four-account limit.");
    await tx.proxy.upsert({ where: { host_port: { host: connection.host, port: connection.port } }, create: { ...connection, country: attempt.country, provider: "proxy-cheap", type: "residential", status: "active" }, update: { ...connection, country: attempt.country, status: "active" } });
    const account = await tx.linkedInAccount.update({ where: { id: accountId }, data: { proxyHost: connection.host, proxyPort: connection.port, proxyUsername: connection.username, proxyPassword: connection.password, proxyLocation: attempt.country, provisionStatus: null } });
    await tx.$executeRaw`UPDATE proxy_purchase_attempts SET state='complete' WHERE account_id=${accountId}::uuid`;
    return account;
  });
}
