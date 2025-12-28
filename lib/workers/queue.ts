import { Queue } from 'bullmq';
import { redis } from './redis';

export const pdfQueue = new Queue('pdf-generation', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000
    },
    removeOnFail: {
      age: 7 * 24 * 3600 // Keep failed jobs for 7 days
    }
  }
});

export const emailQueue = new Queue('email-sending', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 10000
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000
    },
    removeOnFail: {
      age: 7 * 24 * 3600 // Keep failed jobs for 7 days
    }
  }
});

interface EnqueuePDFOptions {
  assessmentId: string;
  priority?: number;
}

export async function enqueuePDFGeneration({ assessmentId, priority = 5 }: EnqueuePDFOptions) {
  const job = await pdfQueue.add(
    'generate-pdf',
    { assessmentId },
    {
      priority,
      jobId: `pdf-${assessmentId}`
    }
  );

  console.log(`📋 Enqueued PDF generation job for assessment ${assessmentId}, job ID: ${job.id}`);

  return job;
}

export async function getJobStatus(jobId: string) {
  const job = await pdfQueue.getJob(jobId);

  if (!job) {
    return null;
  }

  const state = await job.getState();
  const progress = job.progress;

  return {
    id: job.id,
    state,
    progress,
    data: job.data,
    attemptsMade: job.attemptsMade,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
    failedReason: job.failedReason
  };
}

interface EnqueueEmailOptions {
  assessmentId: string;
  priority?: number;
}

export async function enqueueEmailSending({ assessmentId, priority = 5 }: EnqueueEmailOptions) {
  const job = await emailQueue.add(
    'send-email',
    { assessmentId },
    {
      priority,
      jobId: `email-${assessmentId}`
    }
  );

  console.log(`📋 Enqueued email sending job for assessment ${assessmentId}, job ID: ${job.id}`);

  return job;
}

export async function getEmailJobStatus(jobId: string) {
  const job = await emailQueue.getJob(jobId);

  if (!job) {
    return null;
  }

  const state = await job.getState();
  const progress = job.progress;

  return {
    id: job.id,
    state,
    progress,
    data: job.data,
    attemptsMade: job.attemptsMade,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
    failedReason: job.failedReason
  };
}
