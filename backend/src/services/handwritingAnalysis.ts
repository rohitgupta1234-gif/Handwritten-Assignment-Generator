import sharp from 'sharp';
import { HandwritingCharacteristics } from '../types';
import { config } from '../config';

interface AnalysisResult {
  characteristics: HandwritingCharacteristics;
  analyzedImageBuffer: Buffer;
  debugInfo: {
    strokeWidth: number;
    slantAngle: number;
    lineSpacing: number;
    charSpacing: number;
    wordSpacing: number;
    baselineDeviation: number;
    pressureVariation: number;
    connectedness: number;
  };
}

interface ImageQualityResult {
  valid: boolean;
  reason?: string;
  qualityScore?: number;
  details?: {
    resolution: { width: number; height: number; passes: boolean };
    sharpness: { score: number; passes: boolean };
    contrast: { score: number; passes: boolean };
    content: { strokePixels: number; passes: boolean };
  };
}

/**
 * Validate image quality for handwriting analysis
 * Checks resolution, sharpness, contrast, and handwriting content
 */
async function validateImageQuality(image: sharp.Sharp, metadata: sharp.Metadata): Promise<ImageQualityResult> {
  const width = metadata.width || 0;
  const height = metadata.height || 0;

  // 1. Check minimum resolution
  const MIN_WIDTH = 400;
  const MIN_HEIGHT = 300;
  const resolutionPasses = width >= MIN_WIDTH && height >= MIN_HEIGHT;

  if (!resolutionPasses) {
    return {
      valid: false,
      reason: `Image resolution too low. Minimum ${MIN_WIDTH}x${MIN_HEIGHT} required, got ${width}x${height}.`,
      details: {
        resolution: { width, height, passes: false },
        sharpness: { score: 0, passes: false },
        contrast: { score: 0, passes: false },
        content: { strokePixels: 0, passes: false },
      },
    };
  }

  // 2. Check sharpness using Laplacian variance (blur detection)
  let sharpnessScore = 0;
  let contrastScore = 0;
  let strokePixels = 0;

  try {
    // Get grayscale image for analysis
    const grayscaleBuffer = await image
      .clone()
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { data, info } = grayscaleBuffer;
    const pixels = new Uint8Array(data.buffer);
    const imgWidth = info.width;
    const imgHeight = info.height;

    // Calculate Laplacian variance for sharpness (higher = sharper)
    // Use a simplified 3x3 Laplacian kernel: [[0,1,0],[1,-4,1],[0,1,0]]
    let laplacianSum = 0;
    let laplacianCount = 0;

    for (let y = 1; y < imgHeight - 1; y += 2) { // Sample every 2nd pixel for performance
      for (let x = 1; x < imgWidth - 1; x += 2) {
        const center = pixels[y * imgWidth + x];
        const laplacian =
          pixels[(y - 1) * imgWidth + x] +   // top
          pixels[(y + 1) * imgWidth + x] +   // bottom
          pixels[y * imgWidth + (x - 1)] +   // left
          pixels[y * imgWidth + (x + 1)] -   // right
          4 * center;

        laplacianSum += laplacian * laplacian;
        laplacianCount++;
      }
    }

    sharpnessScore = laplacianCount > 0 ? laplacianSum / laplacianCount : 0;

    // Calculate contrast (standard deviation of pixel values)
    let mean = 0;
    let sampleCount = 0;
    for (let y = 0; y < imgHeight; y += 4) { // Sample every 4th pixel
      for (let x = 0; x < imgWidth; x += 4) {
        mean += pixels[y * imgWidth + x];
        sampleCount++;
      }
    }
    mean = sampleCount > 0 ? mean / sampleCount : 128;

    let variance = 0;
    for (let y = 0; y < imgHeight; y += 4) {
      for (let x = 0; x < imgWidth; x += 4) {
        const diff = pixels[y * imgWidth + x] - mean;
        variance += diff * diff;
      }
    }
    contrastScore = sampleCount > 0 ? Math.sqrt(variance / sampleCount) : 0;

    // Estimate handwriting content (stroke pixels after thresholding)
    // Use Otsu-like threshold
    const threshold = 128; // Simplified - could use Otsu
    for (let y = 0; y < imgHeight; y++) {
      for (let x = 0; x < imgWidth; x++) {
        if (pixels[y * imgWidth + x] < threshold) {
          strokePixels++;
        }
      }
    }
    const strokeRatio = strokePixels / (imgWidth * imgHeight);

    // Quality thresholds
    const MIN_SHARPNESS = 500;      // Laplacian variance threshold
    const MIN_CONTRAST = 30;        // Standard deviation threshold
    const MIN_STROKE_RATIO = 0.01;  // At least 1% of pixels should be strokes
    const MAX_STROKE_RATIO = 0.5;   // Not more than 50% (likely blank/black page)

    const sharpnessPasses = sharpnessScore >= MIN_SHARPNESS;
    const contrastPasses = contrastScore >= MIN_CONTRAST;
    const contentPasses = strokeRatio >= MIN_STROKE_RATIO && strokeRatio <= MAX_STROKE_RATIO;

    const allPasses = sharpnessPasses && contrastPasses && contentPasses;

    // Calculate overall quality score (0-100)
    const qualityScore = Math.round(
      (sharpnessPasses ? 30 : 0) +
      (contrastPasses ? 30 : 0) +
      (contentPasses ? 40 : 0)
    );

    if (!allPasses) {
      const reasons = [];
      if (!sharpnessPasses) reasons.push(`Image appears blurry (sharpness: ${Math.round(sharpnessScore)}, need ${MIN_SHARPNESS})`);
      if (!contrastPasses) reasons.push(`Low contrast (contrast: ${Math.round(contrastScore)}, need ${MIN_CONTRAST})`);
      if (!contentPasses) {
        if (strokeRatio < MIN_STROKE_RATIO) reasons.push(`Insufficient handwriting content (${Math.round(strokeRatio * 100)}% strokes, need ${MIN_STROKE_RATIO * 100}%)`);
        if (strokeRatio > MAX_STROKE_RATIO) reasons.push(`Image too dark/filled (${Math.round(strokeRatio * 100)}% strokes, max ${MAX_STROKE_RATIO * 100}%)`);
      }

      return {
        valid: false,
        reason: reasons.join('; '),
        qualityScore,
        details: {
          resolution: { width, height, passes: true },
          sharpness: { score: sharpnessScore, passes: sharpnessPasses },
          contrast: { score: contrastScore, passes: contrastPasses },
          content: { strokePixels, passes: contentPasses },
        },
      };
    }

    return {
      valid: true,
      qualityScore,
      details: {
        resolution: { width, height, passes: true },
        sharpness: { score: sharpnessScore, passes: true },
        contrast: { score: contrastScore, passes: true },
        content: { strokePixels, passes: true },
      },
    };

  } catch (error) {
    // If quality check fails, don't block analysis - just warn
    console.warn('Image quality check failed, proceeding with analysis:', error);
    return {
      valid: true,
      qualityScore: 50,
      details: {
        resolution: { width, height, passes: true },
        sharpness: { score: 0, passes: true },
        contrast: { score: 0, passes: true },
        content: { strokePixels: 0, passes: true },
      },
    };
  }
}

/**
 * Analyze handwriting from an image using computer vision techniques
 * Extracts 16 handwriting characteristics for personalized font generation
 */
export async function analyzeHandwritingImage(imagePath: string): Promise<AnalysisResult> {
  // Load image and get metadata
  const image = sharp(imagePath);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Invalid image dimensions');
  }

  // Validate image quality before analysis
  const qualityCheck = await validateImageQuality(image, metadata);
  if (!qualityCheck.valid) {
    throw new Error(`Image quality validation failed: ${qualityCheck.reason}`);
  }

  // Convert to grayscale and normalize
  const grayscaleBuffer = await image
    .grayscale()
    .normalize()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = grayscaleBuffer;
  const width = info.width;
  const height = info.height;

  // Convert to 2D array for easier processing
  const pixels = new Uint8Array(data.buffer);
  const imageData = new Array(height).fill(null).map((_, y) =>
    new Array(width).fill(0).map((_, x) => pixels[y * width + x])
  );

  // Apply adaptive thresholding (Otsu's method approximation)
  const threshold = calculateOtsuThreshold(imageData, width, height);
  const binary = binarizeImage(imageData, width, height, threshold);

  // Find connected components (strokes/characters)
  const components = findConnectedComponents(binary, width, height);

  // Filter out noise (very small components)
  const validComponents = components.filter(c => c.area > 10 && c.area < width * height * 0.1);

  // Calculate characteristics
  const characteristics = calculateCharacteristics(validComponents, binary, width, height);

  // Generate analyzed image with visualization
  const analyzedImageBuffer = await generateAnalyzedImage(imagePath, validComponents, characteristics, width, height);

  return {
    characteristics,
    analyzedImageBuffer,
    debugInfo: {
      strokeWidth: characteristics.penThickness * 2,
      slantAngle: characteristics.writingAngle,
      lineSpacing: characteristics.lineSpacing,
      charSpacing: characteristics.characterSpacing,
      wordSpacing: characteristics.wordSpacing,
      baselineDeviation: 100 - characteristics.baselineAlignment,
      pressureVariation: characteristics.pressureVariation,
      connectedness: characteristics.connectedness,
    },
  };
}

/**
 * Calculate Otsu's threshold for binarization
 */
function calculateOtsuThreshold(imageData: number[][], width: number, height: number): number {
  const histogram = new Array(256).fill(0);
  let totalPixels = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      histogram[imageData[y][x]]++;
      totalPixels++;
    }
  }

  let sum = 0;
  for (let i = 0; i < 256; i++) {
    sum += i * histogram[i];
  }

  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let maxVar = 0;
  let threshold = 0;

  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    wF = totalPixels - wB;
    if (wF === 0) break;

    sumB += t * histogram[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const varBetween = wB * wF * (mB - mF) * (mB - mF);

    if (varBetween > maxVar) {
      maxVar = varBetween;
      threshold = t;
    }
  }

  return threshold;
}

/**
 * Binarize image using threshold
 */
function binarizeImage(imageData: number[][], width: number, height: number, threshold: number): boolean[][] {
  const binary = new Array(height).fill(null).map(() => new Array(width).fill(false));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      binary[y][x] = imageData[y][x] < threshold; // true = ink (dark), false = paper (light)
    }
  }

  return binary;
}

/**
 * Find connected components using flood fill
 */
interface Component {
  pixels: { x: number; y: number }[];
  area: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  centerX: number;
  centerY: number;
  boundingBox: { x: number; y: number; width: number; height: number };
}

function findConnectedComponents(binary: boolean[][], width: number, height: number): Component[] {
  const visited = new Array(height).fill(null).map(() => new Array(width).fill(false));
  const components: Component[] = [];

  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1],
  ];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (binary[y][x] && !visited[y][x]) {
        const component = floodFill(binary, visited, width, height, x, y, directions);
        if (component.area > 0) {
          components.push(component);
        }
      }
    }
  }

  return components;
}

function floodFill(
  binary: boolean[][],
  visited: boolean[][],
  width: number,
  height: number,
  startX: number,
  startY: number,
  directions: number[][]
): Component {
  const stack = [{ x: startX, y: startY }];
  const pixels: { x: number; y: number }[] = [];
  let minX = startX, maxX = startX, minY = startY, maxY = startY;

  while (stack.length > 0) {
    const { x, y } = stack.pop()!;

    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    if (!binary[y][x] || visited[y][x]) continue;

    visited[y][x] = true;
    pixels.push({ x, y });

    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);

    for (const [dx, dy] of directions) {
      stack.push({ x: x + dx, y: y + dy });
    }
  }

  const centerX = pixels.reduce((sum, p) => sum + p.x, 0) / pixels.length;
  const centerY = pixels.reduce((sum, p) => sum + p.y, 0) / pixels.length;

  return {
    pixels,
    area: pixels.length,
    minX,
    maxX,
    minY,
    maxY,
    centerX,
    centerY,
    boundingBox: {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    },
  };
}

/**
 * Calculate handwriting characteristics from components
 */
function calculateCharacteristics(
  components: Component[],
  binary: boolean[][],
  width: number,
  height: number
): HandwritingCharacteristics {
  if (components.length === 0) {
    return getDefaultCharacteristics();
  }

  // Sort components by Y position (top to bottom)
  components.sort((a, b) => a.centerY - b.centerY);

  // Group components into lines
  const lines = groupIntoLines(components, height * 0.02);

  // Calculate stroke width (pen thickness)
  const strokeWidths = components.map(c => Math.min(c.boundingBox.width, c.boundingBox.height));
  const avgStrokeWidth = strokeWidths.reduce((a, b) => a + b, 0) / strokeWidths.length;

  // Calculate slant angle
  const slantAngle = calculateSlantAngle(components);

  // Calculate line spacing
  const lineSpacing = calculateLineSpacing(lines, height);

  // Calculate character spacing
  const charSpacing = calculateCharacterSpacing(lines, width);

  // Calculate word spacing
  const wordSpacing = calculateWordSpacing(lines, width);

  // Calculate baseline alignment
  const baselineAlignment = calculateBaselineAlignment(lines);

  // Calculate paragraph spacing
  const paragraphSpacing = calculateParagraphSpacing(lines, height);

  // Calculate average words per line
  const avgWordsPerLine = calculateAvgWordsPerLine(lines);

  // Calculate pressure variation (from pixel intensity variation)
  const pressureVariation = calculatePressureVariation(components, binary);

  // Calculate connectedness
  const connectedness = calculateConnectedness(components);

  // Calculate letter dimensions
  const letterHeight = calculateLetterHeight(components);
  const letterWidth = calculateLetterWidth(components);
  const capitalHeight = calculateCapitalHeight(components, lines);
  const smallHeight = calculateSmallHeight(components, lines);

  // Estimate page margins
  const pageMargins = estimatePageMargins(components, width, height);

  // Determine slant direction
  const slantDirection = slantAngle < -2 ? 'left' : slantAngle > 2 ? 'right' : 'vertical';

  return {
    letterHeight: Math.round(letterHeight * 10) / 10,
    letterWidth: Math.round(letterWidth * 10) / 10,
    capitalHeight: Math.round(capitalHeight * 10) / 10,
    smallHeight: Math.round(smallHeight * 10) / 10,
    characterSpacing: Math.round(charSpacing * 10) / 10,
    wordSpacing: Math.round(wordSpacing * 10) / 10,
    lineSpacing: Math.round(lineSpacing * 10) / 10,
    writingAngle: Math.round(slantAngle * 10) / 10,
    penThickness: Math.round(avgStrokeWidth * 10) / 10,
    baselineAlignment: Math.round(baselineAlignment * 10) / 10,
    paragraphSpacing: Math.round(paragraphSpacing * 10) / 10,
    avgWordsPerLine: Math.round(avgWordsPerLine * 10) / 10,
    pageMargins,
    slantDirection,
    pressureVariation: Math.round(pressureVariation * 10) / 10,
    connectedness: Math.round(connectedness * 10) / 10,
  };
}

function groupIntoLines(components: Component[], lineThreshold: number): Component[][] {
  const lines: Component[][] = [];
  let currentLine: Component[] = [];
  let lastY = -1;

  for (const comp of components) {
    if (lastY === -1 || Math.abs(comp.centerY - lastY) <= lineThreshold) {
      currentLine.push(comp);
    } else {
      if (currentLine.length > 0) {
        lines.push(currentLine);
      }
      currentLine = [comp];
    }
    lastY = comp.centerY;
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines;
}

function calculateSlantAngle(components: Component[]): number {
  if (components.length < 5) return 0;

  // Fit line to component centers using linear regression
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  const n = components.length;

  for (const comp of components) {
    sumX += comp.centerX;
    sumY += comp.centerY;
    sumXY += comp.centerX * comp.centerY;
    sumXX += comp.centerX * comp.centerX;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const angle = Math.atan(slope) * (180 / Math.PI);

  // Invert because image Y increases downward
  return -angle;
}

function calculateLineSpacing(lines: Component[][], height: number): number {
  if (lines.length < 2) return 8.5; // default

  const lineCenters = lines.map(line =>
    line.reduce((sum, c) => sum + c.centerY, 0) / line.length
  );

  const spacings = [];
  for (let i = 1; i < lineCenters.length; i++) {
    spacings.push(lineCenters[i] - lineCenters[i - 1]);
  }

  const avgSpacing = spacings.reduce((a, b) => a + b, 0) / spacings.length;
  // Convert to mm (assuming 300 DPI)
  return (avgSpacing / 300) * 25.4;
}

function calculateCharacterSpacing(lines: Component[][], width: number): number {
  let totalSpacing = 0;
  let count = 0;

  for (const line of lines) {
    if (line.length < 2) continue;

    // Sort by X position
    line.sort((a, b) => a.centerX - b.centerX);

    for (let i = 1; i < line.length; i++) {
      const spacing = line[i].centerX - line[i - 1].centerX;
      // Only count reasonable spacings (not within same character)
      if (spacing > line[i].boundingBox.width * 0.5 && spacing < width * 0.1) {
        totalSpacing += spacing;
        count++;
      }
    }
  }

  if (count === 0) return 0.8; // default

  const avgSpacing = totalSpacing / count;
  return (avgSpacing / 300) * 25.4; // Convert to mm
}

function calculateWordSpacing(lines: Component[][], width: number): number {
  let totalSpacing = 0;
  let count = 0;

  for (const line of lines) {
    if (line.length < 2) continue;

    line.sort((a, b) => a.centerX - b.centerX);

    for (let i = 1; i < line.length; i++) {
      const spacing = line[i].centerX - line[i - 1].centerX;
      // Word spacing is larger than character spacing
      if (spacing > width * 0.02 && spacing < width * 0.3) {
        totalSpacing += spacing;
        count++;
      }
    }
  }

  if (count === 0) return 4.2; // default

  const avgSpacing = totalSpacing / count;
  return (avgSpacing / 300) * 25.4; // Convert to mm
}

function calculateBaselineAlignment(lines: Component[][]): number {
  if (lines.length === 0) return 92; // default

  let totalDeviation = 0;
  let count = 0;

  for (const line of lines) {
    if (line.length < 2) continue;

    // Fit line to component centers in this line
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    const n = line.length;

    for (const comp of line) {
      sumX += comp.centerX;
      sumY += comp.centerY;
      sumXY += comp.centerX * comp.centerY;
      sumXX += comp.centerX * comp.centerX;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate deviation from fitted line
    for (const comp of line) {
      const expectedY = slope * comp.centerX + intercept;
      totalDeviation += Math.abs(comp.centerY - expectedY);
      count++;
    }
  }

  if (count === 0) return 92;

  const avgDeviation = totalDeviation / count;
  // Convert to percentage (lower deviation = higher alignment)
  return Math.max(0, 100 - (avgDeviation / 10) * 100);
}

function calculateParagraphSpacing(lines: Component[][], height: number): number {
  if (lines.length < 3) return 12; // default

  const lineCenters = lines.map(line =>
    line.reduce((sum, c) => sum + c.centerY, 0) / line.length
  );

  const spacings = [];
  for (let i = 1; i < lineCenters.length; i++) {
    spacings.push(lineCenters[i] - lineCenters[i - 1]);
  }

  // Find outliers (larger spacings = paragraph breaks)
  const avgSpacing = spacings.reduce((a, b) => a + b, 0) / spacings.length;
  const paragraphSpacings = spacings.filter(s => s > avgSpacing * 1.5);

  if (paragraphSpacings.length === 0) return 12;

  const avgParaSpacing = paragraphSpacings.reduce((a, b) => a + b, 0) / paragraphSpacings.length;
  return (avgParaSpacing / 300) * 25.4; // Convert to mm
}

function calculateAvgWordsPerLine(lines: Component[][]): number {
  if (lines.length === 0) return 8; // default

  let totalWords = 0;

  for (const line of lines) {
    if (line.length === 0) continue;

    line.sort((a, b) => a.centerX - b.centerX);

    let words = 1;
    for (let i = 1; i < line.length; i++) {
      const spacing = line[i].centerX - line[i - 1].centerX;
      if (spacing > line[i].boundingBox.width * 1.5) {
        words++;
      }
    }
    totalWords += words;
  }

  return totalWords / lines.length;
}

function calculatePressureVariation(components: Component[], binary: boolean[][]): number {
  // Sample pixel intensities around component centers
  const intensities: number[] = [];

  for (const comp of components.slice(0, 50)) { // Sample first 50 components
    const x = Math.round(comp.centerX);
    const y = Math.round(comp.centerY);

    // Sample 3x3 neighborhood
    let sum = 0;
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < binary[0].length && ny >= 0 && ny < binary.length) {
          // In binary image, true = ink (dark), false = paper (light)
          // We need original grayscale for pressure, so this is approximate
          sum += binary[ny][nx] ? 0 : 255;
          count++;
        }
      }
    }
    if (count > 0) {
      intensities.push(sum / count);
    }
  }

  if (intensities.length < 2) return 15; // default

  const mean = intensities.reduce((a, b) => a + b, 0) / intensities.length;
  const variance = intensities.reduce((sum, v) => sum + (v - mean) ** 2, 0) / intensities.length;
  const stdDev = Math.sqrt(variance);

  // Convert to percentage variation
  return (stdDev / mean) * 100;
}

function calculateConnectedness(components: Component[]): number {
  if (components.length < 2) return 65; // default

  let connectedPairs = 0;
  let totalPairs = 0;

  for (let i = 0; i < components.length - 1; i++) {
    for (let j = i + 1; j < Math.min(i + 5, components.length); j++) {
      const dx = components[j].centerX - components[i].centerX;
      const dy = components[j].centerY - components[i].centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // If components are close horizontally and vertically aligned, they might be connected
      if (distance < components[i].boundingBox.width * 1.5 && Math.abs(dy) < components[i].boundingBox.height * 0.5) {
        connectedPairs++;
      }
      totalPairs++;
    }
  }

  if (totalPairs === 0) return 65;
  return (connectedPairs / totalPairs) * 100;
}

function calculateLetterHeight(components: Component[]): number {
  const heights = components.map(c => c.boundingBox.height);
  const avgHeight = heights.reduce((a, b) => a + b, 0) / heights.length;
  return (avgHeight / 300) * 25.4; // Convert to mm
}

function calculateLetterWidth(components: Component[]): number {
  const widths = components.map(c => c.boundingBox.width);
  const avgWidth = widths.reduce((a, b) => a + b, 0) / widths.length;
  return (avgWidth / 300) * 25.4; // Convert to mm
}

function calculateCapitalHeight(components: Component[], lines: Component[][]): number {
  // Assume taller components in each line are capitals
  let totalHeight = 0;
  let count = 0;

  for (const line of lines) {
    if (line.length === 0) continue;
    const heights = line.map(c => c.boundingBox.height);
    const maxHeight = Math.max(...heights);
    const threshold = maxHeight * 0.8;

    for (const comp of line) {
      if (comp.boundingBox.height >= threshold) {
        totalHeight += comp.boundingBox.height;
        count++;
      }
    }
  }

  if (count === 0) return 6.8; // default
  const avgHeight = totalHeight / count;
  return (avgHeight / 300) * 25.4; // Convert to mm
}

function calculateSmallHeight(components: Component[], lines: Component[][]): number {
  // Assume shorter components in each line are lowercase
  let totalHeight = 0;
  let count = 0;

  for (const line of lines) {
    if (line.length === 0) continue;
    const heights = line.map(c => c.boundingBox.height);
    const minHeight = Math.min(...heights);
    const threshold = minHeight * 1.3;

    for (const comp of line) {
      if (comp.boundingBox.height <= threshold) {
        totalHeight += comp.boundingBox.height;
        count++;
      }
    }
  }

  if (count === 0) return 3.9; // default
  const avgHeight = totalHeight / count;
  return (avgHeight / 300) * 25.4; // Convert to mm
}

function estimatePageMargins(components: Component[], width: number, height: number): HandwritingCharacteristics['pageMargins'] {
  if (components.length === 0) {
    return { top: 25, right: 20, bottom: 25, left: 30 };
  }

  const minX = Math.min(...components.map(c => c.minX));
  const maxX = Math.max(...components.map(c => c.maxX));
  const minY = Math.min(...components.map(c => c.minY));
  const maxY = Math.max(...components.map(c => c.maxY));

  return {
    top: Math.round((minY / 300) * 25.4 * 10) / 10,
    right: Math.round(((width - maxX) / 300) * 25.4 * 10) / 10,
    bottom: Math.round(((height - maxY) / 300) * 25.4 * 10) / 10,
    left: Math.round((minX / 300) * 25.4 * 10) / 10,
  };
}

function getDefaultCharacteristics(): HandwritingCharacteristics {
  return {
    letterHeight: 4.2,
    letterWidth: 3.1,
    capitalHeight: 6.8,
    smallHeight: 3.9,
    characterSpacing: 0.8,
    wordSpacing: 4.2,
    lineSpacing: 8.5,
    writingAngle: -5,
    penThickness: 0.6,
    baselineAlignment: 92,
    paragraphSpacing: 12,
    avgWordsPerLine: 8,
    pageMargins: { top: 25, right: 20, bottom: 25, left: 30 },
    slantDirection: 'left',
    pressureVariation: 15,
    connectedness: 65,
  };
}

/**
 * Generate analyzed image with visualization overlay
 */
async function generateAnalyzedImage(
  originalPath: string,
  components: Component[],
  characteristics: HandwritingCharacteristics,
  width: number,
  height: number
): Promise<Buffer> {
  // Create SVG overlay with analysis visualization
  const svgOverlay = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- Bounding boxes for components -->
      ${components.slice(0, 100).map(c => `
        <rect x="${c.minX}" y="${c.minY}" width="${c.boundingBox.width}" height="${c.boundingBox.height}"
              fill="none" stroke="rgba(255,0,0,0.3)" stroke-width="1"/>
      `).join('')}
      <!-- Baseline lines -->
      ${[...new Set(components.map(c => Math.round(c.centerY)))].slice(0, 20).map(y => `
        <line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="rgba(0,255,0,0.2)" stroke-width="1"/>
      `).join('')}
      <!-- Info text -->
      <text x="10" y="20" font-family="monospace" font-size="12" fill="red">
        Slant: ${characteristics.writingAngle.toFixed(1)}° | Stroke: ${characteristics.penThickness.toFixed(1)}mm | Baseline: ${characteristics.baselineAlignment.toFixed(0)}%
      </text>
    </svg>
  `;

  const overlayBuffer = Buffer.from(svgOverlay);

  return sharp(originalPath)
    .composite([{ input: overlayBuffer, gravity: 'northwest' }])
    .png()
    .toBuffer();
}

/**
 * Quick analysis for preview (less accurate but faster)
 */
export async function quickAnalyzeHandwriting(imagePath: string): Promise<HandwritingCharacteristics> {
  const result = await analyzeHandwritingImage(imagePath);
  return result.characteristics;
}