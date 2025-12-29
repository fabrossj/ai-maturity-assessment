import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Connect to Redis using environment variable
// For local development, this should point to your local Redis instance
// For production, use Upstash Redis URL
const redis = Redis.fromEnv();

// Create rate limiter: 100 requests per minute per IP
export const apiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  analytics: true,
  prefix: '@upstash/ratelimit',
});

// Helper function to get client IP from request
export function getClientIp(request: Request): string {
  // Check various headers for the real IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  // Fallback to a default identifier
  return 'unknown';
}

// Middleware function to apply rate limiting
export async function rateLimit(request: Request, identifier?: string) {
  const ip = identifier || getClientIp(request);
  const { success, limit, reset, remaining } = await apiLimiter.limit(ip);

  return {
    success,
    limit,
    reset,
    remaining,
    headers: {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': new Date(reset).toISOString(),
    }
  };
}
