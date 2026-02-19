const RESERVED_WORKSPACE_SLUGS = new Set([
  "admin",
  "api",
  "app",
  "dashboard",
  "help",
  "onboarding",
  "root",
  "settings",
  "sign-in",
  "www",
]);

export const workspaceSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function sanitizeWorkspaceSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function validateWorkspaceSlug(slug: string) {
  if (!slug) {
    return "Workspace URL cannot be empty";
  }

  if (slug.length < 3) {
    return "Workspace URL must have at least 3 characters";
  }

  if (slug.length > 48) {
    return "Workspace URL must be 48 characters or less";
  }

  if (!workspaceSlugPattern.test(slug)) {
    return "Workspace URL can only include lowercase letters, numbers, and hyphens";
  }

  if (RESERVED_WORKSPACE_SLUGS.has(slug)) {
    return "This workspace URL is reserved";
  }

  return null;
}
