const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
function load(file, mocks = {}) {
  const output = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', output)(name => Object.hasOwn(mocks, name) ? mocks[name] : name.startsWith('@/') ? load(`src/${name.slice(2)}.ts`, mocks) : require(name), module, module.exports);
  return module.exports;
}
const policy = load('src/lib/onboarding-email-policy.ts');
function configure() {
  Object.assign(process.env, { ONBOARDING_EMAIL_ENABLED: 'true', ONBOARDING_EMAIL_DOMAINS: 'example.test', ONBOARDING_EMAIL_CODE_SECRET: 'test-secret', RESEND_API_KEY: 'test', RESEND_FROM_EMAIL: 'service@example.test', RESEND_INBOUND_WEBHOOK_SECRET: 'test' });
}
const id = '32f83cf4-d035-4d6d-a050-c20ac0ff3b52';
const now = new Date();
const setup = () => ({ sessionId: id, address: 'alex.test@example.test', destination: 'helper@inbox.test', consentAt: now, destinationVerifiedAt: new Date(now.getTime() - 60000), forwardingUntil: new Date(now.getTime() + 3600000), session: { state: 'reserved', referrer: { active: true } } });

test('onboarding sender override does not change other application mail', () => {
  const env = { ...process.env };
  try {
    process.env.RESEND_FROM_EMAIL = 'old@example.test';
    process.env.ONBOARDING_EMAIL_FROM = 'LinkedVelocity <info@linkedvelocity.com>';
    assert.equal(policy.onboardingEmailFrom(), 'LinkedVelocity <info@linkedvelocity.com>');
    assert.equal(process.env.RESEND_FROM_EMAIL, 'old@example.test');
  } finally { process.env = env; }
});

test('email feature defaults off and requires all receiving configuration', () => {
  const env = { ...process.env };
  try {
    delete process.env.ONBOARDING_EMAIL_ENABLED;
    assert.equal(policy.emailSetupConfig().enabled, false);
    configure();
    assert.equal(policy.emailSetupConfig().ready, true);
    delete process.env.RESEND_INBOUND_WEBHOOK_SECRET;
    assert.equal(policy.emailSetupConfig().ready, false);
  } finally { process.env = env; }
});
test('addresses use readable first.last with a suffix only for collisions', () => {
  assert.equal(policy.assignedEmail('José Smith', 'example.test'), 'jose.smith@example.test');
  assert.equal(policy.assignedEmail('José Smith', 'example.test', 1), 'jose.smith2@example.test');
  assert.equal(policy.assignedEmail('José Middle Smith', 'example.test', 2), 'jose.smith3@example.test');
  assert.equal(policy.assignedEmail('李', 'example.test'), 'account@example.test');
});

test('allocator rotates across domains and resolves collisions without changing domain', async () => {
  const api = load('src/lib/onboarding-email.ts', { '@/lib/prisma': { prisma: {} } });
  let count = 0;
  const occupied = new Set();
  const tx = {
    onboardingEmailSetup: { count: async () => count, findUnique: async ({ where }) => occupied.has(where.address) ? { sessionId: id } : null },
    linkedInAccount: { findFirst: async () => null }, ambassadorApplication: { findFirst: async () => null },
  };
  const domains = ['one.test', 'two.test', 'three.test'];
  const results = [];
  for (let i = 0; i < 6; i++) {
    const address = await api.allocateOnboardingAddress(tx, 'Alex Test', domains);
    occupied.add(address); count++; results.push(address);
  }
  assert.deepEqual(results, ['alex.test@one.test', 'alex.test@two.test', 'alex.test@three.test', 'alex.test2@one.test', 'alex.test2@two.test', 'alex.test2@three.test']);
});

test('allocator avoids addresses already present on inventory or applications', async () => {
  const api = load('src/lib/onboarding-email.ts', { '@/lib/prisma': { prisma: {} } });
  const tx = {
    onboardingEmailSetup: { count: async () => 0, findUnique: async () => null },
    linkedInAccount: { findFirst: async ({ where }) => where.OR[0].loginEmail.equals === 'alex.test@one.test' ? { id } : null },
    ambassadorApplication: { findFirst: async ({ where }) => where.OR[0].linkedinEmail.equals === 'alex.test2@one.test' ? { id } : null },
  };
  assert.equal(await api.allocateOnboardingAddress(tx, 'Alex Test', ['one.test']), 'alex.test3@one.test');
});

test('client cannot select a domain; verification retries preserve the assigned address', async () => {
  configure();
  const prior = { ...setup(), address: 'old.address@example.test', codeSends: 1 };
  let saved;
  const tx = { $executeRaw: async () => {}, onboardingEmailSetup: {
    findUnique: async () => prior,
    count: async (args) => { assert.ok(args, 'retry must not consume a round-robin turn'); return 0; },
    upsert: async (args) => { saved = args; return { ...prior, codeSends: 2 }; },
  } };
  const db = { selfServiceOnboarding: { findFirst: async () => ({ state: 'reserved', application: { fullName: 'Alex Test' } }) }, $transaction: async fn => fn(tx) };
  const api = load('src/lib/onboarding-email.ts', { '@/lib/prisma': { prisma: db }, '@/services/onboarding-mail': { onboardingMailRequest: async () => ({ id: 'sent' }) } });
  const input = api.emailAction.parse({ action: 'start', destination: prior.destination, consent: true, domain: 'attacker.test' });
  assert.equal(input.domain, undefined);
  await api.updateEmailSetup(id, 'owner', input);
  assert.equal(saved.create.address, prior.address);
  assert.equal(saved.update.address, undefined);
});
test('forwarding requires verified destination and stops on expiry or completion', () => {
  const e = setup();
  assert.equal(policy.forwardingActive(e, 'reserved'), true);
  assert.equal(policy.forwardingActive(e, 'confirmed'), false);
  assert.equal(policy.forwardingActive({ ...e, destinationVerifiedAt: null }, 'ready'), false);
  assert.equal(policy.forwardingActive({ ...e, forwardingUntil: new Date(0) }, 'ready'), false);
});
test('sender filter rejects lookalike domains; HTML conversion preserves LinkedIn verification links only', () => {
  assert.equal(policy.linkedinSender('LinkedIn <security-noreply@linkedin.com>'), true);
  assert.equal(policy.linkedinSender('security@linkedin.com.evil.test'), false);
  assert.equal(policy.linkedinSender('linkedin.com@evil.test'), false);
  const text = policy.forwardedText(null, '<script>bad()</script><a href="https://www.linkedin.com/verify?a=1&amp;b=2">Verify</a><a href="https://evil.test">Bad</a>');
  assert.match(text, /https:\/\/www.linkedin.com\/verify\?a=1&b=2/);
  assert.doesNotMatch(text, /bad\(\)|evil.test|<a/);
});
test('foreign referrers cannot start email setup', async () => {
  configure();
  const api = load('src/lib/onboarding-email.ts', { '@/lib/prisma': { prisma: { selfServiceOnboarding: { findFirst: async () => null } } } });
  await assert.rejects(api.updateEmailSetup(id, 'foreign', { action: 'start', domain: 'example.test', destination: 'x@inbox.test', consent: true }), /cannot be changed/);
});
test('consent is required and malformed verification codes are rejected', () => {
  const api = load('src/lib/onboarding-email.ts', { '@/lib/prisma': { prisma: {} } });
  assert.equal(api.emailAction.safeParse({ action: 'start', domain: 'example.test', destination: 'x@inbox.test', consent: false }).success, false);
  assert.equal(api.emailAction.safeParse({ action: 'primary', consent: false }).success, false);
  assert.equal(api.emailAction.safeParse({ action: 'verify', code: '0000000' }).success, false);
});
test('wrong code increments attempt counter without rolling back', async () => {
  configure();
  let attempts = 0;
  const tx = { $executeRaw: async () => {}, onboardingEmailSetup: { findUnique: async () => ({ codeHash: 'wrong', destination: 'x@inbox.test', codeExpiresAt: new Date(Date.now() + 10000), codeAttempts: attempts }), update: async () => { attempts++; } } };
  const db = { selfServiceOnboarding: { findFirst: async () => ({ state: 'reserved' }) }, $transaction: async fn => fn(tx) };
  const api = load('src/lib/onboarding-email.ts', { '@/lib/prisma': { prisma: db } });
  await assert.rejects(api.updateEmailSetup(id, 'owner', { action: 'verify', code: '123456' }), /Incorrect/);
  assert.equal(attempts, 1);
});
test('primary confirmation cannot bypass receiving and verifying inbox', async () => {
  configure();
  const e = setup();
  const db = { selfServiceOnboarding: { findFirst: async () => ({ state: 'reserved' }) }, $transaction: async fn => fn({ onboardingEmailSetup: { findUnique: async () => e } }) };
  const api = load('src/lib/onboarding-email.ts', { '@/lib/prisma': { prisma: db } });
  await assert.rejects(api.updateEmailSetup(id, 'owner', { action: 'primary', consent: true }), /receive the LinkedIn message/);
});
test('email gate blocks direct GoLogin calls until primary confirmation', async () => {
  configure();
  const db = { selfServiceOnboarding: { findFirst: async () => ({ state: 'reserved', emailSetup: null }) } };
  const api = load('src/lib/onboarding-email.ts', { '@/lib/prisma': { prisma: db } });
  await assert.rejects(api.requireEmailSetup(id, 'owner'), /primary-email step/);
});
test('forward only to assigned destination; duplicate webhook sends once', async () => {
  configure();
  let delivery = null; let sends = 0;
  const e = setup();
  const db = { $executeRaw: async () => {}, onboardingEmailSetup: { findUnique: async () => e, update: async () => {} }, onboardingEmailDelivery: {
    findUnique: async () => delivery, count: async () => 0,
    upsert: async ({ create }) => { delivery = { ...create, createdAt: new Date(), status: 'pending' }; },
    update: async ({ data }) => { Object.assign(delivery, data); },
  } };
  db.$transaction = async fn => typeof fn === 'function' ? fn(db) : Promise.all(fn);
  const provider = async (url, body, key) => {
    if (!body) return { id: 'message-1', from: 'security@linkedin.com', to: [e.address], created_at: new Date(Date.now() - 1000).toISOString(), subject: 'Verify', text: 'code 123456', html: null };
    assert.deepEqual(body.to, [e.destination]); assert.equal(key, 'onboarding-forward-message-1'); sends++; return { id: 'sent-1' };
  };
  const api = load('src/lib/onboarding-email.ts', { '@/lib/prisma': { prisma: db }, '@/services/onboarding-mail': { onboardingMailRequest: provider } });
  await api.forwardOnboardingEmail('message-1');
  await api.forwardOnboardingEmail('message-1');
  assert.equal(sends, 1);
});
test('webhook signature verification rejects forged requests', () => {
  configure();
  const api = load('src/services/onboarding-mail.ts');
  assert.throws(() => api.verifyInbound('{"type":"email.received"}', new Headers()), /./);
});
