import { rootDomain } from "@/lib/utils";

function toOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function getAuthRootOrigin() {
  const configuredOrigin = process.env.NEXT_PUBLIC_BETTER_AUTH_URL;

  if (configuredOrigin) {
    const parsedOrigin = toOrigin(configuredOrigin);
    if (parsedOrigin) {
      return parsedOrigin;
    }
  }

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${rootDomain}`;
  }

  return `http://${rootDomain}`;
}
