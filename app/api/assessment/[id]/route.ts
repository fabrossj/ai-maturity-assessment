import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const updateSchema = z.object({
  answers: z.record(z.string(), z.number().min(0).max(5))
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { answers } = updateSchema.parse(body);

    // Check if assessment exists and is not submitted yet
    const existing = await prisma.assessmentResponse.findUnique({
      where: { id: params.id }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    if (existing.status === 'SUBMITTED') {
      return NextResponse.json(
        { error: 'Cannot update submitted assessment' },
        { status: 400 }
      );
    }

    // Update the assessment answers
    const updated = await prisma.assessmentResponse.update({
      where: { id: params.id },
      data: {
        answers: answers as any,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      id: updated.id,
      answersCount: Object.keys(answers).length
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error updating assessment:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
