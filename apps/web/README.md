# Multi-tenant web app

This app uses host-based multi-tenancy with Next.js 16 `proxy.ts` and Upstash Redis.

## Environment

Copy `apps/web/.env.example` and set:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `NEXT_PUBLIC_ROOT_DOMAIN` (defaults to `localhost:3000`)
- `VERCEL_API_TOKEN` (required for custom domain add/verify/remove)
- `VERCEL_PROJECT_ID` (required for custom domain add/verify/remove)
- `VERCEL_TEAM_ID` (optional; required for team-scoped Vercel projects)
- `TRUST_PROXY_HEADERS` (`true` only when deployed behind trusted proxy/edge that sanitizes `X-Forwarded-*` headers)
- `POLAR_ACCESS_TOKEN` (required for checkout + portal API calls)
- `POLAR_WEBHOOK_SECRET` (required to verify `POST /api/webhooks/polar`)
- `POLAR_ENVIRONMENT` (`sandbox` or `production`, defaults to `sandbox`)
- `POLAR_API_BASE_URL` (optional override for API base URL)
- `POLAR_PRODUCT_ID_GROWTH_MONTHLY`
- `POLAR_PRODUCT_ID_GROWTH_YEARLY`
- `POLAR_PRODUCT_ID_PROFESSIONAL_MONTHLY`
- `POLAR_PRODUCT_ID_PROFESSIONAL_YEARLY`
- `POLAR_PRODUCT_ID_ENTERPRISE` (optional)
- `POLAR_WEBHOOK_URL` (required by `polar:setup-webhook` script)

## Run locally

```bash
bun --filter web dev
```

Root app: `http://localhost:3000`

Tenant app example: `http://acme.localhost:3000`

## Behavior

- Root (`/`) lets you create a subdomain tenant.
- Subdomain root (`tenant.<root-domain>/`) rewrites to `/s/[tenant]`.
- Verified custom domains rewrite to `/s/[tenant]` using Redis domain mappings.
- Subdomain `/admin` redirects to `/`.
- Root `/admin` lists tenants and supports delete.

Redis key format: `subdomain:{tenant}`.
Custom domain key format: `domain:{hostname}`.

## Production notes

- Configure wildcard DNS (`*.your-domain.com`) to your deployment.
- Set `NEXT_PUBLIC_ROOT_DOMAIN=your-domain.com`.
- Vercel preview hostnames like `tenant---branch.vercel.app` are parsed for tenant routing.
- For custom domains, add/verify domains via Dashboard and configure DNS records shown in the UI.

## Polar webhook setup

- In Polar dashboard, create webhook endpoint pointing to `https://<your-domain>/api/webhooks/polar`.
- Set raw JSON delivery format.
- Use the same secret in Polar and `POLAR_WEBHOOK_SECRET`.
- Subscribe to at least: `subscription.created`, `subscription.updated`, `subscription.active`, `subscription.canceled`, `subscription.revoked`, `subscription.uncanceled`, `order.paid`.

## Polar bootstrap scripts

- Create/update catalog products and print env values:
  - `bun --filter web polar:bootstrap-products`
- Create webhook endpoint via API:
  - set `POLAR_WEBHOOK_URL` first
  - `bun --filter web polar:setup-webhook`
  - output includes `POLAR_WEBHOOK_SECRET` when endpoint is created
