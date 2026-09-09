const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(file, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => mocks[name] || require(name), module, module.exports);
  return module.exports;
}
const { crmOwnerOptions, matchesCrmOwner } = load('src/lib/crm-owners.ts');
test('owner choices include unassigned team members and preserve legacy owners without duplicates', () => {
  assert.deepEqual(crmOwnerOptions([
    { email: 'sam@example.com', fullName: 'Sam' }, { email: 'anna@example.com', fullName: 'Anna' },
  ], [{ ownerEmail: ' SAM@example.com ' }, { ownerEmail: 'Former teammate' }, { ownerEmail: null }]), [
    { value: 'anna@example.com', label: 'Anna (anna@example.com)' },
    { value: 'former teammate', label: 'Former teammate' },
    { value: 'sam@example.com', label: 'Sam (sam@example.com)' },
  ]);
});
test('owner filtering handles all, unassigned and exact case-insensitive matches', () => {
  assert.equal(matchesCrmOwner(null, 'all'), true);
  assert.equal(matchesCrmOwner('  ', 'unassigned'), true);
  assert.equal(matchesCrmOwner('sam@example.com', 'unassigned'), false);
  assert.equal(matchesCrmOwner(' SAM@example.com ', 'sam@example.com'), true);
  assert.equal(matchesCrmOwner('sam@example.com.evil', 'sam@example.com'), false);
});
test('CRM roster is admin-only and exposes only email and display name', async () => {
  let allowed = false;
  const api = load('src/app/api/admin/inbound/route.ts', {
    '@/lib/auth': { requireAdmin: async () => { if (!allowed) throw Error('Forbidden'); } },
    '@/lib/prisma': { prisma: {
      inboundLead: { findMany: async () => [] },
      user: { findMany: async args => { assert.deepEqual(args.where, { role: 'admin' });
        assert.deepEqual(args.select, { email: true, fullName: true }); return [{ email: 'sam@example.com', fullName: 'Sam' }]; } },
    } },
  });
  assert.equal((await api.GET()).status, 403);
  allowed = true;
  assert.deepEqual((await (await api.GET()).json()).owners, [{ email: 'sam@example.com', fullName: 'Sam' }]);
});
test('assigning and clearing a PoC writes the existing owner field', async () => {
  const writes = [];
  const api = load('src/app/api/admin/inbound/route.ts', {
    '@/lib/auth': { requireAdmin: async () => ({}) },
    '@/lib/prisma': { prisma: { inboundLead: { update: async args => { writes.push(args); return args.data; } } } },
  });
  for (const ownerEmail of ['sam@example.com', null]) {
    const res = await api.PATCH(new Request('https://example.test/api/admin/inbound', { method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'lead', ownerEmail }) }));
    assert.equal(res.status, 200);
  }
  assert.deepEqual(writes.map(w => w.data.ownerEmail), ['sam@example.com', null]);
});
