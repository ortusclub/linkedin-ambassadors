# LinkedVelocity — assistant starting point

This repository is LinkedVelocity (formerly Klabber), `ortusclub/linkedin-ambassadors`. The live site is https://linkedvelocity.com. Start with this file and task-specific documentation rather than relying on prior chat history.

## Wise payment investigations

Read [docs/wise.md](docs/wise.md) before working with Wise. It records setup, executable commands, limitations, payout reconciliation, and the current handoff state. The integration is read-only. GitHub access alone does not supply Wise or database credentials. Obtain credentials through the runtime's secret store; never commit or print them.

Use `npm run wise -- --help` and `npm run test:wise`. Update the handoff status after real connection verification. Do not copy customer payment data or local session transcripts into documentation.

## Project map

- Next.js App Router, React, TypeScript; Prisma/PostgreSQL.
- Inventory UI: `src/app/(admin)/admin/accounts/page.tsx`.
- Inventory API: `src/app/api/admin/accounts/route.ts`.
- Owner payments: `AmbassadorApplication.monthlyPayouts` in `prisma/schema.prisma`.
- Restriction flags/history: `src/lib/restriction.ts`; retain history when changing flags.
- Vercel project is still named `klabber`. Pushing `main` triggers production deployment. Publish only within the user's authorized scope, and verify the resulting deployment when deploying.

`DEVELOPER.md`, `HANDOFF.md` and other older guides may describe historical branding/auth/workflows. Check current code before relying on them. `SESSION-HANDOFF.md` is local and gitignored; it is not the portable source of truth and must not be committed.
