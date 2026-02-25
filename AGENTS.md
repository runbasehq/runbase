# AGENTS.md

Monorepo-wide guidance for humans and coding agents.

## Package Manager

- Use `pnpm` as the package manager across this monorepo.
- Prefer `pnpm run <script>` for scripts and `pnpm dlx <tool>` for one-off CLIs.

## Commit Messages

Use Conventional Commits for every commit:

- Format: `<type>(<scope>): <subject>`
- Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
- Use imperative, present-tense subjects (example: `add auth middleware`)
- Keep subject concise (prefer <= 72 chars), no trailing period
- Use `!` for breaking changes (example: `feat(api)!: remove v1 endpoints`)
- Add a `BREAKING CHANGE:` footer in the body when applicable

Examples:

- `feat(web): add onboarding flow`
- `fix(api): handle null user ids`
- `docs(monorepo): document release process`

## Web Feature Aliases

For `apps/web`, organize domain code under `features/<feature-name>/...`.

- Use `features/auth/components` for auth UI components.
- Import feature modules via the `~` alias (`~/*` -> `apps/web/features/*`).
- Example import: `~/auth/components/sign-in`

## Web Client Async Data

- For `apps/web`, client-side async data policy is defined in `apps/web/AGENTS.md` and is mandatory for web changes.

## Effect-TS Backend Architecture (Mandatory)

- Backend/domain flow MUST be `route -> service -> repository`.
- Routes MUST only handle transport concerns (parse/decode input, call service, map response).
- Services MUST own business logic and orchestration.
- Repositories MUST own persistence and external data access only.
- Routes MUST NOT call repositories directly.

## Layering and Dependency Direction

- Dependencies must flow inward: route depends on service, service depends on repository.
- Repository code MUST NOT depend on route/web frameworks.
- Shared cross-feature logic should be consumed via services, not repository imports from routes.

## Dependency Injection (Effect.Service / Layer)

- Services and repositories MUST use `Effect.Service` and be wired through `Layer` composition.
- Services and repositories MUST define `accessors: true` and expose callable methods via service accessors.
- Service and repository methods MUST be declared with `Effect.fn("FeatureName.methodName")`.
- Domain logic MUST depend on service tags/context, never concrete live implementations.
- Layer wiring MUST happen at runtime/app entry points, not inside route/service methods.

## Schemas at Boundaries

- Boundary validation/decoding MUST use feature `x.schema.ts`.
- Routes MUST pass typed data to services.
- Services/repositories MUST NOT parse raw HTTP payloads.

## Typed Errors and Feature Error Handlers

- Domain errors MUST be typed and declared in feature `x.errors.ts`.
- Services/repositories MUST return typed errors, not generic string errors.
- Error-to-HTTP mapping MUST happen at route boundaries.
- Each feature MUST own its error mapping; avoid global "god" error unions.

## Effect + Next.js API Implementation Pattern

- For backend features, create and use all of these files: `x.schema.ts`, `x.errors.ts`, `x.repository.ts`, `x.service.ts`.
- `x.repository.ts` MUST contain all Drizzle and external IO calls (DB, Redis, rate-limit providers).
- `x.service.ts` MUST orchestrate use-cases and compose repository methods; no HTTP/Next types in services.
- `x.errors.ts` MUST define typed domain errors (for example via `Data.TaggedError`) and feature-scoped error-to-HTTP mapping helpers.
- `x.schema.ts` MUST own request/response boundary decoding/validation utilities used by routes.
- Route handlers in `app/api/**/route.ts` MUST:
- Read transport data (headers, params, cookies, request body).
- Decode with feature schema helpers.
- Call a feature service.
- Map typed failures to HTTP only at the route boundary.
- `ManagedRuntime.make(...)` SHOULD be created once at module scope in runtime entrypoints and reused by route handlers.
- Avoid global cross-feature `AppError` unions; each feature owns its union and handler in `x.errors.ts`.

## API Route Conventions (Next.js app/api)

- API handlers MUST live at `app/api/**/route.ts`.
- Route modules MUST export method handlers (`GET`, `POST`, `PATCH`, etc.).
- Route modules MUST stay thin and delegate business behavior to services.

## API Route Service Usage (Mandatory)

- Route handlers in `app/api/**/route.ts` MUST call domain behavior through `x.service.ts` only.
- Route handlers MUST use service accessors (`FeatureService.method(...)`) instead of resolving service instances with `yield* FeatureService`.
- Route handlers MUST NOT import `x.repository.ts`, `@/lib/db`, Drizzle query builders, or `features/**/lib/queries`.
- If a route needs domain behavior that does not exist yet, add a service method first, then call that service method from the route.

## Repository and Drizzle Rules

- Drizzle tables/clients/query builders MUST only be imported/used in `x.repository.ts`.
- Services and routes MUST NOT import Drizzle directly.

## Mandatory Feature File Layout

- Backend feature files MUST use these names under `features/<feature>/`:
- `x.schema.ts`
- `x.errors.ts`
- `x.repository.ts`
- `x.service.ts`

## Migration and Legacy Code Policy

- This convention is mandatory immediately.
- Untouched legacy files may remain temporarily.
- If a PR touches legacy backend files, touched units MUST be migrated in the same PR, or the PR must include a tracked follow-up issue with owner and due date.

## Styling Rules

- Do not use CSS `clamp()`.
- Always prioritize Tailwind CSS utility directives/classes for styling.
- For UI entrance/interaction animation in `apps/web`, use `motion/react`.

## Axiom Logging (apps/web)

- Backend OAuth logs use `apps/web/lib/axiom-server.ts`.
- Routes should create logger with `createAxiomLogger(source, baseFields?)`.
- Routes should pass logger into service methods that need logs.
- Services should log with `log.debug/info/warn/error(...)` and avoid raw `console.*`.
- Routes must call `await log.flush()` in `finally` blocks.
