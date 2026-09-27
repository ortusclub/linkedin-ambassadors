const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => mocks[name] || require(name), module, module.exports);
  return module.exports;
}
const notes = load('src/lib/account-notes.ts');
const { accountNotesTimeline } = notes;
test('shows newest account update ahead of dated proof and legacy metadata', () => {
  const list = accountNotesTimeline('Owner: owner@example.com\n[2026-08-14] Older update\n[2026-09-27] Email not working; contact owner.', '[2026-09-04] Recovered');
  assert.deepEqual(list.map(n => n.at), ['2026-09-27', '2026-09-04', '2026-08-14', null]);
  assert.match(list[0].text, /Email not working/);
  assert.equal(list[3].text, 'Owner: owner@example.com');
});
test('preserves multiline legacy text without inventing dates from prose', () => {
  const text = '2FA rotation required (2026-08-04).\nKeep this detail.';
  const list = accountNotesTimeline('[2026-09-27] New note\nSecond line', text);
  assert.equal(list[0].text, 'New note\nSecond line');
  assert.equal(list[1].text, text);
  assert.equal(list[1].at, null);
});
test('sorts actual timestamps, including out-of-order backfills and same-day entries', () => {
  const list = accountNotesTimeline('[2026-09-27T12:00:00.000Z] Latest\n[2026-09-20] Backfilled\n[2026-09-27T09:00:00.000Z] Earlier today');
  assert.deepEqual(list.map(n => n.text), ['Latest', 'Earlier today', 'Backfilled']);
  assert.deepEqual(accountNotesTimeline(null, ''), []);
});
test('renders newest note as readable text before old proof', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const { AccountNotes } = load('src/components/admin/account-notes.tsx', { '@/lib/account-notes': notes });
  const html = renderToStaticMarkup(React.createElement(AccountNotes, { accountId: 'test', notes: '[2026-09-27] CONTACT OWNER', proof: 'OLD PROOF', onNotesSaved() {}, async onProofSaved() {} }));
  assert.ok(html.indexOf('CONTACT OWNER') < html.indexOf('OLD PROOF'));
  assert.match(html, /Add note/);
  assert.match(html, /Newest first/);
});
const id = 'b250a2bd-78cb-4e67-8797-342dac9fff51';
function route(auth, query) { return load('src/app/api/admin/accounts/[id]/notes/route.ts', { '@/lib/auth': { requireAdmin: auth }, '@/lib/prisma': { prisma: { $queryRaw: query } } }).POST; }
const request = text => new Request('http://localhost/notes', { method: 'POST', body: JSON.stringify({ text }) });
test('note writes require admin authorization', async () => {
  const post = route(async () => { throw new Error('Unauthorized'); }, () => { throw new Error('Should not write'); });
  assert.equal((await post(request('hello'), { params: Promise.resolve({ id }) })).status, 401);
});
test('blank notes do not reach the database', async () => {
  const post = route(async () => {}, () => { throw new Error('Should not write'); });
  assert.equal((await post(request('  '), { params: Promise.resolve({ id }) })).status, 400);
});
test('database errors report failure instead of a successful save', async () => {
  const post = route(async () => {}, async () => { throw new Error('private database error'); });
  const res = await post(request('hello'), { params: Promise.resolve({ id }) });
  assert.equal(res.status, 500);
  assert.deepEqual(await res.json(), { error: 'Could not save note' });
});
