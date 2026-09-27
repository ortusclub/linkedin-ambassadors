# Wise Business: read-only payment checks

## Handoff status — 2026-09-27

Sam requested a reusable GitHub-based Wise integration so another assistant can continue payment investigations. The read-only CLI is implemented and tested with mocked API responses. **Live access is not yet configured or verified.** Next step: provide a Wise Business read-only token in the runtime, list profiles, select Sam's business profile, then verify a known transfer. Update this section after successful live verification, without recording private payment data.

This is a command-line integration for assistants with a checkout and command execution, not a new dashboard, automatic sync, or public API. GitHub access supplies the code and instructions; runtime credentials must be granted separately. There are no Wise write operations or database updates.

## Setup

Requires Node.js 20+ and `npm ci` in the repository.

1. In Sam's Wise Business profile, open **Your Account → Connect and manage apps → API tokens**. Create a **read-only** token.
2. Supply `WISE_API_TOKEN` through the assistant environment's secret store, or create `.env.wise.local` at the repository root using a local editor. This file is gitignored. Do not paste the token into chat, shell commands/history, GitHub issues, or source files. Restrict the local file with `chmod 600 .env.wise.local`.
3. Run `npm run wise -- profiles`. Choose the intended **BUSINESS** profile, not a personal profile. If multiple businesses are returned, confirm which belongs to this workflow.
4. Add that ID as `WISE_PROFILE_ID` in the same secret store or local file.
5. Run the commands below to verify access. Tokens are never printed by this tool.

Local configuration shape (placeholders only):

```dotenv
WISE_API_TOKEN=
WISE_PROFILE_ID=
```

Only `.env.wise.local` is loaded automatically, with existing environment variables taking precedence. Other app environment files are not loaded. A new assistant environment needs its own secure credential injection. GitHub Actions secrets are usable by configured Actions jobs, not readable by any assistant simply because it can access the repo. No workflow is installed here.

## Commands

```sh
npm run wise -- --help
npm run wise -- profiles
npm run wise -- transfers --from 2026-09-01T00:00:00Z --to 2026-09-30T23:59:59Z
npm run wise -- transfers --status outgoing_payment_sent --limit 100 --offset 0
npm run wise -- transfer TRANSFER_ID
npm run wise -- recipient RECIPIENT_ID
npm run test:wise
```

Transfer output includes Wise ID/link, creation timestamp, raw status, source amount/currency, recipient amount/currency, reference, recipient ID, and active-issue flag. Recipient output includes name, currency, and account type; bank numbers and full raw responses are excluded.

Each list call returns **one page**. Repeat the same filters with `--offset NEXT_OFFSET` until `nextOffset` is null. A full page only indicates that another page may exist. Date filters apply to transfer **creation**, not settlement. Use explicit timezone-bearing timestamps. Avoid claiming an exhaustive history from a single page or narrow date range. Transfer listings do not cover all card spending, direct debits, or balance activity.

## Answering “has this owner been paid?”

1. Identify the exact inventory account and its owner application. In `src/app/api/admin/accounts/route.ts`, applications are matched by normalized LinkedIn URL first, then owner email from account notes. One owner can supply multiple accounts.
2. Read `AmbassadorApplication.monthlyPayouts`: setup and monthly entries have `kind`, `amount`, `paidAt`, `method`, `accountId`, and optional `proofUrl`. The separate `paidAt` field can reflect a later bookkeeping update; prefer the matching ledger entry's date. Referrer commissions are separate `Payout` records, not owner payments.
3. When a proof link is a Wise transfer, extract its numeric transfer ID and run `transfer ID`. Use `recipient RECIPIENT_ID` if needed. Compare exact transfer ID, recipient, currency and amount against the ledger; names alone are insufficient. Preserve currency differences between source and recipient amounts. Creation date is not proof of payout date.
4. Report database-recorded payment and live Wise status separately. A saved Wise link or a created/pending transfer does not establish payment completion. Preserve Wise's raw status; check its current status guide before interpreting unfamiliar states. `outgoing_payment_sent` means sent out by Wise, not independent confirmation that the recipient acknowledged receipt.
5. If no exact transfer is linked, paginate a suitable date range and investigate candidate matches. Do not automatically mark a ledger entry paid or send a payment based on a fuzzy match. Keep actual payment records and recipient data out of git.

## Implementation and limitations

- `scripts/wise-readonly.mjs`: command parsing, dedicated environment loading, JSON output.
- `scripts/lib/wise-readonly.mjs`: GET-only methods, fixed production origin and API version `https://api.wise.com/2026Q3/`, timeout, redirects rejected, sanitized errors, business ownership checks.
- `tests/wise-readonly.test.mjs`: offline checks covering profile scoping, pagination, amounts/currencies, validation, and safe failures. They do not establish real-token compatibility.
- A 401 means inspect token configuration; a 403 means inspect account/endpoint permissions. Do not upgrade to full access merely to investigate a failure. A 429 requires waiting before retrying. Failures are errors, never “no payments.”
- No balance statement integration: availability depends on account region and permissions.
- There is no payment-sending, funding, cancelling, webhook, background job, or automatic reconciliation capability.

## Official references (checked 2026-09-27)

- [Personal token setup and regional limitations](https://docs.wise.com/guides/developer/auth-and-security/personal-api-token)
- [Business API access and read-only tokens](https://docs.wise.com/guides/product/send-money/use-cases/payouts-smbs)
- [Profiles](https://docs.wise.com/api-reference/profile/profilelist)
- [List transfers: profile, date filters, limit and offset](https://docs.wise.com/api-reference/standard-transfer/transferlist)
- [Transfers and status guide link](https://docs.wise.com/api-reference/transfer)
- [Recipient lookup](https://docs.wise.com/api-reference/recipient/recipientget)
