# Proxy provisioning policy

Approved by Sam on 27 September 2026:

- Four accounts per proxy, across providers and proxy types.
- Reuse available working pool capacity before buying. Prefer the account country; existing capacity in other countries is allowed.
- Automatic Proxy-Cheap purchases are authorized for admin GoLogin provisioning and self-service onboarding.
- Monthly cap: US$100 total across both paths, including reserved and uncertain orders. Per-proxy purchase cap remains US$4, one month, dedicated static residential IPv4, no automatic renewal. Purchases are limited to IN/GB/US/PH.
- Do not retry an order with an uncertain charge outcome. Resume delivery checks by saved order ID.

Implementation: `automatic-proxy.ts` handles admin allocation, `self-service-onboarding.ts` handles DIY allocation; both use allocation lock 69100901 and include each other's purchase reservations in the budget. Admin orders use `proxy_purchase_attempts`; DIY orders retain their existing session ledger. Environment settings `PROXY_CHEAP_AUTO_BUY=true` and `PROXY_CHEAP_MONTHLY_BUDGET_USD=100` are configured in production. API credentials stay in Vercel.
