import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { randomBytes } from 'crypto';
import { z } from 'zod';
// Rate limiting removed from static imports - loaded dynamically to avoid Redis connection on cold start

const createSchema = z.object({
  userEmail: z.string().email(),
  userName: z.string().optional(),
  consentGiven: z.literal(true)
});

export async function POST(req: Request) {
  // Default rate limit headers (used when rate limiting is unavailable)
  let rateLimitHeaders: Record<string, string> = {};

  try {
    // Try rate limiting (optional - skip if Redis unavailable)
    try {
      const { rateLimit } = await import('@/lib/middleware/rate-limit-simple');
      const rateLimitResult = await rateLimit(req);
      rateLimitHeaders = rateLimitResult.headers;

      if (!rateLimitResult.success) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          {
            status: 429,
            headers: rateLimitResult.headers
          }
        );
      }
    } catch (rateLimitError) {
      // Rate limiting unavailable (Redis not connected) - continue without it
      console.warn('Rate limiting unavailable, skipping:', rateLimitError instanceof Error ? rateLimitError.message : 'Unknown error');
    }

    const body = await req.json();
    const { userEmail, userName, consentGiven } = createSchema.parse(body);

    const latestVersion = await prisma.questionnaireVersion.findFirst({
      where: { status: 'PUBLISHED' },
      orderBy: { versionNumber: 'desc' }
    });

    if (!latestVersion) {
      return NextResponse.json({ error: 'No published version' }, { status: 404 });
    }

    const token = randomBytes(32).toString('hex');

    const assessment = await prisma.assessmentResponse.create({
      data: {
        questionnaireVersionId: latestVersion.id,
        userEmail,
        userName,
        userToken: token,
        consentGiven,
        answers: {},
        dataRetentionUntil: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000) // 2 years
      }
    });

    return NextResponse.json(
      { id: assessment.id, token },
      { status: 201, headers: rateLimitHeaders }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Assessment creation error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
