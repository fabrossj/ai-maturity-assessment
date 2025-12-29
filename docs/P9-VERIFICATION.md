# P9: Security - Verification Checklist

## ✅ Implementation Checklist

### Files Created/Modified

- [x] [lib/middleware/rate-limit.ts](../lib/middleware/rate-limit.ts) - Upstash-based rate limiting
- [x] [lib/middleware/rate-limit-simple.ts](../lib/middleware/rate-limit-simple.ts) - ioredis-based rate limiting
- [x] [next.config.mjs](../next.config.mjs) - Security headers configuration
- [x] [app/api/assessment/route.ts](../app/api/assessment/route.ts) - Example rate limiting integration
- [x] [scripts/test-security.ts](../scripts/test-security.ts) - Automated security tests
- [x] [.env.template](../.env.template) - Environment variable templates
- [x] [.env.local](../.env.local) - Local environment configuration
- [x] [package.json](../package.json) - Added `test:security` script
- [x] [docs/P9-SECURITY.md](P9-SECURITY.md) - Security documentation
- [x] [docs/P9-SETUP.md](P9-SETUP.md) - Setup guide
- [x] [docs/P9-VERIFICATION.md](P9-VERIFICATION.md) - This verification checklist

### Dependencies Installed

- [x] `@upstash/ratelimit` - Rate limiting library
- [x] `@upstash/redis` - Upstash Redis client

## 🧪 Manual Verification Steps

### Step 1: Security Headers

**Test Command:**
```bash
curl -I http://localhost:3000
```

**Expected Headers:**
```
✓ X-Frame-Options: DENY
✓ X-Content-Type-Options: nosniff
✓ Strict-Transport-Security: max-age=31536000; includeSubDomains
✓ X-XSS-Protection: 1; mode=block
✓ Referrer-Policy: strict-origin-when-cross-origin
✓ Permissions-Policy: camera=(), microphone=(), geolocation=()
```

**Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

### Step 2: Rate Limit Headers

**Test Command:**
```bash
curl -X POST http://localhost:3000/api/assessment \
  -H "Content-Type: application/json" \
  -d '{"userEmail":"test@example.com","userName":"Test","consentGiven":true}' \
  -i | grep X-RateLimit
```

**Expected Headers:**
```
✓ X-RateLimit-Limit: 100
✓ X-RateLimit-Remaining: [0-99]
✓ X-RateLimit-Reset: [ISO timestamp]
```

**Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

### Step 3: Rate Limiting Functionality

**Test Command:**
```bash
# Quick test - send 5 requests
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/assessment \
    -H "Content-Type: application/json" \
    -d "{\"userEmail\":\"test${i}@example.com\",\"userName\":\"Test${i}\",\"consentGiven\":true}" \
    -s -o /dev/null -w "Request $i: %{http_code}\n"
  sleep 0.1
done
```

**Expected Output:**
```
✓ Requests 1-5: 201 (or 400/404 depending on data)
✓ Rate limit headers decrease with each request
```

**Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

### Step 4: 429 Rate Limit Response

**Note:** This test requires sending 100+ requests. For a quick verification, lower the rate limit temporarily.

**Option A: Modify rate limit for testing**
```typescript
// In lib/middleware/rate-limit.ts or rate-limit-simple.ts
// Change from: limiter: Ratelimit.slidingWindow(100, '1 m')
// To:          limiter: Ratelimit.slidingWindow(5, '1 m')  // Only 5 requests per minute
```

**Option B: Run automated test**
```bash
pnpm test:security
```

**Expected Result:**
```
✓ 429 status code after limit exceeded
✓ Error message: "Too many requests. Please try again later."
✓ Rate limit headers in 429 response
```

**Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

### Step 5: Automated Test Suite

**Test Command:**
```bash
# Ensure dev server is running
pnpm dev

# In another terminal:
pnpm test:security
```

**Expected Output:**
```
✅ All security headers present and correct
✅ Rate limit headers present
✅ Rate limit triggers after configured limit
```

**Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

## 📋 Configuration Verification

### Environment Variables

Check that the following are configured in `.env.local`:

**For Upstash Implementation:**
```bash
✓ UPSTASH_REDIS_REST_URL (set to Upstash URL or local for dev)
✓ UPSTASH_REDIS_REST_TOKEN (set to token or dummy for dev)
```

**For Simple Redis Implementation:**
```bash
✓ REDIS_URL (set to redis://localhost:6379)
```

**Check Command:**
```bash
grep -E "(UPSTASH_REDIS|REDIS_URL)" .env.local
```

**Status:** ⬜ Not Verified / ✅ Verified / ❌ Missing Variables

### Redis Connection

**For Upstash:**
```bash
# Verify connection to Upstash (production)
curl -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN" \
  "$UPSTASH_REDIS_REST_URL/ping"
```

**For Local Redis:**
```bash
# Check Redis is running
docker-compose ps redis

# Test connection
docker exec -it redis redis-cli PING
# Expected: PONG
```

**Status:** ⬜ Not Verified / ✅ Connected / ❌ Connection Failed

### Build Verification

**Test Command:**
```bash
pnpm build
```

**Expected Output:**
```
✓ Build completes without errors
✓ No TypeScript errors
✓ No ESLint errors
```

**Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

## 🎯 Acceptance Criteria (from PROMPT_PACK_COMPLETO.md)

Based on the original requirements:

### Requirement 1: Rate Limiting
- [x] Rate limiter implemented using Upstash
- [x] Configured for 100 requests per minute
- [x] Sliding window algorithm
- [x] Redis backend configured
- [ ] **Verification:** 429 status code returned after limit exceeded

**Test:** Send 101 requests in 1 minute → Should get 429 on request 101

**Status:** ⬜ Not Verified / ✅ Verified

### Requirement 2: Security Headers
- [x] X-Frame-Options: DENY
- [x] X-Content-Type-Options: nosniff
- [x] Strict-Transport-Security: max-age=31536000
- [ ] **Verification:** Headers present in response

**Test:** `curl -I http://localhost:3000` → Should show all security headers

**Status:** ⬜ Not Verified / ✅ Verified

## 🔍 Final Verification

Run all verifications:

```bash
# 1. Start services
docker-compose up -d redis
pnpm dev

# 2. In another terminal, run all tests
pnpm build                    # Build test
pnpm test:security           # Security test suite
curl -I http://localhost:3000 # Header check

# 3. Check results
# ✓ All tests passed?
# ✓ All headers present?
# ✓ Rate limiting working?
```

## ✅ Sign-Off

**Implementation Complete:** ⬜ Yes / ⬜ No

**Tests Passing:** ⬜ All / ⬜ Partial / ⬜ None

**Ready for Production:** ⬜ Yes / ⬜ No / ⬜ With Changes

**Notes:**
```
[Add any notes about issues, workarounds, or pending items]
```

**Verified By:** _________________

**Date:** _________________

## 📝 Known Issues / Limitations

1. **Upstash Local Development:**
   - Upstash Redis client expects REST API endpoints
   - For local development, either:
     - Use Upstash cloud (recommended)
     - Switch to `rate-limit-simple.ts` for local Redis

2. **Rate Limit Persistence:**
   - Rate limit counters reset if Redis is restarted
   - This is expected behavior for development

3. **Testing Rate Limits:**
   - Sending 100+ requests for testing can be slow
   - Consider temporarily lowering limit during testing
   - Or use the automated test suite

## 🚀 Next Steps

After verification:

1. [ ] Apply rate limiting to all public API endpoints
2. [ ] Implement different rate limits for different endpoints
3. [ ] Set up monitoring for 429 responses
4. [ ] Consider implementing user-specific rate limits
5. [ ] Add Content-Security-Policy headers
6. [ ] Set up automated security header testing in CI/CD

## 📚 References

- [P9-SECURITY.md](P9-SECURITY.md) - Complete security documentation
- [P9-SETUP.md](P9-SETUP.md) - Setup and configuration guide
- [Upstash Rate Limiting Docs](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview)
- [Next.js Security Headers](https://nextjs.org/docs/app/api-reference/next-config-js/headers)
