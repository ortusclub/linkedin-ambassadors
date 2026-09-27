import test from 'node:test';
import assert from 'node:assert/strict';
import { createWiseReader } from '../scripts/lib/wise-readonly.mjs';
const transfer = { id: 9, business: 42, targetAccount: 7, status: 'outgoing_payment_sent', sourceValue: 15, sourceCurrency: 'GBP', targetValue: 1000, targetCurrency: 'PHP', details: { reference: 'Setup' } };
function fixture(body, status = 200) {
  const calls = [];
  const client = createWiseReader({ token: 'test-secret', profileId: '42', fetchImpl: async (url, options) => { calls.push({ url, options }); return new Response(JSON.stringify(body), { status }); } });
  return { client, calls };
}
test('business-filtered GETs, pagination, currency amounts and raw status', async () => {
  const { client, calls } = fixture([transfer]);
  const result = await client.transfers({ limit: 1, offset: 2, from: '2026-09-01T00:00:00Z' });
  assert.equal(calls[0].url.origin, 'https://api.wise.com');
  assert.equal(calls[0].url.pathname, '/2026Q3/transfers');
  assert.equal(calls[0].url.searchParams.get('profile'), '42');
  assert.equal(calls[0].url.searchParams.get('offset'), '2');
  assert.equal(calls[0].options.method, 'GET');
  assert.equal(calls[0].options.redirect, 'error');
  assert.equal(result.nextOffset, 3);
  assert.equal(result.transfers[0].recipientAmount, 1000);
  assert.equal(result.transfers[0].sourceCurrency, 'GBP');
  assert.equal(result.transfers[0].status, 'outgoing_payment_sent');
});
test('empty page ends pagination', async () => assert.equal((await fixture([]).client.transfers()).nextOffset, null));
test('rejects foreign profile data', async () => {
  await assert.rejects(fixture({ ...transfer, business: 99 }).client.transfer('9'), /does not belong/);
  await assert.rejects(fixture([{ ...transfer, business: 99 }]).client.transfers(), /outside/);
  await assert.rejects(fixture({ id: 7, profileId: 99 }).client.recipient('7'), /does not belong/);
});
test('rejects invalid input before networking', async () => {
  const { client, calls } = fixture([]);
  await assert.rejects(client.transfer('../profiles'), /numeric ID/);
  await assert.rejects(client.transfers({ limit: 0 }), /limit/);
  await assert.rejects(client.transfers({ offset: -1 }), /offset/);
  await assert.rejects(client.transfers({ from: 'yesterday' }), /ISO/);
  await assert.rejects(client.transfers({ from: '2026-09-30T00:00:00Z', to: '2026-09-01T00:00:00Z' }), /before/);
  assert.equal(calls.length, 0);
});
test('missing credentials and business ID fail closed', async () => {
  assert.throws(() => createWiseReader({}), /WISE_API_TOKEN/);
  const client = createWiseReader({ token: 'test', fetchImpl: () => { throw new Error('should not call'); } });
  await assert.rejects(client.transfers(), /WISE_PROFILE_ID/);
  await assert.rejects(client.transfer(9), /WISE_PROFILE_ID/);
});
test('does not expose raw errors or bank details', async () => {
  await assert.rejects(fixture({ secret: 'test-secret' }, 403).client.profiles(), e => e.message.includes('403') && !e.message.includes('test-secret'));
  const { client } = fixture({ id: 7, profileId: 42, name: { fullName: 'Example' }, details: { accountNumber: 'sensitive' } });
  assert.equal(JSON.stringify(await client.recipient(7)).includes('sensitive'), false);
});
test('network failures are sanitized', async () => {
  const client = createWiseReader({ token: 'test-secret', fetchImpl: async () => { throw new Error('test-secret'); } });
  await assert.rejects(client.profiles(), e => !e.message.includes('test-secret') && e.message.includes('request failed'));
});
