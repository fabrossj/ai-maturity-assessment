/**
 * Simple rate limiting implementation using ioredis (for local development)
 * This is an alternative to the Upstash-based rate limiting
 *
 * Uses lazy Redis initialization to avoid connection on module load
 */

import { getRedis } from '@/lib/workers/redis';

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  headers: Record<string, string>;
}

// Simple sliding window rate limiter using ioredis
export async function rateLimit(
  request: Request,
  identifier?: string,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
): Promise<RateLimitResult> {
  const ip = identifier || getClientIp(request);
  const key = `ratelimit:${ip}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    // Get Redis instance (lazy - only connects when first used)
    const redis = getRedis();

    // Remove old entries outside the window
    await redis.zremrangebyscore(key, 0, windowStart);

    // Count requests in current window
    const count = await redis.zcard(key);

    if (count >= maxRequests) {
      // Get the oldest request timestamp to calculate reset time
      const oldestRequests = await redis.zrange(key, 0, 0, 'WITHSCORES');
      const oldestTimestamp = oldestRequests.length > 1 ? parseInt(oldestRequests[1]) : now;
      const reset = oldestTimestamp + windowMs;

      return {
        success: false,
        limit: maxRequests,
        remaining: 0,
        reset,
        headers: {
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(reset).toISOString(),
        },
      };
    }

    // Add current request
    await redis.zadd(key, now, `${now}-${Math.random()}`);

    // Set expiry on the key
    await redis.expire(key, Math.ceil(windowMs / 1000));

    const remaining = maxRequests - count - 1;
    const reset = now + windowMs;

    return {
      success: true,
      limit: maxRequests,
      remaining,
      reset,
      headers: {
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': new Date(reset).toISOString(),
      },
    };
  } catch (error) {
    console.error('Rate limiting error:', error);

    // Fail open - allow the request if rate limiting fails
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests,
      reset: now + windowMs,
      headers: {
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': maxRequests.toString(),
        'X-RateLimit-Reset': new Date(now + windowMs).toISOString(),
      },
    };
  }
}

// Helper function to get client IP from request
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  return 'unknown';
}
