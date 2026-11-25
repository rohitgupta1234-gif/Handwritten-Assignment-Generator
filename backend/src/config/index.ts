import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Database
  database: {
    client: 'better-sqlite3',
    connection: {
      filename: process.env.DATABASE_PATH || './data/app.db',
    },
    useNullAsDefault: true,
    migrations: {
      directory: './src/database/migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './src/database/seeds',
    },
  },

  // Redis (for queues)
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    accessTokenExpiry: process.env.NODE_ENV === 'production' ? (process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m') : '2h',
    refreshTokenExpiry: process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d',
  },

  // Cookie Settings
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as 'lax' | 'strict' | 'none',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },

  // Bcrypt
  bcrypt: {
    saltRounds: 12,
  },

  // File Upload
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    uploadDir: process.env.UPLOAD_DIR || './uploads',
  },

  // AI Provider
  aiProvider: process.env.AI_PROVIDER || 'gemini', // 'gemini' or 'openai' or 'groq'

  // OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: 'gpt-4-turbo-preview',
    maxTokens: 4000,
    timeout: parseInt(process.env.OPENAI_TIMEOUT || '30000', 10), // 30 seconds default (reduced from 60s)
  },

  // Google Gemini (Primary)
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
    maxTokens: 8192,
    timeout: parseInt(process.env.GEMINI_TIMEOUT || '60000', 10), // 60 seconds default
  },

  // Groq (Fallback)
  groq: {
    apiKey: process.env.GROQ_API_KEY || '',
    model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
    maxTokens: 8192,
    timeout: parseInt(process.env.GROQ_TIMEOUT || '30000', 10), // 30 seconds default (reduced from 60s)
    baseURL: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
  },

  // Tesseract OCR
  ocr: {
    lang: 'eng',
    logger: (m: any) => console.log(m),
  },

  // Handwriting Analysis
  handwriting: {
    minSamplesPerChar: 3,
    supportedChars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?;:()[]{}"\'-',
  },

  // PDF Generation
  pdf: {
    defaultPageSize: 'A4',
    defaultMargins: { top: 80, right: 60, bottom: 80, left: 60 },
    dpi: 300,
  },

  // Stable Diffusion Forge
  forge: {
    apiUrl: process.env.FORGE_API_URL || 'http://127.0.0.1:7860',
    timeout: parseInt(process.env.FORGE_TIMEOUT || '120000', 10),
    healthCheckInterval: parseInt(process.env.FORGE_HEALTH_CHECK_INTERVAL || '30000', 10),
    maxRetries: parseInt(process.env.FORGE_MAX_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.FORGE_RETRY_DELAY || '2000', 10),
    defaultModel: process.env.FORGE_DEFAULT_MODEL || '',
    controlNetModel: process.env.FORGE_CONTROLNET_MODEL || 'control_v11p_sd15_canny',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: process.env.NODE_ENV === 'production' ? 100 : 10000, // Higher limit for development/testing
  },

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};