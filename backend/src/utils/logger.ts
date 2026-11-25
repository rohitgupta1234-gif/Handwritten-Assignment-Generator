import fs from 'fs';
import path from 'path';
import { config } from '../config';

const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLogLevel = LOG_LEVELS[config.logLevel as LogLevel] ?? LOG_LEVELS.info;

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  meta?: any;
  context?: string;
  requestId?: string;
  userId?: string;
}

function serializeMeta(meta: any): any {
  if (!meta) return meta;
  if (meta instanceof Error) {
    const errorObj: Record<string, any> = {
      message: meta.message,
      name: meta.name,
      stack: meta.stack,
    };
    for (const key of Object.getOwnPropertyNames(meta)) {
      if (!(key in errorObj)) {
        errorObj[key] = (meta as any)[key];
      }
    }
    return errorObj;
  }
  return meta;
}

function formatLog(entry: LogEntry): string {
  const metaObj = serializeMeta(entry.meta);
  const meta = metaObj ? (entry.meta instanceof Error ? ` ${entry.meta.stack || entry.meta.message}` : ` ${JSON.stringify(metaObj)}`) : '';
  const context = entry.context ? `[${entry.context}] ` : '';
  const requestId = entry.requestId ? `[${entry.requestId}] ` : '';
  const userId = entry.userId ? `[user:${entry.userId}] ` : '';
  return `${entry.timestamp} [${entry.level.toUpperCase()}] ${requestId}${userId}${context}${entry.message}${meta}`;
}

function formatJsonLog(entry: LogEntry): string {
  const metaObj = serializeMeta(entry.meta);
  return JSON.stringify({
    timestamp: entry.timestamp,
    level: entry.level,
    message: entry.message,
    context: entry.context,
    requestId: entry.requestId,
    userId: entry.userId,
    service: 'handwritten-assignment-generator',
    ...(metaObj && typeof metaObj === 'object' ? metaObj : { meta: metaObj }),
  });
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= currentLogLevel;
}

// Async write queue for better performance
const writeQueue: Array<{ file: string; content: string }> = [];
let isWriting = false;

async function processWriteQueue(): Promise<void> {
  if (isWriting || writeQueue.length === 0) return;

  isWriting = true;
  const items = writeQueue.splice(0, writeQueue.length);

  try {
    await Promise.all(
      items.map(item => fs.promises.appendFile(item.file, item.content))
    );
  } catch (error) {
    console.error('Failed to write logs:', error);
    // Re-queue failed items
    writeQueue.unshift(...items);
  } finally {
    isWriting = false;
    if (writeQueue.length > 0) {
      processWriteQueue();
    }
  }
}

function getLogFileName(level: LogLevel): string {
  const date = new Date().toISOString().split('T')[0];
  return path.join(logDir, `${level}-${date}.log`);
}

function writeLog(level: LogLevel, message: string, meta?: any, context?: string, requestId?: string, userId?: string) {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    meta,
    context,
    requestId,
    userId,
  };

  // Console output (human-readable)
  const colors: Record<LogLevel, string> = {
    debug: '\x1b[36m', // cyan
    info: '\x1b[32m',  // green
    warn: '\x1b[33m',  // yellow
    error: '\x1b[31m', // red
  };
  const reset = '\x1b[0m';
  console.log(`${colors[level]}${formatLog(entry)}${reset}`);

  // Queue for async file write
  const isProduction = config.nodeEnv === 'production';
  const logLine = (isProduction ? formatJsonLog(entry) : formatLog(entry)) + '\n';
  const logFile = getLogFileName(level);

  writeQueue.push({ file: logFile, content: logLine });

  // Also write errors to separate error log
  if (level === 'error') {
    const errorLogFile = getLogFileName('error');
    writeQueue.push({ file: errorLogFile, content: logLine });
  }

  // Process queue (debounced)
  if (!isWriting) {
    setImmediate(processWriteQueue);
  }
}

/**
 * Rotate log files - keep last 30 days, compress old ones
 */
export async function rotateLogs(): Promise<void> {
  try {
    const files = await fs.promises.readdir(logDir);
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    for (const file of files) {
      const filePath = path.join(logDir, file);
      const stats = await fs.promises.stat(filePath);

      // Delete files older than 30 days
      if (now - stats.mtimeMs > thirtyDaysMs) {
        await fs.promises.unlink(filePath);
        console.log(`Deleted old log file: ${file}`);
      }
      // Compress files older than 1 day (not current day)
      else if (!file.includes(new Date().toISOString().split('T')[0]) && !file.endsWith('.gz')) {
        // In a real implementation, you'd use zlib to compress
        // For now, just note it
        console.log(`Would compress: ${file}`);
      }
    }
  } catch (error) {
    console.error('Log rotation failed:', error);
  }
}

// Run log rotation daily
setInterval(rotateLogs, 24 * 60 * 60 * 1000);

export const logger = {
  debug: (message: string, meta?: any, context?: string, requestId?: string, userId?: string) =>
    writeLog('debug', message, meta, context, requestId, userId),
  info: (message: string, meta?: any, context?: string, requestId?: string, userId?: string) =>
    writeLog('info', message, meta, context, requestId, userId),
  warn: (message: string, meta?: any, context?: string, requestId?: string, userId?: string) =>
    writeLog('warn', message, meta, context, requestId, userId),
  error: (message: string, meta?: any, context?: string, requestId?: string, userId?: string) =>
    writeLog('error', message, meta, context, requestId, userId),
};

export function createChildLogger(context: string) {
  return {
    debug: (message: string, meta?: any, requestId?: string, userId?: string) =>
      writeLog('debug', message, meta, context, requestId, userId),
    info: (message: string, meta?: any, requestId?: string, userId?: string) =>
      writeLog('info', message, meta, context, requestId, userId),
    warn: (message: string, meta?: any, requestId?: string, userId?: string) =>
      writeLog('warn', message, meta, context, requestId, userId),
    error: (message: string, meta?: any, requestId?: string, userId?: string) =>
      writeLog('error', message, meta, context, requestId, userId),
  };
}