import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { prisma } from '@/lib/db';
import { enqueueEmailSending, getEmailJobStatus, emailQueue } from '@/lib/workers/queue';

async function testEmailWorker() {
  console.log('🧪 Testing Email Worker\n');

  try {
    // Step 1: Find an assessment with PDF generated
    console.log('📊 Step 1: Finding an assessment with PDF generated...');
    const assessment = await prisma.assessmentResponse.findFirst({
      where: {
        status: 'PDF_GENERATED',
        pdfUrl: { not: null }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!assessment) {
      console.log('❌ No assessment found with status PDF_GENERATED');
      console.log('💡 Tip: Run the PDF worker first or create an assessment with PDF');
      return;
    }

    console.log(`✅ Found assessment: ${assessment.id}`);
    console.log(`   Email: ${assessment.userEmail}`);
    console.log(`   PDF: ${assessment.pdfUrl}`);
    console.log(`   Status: ${assessment.status}\n`);

    // Step 2: Enqueue email job
    console.log('📧 Step 2: Enqueueing email sending job...');
    const job = await enqueueEmailSending({
      assessmentId: assessment.id,
      priority: 1
    });

    console.log(`✅ Job enqueued: ${job.id}\n`);

    // Step 3: Wait for job completion
    console.log('⏳ Step 3: Waiting for email to be sent...');
    console.log('   (Make sure the email worker is running: pnpm worker:email)\n');

    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;

      const status = await getEmailJobStatus(job.id!);

      if (!status) {
        console.log(`❌ Job not found`);
        break;
      }

      console.log(`   [${attempts}/${maxAttempts}] Job state: ${status.state}`);

      if (status.state === 'completed') {
        console.log(`\n✅ Email sent successfully!`);

        // Verify database update
        const updatedAssessment = await prisma.assessmentResponse.findUnique({
          where: { id: assessment.id }
        });

        console.log('\n📊 Final Assessment Status:');
        console.log(`   ID: ${updatedAssessment?.id}`);
        console.log(`   Status: ${updatedAssessment?.status}`);
        console.log(`   Email Sent At: ${updatedAssessment?.emailSentAt}`);
        console.log(`   Email: ${updatedAssessment?.userEmail}`);

        if (updatedAssessment?.status === 'EMAIL_SENT' && updatedAssessment.emailSentAt) {
          console.log('\n✅ TEST PASSED: Email worker is functioning correctly!');
        } else {
          console.log('\n⚠️  WARNING: Status not updated as expected');
        }

        break;
      }

      if (status.state === 'failed') {
        console.log(`\n❌ Job failed: ${status.failedReason}`);
        console.log('   Check SMTP settings in .env.local');
        break;
      }

      if (status.state === 'waiting' || status.state === 'active') {
        // Continue waiting
      }
    }

    if (attempts >= maxAttempts) {
      console.log('\n⏰ Timeout: Job did not complete within expected time');
      console.log('   Make sure the email worker is running: pnpm worker:email');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    await emailQueue.close();
    await prisma.$disconnect();
    console.log('\n🏁 Test completed');
  }
}

// Run the test
testEmailWorker();
