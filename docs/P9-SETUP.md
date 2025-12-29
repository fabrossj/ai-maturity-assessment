# P9: Security Setup Guide

## Quick Start

You have two options for implementing rate limiting:

### Option 1: Upstash Redis (Recommended for Production)

Best for production deployments and cloud environments.

**Pros:**
- Serverless-friendly
- Built-in analytics
- Easy to scale
- No infrastructure management

**Setup:**

1. Create an Upstash account at https://upstash.com
2. Create a new Redis database
3. Copy credentials to `.env.local`:

```bash
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token-here"
```

4. Use the Upstash rate limiter (already configured):
   - [lib/middleware/rate-limit.ts](../lib/middleware/rate-limit.ts)

### Option 2: Local Redis with ioredis (Best for Local Development)

Best for local development with existing Redis setup.

**Pros:**
- Uses existing Redis infrastructure
- No external dependencies
- Works with docker-compose setup
- Simpler for local testing

**Setup:**

1. Ensure Redis is running:
```bash
docker-compose up -d redis
```

2. Update API routes to use the simple rate limiter:

**Change from:**
```typescript
import { rateLimit } from '@/lib/middleware/rate-limit';
```

**To:**
```typescript
import { rateLimit } from '@/lib/middleware/rate-limit-simple';
```

3. Remove Upstash environment variables (optional)

## Current Implementation

The project is currently configured with **Option 1 (Upstash)** in:
- [app/api/assessment/route.ts](../app/api/assessment/route.ts)

## Switching Between Implementations

### Switch to Simple Redis (Option 2)

```bash
# 1. Update the assessment route
# Change import in: app/api/assessment/route.ts
# From: import { rateLimit } from '@/lib/middleware/rate-limit';
# To:   import { rateLimit } from '@/lib/middleware/rate-limit-simple';

# 2. Apply to all routes that use rate limiting
# Search for: @/lib/middleware/rate-limit
# Replace with: @/lib/middleware/rate-limit-simple
```

### Switch to Upstash (Option 1)

```bash
# 1. Set environment variables in .env.local
echo 'UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"' >> .env.local
echo 'UPSTASH_REDIS_REST_TOKEN="your-token"' >> .env.local

# 2. Update imports in API routes
# From: import { rateLimit } from '@/lib/middleware/rate-limit-simple';
# To:   import { rateLimit } from '@/lib/middleware/rate-limit';
```

## Verification

### 1. Check Configuration

```bash
# Check if Upstash is configured
grep UPSTASH .env.local

# Check which rate limiter is being used
grep "from '@/lib/middleware/rate-limit" app/api/**/*.ts
```

### 2. Test Security Headers

```bash
# Start the dev server
pnpm dev

# In another terminal:
curl -I http://localhost:3000
```

**Expected output:**
```
HTTP/1.1 200 OK
x-frame-options: DENY
x-content-type-options: nosniff
strict-transport-security: max-age=31536000; includeSubDomains
x-xss-protection: 1; mode=block
referrer-policy: strict-origin-when-cross-origin
permissions-policy: camera=(), microphone=(), geolocation=()
```

### 3. Test Rate Limiting

**Quick test (3 requests):**
```bash
for i in {1..3}; do
  curl -X POST http://localhost:3000/api/assessment \
    -H "Content-Type: application/json" \
    -d '{"userEmail":"test@example.com","userName":"Test","consentGiven":true}' \
    -i | grep -E "(HTTP|X-RateLimit)"
done
```

**Expected output:**
```
HTTP/1.1 201 Created
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 2025-12-29T...
```

**Full test (automated):**
```bash
pnpm test:security
```

## Troubleshooting

### Upstash Connection Issues

**Error:** `Error: Missing environment variables for Upstash Redis`

**Solution:**
```bash
# Check environment variables
cat .env.local | grep UPSTASH

# Ensure both are set:
# UPSTASH_REDIS_REST_URL
# UPSTASH_REDIS_REST_TOKEN
```

### Local Redis Connection Issues

**Error:** `Redis connection error: ECONNREFUSED`

**Solution:**
```bash
# Check if Redis is running
docker-compose ps redis

# Start Redis if not running
docker-compose up -d redis

# Test connection
docker exec -it redis redis-cli PING
# Should return: PONG
```

### Rate Limiting Not Working

1. **Check Redis Connection:**
```bash
# For Upstash: verify credentials
curl -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN" \
  "$UPSTASH_REDIS_REST_URL/ping"

# For local Redis:
docker exec -it redis redis-cli PING
```

2. **Check Rate Limit Keys:**
```bash
# Local Redis only:
docker exec -it redis redis-cli KEYS "*ratelimit*"
```

3. **Verify Import:**
```bash
# Check which rate limiter is imported
grep "rate-limit" app/api/assessment/route.ts
```

### Headers Not Appearing

1. **Rebuild application:**
```bash
pnpm build
```

2. **Check Next.js config:**
```bash
cat next.config.mjs | grep headers
```

3. **Test in production mode:**
```bash
pnpm build
pnpm start
curl -I http://localhost:3000
```

## Checklist

- [ ] Choose rate limiting implementation (Upstash or Simple)
- [ ] Configure environment variables
- [ ] Update API route imports if needed
- [ ] Start Redis (for Simple implementation)
- [ ] Build the application: `pnpm build`
- [ ] Test security headers: `curl -I http://localhost:3000`
- [ ] Test rate limiting: `pnpm test:security`
- [ ] Verify 429 responses after limit exceeded

## Next Steps

After completing setup:

1. Apply rate limiting to other API endpoints
2. Customize rate limits per endpoint
3. Set up monitoring for 429 responses
4. Consider implementing user-specific rate limits
5. Review and adjust limits based on usage

See [P9-SECURITY.md](P9-SECURITY.md) for detailed documentation.
