import { z } from "zod";

// Official REST v2 ordering flow: https://docs.proxy-cheap.com/
const BASE = "https://api.proxy-cheap.com";
const SERVICE = "static-residential-ipv4";
const PLAN = "standard"; // Dedicated (not Basic/shared).
export const MAX_PROXY_PRICE_USD = 4;
export class ProxyPurchaseNotSubmitted extends Error {}

export function proxyPurchaseLimits() {
  const perProxy = Math.min(MAX_PROXY_PRICE_USD, Number(process.env.PROXY_CHEAP_MAX_PER_PROXY_USD || MAX_PROXY_PRICE_USD));
  const monthly = process.env.PROXY_CHEAP_MONTHLY_BUDGET_USD ? Number(process.env.PROXY_CHEAP_MONTHLY_BUDGET_USD) : null;
  return { perProxy, monthly, enabled: process.env.PROXY_CHEAP_AUTO_BUY === "true" &&
    !!process.env.PROXY_CHEAP_API_KEY && !!process.env.PROXY_CHEAP_API_SECRET &&
    Number.isFinite(perProxy) && perProxy > 0 && (monthly === null || (Number.isFinite(monthly) && monthly > 0)) };
}

async function api(path: string, body?: unknown, authenticated = false): Promise<unknown> {
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (authenticated) {
    if (!process.env.PROXY_CHEAP_API_KEY || !process.env.PROXY_CHEAP_API_SECRET) throw new Error("Proxy-Cheap credentials are missing.");
    headers["X-Api-Key"] = process.env.PROXY_CHEAP_API_KEY;
    headers["X-Api-Secret"] = process.env.PROXY_CHEAP_API_SECRET;
  }
  const res = await fetch(`${BASE}${path}`, { method: body ? "POST" : "GET", headers,
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000), cache: "no-store" });
  if (!res.ok) throw new Error(`Proxy-Cheap request failed (${res.status}).`);
  return res.json();
}

export async function quoteStaticProxy(country: string) {
  const limits = proxyPurchaseLimits();
  if (!limits.enabled) throw new Error("Automatic proxy purchasing is not enabled. Ask the team to prepare a proxy.");
  const catalog = z.object({ services: z.array(z.object({ id: z.string(), plans: z.array(z.object({ id: z.string(), label: z.string() })).optional() })) }).parse(await api("/v2/order"));
  if (!catalog.services.find((s) => s.id === SERVICE)?.plans?.some((p) => p.id === PLAN && p.label.toLowerCase() === "dedicated")) {
    throw new Error("Dedicated static residential proxies are unavailable.");
  }
  const setup = z.object({ countries: z.array(z.string()), periods: z.object({ months: z.array(z.number()) }), isps: z.record(z.string(), z.array(z.object({ id: z.string(), label: z.string() }))).optional() })
    .parse(await api(`/v2/order/${SERVICE}`, { planId: PLAN }));
  if (!setup.countries.includes(country) || !setup.periods.months.includes(1)) throw new Error("No one-month dedicated static residential proxy is available in this country. Ask the team for help.");
  const ispId = setup.isps?.[country]?.[0]?.id;
  const order = { planId: PLAN, quantity: 1, country, ...(ispId ? { ispId } : {}), period: { unit: "months", value: 1 }, autoExtend: { isEnabled: false } };
  const quote = z.object({ finalPrice: z.number().finite().positive(), currency: z.literal("USD") }).parse(await api(`/v2/order/${SERVICE}/price`, order, true));
  if (quote.finalPrice > limits.perProxy) throw new Error(`The matching proxy costs more than US$${limits.perProxy.toFixed(2)}. Setup is paused; no proxy was purchased.`);
  return { order, price: quote.finalPrice };
}

export async function purchaseStaticProxy(quote: Awaited<ReturnType<typeof quoteStaticProxy>>) {
  const limits = proxyPurchaseLimits();
  if (!limits.enabled || quote.price > limits.perProxy) throw new ProxyPurchaseNotSubmitted("Proxy purchasing is disabled or exceeds the price limit.");
  // Recheck immediately before charging: a stale quote must not authorize a higher price.
  try {
    const current = z.object({ finalPrice: z.number().finite().positive(), currency: z.literal("USD") })
      .parse(await api(`/v2/order/${SERVICE}/price`, quote.order, true));
    if (current.finalPrice > limits.perProxy || current.finalPrice > quote.price) throw new Error("Price changed");
  } catch {
    throw new ProxyPurchaseNotSubmitted("The proxy price changed or could not be checked. No purchase was submitted. Please retry.");
  }
  // Do not retry execute: the provider does not document an idempotency key.
  return z.object({ id: z.string().min(1), totalPrice: z.coerce.number().finite().positive() }).parse(await api(`/v2/order/${SERVICE}/execute`, quote.order, true));
}

const purchasedProxy = z.object({
  id: z.union([z.number(), z.string()]), status: z.string(), networkType: z.literal("RESIDENTIAL_STATIC"),
  countryCode: z.string(), autoExtendEnabled: z.boolean(),
  authentication: z.object({ username: z.string().min(1), password: z.string().min(1) }),
  connection: z.object({ publicIp: z.ipv4(), connectIp: z.string().min(1), httpPort: z.number().int().min(1).max(65535) }),
});

export async function readPurchasedProxy(orderId: string, country: string) {
  const list = z.array(z.object({ id: z.union([z.number(), z.string()]), status: z.string() })).parse(await api(`/orders/${encodeURIComponent(orderId)}/proxies`, undefined, true));
  if (!list.length || list.some((p) => ["PENDING", "INITIATING"].includes(p.status))) return null;
  if (list.length !== 1) throw new Error("Unexpected proxy order size. A team check is needed.");
  const p = purchasedProxy.parse(await api(`/proxies/${encodeURIComponent(String(list[0].id))}`, undefined, true));
  if (p.status !== "ACTIVE" || p.countryCode.toUpperCase() !== country || p.autoExtendEnabled) throw new Error("The purchased proxy needs a team check before use.");
  return { host: p.connection.connectIp, port: p.connection.httpPort, username: p.authentication.username, password: p.authentication.password };
}
