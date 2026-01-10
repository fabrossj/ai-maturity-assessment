import { Queue } from 'bullmq';
import { getRedis } from './redis';

// Lazy singletons - Queues are created only when first accessed
let pdfQueueInstance: Queue | null = null;
let emailQueueInstance: Queue | null = null;

/**
 * Get PDF Queue instance (lazy initialization)
 */
export function getPdfQueue(): Queue {
  if (!pdfQueueInstance) {
    pdfQueueInstance = new Queue('pdf-generation', {
      connection: getRedis(),
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
  }
  return pdfQueueInstance;
}

/**
 * Get Email Queue instance (lazy initialization)
 */
export function getEmailQueue(): Queue {
  if (!emailQueueInstance) {
    emailQueueInstance = new Queue('email-sending', {
      connection: getRedis(),
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
  }
  return emailQueueInstance;
}

/**
 * @deprecated Use getPdfQueue() instead for lazy initialization
 */
export const pdfQueue = new Proxy({} as Queue, {
  get(_target, prop: keyof Queue) {
    const instance = getPdfQueue();
    const value = instance[prop];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  }
});

/**
 * @deprecated Use getEmailQueue() instead for lazy initialization
 */
export const emailQueue = new Proxy({} as Queue, {
  get(_target, prop: keyof Queue) {
    const instance = getEmailQueue();
    const value = instance[prop];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  }
});

interface EnqueuePDFOptions {
  assessmentId: string;
  priority?: number;
}

export async function enqueuePDFGeneration({ assessmentId, priority = 5 }: EnqueuePDFOptions) {
  const queue = getPdfQueue();
  const job = await queue.add(
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
  const queue = getPdfQueue();
  const job = await queue.getJob(jobId);

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
  const queue = getEmailQueue();
  const job = await queue.add(
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
  const queue = getEmailQueue();
  const job = await queue.getJob(jobId);

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
