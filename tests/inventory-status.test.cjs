const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const page = fs.readFileSync('src/app/(admin)/admin/accounts/page.tsx', 'utf8');
const logic = page.slice(page.indexOf('const CONSTRUCTION_MAX'), page.indexOf('const statusChip'));
const js = ts.transpileModule(logic + '\nmodule.exports = { canonicalStatus, inventoryStatusLabel, GROUPS };', { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const m = { exports: {} };
new Function('module', 'isCompanyEmail', js)(m, e => e.endsWith('@lotuspost.fyi'));
const { canonicalStatus, inventoryStatusLabel, GROUPS } = m.exports;
const base = { status: 'available', restrictedAt: null, loginEmail: 'test@lotuspost.fyi', accountPassword: 'test', connectionCount: 200 };
test('all current nonterminal restrictions join maintenance regardless of lifecycle', () => {
  for (const status of ['available', 'rented', 'trial', 'under_construction', 'construction_immature', 'unavailable', 'maintenance', 'under_review']) {
    assert.equal(canonicalStatus({ ...base, status, restrictedAt: '2026-09-27', connectionCount: 0 }), 'Maintenance');
  }
});
test('explicit maintenance and 2FA holds use the same group without requiring a login', () => {
  assert.equal(canonicalStatus({ status: 'maintenance', restrictedAt: null }), 'Maintenance');
  assert.equal(canonicalStatus({ ...base, twoFactorResetNeeded: true }), 'Maintenance');
});
test('terminal states remain separate even when restricted', () => {
  assert.equal(canonicalStatus({ ...base, status: 'retired', restrictedAt: '2026-09-27' }), 'Permanently restricted/Inaccessible');
  assert.equal(canonicalStatus({ ...base, status: 'removed', restrictedAt: '2026-09-27' }), 'Removed');
});
test('healthy lifecycle groups and paid warming-up accounts are preserved', () => {
  for (const [status, group] of [['available', 'Available'], ['rented', 'Rented'], ['trial', 'Trial'], ['under_construction', 'Construction']]) assert.equal(canonicalStatus({ ...base, status }), group);
  assert.equal(canonicalStatus({ ...base, status: 'unavailable', connectionCount: 20, ownerSetupPaidAt: '2026-09-01' }), 'Construction');
  assert.equal(canonicalStatus({ ...base, status: 'unavailable', connectionCount: 20 }), 'Initial');
});
test('one combined section with no separate Restricted group', () => {
  assert.equal(inventoryStatusLabel('Maintenance'), 'Restricted / Maintenance');
  assert.equal(GROUPS.filter(g => g.key === 'Maintenance').length, 1);
  assert.equal(GROUPS.some(g => g.key === 'Restricted'), false);
  const sample = [{ ...base, restrictedAt: '2026-09-27' }, { ...base, status: 'maintenance', restrictedAt: '2026-09-27' }, { ...base, status: 'maintenance' }, base];
  assert.equal(sample.filter(a => canonicalStatus(a) === 'Maintenance').length, 3);
});

test('immature construction is distinct from renamed pipeline', () => {
  assert.equal(inventoryStatusLabel('Construction'), 'Pipeline');
  assert.equal(canonicalStatus({ ...base, status: 'construction_immature' }), 'Construction (Immature)');
  assert.equal(GROUPS.filter(g => g.key === 'Construction (Immature)').length, 1);
});
