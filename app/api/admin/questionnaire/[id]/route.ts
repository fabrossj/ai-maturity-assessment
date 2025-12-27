import { NextResponse } from 'next/server';
import { getQuestionnaireVersion, deleteQuestionnaireVersion } from '@/lib/services/questionnaire';

/**
 * GET /api/admin/questionnaire/:id
 * Get a specific questionnaire version with full details
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const version = await getQuestionnaireVersion(params.id);

    if (!version) {
      return NextResponse.json(
        { error: 'Questionnaire version not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(version);
  } catch (error) {
    console.error('Error fetching questionnaire version:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questionnaire version' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/questionnaire/:id
 * Delete a DRAFT questionnaire version
 */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await deleteQuestionnaireVersion(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting questionnaire version:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete questionnaire version';
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
