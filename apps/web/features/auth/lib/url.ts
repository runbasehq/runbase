export function isAbsoluteUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://");
}

export function getSafeOrigin(value: string | null | undefined) {
  if (!value || !isAbsoluteUrl(value)) {
    return null;
  }

  try {
    const parsed = new URL(value);
    if (!isAbsoluteUrl(parsed.toString())) {
      return null;
    }

    return parsed.origin;
  } catch {
    return null;
  }
}
