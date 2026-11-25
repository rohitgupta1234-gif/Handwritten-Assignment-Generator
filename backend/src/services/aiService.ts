import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { config } from '../config';
import { Question, Answer, AssignmentSettings } from '../types';

let geminiClient: GoogleGenAI | null = null;
let openaiClient: OpenAI | null = null;
let groqClient: OpenAI | null = null;

// Simple in-memory cache to prevent duplicate requests and store results
// Key: hash of (question text + subject + level + length)
interface CacheEntry {
  promise?: Promise<{ answer: string; tokensUsed: number }>;
  result?: { answer: string; tokensUsed: number };
  timestamp: number;
}
const requestCache = new Map<string, CacheEntry>();

// Cache TTL: 5 minutes
const CACHE_TTL = 5 * 60 * 1000;

// Retry configuration - Optimized for faster fallback
const MAX_RETRIES = 2; // Reduced from 3 to 2 for faster fallback
const INITIAL_DELAY_MS = 500; // Reduced from 1000ms to 500ms
const MAX_DELAY_MS = 5000; // Reduced from 10000ms to 5000ms
const BACKOFF_MULTIPLIER = 2;

// Batch processing configuration
const BATCH_CONCURRENCY = 2; // Allow 2 concurrent requests for better throughput
const BATCH_DELAY_MS = 200; // Reduced from 500ms to 200ms

// AI Provider configuration - Priority: Gemini → Groq → Error
const AI_PROVIDER = config.aiProvider || 'gemini'; // 'gemini' | 'openai' | 'groq'

// Determine fallback provider based on primary
function getFallbackProvider(primary: string): string {
  if (primary === 'gemini') return 'groq';
  if (primary === 'groq') return 'gemini';
  return 'gemini'; // default fallback for openai or others
}

const FALLBACK_PROVIDER = getFallbackProvider(AI_PROVIDER);

/**
 * Get or create Gemini client
 */
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    if (!config.gemini.apiKey || config.gemini.apiKey.trim() === '') {
      throw new Error('Gemini API key not configured. Please set GEMINI_API_KEY in .env file.');
    }
    geminiClient = new GoogleGenAI({
      apiKey: config.gemini.apiKey,
    });
  }
  return geminiClient;
}

/**
 * Get or create OpenAI client
 */
function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!config.openai.apiKey || config.openai.apiKey.trim() === '') {
      throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY in .env file.');
    }
    openaiClient = new OpenAI({
      apiKey: config.openai.apiKey,
      timeout: config.openai.timeout,
    });
  }
  return openaiClient;
}

/**
 * Get or create Groq client (OpenAI-compatible API)
 */
function getGroqClient(): OpenAI {
  if (!groqClient) {
    if (!config.groq.apiKey || config.groq.apiKey.trim() === '') {
      throw new Error('Groq API key not configured. Please set GROQ_API_KEY in .env file.');
    }
    groqClient = new OpenAI({
      apiKey: config.groq.apiKey,
      baseURL: config.groq.baseURL,
      timeout: config.groq.timeout,
    });
  }
  return groqClient;
}

/**
 * Wrapper to add timeout to a promise
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage = 'Request timed out'): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

/**
 * Generate a cache key for request deduplication
 */
function getCacheKey(question: Question, subject: string, level: string, length: string): string {
  const content = `${question.text}|${subject}|${level}|${length}`;
  // Simple hash
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString();
}

/**
 * Clean expired cache entries
 */
function cleanCache(): void {
  const now = Date.now();
  for (const [key, entry] of requestCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      requestCache.delete(key);
    }
  }
  // Also limit cache size to prevent memory issues
  if (requestCache.size > 100) {
    const keysToDelete = Array.from(requestCache.keys()).slice(0, requestCache.size - 100);
    for (const key of keysToDelete) {
      requestCache.delete(key);
    }
  }
}

/**
 * Check if an error is retryable (temporary)
 */
function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  const statusMatch = message.match(/"code"\s*:\s*(\d+)/) || message.match(/code\s*:\s*(\d+)/);

  // Check for specific HTTP status codes
  if (statusMatch) {
    const code = parseInt(statusMatch[1], 10);
    // 429 = Too Many Requests (rate limit)
    // 503 = Service Unavailable (high demand)
    // 500, 502, 504 = Server errors (may be temporary)
    if ([429, 503, 500, 502, 504].includes(code)) {
      return true;
    }
  }

  // Check for error message keywords
  const retryableKeywords = [
    'rate limit',
    'quota exceeded',
    'high demand',
    'temporarily unavailable',
    'service unavailable',
    'too many requests',
    'resource exhausted',
    'deadline exceeded',
    'internal error',
    'unavailable',
    'overloaded',
    'timeout',
    'econnreset',
    'etimedout',
    'socket hang up',
  ];

  return retryableKeywords.some(keyword => message.includes(keyword));
}

/**
 * Check if an error is a permanent quota exhaustion
 */
function isQuotaExhausted(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  const quotaKeywords = [
    'quota exhausted',
    'billing not enabled',
    'project has no quota',
    'quota limit',
    'monthly limit',
    'daily limit exceeded',
    'free tier limit',
    'insufficient_quota',
    'quota exceeded for',
  ];

  return quotaKeywords.some(keyword => message.includes(keyword));
}

/**
 * Check if an error is an authentication/authorization error
 */
function isAuthError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes('api key') ||
         message.includes('unauthorized') ||
         message.includes('authentication') ||
         message.includes('permission denied') ||
         message.includes('invalid api key') ||
         message.includes('api_key_invalid');
}

/**
 * Check if an error is a model not found error
 */
function isModelNotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes('model') && message.includes('not found');
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Build common prompt for answer generation
 */
function buildPrompt(
  question: Question,
  subject: string,
  level: string,
  length: 'short' | 'medium' | 'detailed'
): { systemPrompt: string; userPrompt: string } {
  const lengthInstructions = {
    short: 'Provide a concise answer in 2-3 sentences.',
    medium: 'Provide a well-structured answer in 1-2 paragraphs with key points and explanations.',
    detailed: 'Provide a comprehensive answer with multiple paragraphs, step-by-step reasoning, examples, and thorough analysis.',
  };

  const levelContext: Record<string, string> = {
    school: 'appropriate for high school level',
    college: 'appropriate for undergraduate college level',
    university: 'appropriate for university level with academic rigor',
    professional: 'appropriate for professional/graduate level with advanced concepts',
  };

  const systemPrompt = `You are an expert tutor helping students with their assignments.
Generate a ${lengthInstructions[length]} answer for a ${levelContext[level]} ${subject} question.
The answer should be accurate, well-structured, and educational.
Use clear language appropriate for the academic level.
Do not include meta-commentary, just the answer content.`;

  const userPrompt = `Question: ${question.text}

Subject: ${subject}
Level: ${level}
Answer length: ${length}`;

  return { systemPrompt, userPrompt };
}

/**
 * Validate and clean answer response
 */
function validateAnswer(answer: string): string {
  if (!answer || answer.trim() === '') {
    throw new Error('Empty response from AI provider');
  }
  return answer.trim();
}

/**
 * Generate a single answer with Gemini (with exponential backoff retry)
 */
async function generateAnswerWithGemini(
  question: Question,
  subject: string,
  level: string,
  length: 'short' | 'medium' | 'detailed',
  settings?: AssignmentSettings
): Promise<{ answer: string; tokensUsed: number }> {
  const client = getGeminiClient();
  const { systemPrompt, userPrompt } = buildPrompt(question, subject, level, length);

  let lastError: Error | null = null;
  let delay = INITIAL_DELAY_MS;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await withTimeout(
        client.models.generateContent({
          model: config.gemini.model,
          contents: [
            { role: 'user', parts: [{ text: systemPrompt }] },
            { role: 'user', parts: [{ text: userPrompt }] },
          ],
          config: {
            maxOutputTokens: config.gemini.maxTokens,
            temperature: 0.7,
          },
        }),
        config.gemini.timeout,
        'Gemini API request timed out'
      );

      const answer = validateAnswer(response.text || '');

      // Estimate tokens used (Gemini doesn't return exact token count in the same way)
      // Rough estimation: ~4 characters per token
      const tokensUsed = Math.ceil((systemPrompt.length + userPrompt.length + answer.length) / 4);

      return { answer, tokensUsed };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check for permanent errors (don't retry)
      if (error instanceof Error) {
        // Authentication errors - permanent, don't retry, don't fallback
        if (isAuthError(error)) {
          throw new Error('Invalid Gemini API key. Please check your GEMINI_API_KEY in .env file.');
        }

        // Model not found - permanent
        if (isModelNotFoundError(error)) {
          throw new Error(`Gemini model "${config.gemini.model}" not available. Please check the model name.`);
        }

        // Quota exhausted - permanent (user needs to upgrade or wait for reset)
        if (isQuotaExhausted(error)) {
          throw new Error('Gemini API quota exhausted. Please check your Google AI Studio quota or upgrade your plan.');
        }
      }

      // If this was the last attempt, don't retry
      if (attempt === MAX_RETRIES) {
        break;
      }

      // Check if error is retryable
      if (!isRetryableError(error)) {
        // Non-retryable error, throw immediately
        throw error;
      }

      // Wait before retry with exponential backoff
      await sleep(delay);
      delay = Math.min(delay * BACKOFF_MULTIPLIER, MAX_DELAY_MS);
    }
  }

  // All retries exhausted - format final error
  if (lastError) {
    if (lastError instanceof Error) {
      const message = lastError.message.toLowerCase();

      if (message.includes('rate limit') || message.includes('quota') || message.includes('429')) {
        throw new Error('Gemini API rate limit exceeded. Please wait a moment before trying again.');
      }
      if (message.includes('high demand') || message.includes('503') || message.includes('service unavailable')) {
        throw new Error('Gemini API is experiencing high demand. Please try again in a few moments.');
      }
      if (message.includes('network') || message.includes('timeout') || message.includes('fetch') || message.includes('econnreset') || message.includes('etimedout')) {
        throw new Error('Network error connecting to Gemini API. Please check your internet connection.');
      }
    }

    throw new Error(`Failed to generate answer after ${MAX_RETRIES + 1} attempts: ${lastError.message}`);
  }

  throw new Error('Failed to generate answer with Gemini: Unknown error');
}

/**
 * Generate a single answer with OpenAI (with exponential backoff retry)
 */
async function generateAnswerWithOpenAI(
  question: Question,
  subject: string,
  level: string,
  length: 'short' | 'medium' | 'detailed',
  settings?: AssignmentSettings
): Promise<{ answer: string; tokensUsed: number }> {
  const client = getOpenAIClient();
  const { systemPrompt, userPrompt } = buildPrompt(question, subject, level, length);

  let lastError: Error | null = null;
  let delay = INITIAL_DELAY_MS;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await withTimeout(
        client.chat.completions.create({
          model: config.openai.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: config.openai.maxTokens,
          temperature: 0.7,
        }),
        config.openai.timeout,
        'OpenAI API request timed out'
      );

      const answer = validateAnswer(response.choices[0]?.message?.content || '');
      const tokensUsed = response.usage?.total_tokens || Math.ceil((systemPrompt.length + userPrompt.length + answer.length) / 4);

      return { answer, tokensUsed };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check for permanent errors (don't retry)
      if (error instanceof Error) {
        // Authentication errors - permanent
        if (isAuthError(error)) {
          throw new Error('Invalid OpenAI API key. Please check your OPENAI_API_KEY in .env file.');
        }

        // Model not found - permanent
        if (isModelNotFoundError(error)) {
          throw new Error(`OpenAI model "${config.openai.model}" not available. Please check the model name.`);
        }

        // Quota exhausted - permanent
        if (isQuotaExhausted(error) || error.message.toLowerCase().includes('insufficient_quota') || error.message.toLowerCase().includes('billing')) {
          throw new Error('OpenAI API quota exhausted. Please check your OpenAI billing/quota.');
        }
      }

      // If this was the last attempt, don't retry
      if (attempt === MAX_RETRIES) {
        break;
      }

      // Check if error is retryable
      if (!isRetryableError(error)) {
        // Non-retryable error, throw immediately
        throw error;
      }

      // Wait before retry with exponential backoff
      await sleep(delay);
      delay = Math.min(delay * BACKOFF_MULTIPLIER, MAX_DELAY_MS);
    }
  }

  // All retries exhausted
  if (lastError) {
    if (lastError instanceof Error) {
      const message = lastError.message.toLowerCase();

      if (message.includes('rate limit') || message.includes('429')) {
        throw new Error('OpenAI API rate limit exceeded. Please wait a moment before trying again.');
      }
      if (message.includes('high demand') || message.includes('503') || message.includes('service unavailable')) {
        throw new Error('OpenAI API is experiencing high demand. Please try again in a few moments.');
      }
      if (message.includes('network') || message.includes('timeout') || message.includes('fetch') || message.includes('econnreset') || message.includes('etimedout')) {
        throw new Error('Network error connecting to OpenAI API. Please check your internet connection.');
      }
    }

    throw new Error(`Failed to generate answer with OpenAI after ${MAX_RETRIES + 1} attempts: ${lastError.message}`);
  }

  throw new Error('Failed to generate answer with OpenAI: Unknown error');
}

/**
 * Generate a single answer with Groq (with exponential backoff retry)
 */
async function generateAnswerWithGroq(
  question: Question,
  subject: string,
  level: string,
  length: 'short' | 'medium' | 'detailed',
  settings?: AssignmentSettings
): Promise<{ answer: string; tokensUsed: number }> {
  const client = getGroqClient();
  const { systemPrompt, userPrompt } = buildPrompt(question, subject, level, length);

  let lastError: Error | null = null;
  let delay = INITIAL_DELAY_MS;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await withTimeout(
        client.chat.completions.create({
          model: config.groq.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: config.groq.maxTokens,
          temperature: 0.7,
        }),
        config.groq.timeout,
        'Groq API request timed out'
      );

      const answer = validateAnswer(response.choices[0]?.message?.content || '');
      const tokensUsed = response.usage?.total_tokens || Math.ceil((systemPrompt.length + userPrompt.length + answer.length) / 4);

      return { answer, tokensUsed };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check for permanent errors (don't retry)
      if (error instanceof Error) {
        // Authentication errors - permanent
        if (isAuthError(error)) {
          throw new Error('Invalid Groq API key. Please check your GROQ_API_KEY in .env file.');
        }

        // Model not found - permanent
        if (isModelNotFoundError(error)) {
          throw new Error(`Groq model "${config.groq.model}" not available. Please check the model name.`);
        }

        // Quota exhausted - permanent
        if (isQuotaExhausted(error) || error.message.toLowerCase().includes('insufficient_quota') || error.message.toLowerCase().includes('billing')) {
          throw new Error('Groq API quota exhausted. Please check your Groq billing/quota.');
        }
      }

      // If this was the last attempt, don't retry
      if (attempt === MAX_RETRIES) {
        break;
      }

      // Check if error is retryable
      if (!isRetryableError(error)) {
        // Non-retryable error, throw immediately
        throw error;
      }

      // Wait before retry with exponential backoff
      await sleep(delay);
      delay = Math.min(delay * BACKOFF_MULTIPLIER, MAX_DELAY_MS);
    }
  }

  // All retries exhausted
  if (lastError) {
    if (lastError instanceof Error) {
      const message = lastError.message.toLowerCase();

      if (message.includes('rate limit') || message.includes('429')) {
        throw new Error('Groq API rate limit exceeded. Please wait a moment before trying again.');
      }
      if (message.includes('high demand') || message.includes('503') || message.includes('service unavailable')) {
        throw new Error('Groq API is experiencing high demand. Please try again in a few moments.');
      }
      if (message.includes('network') || message.includes('timeout') || message.includes('fetch') || message.includes('econnreset') || message.includes('etimedout')) {
        throw new Error('Network error connecting to Groq API. Please check your internet connection.');
      }
    }

    throw new Error(`Failed to generate answer with Groq after ${MAX_RETRIES + 1} attempts: ${lastError.message}`);
  }

  throw new Error('Failed to generate answer with Groq: Unknown error');
}

/**
 * Generate a single answer for a question using configured AI provider with fallback
 * Priority: Gemini → Groq → Error
 */
export async function generateAnswer(
  question: Question,
  subject: string,
  level: string,
  length: 'short' | 'medium' | 'detailed',
  settings?: AssignmentSettings
): Promise<{ answer: string; tokensUsed: number }> {
  // Clean cache periodically
  cleanCache();

  const cacheKey = getCacheKey(question, subject, level, length);

  // Check for cached result first (fastest path)
  const cachedEntry = requestCache.get(cacheKey);
  if (cachedEntry) {
    // Check if cache entry is still valid (within TTL)
    if (Date.now() - cachedEntry.timestamp < CACHE_TTL) {
      // Return cached result if available
      if (cachedEntry.result) {
        return cachedEntry.result;
      }
      // Otherwise return in-flight promise for deduplication
      if (cachedEntry.promise) {
        return cachedEntry.promise;
      }
    } else {
      // Expired, remove it
      requestCache.delete(cacheKey);
    }
  }

  // Create new request with fallback logic
  const promise = generateAnswerWithFallback(question, subject, level, length, settings);

  // Cache the promise with timestamp for deduplication
  requestCache.set(cacheKey, { promise, timestamp: Date.now() });

  try {
    const result = await promise;
    // Store the result in cache for subsequent requests
    requestCache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  } catch (error) {
    // On error, remove the promise from cache so next request can retry
    requestCache.delete(cacheKey);
    throw error;
  }
}

/**
 * Generate answer with primary provider and fallback to secondary provider
 * Priority: Gemini (primary) → Groq (fallback) → Error
 */
async function generateAnswerWithFallback(
  question: Question,
  subject: string,
  level: string,
  length: 'short' | 'medium' | 'detailed',
  settings?: AssignmentSettings
): Promise<{ answer: string; tokensUsed: number }> {
  const primaryProvider = AI_PROVIDER;
  const secondaryProvider = FALLBACK_PROVIDER;

  // Try primary provider first
  try {
    if (primaryProvider === 'gemini') {
      return await generateAnswerWithGemini(question, subject, level, length, settings);
    } else if (primaryProvider === 'groq') {
      return await generateAnswerWithGroq(question, subject, level, length, settings);
    } else {
      return await generateAnswerWithOpenAI(question, subject, level, length, settings);
    }
  } catch (primaryError) {
    // Log primary provider failure
    console.warn(`Primary AI provider (${primaryProvider}) failed, attempting fallback to ${secondaryProvider}:`, primaryError instanceof Error ? primaryError.message : primaryError);

    // Check if it's a permanent error that we shouldn't fallback for
    if (primaryError instanceof Error) {
      const message = primaryError.message.toLowerCase();
      // Don't fallback for authentication errors - these are configuration issues
      if (isAuthError(primaryError)) {
        throw primaryError;
      }
      // Don't fallback for model not found - configuration issue
      if (isModelNotFoundError(primaryError)) {
        throw primaryError;
      }
      // Don't fallback for quota exhausted - user needs to address this
      if (isQuotaExhausted(primaryError)) {
        throw primaryError;
      }
    }

    // Try fallback provider
    try {
      if (secondaryProvider === 'groq') {
        return await generateAnswerWithGroq(question, subject, level, length, settings);
      } else if (secondaryProvider === 'gemini') {
        return await generateAnswerWithGemini(question, subject, level, length, settings);
      } else {
        return await generateAnswerWithOpenAI(question, subject, level, length, settings);
      }
    } catch (fallbackError) {
      // Both providers failed - throw combined error
      const primaryMsg = primaryError instanceof Error ? primaryError.message : String(primaryError);
      const fallbackMsg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      throw new Error(`Both AI providers failed. Primary (${primaryProvider}): ${primaryMsg}. Fallback (${secondaryProvider}): ${fallbackMsg}`);
    }
  }
}

/**
 * Generate answers for multiple questions in batch with concurrency control and delays
 */
export async function generateAnswers(
  questions: Question[],
  subject: string,
  level: string,
  length: 'short' | 'medium' | 'detailed' = 'medium',
  settings?: AssignmentSettings
): Promise<Answer[]> {
  const answers: Answer[] = [];

  // Process questions with controlled concurrency
  const concurrency = BATCH_CONCURRENCY;
  const queue = [...questions];
  const running: Promise<void>[] = [];

  // Helper to process a single question
  const processQuestion = async (question: Question, index: number): Promise<void> => {
    try {
      const { answer, tokensUsed } = await generateAnswer(question, subject, level, length, settings);

      answers[index] = {
        id: `ans-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        questionId: question.id,
        content: answer,
        length,
        isEdited: false,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`Failed to generate answer for question ${question.id}:`, error);

      // Check if it's a quota exhausted error - stop processing remaining questions
      if (error instanceof Error && isQuotaExhausted(error)) {
        answers[index] = {
          id: `ans-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          questionId: question.id,
          content: `[Error: ${error.message}]`,
          length,
          isEdited: false,
          generatedAt: new Date().toISOString(),
        };

        // Mark remaining questions as quota exhausted
        for (let j = index + 1; j < questions.length; j++) {
          if (!answers[j]) {
            answers[j] = {
              id: `ans-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              questionId: questions[j].id,
              content: '[Error: API quota exhausted. Please check your Google AI Studio quota or wait for reset.]',
              length,
              isEdited: false,
              generatedAt: new Date().toISOString(),
            };
          }
        }
        // Clear queue to stop processing
        queue.length = 0;
        return;
      }

      // For other errors, add fallback and continue
      answers[index] = {
        id: `ans-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        questionId: question.id,
        content: `[Error generating answer: ${error instanceof Error ? error.message : 'Unknown error'}]`,
        length,
        isEdited: false,
        generatedAt: new Date().toISOString(),
      };
    }
  };

  // Process with concurrency control
  while (queue.length > 0 || running.length > 0) {
    // Start new tasks up to concurrency limit
    while (queue.length > 0 && running.length < concurrency) {
      const question = queue.shift()!;
      const index = questions.indexOf(question);

      const promise = processQuestion(question, index);
      running.push(promise);

      // Add small delay between starting concurrent requests to avoid burst
      if (queue.length > 0) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    // Wait for at least one to complete
    if (running.length > 0) {
      await Promise.race(running);
      // Remove completed promises
      const completedIndex = running.findIndex(p =>
        // Check if promise is settled
        Promise.resolve(p).then(() => true).catch(() => true)
      );
      // Actually, we need a different approach - wait for any to settle
      await Promise.allSettled(running.splice(0, 1));
    }
  }

  // Wait for any remaining
  if (running.length > 0) {
    await Promise.allSettled(running);
  }

  return answers;
}

/**
 * Generate a detailed answer with step-by-step reasoning
 */
export async function generateDetailedAnswer(
  question: Question,
  subject: string,
  level: string
): Promise<{ answer: string; tokensUsed: number }> {
  return generateAnswer(question, subject, level, 'detailed');
}

/**
 * Regenerate an existing answer (for retry/regenerate functionality)
 * Uses primary provider directly (bypasses cache and fallback for explicit regeneration)
 */
export async function regenerateAnswer(
  question: Question,
  subject: string,
  level: string,
  length: 'short' | 'medium' | 'detailed' = 'medium'
): Promise<{ answer: string; tokensUsed: number }> {
  // Bypass cache for explicit regeneration requests
  if (AI_PROVIDER === 'gemini') {
    return generateAnswerWithGemini(question, subject, level, length);
  } else if (AI_PROVIDER === 'groq') {
    return generateAnswerWithGroq(question, subject, level, length);
  } else {
    return generateAnswerWithOpenAI(question, subject, level, length);
  }
}

export { generateAnswer as default };