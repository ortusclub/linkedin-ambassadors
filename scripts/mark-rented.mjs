import pg from "pg";
import "dotenv/config";

const NAMES = ["Anne Portia", "Lhuz"];
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const matches = await client.query(
  `SELECT id, linkedin_name, status FROM linkedin_accounts
   WHERE ${NAMES.map((_, i) => `linkedin_name ILIKE $${i + 1}`).join(" OR ")}`,
  NAMES.map((n) => `%${n}%`)
);

console.log("Matches:");
for (const r of matches.rows) {
  console.log(`  ${r.linkedin_name} (current: ${r.status})`);
}

if (matches.rows.length === 0) {
  console.log("No matches — nothing to update.");
  await client.end();
  process.exit(0);
}

const ids = matches.rows.map((r) => r.id);
const result = await client.query(
  `UPDATE linkedin_accounts SET status = 'rented' WHERE id = ANY($1::uuid[])`,
  [ids]
);
console.log(`Updated ${result.rowCount} rows to status='rented'.`);

await client.end();
