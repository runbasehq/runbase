# Multi-tenant web app

This app uses host-based multi-tenancy with Next.js 16 `proxy.ts` and Upstash Redis.

## Environment

Copy `apps/web/.env.example` and set:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `NEXT_PUBLIC_ROOT_DOMAIN` (defaults to `localhost:3000`)

## Run locally

```bash
bun --filter web dev
```

Root app: `http://localhost:3000`

Tenant app example: `http://acme.localhost:3000`

## Behavior

- Root (`/`) lets you create a subdomain tenant.
- Subdomain root (`tenant.<root-domain>/`) rewrites to `/s/[tenant]`.
- Subdomain `/admin` redirects to `/`.
- Root `/admin` lists tenants and supports delete.

Redis key format: `subdomain:{tenant}`.

## Production notes

- Configure wildcard DNS (`*.your-domain.com`) to your deployment.
- Set `NEXT_PUBLIC_ROOT_DOMAIN=your-domain.com`.
- Vercel preview hostnames like `tenant---branch.vercel.app` are parsed for tenant routing.
