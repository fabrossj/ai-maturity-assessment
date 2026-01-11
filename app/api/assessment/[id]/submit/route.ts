import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateFullAssessment } from '@/lib/scoring/formulas';
import { generatePDF } from '@/lib/workers/pdf-generator';
import { sendAssessmentEmail } from '@/lib/email/send-assessment-email';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    console.log('📤 Starting submit for assessment:', params.id);

    const assessment = await prisma.assessmentResponse.findUnique({
      where: { id: params.id },
      include: {
        questionnaireVersion: {
          include: {
            areas: {
              include: { elements: { include: { questions: true } } }
            }
          }
        }
      }
    });

    if (!assessment) {
      console.log('❌ Assessment not found:', params.id);
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    console.log('✅ Assessment loaded:', params.id);
    const answers = assessment.answers as Record<string, number>;
    console.log('📝 Answers:', Object.keys(answers).length, 'questions answered');

    const config = assessment.questionnaireVersion;
    console.log('⚙️ Config loaded - version:', config.versionNumber);

    console.log('🧮 Calculating scores...');
    const scores = calculateFullAssessment(answers, config);
    console.log('✅ Scores calculated:', {
      totalScore: scores.totalScore,
      maturityLevel: scores.maturityLevel,
      areas: scores.areas.length
    });

    console.log('💾 Updating database status to SUBMITTED...');
    await prisma.assessmentResponse.update({
      where: { id: params.id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        calculatedScores: scores as any
      }
    });
    console.log('✅ Database updated successfully');

    // Generate PDF and send email directly (for Vercel compatibility)
    // This runs in the same request but doesn't block the response on failure
    console.log('📄 Generating PDF and sending email...');
    try {
      const pdfBuffer = await generatePDF(params.id);
      console.log('✅ PDF generated, size:', pdfBuffer.length, 'bytes');

      await sendAssessmentEmail({
        to: assessment.userEmail,
        assessmentId: params.id,
        pdfBuffer,
        scores: {
          totalScore: scores.totalScore,
          maturityLevel: scores.maturityLevel
        },
        userName: assessment.userName
      });

      // Update status to EMAIL_SENT
      await prisma.assessmentResponse.update({
        where: { id: params.id },
        data: {
          pdfGeneratedAt: new Date(),
          emailSentAt: new Date(),
          status: 'EMAIL_SENT'
        }
      });
      console.log('✅ Email sent and status updated to EMAIL_SENT');

    } catch (emailError) {
      // Email/PDF failure should not block the submit response
      console.error('⚠️ PDF/Email failed (non-blocking):',
        emailError instanceof Error ? emailError.message : 'Unknown error'
      );

      // Update status to indicate PDF was generated but email failed
      await prisma.assessmentResponse.update({
        where: { id: params.id },
        data: {
          status: 'PDF_GENERATED',
          pdfGeneratedAt: new Date()
        }
      }).catch(err => console.error('Failed to update status:', err));
    }

    console.log('🎉 Submit complete for assessment:', params.id);
    return NextResponse.json(scores);

  } catch (error) {
    console.error('❌ Submit error for assessment:', params.id);
    console.error('Error details:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');

    return NextResponse.json(
      {
        error: 'Failed to submit assessment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
