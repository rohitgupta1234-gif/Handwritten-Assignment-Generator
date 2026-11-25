import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { logger } from '../utils/logger';
import {
  Assignment,
  Question,
  Answer,
  AssignmentSettings,
  HandwritingCharacteristics,
  HandwritingProfile,
  HandwritingSample,
  GenerationSettings,
  GeneratedAssignment,
  GeneratedPage,
  HandwritingMode,
  RealisticHandwritingOptions,
  ForgeGenerationOptions,
  ForgeMetadata,
  GenerationProgress,
  PageSize,
  PaperStyle,
  HandwritingGenerationOptions,
} from '../types';
import { generateHandwrittenPages, generateFullHTML } from './handwritingSynthesis';
import { generateRealisticHandwrittenPages, generateRealisticFullHTML, validateRealisticOptions, createDefaultRealisticOptions } from './realisticHandwriting';
import { getForgeClient, ForgeClient } from './forgeClient';
import { getMultiSampleAnalyzer, MultiSampleAnalyzer } from './multiSampleAnalysis';
import { generateAssignmentPDF } from './pdfExportHeadless';
import { generateAssignmentDOCX, generateAssignmentDOCXEditable } from './docxExportHeadless';
import { queries, getDatabase } from '../database/initialize';

// Type for rendered pages from the handwriting engines
interface RenderedPage {
  pageNumber: number;
  content: string;
  width: number;
  height: number;
}

interface GenerationContext {
  generatedAssignmentId: string;
  userId: string;
  assignmentId?: string;
  handwritingProfileId?: string;
  generationSettingsId?: string;
  mode: HandwritingMode;
  options: HandwritingGenerationOptions;
  onProgress?: (progress: GenerationProgress) => void;
}

// Cache for handwriting generation results
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number;
}

interface HandwritingCacheKey {
  mode: HandwritingMode;
  assignmentHash: string;
  questionsHash: string;
  answersHash: string;
  settingsHash: string;
  profileHash?: string;
  realisticOptionsHash?: string;
}

/**
 * Simple in-memory cache with LRU eviction and TTL
 */
class HandwritingCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize = 100;
  private ttlMs = 30 * 60 * 1000; // 30 minutes

  private generateKey(key: HandwritingCacheKey): string {
    return JSON.stringify(key);
  }

  private hashString(str: string): string {
    // Simple hash function for cache keys
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  private hashObject(obj: any): string {
    return this.hashString(JSON.stringify(obj));
  }

  get<T>(key: HandwritingCacheKey): T | null {
    const cacheKey = this.generateKey(key);
    const entry = this.cache.get(cacheKey);

    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(cacheKey);
      return null;
    }

    entry.hits++;
    return entry.data as T;
  }

  set<T>(key: HandwritingCacheKey, data: T): void {
    const cacheKey = this.generateKey(key);

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      let oldestKey: string | null = null;
      let oldestTime = Date.now();

      for (const [k, v] of this.cache.entries()) {
        if (v.timestamp < oldestTime) {
          oldestTime = v.timestamp;
          oldestKey = k;
        }
      }

      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { size: number; maxSize: number; ttlMinutes: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttlMinutes: this.ttlMs / (60 * 1000),
    };
  }
}

// Global cache instance
const handwritingCache = new HandwritingCache();

/**
 * Unified Handwriting Generation Service
 * Handles both personal and realistic handwriting generation modes
 * with Forge API integration and fallback
 */
class HandwritingGenerationService {
  private forgeClient: ForgeClient;
  private analyzer: MultiSampleAnalyzer;
  private activeGenerations: Map<string, GenerationContext> = new Map();

  constructor() {
    this.forgeClient = getForgeClient();
    this.analyzer = getMultiSampleAnalyzer();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return handwritingCache.getStats();
  }

  /**
   * Clear the handwriting cache
   */
  clearCache(): void {
    handwritingCache.clear();
  }

  /**
   * Generate cache key for handwriting options
   */
  private generateCacheKey(options: HandwritingGenerationOptions): HandwritingCacheKey {
    const { assignment, questions, answers, settings, profile, realisticOptions, mode } = options;

    const hashString = (obj: any) => {
      const str = JSON.stringify(obj);
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return hash.toString(36);
    };

    return {
      mode,
      assignmentHash: hashString({ id: assignment.id, title: assignment.title, paperStyle: assignment.paperStyle, pageSize: assignment.pageSize }),
      questionsHash: hashString(questions),
      answersHash: hashString(answers),
      settingsHash: hashString(settings),
      profileHash: profile ? hashString({ id: profile.id, characteristics: profile.characteristics }) : undefined,
      realisticOptionsHash: realisticOptions ? hashString(realisticOptions) : undefined,
    };
  }

  /**
   * Generate handwritten assignment
   */
  async generate(context: GenerationContext): Promise<GeneratedAssignment> {
    const { generatedAssignmentId, userId, options, onProgress } = context;
    const startTime = Date.now();

    try {
      // Update status to generating
      await this.updateGeneratedAssignment(generatedAssignmentId, {
        status: 'generating',
      });

      onProgress?.({
        stage: 'initializing',
        progress: 5,
        message: 'Initializing handwriting generation...',
      });

      // Validate options
      const validatedOptions = this.validateOptions(options);

      onProgress?.({
        stage: 'analyzing',
        progress: 15,
        message: validatedOptions.mode === 'personal' ? 'Analyzing personal handwriting...' : 'Preparing realistic handwriting style...',
      });

      // Prepare handwriting data based on mode
      let handwritingData: {
        pages: any[];
        totalPages: number;
        fullHtml: string;
        metadata?: ForgeMetadata;
      };

      if (validatedOptions.mode === 'personal') {
        handwritingData = await this.generatePersonalHandwriting(validatedOptions, onProgress);
      } else {
        handwritingData = await this.generateRealisticHandwriting(validatedOptions, onProgress);
      }

      onProgress?.({
        stage: 'rendering',
        progress: 60,
        message: 'Rendering pages...',
        totalPages: handwritingData.totalPages,
      });

      // Store generated pages
      await this.storeGeneratedPages(generatedAssignmentId, handwritingData.pages);

      onProgress?.({
        stage: 'exporting',
        progress: 80,
        message: 'Generating PDF and DOCX...',
      });

      // Generate PDF and DOCX
      const [pdfBuffer, docxBuffer] = await Promise.all([
        this.generatePDF(validatedOptions, handwritingData),
        this.generateDOCX(validatedOptions, handwritingData),
      ]);

      // Save files
      const pdfUrl = await this.saveFile(userId, `assignment-${generatedAssignmentId}.pdf`, pdfBuffer, 'pdf');
      const docxUrl = await this.saveFile(userId, `assignment-${generatedAssignmentId}.docx`, docxBuffer, 'docx');

      const generationTimeMs = Date.now() - startTime;
      const now = new Date().toISOString();

      // Update generated assignment with results
      const result = await this.updateGeneratedAssignment(generatedAssignmentId, {
        status: 'completed',
        totalPages: handwritingData.totalPages,
        pagesData: handwritingData.pages.map((p, index) => ({
          id: uuidv4(),
          generatedAssignmentId,
          pageNumber: p.pageNumber,
          htmlContent: p.content,
          width: p.width,
          height: p.height,
          createdAt: now,
        })),
        pdfUrl,
        docxUrl,
        forgeMetadata: handwritingData.metadata,
        generationTimeMs,
      });

      onProgress?.({
        stage: 'completed',
        progress: 100,
        message: 'Generation completed!',
        totalPages: handwritingData.totalPages,
      });

      // Log activity
      await this.logActivity(userId, {
        type: 'handwriting_generated',
        title: 'Handwritten Assignment Generated',
        description: `Generated ${handwritingData.totalPages} page(s) in ${validatedOptions.mode} mode`,
        metadata: JSON.stringify({
          mode: validatedOptions.mode,
          totalPages: handwritingData.totalPages,
          generationTimeMs,
          forgeUsed: !!handwritingData.metadata,
        }),
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Handwriting generation failed:', error);

      await this.updateGeneratedAssignment(generatedAssignmentId, {
        status: 'failed',
        errorMessage,
      });

      onProgress?.({
        stage: 'failed',
        progress: 0,
        message: `Generation failed: ${errorMessage}`,
        error: errorMessage,
      });

      throw error;
    } finally {
      this.activeGenerations.delete(generatedAssignmentId);
    }
  }

  /**
   * Validate generation options
   */
  private validateOptions(options: HandwritingGenerationOptions): HandwritingGenerationOptions {
    if (options.mode === 'realistic') {
      return {
        ...options,
        realisticOptions: validateRealisticOptions(options.realisticOptions),
      };
    }
    return options;
  }

  /**
   * Generate personal handwriting (Mode 2)
   */
  private async generatePersonalHandwriting(
    options: HandwritingGenerationOptions,
    onProgress?: (progress: GenerationProgress) => void
  ) {
    const { assignment, questions, answers, profile, samples, settings, generationSettings } = options;

    if (!profile) {
      throw new Error('Handwriting profile required for personal mode');
    }

    // Check cache first
    const cacheKey = this.generateCacheKey(options);
    const cached = handwritingCache.get<{
      pages: any[];
      totalPages: number;
      fullHtml: string;
    }>(cacheKey);
    if (cached) {
      logger.info('Cache hit for personal handwriting generation');
      onProgress?.({
        stage: 'generating',
        progress: 50,
        message: 'Retrieved from cache',
        totalPages: cached.totalPages,
      });
      return cached;
    }

    // Use analyzed characteristics from profile
    const characteristics = profile.characteristics;

    onProgress?.({
      stage: 'analyzing',
      progress: 25,
      message: 'Using analyzed handwriting characteristics...',
    });

    // Generate pages using existing synthesis engine
    const { pages, totalPages } = generateHandwrittenPages(
      assignment,
      questions,
      answers,
      { characteristics },
      settings
    );

    const fullHtml = generateFullHTML(assignment, questions, answers, { characteristics }, settings);

    onProgress?.({
      stage: 'generating',
      progress: 50,
      message: 'Generated handwritten pages',
      totalPages,
    });

    const result = {
      pages: pages.map(p => ({ ...p, content: p.content })),
      totalPages,
      fullHtml,
    };

    // Store in cache
    handwritingCache.set(cacheKey, result);

    return result;
  }

  /**
   * Generate realistic handwriting (Mode 1)
   */
  private async generateRealisticHandwriting(
    options: HandwritingGenerationOptions,
    onProgress?: (progress: GenerationProgress) => void
  ) {
    const { assignment, questions, answers, settings, realisticOptions, generationSettings, forgeOptions } = options;

    // Validate and use default realistic options if not provided
    const realisticOpts = validateRealisticOptions(realisticOptions);

    // Check cache first (use options with defaults applied)
    const optionsWithDefaults = { ...options, realisticOptions: realisticOpts };
    const cacheKey = this.generateCacheKey(optionsWithDefaults);
    const cached = handwritingCache.get<{
      pages: any[];
      totalPages: number;
      fullHtml: string;
      metadata?: ForgeMetadata;
    }>(cacheKey);
    if (cached) {
      logger.info('Cache hit for realistic handwriting generation');
      onProgress?.({
        stage: 'generating',
        progress: 55,
        message: 'Retrieved from cache',
        totalPages: cached.totalPages,
      });
      return cached;
    }

    onProgress?.({
      stage: 'analyzing',
      progress: 25,
      message: `Preparing ${realisticOpts.style} handwriting style...`,
    });

    // Check if Forge should be used
    const useForge = forgeOptions?.useForge && this.forgeClient.isForgeHealthy();

    let forgeMetadata: ForgeMetadata | undefined;

    if (useForge) {
      try {
        onProgress?.({
          stage: 'generating',
          progress: 40,
          message: 'Generating handwriting with Forge AI...',
        });

        // Generate handwriting images using Forge for each page
        // For now, we'll use the CSS-based engine as primary and Forge as enhancement
        forgeMetadata = await this.enhanceWithForge(assignment, questions, answers, realisticOpts, forgeOptions);
      } catch (error) {
        logger.warn('Forge generation failed, falling back to CSS engine:', error);
        onProgress?.({
          stage: 'generating',
          progress: 45,
          message: 'Forge unavailable, using CSS-based engine...',
        });
      }
    }

    // Generate pages using realistic CSS engine
    const { pages, totalPages } = generateRealisticHandwrittenPages(
      assignment,
      questions,
      answers,
      realisticOpts,
      settings,
      undefined // No base characteristics for realistic mode
    );

    const fullHtml = generateRealisticFullHTML(assignment, questions, answers, realisticOpts, settings);

    onProgress?.({
      stage: 'generating',
      progress: 55,
      message: `Generated ${totalPages} page(s) with realistic handwriting`,
      totalPages,
    });

    const result = {
      pages: pages.map(p => ({ ...p, content: p.content })),
      totalPages,
      fullHtml,
      metadata: forgeMetadata,
    };

    // Store in cache
    handwritingCache.set(cacheKey, result);

    return result;
  }

  /**
   * Enhance handwriting with Forge AI
   */
  private async enhanceWithForge(
    assignment: Assignment,
    questions: Question[],
    answers: Answer[],
    realisticOpts: RealisticHandwritingOptions,
    forgeOptions?: ForgeGenerationOptions
  ): Promise<ForgeMetadata | undefined> {
    try {
      // Generate a sample of the handwriting style using Forge
      const sampleText = 'The quick brown fox jumps over the lazy dog. Handwriting sample for style reference.';

      // Map paperStyle to Forge-compatible values (Forge only accepts 'ruled', 'plain', 'grid')
      const forgePaperStyle = realisticOpts.paperStyle === 'custom' ? 'plain' : realisticOpts.paperStyle;

      const result = await this.forgeClient.generateHandwriting(sampleText, {
        style: realisticOpts.style,
        penColor: realisticOpts.penColor,
        paperStyle: forgePaperStyle,
        width: forgeOptions?.width || 768,
        height: forgeOptions?.height || 1024,
        seed: forgeOptions?.seed,
        denoisingStrength: forgeOptions?.denoisingStrength || 0.7,
        controlNet: forgeOptions?.controlNet,
      });

      return {
        ...result.metadata,
        processingTimeMs: result.metadata.processingTimeMs,
      };
    } catch (error) {
      logger.error('Forge enhancement failed:', error);
      return undefined;
    }
  }

  /**
   * Generate PDF from handwritten pages with fallback
   */
  private async generatePDF(
    options: HandwritingGenerationOptions,
    handwritingData: { pages: any[]; totalPages: number; fullHtml: string }
  ): Promise<Buffer> {
    const { assignment, questions, answers, settings } = options;

    // Try primary PDF generation (headless browser with images)
    try {
      return await generateAssignmentPDF({
        assignment,
        questions,
        answers,
        handwritingProfile: { characteristics: options.profile?.characteristics || {} as any },
        settings,
      });
    } catch (primaryError) {
      logger.warn('Primary PDF generation failed, attempting direct HTML-to-PDF fallback:', primaryError);

      // Fallback: Direct HTML-to-PDF using Puppeteer's PDF generation
      try {
        const { generateAssignmentPDFDirect } = await import('./pdfExportHeadless.js');
        return await generateAssignmentPDFDirect(
          handwritingData.fullHtml,
          assignment.pageSize || 'A4',
          settings
        );
      } catch (fallbackError) {
        logger.error('PDF fallback also failed:', fallbackError);
        throw new Error(`PDF generation failed: ${primaryError instanceof Error ? primaryError.message : 'Unknown error'}. Fallback also failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Generate DOCX from handwritten pages with fallback
   */
  private async generateDOCX(
    options: HandwritingGenerationOptions,
    handwritingData: { pages: any[]; totalPages: number; fullHtml: string }
  ): Promise<Buffer> {
    const { assignment, questions, answers, settings } = options;

    // Try primary DOCX generation (image-based)
    try {
      return await generateAssignmentDOCX({
        assignment,
        questions,
        answers,
        handwritingProfile: { characteristics: options.profile?.characteristics || {} as any },
        settings,
      });
    } catch (primaryError) {
      logger.warn('Primary DOCX generation failed, attempting text-only editable DOCX fallback:', primaryError);

      // Fallback: Text-only editable DOCX
      try {
        return await generateAssignmentDOCXEditable({
          assignment,
          questions,
          answers,
          handwritingProfile: { characteristics: options.profile?.characteristics || {} as any },
          settings,
        });
      } catch (fallbackError) {
        logger.error('DOCX fallback also failed:', fallbackError);
        throw new Error(`DOCX generation failed: ${primaryError instanceof Error ? primaryError.message : 'Unknown error'}. Fallback also failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Store generated pages in database
   */
  private async storeGeneratedPages(generatedAssignmentId: string, pages: any[]): Promise<void> {
    for (const page of pages) {
      await queries.createGeneratedPage({
        id: uuidv4(),
        generated_assignment_id: generatedAssignmentId,
        page_number: page.pageNumber,
        html_content: page.content,
        width: page.width,
        height: page.height,
      });
    }
  }

  /**
   * Save file to uploads directory and database
   */
  private async saveFile(userId: string, filename: string, buffer: Buffer, purpose: string): Promise<string> {
    const uploadDir = config.upload.uploadDir;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);
    await fs.promises.writeFile(filePath, buffer);

    const fileUrl = `/uploads/${filename}`;
    const fileId = uuidv4();

    queries.createFile({
      id: fileId,
      user_id: userId,
      original_name: filename,
      stored_name: filename,
      mime_type: purpose === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: buffer.length,
      url: fileUrl,
      purpose,
    });

    return fileUrl;
  }

  /**
   * Update generated assignment in database
   */
  private async updateGeneratedAssignment(
    id: string,
    data: Partial<GeneratedAssignment>
  ): Promise<GeneratedAssignment> {
    const dbData: any = {};
    if (data.status) dbData.status = data.status;
    if (data.totalPages !== undefined) dbData.total_pages = data.totalPages;
    if (data.pagesData) dbData.pages_data = JSON.stringify(data.pagesData);
    if (data.pdfUrl) dbData.pdf_url = data.pdfUrl;
    if (data.docxUrl) dbData.docx_url = data.docxUrl;
    if (data.forgeMetadata) dbData.forge_metadata = JSON.stringify(data.forgeMetadata);
    if (data.errorMessage) dbData.error_message = data.errorMessage;
    if (data.generationTimeMs !== undefined) dbData.generation_time_ms = data.generationTimeMs;

    queries.updateGeneratedAssignment(id, dbData);

    const updated = queries.getGeneratedAssignmentById(id);
    if (!updated) throw new Error('Generated assignment not found after update');

    return {
      id: updated.id,
      userId: updated.user_id,
      assignmentId: updated.assignment_id,
      handwritingProfileId: updated.handwriting_profile_id,
      generationSettingsId: updated.generation_settings_id,
      status: updated.status,
      mode: updated.mode,
      totalPages: updated.total_pages,
      pagesData: updated.pages_data ? JSON.parse(updated.pages_data) : undefined,
      pdfUrl: updated.pdf_url,
      docxUrl: updated.docx_url,
      forgeMetadata: updated.forge_metadata ? JSON.parse(updated.forge_metadata) : undefined,
      errorMessage: updated.error_message,
      generationTimeMs: updated.generation_time_ms,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    };
  }

  /**
   * Log activity
   */
  private async logActivity(userId: string, activity: { type: string; title: string; description: string; metadata?: string }): Promise<void> {
    queries.logActivity({
      id: uuidv4(),
      user_id: userId,
      type: activity.type,
      title: activity.title,
      description: activity.description,
      metadata: activity.metadata ?? undefined,
    });
  }

  /**
   * Create a new generation job
   */
  async createGenerationJob(
    userId: string,
    options: HandwritingGenerationOptions
  ): Promise<GeneratedAssignment> {
    const generatedAssignmentId = uuidv4();

    const generatedAssignment = await queries.createGeneratedAssignment({
      id: generatedAssignmentId,
      user_id: userId,
      assignment_id: options.assignment?.id,
      handwriting_profile_id: options.profile?.id,
      generation_settings_id: options.generationSettings?.id,
      status: 'pending',
      mode: options.mode,
      total_pages: 0,
      generation_time_ms: 0,
    });

    const context: GenerationContext = {
      generatedAssignmentId,
      userId,
      assignmentId: options.assignment?.id,
      handwritingProfileId: options.profile?.id,
      generationSettingsId: options.generationSettings?.id,
      mode: options.mode,
      options,
    };

    this.activeGenerations.set(generatedAssignmentId, context);

    return {
      id: generatedAssignmentId,
      userId,
      assignmentId: options.assignment?.id,
      handwritingProfileId: options.profile?.id,
      generationSettingsId: options.generationSettings?.id,
      status: 'pending',
      mode: options.mode,
      totalPages: 0,
      generationTimeMs: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Start generation job asynchronously
   */
  async startGenerationJob(
    generatedAssignmentId: string,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<void> {
    const context = this.activeGenerations.get(generatedAssignmentId);
    if (!context) {
      throw new Error('Generation job not found');
    }

    // Run generation in background
    this.generate({ ...context, onProgress }).catch(error => {
      logger.error(`Generation job ${generatedAssignmentId} failed:`, error);
    });
  }

  /**
   * Get generation progress
   */
  getGenerationProgress(generatedAssignmentId: string): GenerationProgress | null {
    const context = this.activeGenerations.get(generatedAssignmentId);
    if (!context) return null;

    // Could implement more sophisticated progress tracking
    return {
      stage: 'generating',
      progress: 50,
      message: 'Generation in progress...',
    };
  }

  /**
   * Cancel generation job
   */
  async cancelGenerationJob(generatedAssignmentId: string): Promise<boolean> {
    const context = this.activeGenerations.get(generatedAssignmentId);
    if (!context) return false;

    // Interrupt Forge if running
    await this.forgeClient.interrupt();

    // Update status
    await this.updateGeneratedAssignment(generatedAssignmentId, {
      status: 'failed',
      errorMessage: 'Cancelled by user',
    });

    this.activeGenerations.delete(generatedAssignmentId);

    return true;
  }

  /**
   * Retry a failed generation job
   */
  async retryGenerationJob(
    generatedAssignmentId: string,
    userId: string,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<GeneratedAssignment> {
    // Get the failed job
    const existingJob = queries.getGeneratedAssignmentById(generatedAssignmentId);
    if (!existingJob) {
      throw new Error('Generation job not found');
    }

    // Check ownership
    if (existingJob.user_id !== userId) {
      throw new Error('Unauthorized: Cannot retry another user\'s job');
    }

    // Check if job is in a retryable state
    if (existingJob.status !== 'failed' && existingJob.status !== 'cancelled') {
      throw new Error(`Cannot retry job with status: ${existingJob.status}`);
    }

    // Reset the job status to pending and clear error message
    await this.updateGeneratedAssignment(generatedAssignmentId, {
      status: 'pending',
      errorMessage: undefined,
    });

    // Get the updated job
    const updatedJob = queries.getGeneratedAssignmentById(generatedAssignmentId);
    if (!updatedJob) {
      throw new Error('Failed to retry job');
    }

    return {
      id: updatedJob.id,
      userId: updatedJob.user_id,
      assignmentId: updatedJob.assignment_id,
      handwritingProfileId: updatedJob.handwriting_profile_id,
      generationSettingsId: updatedJob.generation_settings_id,
      status: updatedJob.status,
      mode: updatedJob.mode,
      totalPages: updatedJob.total_pages,
      pagesData: updatedJob.pages_data ? JSON.parse(updatedJob.pages_data) : undefined,
      pdfUrl: updatedJob.pdf_url,
      docxUrl: updatedJob.docx_url,
      forgeMetadata: updatedJob.forge_metadata ? JSON.parse(updatedJob.forge_metadata) : undefined,
      errorMessage: updatedJob.error_message,
      generationTimeMs: updatedJob.generation_time_ms,
      createdAt: updatedJob.created_at,
      updatedAt: updatedJob.updated_at,
    };
  }

  /**
   * Check if Forge is available
   */
  async checkForgeAvailability(): Promise<boolean> {
    const health = await this.forgeClient.checkHealth();
    return health.status !== 'unhealthy';
  }

  /**
   * Get available realistic styles
   */
  getAvailableStyles(): Array<{ id: string; name: string; description: string }> {
    return [
      { id: 'cursive', name: 'Cursive', description: 'Flowing connected letters, natural pen strokes' },
      { id: 'print', name: 'Print', description: 'Clear separated letters, neat block style' },
      { id: 'mixed', name: 'Mixed', description: 'Natural mix of cursive and print' },
      { id: 'calligraphy', name: 'Calligraphy', description: 'Artistic letterforms with varied stroke width' },
    ];
  }

  /**
   * Get available pen colors
   */
  getAvailablePenColors(): Array<{ id: string; name: string; hex: string }> {
    return [
      { id: 'blue', name: 'Blue', hex: '#1e3a5f' },
      { id: 'black', name: 'Black', hex: '#1a1a2e' },
    ];
  }
}

// Singleton instance
let generationServiceInstance: HandwritingGenerationService | null = null;

export function getHandwritingGenerationService(): HandwritingGenerationService {
  if (!generationServiceInstance) {
    generationServiceInstance = new HandwritingGenerationService();
  }
  return generationServiceInstance;
}

export { GenerationContext };