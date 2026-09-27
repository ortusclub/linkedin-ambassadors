# Restricted account recovery

`/guide/restricted-account` explains owner-led LinkedIn restriction recovery, linking LinkedIn's official identity verification and email-access help. Restriction messages omit primary-email and 2FA reset checklists. Existing original credentials are described as usable only if still valid.

The sign-in-code tool uses POST `/api/account-recovery`. An emailed verification challenge uses the existing recovery rate limits, five-attempt limit and hashed token storage. Code access requires a verified personal inbox uniquely matched to the current account, rechecked on each request, and verification less than ten minutes old. Unknown/new-address sessions cannot obtain an existing account's code. Removed accounts and unusable keys are rejected. Only the current code, expiry and login email are returned; never the setup key. Responses are no-store, origin checked; tokens remain in browser memory, not URLs or persistent storage.

Owner email matching is shared with primary-email recovery. If no unique match exists, the owner must contact the team. No automatic restriction clearing or payment change occurs; staff must confirm restored access.

Sources checked 2026-09-27:
- https://www.linkedin.com/help/linkedin/answer/a1339720
- https://www.linkedin.com/help/linkedin/answer/a1376104
