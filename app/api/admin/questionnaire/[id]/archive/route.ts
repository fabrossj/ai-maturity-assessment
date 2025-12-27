import { NextResponse } from 'next/server';
import { archiveQuestionnaireVersion } from '@/lib/services/questionnaire';

/**
 * POST /api/admin/questionnaire/:id/archive
 * Archive a questionnaire version
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const archivedVersion = await archiveQuestionnaireVersion(params.id);
    return NextResponse.json(archivedVersion);
  } catch (error) {
    console.error('Error archiving questionnaire version:', error);
    const message = error instanceof Error ? error.message : 'Failed to archive questionnaire version';
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
