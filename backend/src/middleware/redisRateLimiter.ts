/**
 * Redis-Backed Rate Limiter with In-Memory Fallback
 * Distributed rate limiting for multi-instance deployments
 * Uses sliding window algorithm with Redis sorted sets
 * Automatically falls back to in-memory sliding window when Redis is unavailable
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { logger } from '../utils/logger';

// Redis client state
let redisClient: any = null;
let redisInitialized = false;
let isConnecting = false;
let lastConnectAttempt = 0;
let lastErrorLoggedAt = 0;
const CONNECT_COOLDOWN_MS = 30000; // Try reconnecting at most once every 30s

// In-memory fallback sliding window store
const memoryStore = new Map<string, number[]>();

function checkMemoryRateLimit(
  key: string,
  windowMs: number,
  maxRequests: number
): { allowed: boolean; count: number; remaining: number; resetTime: number } {
  const now = Date.now();
  const windowStart = now - windowMs;
  let timestamps = memoryStore.get(key) || [];
  timestamps = timestamps.filter(t => t > windowStart);

  if (timestamps.length >= maxRequests) {
    const oldest = timestamps[0] || now;
    const resetTime = Math.ceil((oldest + windowMs) / 1000);
    return {
      allowed: false,
      count: timestamps.length,
      remaining: 0,
      resetTime,
    };
  }

  timestamps.push(now);
  memoryStore.set(key, timestamps);

  const remaining = Math.max(0, maxRequests - timestamps.length);
  const resetTime = Math.ceil((now + windowMs) / 1000);
  return {
    allowed: true,
    count: timestamps.length,
    remaining,
    resetTime,
  };
}

// Periodic cleanup of memory store
setInterval(() => {
  const now = Date.now();
  for (const [k, timestamps] of memoryStore.entries()) {
    const filtered = timestamps.filter(t => t > now - 3600000);
    if (filtered.length === 0) {
      memoryStore.delete(k);
    } else {
      memoryStore.set(k, filtered);
    }
  }
}, 60000);

async function getRedisClient(): Promise<any> {
  if (redisClient && redisInitialized) return redisClient;

  const now = Date.now();
  if (isConnecting || (now - lastConnectAttempt < CONNECT_COOLDOWN_MS)) {
    return null; // Redis not ready or in cooldown, use in-memory fallback
  }

  lastConnectAttempt = now;
  isConnecting = true;

  try {
    const RedisModule = await import('ioredis');
    const Redis = RedisModule.Redis || RedisModule.default;

    if (redisClient) {
      try { redisClient.disconnect(false); } catch {}
      redisClient = null;
    }

    const client = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password || undefined,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      retryStrategy: () => null, // Do not endlessly retry in background; cooldown handles retries
      enableReadyCheck: true,
      lazyConnect: true,
    });

    client.on('error', (err: Error) => {
      const timeSinceLastError = Date.now() - lastErrorLoggedAt;
      if (timeSinceLastError > CONNECT_COOLDOWN_MS) {
        logger.warn('Redis rate limiter unavailable, falling back to memory store:', err.message);
        lastErrorLoggedAt = Date.now();
      }
      redisInitialized = false;
    });

    client.on('connect', () => {
      logger.info('Redis connected for rate limiting');
      redisInitialized = true;
    });

    await client.connect();
    redisClient = client;
    redisInitialized = true;
    isConnecting = false;
    return redisClient;
  } catch (error: any) {
    if (Date.now() - lastErrorLoggedAt > CONNECT_COOLDOWN_MS) {
      logger.warn('Failed to initialize Redis for rate limiting (using in-memory fallback):', error.message);
      lastErrorLoggedAt = Date.now();
    }
    if (redisClient) {
      try { redisClient.disconnect(false); } catch {}
      redisClient = null;
    }
    redisInitialized = false;
    isConnecting = false;
    return null;
  }
}

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  handler?: (req: Request, res: Response) => void;
}

/**
 * Sliding window rate limiter using Redis sorted sets with in-memory fallback
 */
export function createRedisRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = (req) => req.ip || 'unknown',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    handler,
  } = options;

  const windowSec = Math.ceil(windowMs / 1000);
  const keyPrefix = 'ratelimit:';

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const redis = await getRedisClient();

      if (!redis) {
        // In-memory fallback
        const key = keyGenerator(req);
        const { allowed, count: _count, remaining, resetTime } = checkMemoryRateLimit(key, windowMs, maxRequests);
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', remaining);
        res.setHeader('X-RateLimit-Reset', resetTime);
        res.setHeader('X-RateLimit-Window', windowSec);

        if (!allowed) {
          const retryAfter = Math.max(1, resetTime - Math.ceil(Date.now() / 1000));
          if (handler) {
            handler(req, res);
          } else {
            res.status(429).json({
              error: 'Too many requests',
              code: 'RATE_LIMIT_EXCEEDED',
              retryAfter,
              limit: maxRequests,
              window: `${windowSec}s`,
            });
          }
          return;
        }

        next();
        return;
      }

      const key = keyPrefix + keyGenerator(req);
      const now = Date.now();
      const windowStart = now - windowMs;

      // Use Redis sorted set for sliding window
      const requestId = `${now}:${Math.random().toString(36).slice(2)}`;

      const multi = redis.multi();
      multi.zadd(key, now, requestId);
      multi.zremrangebyscore(key, 0, windowStart);
      multi.zcard(key);
      multi.expire(key, windowSec + 1);

      const results = await multi.exec();

      const currentCount = results?.[2]?.[1] as number || 0;
      const remaining = Math.max(0, maxRequests - currentCount);
      const resetTime = Math.ceil((now + windowMs) / 1000);

      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', resetTime);
      res.setHeader('X-RateLimit-Window', windowSec);

      if (currentCount > maxRequests) {
        await redis.zrem(key, requestId).catch(() => {});
        const retryAfter = Math.ceil((now + windowMs - Date.now()) / 1000);

        if (handler) {
          handler(req, res);
        } else {
          res.status(429).json({
            error: 'Too many requests',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter,
            limit: maxRequests,
            window: `${windowSec}s`,
          });
        }
        return;
      }

      if (skipSuccessfulRequests || skipFailedRequests) {
        const originalSend = res.send;
        res.send = function (body?: any): Response {
          const shouldSkip = (skipSuccessfulRequests && res.statusCode < 400) ||
                            (skipFailedRequests && res.statusCode >= 400);

          if (shouldSkip) {
            redis.zrem(key, requestId).catch(() => {});
            redis.zcard(key).then((count: number) => {
              const newRemaining = Math.max(0, maxRequests - count);
              res.setHeader('X-RateLimit-Remaining', newRemaining);
            }).catch(() => {});
          }

          return originalSend.call(this, body);
        };
      }

      next();
    } catch (error) {
      // Memory fallback if Redis error occurred during command execution
      const key = keyGenerator(req);
      const { allowed, count: _count, remaining, resetTime } = checkMemoryRateLimit(key, windowMs, maxRequests);
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', resetTime);
      res.setHeader('X-RateLimit-Window', windowSec);

      if (!allowed) {
        res.status(429).json({
          error: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.max(1, resetTime - Math.ceil(Date.now() / 1000)),
          limit: maxRequests,
          window: `${windowSec}s`,
        });
        return;
      }

      next();
    }
  };
}

/**
 * Pre-configured rate limiters
 */

// General API rate limiter (per IP)
export const apiRateLimiter = createRedisRateLimiter({
  windowMs: config.rateLimit.windowMs,
  maxRequests: config.rateLimit.maxRequests,
  keyGenerator: (req) => `api:${req.ip || 'unknown'}`,
});

// Stricter rate limiter for auth endpoints (per IP)
export const authRateLimiter = createRedisRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10, // 10 requests per 15 min
  keyGenerator: (req) => `auth:${req.ip || 'unknown'}`,
});

// Per-user rate limiter for authenticated routes
export const userRateLimiter = createRedisRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
  keyGenerator: (req) => `user:${(req as any).user?.id || req.ip || 'unknown'}`,
});

// Generation job rate limiter (per user)
export const generationRateLimiter = createRedisRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 20, // 20 generations per hour
  keyGenerator: (req) => `generation:${(req as any).user?.id || req.ip || 'unknown'}`,
});

// File upload rate limiter (per user)
export const uploadRateLimiter = createRedisRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 50, // 50 uploads per hour
  keyGenerator: (req) => `upload:${(req as any).user?.id || req.ip || 'unknown'}`,
});

/**
 * Rate limiter info for monitoring
 */
export async function getRateLimitInfo(key: string): Promise<{
  count: number;
  remaining: number;
  resetTime: number;
  windowMs: number;
} | null> {
  try {
    const redis = await getRedisClient();
    if (!redis) {
      const timestamps = memoryStore.get(key) || [];
      const now = Date.now();
      const count = timestamps.filter(t => t > now - 60 * 60 * 1000).length;
      return {
        count,
        remaining: Math.max(0, 100 - count),
        resetTime: Math.ceil((now + 60 * 60 * 1000) / 1000),
        windowMs: 60 * 60 * 1000,
      };
    }
    const fullKey = 'ratelimit:' + key;
    const now = Date.now();
    const windowStart = now - 60 * 60 * 1000; // Assume 1 hour window for info

    const count = await redis.zcount(fullKey, windowStart, '+inf');
    const ttl = await redis.ttl(fullKey);

    return {
      count,
      remaining: Math.max(0, 100 - count), // Default assumption
      resetTime: Math.ceil((now + (ttl > 0 ? ttl * 1000 : 0)) / 1000),
      windowMs: 60 * 60 * 1000,
    };
  } catch {
    return null;
  }
}

/**
 * Reset rate limit for a key (admin function)
 */
export async function resetRateLimit(key: string): Promise<boolean> {
  try {
    const redis = await getRedisClient();
    if (!redis) {
      memoryStore.delete(key);
      return true;
    }
    const fullKey = 'ratelimit:' + key;
    await redis.del(fullKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all active rate limit keys (for debugging)
 */
export async function getActiveRateLimitKeys(pattern = 'ratelimit:*'): Promise<string[]> {
  try {
    const redis = await getRedisClient();
    if (!redis) {
      return Array.from(memoryStore.keys());
    }
    const keys: string[] = [];
    let cursor = '0';

    do {
      const [newCursor, foundKeys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = newCursor;
      keys.push(...foundKeys);
    } while (cursor !== '0');

    return keys;
  } catch {
    return [];
  }
}

/**
 * Graceful shutdown
 */
export async function closeRedisRateLimiter(): Promise<void> {
  if (redisClient) {
    try {
      redisClient.disconnect(false);
      redisInitialized = false;
      redisClient = null;
      logger.info('Redis rate limiter connection closed');
    } catch (error) {
      logger.error('Error closing Redis connection:', error);
    }
  }
  memoryStore.clear();
}