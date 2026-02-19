## Feature Structure

- Place domain code under `features/<feature-name>/...`.
- For auth, use `features/auth/components` and `features/auth/schemas`.
- Use the `~` path alias for feature imports (`~/*` -> `features/*`).
- Example: `~/auth/components/sign-in`

## Styling Rules

- Do not use CSS `clamp()`.
- Always prioritize Tailwind CSS utility directives/classes for styling.
- Use `motion/react` for UI entrance/interaction animation.
