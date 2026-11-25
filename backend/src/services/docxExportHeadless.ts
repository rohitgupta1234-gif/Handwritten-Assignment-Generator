import * as docx from 'docx';
import { Assignment, Question, Answer, AssignmentSettings, HandwritingCharacteristics, PageSize, PAGE_DIMENSIONS } from '../types';
import { generateFullHTML, HandwritingPage, generateHandwrittenPages } from './handwritingSynthesis';
import { getBrowser } from './pdfExportHeadless';
import puppeteer, { Page } from 'puppeteer';
import { sanitizeTitle, sanitizeQuestionAnswer, escapeHtml } from '../utils/sanitize';

// Extract the classes/functions we need from the docx namespace
const Document = (docx as any).Document;
const Packer = (docx as any).Packer;
const Paragraph = (docx as any).Paragraph;
const TextRun = (docx as any).TextRun;
const HeadingLevel = (docx as any).HeadingLevel;
const Header = (docx as any).Header;
const Footer = (docx as any).Footer;
const ImageRun = (docx as any).ImageRun;
const PageOrientation = (docx as any).PageOrientation;
// const PageMargin = (docx as any).PageMargin; // Conflicts with our PageMargin type

interface DOCXExportOptions {
  assignment: Assignment;
  questions: Question[];
  answers: Answer[];
  handwritingProfile: { characteristics: HandwritingCharacteristics };
  settings: AssignmentSettings;
}

/**
 * Generate DOCX from handwritten assignment
 * Embeds rendered page images to preserve handwritten appearance
 */
export async function generateAssignmentDOCX(options: DOCXExportOptions): Promise<Buffer> {
  const { assignment, questions, answers, handwritingProfile, settings } = options;

  // Generate individual handwritten pages
  const { pages } = generateHandwrittenPages(assignment, questions, answers, handwritingProfile, settings);

  // Render pages to images using headless browser (per-page rendering)
  const pageImages = await renderPagesToImagesIndividually(pages, assignment.pageSize || 'A4', settings, assignment);

  // Generate DOCX with embedded page images
  return await generateAssignmentDOCXWithImages(pageImages, settings, assignment);
}

/**
 * Render each page individually using headless browser for reliable multi-page capture
 */
async function renderPagesToImagesIndividually(
  pages: HandwritingPage[],
  pageSize: PageSize,
  settings: AssignmentSettings,
  assignment: Assignment
): Promise<Buffer[]> {
  const dims = PAGE_DIMENSIONS[pageSize];
  const browser = await getBrowser();
  const pageImages: Buffer[] = [];

  for (let i = 0; i < pages.length; i++) {
    const page = await browser.newPage();

    try {
      // Set viewport to page dimensions (at 2x for higher quality)
      const scale = 2;
      await page.setViewport({
        width: dims.width * scale,
        height: dims.height * scale,
        deviceScaleFactor: scale,
      });

      // Use page's full HTML if available, otherwise wrap
      const pageHtml = pages[i].content.includes('<!DOCTYPE html>')
        ? pages[i].content
        : `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Patrick+Hand&family=Comic+Neue:wght@300;400;700&family=Instrument+Serif&display=swap');
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Patrick Hand', cursive; background: white; }
            .page-container {
              width: ${dims.width}px;
              height: ${dims.height}px;
              position: relative;
              padding: ${settings.margins.top}px ${settings.margins.right}px ${settings.margins.bottom}px ${settings.margins.left}px;
              background: white;
            }
            .paper-${assignment.paperStyle || 'ruled'} { background-color: white; }
            ${pages[i].content.match(/<style>([\s\S]*?)<\/style>/)?.[1] || ''}
          </style>
        </head>
        <body>
          <div class="page-container paper-${assignment.paperStyle || 'ruled'} margin-line">
            ${pages[i].content.replace(/<style>[\s\S]*?<\/style>/, '')}
            ${settings.showPageNumbers ? `<div class="page-number">Page ${i + 1} of ${pages.length}</div>` : ''}
          </div>
        </body>
        </html>
      `;

      await page.setContent(pageHtml, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      // Wait for fonts to load
      await page.evaluateHandle('document.fonts.ready');
      await new Promise(resolve => setTimeout(resolve, 300));

      const container = await page.$('.page-container');
      if (container) {
        const screenshot = await container.screenshot({
          type: 'png',
          omitBackground: false,
        });
        pageImages.push(screenshot);
      }
    } finally {
      await page.close();
    }
  }

  return pageImages;
}

/**
 * Generate DOCX with embedded page images
 * This preserves the exact visual appearance of handwritten pages
 */
async function generateAssignmentDOCXWithImages(
  pageImages: Buffer[],
  settings: AssignmentSettings,
  assignment: Assignment
): Promise<Buffer> {
  const pageSize = assignment.pageSize || 'A4';
  const dims = PAGE_DIMENSIONS[pageSize];

  // Convert px to twips (1 px = 15 twips at 96 DPI)
  const pxToTwips = (px: number) => Math.round(px * 15);

  const document = new Document({
    sections: pageImages.map((imageBuffer, index) => ({
      properties: {
        page: {
          size: {
            orientation: dims.width > dims.height ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
            width: pxToTwips(dims.width),
            height: pxToTwips(dims.height),
          },
          margin: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
          } as any,
        },
      },
      children: [
        new Paragraph({
          children: [
            new ImageRun({
              data: imageBuffer,
              transformation: {
                width: pxToTwips(dims.width),
                height: pxToTwips(dims.height),
              },
            }),
          ],
          spacing: { before: 0, after: 0 },
        }),
      ],
    })),
  });

  return Packer.toBuffer(document);
}

/**
 * Alternative: Generate DOCX with text content (for editing)
 * This creates a DOCX with actual text that can be edited
 */
export async function generateAssignmentDOCXEditable(options: DOCXExportOptions): Promise<Buffer> {
  const { assignment, questions, answers, handwritingProfile, settings } = options;

  const pageSize = assignment.pageSize || 'A4';
  const dims = PAGE_DIMENSIONS[pageSize];
  const margins = settings.margins;

  // Convert px to twips (1 px = 15 twips at 96 DPI)
  const pxToTwips = (px: number) => Math.round(px * 15);

  const document = new Document({
    sections: [{
      properties: {
        page: {
          size: {
            orientation: dims.width > dims.height ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
            width: pxToTwips(dims.width),
            height: pxToTwips(dims.height),
          },
          margin: {
            top: pxToTwips(margins.top),
            right: pxToTwips(margins.right),
            bottom: pxToTwips(margins.bottom),
            left: pxToTwips(margins.left),
          } as any,
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: sanitizeTitle(assignment.title),
                  size: 20,
                  color: '1E3A5F',
                }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: 'center',
              children: [
                new TextRun({
                  text: 'Page ',
                  size: 18,
                  color: '93C5FD',
                }),
                new TextRun({
                  text: '1 of 1',
                  size: 18,
                  color: '93C5FD',
                }),
              ],
            }),
          ],
        }),
      },
      children: generateDOCXChildren(assignment, questions, answers, settings, handwritingProfile.characteristics),
    }],
  });

  return Packer.toBuffer(document);
}

/**
 * Generate DOCX children (paragraphs, etc.) from assignment content
 */
function generateDOCXChildren(
  assignment: Assignment,
  questions: Question[],
  answers: Answer[],
  settings: AssignmentSettings,
  characteristics: HandwritingCharacteristics
): any[] {
  const children: any[] = [];
  const baseFontSize = settings.handwritingSize === 'small' ? 20 : settings.handwritingSize === 'large' ? 28 : 24; // half-points

  // Title - SANITIZED
  const safeTitle = sanitizeTitle(assignment.title);
  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: 'center',
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: safeTitle,
          size: 36,
          bold: true,
          color: '1E3A5F',
          font: 'Instrument Serif',
        }),
      ],
    })
  );

  questions.forEach((question, qIndex) => {
    const answer = answers.find(a => a.questionId === question.id);
    const answerContent = answer?.editedContent || answer?.content || '';
    const answerLength = answer?.length || 'medium';

    // Question - SANITIZED
    const safeQuestionText = sanitizeQuestionAnswer(question.text);
    const questionText = settings.showQuestionNumbers ? `Q${qIndex + 1}: ${safeQuestionText}` : safeQuestionText;

    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 200 },
        children: [
          new TextRun({
            text: questionText,
            size: 28,
            bold: true,
            color: '1E3A5F',
            font: 'Instrument Serif',
          }),
        ],
      })
    );

    // Answer - SANITIZED
    const safeAnswerContent = sanitizeQuestionAnswer(answerContent);
    if (safeAnswerContent) {
      // Split answer into paragraphs
      const paragraphs = safeAnswerContent.split('\n\n').filter(p => p.trim());

      paragraphs.forEach((para, pIndex) => {
        children.push(
          new Paragraph({
            spacing: { after: pIndex === paragraphs.length - 1 ? 300 : 150 },
            indent: { left: settings.showQuestionNumbers ? 720 : 360 }, // twips
            children: [
              new TextRun({
                text: para.trim(),
                size: baseFontSize,
                color: '1E293B',
                font: 'Patrick Hand', // Handwriting font
              }),
            ],
          })
        );
      });
    } else {
      children.push(
        new Paragraph({
          spacing: { after: 300 },
          indent: { left: settings.showQuestionNumbers ? 720 : 360 },
          children: [
            new TextRun({
              text: '[Answer not generated]',
              size: baseFontSize,
              color: '93C5FD',
              italics: true,
            }),
          ],
        })
      );
    }
  });

  return children;
}

export { DOCXExportOptions };