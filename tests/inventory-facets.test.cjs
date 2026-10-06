const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const source = fs.readFileSync('src/app/(admin)/admin/accounts/page.tsx', 'utf8');
const declarations = source.slice(source.indexOf('const F_SANS'), source.indexOf('type RenterOption'));
const selectors = source.slice(source.indexOf('  const shown = useMemo'), source.indexOf('  const toggle ='));
const code = ts.transpileModule(declarations + '\n' + selectors + '\nreturn {filtered, renterOptions, counts, facets};', { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
const names = ['accounts', 'filter', 'renterFilter', 'pocFilter', 'verifiedFilter', 'connFilter', 'supplyFilter', 'search', 'updateOrder', 'useMemo', 'useRef', 'sortAccountsByLastUpdated', 'isCompanyEmail'];
const execute = new Function(...names, code);
const user = { id: 'r1', fullName: 'Renter', email: 'renter@example.test' };
const accounts = [
  { id: 'a', status: 'available', ownerPoc: 'Sam', linkedinName: 'Alpha', linkedinVerified: true, connectionCount: 200, rentals: [] },
  { id: 'b', status: 'rented', ownerPoc: 'Sam', linkedinName: 'Beta', linkedinVerified: false, connectionCount: 80, rentals: [{ user }] },
  { id: 'c', status: 'available', ownerPoc: 'Ardi', linkedinName: 'Gamma', linkedinVerified: true, connectionCount: 600, rentals: [] },
  { id: 'd', status: 'rented', ownerPoc: 'Ardi', linkedinName: 'Delta', linkedinVerified: true, connectionCount: 200, rentals: [{ user }] },
];
function run(overrides = {}) {
  const state = { accounts, filter: 'all', renterFilter: '', pocFilter: 'all', verifiedFilter: 'all', connFilter: 'all', supplyFilter: 'all', search: '', updateOrder: 'newest', useMemo: f => f(), useRef: v => ({ current: v }), sortAccountsByLastUpdated: v => v, isCompanyEmail: () => true, ...overrides };
  return execute(...names.map(n => state[n]));
}
test('Sam scopes status counts and status scopes other facets without erasing alternatives', () => {
  const sam = run({ pocFilter: 'Sam' });
  assert.equal(sam.counts.Available, 1);
  assert.equal(sam.counts.Rented, 1);
  const rented = run({ pocFilter: 'Sam', filter: 'Rented' });
  assert.deepEqual(rented.filtered.map(a => a.id), ['b']);
  assert.equal(rented.counts.Available, 1);
  assert.equal(rented.counts.verified, 0);
  assert.equal(rented.counts.unverified, 1);
  assert.deepEqual(rented.facets.poc.map(a => a.ownerPoc), ['Sam', 'Ardi']);
  assert.equal(rented.renterOptions.find(r => r.id === 'r1').count, 1);
});
test('zero-result combinations retain useful alternative counts', () => {
  const result = run({ pocFilter: 'Sam', filter: 'Rented', verifiedFilter: 'yes' });
  assert.equal(result.filtered.length, 0);
  assert.equal(result.counts.Available, 1);
  assert.equal(result.counts.unverified, 1);
  assert.equal(result.facets.poc[0].ownerPoc, 'Ardi');
});
test('search applies to every facet and unfiltered totals are restored', () => {
  const result = run({ search: 'Alpha' });
  assert.equal(result.counts.total, 1);
  assert.equal(result.counts.Rented, 0);
  assert.equal(result.facets.poc.length, 1);
  assert.equal(run().filtered.length, 4);
  assert.equal(run().counts.total, 4);
});
test('renter, connection and supply filters compose across facets', () => {
  const result = run({ renterFilter: 'r1', connFilter: '50' });
  assert.deepEqual(result.filtered.map(a => a.id), ['b']);
  assert.equal(result.counts.conn['100'], 1);
  assert.equal(result.counts.Rented, 1);
  assert.equal(run({ supplyFilter: 'offerable', pocFilter: 'Sam' }).counts.total, 1);
});
