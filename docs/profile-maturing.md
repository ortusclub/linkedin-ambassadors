# Profile Maturing

Admin route: `/admin/profile-maturing` (Ambassadors → Profile Maturing).

This page reads and controls the existing Outreach cloud campaigns at `https://scraper.ortusclub.com`. It does not run another worker or copy campaign state into PostgreSQL. Only maturing campaigns owned by a `@linkedvelocity.com` operator are exposed. Every API request requires admin authorization; mutations also require the same browser origin.

`src/lib/maturing/shared` contains the desktop plan editor, schedule, pool, ramp and board modules from Outreach v3.1.128 (10a6b902). The editor fetch adapter uses authenticated server routes. Pool sources are the existing GoLogin workspaces, SoO engine endpoint and LinkedVelocity inventory. Credentials remain server-side.

Production settings: `MATURING_ENGINE_TOKEN`, optional `MATURING_ENGINE_URL`, existing `DATABASE_URL`, `GOLOGIN_API_TOKEN`, and `GOLOGIN_API_TOKEN_KLABBER`. Do not commit values.

The board progressively fetches current warm/cold activity, refreshes every 30 seconds while visible, and paginates accounts and workbook recipients. Pause, continue, stop and acceptance checks use the same engine endpoints as Outreach. Starting a plan uses a per-account database advisory lock and deterministic dispatch IDs. Existing active campaigns must be stopped explicitly before a replacement; prior attempted recipients are excluded. Rented/restricted accounts cannot start or resume.

Local desktop-only settings (including its local blocklist and hidden-row preferences) are not synchronized by the engine. The website does not expose desktop browser windows. Cold pools should be maintained with the appropriate exclusions in the source sheet. Opening the page never launches activity.

Validation:

```
node --test tests/profile-maturing.test.mjs tests/profile-maturing-api.test.cjs
npx tsc --noEmit
npm run build
CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node tests/profile-maturing-browser.cjs
```

The browser test uses local API fixtures on port 3127 and sends no real outreach. Live verification should read the engine and inventory; do not launch test campaigns against real recipients.
