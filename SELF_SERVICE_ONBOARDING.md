# Self-service onboarding

The referral portal button opens `/m/<token>/onboarding`. An active referrer's secret
portal token authorizes all reads/writes. Owners enter their passwords only inside
the prepared GoLogin browser, never into this wizard.

## Release setup

1. Review/apply `20260909100000_self_service_onboarding` and
   `20260909120000_two_accounts_per_proxy`, then regenerate Prisma.
2. Configure `GOLOGIN_API_TOKEN_KLABBER` on the deployment.
3. For the existing pool, populate `proxies` with host, HTTP port, credentials and
   country; set `type=residential`, `status=active` (or `self_service`). Existing
   account proxy credentials and proxyLocation can supply missing metadata.
   Temporarily, up to **two accounts per proxy** are allowed (Sam, 2026-09-09).
4. Optional purchase fallback: configure the following server-only variables:

   ```dotenv
   PROXY_CHEAP_API_KEY=
   PROXY_CHEAP_API_SECRET=
   PROXY_CHEAP_AUTO_BUY=false
   PROXY_CHEAP_MAX_PER_PROXY_USD=4
   PROXY_CHEAP_MONTHLY_BUDGET_USD=
   ```

   The owner authorized a maximum of US$4 per proxy (2026-09-09). The code caps
   quotes at this amount even if the environment is higher. An optional monthly
   budget can impose an additional limit; no monthly cap is assumed when blank.
   API keys come from
   https://app.proxy-cheap.com/api-keys. No keys should be sent through chat or
   included in browser code. API reference: https://docs.proxy-cheap.com/.
5. Test one consented onboarding through GoLogin before public rollout. Desktop
   launch uses the existing g.camp public-share mechanism. Actual OS launch,
   installation prompts, and saved LinkedIn session require a manual smoke test.

## Provisioning and purchase behavior

- The owner's normal LinkedIn country is required. Existing pool country labels
  and ISO codes are normalized. No fallback to another country.
- Reserve a matching proxy with fewer than two accounts, checking all inventory
  (including removed records) and reservations, deduplicated by account ID.
  Prefer unused proxies before filling second slots. Recheck capacity before
  quoting and again before purchasing. All self-service allocations share a
  database lock and reserve one of two uniquely indexed slots per proxy.
  Other admin account mutation paths do not use this lock;
  operators must not manually overfill a reserved proxy.
- If none is available and purchasing is enabled, request Proxy-Cheap's
  `static-residential-ipv4`, `standard` (Dedicated) plan, quantity one, one month.
  Check live country/plan availability and USD quote, reserve budget atomically,
  then execute once with auto-extension disabled.
- The per-proxy cap is checked against the quote and rechecked immediately before
  execution. A higher/rejected second quote cannot submit a purchase. Proxy-Cheap's documented execute
  API has no guaranteed price-lock/max-charge parameter. Actual returned cost is
  recorded; provider price changes between quote/execute remain a release caveat.
- The monthly budget counts UTC-calendar-month purchases plus unresolved older
  attempts. It covers this workflow's orders, not manual/provider-dashboard spend.
- Save the provider order ID and poll delivery on the next prepare action. Never
  purchase again after a timeout with unknown outcome. No automatic renewal or
  wallet top-up; renewals must be handled before the one-month term expires.
- GoLogin provisioning uses the klabber token. A deterministic name,
  `onboarding-<session UUID>`, allows reconciliation after an ambiguous create.
  Persist the profile ID before sharing. Never blindly retry profile creation.
- User login confirmation sets onboardedAt once and records pending verification
  as an account issue. Inventory stays unlisted and under construction; neither
  verifiedAt nor paidAt is set. The team verifies login, clears accountIssue and
  confirms payment eligibility using the existing admin flow. Payout calculations
  reuse the existing setup schedule and PHP/USD amounts.
- Existing applications/accounts are not silently reassigned or merged. Duplicate
  owners are directed to the team; the referrer can resume their own saved sessions.

## Recovering an interrupted setup

Inspect the session and its linked inventory/application through the database.
For `creating` / `needs_help`, search GoLogin for the deterministic profile name;
persist the found ID and set `link_pending` to retry sharing. Only reset to
`reserved` after proving no upstream profile was created.

For `purchasing` / `purchase_unknown`, reconcile the Proxy-Cheap order history.
If charged, persist `proxyOrderId`, actual `proxyBudgetReserved` and set
`proxy_pending`; the next prepare action reads delivery without another charge.
Never reset to `reserved` without proving the order did not execute.

## Verification

## Local email testing (enabled 2026-09-09)

- Age copy throughout the portal, wizard, printable referral card and new audit
  notes follows LinkedIn: 16, or older where local law requires. Historical notes
  are unchanged. This is not a legal determination about minors signing contracts.
- The additive email migration is now applied to the shared Neon database.
- Resend receiving is enabled and its MX records are verified for all three new
  domains. Test messages arrived on all three. Sending on these domains is disabled;
  existing verified `noreply@klabber.co` is used for outgoing forwarding/challenges.
- `.env` enables the email step locally. A random local-only signing secret is
  used by the polling bridge. No public Resend webhook or production deployment
  has been created, and no plan was upgraded.
- Run `npm run dev -- --hostname 127.0.0.1 --port 3000` and, in a second terminal,
  `node scripts/onboarding-email-local.mjs`. Keep both running while testing.
  The bridge checks Resend every 15 seconds and feeds signed events only to the
  loopback receiver; it does not expose a public tunnel. `--once` checks one cycle.
- Resume the existing onboarding in the local portal to reach Email before
  GoLogin. Use your real forwarding inbox, verify the six-digit code, and follow
  the owner's consented LinkedIn email change. That final live-owner flow remains
  a manual test. Test records and provider actions are real, not sandboxed.
- The ngrok tunnel was rejected by permission review due to sensitive-message
  exposure. No tunnel was started; the unused gateway file was removed.

## Email-before-GoLogin flow (production not activated yet)

The optional email feature adds **Email** between Payout and Sign in. With
`ONBOARDING_EMAIL_ENABLED=true`, the server also gates prepare/open/confirm and
withholds the browser share URL until the referrer attests that the owner has
verified and made the issued address primary. The owner uses their existing
LinkedIn session/device for this step. No LinkedIn password is collected.

The feature is off by default so existing onboarding and the shared database
continue working before rollout. The additive migration
`20260909150000_onboarding_email` has been applied for local testing on the shared
database, but is never applied by tests or builds. Existing confirmed sessions are
shown as complete; unconfirmed sessions must finish email setup after activation.

Activation checklist (requires operator approval for production deployment):

1. Confirm Resend plan capacity for three additional domains. Existing account
   already has other domains; do not remove them or upgrade a plan automatically.
2. Add `lotuspost.fyi`, `lotuspost.co.uk`, `islandcorrespondence.lol` to Resend and
   enable receiving. Publish the **exact records returned by Resend** through
   Porkbun, preserving unrelated records. Do not modify `linkedvelocity.com` or
   `klabber.co` MX: Google Workspace keeps handling those domains.
3. Verify receiving for each domain. The app's enabled-domain list is an operator
   allowlist of tested receiving domains, not an automatic DNS readiness check.
4. Apply the additive migration after reviewing shared-DB impact; regenerate
   Prisma and deploy the route `/api/webhooks/onboarding-email` to a public HTTPS
   endpoint. Existing local-only Next dev cannot receive public webhooks without
   a separately authorized tunnel. No production deploy or tunnel is implicit.
5. Configure a Resend `email.received` webhook targeting that endpoint. Store its
   signing secret as `RESEND_INBOUND_WEBHOOK_SECRET`; generate a separate random
   `ONBOARDING_EMAIL_CODE_SECRET`. Configure `RESEND_API_KEY` with receive/read
   and send permissions and `RESEND_FROM_EMAIL` using the existing verified sender.
6. Set `ONBOARDING_EMAIL_DOMAINS` to the comma-separated verified new domains and
   `ONBOARDING_EMAIL_ENABLED=true`. Enable in a staging environment first and run
   the manual test below before public rollout. Never put these secrets in NEXT_PUBLIC.

Behavior and limits:

- Unique, deterministic first.last + 12 hex suffix avoids duplicate-name clashes;
  the issued address and chosen destination persist across reloads.
- Owner's separate explicit consent is saved. The destination must receive a
  six-digit challenge, expiring in 10 minutes, before account mail is forwarded.
  Only a keyed hash is stored. Five wrong guesses per code, five sends per session,
  and a one-minute resend cooldown (also across sessions to the same destination).
- A verified destination cannot be reassigned through the portal. Reverification
  of the same destination may reopen the one-hour forwarding window. The route
  also stops when onboarding becomes confirmed or the referrer is disabled.
- Only single-recipient messages addressed exactly to the issued address and
  with a LinkedIn sender-domain match are routed. Sender matching is NOT proof of
  authenticity; all content remains untrusted. Never auto-follow verification
  links or automatically mark the LinkedIn address as primary.
- Signed webhook verification, timestamp validation by the SDK, persisted message
  IDs, processing leases, provider idempotency keys, and a 20-message session cap
  protect against replay/duplicates. Retries stop before the provider's 24-hour
  idempotency window; webhook failures return 503 for provider retries.
- Forwarded mail is plain text, no attachments or tracking pixels. HTML-only
  messages retain HTTPS LinkedIn links. Bodies/codes are not stored in application
  tables or the generic email logger. Resend still retains its own mail records;
  restrict team access and agree a provider retention policy before rollout.
- Referrers can refresh the wizard to see that a message was forwarded; they must
  still inspect LinkedIn and explicitly confirm primary status. This updates
  account `loginEmail` and application `linkedinEmail`, preserving personal email
  and existing payout-verification gates. No automated LinkedIn verification occurs.
- After expiry/completion there is **no automatic forwarding to a former referrer**.
  Later incoming recovery mail remains in Resend for authorized team handling.
  Define that recovery/support procedure with the owner before making an address
  primary; retain their existing recovery address.

Manual staging test: verify the referrer's inbox, add the issued address on a
consented LinkedIn account, confirm the verification link/code reaches only that
destination, make it primary manually, continue through GoLogin, then ensure
forwarding stops after confirmation. Test an expired window and repeated webhook
delivery. Confirm no old-domain mail or payout eligibility is changed.

## Automated verification

`node --test tests/self-service-onboarding.test.cjs`
`node --test tests/onboarding-email.test.cjs`

Tests mock all provider/database calls. Run `npx tsc --noEmit`, targeted ESLint, and
the production build. No live purchase or database migration is part of unit tests.
