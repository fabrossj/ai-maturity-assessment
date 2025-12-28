import { prisma } from '@/lib/db';
import { generatePDF } from '@/lib/workers/pdf-generator';
import fs from 'fs/promises';
import path from 'path';

async function testPDFGeneration() {
  try {
    console.log('🔍 Finding a submitted assessment...');

    const assessment = await prisma.assessmentResponse.findFirst({
      where: {
        status: 'SUBMITTED',
        calculatedScores: {
          not: null
        }
      },
      orderBy: { submittedAt: 'desc' }
    });

    if (!assessment) {
      console.log('❌ No submitted assessments found with calculated scores');
      console.log('💡 Please submit an assessment first via the web interface');
      return;
    }

    console.log(`✅ Found assessment: ${assessment.id}`);
    console.log(`   User: ${assessment.userName || assessment.userEmail}`);
    console.log(`   Submitted: ${assessment.submittedAt}`);

    console.log('\n📄 Generating PDF...');
    const pdfBuffer = await generatePDF(assessment.id);

    const outputDir = path.join(process.cwd(), 'public', 'pdfs');
    await fs.mkdir(outputDir, { recursive: true });

    const filename = `test-assessment-${assessment.id}.pdf`;
    const filepath = path.join(outputDir, filename);

    await fs.writeFile(filepath, pdfBuffer);

    console.log(`✅ PDF generated successfully!`);
    console.log(`   File: ${filepath}`);
    console.log(`   Size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
    console.log(`\n🌐 View at: http://localhost:3000/pdfs/${filename}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

testPDFGeneration();
