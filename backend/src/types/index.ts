// Shared types for backend services
// These mirror the frontend types to avoid cross-project imports

export interface HandwritingCharacteristics {
  letterHeight: number;
  letterWidth: number;
  capitalHeight: number;
  smallHeight: number;
  characterSpacing: number;
  wordSpacing: number;
  lineSpacing: number;
  writingAngle: number;
  penThickness: number;
  baselineAlignment: number;
  paragraphSpacing: number;
  avgWordsPerLine: number;
  pageMargins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  slantDirection: 'left' | 'right' | 'vertical';
  pressureVariation: number;
  connectedness: number;
}

export interface Question {
  id: string;
  text: string;
  type: 'short' | 'medium' | 'detailed' | 'essay';
  subject: string;
  order: number;
  estimatedLength: number;
}

export interface Answer {
  id: string;
  questionId: string;
  content: string;
  handwritingContent?: HandwritingContent;
  length: 'short' | 'medium' | 'detailed';
  isEdited: boolean;
  editedContent?: string;
  generatedAt: string;
}

export interface HandwritingContent {
  html: string;
  css: string;
  pages: HandwritingPage[];
  totalHeight: number;
  totalWidth: number;
}

export interface HandwritingPage {
  pageNumber: number;
  content: string;
  height: number;
  width: number;
  elements: HandwritingElement[];
}

export interface HandwritingElement {
  type: 'text' | 'image' | 'line' | 'margin';
  content: string;
  position: Position;
  style: Record<string, any>;
}

export interface Position {
  x: number;
  y: number;
}

export interface AssignmentSettings {
  handwritingSize: 'small' | 'medium' | 'large';
  lineSpacing: number;
  wordSpacing: number;
  characterSpacing: number;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  penThickness: number;
  questionStartMode: 'continuous' | 'new-line' | 'new-page';
  showQuestionNumbers: boolean;
  showPageNumbers: boolean;
}

export type PaperStyle = 'ruled' | 'plain' | 'grid' | 'custom';
export type PageSize = 'A4' | 'A5' | 'Letter' | 'Legal' | 'Custom';

export interface PageDimensions {
  width: number;
  height: number;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
}

export const PAGE_DIMENSIONS: Record<PageSize, PageDimensions> = {
  A4: { width: 794, height: 1123, marginTop: 80, marginRight: 60, marginBottom: 80, marginLeft: 60 },
  A5: { width: 559, height: 794, marginTop: 60, marginRight: 40, marginBottom: 60, marginLeft: 40 },
  Letter: { width: 816, height: 1056, marginTop: 80, marginRight: 60, marginBottom: 80, marginLeft: 60 },
  Legal: { width: 816, height: 1344, marginTop: 80, marginRight: 60, marginBottom: 80, marginLeft: 60 },
  Custom: { width: 794, height: 1123, marginTop: 80, marginRight: 60, marginBottom: 80, marginLeft: 60 },
};

export interface Assignment {
  id: string;
  userId: string;
  title: string;
  subject: string;
  level: 'school' | 'college' | 'university' | 'professional';
  questions: Question[];
  answers: Answer[];
  handwritingProfileId: string;
  paperStyle: PaperStyle;
  pageSize: PageSize;
  settings: AssignmentSettings;
  status: 'draft' | 'generating' | 'preview' | 'completed' | 'failed';
  totalPages: number;
  pdfUrl?: string;
  docxUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== NEW TYPES FOR DUAL HANDWRITING SYSTEM ====================

export type HandwritingMode = 'personal' | 'realistic';
export type RealisticStyle = 'cursive' | 'print' | 'mixed' | 'calligraphy';
export type PenColor = 'blue' | 'black';

export interface HandwritingProfile {
  id: string;
  userId: string;
  name: string;
  originalImageUrl: string;
  analyzedImageUrl?: string;
  characteristics: HandwritingCharacteristics;
  samples: HandwritingSample[];
  status: 'pending' | 'analyzing' | 'completed' | 'failed';
  isActive: boolean;
  mode: HandwritingMode;
  realisticStyle?: RealisticStyle;
  penColor?: PenColor;
  createdAt: string;
  updatedAt: string;
}

export interface HandwritingSample {
  id: string;
  profileId: string;
  userId: string;
  imageUrl: string;
  analyzedImageUrl?: string;
  characteristics?: HandwritingCharacteristics;
  qualityScore: number;
  isPrimary: boolean;
  orderIndex: number;
  createdAt: string;
}

export interface GenerationSettings {
  id: string;
  userId: string;
  name: string;
  description?: string;
  handwritingMode: HandwritingMode;
  realisticStyle?: RealisticStyle;
  penColor?: PenColor;
  handwritingSize: 'small' | 'medium' | 'large';
  lineSpacing: number;
  wordSpacing: number;
  characterSpacing: number;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  penThickness: number;
  questionStartMode: 'continuous' | 'new-line' | 'new-page';
  showQuestionNumbers: boolean;
  showPageNumbers: boolean;
  paperStyle: PaperStyle;
  pageSize: PageSize;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedAssignment {
  id: string;
  userId: string;
  assignmentId?: string;
  handwritingProfileId?: string;
  generationSettingsId?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  mode: HandwritingMode;
  totalPages: number;
  pagesData?: GeneratedPage[];
  pdfUrl?: string;
  docxUrl?: string;
  forgeMetadata?: ForgeMetadata;
  errorMessage?: string;
  generationTimeMs: number;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedPage {
  id: string;
  generatedAssignmentId: string;
  pageNumber: number;
  htmlContent: string;
  imageUrl?: string;
  width: number;
  height: number;
  createdAt: string;
}

export interface ForgeMetadata {
  model: string;
  seed: number;
  steps: number;
  cfgScale: number;
  sampler: string;
  scheduler: string;
  denoisingStrength: number;
  width: number;
  height: number;
  processingTimeMs: number;
  apiVersion: string;
}

export interface ForgeAPIConfig {
  baseUrl: string;
  timeout: number;
  healthCheckInterval: number;
  maxRetries: number;
  retryDelay: number;
}

export interface ForgeHealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version?: string;
  modelsLoaded?: string[];
  gpuMemory?: {
    used: number;
    total: number;
  };
  timestamp: string;
}

export interface ForgeTxt2ImgRequest {
  prompt: string;
  negativePrompt?: string;
  styles?: string[];
  seed?: number;
  subseed?: number;
  subseedStrength?: number;
  seedResizeFromH?: number;
  seedResizeFromW?: number;
  samplerName?: string;
  batchSize?: number;
  nIter?: number;
  steps?: number;
  cfgScale?: number;
  width?: number;
  height?: number;
  restoreFaces?: boolean;
  tiling?: boolean;
  doNotSaveSamples?: boolean;
  doNotSaveGrid?: boolean;
  eta?: number;
  denoisingStrength?: number;
  sMinUncond?: number;
  sChurn?: number;
  sTmax?: number;
  sTmin?: number;
  sNoise?: number;
  overrideSettings?: Record<string, any>;
  overrideSettingsRestoreAfterwards?: boolean;
  scriptArgs?: any[];
  scriptName?: string;
  sendImages?: boolean;
  saveImages?: boolean;
  alwaysOnScripts?: Record<string, any>;
}

export interface ForgeImg2ImgRequest extends ForgeTxt2ImgRequest {
  initImages: string[]; // base64 encoded images
  mask?: string; // base64 encoded mask
  maskBlur?: number;
  inpaintingFill?: number;
  inpaintFullRes?: boolean;
  inpaintFullResPadding?: number;
  inpaintingMaskInvert?: number;
  initialNoiseMultiplier?: number;
  resizeMode?: number;
}

export interface ForgeResponse {
  images: string[]; // base64 encoded images
  parameters: Record<string, any>;
  info: string; // JSON string with generation info
}

export interface ForgeProgressResponse {
  progress: number;
  etaRelative: number;
  state: {
    job: string;
    jobCount: number;
    jobNo: number;
    samplingStep: number;
    samplingSteps: number;
  };
}

// Handwriting generation options
export interface HandwritingGenerationOptions {
  mode: HandwritingMode;
  assignment: Assignment;
  questions: Question[];
  answers: Answer[];
  profile?: HandwritingProfile;
  samples?: HandwritingSample[];
  settings: AssignmentSettings;
  generationSettings?: GenerationSettings;
  realisticOptions?: RealisticHandwritingOptions;
  forgeOptions?: ForgeGenerationOptions;
}

export interface RealisticHandwritingOptions {
  style: RealisticStyle;
  penColor: PenColor;
  sizeMultiplier: number;
  spacingMultiplier: number;
  thicknessMultiplier: number;
  variationLevel: 'low' | 'medium' | 'high';
  paperStyle: PaperStyle;
  margins: AssignmentSettings['margins'];
  paragraphAlignment: 'left' | 'center' | 'justify';
  lineVariation: boolean;
  wordVariation: boolean;
}

export interface ForgeGenerationOptions {
  useForge: boolean;
  model?: string;
  seed?: number;
  steps?: number;
  cfgScale?: number;
  sampler?: string;
  denoisingStrength?: number;
  width?: number;
  height?: number;
  controlNet?: {
    enabled: boolean;
    model: string;
    weight: number;
    guidance: number;
  };
}

// Progress tracking
export interface GenerationProgress {
  stage: 'initializing' | 'analyzing' | 'generating' | 'rendering' | 'exporting' | 'completed' | 'failed';
  progress: number; // 0-100
  message: string;
  currentPage?: number;
  totalPages?: number;
  error?: string;
}

// Multi-sample analysis result
export interface MultiSampleAnalysisResult {
  combinedCharacteristics: HandwritingCharacteristics;
  individualResults: Array<{
    sampleId: string;
    characteristics: HandwritingCharacteristics;
    qualityScore: number;
  }>;
  consistencyScore: number;
  warnings: string[];
}

export interface HandwritingAnalysisOptions {
  minSamples: number;
  maxSamples: number;
  requiredChars: string;
  qualityThreshold: number;
  preprocessingOptions: {
    denoise: boolean;
    deskew: boolean;
    enhanceContrast: boolean;
    binarize: boolean;
  };
}