/**
 * Redis connection using ioredis
 * Used by Bull queues for OTP, email, notifications etc.
 */
import IORedisModule from 'ioredis';
// ioredis ESM compatibility — the class is the default export
const Redis = (IORedisModule as any).default ?? IORedisModule;

const REDIS_URL = process.env['REDIS_URL'] || 'redis://localhost:6379';

const redisConnection = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
});

redisConnection.on('connect', () => {
    console.log('[Redis] Connected to Redis ✓');
});

redisConnection.on('error', (err: Error) => {
    console.error('[Redis] Connection error:', err.message);
});


export default redisConnection;
