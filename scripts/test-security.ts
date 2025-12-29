/**
 * Test script for P9: Security features
 * Tests rate limiting and security headers
 */

const BASE_URL = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: TestResult[] = [];

// Helper function to add test result
function addResult(name: string, passed: boolean, message: string, details?: any) {
  results.push({ name, passed, message, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}: ${message}`);
  if (details) {
    console.log('   Details:', details);
  }
}

// Test 1: Security Headers
async function testSecurityHeaders() {
  console.log('\n📋 Test 1: Security Headers');
  console.log('='.repeat(50));

  try {
    const response = await fetch(BASE_URL);
    const headers = response.headers;

    const expectedHeaders = {
      'x-frame-options': 'DENY',
      'x-content-type-options': 'nosniff',
      'strict-transport-security': 'max-age=31536000; includeSubDomains',
      'x-xss-protection': '1; mode=block',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'permissions-policy': 'camera=(), microphone=(), geolocation=()',
    };

    const foundHeaders: Record<string, string> = {};
    let allHeadersPresent = true;

    for (const [key, expectedValue] of Object.entries(expectedHeaders)) {
      const actualValue = headers.get(key);
      foundHeaders[key] = actualValue || 'NOT FOUND';

      if (!actualValue) {
        addResult(
          `Header: ${key}`,
          false,
          `Missing header`,
          { expected: expectedValue }
        );
        allHeadersPresent = false;
      } else if (actualValue !== expectedValue) {
        addResult(
          `Header: ${key}`,
          false,
          `Header value mismatch`,
          { expected: expectedValue, actual: actualValue }
        );
        allHeadersPresent = false;
      } else {
        addResult(
          `Header: ${key}`,
          true,
          `Header present with correct value`
        );
      }
    }

    if (allHeadersPresent) {
      addResult('Security Headers', true, 'All security headers are present and correct');
    } else {
      addResult('Security Headers', false, 'Some security headers are missing or incorrect');
    }
  } catch (error) {
    addResult('Security Headers', false, `Error testing headers: ${error}`);
  }
}

// Test 2: Rate Limiting
async function testRateLimit() {
  console.log('\n🚦 Test 2: Rate Limiting');
  console.log('='.repeat(50));

  try {
    const testPayload = {
      userEmail: 'test@example.com',
      userName: 'Rate Limit Tester',
      consentGiven: true,
    };

    let rateLimitHit = false;
    let requestCount = 0;
    let rateLimitHeaders: Record<string, string> = {};

    // Send requests until we hit the rate limit or reach a maximum
    const maxRequests = 110; // Slightly more than the limit of 100

    console.log(`Sending requests to test rate limiting...`);

    for (let i = 0; i < maxRequests; i++) {
      const response = await fetch(`${BASE_URL}/api/assessment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload),
      });

      requestCount = i + 1;

      // Capture rate limit headers
      if (response.headers.get('x-ratelimit-limit')) {
        rateLimitHeaders = {
          limit: response.headers.get('x-ratelimit-limit') || '',
          remaining: response.headers.get('x-ratelimit-remaining') || '',
          reset: response.headers.get('x-ratelimit-reset') || '',
        };
      }

      if (response.status === 429) {
        rateLimitHit = true;
        addResult(
          'Rate Limit Triggered',
          true,
          `Rate limit triggered after ${requestCount} requests`,
          { status: 429, headers: rateLimitHeaders }
        );
        break;
      }

      // Small delay to avoid overwhelming the server
      if (i % 10 === 0) {
        console.log(`   Sent ${i + 1} requests...`);
      }
    }

    if (!rateLimitHit) {
      addResult(
        'Rate Limit',
        false,
        `Rate limit was NOT triggered after ${requestCount} requests. Expected 429 response.`,
        { lastHeaders: rateLimitHeaders }
      );
    }

    // Test rate limit headers presence
    if (Object.keys(rateLimitHeaders).length > 0) {
      addResult(
        'Rate Limit Headers',
        true,
        'Rate limit headers are present',
        rateLimitHeaders
      );
    } else {
      addResult(
        'Rate Limit Headers',
        false,
        'Rate limit headers are missing'
      );
    }
  } catch (error) {
    addResult('Rate Limit', false, `Error testing rate limit: ${error}`);
  }
}

// Test 3: Rate Limit Headers on Normal Request
async function testRateLimitHeaders() {
  console.log('\n📊 Test 3: Rate Limit Headers on Normal Request');
  console.log('='.repeat(50));

  try {
    const response = await fetch(`${BASE_URL}/api/questionnaire/latest`);

    const limit = response.headers.get('x-ratelimit-limit');
    const remaining = response.headers.get('x-ratelimit-remaining');
    const reset = response.headers.get('x-ratelimit-reset');

    if (limit && remaining && reset) {
      addResult(
        'Rate Limit Headers on Normal Request',
        true,
        'Rate limit headers are present on normal requests',
        { limit, remaining, reset }
      );
    } else {
      addResult(
        'Rate Limit Headers on Normal Request',
        false,
        'Rate limit headers missing on normal request',
        { limit, remaining, reset }
      );
    }
  } catch (error) {
    addResult(
      'Rate Limit Headers on Normal Request',
      false,
      `Error: ${error}`
    );
  }
}

// Main execution
async function runTests() {
  console.log('🔐 P9: Security Testing');
  console.log('='.repeat(50));
  console.log(`Testing against: ${BASE_URL}`);

  await testSecurityHeaders();
  await testRateLimitHeaders();
  await testRateLimit();

  // Summary
  console.log('\n📊 Test Summary');
  console.log('='.repeat(50));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed === 0) {
    console.log('\n🎉 All security tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the results above.');
    process.exit(1);
  }
}

// Run tests
runTests().catch(console.error);
