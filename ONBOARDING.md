# LinkedVelocity — Admin Onboarding

A plain-English guide to what this platform is, how it's built, and how to run it
as an admin. (For the deeper developer reference, see `DEVELOPER.md`.)

---

## 1. What the product is

LinkedVelocity is a **two-sided marketplace for renting warmed-up LinkedIn profiles.**

- **Ambassadors (supply):** people who own real, aged LinkedIn accounts and earn
  monthly income by listing them for rent.
- **Renters / Customers (demand):** growth & outreach teams who rent those profiles
  to run outreach without risking their own account.
- **LinkedVelocity (you, the middle):** vets ambassadors, lists their profiles,
  takes rental payments via Stripe, and pays ambassadors via USDC.

> Note: the platform was originally branded **"Klabber" (klabber.co)** and is being
> rebranded to **LinkedVelocity (linkedvelocity.com)**. You'll still see "Klabber"
> in some places (e.g. Stripe, parts of the docs) — those are leftovers being cleaned up.

---

## 2. The tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (React 19, TypeScript, App Router) |
| Database | PostgreSQL hosted on **Neon** |
| ORM | Prisma 7.5 |
| Auth | Custom sessions (bcrypt + httpOnly cookies; Bearer tokens for the desktop app) |
| Payments IN | Stripe (rental subscriptions + invoicing) |
| Payouts OUT | USDC wallet system (crypto) |
| Profile delivery | **GoLogin** anti-detect browser + a dedicated proxy per account |
| Email | Resend |
| Desktop app | Electron + Puppeteer (`ambassador-app/`) |
| Hosting | Vercel — **auto-deploys on every push to `main`** |
| Alerts | Telegram bot webhook |

---

## 3. The moving parts

```
                    ┌─────────────────────────────────────┐
                    │      Next.js app (hosted on Vercel)  │
   Public site ─────┤  marketing · catalogue · /vs · blog  │
   Customers   ─────┤  dashboard (rent, billing)           │
   Ambassadors ─────┤  dashboard (apply, accounts, payouts)│
   Admin (you) ─────┤  /admin panel                        │
                    └───────────┬──────────────────────────┘
                                │ Prisma ORM
                    ┌───────────▼───────────┐
                    │  PostgreSQL (Neon)     │  ← all data lives here
                    └────────────────────────┘
   Stripe ........ rental subscriptions + invoices (money IN)
   USDC wallet ... ambassador payouts, deposit addresses (money OUT)
   GoLogin ....... browser profiles + share links (how renters USE a profile)
   Proxy pool .... a dedicated proxy per account (round-robin)
   Resend ........ transactional email
   Telegram ...... bot webhook → alerts
   Electron app .. desktop app ambassadors use to run profiles (Puppeteer)
```

**Key idea:** the website is mostly the *storefront, billing, and admin*. The real
"product" being delivered is a **GoLogin browser profile** (with its own proxy) that
the renter logs into. Much of the platform's real behaviour lives in GoLogin + Stripe
+ the proxy pool — not just in the database.

---

## 4. How the two sides flow, end to end

**Supply — a profile gets listed:**
```
Ambassador applies  →  Admin Accepts the application
                    →  a Profile (LinkedInAccount) is auto-created as "under_review"
                    →  GoLogin profile + proxy assigned
                    →  published to the public catalogue
```

**Demand — a profile gets rented:**
```
Customer browses catalogue  →  rents a profile
                            →  Stripe subscription starts
                            →  GoLogin share link appears in their dashboard
                            →  they open & use the profile in-browser
                            →  auto-renews monthly until cancelled
```

**Money:**
- Renters pay **you** via Stripe (rental subscriptions).
- You pay **ambassadors** via the USDC wallet / Payouts system.

---

## 5. The admin panel

Live at `https://www.linkedvelocity.com/admin/dashboard` (you must be logged in with an
admin account). The nav is grouped into two sides of the marketplace:

**Overview**
- **Dashboard** — revenue, active rentals, available profiles, customer count.

**Renters (demand side)**
- **Renters** (page titled "LinkedVelocity Accounts") — customers who rent profiles.
- **Rentals** — every rental agreement, live and past.
- **Transactions** — all money movement.

**Ambassadors (supply side)**
- **Applications** (page titled "Submissions") — new ambassador applications to accept/reject.
- **Ambassadors** (page titled "Account Owners") — people who supply profiles + payouts owed.
- **Profiles** (page titled "Linked Accounts") — the rentable profile inventory.
- **Payouts** (page titled "USDC Balances") — what you owe ambassadors.

### Accepting / rejecting an ambassador
On **Applications**, each row has a **status dropdown**: Received / Accepted / Rejected.
- **Accepting** auto-creates a Profile (LinkedInAccount, status `under_review`) for them.
- **Rejecting** just changes the status — nothing else is created.

### Making someone an admin
Admin is a `role` on the user record in the database. To promote someone:
```sql
UPDATE users SET role = 'admin' WHERE email = 'someone@example.com';
```
(Run against the production Neon database. Role is read live each request, so no re-login needed.)

---

## 6. Deploying changes

The live site auto-deploys from the `main` branch on GitHub via Vercel.

```bash
# 1. ALWAYS build locally first to catch errors
npm run build

# 2. If it compiles, commit and push
git add -A
git commit -m "your message"
git push origin main      # Vercel auto-deploys in ~2 minutes
```

Sensitive env vars (DATABASE_URL, Stripe keys) are stored in Vercel and are
**write-only** — they can't be pulled back out, so keep a secure copy elsewhere.

---

## 7. Gotchas worth knowing

- **Removing a rented profile is a *soft* action.** It marks the profile `removed`
  and the rental `cancelled` in the database, but it does **NOT**:
  - stop the renter's **GoLogin** access (an open session / saved share link keeps working), or
  - cancel their **Stripe** subscription (they keep getting billed).
  To truly cut someone off you must also revoke the GoLogin profile and cancel the Stripe sub.

- **Everyone who signs up is a `customer` by default** — including ambassadors. That's why
  an ambassador also appears in the Renters list. "Account Owners" is built separately from
  who actually owns listed profiles.

- **Admin sessions are short** (8 hours vs 24 for normal users) — you'll re-login more often.

---

## 8. Who built it

Built starting **March 2026**, mostly by **Samuel Adcock** with **Ina Dakay**, **Mickey**,
and the Ortus Club team — roughly 240 commits, the bulk of it in a ~2–3 week sprint in March.
April–May added SEO, blog content, and Telegram alerts. Ongoing work is the
LinkedVelocity rebrand and admin/UI improvements.
