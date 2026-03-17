# Klabber - Developer Guide

## Overview

Klabber is a two-sided marketplace for LinkedIn account rentals. Growth teams rent pre-warmed LinkedIn accounts for outreach, and ambassadors earn monthly income by listing their accounts.

**Live site:** https://klabber.co
**Repo:** https://github.com/ortusclub/linkedin-ambassadors

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (React 19, TypeScript) |
| Database | PostgreSQL (hosted on Neon) |
| ORM | Prisma 7.5 |
| Auth | Custom session-based (bcryptjs + httpOnly cookies) |
| Payments | Stripe (subscriptions) |
| Email | Resend |
| Styling | Tailwind CSS 4 |
| Validation | Zod |
| Desktop App | Electron 41 + Puppeteer 24 |
| Deployment | Vercel (auto-deploy on push to main) |

---

## Local Setup

### Prerequisites
- Node.js 20+
- PostgreSQL 13+ (local instance on port 5433)

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/ortusclub/linkedin-ambassadors.git
cd linkedin-ambassadors

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env
# Edit .env with your local database URL and API keys

# 4. Set up the database
npx prisma migrate dev

# 5. (Optional) Seed with sample data
npx prisma db seed

# 6. Start the dev server
npm run dev
# → http://localhost:3000
```

### Default Seed Accounts
- Admin: `admin@linkedinambassadors.com` / `admin123`
- 6 sample LinkedIn accounts with realistic profiles

---

## Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | Random secret for session signing |
| `RESEND_API_KEY` | Yes | Resend email API key |
| `RESEND_FROM_EMAIL` | Yes | Sender email (e.g. `noreply@klabber.co`) |
| `STRIPE_SECRET_KEY` | For payments | Stripe secret key |
| `STRIPE_PUBLISHABLE_KEY` | For payments | Stripe public key |
| `STRIPE_WEBHOOK_SECRET` | For payments | Stripe webhook signing secret |
| `STRIPE_PRICE_ID` | For payments | Stripe price ID for subscriptions |
| `GOLOGIN_API_TOKEN` | Optional | GoLogin API (legacy, being phased out) |
| `NEXT_PUBLIC_APP_URL` | Yes | Public URL (local: `http://localhost:3000`) |
| `GITHUB_TOKEN` | Production only | For serving app downloads from GitHub releases |

---

## Production Hosting

### Web App (Vercel)
- **URL:** https://klabber.co
- **Platform:** Vercel (auto-deploys on push to `main`)
- **Build command:** `npx prisma generate && npm run build`
- **Config:** `vercel.json`
- **Environment variables:** Set in Vercel dashboard (Settings > Environment Variables)

### Database (Neon)
- **Provider:** Neon PostgreSQL
- **Region:** us-west-2 (AWS)
- **Connection:** Stored as `DATABASE_URL` in Vercel env vars
- **Migrations:** Run `DATABASE_URL="<prod-url>" npx prisma migrate deploy` for production migrations

### Desktop App (GitHub Releases)
- Built with electron-builder
- DMG hosted as GitHub release asset (private repo)
- Download served via `/api/download` route using `GITHUB_TOKEN`

---

## Project Structure

```
src/
  app/
    (auth)/              # Login, register pages
    (customer)/          # Customer-facing pages
      dashboard/         # User dashboard (rentals + ambassador accounts)
      catalogue/         # Browse available accounts
      account/[id]/      # Individual account detail
      become-ambassador/ # Ambassador signup wizard
    (admin)/admin/       # Admin panel
      dashboard/         # Stats overview
      accounts/          # LinkedIn account management
      accounts/[id]/     # Edit individual account
      rentals/           # Rental management
      customers/         # Customer list
      ambassadors/       # Ambassador applications
    api/                 # API routes (see below)
    page.tsx             # Homepage (server component, fetches real accounts)
  lib/
    auth.ts              # Session management, password hashing
    prisma.ts            # Prisma client singleton
    browser-launcher.mjs # Puppeteer-based browser automation
    proxy-pool.ts        # Proxy rotation
    stripe.ts            # Stripe client
    utils.ts             # Formatting helpers
  services/
    email.ts             # Resend email service
    gologin.ts           # GoLogin integration (legacy)
    profile-assessor.ts  # LinkedIn profile analysis
  components/
    ui/                  # Reusable UI components (Button, Card, Badge, Input, etc.)
    layout/navbar.tsx    # Global navigation bar
    catalogue/           # Account card components
    admin/               # Admin-specific components
  middleware.ts          # Route protection (redirects unauthenticated users)

ambassador-app/          # Electron desktop app
  main.js               # Main process (IPC, auth, browser launch, profile management)
  preload.js            # Context bridge (exposes safe APIs to renderer)
  index.html            # App UI (login, verification, dashboard with two sections)
  styles.css            # App styling
  fingerprint.js        # Browser fingerprint config
  package.json          # Electron app dependencies and build config

prisma/
  schema.prisma         # Database schema
  migrations/           # Migration history
  seed.ts               # Seed script
```

---

## API Routes

### Auth
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/login` | Email/password login |
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/logout` | Destroy session |
| GET | `/api/auth/me` | Current user |
| POST | `/api/auth/verify-email` | Send 6-digit verification code |
| POST | `/api/auth/verify-code` | Verify code (creates session token for Electron app) |

### Public
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/accounts` | List available accounts (with search/filter) |
| GET | `/api/accounts/[id]` | Account detail |
| GET | `/api/download` | Download Klabber desktop app |

### Customer
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/rentals` | User's rentals |
| POST | `/api/rentals/checkout` | Create Stripe checkout session |
| POST | `/api/rentals/[id]/cancel` | Cancel rental |
| POST | `/api/rentals/billing-portal` | Stripe billing portal |

### Ambassador
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/ambassador/apply` | Submit application |
| GET | `/api/ambassador/my-accounts` | User's ambassador accounts |
| POST | `/api/ambassador/complete` | Complete onboarding (creates User + LinkedInAccount) |
| POST | `/api/ambassador/bank` | Save payment details |

### Admin (requires `role = 'admin'`)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/admin/stats` | Dashboard stats |
| GET/POST | `/api/admin/accounts` | List/create accounts |
| GET/PATCH/DELETE | `/api/admin/accounts/[id]` | Edit/delete account |
| GET | `/api/admin/ambassadors` | Application list |
| PATCH | `/api/admin/ambassadors/[id]` | Update application status |
| GET | `/api/admin/customers` | Customer list |
| POST | `/api/admin/browser/*` | Browser session management |

### Webhooks
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/webhooks/stripe` | Stripe webhook handler |

---

## Auth System

Two auth methods, both verified against the `sessions` table:

1. **Cookie-based** (web) — `session_token` httpOnly cookie, 24hr TTL (8hr for admin)
2. **Bearer token** (Electron app) — `Authorization: Bearer {token}` header, 30-day TTL

The `requireAuth()` function in `src/lib/auth.ts` checks cookies first, then falls back to Bearer token.

### Making a user admin

```sql
UPDATE users SET role = 'admin' WHERE email = 'someone@example.com';
```

For production (Neon), pull the DATABASE_URL from Vercel:
```bash
vercel env pull .env.prod --environment production
# Then use the DATABASE_URL from that file
```

---

## Electron Desktop App

### Development
```bash
cd ambassador-app
npm install
npm start          # Run in dev mode
```

### Build
```bash
npm run build:mac  # → dist/Klabber-{version}-arm64.dmg
npm run build:win  # → dist/Klabber-{version}.exe
```

### Architecture
- **Login:** Email verification (6-digit code sent via Resend)
- **Profiles:** Stored locally in `~/Library/Application Support/klabber/profiles/`
- **Browser:** Puppeteer with fingerprint spoofing, proxy rotation, anti-detection
- **Sync:** Profiles registered with backend on add; server accounts merged into local list
- **API base:** Configurable in `main.js` (currently `https://klabber.co`)

### Key IPC Channels
- `auth:send-verification` / `auth:verify-code` — Email code login
- `profiles:list` / `profiles:add` / `profiles:delete` — Profile management
- `rentals:list` — Fetch active rentals from server
- `browser:run` / `browser:stop` — Launch/stop Puppeteer browser

---

## Database Schema (Key Models)

### User
- `email`, `passwordHash`, `fullName`, `role` (customer/admin), `status`, `contactNumber`
- Has many: sessions, rentals, waitlist entries

### LinkedInAccount
- `linkedinName`, `linkedinHeadline`, `linkedinUrl`, `connectionCount`
- `industry`, `location`, `profilePhotoUrl`, `profileScreenshotUrl`
- `proxyHost/Port/Username/Password` — dedicated proxy config
- `status` (available/rented/maintenance/retired)
- `monthlyPrice`, `hasSalesNav`, `accountAgeMonths`
- `gologinProfileId` — links to Electron app profile
- `notes` — contains ambassador owner email (used for account ownership lookup)

### Rental
- Links `userId` to `linkedinAccountId`
- `stripeSubscriptionId`, `status`, `autoRenew`
- `startDate`, `currentPeriodEnd`

### AmbassadorApplication
- Tracks signup flow: pending → reviewing → approved → onboarded
- Stores `offeredAmount`, `paymentMethod`, bank/crypto details

---

## Common Tasks

### Deploy to production

**IMPORTANT: Always run a production build locally before pushing to catch TypeScript errors. Vercel will reject the deploy if the build fails.**

```bash
# 1. ALWAYS build locally first to catch errors
npm run build

# 2. If build passes, commit and push
git add -A
git commit -m "Your commit message"
git push origin main

# 3. Vercel auto-deploys on push to main (~2 minutes)
#    If auto-deploy doesn't trigger, deploy manually:
vercel --prod
```

Common build failures:
- **TypeScript errors** — e.g. referencing a form field that was removed. `npm run build` catches these locally.
- **Missing imports** — removed a component but still importing it somewhere.
- **Prisma schema mismatch** — if you changed the schema, run `npx prisma generate` before building.

### Run database migration in production
```bash
DATABASE_URL="<production-url>" npx prisma migrate deploy
```

### Add an admin user
```bash
# Connect to production Neon DB and run:
UPDATE users SET role = 'admin' WHERE email = 'user@example.com';
```

### Build and release desktop app
```bash
cd ambassador-app
npm run build:mac
# Upload dist/Klabber-*.dmg as a GitHub release asset
# The /api/download route serves it using GITHUB_TOKEN
```

---

## Current Admin Users
- sam@ortusclub.com
- mickey@ortusclub.com
- ton@ortusclub.com
