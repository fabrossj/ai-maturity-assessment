import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { Worker, Job } from 'bullmq';
import { getRedis } from '@/lib/workers/redis';
import { generatePDF } from '@/lib/workers/pdf-generator';
import { prisma } from '@/lib/db';
import { enqueueEmailSending } from '@/lib/workers/queue';
import fs from 'fs/promises';
import path from 'path';

interface PDFJobData {
  assessmentId: string;
}

const PDF_DIR = path.join(process.cwd(), 'public', 'pdfs');

async function ensurePDFDirectory() {
  try {
    await fs.access(PDF_DIR);
  } catch {
    await fs.mkdir(PDF_DIR, { recursive: true });
    console.log(`📁 Created PDF directory: ${PDF_DIR}`);
  }
}

const worker = new Worker<PDFJobData>(
  'pdf-generation',
  async (job: Job<PDFJobData>) => {
    const { assessmentId } = job.data;

    console.log(`📄 Processing PDF generation for assessment: ${assessmentId}`);

    try {
      await ensurePDFDirectory();

      const pdf = await generatePDF(assessmentId);

      const filename = `assessment-${assessmentId}.pdf`;
      const filePath = path.join(PDF_DIR, filename);
      await fs.writeFile(filePath, pdf);

      console.log(`✅ PDF generated: ${filename}`);

      await prisma.assessmentResponse.update({
        where: { id: assessmentId },
        data: {
          pdfUrl: `/pdfs/${filename}`,
          pdfGeneratedAt: new Date(),
          status: 'PDF_GENERATED'
        }
      });

      console.log(`✅ Assessment ${assessmentId} status updated to PDF_GENERATED`);

      // Enqueue email sending after PDF is generated
      console.log(`📧 Enqueuing email sending for assessment: ${assessmentId}`);
      await enqueueEmailSending({ assessmentId });
      console.log(`✅ Email job enqueued for assessment: ${assessmentId}`);

      return { filename, size: pdf.length };
    } catch (error) {
      console.error(`❌ Error generating PDF for ${assessmentId}:`, error);

      await prisma.assessmentResponse.update({
        where: { id: assessmentId },
        data: { status: 'FAILED' }
      });

      throw error;
    }
  },
  {
    connection: getRedis(),
    concurrency: 2,
    limiter: {
      max: 10,
      duration: 60000
    }
  }
);

worker.on('completed', (job, result) => {
  console.log(`✅ Job ${job.id} completed:`, result);
});

worker.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err.message);
});

worker.on('error', (err) => {
  console.error('❌ Worker error:', err);
});

console.log('🚀 PDF worker started and listening for jobs...');

process.on('SIGTERM', async () => {
  console.log('📴 SIGTERM received, closing worker...');
  await worker.close();
  await getRedis().quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📴 SIGINT received, closing worker...');
  await worker.close();
  await getRedis().quit();
  process.exit(0);
});
