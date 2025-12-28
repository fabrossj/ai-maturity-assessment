/**
 * Test Complete Flow: Create → Submit → Generate PDF
 *
 * This script tests the entire assessment flow:
 * 1. Creates a new assessment
 * 2. Submits it with sample answers
 * 3. Generates PDF
 * 4. Displays results
 */

import { prisma } from '@/lib/db';
import { generatePDF } from '@/lib/workers/pdf-generator';
import fs from 'fs/promises';
import path from 'path';

interface CalculatedScores {
  totalScore: number;
  maturityLevel: string;
  areas: Array<{
    code: string;
    name: string;
    areaPercentage: number;
    elements: Array<{
      code: string;
      name: string;
      elementPercentage: number;
    }>;
  }>;
}

async function testCompleteFlow() {
  console.log('🧪 Starting Complete Flow Test\n');

  try {
    // Step 1: Get latest published questionnaire
    console.log('📋 Step 1: Getting latest questionnaire version...');
    const latestVersion = await prisma.questionnaireVersion.findFirst({
      where: { status: 'PUBLISHED' },
      orderBy: { versionNumber: 'desc' },
      include: {
        areas: {
          include: {
            elements: {
              include: {
                questions: {
                  orderBy: { order: 'asc' }
                }
              }
            }
          }
        }
      }
    });

    if (!latestVersion) {
      console.error('❌ No published questionnaire version found!');
      console.log('💡 Run: pnpm prisma db seed');
      return;
    }

    console.log(`✅ Found version ${latestVersion.versionNumber} with ${latestVersion.areas.length} areas\n`);

    // Step 2: Create a new assessment
    console.log('📝 Step 2: Creating new assessment...');
    const testEmail = `test-${Date.now()}@example.com`;
    const assessment = await prisma.assessmentResponse.create({
      data: {
        questionnaireVersionId: latestVersion.id,
        userEmail: testEmail,
        userName: 'Test User',
        userToken: `token-${Date.now()}`,
        answers: {},
        dataRetentionUntil: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000), // 2 years
      }
    });

    console.log(`✅ Assessment created with ID: ${assessment.id}`);
    console.log(`   Email: ${testEmail}\n`);

    // Step 3: Collect sample answers (score = 3 for all questions)
    console.log('📊 Step 3: Generating sample answers...');
    const answers: Record<string, number> = {};
    let questionCount = 0;

    for (const area of latestVersion.areas) {
      for (const element of area.elements) {
        for (const question of element.questions) {
          // Assign varying scores for more realistic test
          const score = 2 + Math.floor(Math.random() * 4); // Random 2-5
          answers[question.code] = score;
          questionCount++;
        }
      }
    }

    console.log(`✅ Generated ${questionCount} sample answers (scores: 2-5)\n`);

    // Step 4: Calculate scores (simulate submit)
    console.log('🧮 Step 4: Calculating scores...');

    // Import scoring function
    const { calculateFullAssessment } = await import('@/lib/scoring/formulas');

    const scores = calculateFullAssessment(answers, {
      areas: latestVersion.areas.map(area => ({
        code: area.code,
        name: area.name,
        weight: area.weight,
        elements: area.elements.map(element => ({
          code: element.code,
          name: element.name,
          weight: element.weight,
          questions: element.questions.map(q => ({
            code: q.code,
            questionText: q.questionText,
            order: q.order
          }))
        }))
      }))
    });

    console.log(`✅ Scores calculated:`);
    console.log(`   Total Score: ${scores.totalScore.toFixed(1)}%`);
    console.log(`   Maturity Level: ${scores.maturityLevel}`);
    console.log(`   Areas: ${scores.areas.length}\n`);

    // Step 5: Update assessment with answers and scores
    console.log('💾 Step 5: Updating assessment with results...');
    await prisma.assessmentResponse.update({
      where: { id: assessment.id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        answers: answers as any,
        calculatedScores: scores as any
      }
    });

    console.log(`✅ Assessment updated to SUBMITTED status\n`);

    // Step 6: Generate PDF
    console.log('📄 Step 6: Generating PDF report...');
    const startTime = Date.now();
    const pdfBuffer = await generatePDF(assessment.id);
    const duration = Date.now() - startTime;

    console.log(`✅ PDF generated in ${duration}ms`);
    console.log(`   Size: ${(pdfBuffer.length / 1024).toFixed(2)} KB\n`);

    // Step 7: Save PDF to filesystem
    console.log('💾 Step 7: Saving PDF to public/pdfs/...');
    const pdfDir = path.join(process.cwd(), 'public', 'pdfs');
    await fs.mkdir(pdfDir, { recursive: true });

    const filename = `test-assessment-${assessment.id}.pdf`;
    const filepath = path.join(pdfDir, filename);
    await fs.writeFile(filepath, pdfBuffer);

    console.log(`✅ PDF saved: ${filename}\n`);

    // Step 8: Update database with PDF info
    console.log('🔄 Step 8: Updating database with PDF metadata...');
    await prisma.assessmentResponse.update({
      where: { id: assessment.id },
      data: {
        pdfUrl: `/pdfs/${filename}`,
        pdfGeneratedAt: new Date(),
        status: 'PDF_GENERATED'
      }
    });

    console.log(`✅ Database updated to PDF_GENERATED status\n`);

    // Final Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('🎉 TEST COMPLETED SUCCESSFULLY!\n');
    console.log('📊 Results Summary:');
    console.log(`   Assessment ID: ${assessment.id}`);
    console.log(`   User Email: ${testEmail}`);
    console.log(`   Total Score: ${scores.totalScore.toFixed(1)}%`);
    console.log(`   Maturity Level: ${scores.maturityLevel}`);
    console.log(`   Questions Answered: ${questionCount}`);
    console.log(`   PDF File: ${filename}`);
    console.log(`   PDF Size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
    console.log(`   Status: PDF_GENERATED\n`);

    console.log('🌐 Test URLs:');
    console.log(`   Assessment: http://localhost:3000/api/assessment/${assessment.id}`);
    console.log(`   Results: http://localhost:3000/api/assessment/${assessment.id}/results`);
    console.log(`   PDF Download: http://localhost:3000/api/assessment/${assessment.id}/pdf`);
    console.log(`   Results Page: http://localhost:3000/assessment/${assessment.id}/results\n`);

    console.log('📝 Area Breakdown:');
    scores.areas.forEach((area: any) => {
      console.log(`   ${area.name}: ${area.areaPercentage.toFixed(1)}%`);
    });

    console.log('\n═══════════════════════════════════════════════════════');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testCompleteFlow();
