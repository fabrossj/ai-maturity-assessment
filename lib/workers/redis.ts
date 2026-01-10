import { Redis } from 'ioredis';

// Lazy singleton - Redis instance is created only when first used
let redisInstance: Redis | null = null;

/**
 * Get Redis instance (lazy initialization)
 * Connection is only established when this function is first called
 */
export function getRedis(): Redis {
  if (!redisInstance) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    redisInstance = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      lazyConnect: true, // Don't connect immediately
    });

    redisInstance.on('connect', () => {
      console.log('✅ Redis connected');
    });

    redisInstance.on('error', (err) => {
      console.error('❌ Redis connection error:', err.message);
    });
  }

  return redisInstance;
}

