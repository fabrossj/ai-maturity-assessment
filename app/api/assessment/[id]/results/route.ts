import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const assessment = await prisma.assessmentResponse.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        status: true,
        userEmail: true,
        submittedAt: true,
        calculatedScores: true
      }
    });

    if (!assessment) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      );
    }

    if (assessment.status !== 'SUBMITTED') {
      return NextResponse.json(
        { error: 'Assessment not yet submitted' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      id: assessment.id,
      userEmail: assessment.userEmail,
      submittedAt: assessment.submittedAt,
      scores: assessment.calculatedScores
    });
  } catch (error) {
    console.error('Error fetching assessment results:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
