import sharp from 'sharp';
import { HandwritingCharacteristics, HandwritingSample, MultiSampleAnalysisResult, HandwritingAnalysisOptions } from '../types';
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

/**
 * Enhanced Handwriting Analysis Service
 * Supports multiple samples per profile for better accuracy
 */
class MultiSampleAnalyzer {
  private options: HandwritingAnalysisOptions;

  constructor(customOptions?: Partial<HandwritingAnalysisOptions>) {
    this.options = {
      minSamples: config.handwriting?.minSamplesPerChar || 3,
      maxSamples: 10,
      requiredChars: config.handwriting?.supportedChars || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?;:()[]{}"\'-',
      qualityThreshold: 0.5,
      preprocessingOptions: {
        denoise: true,
        deskew: true,
        enhanceContrast: true,
        binarize: true,
      },
      ...customOptions,
    };
  }

  /**
   * Analyze multiple handwriting samples and combine results
   */
  async analyzeSamples(samples: HandwritingSample[]): Promise<MultiSampleAnalysisResult> {
    if (samples.length < this.options.minSamples) {
      throw new Error(`Minimum ${this.options.minSamples} samples required for multi-sample analysis`);
    }

    const validSamples = samples.slice(0, this.options.maxSamples);
    const individualResults: MultiSampleAnalysisResult['individualResults'] = [];
    const warnings: string[] = [];

    // Analyze each sample
    for (const sample of validSamples) {
      try {
        const result = await this.analyzeSingleSample(sample);
        individualResults.push({
          sampleId: sample.id,
          characteristics: result.characteristics,
          qualityScore: result.qualityScore,
        });
      } catch (error) {
        warnings.push(`Failed to analyze sample ${sample.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (individualResults.length === 0) {
      throw new Error('All samples failed analysis');
    }

    // Combine characteristics
    const combinedCharacteristics = this.combineCharacteristics(
      individualResults.map(r => r.characteristics),
      individualResults.map(r => r.qualityScore)
    );

    // Calculate consistency score
    const consistencyScore = this.calculateConsistency(individualResults.map(r => r.characteristics));

    // Check for warnings
    if (consistencyScore < 0.6) {
      warnings.push('Low consistency between samples. Consider re-uploading with more consistent handwriting.');
    }

    const lowQualitySamples = individualResults.filter(r => r.qualityScore < this.options.qualityThreshold);
    if (lowQualitySamples.length > 0) {
      warnings.push(`${lowQualitySamples.length} sample(s) below quality threshold. Results may be less accurate.`);
    }

    return {
      combinedCharacteristics,
      individualResults,
      consistencyScore,
      warnings,
    };
  }

  /**
   * Analyze a single handwriting sample
   */
  async analyzeSingleSample(sample: HandwritingSample): Promise<{ characteristics: HandwritingCharacteristics; qualityScore: number }> {
    const imagePath = this.getImagePath(sample.imageUrl);

    // Load and preprocess image
    const image = sharp(imagePath);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error('Invalid image dimensions');
    }

    // Apply preprocessing
    let processedImage = image;
    if (this.options.preprocessingOptions.denoise) {
      processedImage = processedImage.median(3);
    }
    if (this.options.preprocessingOptions.enhanceContrast) {
      processedImage = processedImage.normalize();
    }

    const grayscaleBuffer = await processedImage
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { data, info } = grayscaleBuffer;
    const width = info.width;
    const height = info.height;

    // Convert to 2D array
    const pixels = new Uint8Array(data.buffer);
    const imageData = new Array(height).fill(null).map((_, y) =>
      new Array(width).fill(0).map((_, x) => pixels[y * width + x])
    );

    // Binarize
    const threshold = this.calculateOtsuThreshold(imageData, width, height);
    const binary = this.binarizeImage(imageData, width, height, threshold);

    // Find connected components
    const components = this.findConnectedComponents(binary, width, height);
    const validComponents = components.filter(c => c.area > 10 && c.area < width * height * 0.1);

    if (validComponents.length === 0) {
      throw new Error('No valid handwriting components found');
    }

    // Calculate characteristics
    const characteristics = this.calculateCharacteristics(validComponents, binary, width, height);

    // Generate analyzed image
    const analyzedImageBuffer = await this.generateAnalyzedImage(imagePath, validComponents, characteristics, width, height);

    // Calculate quality score
    const qualityScore = this.calculateQualityScore(validComponents, characteristics, width, height);

    return { characteristics, qualityScore };
  }

  /**
   * Get image path from URL
   */
  private getImagePath(imageUrl: string): string {
    const path = require('path');
    const uploadDir = config.upload.uploadDir;
    return path.join(uploadDir, path.basename(imageUrl));
  }

  /**
   * Calculate Otsu's threshold for binarization
   */
  private calculateOtsuThreshold(imageData: number[][], width: number, height: number): number {
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
  private binarizeImage(imageData: number[][], width: number, height: number, threshold: number): boolean[][] {
    const binary = new Array(height).fill(null).map(() => new Array(width).fill(false));

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        binary[y][x] = imageData[y][x] < threshold;
      }
    }

    return binary;
  }

  /**
   * Find connected components using flood fill
   */
  private findConnectedComponents(binary: boolean[][], width: number, height: number): Component[] {
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
          const component = this.floodFill(binary, visited, width, height, x, y, directions);
          if (component.area > 0) {
            components.push(component);
          }
        }
      }
    }

    return components;
  }

  private floodFill(
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
  private calculateCharacteristics(
    components: Component[],
    binary: boolean[][],
    width: number,
    height: number
  ): HandwritingCharacteristics {
    // Sort components by Y position (top to bottom)
    components.sort((a, b) => a.centerY - b.centerY);

    // Group components into lines
    const lines = this.groupIntoLines(components, height * 0.02);

    // Calculate stroke width (pen thickness)
    const strokeWidths = components.map(c => Math.min(c.boundingBox.width, c.boundingBox.height));
    const avgStrokeWidth = strokeWidths.reduce((a, b) => a + b, 0) / strokeWidths.length;

    // Calculate slant angle
    const slantAngle = this.calculateSlantAngle(components);

    // Calculate line spacing
    const lineSpacing = this.calculateLineSpacing(lines, height);

    // Calculate character spacing
    const charSpacing = this.calculateCharacterSpacing(lines, width);

    // Calculate word spacing
    const wordSpacing = this.calculateWordSpacing(lines, width);

    // Calculate baseline alignment
    const baselineAlignment = this.calculateBaselineAlignment(lines);

    // Calculate paragraph spacing
    const paragraphSpacing = this.calculateParagraphSpacing(lines, height);

    // Calculate average words per line
    const avgWordsPerLine = this.calculateAvgWordsPerLine(lines);

    // Calculate pressure variation
    const pressureVariation = this.calculatePressureVariation(components, binary);

    // Calculate connectedness
    const connectedness = this.calculateConnectedness(components);

    // Calculate letter dimensions
    const letterHeight = this.calculateLetterHeight(components);
    const letterWidth = this.calculateLetterWidth(components);
    const capitalHeight = this.calculateCapitalHeight(components, lines);
    const smallHeight = this.calculateSmallHeight(components, lines);

    // Estimate page margins
    const pageMargins = this.estimatePageMargins(components, width, height);

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

  private groupIntoLines(components: Component[], lineThreshold: number): Component[][] {
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

  private calculateSlantAngle(components: Component[]): number {
    if (components.length < 5) return 0;

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

    return -angle;
  }

  private calculateLineSpacing(lines: Component[][], height: number): number {
    if (lines.length < 2) return 8.5;

    const lineCenters = lines.map(line =>
      line.reduce((sum, c) => sum + c.centerY, 0) / line.length
    );

    const spacings = [];
    for (let i = 1; i < lineCenters.length; i++) {
      spacings.push(lineCenters[i] - lineCenters[i - 1]);
    }

    const avgSpacing = spacings.reduce((a, b) => a + b, 0) / spacings.length;
    return (avgSpacing / 300) * 25.4;
  }

  private calculateCharacterSpacing(lines: Component[][], width: number): number {
    let totalSpacing = 0;
    let count = 0;

    for (const line of lines) {
      if (line.length < 2) continue;

      line.sort((a, b) => a.centerX - b.centerX);

      for (let i = 1; i < line.length; i++) {
        const spacing = line[i].centerX - line[i - 1].centerX;
        if (spacing > line[i].boundingBox.width * 0.5 && spacing < width * 0.1) {
          totalSpacing += spacing;
          count++;
        }
      }
    }

    if (count === 0) return 0.8;
    const avgSpacing = totalSpacing / count;
    return (avgSpacing / 300) * 25.4;
  }

  private calculateWordSpacing(lines: Component[][], width: number): number {
    let totalSpacing = 0;
    let count = 0;

    for (const line of lines) {
      if (line.length < 2) continue;

      line.sort((a, b) => a.centerX - b.centerX);

      for (let i = 1; i < line.length; i++) {
        const spacing = line[i].centerX - line[i - 1].centerX;
        if (spacing > width * 0.02 && spacing < width * 0.3) {
          totalSpacing += spacing;
          count++;
        }
      }
    }

    if (count === 0) return 4.2;
    const avgSpacing = totalSpacing / count;
    return (avgSpacing / 300) * 25.4;
  }

  private calculateBaselineAlignment(lines: Component[][]): number {
    if (lines.length === 0) return 92;

    let totalDeviation = 0;
    let count = 0;

    for (const line of lines) {
      if (line.length < 2) continue;

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

      for (const comp of line) {
        const expectedY = slope * comp.centerX + intercept;
        totalDeviation += Math.abs(comp.centerY - expectedY);
        count++;
      }
    }

    if (count === 0) return 92;
    const avgDeviation = totalDeviation / count;
    return Math.max(0, 100 - (avgDeviation / 10) * 100);
  }

  private calculateParagraphSpacing(lines: Component[][], height: number): number {
    if (lines.length < 3) return 12;

    const lineCenters = lines.map(line =>
      line.reduce((sum, c) => sum + c.centerY, 0) / line.length
    );

    const spacings = [];
    for (let i = 1; i < lineCenters.length; i++) {
      spacings.push(lineCenters[i] - lineCenters[i - 1]);
    }

    const avgSpacing = spacings.reduce((a, b) => a + b, 0) / spacings.length;
    const paragraphSpacings = spacings.filter(s => s > avgSpacing * 1.5);

    if (paragraphSpacings.length === 0) return 12;
    const avgParaSpacing = paragraphSpacings.reduce((a, b) => a + b, 0) / paragraphSpacings.length;
    return (avgParaSpacing / 300) * 25.4;
  }

  private calculateAvgWordsPerLine(lines: Component[][]): number {
    if (lines.length === 0) return 8;

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

  private calculatePressureVariation(components: Component[], binary: boolean[][]): number {
    const intensities: number[] = [];

    for (const comp of components.slice(0, 50)) {
      const x = Math.round(comp.centerX);
      const y = Math.round(comp.centerY);

      let sum = 0;
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < binary[0].length && ny >= 0 && ny < binary.length) {
            sum += binary[ny][nx] ? 0 : 255;
            count++;
          }
        }
      }
      if (count > 0) {
        intensities.push(sum / count);
      }
    }

    if (intensities.length < 2) return 15;

    const mean = intensities.reduce((a, b) => a + b, 0) / intensities.length;
    const variance = intensities.reduce((sum, v) => sum + (v - mean) ** 2, 0) / intensities.length;
    const stdDev = Math.sqrt(variance);

    return (stdDev / mean) * 100;
  }

  private calculateConnectedness(components: Component[]): number {
    if (components.length < 2) return 65;

    let connectedPairs = 0;
    let totalPairs = 0;

    for (let i = 0; i < components.length - 1; i++) {
      for (let j = i + 1; j < Math.min(i + 5, components.length); j++) {
        const dx = components[j].centerX - components[i].centerX;
        const dy = components[j].centerY - components[i].centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < components[i].boundingBox.width * 1.5 && Math.abs(dy) < components[i].boundingBox.height * 0.5) {
          connectedPairs++;
        }
        totalPairs++;
      }
    }

    if (totalPairs === 0) return 65;
    return (connectedPairs / totalPairs) * 100;
  }

  private calculateLetterHeight(components: Component[]): number {
    const heights = components.map(c => c.boundingBox.height);
    const avgHeight = heights.reduce((a, b) => a + b, 0) / heights.length;
    return (avgHeight / 300) * 25.4;
  }

  private calculateLetterWidth(components: Component[]): number {
    const widths = components.map(c => c.boundingBox.width);
    const avgWidth = widths.reduce((a, b) => a + b, 0) / widths.length;
    return (avgWidth / 300) * 25.4;
  }

  private calculateCapitalHeight(components: Component[], lines: Component[][]): number {
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

    if (count === 0) return 6.8;
    const avgHeight = totalHeight / count;
    return (avgHeight / 300) * 25.4;
  }

  private calculateSmallHeight(components: Component[], lines: Component[][]): number {
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

    if (count === 0) return 3.9;
    const avgHeight = totalHeight / count;
    return (avgHeight / 300) * 25.4;
  }

  private estimatePageMargins(components: Component[], width: number, height: number): HandwritingCharacteristics['pageMargins'] {
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

  /**
   * Calculate quality score for a sample
   */
  private calculateQualityScore(
    components: Component[],
    characteristics: HandwritingCharacteristics,
    width: number,
    height: number
  ): number {
    let score = 1.0;

    // Penalize too few components
    if (components.length < 100) score *= 0.5;
    else if (components.length < 300) score *= 0.8;

    // Penalize low baseline alignment
    score *= characteristics.baselineAlignment / 100;

    // Penalize extreme values
    if (characteristics.penThickness < 0.2 || characteristics.penThickness > 2) score *= 0.7;
    if (characteristics.lineSpacing < 3 || characteristics.lineSpacing > 20) score *= 0.7;
    if (Math.abs(characteristics.writingAngle) > 30) score *= 0.8;

    // Check coverage
    const coverage = components.reduce((sum, c) => sum + c.area, 0) / (width * height);
    if (coverage < 0.01) score *= 0.5;
    else if (coverage < 0.05) score *= 0.8;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Combine characteristics from multiple samples using weighted average
   */
  private combineCharacteristics(
    characteristicsList: HandwritingCharacteristics[],
    weights: number[]
  ): HandwritingCharacteristics {
    if (characteristicsList.length === 1) {
      return characteristicsList[0];
    }

    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const normalizedWeights = weights.map(w => w / totalWeight);

    // Numeric fields to average (exclude pageMargins as it's an object)
    const numericFields: (keyof HandwritingCharacteristics)[] = [
      'letterHeight', 'letterWidth', 'capitalHeight', 'smallHeight',
      'characterSpacing', 'wordSpacing', 'lineSpacing', 'writingAngle',
      'penThickness', 'baselineAlignment', 'paragraphSpacing',
      'avgWordsPerLine', 'pressureVariation', 'connectedness',
    ];

    const combined: Partial<HandwritingCharacteristics> = {};

    for (const field of numericFields) {
      let weightedSum = 0;
      for (let i = 0; i < characteristicsList.length; i++) {
        const value = characteristicsList[i][field];
        if (typeof value === 'number') {
          weightedSum += value * normalizedWeights[i];
        }
      }
      (combined as Record<string, number>)[field] = Math.round(weightedSum * 10) / 10;
    }

    // Page margins - average each side
    combined.pageMargins = {
      top: Math.round(characteristicsList.reduce((sum, c, i) => sum + c.pageMargins.top * normalizedWeights[i], 0) * 10) / 10,
      right: Math.round(characteristicsList.reduce((sum, c, i) => sum + c.pageMargins.right * normalizedWeights[i], 0) * 10) / 10,
      bottom: Math.round(characteristicsList.reduce((sum, c, i) => sum + c.pageMargins.bottom * normalizedWeights[i], 0) * 10) / 10,
      left: Math.round(characteristicsList.reduce((sum, c, i) => sum + c.pageMargins.left * normalizedWeights[i], 0) * 10) / 10,
    };

    // Categorical fields - use most common
    const slantDirections = characteristicsList.map(c => c.slantDirection);
    combined.slantDirection = this.mostCommon(slantDirections);

    return combined as HandwritingCharacteristics;
  }

  private mostCommon<T>(arr: T[]): T {
    const counts = new Map<T, number>();
    for (const item of arr) {
      counts.set(item, (counts.get(item) || 0) + 1);
    }
    let maxCount = 0;
    let mostCommonItem = arr[0];
    for (const [item, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonItem = item;
      }
    }
    return mostCommonItem;
  }

  /**
   * Calculate consistency score between samples (0-1)
   */
  private calculateConsistency(characteristicsList: HandwritingCharacteristics[]): number {
    if (characteristicsList.length < 2) return 1;

    // Numeric fields to check consistency (exclude pageMargins as it's an object)
    const numericFields: (keyof HandwritingCharacteristics)[] = [
      'letterHeight', 'letterWidth', 'capitalHeight', 'smallHeight',
      'characterSpacing', 'wordSpacing', 'lineSpacing', 'writingAngle',
      'penThickness', 'baselineAlignment', 'paragraphSpacing',
      'avgWordsPerLine', 'pressureVariation', 'connectedness',
    ];

    let totalConsistency = 0;
    let fieldCount = 0;

    for (const field of numericFields) {
      const values = characteristicsList.map(c => {
        const val = c[field];
        return typeof val === 'number' ? val : 0;
      });
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
      const cv = mean !== 0 ? Math.sqrt(variance) / Math.abs(mean) : 0; // Coefficient of variation

      // Consistency = 1 - CV (clamped)
      const fieldConsistency = Math.max(0, 1 - cv);
      totalConsistency += fieldConsistency;
      fieldCount++;
    }

    // Check slant direction consistency
    const slantDirections = characteristicsList.map(c => c.slantDirection);
    const slantConsistency = slantDirections.every(d => d === slantDirections[0]) ? 1 : 0.5;
    totalConsistency += slantConsistency;
    fieldCount++;

    return totalConsistency / fieldCount;
  }

  /**
   * Generate analyzed image with visualization overlay
   */
  private async generateAnalyzedImage(
    originalPath: string,
    components: Component[],
    characteristics: HandwritingCharacteristics,
    width: number,
    height: number
  ): Promise<Buffer> {
    // Get original image metadata to ensure overlay matches
    const originalMetadata = await sharp(originalPath).metadata();
    const origWidth = originalMetadata.width || width;
    const origHeight = originalMetadata.height || height;

    // Scale factor if dimensions differ
    const scaleX = origWidth / width;
    const scaleY = origHeight / height;

    const svgOverlay = `
      <svg width="${origWidth}" height="${origHeight}" xmlns="http://www.w3.org/2000/svg">
        ${components.slice(0, 100).map(c => `
          <rect x="${Math.round(c.minX * scaleX)}" y="${Math.round(c.minY * scaleY)}"
                width="${Math.round(c.boundingBox.width * scaleX)}" height="${Math.round(c.boundingBox.height * scaleY)}"
                fill="none" stroke="rgba(255,0,0,0.3)" stroke-width="1"/>
        `).join('')}
        ${[...new Set(components.map(c => Math.round(c.centerY * scaleY)))].slice(0, 20).map(y => `
          <line x1="0" y1="${y}" x2="${origWidth}" y2="${y}" stroke="rgba(0,255,0,0.2)" stroke-width="1"/>
        `).join('')}
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
}

// Export singleton instance getter
let analyzerInstance: MultiSampleAnalyzer | null = null;

export function getMultiSampleAnalyzer(customOptions?: Partial<HandwritingAnalysisOptions>): MultiSampleAnalyzer {
  if (!analyzerInstance) {
    analyzerInstance = new MultiSampleAnalyzer(customOptions);
  }
  return analyzerInstance;
}

export { MultiSampleAnalyzer, AnalysisResult, Component };