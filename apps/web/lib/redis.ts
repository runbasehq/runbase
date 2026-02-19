import { Redis } from "@upstash/redis";

let redisClient: Redis | null = null;

export function getRedis() {
  if (redisClient) {
    return redisClient;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      "Missing Upstash credentials: set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN",
    );
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}
