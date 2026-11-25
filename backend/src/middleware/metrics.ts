/**
 * Prometheus Metrics Middleware
 * Exposes /metrics endpoint for Prometheus scraping
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { getDatabase } from '../database/initialize';
import { getBrowserPoolStats } from '../services/pdfExportHeadless';
import { getHandwritingGenerationService } from '../services/handwritingGeneration';
import { logger } from '../utils/logger';

// Metrics storage
const metrics = {
  // HTTP metrics
  httpRequestsTotal: new Map<string, number>(),
  httpRequestDurationMs: new Map<string, number[]>() as Map<string, number[]>,

  // Business metrics
  generationsTotal: { pending: 0, generating: 0, completed: 0, failed: 0, cancelled: 0 },
  generationsDurationMs: [] as number[],
  pagesGeneratedTotal: 0,

  // PDF/DOCX metrics
  pdfGenerationsTotal: { success: 0, failed: 0 },
  pdfGenerationDurationMs: [] as number[],
  docxGenerationsTotal: { success: 0, failed: 0 },
  docxGenerationDurationMs: [] as number[],

  // AI metrics
  aiRequestsTotal: { success: 0, failed: 0 },
  aiRequestDurationMs: [] as number[],

  // Forge metrics
  forgeRequestsTotal: { success: 0, failed: 0 },
  forgeRequestDurationMs: [] as number[],

  // Database metrics
  dbQueriesTotal: { success: 0, failed: 0 },
  dbQueryDurationMs: [] as number[],

  // System metrics
  activeGenerations: 0,
  browserPoolStats: { activeBrowsers: 0, totalPagesRendered: 0 },

  // Rate limit metrics
  rateLimitHits: 0,
  rateLimitExceeded: 0,

  // Error metrics
  errorsByType: new Map<string, number>(),
};

// Helper to record histogram
function recordHistogram(map: Map<string, number[]>, key: string, value: number) {
  const arr = map.get(key) || [];
  arr.push(value);
  // Keep only last 1000 values per bucket
  if (arr.length > 1000) arr.shift();
  map.set(key, arr);
}

// Helper to calculate percentiles
function calculatePercentiles(values: number[], percentiles = [0.5, 0.9, 0.95, 0.99]) {
  if (values.length === 0) return {};
  const sorted = [...values].sort((a, b) => a - b);
  const result: Record<string, number> = {};
  for (const p of percentiles) {
    const idx = Math.min(Math.floor(sorted.length * p), sorted.length - 1);
    result[`p${Math.round(p * 100)}`] = sorted[idx];
  }
  result.count = sorted.length;
  result.sum = sorted.reduce((a, b) => a + b, 0);
  result.avg = result.sum / sorted.length;
  return result;
}

/**
 * Record HTTP request metrics
 */
export function recordHttpRequest(method: string, path: string, statusCode: number, durationMs: number) {
  const key = `${method} ${path}`;
  const counterKey = `${key} ${statusCode}`;

  metrics.httpRequestsTotal.set(counterKey, (metrics.httpRequestsTotal.get(counterKey) || 0) + 1);
  recordHistogram(metrics.httpRequestDurationMs, key, durationMs);
}

/**
 * Record generation metrics
 */
export function recordGeneration(status: 'pending' | 'generating' | 'completed' | 'failed' | 'cancelled', durationMs?: number, pages?: number) {
  metrics.generationsTotal[status]++;
  if (durationMs) metrics.generationsDurationMs.push(durationMs);
  if (pages) metrics.pagesGeneratedTotal += pages;

  // Keep only last 10000 durations
  if (metrics.generationsDurationMs.length > 10000) {
    metrics.generationsDurationMs = metrics.generationsDurationMs.slice(-10000);
  }
}

/**
 * Record PDF generation metrics
 */
export function recordPdfGeneration(success: boolean, durationMs: number) {
  metrics.pdfGenerationsTotal[success ? 'success' : 'failed']++;
  metrics.pdfGenerationDurationMs.push(durationMs);
  if (metrics.pdfGenerationDurationMs.length > 10000) {
    metrics.pdfGenerationDurationMs = metrics.pdfGenerationDurationMs.slice(-10000);
  }
}

/**
 * Record DOCX generation metrics
 */
export function recordDocxGeneration(success: boolean, durationMs: number) {
  metrics.docxGenerationsTotal[success ? 'success' : 'failed']++;
  metrics.docxGenerationDurationMs.push(durationMs);
  if (metrics.docxGenerationDurationMs.length > 10000) {
    metrics.docxGenerationDurationMs = metrics.docxGenerationDurationMs.slice(-10000);
  }
}

/**
 * Record AI request metrics
 */
export function recordAiRequest(success: boolean, durationMs: number) {
  metrics.aiRequestsTotal[success ? 'success' : 'failed']++;
  metrics.aiRequestDurationMs.push(durationMs);
  if (metrics.aiRequestDurationMs.length > 10000) {
    metrics.aiRequestDurationMs = metrics.aiRequestDurationMs.slice(-10000);
  }
}

/**
 * Record Forge request metrics
 */
export function recordForgeRequest(success: boolean, durationMs: number) {
  metrics.forgeRequestsTotal[success ? 'success' : 'failed']++;
  metrics.forgeRequestDurationMs.push(durationMs);
  if (metrics.forgeRequestDurationMs.length > 10000) {
    metrics.forgeRequestDurationMs = metrics.forgeRequestDurationMs.slice(-10000);
  }
}

/**
 * Record database query metrics
 */
export function recordDbQuery(success: boolean, durationMs: number) {
  metrics.dbQueriesTotal[success ? 'success' : 'failed']++;
  metrics.dbQueryDurationMs.push(durationMs);
  if (metrics.dbQueryDurationMs.length > 10000) {
    metrics.dbQueryDurationMs = metrics.dbQueryDurationMs.slice(-10000);
  }
}

/**
 * Record rate limit metrics
 */
export function recordRateLimit(hit: boolean) {
  if (hit) metrics.rateLimitHits++;
  else metrics.rateLimitExceeded++;
}

/**
 * Record error by type
 */
export function recordError(type: string) {
  metrics.errorsByType.set(type, (metrics.errorsByType.get(type) || 0) + 1);
}

/**
 * Update system metrics (called periodically)
 */
export async function updateSystemMetrics(): Promise<void> {
  try {
    // Browser pool stats
    const browserStats = getBrowserPoolStats();
    metrics.browserPoolStats = {
      activeBrowsers: browserStats.activeBrowsers,
      totalPagesRendered: browserStats.totalPagesRendered,
    };

    // Active generations
    const genService = getHandwritingGenerationService();
    // Note: Would need to expose active count from service
    metrics.activeGenerations = 0; // Placeholder
  } catch (error) {
    logger.debug('Failed to update system metrics:', error);
  }
}

/**
 * Format metrics for Prometheus exposition format
 */
function formatPrometheusMetrics(): string {
  const lines: string[] = [];
  const now = Date.now();

  // HTTP Requests Total
  lines.push('# HELP http_requests_total Total number of HTTP requests');
  lines.push('# TYPE http_requests_total counter');
  for (const [key, value] of metrics.httpRequestsTotal.entries()) {
    const [method, path, status] = key.split(' ');
    lines.push(`http_requests_total{method="${method}",path="${path}",status="${status}"} ${value}`);
  }

  // HTTP Request Duration
  lines.push('# HELP http_request_duration_ms HTTP request duration in milliseconds');
  lines.push('# TYPE http_request_duration_ms summary');
  for (const [key, values] of metrics.httpRequestDurationMs.entries()) {
    const [method, path] = key.split(' ');
    const percentiles = calculatePercentiles(values);
    if (percentiles.count) {
      lines.push(`http_request_duration_ms_count{method="${method}",path="${path}"} ${percentiles.count}`);
      lines.push(`http_request_duration_ms_sum{method="${method}",path="${path}"} ${percentiles.sum}`);
      for (const [p, v] of Object.entries(percentiles)) {
        if (p !== 'count' && p !== 'sum' && p !== 'avg') {
          lines.push(`http_request_duration_ms{method="${method}",path="${path}",quantile="${p.replace('p', '0.')}"} ${v}`);
        }
      }
    }
  }

  // Generations Total
  lines.push('# HELP generations_total Total number of handwriting generations by status');
  lines.push('# TYPE generations_total counter');
  for (const [status, value] of Object.entries(metrics.generationsTotal)) {
    lines.push(`generations_total{status="${status}"} ${value}`);
  }

  // Generations Duration
  lines.push('# HELP generation_duration_ms Handwriting generation duration in milliseconds');
  lines.push('# TYPE generation_duration_ms summary');
  const genPercentiles = calculatePercentiles(metrics.generationsDurationMs);
  if (genPercentiles.count) {
    lines.push(`generation_duration_ms_count ${genPercentiles.count}`);
    lines.push(`generation_duration_ms_sum ${genPercentiles.sum}`);
    for (const [p, v] of Object.entries(genPercentiles)) {
      if (p !== 'count' && p !== 'sum' && p !== 'avg') {
        lines.push(`generation_duration_ms{quantile="${p.replace('p', '0.')}"} ${v}`);
      }
    }
  }

  // Pages Generated
  lines.push('# HELP pages_generated_total Total number of pages generated');
  lines.push('# TYPE pages_generated_total counter');
  lines.push(`pages_generated_total ${metrics.pagesGeneratedTotal}`);

  // PDF Metrics
  lines.push('# HELP pdf_generations_total Total PDF generations by result');
  lines.push('# TYPE pdf_generations_total counter');
  for (const [result, value] of Object.entries(metrics.pdfGenerationsTotal)) {
    lines.push(`pdf_generations_total{result="${result}"} ${value}`);
  }

  lines.push('# HELP pdf_generation_duration_ms PDF generation duration in milliseconds');
  lines.push('# TYPE pdf_generation_duration_ms summary');
  const pdfPercentiles = calculatePercentiles(metrics.pdfGenerationDurationMs);
  if (pdfPercentiles.count) {
    lines.push(`pdf_generation_duration_ms_count ${pdfPercentiles.count}`);
    lines.push(`pdf_generation_duration_ms_sum ${pdfPercentiles.sum}`);
  }

  // DOCX Metrics
  lines.push('# HELP docx_generations_total Total DOCX generations by result');
  lines.push('# TYPE docx_generations_total counter');
  for (const [result, value] of Object.entries(metrics.docxGenerationsTotal)) {
    lines.push(`docx_generations_total{result="${result}"} ${value}`);
  }

  // AI Metrics
  lines.push('# HELP ai_requests_total Total AI provider requests by result');
  lines.push('# TYPE ai_requests_total counter');
  for (const [result, value] of Object.entries(metrics.aiRequestsTotal)) {
    lines.push(`ai_requests_total{result="${result}"} ${value}`);
  }

  lines.push('# HELP ai_request_duration_ms AI request duration in milliseconds');
  lines.push('# TYPE ai_request_duration_ms summary');
  const aiPercentiles = calculatePercentiles(metrics.aiRequestDurationMs);
  if (aiPercentiles.count) {
    lines.push(`ai_request_duration_ms_count ${aiPercentiles.count}`);
    lines.push(`ai_request_duration_ms_sum ${aiPercentiles.sum}`);
  }

  // Forge Metrics
  lines.push('# HELP forge_requests_total Total Forge API requests by result');
  lines.push('# TYPE forge_requests_total counter');
  for (const [result, value] of Object.entries(metrics.forgeRequestsTotal)) {
    lines.push(`forge_requests_total{result="${result}"} ${value}`);
  }

  // Database Metrics
  lines.push('# HELP db_queries_total Total database queries by result');
  lines.push('# TYPE db_queries_total counter');
  for (const [result, value] of Object.entries(metrics.dbQueriesTotal)) {
    lines.push(`db_queries_total{result="${result}"} ${value}`);
  }

  lines.push('# HELP db_query_duration_ms Database query duration in milliseconds');
  lines.push('# TYPE db_query_duration_ms summary');
  const dbPercentiles = calculatePercentiles(metrics.dbQueryDurationMs);
  if (dbPercentiles.count) {
    lines.push(`db_query_duration_ms_count ${dbPercentiles.count}`);
    lines.push(`db_query_duration_ms_sum ${dbPercentiles.sum}`);
  }

  // System Metrics
  lines.push('# HELP active_generations Current number of active generation jobs');
  lines.push('# TYPE active_generations gauge');
  lines.push(`active_generations ${metrics.activeGenerations}`);

  lines.push('# HELP browser_pool_active_browsers Number of active Puppeteer browsers');
  lines.push('# TYPE browser_pool_active_browsers gauge');
  lines.push(`browser_pool_active_browsers ${metrics.browserPoolStats.activeBrowsers}`);

  lines.push('# HELP browser_pool_total_pages_rendered Total pages rendered by browser pool');
  lines.push('# TYPE browser_pool_total_pages_rendered counter');
  lines.push(`browser_pool_total_pages_rendered ${metrics.browserPoolStats.totalPagesRendered}`);

  // Rate Limit Metrics
  lines.push('# HELP rate_limit_hits_total Total rate limit checks');
  lines.push('# TYPE rate_limit_hits_total counter');
  lines.push(`rate_limit_hits_total ${metrics.rateLimitHits}`);

  lines.push('# HELP rate_limit_exceeded_total Total rate limit exceeded');
  lines.push('# TYPE rate_limit_exceeded_total counter');
  lines.push(`rate_limit_exceeded_total ${metrics.rateLimitExceeded}`);

  // Error Metrics
  lines.push('# HELP errors_total Total errors by type');
  lines.push('# TYPE errors_total counter');
  for (const [type, count] of metrics.errorsByType.entries()) {
    lines.push(`errors_total{type="${type}"} ${count}`);
  }

  // Process Metrics
  const memUsage = process.memoryUsage();
  lines.push('# HELP process_memory_bytes Process memory usage in bytes');
  lines.push('# TYPE process_memory_bytes gauge');
  lines.push(`process_memory_bytes{type="rss"} ${memUsage.rss}`);
  lines.push(`process_memory_bytes{type="heap_used"} ${memUsage.heapUsed}`);
  lines.push(`process_memory_bytes{type="heap_total"} ${memUsage.heapTotal}`);
  lines.push(`process_memory_bytes{type="external"} ${memUsage.external}`);

  lines.push('# HELP process_uptime_seconds Process uptime in seconds');
  lines.push('# TYPE process_uptime_seconds gauge');
  lines.push(`process_uptime_seconds ${process.uptime()}`);

  lines.push('# HELP process_cpu_seconds_total Total CPU time used in seconds');
  lines.push('# TYPE process_cpu_seconds_total counter');
  const cpuUsage = process.cpuUsage();
  lines.push(`process_cpu_seconds_total{type="user"} ${cpuUsage.user / 1e6}`);
  lines.push(`process_cpu_seconds_total{type="system"} ${cpuUsage.system / 1e6}`);

  // Node.js version
  lines.push('# HELP nodejs_version_info Node.js version info');
  lines.push('# TYPE nodejs_version_info gauge');
  lines.push(`nodejs_version_info{version="${process.version}"} 1`);

  return lines.join('\n') + '\n';
}

/**
 * Metrics endpoint handler
 */
export async function metricsHandler(req: Request, res: Response): Promise<void> {
  // Update system metrics before responding
  await updateSystemMetrics();

  const output = formatPrometheusMetrics();
  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(output);
}

/**
 * Middleware to collect HTTP metrics
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    // Normalize path for metrics (replace IDs with placeholders)
    let path = req.path;
    path = path.replace(/\/[a-f0-9-]{36}/g, '/:id'); // UUIDs
    path = path.replace(/\/\d+/g, '/:id'); // Numeric IDs

    recordHttpRequest(req.method, path, res.statusCode, duration);

    if (res.statusCode >= 400) {
      recordError(`http_${res.statusCode}`);
    }
  });

  next();
}

/**
 * Reset all metrics (for testing)
 */
export function resetMetrics(): void {
  metrics.httpRequestsTotal.clear();
  metrics.httpRequestDurationMs.clear();
  metrics.generationsTotal = { pending: 0, generating: 0, completed: 0, failed: 0, cancelled: 0 };
  metrics.generationsDurationMs = [];
  metrics.pagesGeneratedTotal = 0;
  metrics.pdfGenerationsTotal = { success: 0, failed: 0 };
  metrics.pdfGenerationDurationMs = [];
  metrics.docxGenerationsTotal = { success: 0, failed: 0 };
  metrics.docxGenerationDurationMs = [];
  metrics.aiRequestsTotal = { success: 0, failed: 0 };
  metrics.aiRequestDurationMs = [];
  metrics.forgeRequestsTotal = { success: 0, failed: 0 };
  metrics.forgeRequestDurationMs = [];
  metrics.dbQueriesTotal = { success: 0, failed: 0 };
  metrics.dbQueryDurationMs = [];
  metrics.activeGenerations = 0;
  metrics.browserPoolStats = { activeBrowsers: 0, totalPagesRendered: 0 };
  metrics.rateLimitHits = 0;
  metrics.rateLimitExceeded = 0;
  metrics.errorsByType.clear();
}

export { metrics, calculatePercentiles };