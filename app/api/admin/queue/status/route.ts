import { NextResponse } from 'next/server';
// Queue import removed from static imports - loaded dynamically to avoid Redis connection on cold start

// Force dynamic rendering - don't pre-render at build time
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Dynamic import to avoid Redis connection at cold start
    const { pdfQueue } = await import('@/lib/queues/setup');

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      pdfQueue.getWaitingCount(),
      pdfQueue.getActiveCount(),
      pdfQueue.getCompletedCount(),
      pdfQueue.getFailedCount(),
      pdfQueue.getDelayedCount()
    ]);

    const waitingJobs = await pdfQueue.getWaiting(0, 10);
    const activeJobs = await pdfQueue.getActive(0, 10);
    const failedJobs = await pdfQueue.getFailed(0, 10);

    return NextResponse.json({
      counts: {
        waiting,
        active,
        completed,
        failed,
        delayed
      },
      jobs: {
        waiting: waitingJobs.map(job => ({
          id: job.id,
          data: job.data,
          timestamp: job.timestamp
        })),
        active: activeJobs.map(job => ({
          id: job.id,
          data: job.data,
          processedOn: job.processedOn
        })),
        failed: failedJobs.map(job => ({
          id: job.id,
          data: job.data,
          failedReason: job.failedReason,
          attemptsMade: job.attemptsMade
        }))
      }
    });
  } catch (error) {
    // If Redis is unavailable, return a friendly error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Redis')) {
      console.warn('Queue status unavailable - Redis not connected:', errorMessage);
      return NextResponse.json({
        error: 'Queue service unavailable',
        message: 'Redis is not configured. Queue features are disabled.',
        counts: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
        jobs: { waiting: [], active: [], failed: [] }
      }, { status: 503 });
    }

    console.error('Error fetching queue status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch queue status' },
      { status: 500 }
    );
  }
}
