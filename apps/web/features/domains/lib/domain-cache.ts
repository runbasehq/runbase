export const CUSTOM_DOMAIN_KEY_PREFIX = "domain";

export function normalizeHostname(value: string) {
  return value.trim().toLowerCase().replace(/\.$/, "");
}

export function getCustomDomainCacheKey(domain: string) {
  return `${CUSTOM_DOMAIN_KEY_PREFIX}:${normalizeHostname(domain)}`;
}
