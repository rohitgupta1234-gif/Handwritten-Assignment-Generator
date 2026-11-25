/**
 * Environment Variable Validation Schema
 * Uses Zod for runtime validation with clear error messages
 * All required variables must be set in production
 */

import { z } from 'zod';
import { config } from './index';

// Define the schema for all environment variables
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().regex(/^\d+$/).transform(Number).default('5000'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  CORS_ORIGINS: z.string().optional(), // Required in production, validated at runtime

  // Database
  DATABASE_PATH: z.string().default('./data/app.db'),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().regex(/^\d+$/).transform(Number).default('6379'),
  REDIS_PASSWORD: z.string().optional(),

  // JWT - CRITICAL: No default in production!
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_TOKEN_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_TOKEN_EXPIRY: z.string().default('7d'),

  // Cookies
  COOKIE_SECURE: z.string().transform(v => v === 'true').default('true'),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),

  // Bcrypt
  BCRYPT_SALT_ROUNDS: z.string().regex(/^\d+$/).transform(Number).default('12'),

  // File Upload
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE: z.string().regex(/^\d+$/).transform(Number).default('10485760'), // 10MB

  // AI Providers
  AI_PROVIDER: z.enum(['gemini', 'openai', 'groq']).default('gemini'),

  // OpenAI
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_TIMEOUT: z.string().regex(/^\d+$/).transform(Number).default('30000'),

  // Google Gemini
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-3.1-flash-lite'),
  GEMINI_TIMEOUT: z.string().regex(/^\d+$/).transform(Number).default('60000'),

  // Groq
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default('openai/gpt-oss-20b'),
  GROQ_TIMEOUT: z.string().regex(/^\d+$/).transform(Number).default('30000'),
  GROQ_BASE_URL: z.string().url().default('https://api.groq.com/openai/v1'),

  // Tesseract OCR
  OCR_LANG: z.string().default('eng'),

  // Handwriting Analysis
  HANDWRITING_MIN_SAMPLES_PER_CHAR: z.string().regex(/^\d+$/).transform(Number).default('3'),

  // PDF Generation
  PDF_DEFAULT_PAGE_SIZE: z.enum(['A4', 'A5', 'Letter', 'Legal']).default('A4'),
  PDF_DPI: z.string().regex(/^\d+$/).transform(Number).default('300'),

  // Stable Diffusion Forge
  FORGE_API_URL: z.string().url().default('http://127.0.0.1:7860'),
  FORGE_TIMEOUT: z.string().regex(/^\d+$/).transform(Number).default('120000'),
  FORGE_HEALTH_CHECK_INTERVAL: z.string().regex(/^\d+$/).transform(Number).default('30000'),
  FORGE_MAX_RETRIES: z.string().regex(/^\d+$/).transform(Number).default('3'),
  FORGE_RETRY_DELAY: z.string().regex(/^\d+$/).transform(Number).default('2000'),
  FORGE_DEFAULT_MODEL: z.string().optional(),
  FORGE_CONTROLNET_MODEL: z.string().default('control_v11p_sd15_canny'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().regex(/^\d+$/).transform(Number).default('900000'), // 15 min
  RATE_LIMIT_MAX_REQUESTS: z.string().regex(/^\d+$/).transform(Number).default('100'),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

// Type for validated env
export type ValidatedEnv = z.infer<typeof envSchema>;

/**
 * Validate environment variables at startup
 * Throws descriptive error if validation fails
 */
export function validateEnv(): ValidatedEnv {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors.map(e => {
      const path = e.path.join('.');
      return `  - ${path}: ${e.message}`;
    }).join('\n');

    throw new Error(
      `❌ Environment validation failed:\n${errors}\n\n` +
      `Please check your .env file or environment variables.`
    );
  }

  // Additional production-specific validations
  if (result.data.NODE_ENV === 'production') {
    const prodErrors: string[] = [];

    // CORS_ORIGINS required in production
    if (!process.env.CORS_ORIGINS) {
      prodErrors.push('  - CORS_ORIGINS: Required in production (comma-separated list of allowed origins)');
    } else {
      const origins = process.env.CORS_ORIGINS.split(',').map(o => o.trim());
      for (const origin of origins) {
        if (!origin.startsWith('https://') && origin !== 'http://localhost:3000') {
          prodErrors.push(`  - CORS_ORIGINS: "${origin}" must use HTTPS in production`);
        }
      }
    }

    // JWT_SECRET must not be default
    if (process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-in-production') {
      prodErrors.push('  - JWT_SECRET: Must be changed from default value in production');
    }

    // FRONTEND_URL must be HTTPS
    if (!process.env.FRONTEND_URL?.startsWith('https://')) {
      prodErrors.push('  - FRONTEND_URL: Must use HTTPS in production');
    }

    // COOKIE_SECURE must be true
    if (process.env.COOKIE_SECURE !== 'true') {
      prodErrors.push('  - COOKIE_SECURE: Must be "true" in production');
    }

    // AI Provider keys
    const aiProvider = process.env.AI_PROVIDER || 'gemini';
    if (aiProvider === 'gemini' && !process.env.GEMINI_API_KEY) {
      prodErrors.push('  - GEMINI_API_KEY: Required when AI_PROVIDER=gemini');
    }
    if (aiProvider === 'openai' && !process.env.OPENAI_API_KEY) {
      prodErrors.push('  - OPENAI_API_KEY: Required when AI_PROVIDER=openai');
    }
    if (aiProvider === 'groq' && !process.env.GROQ_API_KEY) {
      prodErrors.push('  - GROQ_API_KEY: Required when AI_PROVIDER=groq');
    }

    // Database should not be default in production
    if (process.env.DATABASE_PATH === './data/app.db') {
      prodErrors.push('  - DATABASE_PATH: Should use absolute path in production (e.g., /var/lib/app/app.db)');
    }

    if (prodErrors.length > 0) {
      throw new Error(
        `❌ Production environment validation failed:\n${prodErrors.join('\n')}\n\n` +
        `Please fix these issues before deploying to production.`
      );
    }
  }

  return result.data;
}

/**
 * Get validated environment (call once at startup)
 * Caches result to avoid re-validation
 */
let validatedEnvCache: ValidatedEnv | null = null;

export function getValidatedEnv(): ValidatedEnv {
  if (!validatedEnvCache) {
    validatedEnvCache = validateEnv();
  }
  return validatedEnvCache;
}

/**
 * Reset cache (for testing)
 */
export function resetEnvCache(): void {
  validatedEnvCache = null;
}