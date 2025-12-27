import { NextResponse } from 'next/server';
import { updateQuestion } from '@/lib/services/questionnaire';
import { z } from 'zod';

const updateQuestionSchema = z.object({
  questionText: z.string().min(1).optional(),
  levelsDescription: z.string().optional(),
  order: z.number().int().min(0).optional(),
  scaleMin: z.number().int().min(0).optional(),
  scaleMax: z.number().int().min(0).optional()
});

/**
 * PATCH /api/admin/questionnaire/:id/question/:questionId
 * Update question details (only for DRAFT versions)
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string; questionId: string } }
) {
  try {
    const body = await req.json();
    const data = updateQuestionSchema.parse(body);

    // Validate scale min/max if both are provided
    if (data.scaleMin !== undefined && data.scaleMax !== undefined) {
      if (data.scaleMin >= data.scaleMax) {
        return NextResponse.json(
          { error: 'scaleMin must be less than scaleMax' },
          { status: 400 }
        );
      }
    }

    const updatedQuestion = await updateQuestion(params.id, params.questionId, data);
    return NextResponse.json(updatedQuestion);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error updating question:', error);
    const message = error instanceof Error ? error.message : 'Failed to update question';
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
