import { Queue } from 'bullmq';
import { getRedis, isRedisAvailable } from '@/lib/workers/redis';

// Lazy singleton - Queue is created only when first accessed
let pdfQueueInstance: Queue | null = null;

/**
 * Check if queue service is available
 */
export function isQueueAvailable(): boolean {
  return isRedisAvailable();
}

/**
 * Get PDF Queue instance (lazy initialization)
 * Queue is only created when this function is first called
 * Throws error on Vercel where Redis is not available
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
 * Proxy for backward compatibility - throws immediately on Vercel
 */
export const pdfQueue = {
  add: async (...args: Parameters<Queue['add']>) => getPdfQueue().add(...args),
  getWaitingCount: async () => getPdfQueue().getWaitingCount(),
  getActiveCount: async () => getPdfQueue().getActiveCount(),
  getCompletedCount: async () => getPdfQueue().getCompletedCount(),
  getFailedCount: async () => getPdfQueue().getFailedCount(),
  getDelayedCount: async () => getPdfQueue().getDelayedCount(),
  getWaiting: async (...args: Parameters<Queue['getWaiting']>) => getPdfQueue().getWaiting(...args),
  getActive: async (...args: Parameters<Queue['getActive']>) => getPdfQueue().getActive(...args),
  getFailed: async (...args: Parameters<Queue['getFailed']>) => getPdfQueue().getFailed(...args),
};
