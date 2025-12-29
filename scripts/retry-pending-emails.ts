import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { prisma } from '../lib/db';
import { enqueueEmailSending } from '../lib/workers/queue';

/**
 * Script to retry sending emails for assessments that have PDFs generated
 * but haven't received the email yet.
 *
 * Usage: pnpm tsx scripts/retry-pending-emails.ts
 */

async function retryPendingEmails() {
  console.log('🔍 Looking for assessments with PDF but no email sent...\n');

  try {
    // Find assessments that have PDF generated but email not sent
    const pendingAssessments = await prisma.assessmentResponse.findMany({
      where: {
        pdfUrl: { not: null },
        pdfGeneratedAt: { not: null },
        emailSentAt: null,
        status: {
          in: ['PDF_GENERATED', 'EMAIL_FAILED']
        }
      },
      select: {
        id: true,
        userEmail: true,
        userName: true,
        pdfGeneratedAt: true,
        status: true
      },
      orderBy: {
        pdfGeneratedAt: 'asc'
      }
    });

    if (pendingAssessments.length === 0) {
      console.log('✅ No pending emails found. All assessments have been processed!');
      return;
    }

    console.log(`📧 Found ${pendingAssessments.length} assessment(s) with pending emails:\n`);

    for (const assessment of pendingAssessments) {
      console.log(`  • ID: ${assessment.id}`);
      console.log(`    Email: ${assessment.userEmail}`);
      console.log(`    User: ${assessment.userName || 'N/A'}`);
      console.log(`    PDF Generated: ${assessment.pdfGeneratedAt?.toISOString()}`);
      console.log(`    Status: ${assessment.status}`);
      console.log('');
    }

    console.log('📨 Enqueuing email jobs...\n');

    let successCount = 0;
    let failCount = 0;

    for (const assessment of pendingAssessments) {
      try {
        await enqueueEmailSending({ assessmentId: assessment.id });
        console.log(`✅ Enqueued email for ${assessment.userEmail} (${assessment.id})`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to enqueue email for ${assessment.id}:`, error);
        failCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`\n📊 Summary:`);
    console.log(`   Total assessments found: ${pendingAssessments.length}`);
    console.log(`   Successfully enqueued: ${successCount}`);
    console.log(`   Failed to enqueue: ${failCount}`);
    console.log('\n✨ Email jobs have been added to the queue!');
    console.log('   Make sure the email worker is running: pnpm worker:email\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
retryPendingEmails()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
