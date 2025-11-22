import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

// Initialize Redis client if Upstash credentials are available
const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

/**
 * Rate limiter for login attempts
 * Max 5 attempts per 15 minutes per IP
 */
export const loginRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "15 m"),
      analytics: true,
      prefix: "@upstash/ratelimit/login",
    })
  : null;

/**
 * Rate limiter for registration
 * Max 3 registrations per hour per IP
 */
export const registerRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, "1 h"),
      analytics: true,
      prefix: "@upstash/ratelimit/register",
    })
  : null;

/**
 * Rate limiter for 2FA verification
 * Max 10 attempts per 15 minutes per IP
 */
export const twoFactorRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "15 m"),
      analytics: true,
      prefix: "@upstash/ratelimit/2fa",
    })
  : null;

/**
 * Rate limiter for general API requests
 * Max 100 requests per minute per IP
 */
export const generalRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, "1 m"),
      analytics: true,
      prefix: "@upstash/ratelimit/general",
    })
  : null;

/**
 * Rate limiter for file uploads
 * Max 10 uploads per 15 minutes per user
 */
export const fileUploadRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "15 m"),
      analytics: true,
      prefix: "@upstash/ratelimit/file-upload",
    })
  : null;

/**
 * Get client IP from request
 */
export function getClientIP(request: Request): string {
  // Try to get IP from various headers (for proxies/load balancers)
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  const cfConnectingIP = request.headers.get("cf-connecting-ip");

  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }

  if (realIP) {
    return realIP;
  }

  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  return "unknown";
}

/**
 * Check rate limit and return result
 * Returns { success: true } if allowed, { success: false, limit, remaining, reset } if rate limited
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string,
): Promise<{
  success: boolean;
  limit?: number;
  remaining?: number;
  reset?: number;
}> {
  // If no Redis/limiter available, allow all requests (dev mode)
  if (!limiter) {
    console.warn("Rate limiting disabled - Upstash Redis not configured");
    return { success: true };
  }

  try {
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    // If rate limiting fails, allow the request (fail open)
    console.error("Rate limiting error:", error);
    return { success: true };
  }
}
