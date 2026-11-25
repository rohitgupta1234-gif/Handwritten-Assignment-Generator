import { createWorker, PSM, OEM } from 'tesseract.js';
import { config } from '../config';

let ocrWorker: Awaited<ReturnType<typeof createWorker>> | null = null;

/**
 * Get or create OCR worker
 */
async function getOCRWorker(): Promise<Awaited<ReturnType<typeof createWorker>>> {
  if (!ocrWorker) {
    ocrWorker = await createWorker('eng', 1, {
      logger: config.ocr.logger,
    });

    // Set OCR options for better accuracy
    await ocrWorker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
      tessedit_oem: OEM.LSTM_ONLY,
      preserve_interword_spaces: '1',
    });
  }
  return ocrWorker;
}

/**
 * Terminate OCR worker
 */
export async function terminateOCRWorker(): Promise<void> {
  if (ocrWorker) {
    await ocrWorker.terminate();
    ocrWorker = null;
  }
}

export interface OCRResult {
  text: string;
  confidence: number;
  blocks: OCRBlock[];
  lines: OCRLines[];
  words: OCRWord[];
}

export interface OCRBlock {
  bbox: { x0: number; y0: number; x1: number; y1: number };
  text: string;
  confidence: number;
  blockType: 'text' | 'image' | 'table' | 'line';
}

export interface OCRLines {
  bbox: { x0: number; y0: number; x1: number; y1: number };
  text: string;
  confidence: number;
  baseline: { x0: number; y0: number; x1: number; y1: number };
}

export interface OCRWord {
  bbox: { x0: number; y0: number; x1: number; y1: number };
  text: string;
  confidence: number;
  fontSize: number;
  fontName: string;
}

/**
 * Perform OCR on an image file
 */
export async function performOCR(imagePath: string): Promise<OCRResult> {
  const worker = await getOCRWorker();

  const result = await worker.recognize(imagePath);

  const data = result.data as any;

  const blocks: OCRBlock[] = (data.blocks || []).map((block: any) => ({
    bbox: block.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 },
    text: block.text || '',
    confidence: block.confidence || 0,
    blockType: (block.blocktype || 'text') as 'text' | 'image' | 'table' | 'line',
  }));

  const lines: OCRLines[] = (data.lines || []).map((line: any) => ({
    bbox: line.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 },
    text: line.text || '',
    confidence: line.confidence || 0,
    baseline: line.baseline || { x0: 0, y0: 0, x1: 0, y1: 0 },
  }));

  const words: OCRWord[] = (data.words || []).map((word: any) => ({
    bbox: word.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 },
    text: word.text || '',
    confidence: word.confidence || 0,
    fontSize: word.font_size || 12,
    fontName: word.font_name || 'Unknown',
  }));

  return {
    text: data.text || '',
    confidence: data.confidence || 0,
    blocks,
    lines,
    words,
  };
}

/**
 * Perform OCR on a buffer
 */
export async function performOCRFromBuffer(imageBuffer: Buffer): Promise<OCRResult> {
  const worker = await getOCRWorker();

  const result = await worker.recognize(imageBuffer);

  const data = result.data as any;

  const blocks: OCRBlock[] = (data.blocks || []).map((block: any) => ({
    bbox: block.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 },
    text: block.text || '',
    confidence: block.confidence || 0,
    blockType: (block.blocktype || 'text') as 'text' | 'image' | 'table' | 'line',
  }));

  const lines: OCRLines[] = (data.lines || []).map((line: any) => ({
    bbox: line.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 },
    text: line.text || '',
    confidence: line.confidence || 0,
    baseline: line.baseline || { x0: 0, y0: 0, x1: 0, y1: 0 },
  }));

  const words: OCRWord[] = (data.words || []).map((word: any) => ({
    bbox: word.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 },
    text: word.text || '',
    confidence: word.confidence || 0,
    fontSize: word.font_size || 12,
    fontName: word.font_name || 'Unknown',
  }));

  return {
    text: data.text || '',
    confidence: data.confidence || 0,
    blocks,
    lines,
    words,
  };
}

/**
 * Perform OCR on multiple images (batch)
 */
export async function performBatchOCR(imagePaths: string[]): Promise<OCRResult[]> {
  const results: OCRResult[] = [];

  for (const imagePath of imagePaths) {
    try {
      const result = await performOCR(imagePath);
      results.push(result);
    } catch (error) {
      console.error(`OCR failed for ${imagePath}:`, error);
      results.push({
        text: '',
        confidence: 0,
        blocks: [],
        lines: [],
        words: [],
      });
    }
  }

  return results;
}

/**
 * Extract text from PDF by converting pages to images first
 * Note: This requires pdf2pic or similar library for PDF to image conversion
 */
export async function performOCROnPDF(pdfPath: string): Promise<OCRResult[]> {
  // This would require a PDF to image conversion library
  // For now, return empty results
  throw new Error('PDF OCR requires pdf2pic library. Install with: npm install pdf2pic');
}

/**
 * Quick OCR for single image (less accurate but faster)
 */
export async function quickOCR(imagePath: string): Promise<{ text: string; confidence: number }> {
  const worker = await getOCRWorker();

  const result = await worker.recognize(imagePath);
  const data = result.data as any;

  return {
    text: data.text || '',
    confidence: data.confidence || 0,
  };
}