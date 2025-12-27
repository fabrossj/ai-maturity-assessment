import { NextResponse } from 'next/server';
import { validateAreaWeights } from '@/lib/services/questionnaire';

/**
 * GET /api/admin/questionnaire/:id/validate
 * Validate questionnaire version (check weights, structure, etc.)
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const weightValidation = await validateAreaWeights(params.id);

    return NextResponse.json({
      valid: weightValidation.valid,
      checks: {
        areaWeights: weightValidation
      }
    });
  } catch (error) {
    console.error('Error validating questionnaire version:', error);
    return NextResponse.json(
      { error: 'Failed to validate questionnaire version' },
      { status: 500 }
    );
  }
}
