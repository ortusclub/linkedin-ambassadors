const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const moduleExports = {};
new Function('exports', ts.transpileModule(fs.readFileSync('src/lib/rental-dashboard-access.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText)(moduleExports);
const { canShowRentalShareLink, isRentalBeingPrepared } = moduleExports;
const shadow = { status: 'pending_access', isShadow: true, paused: false, handoverAt: null, linkedinAccount: {} };
test('a pending shadow rental can show its existing link without a preparation label', () => {
  assert.equal(canShowRentalShareLink(shadow), true);
  assert.equal(isRentalBeingPrepared(shadow), false);
});
test('only a real rental awaiting handover is being prepared', () => {
  const real = { ...shadow, isShadow: false, handoverAt: new Date() };
  assert.equal(isRentalBeingPrepared(real), true);
  assert.equal(canShowRentalShareLink(real), false);
  assert.equal(isRentalBeingPrepared({ ...real, handoverAt: null }), false);
  assert.equal(isRentalBeingPrepared({ ...shadow, handoverAt: new Date() }), false);
});
test('shadow access stays available during its exit notice', () => {
  assert.equal(canShowRentalShareLink({ ...shadow, shadowExitAt: new Date() }), true);
});
test('paused, ended, unpaid, restricted and two-factor blocked rentals cannot expose links', () => {
  for (const status of ['cancelled', 'expired', 'payment_failed']) {
    assert.equal(canShowRentalShareLink({ ...shadow, status }), false);
  }
  assert.equal(canShowRentalShareLink({ ...shadow, paused: true }), false);
  assert.equal(canShowRentalShareLink({ ...shadow, linkedinAccount: { restrictedAt: new Date() } }), false);
  assert.equal(canShowRentalShareLink({ ...shadow, linkedinAccount: { twoFactorResetNeeded: true } }), false);
});
test('ordinary active renters retain access; pending real renters still require a grant', () => {
  assert.equal(canShowRentalShareLink({ ...shadow, isShadow: false, status: 'active' }), true);
  assert.equal(canShowRentalShareLink({ ...shadow, isShadow: false }), false);
});
