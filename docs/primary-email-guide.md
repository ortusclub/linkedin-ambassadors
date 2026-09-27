# Primary email guide

`/guide/primary-email` is an unlisted mobile guide for existing ambassadors. The owner enters their saved personal/contact email, verifies a six-digit code, and sees the account's existing assigned login email. No new email address is allocated and no account login secret is disclosed.

The owner must match exactly one active inventory account, using the linked application (session, normalized profile URL, or existing Owner note) or saved personal email. Ambiguous matches fail closed. The LV inbox itself is not accepted as a personal verification destination. Ownership and the assigned address are checked again before forwarding and status access.

Verification is limited to five attempts per challenge, five sends per destination per day, one per minute, 20 per IP per hour and 200 globally per hour. Challenges expire in ten minutes. A verified route lasts thirty minutes. The browser keeps its random bearer token in sessionStorage; only its SHA-256 hash is stored server-side. Codes are HMACed using the existing onboarding email secret and are never logged.

The signed Resend inbound webhook routes active recovery first, then existing onboarding. Only LinkedIn email-address confirmation subjects/links/codes are forwarded. Sign-in, password-reset, and two-factor messages are excluded. Deliveries are claimed durably and use provider idempotency. Forwarding uses existing ONBOARDING_EMAIL_* configuration. Older addresses outside the configured receiving domains display the team-help option after personal verification.

Completion records an owner attestation in inventory notes. It does not change availability, restrictions, or payment eligibility; the team still verifies access. The help calendar and two-step verification guide remain visible.

Tests: `node --test tests/primary-email-recovery.test.cjs tests/onboarding-email.test.cjs tests/issue-email.test.cjs tests/display-currency.test.cjs`.

# Related presentation changes

Referrers can select USD-first or PHP-first. USD-first is the default. The portal saves `referrers.display_currency`, shared with its onboarding wizard and remembered across devices. Public ambassador signup remembers its visitor's choice per referral in localStorage. This is a display preference only; payout configuration is unchanged. Agreed programme offers show their existing USD/PHP anchors. Ledger balances retain their actual stored denomination and mark converted reference values with ≈ using the existing PHP_PER_USD constant.

`linkedin_accounts.two_factor_received_at` is maintained by a database trigger when the key is inserted or changes. Historical keys keep an unknown date; generic account update timestamps must not be substituted. Issue messages ask the owner to check enabled/working 2FA and provide a replacement setup key if needed. Existing raw stored keys are not included in outgoing messages.
