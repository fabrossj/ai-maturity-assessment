import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdminAuthenticated } from '@/lib/auth/admin-auth';

/**
 * GET /api/admin/assessments
 * List all assessment responses (protected by Basic Auth)
 */
export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json(
      { error: 'Authentication required' },
      {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Admin Area"',
        },
      }
    );
  }

  try {
    const assessments = await prisma.assessmentResponse.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userEmail: true,
        userName: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        submittedAt: true,
        emailSentAt: true,
      },
    });

    return NextResponse.json(assessments);
  } catch (error) {
    console.error('Error fetching assessments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assessments' },
      { status: 500 }
    );
  }
}
