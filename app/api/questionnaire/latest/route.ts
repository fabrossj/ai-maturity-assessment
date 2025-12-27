import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Find the latest published questionnaire version
    const latestVersion = await prisma.questionnaireVersion.findFirst({
      where: { status: 'PUBLISHED' },
      orderBy: { versionNumber: 'desc' },
      include: {
        areas: {
          orderBy: { code: 'asc' },
          include: {
            elements: {
              orderBy: { code: 'asc' },
              include: {
                questions: {
                  orderBy: { code: 'asc' }
                }
              }
            }
          }
        }
      }
    });

    if (!latestVersion) {
      return NextResponse.json(
        { error: 'No published questionnaire version found' },
        { status: 404 }
      );
    }

    return NextResponse.json(latestVersion);
  } catch (error) {
    console.error('Error fetching latest questionnaire:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
