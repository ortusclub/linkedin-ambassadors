import pg from 'pg';
import { readFileSync } from 'fs';
const env = readFileSync('.env', 'utf8');
const url = env.match(/DATABASE_URL="?([^"\n]+)"?/)[1];
const token = env.match(/GOLOGIN_API_TOKEN_KLABBER=("?)([^"\n]+)\1/)[2];
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
const acc = await client.query(
  `select gologin_profile_id, login_email, proxy_host, proxy_port, proxy_username, proxy_password
   from linkedin_accounts where id='341734e0-ea85-442d-97dd-aa919c8bc901'`);
const a = acc.rows[0];
console.log('account gologin_profile_id:', a.gologin_profile_id, '| login:', a.login_email);
await client.end();

async function gl(path, opts={}) {
  const r = await fetch(`https://api.gologin.com${path}`, { ...opts, headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',...(opts.headers||{})} });
  const t = await r.text(); if (!r.ok) throw new Error(`${path} -> ${r.status}: ${t.slice(0,200)}`); return t?JSON.parse(t):null;
}
let profileId = a.gologin_profile_id;
if (!profileId) {
  // find by name = login email
  const list = await gl('/browser/v2?page=1&limit=200');
  const profiles = list.profiles || list.data || [];
  const match = profiles.find(p => (p.name||'').toLowerCase() === (a.login_email||'').toLowerCase());
  profileId = match?.id || match?._id;
  console.log('found profile by name:', profileId);
}
if (!profileId) { console.log('NO GoLogin profile found for Roy — cannot set proxy on it.'); process.exit(0); }

// Set the proxy on the GoLogin profile.
await gl(`/browser/${profileId}/proxy`, { method:'POST', body: JSON.stringify({
  mode:'http', host:a.proxy_host, port:a.proxy_port, username:a.proxy_username, password:a.proxy_password }) });
const prof = await gl(`/browser/${profileId}`);
console.log('proxy now on profile', profileId, ':', JSON.stringify({host:prof.proxy?.host, port:prof.proxy?.port, mode:prof.proxy?.mode, region:prof.proxy?.autoProxyRegion}, null, 2));
