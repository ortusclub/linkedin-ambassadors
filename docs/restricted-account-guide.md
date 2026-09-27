# Restricted account recovery

`/guide/restricted-account` explains owner-led LinkedIn restriction recovery, linking LinkedIn's official identity verification and email-access help. Restriction messages omit primary-email and 2FA reset checklists. Existing original credentials are described as usable only if still valid.

The standalone authenticator tool is `/account-code`. It requires a private account link and the matching LV login email, not personal-email verification. Admin issue actions obtain an account-bound link from the authenticated `/api/admin/accounts/[id]/code-link` endpoint and include it in owner messages. Referral-partner messages receive the private link only when the admin explicitly clicks Include saved login details in their email preview. New private links use `/c#` followed by a random 22-character token. Only the SHA-256 hash, account ID and 24-hour expiry are stored in account_code_links. Links contain no password or 2FA key. Previously issued signed links remain accepted until their original expiry. The token is passed in the URL fragment, removed from the address bar on load, held in memory and sent only in the same-origin POST body. Reopening the original link restores a refreshed page.

Code requests are denied server-side when status is available, rented, trial, retired or removed, or any active/pending-access/payment-failed rental exists. Status and rental relationships are rechecked on every request, so an older private link does not bypass a status change. Login email must match the linked account. Only current code, expiry and login email are returned, never the setup key. Responses are no-store and origin checked. Legacy verified-owner sessions also retain these status restrictions.

Admins can explicitly insert saved login details beside the sign-in instructions in either an ambassador or referral-partner email preview. Inclusion requires clicking Include saved login details; the admin-only endpoint decrypts saved passwords for preview, returns no-store responses and sends nothing itself. Email bodies are not written to account notes.

Email-address confirmation remains separate: `/guide/primary-email` verifies the personal destination before forwarding email-address confirmations. No automatic restriction clearing or payment change occurs; staff must confirm restored access.

Sources checked 2026-09-27:
- https://www.linkedin.com/help/linkedin/answer/a1339720
- https://www.linkedin.com/help/linkedin/answer/a1376104
