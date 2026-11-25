import { Question, Answer, AssignmentSettings, PageSize, PaperStyle, PAGE_DIMENSIONS, RealisticHandwritingOptions, HandwritingCharacteristics } from '../types';
import { sanitizeHtml, escapeHtml } from './sanitize';

// Minimal assignment interface for preview functions
export interface PreviewAssignment {
  id: string;
  title: string;
  pageSize: PageSize;
  paperStyle: PaperStyle;
}

/**
 * Generate CSS for realistic handwriting preview
 */
export function generateRealisticPreviewCSS(
  options: RealisticHandwritingOptions,
  settings: AssignmentSettings,
  baseCharacteristics?: HandwritingCharacteristics
): string {
  const styleFonts: Record<string, { primary: string; fallbacks: string[] }> = {
    cursive: { primary: 'Realistic Cursive', fallbacks: ['Patrick Hand', 'Comic Neue', 'Brush Script MT', 'Segoe Script', 'cursive'] },
    print: { primary: 'Realistic Print', fallbacks: ['Instrument Serif', 'Georgia', 'Times New Roman', 'serif'] },
    mixed: { primary: 'Realistic Mixed', fallbacks: ['Patrick Hand', 'Comic Neue', 'Instrument Serif', 'Georgia', 'serif'] },
    calligraphy: { primary: 'Realistic Calligraphy', fallbacks: ['Brush Script MT', 'Segoe Script', 'Edwardian Script ITC', 'cursive'] },
  };

  const penColors: Record<string, { color: string; shadow: string }> = {
    blue: { color: '#1e3a5f', shadow: 'rgba(30, 58, 95, 0.3)' },
    black: { color: '#1a1a2e', shadow: 'rgba(26, 26, 46, 0.4)' },
  };

  const paperPatterns: Record<PaperStyle, string> = {
    ruled: `
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
    `,
    plain: `background-color: white;`,
    grid: `
      background-image:
        linear-gradient(rgba(200, 200, 200, 0.3) 1px, transparent 1px),
        linear-gradient(90deg, rgba(200, 200, 200, 0.3) 1px, transparent 1px);
      background-size: 20px 20px;
      background-color: #fafafa;
    `,
    custom: `background-color: white;`,
  };

  const styleFontsData = styleFonts[options.style] || styleFonts.cursive;
  const penColor = penColors[options.penColor] || penColors.blue;
  const paperPattern = paperPatterns[options.paperStyle] || paperPatterns.ruled;

  const baseFontSize = settings.handwritingSize === 'small' ? 16 : settings.handwritingSize === 'large' ? 20 : 18;
  const baseLineHeight = settings.handwritingSize === 'small' ? 28 : settings.handwritingSize === 'large' ? 36 : 32;

  const fontSize = baseFontSize * options.sizeMultiplier;
  const lineHeight = baseLineHeight * options.spacingMultiplier * settings.lineSpacing;
  const letterSpacing = 0.5 * options.spacingMultiplier * settings.characterSpacing;
  const wordSpacing = 4 * options.spacingMultiplier * settings.wordSpacing;

  const thicknessMultiplier = options.thicknessMultiplier * settings.penThickness;
  const fontWeight = thicknessMultiplier > 1.2 ? '600' : thicknessMultiplier > 0.8 ? '500' : thicknessMultiplier > 0.5 ? '400' : '300';

  const connectednessFactor = options.style === 'cursive' || options.style === 'calligraphy'
    ? 1 - (0.7 * options.sizeMultiplier)
    : 1;

  const styleSlants: Record<string, number> = {
    cursive: -8,
    print: 0,
    mixed: -4,
    calligraphy: -12,
  };

  const slantDeg = (styleSlants[options.style] || 0) + (baseCharacteristics?.writingAngle || 0) * 0.3;

  const fontFamily = `'${styleFontsData.primary}', ${styleFontsData.fallbacks.join(', ')}`;
  const questionFontFamily = options.style === 'print' || options.style === 'mixed'
    ? `'Instrument Serif', Georgia, 'Times New Roman', serif`
    : fontFamily;

  return `
    @font-face {
      font-family: '${styleFontsData.primary}';
      src: local('${styleFontsData.fallbacks[0]}'), local('${styleFontsData.fallbacks[1]}'), local('${styleFontsData.fallbacks[2]}');
      font-display: swap;
    }
    .handwriting-text {
      font-family: ${fontFamily};
      font-size: ${fontSize}px;
      line-height: ${lineHeight}px;
      letter-spacing: ${letterSpacing * connectednessFactor}px;
      word-spacing: ${wordSpacing}px;
      font-weight: ${fontWeight};
      transform: skewX(${slantDeg}deg);
      color: ${penColor.color};
      text-shadow: 0.5px 0.5px 1px ${penColor.shadow};
    }
    .question-text {
      font-family: ${questionFontFamily};
      font-size: ${fontSize * 1.15}px;
      line-height: ${lineHeight * 1.3}px;
      font-weight: ${thicknessMultiplier > 1 ? '600' : '500'};
      color: ${penColor.color};
      transform: skewX(${slantDeg * 0.4}deg);
      text-shadow: 0.5px 0.5px 1px ${penColor.shadow};
    }
    .paper-${options.paperStyle} {
      ${paperPattern}
    }
    .margin-line {
      background-image: linear-gradient(to right, rgba(239, 68, 68, 0.4) 1px, transparent 1px);
      background-position: ${settings.margins.left}px 0;
      background-size: 1px 100%;
      background-repeat: no-repeat;
    }
    .assignment-title {
      font-family: ${options.style === 'print' ? "'Instrument Serif', Georgia, serif" : "'Realistic Cursive', cursive"};
      font-size: ${24 * options.sizeMultiplier}px;
      font-weight: 600;
      color: ${penColor.color};
      margin-bottom: ${32 * options.spacingMultiplier}px;
      text-align: center;
      transform: skewX(${options.style === 'cursive' ? -4 : 0}deg);
    }
    .question-block {
      margin-bottom: ${24 * options.spacingMultiplier}px;
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
      color: ${penColor.color}80;
    }
    .paragraph-left { text-align: left; }
    .paragraph-center { text-align: center; }
    .paragraph-justify { text-align: justify; }
  `;
}

/**
 * Build assignment content HTML from questions and answers
 */
export function buildRealisticAssignmentContent(
  assignment: PreviewAssignment,
  questions: Question[],
  answers: Answer[],
  settings: AssignmentSettings,
  options: RealisticHandwritingOptions
): string[] {
  const pageSize = assignment.pageSize || 'A4';
  const dims = PAGE_DIMENSIONS[pageSize];
  const margins = settings.margins;
  const contentHeight = dims.height - margins.top - margins.bottom;

  const baseLineHeight = settings.handwritingSize === 'small' ? 28 : settings.handwritingSize === 'large' ? 36 : 32;
  const lineHeight = baseLineHeight * options.spacingMultiplier * settings.lineSpacing;
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
      const alignmentClass = options.paragraphAlignment === 'center' ? 'paragraph-center' :
                             options.paragraphAlignment === 'justify' ? 'paragraph-justify' : 'paragraph-left';
      const variationClass = options.lineVariation || options.wordVariation ? 'natural-variation' : '';
      blockHtml += `<div class="answer-text handwriting-text ${alignmentClass} ${variationClass}">${safeAnswerContent.replace(/\n/g, '<br>')}</div>`;
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
 * Generate all handwritten pages for an assignment using realistic engine
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

export function generateRealisticHandwrittenPages(
  assignment: PreviewAssignment,
  questions: Question[],
  answers: Answer[],
  options: RealisticHandwritingOptions,
  settings: AssignmentSettings,
  baseCharacteristics?: HandwritingCharacteristics
): RenderedAssignment {
  const pageSize = assignment.pageSize || 'A4';
  const paperStyle = assignment.paperStyle || 'ruled';
  const pageContents = buildRealisticAssignmentContent(assignment, questions, answers, settings, options);

  const pages: HandwritingPage[] = pageContents.map((content, index) => ({
    pageNumber: index + 1,
    content: generateRealisticPageHTML(
      index + 1,
      content,
      settings,
      options,
      pageContents.length,
      settings.showPageNumbers,
      pageSize,
      paperStyle,
      baseCharacteristics
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
function generateRealisticPageHTML(
  pageNumber: number,
  content: string,
  settings: AssignmentSettings,
  options: RealisticHandwritingOptions,
  totalPages: number,
  showPageNumbers: boolean,
  pageSize: PageSize,
  paperStyle: PaperStyle,
  baseCharacteristics?: HandwritingCharacteristics
): string {
  const dims = PAGE_DIMENSIONS[pageSize];
  const margins = settings.margins;
  const css = generateRealisticPreviewCSS(options, settings, baseCharacteristics);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Realistic Cursive', cursive; background: white; }
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
export function generateRealisticFullHTML(
  assignment: PreviewAssignment,
  questions: Question[],
  answers: Answer[],
  options: RealisticHandwritingOptions,
  settings: AssignmentSettings,
  baseCharacteristics?: HandwritingCharacteristics
): string {
  const pageContents = buildRealisticAssignmentContent(assignment, questions, answers, settings, options);
  const pageSize = assignment.pageSize || 'A4';
  const dims = PAGE_DIMENSIONS[pageSize];
  const margins = settings.margins;
  const paperStyle = assignment.paperStyle || 'ruled';

  const css = generateRealisticPreviewCSS(options, settings, baseCharacteristics);

  let fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Realistic Cursive', cursive; background: #f5f5f5; padding: 20px; }
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