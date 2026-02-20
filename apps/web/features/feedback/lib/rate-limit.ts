import { Ratelimit } from "@upstash/ratelimit";

import { getRedis } from "@/lib/redis";

let voteRateLimit: Ratelimit | null = null;
let votePerPostRateLimit: Ratelimit | null = null;

function getVoteRateLimit() {
  if (!voteRateLimit) {
    voteRateLimit = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(20, "1 h"),
      prefix: "ratelimit:feedback:vote",
    });
  }

  return voteRateLimit;
}

function getVotePerPostRateLimit() {
  if (!votePerPostRateLimit) {
    votePerPostRateLimit = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(3, "24 h"),
      prefix: "ratelimit:feedback:vote-post",
    });
  }

  return votePerPostRateLimit;
}

export async function enforceVoteRateLimit(workspaceId: string, ip: string) {
  return getVoteRateLimit().limit(`${workspaceId}:${ip}`);
}

export async function enforceVotePerPostRateLimit(
  workspaceId: string,
  ip: string,
  postId: string,
) {
  return getVotePerPostRateLimit().limit(`${workspaceId}:${ip}:${postId}`);
}
