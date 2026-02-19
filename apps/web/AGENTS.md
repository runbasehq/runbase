## Feature Structure

- Place domain code under `features/<feature-name>/...`.
- For auth, use `features/auth/components` and `features/auth/schemas`.
- Use the `~` path alias for feature imports (`~/*` -> `features/*`).
- Example: `~/auth/components/sign-in`
