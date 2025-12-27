import { NextResponse } from 'next/server';
import { getAllQuestionnaireVersions } from '@/lib/services/questionnaire';

/**
 * GET /api/admin/questionnaire
 * List all questionnaire versions
 */
export async function GET() {
  try {
    const versions = await getAllQuestionnaireVersions();
    return NextResponse.json(versions);
  } catch (error) {
    console.error('Error fetching questionnaire versions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questionnaire versions' },
      { status: 500 }
    );
  }
}
