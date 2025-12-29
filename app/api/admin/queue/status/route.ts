import { NextResponse } from 'next/server';
import { pdfQueue } from '@/lib/queues/setup';

// Force dynamic rendering - don't pre-render at build time
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
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
    console.error('Error fetching queue status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch queue status' },
      { status: 500 }
    );
  }
}
