# P9: Security Implementation

## Overview
This document describes the security features implemented in P9, including rate limiting and security headers.

## Features Implemented

### 1. Rate Limiting

Rate limiting is implemented using `@upstash/ratelimit` with a sliding window algorithm.

**Configuration:**
- Limit: 100 requests per minute per IP address
- Algorithm: Sliding window
- Storage: Redis (Upstash Redis for production, local Redis for development)

**Files:**
- [lib/middleware/rate-limit.ts](../lib/middleware/rate-limit.ts) - Rate limiting middleware
- [app/api/assessment/route.ts](../app/api/assessment/route.ts) - Example implementation

**Usage in API Routes:**

```typescript
import { rateLimit } from '@/lib/middleware/rate-limit';

export async function POST(req: Request) {
  // Apply rate limiting
  const rateLimitResult = await rateLimit(req);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: rateLimitResult.headers
      }
    );
  }

  // Your API logic here...

  // Include rate limit headers in successful response
  return NextResponse.json(
    { data: result },
    { status: 200, headers: rateLimitResult.headers }
  );
}
```

### 2. Security Headers

Security headers are configured in [next.config.mjs](../next.config.mjs) and applied to all routes.

**Headers Implemented:**

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Frame-Options` | `DENY` | Prevents clickjacking by disabling iframe embedding |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME type sniffing |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Enforces HTTPS connections |
| `X-XSS-Protection` | `1; mode=block` | Enables XSS filter in older browsers |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controls referrer information |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Restricts browser features |

## Environment Configuration

### Development Setup

Add the following to your `.env.local`:

```bash
# Upstash Redis (for rate limiting)
UPSTASH_REDIS_REST_URL="http://localhost:6379"
UPSTASH_REDIS_REST_TOKEN="local_development_token"
```

**Note:** For local development with standard Redis (not Upstash REST API), you may need to:

1. **Option A: Use Upstash Cloud (Recommended for production)**
   - Sign up at https://upstash.com
   - Create a Redis database
   - Copy the REST URL and token to your `.env.local`

2. **Option B: Use Local Redis with REST adapter**
   - Run Redis locally: `docker-compose up -d redis`
   - Use upstash-redis REST compatibility layer
   - Or modify `lib/middleware/rate-limit.ts` to use `ioredis` directly

### Production Setup

For production, use Upstash Redis:

```bash
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token-here"
```

## Testing

### Run Security Tests

```bash
pnpm test:security
```

This will test:
- All security headers are present and correct
- Rate limiting triggers after the configured limit
- Rate limit headers are included in responses

### Manual Testing

#### Test Security Headers

```bash
curl -I http://localhost:3000
```

Expected headers:
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

#### Test Rate Limiting

Send multiple requests to trigger rate limiting:

```bash
# Send 105 requests (limit is 100/minute)
for i in {1..105}; do
  curl -X POST http://localhost:3000/api/assessment \
    -H "Content-Type: application/json" \
    -d '{"userEmail":"test@example.com","userName":"Test","consentGiven":true}' \
    -w "\nStatus: %{http_code}\n"
done
```

Expected behavior:
- First 100 requests: Success (201) with rate limit headers
- Requests 101+: Rate limited (429) with error message

Rate limit headers in response:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 2025-12-29T12:00:00.000Z
```

## Applying Rate Limiting to Other Routes

To add rate limiting to other API routes:

1. Import the middleware:
```typescript
import { rateLimit } from '@/lib/middleware/rate-limit';
```

2. Add rate limit check at the start of your handler:
```typescript
export async function GET(req: Request) {
  const rateLimitResult = await rateLimit(req);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: rateLimitResult.headers }
    );
  }

  // Your logic...

  return NextResponse.json(data, {
    status: 200,
    headers: rateLimitResult.headers
  });
}
```

## Customizing Rate Limits

To customize rate limits for specific endpoints, create a new rate limiter instance:

```typescript
// lib/middleware/rate-limit.ts

// Stricter limit for sensitive endpoints
export const authLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
  prefix: '@upstash/ratelimit/auth',
});

// More permissive for public endpoints
export const publicLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(200, '1 m'), // 200 requests per minute
  prefix: '@upstash/ratelimit/public',
});
```

## Troubleshooting

### Rate Limiting Not Working

1. **Check Redis Connection:**
   ```bash
   docker-compose ps redis
   ```

2. **Verify Environment Variables:**
   ```bash
   echo $UPSTASH_REDIS_REST_URL
   echo $UPSTASH_REDIS_REST_TOKEN
   ```

3. **Check Redis Data:**
   ```bash
   docker exec -it redis redis-cli
   KEYS *ratelimit*
   ```

### Security Headers Not Present

1. **Rebuild the application:**
   ```bash
   pnpm build
   ```

2. **Check Next.js config:**
   Verify [next.config.mjs](../next.config.mjs) has the headers configuration

3. **Test in production mode:**
   ```bash
   pnpm build && pnpm start
   curl -I http://localhost:3000
   ```

## Security Best Practices

1. **Rate Limiting:**
   - Apply stricter limits to authentication endpoints
   - Use different limits for different user tiers
   - Monitor rate limit violations for abuse detection

2. **Headers:**
   - Keep HSTS max-age at 1 year minimum
   - Update Permissions-Policy based on features used
   - Consider adding Content-Security-Policy for enhanced XSS protection

3. **Monitoring:**
   - Track 429 responses in logs
   - Alert on unusual rate limit patterns
   - Review and adjust limits based on usage patterns

## Next Steps

Consider implementing:
- [ ] Content Security Policy (CSP) headers
- [ ] API key authentication for programmatic access
- [ ] IP-based blocking for repeated violations
- [ ] Request signing for sensitive operations
- [ ] Additional rate limit tiers for authenticated users

## References

- [Upstash Rate Limiting Documentation](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview)
- [Next.js Security Headers](https://nextjs.org/docs/app/api-reference/next-config-js/headers)
- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
