# AGENTS.md

Monorepo-wide guidance for humans and coding agents.

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
- Use `features/auth/schemas` for auth validation/input schemas.
- Import feature modules via the `~` alias, which maps to `apps/web/features`.
- Example import: `~/auth/components/sign-in`
