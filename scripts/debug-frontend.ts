/**
 * Debug Frontend Issue
 *
 * This script checks:
 * 1. If the API returns data correctly
 * 2. If the database has the correct structure
 * 3. If all 30 questions are present
 */

import { prisma } from '@/lib/db';

async function debugFrontend() {
  console.log('🔍 Debugging Frontend Issue\n');

  try {
    // Check 1: Database structure
    console.log('1️⃣  Checking database structure...');
    const version = await prisma.questionnaireVersion.findFirst({
      where: { status: 'PUBLISHED' },
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
    });

    if (!version) {
      console.log('❌ No PUBLISHED version found!');
      console.log('💡 Run: pnpm prisma db seed\n');
      return;
    }

    console.log(`✅ Found version ${version.versionNumber}`);
    console.log(`   Status: ${version.status}`);
    console.log(`   Areas: ${version.areas.length}\n`);

    // Check 2: Count elements and questions
    let totalElements = 0;
    let totalQuestions = 0;

    console.log('2️⃣  Counting structure...');
    for (const area of version.areas) {
      const elementsCount = area.elements.length;
      let areaQuestionsCount = 0;

      for (const element of area.elements) {
        areaQuestionsCount += element.questions.length;
      }

      totalElements += elementsCount;
      totalQuestions += areaQuestionsCount;

      console.log(`   Area ${area.code} "${area.name}"`);
      console.log(`     Elements: ${elementsCount}`);
      console.log(`     Questions: ${areaQuestionsCount}`);
    }

    console.log(`\n✅ Total Elements: ${totalElements}`);
    console.log(`✅ Total Questions: ${totalQuestions}\n`);

    // Check 3: API simulation
    console.log('3️⃣  Simulating frontend data transformation...');
    const allQuestions: any[] = [];

    version.areas.forEach((area: any) => {
      area.elements.forEach((elem: any) => {
        elem.questions.forEach((q: any) => {
          allQuestions.push({
            id: q.id,
            code: q.code,
            questionText: q.questionText,
            areaName: area.name,
            elementCode: elem.code,
            levelsDescription: q.levelsDescription
          });
        });
      });
    });

    console.log(`✅ Frontend would receive ${allQuestions.length} questions\n`);

    // Check 4: Display first 3 questions
    console.log('4️⃣  Sample questions (first 3)...');
    allQuestions.slice(0, 3).forEach((q, index) => {
      console.log(`\n   ${index + 1}. [${q.code}] ${q.questionText.substring(0, 60)}...`);
      console.log(`      Area: ${q.areaName}`);
      console.log(`      Element: ${q.elementCode}`);
      console.log(`      Levels: ${q.levelsDescription.substring(0, 40)}...`);
    });

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 Summary\n');
    console.log(`✅ Version: ${version.versionNumber} (${version.status})`);
    console.log(`✅ Areas: ${version.areas.length}`);
    console.log(`✅ Elements: ${totalElements}`);
    console.log(`✅ Questions: ${totalQuestions}`);
    console.log(`✅ Frontend transformation: OK\n`);

    if (totalQuestions !== 30) {
      console.log(`⚠️  WARNING: Expected 30 questions but found ${totalQuestions}`);
    } else {
      console.log(`🎉 All checks passed!`);
    }

    console.log('\n🌐 Test URL:');
    console.log('   http://localhost:3000/assessment/new');
    console.log('\n💡 Make sure the dev server is running: pnpm dev');
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugFrontend();
