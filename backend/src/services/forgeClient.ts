import { config } from '../config';
import { logger } from '../utils/logger';
import {
  ForgeAPIConfig,
  ForgeHealthCheckResponse,
  ForgeTxt2ImgRequest,
  ForgeImg2ImgRequest,
  ForgeResponse,
  ForgeProgressResponse,
  ForgeMetadata,
} from '../types';

/**
 * Stable Diffusion Forge API Client
 * Provides integration with Forge's txt2img, img2img, and health check endpoints
 */
export class ForgeClient {
  private config: ForgeAPIConfig;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private isHealthy: boolean = false;
  private lastHealthCheck: number = 0;
  private healthCheckPromise: Promise<ForgeHealthCheckResponse> | null = null;

  constructor(customConfig?: Partial<ForgeAPIConfig>) {
    this.config = {
      baseUrl: config.forge?.apiUrl || process.env.FORGE_API_URL || 'http://127.0.0.1:7860',
      timeout: config.forge?.timeout || 120000, // 2 minutes default
      healthCheckInterval: config.forge?.healthCheckInterval || 30000, // 30 seconds
      maxRetries: config.forge?.maxRetries || 3,
      retryDelay: config.forge?.retryDelay || 2000,
      ...customConfig,
    };

    // Start periodic health checks
    this.startHealthChecks();
  }

  /**
   * Get the base URL for API calls
   */
  private getBaseUrl(): string {
    return this.config.baseUrl.replace(/\/+$/, '');
  }

  /**
   * Make HTTP request with timeout and retry logic
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<T> {
    const url = `${this.getBaseUrl()}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Forge API error (${response.status}): ${errorText}`);
      }

      return await response.json() as T;
    } catch (error) {
      clearTimeout(timeoutId);

      // Check if we should retry
      if (retryCount < this.config.maxRetries && this.isRetryableError(error)) {
        logger.warn(`Forge API request failed, retrying (${retryCount + 1}/${this.config.maxRetries}): ${error}`);
        await this.sleep(this.config.retryDelay * (retryCount + 1));
        return this.request<T>(endpoint, options, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      // Network errors, timeouts, 5xx errors are retryable
      if (error.name === 'AbortError' || error.name === 'TimeoutError') return true;
      if (error.message.includes('network') || error.message.includes('fetch')) return true;
      if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503') || error.message.includes('504')) return true;
      if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) return true;
    }
    return false;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    // Initial health check
    this.checkHealth();

    // Periodic health checks
    this.healthCheckTimer = setInterval(() => {
      this.checkHealth();
    }, this.config.healthCheckInterval);
  }

  /**
   * Stop health checks
   */
  stopHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * Check Forge API health
   */
  async checkHealth(): Promise<ForgeHealthCheckResponse> {
    // Prevent multiple simultaneous health checks
    if (this.healthCheckPromise) {
      return this.healthCheckPromise;
    }

    this.healthCheckPromise = this.performHealthCheck();
    try {
      return await this.healthCheckPromise;
    } finally {
      this.healthCheckPromise = null;
    }
  }

  private async performHealthCheck(): Promise<ForgeHealthCheckResponse> {
    try {
      const startTime = Date.now();
      const response = await this.request<{ version: string; models: string[] }>(
        '/sdapi/v1/system-info',
        { method: 'GET' }
      );

      const responseTime = Date.now() - startTime;
      this.isHealthy = true;
      this.lastHealthCheck = Date.now();

      return {
        status: responseTime > 5000 ? 'degraded' : 'healthy',
        version: response.version,
        modelsLoaded: response.models,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.isHealthy = false;
      logger.warn('Forge health check failed:', error);

      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Check if Forge is currently healthy
   */
  isForgeHealthy(): boolean {
    return this.isHealthy;
  }

  /**
   * Get last health check timestamp
   */
  getLastHealthCheck(): number {
    return this.lastHealthCheck;
  }

  /**
   * Get available models
   */
  async getModels(): Promise<string[]> {
    try {
      const response = await this.request<{ models: Array<{ title: string; model_name: string }> }>(
        '/sdapi/v1/sd-models',
        { method: 'GET' }
      );
      return response.models.map(m => m.title);
    } catch (error) {
      logger.error('Failed to get Forge models:', error);
      return [];
    }
  }

  /**
   * Set active model
   */
  async setModel(modelName: string): Promise<boolean> {
    try {
      await this.request(
        '/sdapi/v1/options',
        {
          method: 'POST',
          body: JSON.stringify({ sd_model_checkpoint: modelName }),
        }
      );
      return true;
    } catch (error) {
      logger.error('Failed to set Forge model:', error);
      return false;
    }
  }

  /**
   * Text-to-image generation
   */
  async txt2img(request: ForgeTxt2ImgRequest): Promise<ForgeResponse> {
    const startTime = Date.now();

    // Set defaults for handwriting generation
    const defaultRequest: ForgeTxt2ImgRequest = {
      ...request,
      prompt: request.prompt || '',
      negativePrompt: request.negativePrompt || 'blurry, low quality, distorted text, unreadable, messy, watermark, signature, border, frame',
      steps: request.steps || 20,
      cfgScale: request.cfgScale || 7,
      samplerName: request.samplerName || 'DPM++ 2M Karras',
      width: request.width || 512,
      height: request.height || 512,
      batchSize: request.batchSize || 1,
      nIter: request.nIter || 1,
      restoreFaces: request.restoreFaces ?? false,
      tiling: request.tiling ?? false,
      doNotSaveSamples: request.doNotSaveSamples ?? true,
      doNotSaveGrid: request.doNotSaveGrid ?? true,
      seed: request.seed ?? -1,
    };

    try {
      const response = await this.request<ForgeResponse>(
        '/sdapi/v1/txt2img',
        {
          method: 'POST',
          body: JSON.stringify(defaultRequest),
        }
      );

      const processingTime = Date.now() - startTime;
      logger.info(`Forge txt2img completed in ${processingTime}ms`);

      return response;
    } catch (error) {
      logger.error('Forge txt2img failed:', error);
      throw error;
    }
  }

  /**
   * Image-to-image generation
   */
  async img2img(request: ForgeImg2ImgRequest): Promise<ForgeResponse> {
    const startTime = Date.now();

    const defaultRequest: ForgeImg2ImgRequest = {
      ...request,
      prompt: request.prompt || '',
      negativePrompt: request.negativePrompt || 'blurry, low quality, distorted text, unreadable, messy, watermark, signature, border, frame',
      initImages: request.initImages || [],
      steps: request.steps || 20,
      cfgScale: request.cfgScale || 7,
      samplerName: request.samplerName || 'DPM++ 2M Karras',
      width: request.width || 512,
      height: request.height || 512,
      batchSize: request.batchSize || 1,
      nIter: request.nIter || 1,
      denoisingStrength: request.denoisingStrength ?? 0.75,
      resizeMode: request.resizeMode ?? 0,
      maskBlur: request.maskBlur ?? 4,
      inpaintingFill: request.inpaintingFill ?? 0,
      inpaintFullRes: request.inpaintFullRes ?? true,
      inpaintFullResPadding: request.inpaintFullResPadding ?? 32,
      inpaintingMaskInvert: request.inpaintingMaskInvert ?? 0,
      initialNoiseMultiplier: request.initialNoiseMultiplier ?? 1,
      seed: request.seed ?? -1,
    };

    try {
      const response = await this.request<ForgeResponse>(
        '/sdapi/v1/img2img',
        {
          method: 'POST',
          body: JSON.stringify(defaultRequest),
        }
      );

      const processingTime = Date.now() - startTime;
      logger.info(`Forge img2img completed in ${processingTime}ms`);

      return response;
    } catch (error) {
      logger.error('Forge img2img failed:', error);
      throw error;
    }
  }

  /**
   * Get generation progress
   */
  async getProgress(): Promise<ForgeProgressResponse | null> {
    try {
      return await this.request<ForgeProgressResponse>(
        '/sdapi/v1/progress',
        { method: 'GET' }
      );
    } catch (error) {
      // Progress endpoint might not be available
      return null;
    }
  }

  /**
   * Interrupt current generation
   */
  async interrupt(): Promise<boolean> {
    try {
      await this.request(
        '/sdapi/v1/interrupt',
        { method: 'POST' }
      );
      return true;
    } catch (error) {
      logger.error('Forge interrupt failed:', error);
      return false;
    }
  }

  /**
   * Generate handwriting using Forge
   * This creates a handwritten version of text using img2img with a handwriting style
   */
  async generateHandwriting(
    text: string,
    options: {
      style?: 'cursive' | 'print' | 'mixed' | 'calligraphy';
      penColor?: 'blue' | 'black';
      paperStyle?: 'ruled' | 'plain' | 'grid';
      width?: number;
      height?: number;
      seed?: number;
      denoisingStrength?: number;
      controlNet?: {
        enabled: boolean;
        model: string;
        weight: number;
        guidance: number;
      };
    } = {}
  ): Promise<{ imageBase64: string; metadata: ForgeMetadata }> {
    const {
      style = 'cursive',
      penColor = 'blue',
      paperStyle = 'ruled',
      width = 768,
      height = 1024,
      seed = -1,
      denoisingStrength = 0.7,
      controlNet,
    } = options;

    // Build prompt for handwriting generation
    const stylePrompts: Record<string, string> = {
      cursive: 'elegant cursive handwriting, flowing connected letters, natural pen strokes, personal handwriting style',
      print: 'clear print handwriting, separated letters, neat block letters, legible handwriting',
      mixed: 'mixed cursive and print handwriting, natural variation, authentic handwriting',
      calligraphy: 'calligraphy handwriting, artistic letterforms, varied stroke width, elegant flourishes',
    };

    const colorPrompts: Record<string, string> = {
      blue: 'blue ballpoint pen ink, blue ink on white paper',
      black: 'black ballpoint pen ink, black ink on white paper',
    };

    const paperPrompts: Record<string, string> = {
      ruled: 'ruled notebook paper, horizontal lines, margin line, lined paper texture',
      plain: 'plain white paper, clean background, no lines',
      grid: 'graph paper, grid lines, squared paper',
    };

    const prompt = `${text}, ${stylePrompts[style]}, ${colorPrompts[penColor]}, ${paperPrompts[paperStyle]}, high quality, sharp focus, 8k, masterpiece`;
    const negativePrompt = 'blurry, low quality, distorted text, unreadable, messy, watermark, signature, border, frame, typed text, printed text, computer font, perfect alignment, artificial, digital';

    const request: ForgeTxt2ImgRequest = {
      prompt,
      negativePrompt,
      steps: 25,
      cfgScale: 7,
      samplerName: 'DPM++ 2M Karras',
      width,
      height,
      batchSize: 1,
      nIter: 1,
      seed,
      denoisingStrength,
      restoreFaces: false,
    };

    // Add ControlNet if enabled
    if (controlNet?.enabled) {
      request.alwaysOnScripts = {
        controlnet: {
          args: [{
            enabled: true,
            model: controlNet.model,
            weight: controlNet.weight,
            guidanceStart: 0,
            guidanceEnd: controlNet.guidance,
            inputImage: '', // Would need to provide a reference image
            module: 'canny',
            processorRes: 512,
            thresholdA: 100,
            thresholdB: 200,
          }],
        },
      };
    }

    const response = await this.txt2img(request);

    // Extract metadata from response
    const metadata: ForgeMetadata = {
      model: 'forge',
      seed: seed === -1 ? Math.floor(Math.random() * 1000000) : seed,
      steps: request.steps || 20,
      cfgScale: request.cfgScale || 7,
      sampler: request.samplerName || 'DPM++ 2M Karras',
      scheduler: 'karras',
      denoisingStrength: denoisingStrength,
      width: width,
      height: height,
      processingTimeMs: 0, // Will be set by caller
      apiVersion: '1.0',
    };

    return {
      imageBase64: response.images[0],
      metadata,
    };
  }

  /**
   * Generate multiple handwriting variations
   */
  async generateHandwritingVariations(
    text: string,
    count: number,
    options: Parameters<typeof this.generateHandwriting>[1] = {}
  ): Promise<Array<{ imageBase64: string; metadata: ForgeMetadata; seed: number }>> {
    const results = [];

    for (let i = 0; i < count; i++) {
      const seed = options.seed === -1 ? Math.floor(Math.random() * 1000000) : (options.seed || 0) + i;
      const result = await this.generateHandwriting(text, { ...options, seed });
      results.push({ ...result, seed });
    }

    return results;
  }
}

// Singleton instance
let forgeClientInstance: ForgeClient | null = null;

export function getForgeClient(customConfig?: Partial<ForgeAPIConfig>): ForgeClient {
  if (!forgeClientInstance) {
    forgeClientInstance = new ForgeClient(customConfig);
  }
  return forgeClientInstance;
}

export function resetForgeClient(): void {
  if (forgeClientInstance) {
    forgeClientInstance.stopHealthChecks();
    forgeClientInstance = null;
  }
}

export { ForgeClient as default };