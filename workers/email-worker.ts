import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });
import { Worker, Job } from 'bullmq';
import { getRedis } from '@/lib/workers/redis';
import { prisma } from '@/lib/db';
import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs/promises';

interface EmailJobData {
  assessmentId: string;
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

const worker = new Worker<EmailJobData>(
  'email-sending',
  async (job: Job<EmailJobData>) => {
    const { assessmentId } = job.data;

    console.log(`📧 Processing email sending for assessment: ${assessmentId}`);

    try {
      const assessment = await prisma.assessmentResponse.findUnique({
        where: { id: assessmentId }
      });

      if (!assessment) {
        throw new Error(`Assessment ${assessmentId} not found`);
      }

      if (!assessment.userEmail) {
        throw new Error(`Assessment ${assessmentId} has no email address`);
      }

      if (!assessment.pdfUrl) {
        throw new Error(`Assessment ${assessmentId} has no PDF generated yet`);
      }

      const pdfPath = path.join(process.cwd(), 'public', assessment.pdfUrl);

      // Verify PDF exists
      try {
        await fs.access(pdfPath);
      } catch {
        throw new Error(`PDF file not found at ${pdfPath}`);
      }

      const calculatedScores = assessment.calculatedScores as { totalScore?: number } | null;
      const totalScore = calculatedScores?.totalScore || 0;
      const maturityLevel = getMaturityLevel(totalScore);

      await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: assessment.userEmail,
        subject: 'Il tuo AI Maturity Assessment - Report Completo',
        html: generateEmailHTML(assessment.userEmail, totalScore, maturityLevel),
        attachments: [
          {
            filename: `AI-Maturity-Assessment-${assessmentId}.pdf`,
            path: pdfPath
          }
        ]
      });

      console.log(`✅ Email sent to ${assessment.userEmail}`);

      await prisma.assessmentResponse.update({
        where: { id: assessmentId },
        data: {
          emailSentAt: new Date(),
          status: 'EMAIL_SENT'
        }
      });

      console.log(`✅ Assessment ${assessmentId} status updated to EMAIL_SENT`);

      return { email: assessment.userEmail, totalScore };
    } catch (error) {
      console.error(`❌ Error sending email for ${assessmentId}:`, error);

      await prisma.assessmentResponse.update({
        where: { id: assessmentId },
        data: { status: 'EMAIL_FAILED' }
      });

      throw error;
    }
  },
  {
    connection: getRedis(),
    concurrency: 5,
    limiter: {
      max: 20,
      duration: 60000
    }
  }
);

function getMaturityLevel(score: number): string {
  if (score >= 80) return 'Avanzato';
  if (score >= 60) return 'Intermedio';
  if (score >= 40) return 'Base';
  return 'Iniziale';
}

function generateEmailHTML(email: string, totalScore: number, maturityLevel: string): string {
  return `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Maturity Assessment Report</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">AI Maturity Assessment</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Il tuo Report è Pronto!</p>
  </div>

  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Gentile utente,</p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      Grazie per aver completato l'AI Maturity Assessment. Il tuo report completo è allegato a questa email.
    </p>

    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
      <h2 style="margin-top: 0; color: #667eea;">I tuoi risultati</h2>
      <p style="font-size: 18px; margin: 10px 0;">
        <strong>Score Totale:</strong> <span style="color: #667eea; font-size: 24px; font-weight: bold;">${totalScore}/100</span>
      </p>
      <p style="font-size: 18px; margin: 10px 0;">
        <strong>Livello di Maturità:</strong> <span style="color: #764ba2; font-weight: bold;">${maturityLevel}</span>
      </p>
    </div>

    <p style="font-size: 16px; margin-bottom: 20px;">
      Nel report PDF allegato troverai:
    </p>

    <ul style="font-size: 16px; margin-bottom: 20px;">
      <li>Analisi dettagliata per ogni area di competenza</li>
      <li>Punteggi specifici per dimensione</li>
      <li>Raccomandazioni personalizzate</li>
      <li>Percorso di miglioramento suggerito</li>
    </ul>

    <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #856404;">
        <strong>📎 Nota:</strong> Il report PDF è allegato a questa email. Se non lo vedi, controlla la cartella spam.
      </p>
    </div>

    <p style="font-size: 16px; margin-top: 30px;">
      Grazie per aver utilizzato il nostro servizio di assessment!
    </p>

    <p style="font-size: 16px; margin-bottom: 0;">
      Cordiali saluti,<br>
      <strong>Il Team AI Maturity Assessment</strong>
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
    <p style="margin: 0;">Questa è una email automatica, si prega di non rispondere.</p>
    <p style="margin: 5px 0 0 0;">© 2025 AI Maturity Assessment. Tutti i diritti riservati.</p>
  </div>
</body>
</html>
  `.trim();
}

worker.on('completed', (job, result) => {
  console.log(`✅ Job ${job.id} completed:`, result);
});

worker.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err.message);
});

worker.on('error', (err) => {
  console.error('❌ Worker error:', err);
});

console.log('🚀 Email worker started and listening for jobs...');

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
