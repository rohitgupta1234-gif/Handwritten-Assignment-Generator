export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  avatar_url?: string;
  bio?: string;
  institution?: string;
  academic_level?: string;
  createdAt: string;
  updatedAt?: string;
}

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

// ==================== NEW TYPES FOR DUAL HANDWRITING SYSTEM ====================

export type HandwritingMode = 'personal' | 'realistic';
export type RealisticStyle = 'cursive' | 'print' | 'mixed' | 'calligraphy';
export type PenColor = 'blue' | 'black';

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

export interface ForgeHealthStatus {
  healthy: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy';
  version?: string;
  modelsLoaded?: string[];
  availableModels?: string[];
  lastCheck: string;
}

export interface RealisticHandwritingOptions {
  style: RealisticStyle;
  penColor: PenColor;
  sizeMultiplier: number;
  spacingMultiplier: number;
  thicknessMultiplier: number;
  variationLevel: 'low' | 'medium' | 'high';
  paperStyle: PaperStyle;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
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

export interface GenerationProgress {
  stage: 'initializing' | 'analyzing' | 'generating' | 'rendering' | 'exporting' | 'completed' | 'failed';
  progress: number;
  message: string;
  currentPage?: number;
  totalPages?: number;
  error?: string;
}

export interface RealisticStyleOption {
  id: RealisticStyle;
  name: string;
  description: string;
}

export interface PenColorOption {
  id: PenColor;
  name: string;
  hex: string;
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

export interface UploadedFile {
  file: File;
  preview: string;
  type: 'image' | 'pdf';
  name: string;
  size: number;
}

export interface OCRResult {
  text: string;
  confidence: number;
  blocks: OCRBlock[];
}

export interface OCRBlock {
  text: string;
  confidence: number;
  bbox: BoundingBox;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AIResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DashboardStats {
  totalAssignments: number;
  completedAssignments: number;
  draftAssignments: number;
  totalPages: number;
  handwritingProfiles: number;
  recentActivity: Activity[];
}

export interface Activity {
  id: string;
  type: 'assignment_created' | 'assignment_completed' | 'profile_updated' | 'pdf_downloaded';
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface Subject {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export const SUBJECTS: Subject[] = [
  { id: 'mathematics', name: 'Mathematics', icon: 'calculator', color: '#3b82f6' },
  { id: 'physics', name: 'Physics', icon: 'atom', color: '#ef4444' },
  { id: 'chemistry', name: 'Chemistry', icon: 'flask-conical', color: '#22c55e' },
  { id: 'biology', name: 'Biology', icon: 'dna', color: '#8b5cf6' },
  { id: 'computer-science', name: 'Computer Science', icon: 'cpu', color: '#f59e0b' },
  { id: 'english', name: 'English', icon: 'book-open', color: '#ec4899' },
  { id: 'history', name: 'History', icon: 'landmark', color: '#6b7280' },
  { id: 'geography', name: 'Geography', icon: 'globe', color: '#06b6d4' },
  { id: 'economics', name: 'Economics', icon: 'trending-up', color: '#84cc16' },
  { id: 'environmental-studies', name: 'Environmental Studies', icon: 'leaf', color: '#10b981' },
  { id: 'other', name: 'Other', icon: 'folder', color: '#9ca3af' },
];

export interface ApiError {
  status: number;
  message: string;
  details?: Record<string, any>;
}

// Multi-sample analysis
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