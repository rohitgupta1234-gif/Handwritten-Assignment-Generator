import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import fs from 'fs';
import path from 'path';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { apiRateLimiter, authRateLimiter, userRateLimiter, generationRateLimiter, uploadRateLimiter, closeRedisRateLimiter } from './middleware/redisRateLimiter';
import { setupRoutes } from './routes';
import { initializeDatabase, closeDatabase } from './database/initialize';
import { config } from './config';
import { logger } from './utils/logger';
import { validateEnv, getValidatedEnv } from './config/env';
import { livenessHandler, readinessHandler, detailedHealthHandler, requestIdMiddleware, requestLoggingMiddleware } from './middleware/health';
import { metricsHandler, metricsMiddleware } from './middleware/metrics';

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// Ensure required directories exist
const uploadDir = config.upload.uploadDir;
const dataDir = path.dirname(config.database.connection.filename);
[uploadDir, dataDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logger.info(`Created directory: ${dir}`);
  }
});

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Request ID and logging middleware (must be first)
app.use(requestIdMiddleware);
app.use(requestLoggingMiddleware);
app.use(metricsMiddleware);

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", 'http://localhost:5000', 'http://127.0.0.1:5000'],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
    },
  },
}));
// CORS Configuration
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : [process.env.FRONTEND_URL || 'http://localhost:3000', 'http://localhost:5000', 'http://127.0.0.1:5000'];

app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));
app.use(compression()); // Enable gzip compression for responses
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Health check endpoints (before rate limiting)
app.get('/health/live', livenessHandler);
app.get('/health/ready', readinessHandler);
app.get('/health/detailed', detailedHealthHandler);
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Metrics endpoint (before rate limiting for monitoring)
app.get('/metrics', metricsHandler);

// Rate limiting - apply after health/metrics
app.use(apiRateLimiter);

// Static file serving with cache headers
app.use('/uploads', express.static(uploadDir, {
  etag: true,
  lastModified: true,
  maxAge: '1d', // Cache for 1 day
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
  },
}));

// Serve frontend build in production
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  // Serve static assets with long-term caching
  app.use(express.static(frontendDistPath, {
    etag: true,
    lastModified: true,
    maxAge: '1y',
    setHeaders: (res, filePath) => {
      // Don't cache HTML files (for SPA routing)
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }));

  // SPA fallback - serve index.html for non-API routes
  app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/health') || req.path === '/metrics') {
      return next();
    }
    // Serve index.html for all other routes (SPA routing)
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
  logger.info('Frontend static files served from: ' + frontendDistPath);
} else {
  logger.warn('Frontend build not found at: ' + frontendDistPath + '. Run "npm run build" in frontend directory.');
}

// API Routes
setupRoutes(app);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Initialize database and start server
async function startServer() {
  try {
    // Validate environment variables first (fail fast)
    const validatedEnv = validateEnv();
    logger.info('Environment validation passed', {
      nodeEnv: validatedEnv.NODE_ENV,
      port: validatedEnv.PORT,
    });

    await initializeDatabase();
    logger.info('Database initialized successfully');

    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${validatedEnv.NODE_ENV}`);
      logger.info(`Health checks: /health/live, /health/ready, /health/detailed`);
      logger.info(`Metrics: /metrics`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, starting graceful shutdown...`);

      // Stop accepting new connections
      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          // Close Redis rate limiter
          await closeRedisRateLimiter();
          logger.info('Redis rate limiter closed');

          // Close database
          closeDatabase();
          logger.info('Database closed');

          logger.info('Graceful shutdown complete');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export { app };