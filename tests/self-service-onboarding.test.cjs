const { test } = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const fs = require("node:fs");
const path = require("node:path");

// Run the TS modules with isolated dependencies, without touching Neon or a provider.
function load(file, mocks = {}) {
  const filename = path.resolve(__dirname, "..", file);
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const localRequire = (name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith("@/")) return load(`src/${name.slice(2)}.ts`, mocks);
    return require(name);
  };
  new Function("require", "module", "exports", output)(localRequire, module, module.exports);
  return module.exports;
}

test("normalizes profile URL and rejects non-profile/foreign URLs", () => {
  const { canonicalLinkedinUrl } = load("src/lib/self-service-input.ts");
  assert.equal(canonicalLinkedinUrl("https://linkedin.com/in/Alex/?trk=ref"), "https://www.linkedin.com/in/alex");
  for (const url of ["https://linkedin.com.evil.test/in/alex", "https://linkedin.com/company/test", "http://linkedin.com/in/alex", "https://user:pass@linkedin.com/in/alex"]) assert.throws(() => canonicalLinkedinUrl(url));
});

test("consent and payout identity are mandatory", () => {
  const { selfServiceInput } = load("src/lib/self-service-input.ts");
  const valid = { fullName: "Alex Test", email: "ALEX@example.test", linkedinUrl: "https://linkedin.com/in/alex", country: "PH", contactNumber: "+639123456789", accountFreshness: "fresh", paymentMethod: "GCash", paymentDetails: "09123456789", payoutName: "Alex Test", consent: true };
  assert.equal(selfServiceInput.parse(valid).email, "alex@example.test");
  assert.equal(selfServiceInput.safeParse({ ...valid, consent: false }).success, false);
  assert.equal(selfServiceInput.safeParse({ ...valid, payoutName: "" }).success, false);
});

test("country matching handles existing names and country codes", () => {
  const { countryCode } = load("src/lib/countries.ts");
  assert.equal(countryCode("Philippines"), "PH");
  assert.equal(countryCode("US"), "US");
  assert.equal(countryCode("United States · New York"), "US");
  assert.equal(countryCode("UK"), "GB");
  assert.equal(countryCode("Unassigned"), null);
});

test("Proxy-Cheap quotes require a matching country and respect the price ceiling", async () => {
  const previous = { ...process.env };
  const originalFetch = global.fetch;
  Object.assign(process.env, { PROXY_CHEAP_AUTO_BUY: "true", PROXY_CHEAP_API_KEY: "test", PROXY_CHEAP_API_SECRET: "test", PROXY_CHEAP_MAX_PER_PROXY_USD: "5", PROXY_CHEAP_MONTHLY_BUDGET_USD: "50" });
  const calls = [];
  let price = 2.5;
  global.fetch = async (url, init) => {
    calls.push({ url, body: init.body ? JSON.parse(init.body) : null });
    const body = url.endsWith("/price") ? { finalPrice: price, currency: "USD" } : url.endsWith("/v2/order") ? { services: [{ id: "static-residential-ipv4", plans: [{ id: "standard", label: "Dedicated" }] }] } : { countries: ["PH"], periods: { months: [1] }, isps: { PH: [{ id: "test-isp", label: "Test ISP" }] } };
    return { ok: true, json: async () => body };
  };
  try {
    const api = load("src/services/proxy-cheap.ts");
    const quote = await api.quoteStaticProxy("PH");
    assert.equal(quote.order.country, "PH");
    assert.equal(quote.order.planId, "standard");
    assert.equal(quote.order.autoExtend.isEnabled, false);
    assert.equal(quote.order.quantity, 1);
    assert.equal(api.proxyPurchaseLimits().perProxy, 4, "a higher environment value cannot raise the approved cap");
    delete process.env.PROXY_CHEAP_MONTHLY_BUDGET_USD;
    assert.equal(api.proxyPurchaseLimits().enabled, true);
    assert.equal(api.proxyPurchaseLimits().monthly, null);
    await assert.rejects(api.quoteStaticProxy("DE"), /country/);
    price = 4;
    assert.equal((await api.quoteStaticProxy("PH")).price, 4);
    await assert.rejects(api.purchaseStaticProxy(quote), /price changed/);
    price = 4.01;
    await assert.rejects(api.quoteStaticProxy("PH"), /more than US\$4.00/);
    assert.equal(calls.some((c) => c.url.endsWith("/execute")), false);
    process.env.PROXY_CHEAP_AUTO_BUY = "false";
    await assert.rejects(api.purchaseStaticProxy(quote), /disabled/);
  } finally { global.fetch = originalFetch; for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key]; Object.assign(process.env, previous); }
});

function service(prisma, provider = {}) {
  return load("src/lib/self-service-onboarding.ts", {
    "@/lib/prisma": { prisma }, "@/lib/payment-schedule": { setupDueDate: () => null },
    "@/services/gologin": { createProfile: () => { throw new Error("Unexpected profile creation"); } },
    "@/services/proxy-cheap": provider,
  });
}

test("a different referrer cannot provision a saved session", async () => {
  const prev = process.env.GOLOGIN_API_TOKEN_KLABBER;
  process.env.GOLOGIN_API_TOKEN_KLABBER = "test";
  try {
    const api = service({ selfServiceOnboarding: { findFirst: async () => null } });
    await assert.rejects(api.prepareOnboarding("session", "other-referrer"), /not found/);
  } finally { if (prev === undefined) delete process.env.GOLOGIN_API_TOKEN_KLABBER; else process.env.GOLOGIN_API_TOKEN_KLABBER = prev; }
});

test("login confirmation cannot finish before browser opening", async () => {
  const tx = { selfServiceOnboarding: { updateMany: async () => ({ count: 0 }), findFirst: async () => ({ state: "ready" }) } };
  const api = service({ $transaction: async (fn) => fn(tx) });
  await assert.rejects(api.confirmOnboarding("session", "referrer"), /Open the prepared browser/);
});

test("repeat confirmation does not reset dates or release payment", async () => {
  const tx = { selfServiceOnboarding: { updateMany: async () => ({ count: 0 }), findFirst: async () => ({ state: "confirmed" }) } };
  await service({ $transaction: async (fn) => fn(tx) }).confirmOnboarding("session", "referrer");
});

test("confirmation records onboarding but leaves payout verification gated", async () => {
  let application;
  const tx = {
    selfServiceOnboarding: { updateMany: async () => ({ count: 1 }), findFirst: async () => ({ state: "confirmed", applicationId: "app", accountId: "acc", confirmedAt: new Date("2026-09-09T10:00:00Z") }) },
    linkedInAccount: { findUniqueOrThrow: async () => ({ status: "under_construction", gologinProfileId: "profile", gologinShareLink: "https://g.camp/share/test", restrictedAt: null }), update: async () => ({}) },
    ambassadorApplication: { update: async ({ data }) => { application = data; } },
  };
  await service({ $transaction: async (fn) => fn(tx) }).confirmOnboarding("session", "referrer");
  assert.equal(application.status, "onboarded");
  assert.match(application.accountIssue, /verification/);
  assert.equal(application.verifiedAt, undefined);
});

test("monthly budget exhaustion prevents execute", async () => {
  const prev = process.env.GOLOGIN_API_TOKEN_KLABBER;
  process.env.GOLOGIN_API_TOKEN_KLABBER = "test";
  let purchases = 0;
  const tx = { $executeRaw: async () => {}, proxy: { findMany: async () => [] }, linkedInAccount: { findMany: async () => [] }, selfServiceOnboarding: { findFirstOrThrow: async () => ({ state: "reserved" }), findMany: async () => [], aggregate: async () => ({ _sum: { proxyBudgetReserved: 49 } }) } };
  const prisma = { $transaction: async (fn) => fn(tx), selfServiceOnboarding: { findFirst: async () => ({ id: "session" }), findFirstOrThrow: async () => ({ state: "reserved", account: { location: "PH" } }) } };
  const provider = { quoteStaticProxy: async () => ({ price: 4 }), proxyPurchaseLimits: () => ({ monthly: 50 }), purchaseStaticProxy: async () => { purchases++; } };
  try { await assert.rejects(service(prisma, provider).prepareOnboarding("session", "referrer"), /budget/); assert.equal(purchases, 0); }
  finally { if (prev === undefined) delete process.env.GOLOGIN_API_TOKEN_KLABBER; else process.env.GOLOGIN_API_TOKEN_KLABBER = prev; }
});

test("uncertain purchase is never retried", async () => {
  const prev = process.env.GOLOGIN_API_TOKEN_KLABBER;
  process.env.GOLOGIN_API_TOKEN_KLABBER = "test";
  const prisma = { selfServiceOnboarding: { findFirst: async () => ({ id: "session" }), findFirstOrThrow: async () => ({ state: "purchase_unknown", account: { location: "PH" } }) } };
  try { await assert.rejects(service(prisma).prepareOnboarding("session", "referrer"), /team check/); }
  finally { if (prev === undefined) delete process.env.GOLOGIN_API_TOKEN_KLABBER; else process.env.GOLOGIN_API_TOKEN_KLABBER = prev; }
});

test("residential proxies accept zero or one account, but never a third", () => {
  const { availableProxySlots } = load("src/lib/onboarding-proxy-pool.ts");
  const proxy = { id: "p", host: "proxy.test", port: 8000, username: "test", password: "test", country: "Philippines", type: "residential", status: "active" };
  const account = (id) => ({ id, proxyHost: proxy.host, proxyPort: proxy.port, proxyUsername: null, proxyPassword: null, proxyLocation: "PH" });
  assert.equal(availableProxySlots([proxy], [], []).length, 1);
  assert.equal(availableProxySlots([proxy], [account("a")], []).length, 1);
  assert.equal(availableProxySlots([proxy], [account("a"), account("b")], []).length, 0);
  assert.equal(availableProxySlots([{ ...proxy, status: "error" }], [], []).length, 0);
  assert.equal(availableProxySlots([{ ...proxy, type: "datacenter" }], [], []).length, 0);
});

test("reservations are deduplicated against inventory and still reserve capacity if inventory moves", () => {
  const { availableProxySlots } = load("src/lib/onboarding-proxy-pool.ts");
  const proxy = { id: "p", host: "proxy.test", port: 8000, username: "test", password: "test", country: "PH", type: "residential", status: "active" };
  const account = { id: "a", proxyHost: proxy.host, proxyPort: proxy.port };
  const slots = availableProxySlots([proxy], [account], [{ accountId: "a", proxyId: "p", proxySlot: 1 }]);
  assert.equal(slots[0].used, 1);
  assert.equal(slots[0].slot, 2);
  assert.equal(availableProxySlots([proxy], [account], [{ accountId: "other", proxyId: "p", proxySlot: 1 }]).length, 0);
});

test("existing account credentials can supply a reusable proxy", () => {
  const { availableProxySlots } = load("src/lib/onboarding-proxy-pool.ts");
  const proxy = { id: "p", host: "proxy.test", port: 8000, username: null, password: null, country: null, type: "residential", status: "active" };
  const account = { id: "a", proxyHost: proxy.host, proxyPort: proxy.port, proxyUsername: "test", proxyPassword: "test", proxyLocation: "Philippines" };
  const slots = availableProxySlots([proxy], [account], []);
  assert.equal(slots[0].country, "PH");
  assert.equal(slots[0].username, "test");
  assert.equal(availableProxySlots([proxy], [], []).length, 0);
});

test("an available matching second slot is reused before any purchase quote", async () => {
  const prev = process.env.GOLOGIN_API_TOKEN_KLABBER;
  process.env.GOLOGIN_API_TOKEN_KLABBER = "test";
  let reserved = false;
  const s = { id: "s", state: "reserved", accountId: "new", account: { location: "PH" } };
  const tx = {
    $executeRaw: async () => {},
    proxy: { findMany: async () => [{ id: "p", host: "proxy.test", port: 8000, username: "test", password: "test", country: "PH", type: "residential", status: "active" }] },
    linkedInAccount: { findMany: async () => [{ id: "existing", proxyHost: "proxy.test", proxyPort: 8000 }], update: async () => {} },
    selfServiceOnboarding: { findFirstOrThrow: async () => s, findMany: async () => [], update: async ({ data }) => { reserved = data.proxyId === "p"; } },
  };
  const prisma = { $transaction: async (fn) => fn(tx), selfServiceOnboarding: {
    findFirst: async () => reserved ? { ...s, state: "ready" } : s,
    findFirstOrThrow: async () => s,
  } };
  try { await service(prisma, { quoteStaticProxy: () => { throw new Error("Must not quote when capacity exists"); } }).prepareOnboarding("s", "referrer"); assert.equal(reserved, true); }
  finally { if (prev === undefined) delete process.env.GOLOGIN_API_TOKEN_KLABBER; else process.env.GOLOGIN_API_TOKEN_KLABBER = prev; }
});
