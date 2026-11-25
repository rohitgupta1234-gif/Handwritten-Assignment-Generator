// Import from docx - some types are not properly exported in .d.ts but exist at runtime
import * as docx from 'docx';
import { Assignment, Question, Answer, AssignmentSettings, HandwritingCharacteristics, PageSize, PAGE_DIMENSIONS } from '../types';

// Extract the classes/functions we need from the docx namespace
// These exist at runtime but TypeScript types don't expose them properly
const Document = (docx as any).Document;
const Packer = (docx as any).Packer;
const Paragraph = (docx as any).Paragraph;
const TextRun = (docx as any).TextRun;
const HeadingLevel = (docx as any).HeadingLevel;
const Header = (docx as any).Header;
const Footer = (docx as any).Footer;
const ImageRun = (docx as any).ImageRun;
const PageOrientation = (docx as any).PageOrientation;
const PageMargin = (docx as any).PageMargin;
// const PageSize = (docx as any).PageSize; // Conflicts with our PageSize type

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

  const pageSize = assignment.pageSize || 'A4';
  const dims = PAGE_DIMENSIONS[pageSize];
  const margins = settings.margins;

  // Convert px to twips (1 px = 20/96 twips = 0.20833 twips at 96 DPI)
  // But docx expects twips (1/1440 inch). At 96 DPI: 1px = 1440/96 = 15 twips
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
                  text: assignment.title,
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

  // Title
  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: 'center',
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: assignment.title,
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

    // Question
    const questionText = settings.showQuestionNumbers ? `Q${qIndex + 1}: ${question.text}` : question.text;

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

    // Answer
    if (answerContent) {
      // Split answer into paragraphs
      const paragraphs = answerContent.split('\n\n').filter(p => p.trim());

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

/**
 * Alternative: Generate DOCX with embedded page images
 * This preserves the exact visual appearance of handwritten pages
 */
export async function generateAssignmentDOCXWithImages(
  pageImages: Buffer[], // Array of page image buffers (PNG/JPG)
  settings: AssignmentSettings,
  assignment: Assignment
): Promise<Buffer> {
  const pageSize = assignment.pageSize || 'A4';
  const dims = PAGE_DIMENSIONS[pageSize];

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
        }),
      ],
    })),
  });

  return Packer.toBuffer(document);
}

export { DOCXExportOptions };