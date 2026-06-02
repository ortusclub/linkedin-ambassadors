import pg from "pg";
import { writeFile } from "node:fs/promises";
import "dotenv/config";

const NEW_PRICE = 50;
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const before = await client.query(
  "SELECT id, linkedin_name, monthly_price, status, listed FROM linkedin_accounts ORDER BY linkedin_name"
);

const backupPath = new URL(`./prices-backup-${Date.now()}.json`, import.meta.url);
await writeFile(backupPath, JSON.stringify(before.rows, null, 2));
console.log(`Backup written: ${backupPath.pathname}`);
console.log(`Found ${before.rows.length} accounts.`);

const result = await client.query(
  "UPDATE linkedin_accounts SET monthly_price = $1",
  [NEW_PRICE]
);
console.log(`Updated ${result.rowCount} rows to $${NEW_PRICE}/mo.`);

const sample = await client.query(
  "SELECT linkedin_name, monthly_price FROM linkedin_accounts ORDER BY linkedin_name LIMIT 5"
);
console.log("Sample after update:");
for (const r of sample.rows) {
  console.log(`  ${r.linkedin_name}: $${r.monthly_price}`);
}

await client.end();
