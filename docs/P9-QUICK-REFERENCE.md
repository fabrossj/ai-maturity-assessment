# P9: Security - Quick Reference Card

## 🚀 Quick Commands

```bash
# Test security headers
curl -I http://localhost:3000

# Run security tests
pnpm test:security

# Build project
pnpm build

# Start dev server
pnpm dev
```

## 📁 Key Files

| File | Purpose |
|------|---------|
| [lib/middleware/rate-limit.ts](../lib/middleware/rate-limit.ts) | Upstash rate limiter |
| [lib/middleware/rate-limit-simple.ts](../lib/middleware/rate-limit-simple.ts) | ioredis rate limiter |
| [next.config.mjs](../next.config.mjs) | Security headers |
| [scripts/test-security.ts](../scripts/test-security.ts) | Test suite |
| [app/api/assessment/route.ts](../app/api/assessment/route.ts) | Example usage |

## 🔧 Configuration

### Environment Variables

```bash
# Option 1: Upstash (Production)
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token"

# Option 2: Local Redis (Development)
REDIS_URL="redis://localhost:6379"
```

### Rate Limit Settings

```typescript
// Current: 100 requests/minute
Ratelimit.slidingWindow(100, '1 m')

// Stricter: 10 requests/minute
Ratelimit.slidingWindow(10, '1 m')

// More permissive: 200 requests/minute
Ratelimit.slidingWindow(200, '1 m')
```

## 📊 Security Headers

```
✓ X-Frame-Options: DENY
✓ X-Content-Type-Options: nosniff
✓ Strict-Transport-Security: max-age=31536000; includeSubDomains
✓ X-XSS-Protection: 1; mode=block
✓ Referrer-Policy: strict-origin-when-cross-origin
✓ Permissions-Policy: camera=(), microphone=(), geolocation=()
```

## 🔒 Rate Limiting

**Current Limit:** 100 requests/minute per IP

**Response Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 2025-12-29T12:00:00.000Z
```

**429 Response:**
```json
{
  "error": "Too many requests. Please try again later."
}
```

## 💻 Code Snippets

### Add Rate Limiting to Route

```typescript
import { rateLimit } from '@/lib/middleware/rate-limit';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  // Apply rate limiting
  const rateLimitResult = await rateLimit(req);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: rateLimitResult.headers }
    );
  }

  // Your logic...

  return NextResponse.json(data, {
    headers: rateLimitResult.headers
  });
}
```

### Custom Rate Limit

```typescript
// Create custom limiter in lib/middleware/rate-limit.ts
export const customLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(50, '1 m'),
  prefix: '@upstash/ratelimit/custom',
});

// Use in route
const result = await rateLimit(req, undefined, 50, 60000);
```

## 🧪 Testing

### Manual Test

```bash
# Test headers
curl -I http://localhost:3000

# Test rate limit headers
curl -X POST http://localhost:3000/api/assessment \
  -H "Content-Type: application/json" \
  -d '{"userEmail":"test@example.com","userName":"Test","consentGiven":true}' \
  -i | grep X-RateLimit

# Test 429 response (send many requests)
for i in {1..105}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST http://localhost:3000/api/assessment \
    -H "Content-Type: application/json" \
    -d "{\"userEmail\":\"test${i}@example.com\",\"consentGiven\":true}"
done
```

### Automated Test

```bash
pnpm test:security
```

## 🔍 Troubleshooting

### Headers Not Showing
```bash
# Rebuild
pnpm build

# Check config
cat next.config.mjs | grep headers
```

### Rate Limiting Not Working
```bash
# Check Redis
docker-compose ps redis
docker exec -it redis redis-cli PING

# Check environment
grep UPSTASH .env.local

# Check imports
grep rate-limit app/api/*/route.ts
```

### Upstash Connection Error
```bash
# Verify environment variables
echo $UPSTASH_REDIS_REST_URL
echo $UPSTASH_REDIS_REST_TOKEN

# Switch to simple implementation
# Change imports from:
# '@/lib/middleware/rate-limit'
# To:
# '@/lib/middleware/rate-limit-simple'
```

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [P9-IMPLEMENTATION-SUMMARY.md](P9-IMPLEMENTATION-SUMMARY.md) | What was built |
| [P9-SECURITY.md](P9-SECURITY.md) | Complete documentation |
| [P9-SETUP.md](P9-SETUP.md) | Setup instructions |
| [P9-VERIFICATION.md](P9-VERIFICATION.md) | Testing checklist |
| [P9-QUICK-REFERENCE.md](P9-QUICK-REFERENCE.md) | This document |

## ✅ Verification Checklist

```bash
# 1. Check files exist
ls lib/middleware/rate-limit*.ts
ls scripts/test-security.ts

# 2. Check config
grep headers next.config.mjs

# 3. Run build
pnpm build

# 4. Test headers
curl -I http://localhost:3000 | grep -E "(X-Frame|X-Content|Strict-Transport)"

# 5. Run tests
pnpm test:security
```

## 🎯 Expected Outcomes

### Build
```
✓ Compiled successfully
✓ Generating static pages
✓ No errors
```

### Security Headers Test
```
✅ X-Frame-Options: DENY
✅ X-Content-Type-Options: nosniff
✅ Strict-Transport-Security: max-age=31536000; includeSubDomains
✅ All headers present
```

### Rate Limiting Test
```
✅ Rate limit headers present
✅ 429 status after limit exceeded
✅ Proper error message
```

## 🚨 Common Gotchas

1. **Upstash expects REST API, not Redis protocol**
   - Use Upstash cloud OR
   - Switch to `rate-limit-simple.ts` for local Redis

2. **All dev requests from same IP (localhost)**
   - Rate limits apply per IP
   - In dev, you might hit limit faster
   - Production has real client IPs

3. **Headers only visible after build**
   - Run `pnpm build` to apply header changes
   - `pnpm dev` may not show all headers in dev mode

4. **Redis must be running for rate limiting**
   - Start with: `docker-compose up -d redis`
   - Verify with: `docker exec -it redis redis-cli PING`

## 📈 Performance

- **Rate Limiting:** +5-20ms per request
- **Headers:** <1ms overhead
- **Redis Memory:** ~100 bytes per IP tracked
- **Build Time:** No significant impact

## 🔐 Security Benefits

- **Protects against:** Brute force, DoS, API abuse
- **Prevents:** Clickjacking, XSS, MIME sniffing
- **Enforces:** HTTPS connections
- **Limits:** Unauthorized API usage

## 🎓 Learn More

- Upstash Docs: https://upstash.com/docs/redis/sdks/ratelimit-ts
- Next.js Security: https://nextjs.org/docs/app/building-your-application/configuring/headers
- OWASP Headers: https://owasp.org/www-project-secure-headers/

---

**Version:** 1.0
**Last Updated:** 2025-12-29
**Status:** ✅ Production Ready
