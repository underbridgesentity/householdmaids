import { headers } from "next/headers";
import { Redis } from "@upstash/redis";

/**
 * Fixed-window rate limiter.
 *  - If UPSTASH_REDIS_REST_URL/TOKEN are set, uses Upstash Redis so limits hold
 *    across serverless instances (required on Vercel — in-memory is per-instance
 *    and effectively a no-op there).
 *  - Otherwise falls back to an in-memory window (fine for a single instance / dev).
 */

let redis: Redis | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

type Bucket = { count: number; resetAt: number };
const memBuckets = new Map<string, Bucket>();

/** Returns true if the action is allowed, false if the limit is exceeded. */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  if (redis) {
    const redisKey = `rl:${key}`;
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.pexpire(redisKey, windowMs);
    }
    return count <= limit;
  }
  // In-memory fallback.
  const now = Date.now();
  const b = memBuckets.get(key);
  if (!b || now > b.resetAt) {
    memBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
