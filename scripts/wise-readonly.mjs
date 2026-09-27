import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createWiseReader } from './lib/wise-readonly.mjs';

const help = `Read-only Wise Business access (JSON output)
  npm run wise -- profiles
  npm run wise -- transfers --from 2026-09-01T00:00:00Z --to 2026-09-30T23:59:59Z
  npm run wise -- transfers --status outgoing_payment_sent --limit 100 --offset 0
  npm run wise -- transfer TRANSFER_ID
  npm run wise -- recipient RECIPIENT_ID

Set WISE_API_TOKEN and WISE_PROFILE_ID in .env.wise.local or the environment.
Transfers returns ONE page. Follow nextOffset until null for complete results.
See docs/wise.md for setup, limitations, and payout reconciliation.`;
try {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { help: { type: 'boolean' }, from: { type: 'string' }, to: { type: 'string' }, status: { type: 'string' }, limit: { type: 'string' }, offset: { type: 'string' } } });
  const [command, id, ...extra] = positionals;
  if (values.help || !command) console.log(help);
  else {
    if (!['profiles', 'transfers', 'transfer', 'recipient'].includes(command) || extra.length || (['profiles', 'transfers'].includes(command) && id)) throw new Error('Invalid command. Run npm run wise -- --help.');
    if (command !== 'transfers' && Object.keys(values).some(k => k !== 'help')) throw new Error('Filter options are only supported by transfers.');
    dotenv.config({ path: fileURLToPath(new URL('../.env.wise.local', import.meta.url)), quiet: true });
    const client = createWiseReader({ token: process.env.WISE_API_TOKEN, profileId: process.env.WISE_PROFILE_ID });
    const result = command === 'transfers' ? await client.transfers({ from: values.from, to: values.to, status: values.status, limit: values.limit === undefined ? 100 : Number(values.limit), offset: values.offset === undefined ? 0 : Number(values.offset) }) : await client[command](id);
    console.log(JSON.stringify(result, null, 2));
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Wise read failed.');
  process.exitCode = 1;
}
