import { Queue } from 'bullmq';
import { getRedis } from '@/lib/workers/redis';

// Lazy singleton - Queue is created only when first accessed
let pdfQueueInstance: Queue | null = null;

/**
 * Get PDF Queue instance (lazy initialization)
 * Queue is only created when this function is first called
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
 * @deprecated Use getPdfQueue() instead for lazy initialization
 * This export uses a Proxy for backward compatibility
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
