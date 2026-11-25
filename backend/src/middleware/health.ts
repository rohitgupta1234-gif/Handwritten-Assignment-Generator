/**
 * Health Check Middleware
 * Provides Kubernetes-compatible liveness and readiness probes
 */

import { Request, Response, NextFunction } from 'express';
import { getDatabase } from '../database/initialize';
import { getForgeClient } from '../services/forgeClient';
import { config } from '../config';
import { logger } from '../utils/logger';

// Track startup time for liveness
const startTime = Date.now();

// Health check results cache (5 second TTL)
let healthCache: { data: HealthStatus; timestamp: number } | null = null;
const HEALTH_CACHE_TTL = 5000;

interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  latencyMs?: number;
  error?: string;
  details?: Record<string, any>;
}

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptimeMs: number;
  version: string;
  checks: HealthCheck[];
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const db = getDatabase();
    // Simple query to verify connection
    db.exec('SELECT 1');
    return {
      name: 'database',
      status: 'healthy',
      latencyMs: Date.now() - start,
      details: { type: 'sql.js', path: config.database.connection.filename },
    };
  } catch (error) {
    return {
      name: 'database',
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check Redis connectivity
 */
async function checkRedis(): Promise<HealthCheck> {
  const start = Date.now();
  let redis: any = null;
  try {
    // Dynamic import to avoid issues if Redis not configured
    const RedisModule = await import('ioredis');
    const Redis = RedisModule.Redis || RedisModule.default;
    redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      connectTimeout: 2000,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      lazyConnect: true,
    });

    await redis.connect();
    await redis.ping();
    await redis.quit();

    return {
      name: 'redis',
      status: 'healthy',
      latencyMs: Date.now() - start,
      details: { host: config.redis.host, port: config.redis.port },
    };
  } catch (error) {
    if (redis) {
      try { redis.disconnect(false); } catch {}
    }
    return {
      name: 'redis',
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check Forge API connectivity
 */
async function checkForge(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const forgeClient = getForgeClient();
    const health = await forgeClient.checkHealth();

    return {
      name: 'forge',
      status: health.status === 'healthy' ? 'healthy' : 'degraded',
      latencyMs: Date.now() - start,
      details: {
        status: health.status,
        version: health.version,
        modelsLoaded: health.modelsLoaded,
      },
    };
  } catch (error) {
    return {
      name: 'forge',
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check AI provider connectivity
 */
async function checkAIProvider(): Promise<HealthCheck> {
  const start = Date.now();
  const provider = config.aiProvider;

  try {
    let healthy = false;
    let details: Record<string, any> = { provider };

    if (provider === 'gemini' && config.gemini.apiKey) {
      // Quick validation - just check key format
      healthy = config.gemini.apiKey.startsWith('AIza') && config.gemini.apiKey.length > 20;
      details.model = config.gemini.model;
    } else if (provider === 'openai' && config.openai.apiKey) {
      healthy = config.openai.apiKey.startsWith('sk-') && config.openai.apiKey.length > 20;
      details.model = config.openai.model;
    } else if (provider === 'groq' && config.groq.apiKey) {
      healthy = config.groq.apiKey.startsWith('gsk_') && config.groq.apiKey.length > 20;
      details.model = config.groq.model;
    } else {
      healthy = false;
      details.error = 'No API key configured';
    }

    return {
      name: 'ai-provider',
      status: healthy ? 'healthy' : 'unhealthy',
      latencyMs: Date.now() - start,
      details,
    };
  } catch (error) {
    return {
      name: 'ai-provider',
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check disk space
 */
async function checkDiskSpace(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const fs = await import('fs');
    const stats = fs.statSync(config.upload.uploadDir);

    // Use df command for actual disk space (cross-platform would need different approach)
    // For now, just verify directory is writable
    const testFile = `${config.upload.uploadDir}/.health-check-${Date.now()}`;
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);

    return {
      name: 'disk',
      status: 'healthy',
      latencyMs: Date.now() - start,
      details: { uploadDir: config.upload.uploadDir, writable: true },
    };
  } catch (error) {
    return {
      name: 'disk',
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Run all health checks with caching
 */
async function runHealthChecks(): Promise<HealthStatus> {
  // Return cached result if fresh
  if (healthCache && Date.now() - healthCache.timestamp < HEALTH_CACHE_TTL) {
    return healthCache.data;
  }

  // Run all checks in parallel
  const [database, redis, forge, aiProvider, disk] = await Promise.allSettled([
    checkDatabase(),
    checkRedis(),
    checkForge(),
    checkAIProvider(),
    checkDiskSpace(),
  ]);

  const checks: HealthCheck[] = [
    database.status === 'fulfilled' ? database.value : { name: 'database', status: 'unhealthy', error: String(database.reason) },
    redis.status === 'fulfilled' ? redis.value : { name: 'redis', status: 'unhealthy', error: String(redis.reason) },
    forge.status === 'fulfilled' ? forge.value : { name: 'forge', status: 'unhealthy', error: String(forge.reason) },
    aiProvider.status === 'fulfilled' ? aiProvider.value : { name: 'ai-provider', status: 'unhealthy', error: String(aiProvider.reason) },
    disk.status === 'fulfilled' ? disk.value : { name: 'disk', status: 'unhealthy', error: String(disk.reason) },
  ];

  // Determine overall status
  const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length;
  const degradedCount = checks.filter(c => c.status === 'degraded').length;

  let overallStatus: 'healthy' | 'unhealthy' | 'degraded';
  if (unhealthyCount > 0) {
    overallStatus = 'unhealthy';
  } else if (degradedCount > 0) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'healthy';
  }

  const result: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptimeMs: Date.now() - startTime,
    version: process.env.npm_package_version || '1.0.0',
    checks,
  };

  // Cache result
  healthCache = { data: result, timestamp: Date.now() };

  return result;
}

/**
 * Liveness Probe - Process is alive
 * Kubernetes: livenessProbe.httpGet.path=/health/live
 * Should only fail if process is deadlocked/crashed
 */
export async function livenessHandler(req: Request, res: Response): Promise<void> {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptimeMs: Date.now() - startTime,
  });
}

/**
 * Readiness Probe - Ready to serve traffic
 * Kubernetes: readinessProbe.httpGet.path=/health/ready
 * Fails if any critical dependency is unavailable
 */
export async function readinessHandler(req: Request, res: Response): Promise<void> {
  const health = await runHealthChecks();

  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

  // For readiness, we might want to fail on degraded too
  // Uncomment next line to fail on degraded:
  // const statusCode = health.status === 'healthy' ? 200 : 503;

  res.status(statusCode).json(health);
}

/**
 * Detailed Health Check - For monitoring dashboards
 * GET /health/detailed
 */
export async function detailedHealthHandler(req: Request, res: Response): Promise<void> {
  const health = await runHealthChecks();
  res.json(health);
}

/**
 * Middleware to add request ID for tracing
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = req.headers['x-request-id'] as string || `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  (req as any).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}

/**
 * Middleware to log requests with structured data
 */
export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const requestId = (req as any).requestId;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: duration,
      userAgent: req.get('user-agent'),
      ip: req.ip,
      userId: (req as any).user?.id,
    };

    if (res.statusCode >= 400) {
      logger.warn('HTTP Request', logData);
    } else {
      logger.debug('HTTP Request', logData);
    }
  });

  next();
}

export { runHealthChecks, HealthStatus, HealthCheck };