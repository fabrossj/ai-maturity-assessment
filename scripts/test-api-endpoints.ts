/**
 * Test API Endpoints via HTTP
 *
 * This script tests all public API endpoints by making actual HTTP requests.
 * Requires the Next.js dev server to be running.
 */

import { prisma } from '@/lib/db';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  success: boolean;
  duration: number;
  error?: string;
}

const results: TestResult[] = [];

async function testEndpoint(
  endpoint: string,
  method: string,
  body?: any
): Promise<TestResult> {
  const startTime = Date.now();
  const url = `${API_BASE}${endpoint}`;

  try {
    const response = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });

    const duration = Date.now() - startTime;
    const success = response.ok;

    return {
      endpoint,
      method,
      status: response.status,
      success,
      duration,
      error: success ? undefined : await response.text(),
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      endpoint,
      method,
      status: 0,
      success: false,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function testAPIs() {
  console.log('🧪 Testing API Endpoints\n');
  console.log(`📡 API Base URL: ${API_BASE}\n`);
  console.log('⚠️  Make sure the Next.js dev server is running (pnpm dev)\n');

  let assessmentId: string | null = null;

  // Test 1: Get latest questionnaire
  console.log('1️⃣  Testing GET /api/questionnaire/latest...');
  const test1 = await testEndpoint('/api/questionnaire/latest', 'GET');
  results.push(test1);
  console.log(`   ${test1.success ? '✅' : '❌'} ${test1.status} - ${test1.duration}ms\n`);

  // Test 2: Create new assessment
  console.log('2️⃣  Testing POST /api/assessment...');
  const test2 = await testEndpoint('/api/assessment', 'POST', {
    userEmail: `api-test-${Date.now()}@example.com`,
    userName: 'API Test User',
    userCompany: 'API Test Company',
    consentGiven: true,
  });
  results.push(test2);

  if (test2.success) {
    // Extract assessment ID from response
    const response = await fetch(`${API_BASE}/api/assessment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail: `api-test-2-${Date.now()}@example.com`,
        userName: 'API Test User 2',
        userCompany: 'API Test Company 2',
        consentGiven: true,
      }),
    });
    const data = await response.json();
    assessmentId = data.id;
    console.log(`   ✅ ${test2.status} - ${test2.duration}ms`);
    console.log(`   Created assessment ID: ${assessmentId}\n`);
  } else {
    console.log(`   ❌ ${test2.status} - ${test2.error}\n`);
    console.log('⚠️  Cannot continue tests without assessment ID\n');
    return;
  }

  // Test 3: Get assessment
  console.log('3️⃣  Testing GET /api/assessment/[id]...');
  const test3 = await testEndpoint(`/api/assessment/${assessmentId}`, 'GET');
  results.push(test3);
  console.log(`   ${test3.success ? '✅' : '❌'} ${test3.status} - ${test3.duration}ms\n`);

  // Test 4: Submit assessment with sample answers
  console.log('4️⃣  Testing POST /api/assessment/[id]/submit...');

  // Get questionnaire structure to generate valid answers
  const assessment = await prisma.assessmentResponse.findUnique({
    where: { id: assessmentId },
    include: {
      questionnaireVersion: {
        include: {
          areas: {
            include: {
              elements: {
                include: {
                  questions: true
                }
              }
            }
          }
        }
      }
    }
  });

  const answers: Record<string, number> = {};
  if (assessment?.questionnaireVersion) {
    for (const area of assessment.questionnaireVersion.areas) {
      for (const element of area.elements) {
        for (const question of element.questions) {
          answers[question.code] = 3; // All questions get score of 3
        }
      }
    }
  }

  const test4 = await testEndpoint(`/api/assessment/${assessmentId}/submit`, 'POST', {
    answers,
  });
  results.push(test4);
  console.log(`   ${test4.success ? '✅' : '❌'} ${test4.status} - ${test4.duration}ms\n`);

  // Test 5: Get results
  console.log('5️⃣  Testing GET /api/assessment/[id]/results...');
  const test5 = await testEndpoint(`/api/assessment/${assessmentId}/results`, 'GET');
  results.push(test5);
  console.log(`   ${test5.success ? '✅' : '❌'} ${test5.status} - ${test5.duration}ms\n`);

  // Test 6: Download PDF
  console.log('6️⃣  Testing GET /api/assessment/[id]/pdf...');
  const pdfStartTime = Date.now();
  try {
    const response = await fetch(`${API_BASE}/api/assessment/${assessmentId}/pdf`);
    const pdfDuration = Date.now() - pdfStartTime;

    if (response.ok) {
      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      const pdfSuccess = contentType === 'application/pdf';

      results.push({
        endpoint: `/api/assessment/${assessmentId}/pdf`,
        method: 'GET',
        status: response.status,
        success: pdfSuccess,
        duration: pdfDuration,
      });

      console.log(`   ${pdfSuccess ? '✅' : '❌'} ${response.status} - ${pdfDuration}ms`);
      console.log(`   Content-Type: ${contentType}`);
      console.log(`   Size: ${contentLength ? (parseInt(contentLength) / 1024).toFixed(2) + ' KB' : 'unknown'}\n`);
    } else {
      results.push({
        endpoint: `/api/assessment/${assessmentId}/pdf`,
        method: 'GET',
        status: response.status,
        success: false,
        duration: pdfDuration,
        error: await response.text(),
      });
      console.log(`   ❌ ${response.status} - ${await response.text()}\n`);
    }
  } catch (error) {
    const pdfDuration = Date.now() - pdfStartTime;
    results.push({
      endpoint: `/api/assessment/${assessmentId}/pdf`,
      method: 'GET',
      status: 0,
      success: false,
      duration: pdfDuration,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    console.log(`   ❌ Error: ${error}\n`);
  }

  // Test 7: Admin endpoints (basic check)
  console.log('7️⃣  Testing GET /api/admin/questionnaire...');
  const test7 = await testEndpoint('/api/admin/questionnaire', 'GET');
  results.push(test7);
  console.log(`   ${test7.success ? '✅' : '❌'} ${test7.status} - ${test7.duration}ms\n`);

  // Test 8: Queue status
  console.log('8️⃣  Testing GET /api/admin/queue/status...');
  const test8 = await testEndpoint('/api/admin/queue/status', 'GET');
  results.push(test8);
  console.log(`   ${test8.success ? '✅' : '❌'} ${test8.status} - ${test8.duration}ms\n`);

  // Summary
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 Test Summary\n');

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

  console.log(`✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  console.log(`⏱️  Average response time: ${avgDuration.toFixed(0)}ms\n`);

  if (failed > 0) {
    console.log('Failed tests:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   ❌ ${r.method} ${r.endpoint}`);
      console.log(`      Status: ${r.status}`);
      console.log(`      Error: ${r.error?.substring(0, 100)}...\n`);
    });
  }

  console.log('═══════════════════════════════════════════════════════');

  if (assessmentId) {
    console.log('\n🌐 Test URLs:');
    console.log(`   Results Page: http://localhost:3000/assessment/${assessmentId}/results`);
    console.log(`   PDF Download: http://localhost:3000/api/assessment/${assessmentId}/pdf`);
  }

  await prisma.$disconnect();
}

// Run the test
console.log('\n');
testAPIs().catch(console.error);
