import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateFullAssessment } from '@/lib/scoring/formulas';
import { pdfQueue } from '@/lib/queues/setup';

export async function POST(req: Request, { params }: { params: { id: string } }) {
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
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const answers = assessment.answers as Record<string, number>;
  const config = assessment.questionnaireVersion;

  const scores = calculateFullAssessment(answers, config);

  await prisma.assessmentResponse.update({
    where: { id: params.id },
    data: {
      status: 'SUBMITTED',
      submittedAt: new Date(),
      calculatedScores: scores as any
    }
  });

  // Enqueue PDF generation
  await pdfQueue.add('generate-pdf', { assessmentId: params.id });

  return NextResponse.json(scores);
}
