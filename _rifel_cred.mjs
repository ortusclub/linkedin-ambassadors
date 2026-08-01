import pg from 'pg';
import fs from 'fs';
const url = fs.readFileSync('.env','utf8').match(/DATABASE_URL="?([^"\n]+)"?/)[1];
const c = new pg.Client({ connectionString: url, ssl:{rejectUnauthorized:false} });
await c.connect();
const r = await c.query(`update linkedin_accounts set account_password=$2, two_factor=$3
  where id='b250a2bd-78cb-4e67-8797-342dac9fff51'
  returning linkedin_name, login_email, account_password is not null as has_pw, two_factor is not null as has_2fa`);
console.log(JSON.stringify(r.rows));
await c.end();
