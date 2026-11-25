import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';
import { Assignment, Question, Answer, AssignmentSettings, HandwritingCharacteristics, PageSize, PAGE_DIMENSIONS } from '../types';
import { generateHandwrittenPages, generateFullHTML, HandwritingPage } from './handwritingSynthesis';

interface PDFExportOptions {
  assignment: Assignment;
  questions: Question[];
  answers: Answer[];
  handwritingProfile: { characteristics: HandwritingCharacteristics };
  settings: AssignmentSettings;
}

/**
 * Generate PDF from handwritten pages
 * Uses pdfkit to create a multi-page PDF with the handwritten content
 */
export async function generateAssignmentPDF(options: PDFExportOptions): Promise<Buffer> {
  const { assignment, questions, answers, handwritingProfile, settings } = options;

  // Generate the handwritten pages
  const { pages } = generateHandwrittenPages(assignment, questions, answers, handwritingProfile, settings);

  // Create PDF document with custom page size
  const pageSize = assignment.pageSize || 'A4';
  const dims = PAGE_DIMENSIONS[pageSize];

  const doc = new PDFDocument({
    size: [dims.width, dims.height],
    margin: 0,
    info: {
      Title: assignment.title,
      Author: 'AI Handwritten Assignment Generator',
      Subject: assignment.subject,
      Keywords: 'handwritten, assignment, AI',
      CreationDate: new Date(),
    },
  });

  const stream = new PassThrough();
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);

    doc.pipe(stream);

    // Register custom fonts for handwriting
    // Note: In production, you'd embed actual handwriting fonts
    // For now, we'll use built-in fonts with styling

    const paperStyle = assignment.paperStyle || 'ruled';
    pages.forEach((page, pageIndex) => {
      if (pageIndex > 0) {
        doc.addPage({ size: [dims.width, dims.height], margin: 0 });
      }

      // Draw paper background (ruled lines, margins)
      drawPaperBackground(doc, settings, handwritingProfile.characteristics, dims, paperStyle);

      // Draw content
      drawPageContent(doc, page, settings, handwritingProfile.characteristics, dims, pageIndex + 1, pages.length);
    });

    doc.end();
  });
}

/**
 * Draw paper background (ruled lines, grid, margins)
 */
function drawPaperBackground(
  doc: PDFKit.PDFDocument,
  settings: AssignmentSettings,
  characteristics: HandwritingCharacteristics,
  dims: { width: number; height: number },
  paperStyle: string
): void {
  const margins = settings.margins;
  const lineHeight = 32 * (characteristics.lineSpacing / 8.5) * settings.lineSpacing;

  // Draw ruled lines
  if (paperStyle === 'ruled' || paperStyle === 'grid') {
    doc.save();
    doc.strokeColor('#3b82f6').opacity(0.15).lineWidth(0.5);

    let y = margins.top;
    while (y < dims.height - margins.bottom) {
      doc.moveTo(margins.left, y).lineTo(dims.width - margins.right, y).stroke();
      y += lineHeight;
    }

    doc.restore();
  }

  // Draw grid lines
  if (paperStyle === 'grid') {
    doc.save();
    doc.strokeColor('#3b82f6').opacity(0.1).lineWidth(0.5);

    let x = margins.left;
    const gridSize = lineHeight;
    while (x < dims.width - margins.right) {
      doc.moveTo(x, margins.top).lineTo(x, dims.height - margins.bottom).stroke();
      x += gridSize;
    }

    doc.restore();
  }

  // Draw margin line (red line on left)
  doc.save();
  doc.strokeColor('#ef4444').opacity(0.3).lineWidth(1);
  doc.moveTo(margins.left, margins.top).lineTo(margins.left, dims.height - margins.bottom).stroke();
  doc.restore();
}

/**
 * Draw page content (title, questions, answers)
 */
function drawPageContent(
  doc: PDFKit.PDFDocument,
  page: HandwritingPage,
  settings: AssignmentSettings,
  characteristics: HandwritingCharacteristics,
  dims: { width: number; height: number },
  pageNumber: number,
  totalPages: number
): void {
  const margins = settings.margins;
  const contentWidth = dims.width - margins.left - margins.right;
  let y = margins.top + 20;
  const baseFontSize = settings.handwritingSize === 'small' ? 16 : settings.handwritingSize === 'large' ? 20 : 18;
  const lineHeight = 32 * (characteristics.lineSpacing / 8.5) * settings.lineSpacing;

  // Parse the HTML content and draw text
  // Since we're generating from structured data, we'll render directly
  // This is a simplified version - in production you'd parse the HTML

  doc.save();

  // Set up handwriting-like font
  doc.font('Helvetica'); // In production, use a handwriting font
  doc.fontSize(baseFontSize * (characteristics.letterHeight / 4.2));
  doc.fillColor('#1e293b');

  // Note: pdfkit doesn't support CSS transforms like skewX
  // For true handwriting simulation, you'd need to use a custom font
  // or render to canvas first and embed as image

  // For now, we'll draw the structured content
  // This is a placeholder - the real implementation would use the handwriting synthesis

  doc.restore();

  // Draw page number
  if (settings.showPageNumbers) {
    doc.save();
    doc.fontSize(10).fillColor('#93c5fd');
    doc.text(
      `Page ${pageNumber} of ${totalPages}`,
      dims.width - margins.right - 80,
      dims.height - margins.bottom - 20,
      { width: 80, align: 'right' }
    );
    doc.restore();
  }
}

/**
 * Alternative: Generate PDF by embedding rendered page images
 * This approach uses html2canvas on frontend to render pages, then sends images to backend
 * Or uses a headless browser on backend to render HTML to images
 */
export async function generateAssignmentPDFFromHTML(
  htmlPages: string[],
  settings: AssignmentSettings
): Promise<Buffer> {
  // This would require a headless browser (puppeteer/playwright) to render HTML to images
  // Then embed images in PDF
  // For now, return empty buffer - implement when headless browser is available
  throw new Error('HTML-to-PDF requires headless browser. Use generateAssignmentPDF for structured rendering.');
}

export { PDFExportOptions };