import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateFullAssessment } from '@/lib/scoring/formulas';
import { pdfQueue } from '@/lib/queues/setup';

export async function POST(req: Request, { params }: { params: { id: string } }) {
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

    console.log('📋 Enqueuing PDF generation job...');
    try {
      await pdfQueue.add('generate-pdf', { assessmentId: params.id });
      console.log('✅ PDF job enqueued successfully');
    } catch (queueError) {
      console.error('⚠️ Failed to enqueue PDF job (non-critical):', queueError);
      // Don't fail the submission if PDF queue fails
    }

    console.log('🎉 Submit complete for assessment:', params.id);
    return NextResponse.json(scores);

  } catch (error) {
    console.error('❌ Submit error for assessment:', params.id);
    console.error('Error details:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');

    // Return error but don't set status to FAILED in database
    // The database should remain in its current state
    return NextResponse.json(
      {
        error: 'Failed to submit assessment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
