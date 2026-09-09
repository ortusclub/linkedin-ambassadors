// Local-only receiving bridge: no public tunnel, no mail bodies or secrets in logs.
import 'dotenv/config';
import { createHmac, randomUUID } from 'node:crypto';
const domains = new Set((process.env.ONBOARDING_EMAIL_DOMAINS || '').split(',').map(s => s.trim()));
const secret = process.env.RESEND_INBOUND_WEBHOOK_SECRET;
if (!secret || !process.env.RESEND_API_KEY || !domains.size) throw new Error('Configure onboarding email in .env first');
const seen = new Set();
async function poll() {
  let after;
  for (let page = 0; page < 10; page++) {
    const url = new URL('https://api.resend.com/emails/receiving');
    url.searchParams.set('limit', '100');
    if (after) url.searchParams.set('after', after);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`Resend list failed (${res.status})`);
    const list = await res.json();
    for (const mail of list.data || []) {
      if (seen.has(mail.id) || Date.now() - new Date(mail.created_at).getTime() > 3600000 || !mail.to?.some(to => domains.has(to.split('@')[1]))) continue;
      const payload = JSON.stringify({ type: 'email.received', created_at: mail.created_at, data: { email_id: mail.id } });
      const id = `local_${randomUUID()}`;
      const timestamp = String(Math.floor(Date.now() / 1000));
      const signature = createHmac('sha256', Buffer.from(secret.replace(/^whsec_/, ''), 'base64')).update(`${id}.${timestamp}.${payload}`).digest('base64');
      const delivered = await fetch('http://127.0.0.1:3000/api/webhooks/onboarding-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'svix-id': id, 'svix-timestamp': timestamp, 'svix-signature': `v1,${signature}` }, body: payload, signal: AbortSignal.timeout(55000),
      });
      if (!delivered.ok) throw new Error(`Local receiver failed (${delivered.status}); will retry`);
      seen.add(mail.id);
      console.log('Processed one incoming onboarding-domain event.');
    }
    const last = list.data?.at(-1);
    if (!list.has_more || !last || Date.now() - new Date(last.created_at).getTime() > 3600000) break;
    after = last.id;
  }
  if (seen.size > 10000) seen.clear(); // persistent delivery IDs still prevent duplicate forwarding
}
console.log('Local receiving bridge running; checks Resend every 15 seconds. No public tunnel.');
while (true) {
  try { await poll(); } catch (e) { console.error(e.message); }
  if (process.argv.includes('--once')) break;
  await new Promise(resolve => setTimeout(resolve, 15000));
}
