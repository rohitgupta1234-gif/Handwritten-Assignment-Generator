import { Question, Answer, AssignmentSettings, HandwritingCharacteristics, PageSize, PaperStyle, PAGE_DIMENSIONS } from '../types';
import { sanitizeHtml, escapeHtml } from './sanitize';

// Minimal assignment interface for preview functions
export interface PreviewAssignment {
  id: string;
  title: string;
  pageSize: PageSize;
  paperStyle: PaperStyle;
}

/**
 * Generate CSS for personal handwriting preview (based on analyzed characteristics)
 */
export function generatePersonalPreviewCSS(
  characteristics: HandwritingCharacteristics,
  settings: AssignmentSettings
): string {
  const baseFontSize = settings.handwritingSize === 'small' ? 16 : settings.handwritingSize === 'large' ? 20 : 18;
  const baseLineHeight = settings.handwritingSize === 'small' ? 28 : settings.handwritingSize === 'large' ? 36 : 32;

  // Calculate font size based on letter height characteristics
  const fontSize = baseFontSize * (characteristics.letterHeight / 100);
  const lineHeight = baseLineHeight * settings.lineSpacing * (characteristics.lineSpacing / 100);
  const letterSpacing = 0.5 * settings.characterSpacing * (characteristics.characterSpacing / 100);
  const wordSpacing = 4 * settings.wordSpacing * (characteristics.wordSpacing / 100);

  // Pen thickness affects font weight
  const fontWeight = characteristics.penThickness > 1.2 ? '600' : characteristics.penThickness > 0.8 ? '500' : '400';

  // Slant angle
  const slantDeg = characteristics.writingAngle || 0;

  // Use a cursive font as base for personal handwriting
  const fontFamily = `'Patrick Hand', 'Comic Neue', 'Brush Script MT', 'Segoe Script', cursive`;

  return `
    .handwriting-text {
      font-family: ${fontFamily};
      font-size: ${fontSize}px;
      line-height: ${lineHeight}px;
      letter-spacing: ${letterSpacing}px;
      word-spacing: ${wordSpacing}px;
      font-weight: ${fontWeight};
      transform: skewX(${slantDeg}deg);
      color: #1a1a2e;
      text-shadow: 0.5px 0.5px 1px rgba(26, 26, 46, 0.3);
    }
    .question-text {
      font-family: ${fontFamily};
      font-size: ${fontSize * 1.15}px;
      line-height: ${lineHeight * 1.3}px;
      font-weight: ${fontWeight === '600' ? '700' : '600'};
      color: #1a1a2e;
      transform: skewX(${slantDeg * 0.4}deg);
      text-shadow: 0.5px 0.5px 1px rgba(26, 26, 46, 0.3);
    }
    .assignment-title {
      font-family: ${fontFamily};
      font-size: ${24 * (characteristics.letterHeight / 100)}px;
      font-weight: 600;
      color: #1a1a2e;
      margin-bottom: ${32 * settings.lineSpacing}px;
      text-align: center;
      transform: skewX(${slantDeg * 0.5}deg);
    }
    .question-block {
      margin-bottom: ${24 * settings.lineSpacing}px;
      page-break-inside: avoid;
    }
    .question-number {
      font-weight: 600;
      margin-right: 8px;
    }
    .answer-text {
      margin-left: ${settings.showQuestionNumbers ? '2.5rem' : '1rem'};
    }
    .page-number {
      position: absolute;
      bottom: 30px;
      right: 30px;
      font-size: 12px;
      color: rgba(26, 26, 46, 0.5);
    }
    .margin-line {
      background-image: linear-gradient(to right, rgba(239, 68, 68, 0.4) 1px, transparent 1px);
      background-position: ${settings.margins.left}px 0;
      background-size: 1px 100%;
      background-repeat: no-repeat;
    }
    .paper-ruled {
      background-image:
        repeating-linear-gradient(
          transparent,
          transparent 28px,
          rgba(239, 68, 68, 0.15) 28px,
          rgba(239, 68, 68, 0.15) 29px
        ),
        linear-gradient(to right, rgba(239, 68, 68, 0.3) 1px, transparent 1px);
      background-position: 0 0, 60px 0;
      background-size: 100% 29px, 1px 100%;
    }
    .paper-plain {
      background-color: white;
    }
    .paper-grid {
      background-image:
        linear-gradient(rgba(200, 200, 200, 0.3) 1px, transparent 1px),
        linear-gradient(90deg, rgba(200, 200, 200, 0.3) 1px, transparent 1px);
      background-size: 20px 20px;
      background-color: #fafafa;
    }
  `;
}

/**
 * Build assignment content HTML for personal handwriting
 */
export function buildPersonalAssignmentContent(
  assignment: PreviewAssignment,
  questions: Question[],
  answers: Answer[],
  settings: AssignmentSettings,
  characteristics: HandwritingCharacteristics
): string[] {
  const pageSize = assignment.pageSize || 'A4';
  const dims = PAGE_DIMENSIONS[pageSize];
  const margins = settings.margins;
  const contentHeight = dims.height - margins.top - margins.bottom;

  const baseLineHeight = settings.handwritingSize === 'small' ? 28 : settings.handwritingSize === 'large' ? 36 : 32;
  const lineHeight = baseLineHeight * settings.lineSpacing * (characteristics.lineSpacing / 100);
  const maxLinesPerPage = Math.floor(contentHeight / lineHeight);

  const pages: string[] = [];
  let currentPageContent = '';
  let currentLineCount = 0;
  let isFirstPage = true;

  if (isFirstPage) {
    const safeTitle = escapeHtml(assignment.title);
    currentPageContent += `<h1 class="assignment-title">${safeTitle}</h1>`;
    currentLineCount += 2;
    isFirstPage = false;
  }

  questions.forEach((question, qIndex) => {
    const answer = answers.find(a => a.questionId === question.id);
    const answerContent = answer?.editedContent || answer?.content || '';
    const answerLength = answer?.length || 'medium';

    // Sanitize user inputs
    const safeQuestionText = sanitizeHtml(question.text);
    const safeAnswerContent = sanitizeHtml(answerContent);

    const questionLines = Math.ceil(safeQuestionText.length / 80) + 1;
    const answerLineEstimates = { short: 3, medium: 6, detailed: 12 };
    const answerLines = answerLineEstimates[answerLength] * (safeAnswerContent.length / 200);
    const totalBlockLines = questionLines + answerLines + 2;

    const needsNewPage =
      (settings.questionStartMode === 'new-page' && !isFirstPage) ||
      (settings.questionStartMode === 'new-line' && currentLineCount + questionLines > maxLinesPerPage) ||
      (currentLineCount + totalBlockLines > maxLinesPerPage);

    if (needsNewPage && currentPageContent) {
      pages.push(currentPageContent);
      currentPageContent = '';
      currentLineCount = 0;
    }

    let blockHtml = '<div class="question-block">';

    if (settings.showQuestionNumbers) {
      blockHtml += `<p class="question-text"><span class="question-number">Q${qIndex + 1}:</span> ${safeQuestionText}</p>`;
    } else {
      blockHtml += `<p class="question-text">${safeQuestionText}</p>`;
    }

    if (safeAnswerContent) {
      blockHtml += `<div class="answer-text handwriting-text">${safeAnswerContent.replace(/\n/g, '<br>')}</div>`;
    }

    blockHtml += '</div>';
    currentPageContent += blockHtml;
    currentLineCount += totalBlockLines;
  });

  if (currentPageContent) {
    pages.push(currentPageContent);
  }

  return pages;
}

/**
 * Generate all handwritten pages for personal handwriting
 */
export interface RenderedAssignment {
  pages: HandwritingPage[];
  totalPages: number;
}

export interface HandwritingPage {
  pageNumber: number;
  content: string;
  height: number;
  width: number;
}

export function generateHandwrittenPages(
  assignment: PreviewAssignment,
  questions: Question[],
  answers: Answer[],
  profile: { characteristics: HandwritingCharacteristics },
  settings: AssignmentSettings
): RenderedAssignment {
  const pageSize = assignment.pageSize || 'A4';
  const paperStyle = assignment.paperStyle || 'ruled';
  const characteristics = profile.characteristics;
  const pageContents = buildPersonalAssignmentContent(assignment, questions, answers, settings, characteristics);

  const pages: HandwritingPage[] = pageContents.map((content, index) => ({
    pageNumber: index + 1,
    content: generatePersonalPageHTML(
      index + 1,
      content,
      settings,
      characteristics,
      pageContents.length,
      settings.showPageNumbers,
      pageSize,
      paperStyle
    ),
    height: PAGE_DIMENSIONS[pageSize].height,
    width: PAGE_DIMENSIONS[pageSize].width,
  }));

  return {
    pages,
    totalPages: pages.length,
  };
}

/**
 * Generate HTML for a single page
 */
function generatePersonalPageHTML(
  pageNumber: number,
  content: string,
  settings: AssignmentSettings,
  characteristics: HandwritingCharacteristics,
  totalPages: number,
  showPageNumbers: boolean,
  pageSize: PageSize,
  paperStyle: PaperStyle
): string {
  const dims = PAGE_DIMENSIONS[pageSize];
  const margins = settings.margins;
  const css = generatePersonalPreviewCSS(characteristics, settings);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Patrick Hand', cursive; background: white; }
        .page-container {
          width: ${dims.width}px;
          height: ${dims.height}px;
          position: relative;
          padding: ${margins.top}px ${margins.right}px ${margins.bottom}px ${margins.left}px;
          background: white;
        }
        ${css}
      </style>
    </head>
    <body>
      <div class="page-container paper-${paperStyle} margin-line">
        ${content}
        ${showPageNumbers ? `<div class="page-number">Page ${pageNumber} of ${totalPages}</div>` : ''}
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate a single consolidated HTML for all pages (for preview/print)
 */
export function generateFullHTML(
  assignment: PreviewAssignment,
  questions: Question[],
  answers: Answer[],
  profile: { characteristics: HandwritingCharacteristics },
  settings: AssignmentSettings
): string {
  const characteristics = profile.characteristics;
  const pageContents = buildPersonalAssignmentContent(assignment, questions, answers, settings, characteristics);
  const pageSize = assignment.pageSize || 'A4';
  const dims = PAGE_DIMENSIONS[pageSize];
  const margins = settings.margins;
  const paperStyle = assignment.paperStyle || 'ruled';

  const css = generatePersonalPreviewCSS(characteristics, settings);

  let fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Patrick Hand', cursive; background: #f5f5f5; padding: 20px; }
        .page-container {
          width: ${dims.width}px;
          height: ${dims.height}px;
          position: relative;
          padding: ${margins.top}px ${margins.right}px ${margins.bottom}px ${margins.left}px;
          background: white;
          margin: 0 auto 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .paper-${paperStyle} { background-color: white; }
        ${css}
      </style>
    </head>
    <body>
  `;

  pageContents.forEach((content, index) => {
    const safeTitle = escapeHtml(assignment.title);
    fullHtml += `
      <div class="page-container paper-${paperStyle} margin-line">
        ${index === 0 ? `<h1 class="assignment-title">${safeTitle}</h1>` : ''}
        ${content}
        ${settings.showPageNumbers ? `<div class="page-number">Page ${index + 1} of ${pageContents.length}</div>` : ''}
      </div>
    `;
  });

  fullHtml += '</body></html>';
  return fullHtml;
}