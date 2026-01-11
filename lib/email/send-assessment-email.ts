import nodemailer from 'nodemailer';

export interface SendAssessmentEmailParams {
  to: string;
  assessmentId: string;
  pdfBuffer: Buffer;
  scores: {
    totalScore: number;
    maturityLevel: string;
  };
  userName?: string | null;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

function getMaturityLevel(score: number): string {
  if (score >= 80) return 'Leader';
  if (score >= 60) return 'Avanzato';
  if (score >= 40) return 'In Sviluppo';
  if (score >= 20) return 'Consapevole';
  return 'Iniziale';
}

function generateEmailHTML(
  userName: string | null | undefined,
  totalScore: number,
  maturityLevel: string
): string {
  const displayName = userName || 'Utente';

  return `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Maturity Assessment Report</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">AI Maturity Assessment</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Il tuo Report è Pronto!</p>
  </div>

  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Gentile ${displayName},</p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      Grazie per aver completato l'AI Maturity Assessment. Il tuo report completo è allegato a questa email.
    </p>

    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
      <h2 style="margin-top: 0; color: #2563eb;">I tuoi risultati</h2>
      <p style="font-size: 18px; margin: 10px 0;">
        <strong>Score Totale:</strong> <span style="color: #2563eb; font-size: 24px; font-weight: bold;">${totalScore.toFixed(1)}/5.0</span>
      </p>
      <p style="font-size: 18px; margin: 10px 0;">
        <strong>Livello di Maturità:</strong> <span style="color: #1e40af; font-weight: bold;">${maturityLevel}</span>
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
    <p style="margin: 5px 0 0 0;">© ${new Date().getFullYear()} AI Maturity Assessment. Tutti i diritti riservati.</p>
  </div>
</body>
</html>
  `.trim();
}

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error(
      'SMTP configuration missing. Required: SMTP_HOST, SMTP_USER, SMTP_PASSWORD'
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
}

export async function sendAssessmentEmail(
  params: SendAssessmentEmailParams
): Promise<SendEmailResult> {
  const { to, assessmentId, pdfBuffer, scores, userName } = params;

  // Input validation
  if (!to || !isValidEmail(to)) {
    throw new Error(`Email destinatario non valida: ${to}`);
  }

  if (!assessmentId) {
    throw new Error('Assessment ID mancante');
  }

  if (!pdfBuffer || pdfBuffer.length === 0) {
    throw new Error('PDF buffer vuoto o mancante');
  }

  if (!scores || typeof scores.totalScore !== 'number') {
    throw new Error('Scores non validi');
  }

  try {
    console.log(`📧 Preparing email for ${to} (assessment: ${assessmentId})`);

    const transporter = createTransporter();

    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    const maturityLevel = scores.maturityLevel || getMaturityLevel(scores.totalScore);

    const mailOptions = {
      from,
      to,
      subject: 'Il tuo AI Maturity Assessment - Report Completo',
      html: generateEmailHTML(userName, scores.totalScore, maturityLevel),
      attachments: [
        {
          filename: `AI-Maturity-Assessment-${assessmentId}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    const result = await transporter.sendMail(mailOptions);

    console.log(`✅ Email sent successfully to ${to} (messageId: ${result.messageId})`);

    return {
      success: true,
      messageId: result.messageId
    };
  } catch (error) {
    // Detailed logging for debugging
    console.error('❌ Errore invio email:', {
      to,
      assessmentId,
      pdfSize: pdfBuffer.length,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    // Re-throw for caller to handle
    throw error;
  }
}
