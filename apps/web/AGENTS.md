## Feature Structure

- Place domain code under `features/<feature-name>/...`.
- Use the `~` path alias for feature imports (`~/*` -> `features/*`).
- Example: `~/auth/components/sign-in`

## Backend Architecture (Inherited + Mandatory)

- This file inherits root `AGENTS.md`; backend architecture rules there are mandatory.
- For `apps/web` backend code, enforce `route -> service -> repository` with thin routes.
- Routes in `app/api/**/route.ts` handle boundary decode/parse + HTTP mapping only.
- Services own business logic; repositories own persistence/external IO only.
- Routes MUST NOT call repositories directly.

## Dependency Injection and Errors

- Use `Effect.Service` + `Layer` for services/repositories.
- Services and repositories must define `accessors: true`.
- Service and repository methods should be declared with `Effect.fn("FeatureName.methodName")`.
- Declare typed feature errors in `x.errors.ts`; map errors to HTTP only in route handlers.
- Validate/decode boundary payloads with feature `x.schema.ts`.

## Route Refactor Template (apps/web)

- Runtime wiring: create/reuse module-level `ManagedRuntime` instances in `lib/runtime.ts`.
- Route flow: parse transport input, decode using `x.schema.ts`, call `x.service.ts`, map `x.errors.ts` to HTTP.
- Route flow must call service accessors (`FeatureService.method(...)`) and must not resolve service tags via `yield* FeatureService`.
- Service flow: orchestrate business rules and cross-feature dependencies only through service/repository tags.
- Repository flow: keep all Drizzle and external provider calls in `x.repository.ts`; do not import Drizzle in routes/services.
- Error scaling rule: each feature owns its own error union/handler; do not introduce a global error union shared by all features.

## Mandatory Backend Feature Files

- For backend features under `features/<feature>/`, required files are:
- `x.schema.ts`
- `x.errors.ts`
- `x.repository.ts`
- `x.service.ts`

## Drizzle Rule

- Drizzle tables/clients/query builder usage is allowed only in `x.repository.ts`.
- Services/routes must not import Drizzle directly.

## Legacy Migration Policy

- Convention is mandatory immediately for new and touched backend code.
- Untouched legacy files may remain temporarily.
- If a PR touches legacy backend files, touched units must be migrated in same PR or include tracked follow-up issue with owner and due date.

## Styling Rules

- Do not use CSS `clamp()`.
- Always prioritize Tailwind CSS utility directives/classes for styling.
- Use `motion/react` for UI entrance/interaction animation.
