export function readSocialRedirectUrl(result: unknown) {
  if (!result || typeof result !== "object") {
    return null;
  }

  const root = result as { url?: unknown; data?: unknown };

  if (typeof root.url === "string" && root.url.length > 0) {
    return root.url;
  }

  if (!root.data || typeof root.data !== "object") {
    return null;
  }

  const data = root.data as { url?: unknown };

  if (typeof data.url === "string" && data.url.length > 0) {
    return data.url;
  }

  return null;
}
