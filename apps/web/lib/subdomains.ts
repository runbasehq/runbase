import { getRedis } from "@/lib/redis";

export type SubdomainData = {
  emoji: string;
  createdAt: number;
};

export function sanitizeSubdomain(subdomain: string) {
  return subdomain.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

export function isValidIcon(str: string) {
  if (str.length > 10) {
    return false;
  }

  try {
    const emojiPattern = /[\p{Emoji}]/u;
    if (emojiPattern.test(str)) {
      return true;
    }
  } catch {
    return str.length >= 1 && str.length <= 10;
  }

  return str.length >= 1 && str.length <= 10;
}

export async function getSubdomainData(subdomain: string) {
  const sanitizedSubdomain = sanitizeSubdomain(subdomain);
  return getRedis().get<SubdomainData>(`subdomain:${sanitizedSubdomain}`);
}

export async function getAllSubdomains() {
  const redis = getRedis();
  const keys = await redis.keys("subdomain:*");

  if (!keys.length) {
    return [];
  }

  const values = await redis.mget<SubdomainData[]>(...keys);

  return keys.map((key, index) => {
    const subdomain = key.replace("subdomain:", "");
    const data = values[index];

    return {
      subdomain,
      emoji: data?.emoji || "❓",
      createdAt: data?.createdAt || Date.now(),
    };
  });
}
