import { NextResponse } from 'next/server';
import { publishQuestionnaireVersion, validateAreaWeights } from '@/lib/services/questionnaire';

/**
 * POST /api/admin/questionnaire/:id/publish
 * Publish a questionnaire version (makes it immutable)
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Validate area weights before publishing
    const weightValidation = await validateAreaWeights(params.id);
    if (!weightValidation.valid) {
      return NextResponse.json(
        { error: weightValidation.error },
        { status: 400 }
      );
    }

    const publishedVersion = await publishQuestionnaireVersion(params.id);
    return NextResponse.json(publishedVersion);
  } catch (error) {
    console.error('Error publishing questionnaire version:', error);
    const message = error instanceof Error ? error.message : 'Failed to publish questionnaire version';
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
