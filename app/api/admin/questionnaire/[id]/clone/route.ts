import { NextResponse } from 'next/server';
import { cloneQuestionnaireVersion } from '@/lib/services/questionnaire';

/**
 * POST /api/admin/questionnaire/:id/clone
 * Clone a questionnaire version
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const newVersion = await cloneQuestionnaireVersion(params.id);
    return NextResponse.json(newVersion, { status: 201 });
  } catch (error) {
    console.error('Error cloning questionnaire version:', error);
    const message = error instanceof Error ? error.message : 'Failed to clone questionnaire version';
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
