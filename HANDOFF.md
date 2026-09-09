# LinkedVelocity — Development Handoff

_Last updated: 2026-09-09. Written so another model/session can pick up cleanly._

LinkedVelocity is a LinkedIn-account **rental marketplace**: ambassadors supply LinkedIn
accounts, renters pay monthly to use them (accessed via GoLogin browser profiles), and
the platform pays ambassadors a monthly payout.

---

## 1. Project basics

| | |
|---|---|
| **Repo** | `github.com/ortusclub/linkedin-ambassadors` |
| **Local path** | `~/linkedin-ambassadors` |
| **Stack** | Next.js 16 (App Router) · Prisma 7.5 (custom client at `src/generated/prisma`) · Neon Postgres |
| **Hosting** | Vercel project named **"klabber"** → **linkedvelocity.com** |
| **Work branch** | `sam-branch` (all dev happens here) |
| **Prod branch** | `main` |
| **Domain history** | Rebranded from klabber.co → linkedvelocity.com (Vercel project still named "klabber") |

---

## 2. ⚠️ CRITICAL: how deploys actually work

**Pushing to `main` does NOT reliably deploy to production.** Production has been deployed
via the **Vercel CLI** (`vercel --prod`) with no git metadata, so GitHub-push auto-deploys
get clobbered by stale manual CLI deploys. This caused repeated "my change isn't showing up
live" confusion.

**To actually ship to linkedvelocity.com:**
```bash
cd ~/linkedin-ambassadors
git checkout main && git pull origin main --no-rebase --no-edit
git merge sam-branch --no-edit && git push origin main
vercel --prod --yes          # <-- THIS is what updates linkedvelocity.com
git checkout sam-branch && git merge main --no-edit
```
After the build, confirm the domain points to the new deployment:
```bash
vercel inspect linkedvelocity.com   # check the `url` line changed
```
Builds take ~1 min; a foreground call may time out — run in background and poll the log.

> **Open improvement:** stop hand-deploying with stale `vercel --prod`; rely on the
> connected GitHub integration instead (repo is already connected).

---

## 3. Database access pattern

Direct DB edits are done with small `.mjs` scripts using `pg`:

```js
import pg from 'pg';
import { readFileSync } from 'fs';
const env = readFileSync('.env', 'utf8');
const url = env.match(/DATABASE_URL="?([^"\n]+)"?/)[1];
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
```

Rules that bite you:
- **Must run from `~/linkedin-ambassadors`** — `pg` only resolves there.
- Wrap in a **3-attempt retry loop** (Neon throws intermittent `ECONNRESET`).
- Raw SQL `INSERT` into `linkedin_accounts` **must supply `id` via `gen_random_uuid()`** —
  Prisma's `@default(uuid())` is app-level, not a DB default, so raw inserts fail on the
  NOT-NULL `id`. Also set `updated_at = now()`.
- `.env` is **gitignored** — never commit tokens.

---

## 4. Data model (the important bits)

**`ambassador_applications`** — the person/lead.
- `status` (enum `AmbassadorStatus`): `pending`(Initial) · `contacted`(Awaiting reply) ·
  `onboarding`(**Level 1** — waiting, before GoLogin/login) · `approved`(**Level 2** —
  GoLogin ready, verifying before payout) · `reviewing`(legacy Processing) · `on_hold` ·
  `onboarded` · `rejected` · `unreachable`.
- `poc` = **onboarding point of contact / handler** (e.g. "Sam"). Shown on the Onboarding page.
- Ambassador **payouts** stored per-OWNER as JSON `monthlyPayouts` here (not per-account):
  entries `{paidAt, amount, kind}`, `kind` = "setup" | "monthly". Setup fee ₱1000 one-time;
  monthly rate ₱500/mo default.

**`linkedin_accounts`** — the actual inventory account.
- `status` (enum `AccountStatus`): `under_construction` (being set up) · `under_review` ·
  `available` (rentable) · `rented` · `trial` · `maintenance` · `unavailable` · `retired` ·
  `removed`.
- Credentials: `login_email`, `account_password`, `personal_email`, `two_factor`.
- GoLogin: `gologin_profile_id`, `gologin_share_link`.
- Proxy: `proxy_host`, `proxy_port`, `proxy_username`, `proxy_password`, `proxy_location`.
- `listed` (bool) — must be `true` **and** `status='available'` to appear in the public catalogue.
- `notes` — contains `Owner: <email>` which **links the account to its ambassador_application**.
- `restricted_at` — set = account is restricted (shows in "Payment not applicable").

**Linking account ↔ application** (Onboarding page): matches by `linkedin_url` first, then by
the `Owner: <email>` line in account notes (only when that email maps to a single account).

**Dummy/showcase accounts:** flagged by `[SHOWCASE]` in notes or `(TEST)` in the name;
excluded from "real" metrics via `isRealAccount()` in `src/lib/metrics.ts`.

---

## 5. GoLogin (browser profiles)

Service: `src/services/gologin.ts`. **Two GoLogin accounts:**
- **master** — `GOLOGIN_API_TOKEN` (info@ortus.solutions). Legacy rentals.
- **klabber** — `GOLOGIN_API_TOKEN_KLABBER` (info@klabber.co, workspace "LinkedVelocity"
  id `69c1f7df88b94e048876f1d8`). **All NEW inventory lives here.**

Key calls (all can take the klabber token as 3rd arg):
- `createProfile({name, proxy})` → `POST /browser` (os mac, chrome). Returns `{id}`.
- Rename: `PATCH /browser/{id}/name` body `{name}`.
- Attach/replace proxy: `POST /browser/{id}/proxy` or include in create body
  (`{mode:'http', host, port, username, password}`).
- Public share link: `POST /share-links/profiles` body
  `{profiles:[{name, id, role:'owner', notes:''}]}` → link url; full link is
  `https://g.camp/share/<url>`. Name **must match the profile's real name exactly**.
- Share to an email: `POST /share/multi` `{recepients:[email]}` (note misspelling "recepients").

Naming convention: profiles are named after the account's email (e.g. `aditya@klabber.co`,
`bustamantejhonphillip@gmail.com`).

---

## 6. Proxy policy (for restriction-resistance)

- **Buy Static Residential (ISP)** proxies — dedicated, stable home-ISP IP per account.
  Static **Mobile** is best-in-class but pricier. **Avoid** datacenter, IPv6, and any
  **rotating** proxy (rotating = account "teleports" between IPs = restriction trigger).
- **1 dedicated proxy per account.** Geo-match to the account's home location.
- Sharing one proxy across accounts is discouraged (correlation → cluster bans). Sam has
  knowingly shared one in at least one case (see Jhonphillip below).

---

## 7. Conventions / standing rules

- All dev on `sam-branch`; deploy via the flow in §2.
- **Ask before changing inventory status** (available/rented/etc.) and before public-facing
  changes.
- Run `npx prisma generate` after merges that touch the schema (stale client → false tsc errors).
- **Must rotate 2FA** whenever a rental/trial ends (the renter had the old key).
- Never raise spend/position caps without asking.
- Commit trailer (this session):
  ```
  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
  Claude-Session: <session url>
  ```

---

## 8. What was done in the most recent session

- **Restricted** Erika S. Danila + Jhenrick Miranda (set `restricted_at`, status → `unavailable`).
- **Homepage:** removed the "Try Our Test Account" button.
- **Onboarding page** (`src/app/(admin)/admin/onboarding/page.tsx` + `.../api/admin/onboarding/route.ts`):
  - Added **PoC filter chips** (All / each PoC / Unassigned) — filters leads by onboarding PoC.
  - Show **PoC on the collapsed row** (meta line, after Account).
  - Show the account's **Proxy** + **Proxy auth** in the expanded detail (API now returns proxy fields).
- **Auth:** extended **admin session from 8h → 30 days** (`src/lib/auth.ts`,
  `ADMIN_SESSION_MAX_AGE`). Hard expiry, no sliding renewal. Applies to NEW logins only.
- **Catalogue:** set the 5 showcase accounts (Deepa Keen, Edhz Centenera, Hibah Najeeb,
  Sebastian Chen Schmidt, Taylor Sherman) to `available` so the catalogue isn't empty.
- **Dashboard:** removed the hardcoded "Jeremiah Lofranco / Demo" rental block.
- **Aditya** onboarding: created inventory account (login `aditya@klabber.co`, password,
  personal `adityatkr37@gmail.com`), linked GoLogin profile `6a9ee50280a6df26d2f8925b`, proxy
  `82.41.252.94:41690` (US), status `onboarding` (Level 1), PoC Sam.
- **Jhonphillip Bustamante**: merged 3 duplicate applications → one `reviewing`(Processing)
  record, PoC Sam. Created inventory account `3ab5424f-a2c7-45f7-be96-03497371bd70`; attached
  proxy `168.227.142.251:8000` (auth `YGvpnS`/`7eEHT7`) — **knowingly SHARED with account
  "Thea Mai Navarro"**. Created GoLogin profile `6aa0ec0e8871bd49d723e37d` named
  `bustamantejhonphillip@gmail.com` with the proxy, plus public share link
  `https://g.camp/share/bustamantejhonphillip%40gmail.com/lJeWkNK0Da` (stored on the account).

---

## 9. Open / pending items

1. **Showcase accounts are now genuinely rentable** but have no real GoLogin behind them —
   a visitor could check out & pay for a demo. Consider a **checkout guard** that blocks
   `[SHOWCASE]` accounts (or hides their rent button) while still displaying them.
2. **Security:** the PUBLIC repo `ortusclub/ortus-outreach-installer` has a **real (now-revoked)
   GoLogin JWT in `.env.example`**. It's dead (401), but replace it with a placeholder for
   hygiene. Also consider updating the klabber token in Vercel env if it ever rotates.
3. **Aditya:** the login `aditya@klabber.co` is recorded but **not yet applied on the actual
   LinkedIn account**. Apply it, confirm login, then bump status → Level 2 (`approved`).
4. **Jhonphillip:** warm up the LinkedIn login inside his GoLogin profile; the shared proxy is
   a known risk — split onto a dedicated proxy if either account gets flagged.
5. **Deploy hygiene:** move production deploys onto the GitHub integration instead of manual
   `vercel --prod` (see §2).

---

## 10. Quick reference — IDs from recent work

| Thing | ID / value |
|---|---|
| Aditya account | `58cc4394-1a0a-4943-ab90-f396f9e143e5` |
| Aditya GoLogin profile | `6a9ee50280a6df26d2f8925b` |
| Jhonphillip account | `3ab5424f-a2c7-45f7-be96-03497371bd70` |
| Jhonphillip GoLogin profile | `6aa0ec0e8871bd49d723e37d` |
| Jhonphillip share link | `https://g.camp/share/bustamantejhonphillip%40gmail.com/lJeWkNK0Da` |
| klabber GoLogin workspace | `69c1f7df88b94e048876f1d8` (info@klabber.co) |
