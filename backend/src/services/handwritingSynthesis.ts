import { HandwritingCharacteristics, Assignment, Question, Answer, AssignmentSettings, PageSize, PaperStyle, PAGE_DIMENSIONS } from '../types';
import { sanitizeTitle, sanitizeQuestionAnswer, sanitizeHtml } from '../utils/sanitize';

// Character variation ranges for natural handwriting
const VARIATION_RANGES = {
  rotation: 3, // degrees
  xOffset: 2, // pixels
  yOffset: 2, // pixels
  scale: 0.05, // 5% scale variation
};

interface HandwritingPage {
  pageNumber: number;
  content: string;
  height: number;
  width: number;
}

interface RenderedAssignment {
  pages: HandwritingPage[];
  totalPages: number;
}

/**
 * Analyzed characteristics from handwritting6.jpg (normalized for A4: 794x1123)
 */
const ANALYZED_CHARACTERISTICS = {
  // Character dimensions
  charHeight: 20.0,           // px on A4
  charWidth: 15.0,            // px on A4
  charHeightCV: 0.12,         // coefficient of variation
  charWidthCV: 0.15,

  // Line spacing
  lineSpacing: 32.0,          // px on A4 (standard ruled line spacing)
  lineSpacingCV: 0.05,

  // Slant
  slantDeg: -0.2,             // vertical writing (from handwritting6.jpg)
  slantCV: 1.5,

  // Baseline
  baselineSigma: 1.2,         // subtle baseline drift, stays on ruled line

  // Stroke
  strokeThickness: 1.4,       // natural ballpoint thickness
  strokeThicknessSigma: 0.15,

  // Connectedness
  connectedness: 0.10,        // print / disconnected writing (from handwritting6.jpg)

  // Ink density
  inkDensity: 0.90,

  // Margins
  margins: {
    left: 70,
    right: 40,
    top: 45,
    bottom: 40,
  },

  // Reference image dimensions
  refWidth: 1237,
  refHeight: 1600,
};

/**
 * Deterministic pseudo-random generator for consistent variations
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }

  nextGaussian(mean: number = 0, stdDev: number = 1): number {
    // Box-Muller transform
    const u1 = this.next();
    const u2 = this.next();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z0 * stdDev;
  }

  nextRange(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

/**
 * Organic handwritten text renderer that applies per-word and per-character
 * baseline drifts, scale variation, rotation, and letter-spacing variations.
 * Prevents uniform computer-font appearance while preserving line wrapping.
 */
export function renderOrganicHandwriting(
  text: string,
  startSeed: number = 100
): string {
  const words = text.split(/(\s+)/);
  let html = '';
  let seed = startSeed;

  for (let w = 0; w < words.length; w++) {
    const word = words[w];
    if (/^\s+$/.test(word)) {
      const rng = new SeededRandom(seed++);
      const spaceWidth = 9 + (rng.next() * 5 - 2.5);
      html += `<span style="display:inline-block; width:${spaceWidth.toFixed(1)}px;"> </span>`;
      continue;
    }

    // Word wrapper with subtle organic baseline drift & tilt
    const rngW = new SeededRandom(seed++);
    const wordY = (rngW.next() * 1.8 - 0.9).toFixed(2);
    const wordRot = (rngW.next() * 1.2 - 0.6).toFixed(2);

    html += `<span class="hw-word" style="display:inline-block; transform: translateY(${wordY}px) rotate(${wordRot}deg); white-space:nowrap;">`;

    for (let c = 0; c < word.length; c++) {
      const char = word[c];
      const rngC = new SeededRandom(seed++);

      const scaleY = (0.93 + rngC.next() * 0.14).toFixed(3);
      const scaleX = (0.95 + rngC.next() * 0.12).toFixed(3);
      const charY = (rngC.next() * 1.6 - 0.8).toFixed(2);
      const charRot = (rngC.next() * 2.2 - 1.1).toFixed(2);
      const charSpacing = (rngC.next() * 0.5 - 0.25).toFixed(2);

      const charStyle = `
        display:inline-block;
        transform: translateY(${charY}px) scale(${scaleX}, ${scaleY}) rotate(${charRot}deg);
        margin-right:${charSpacing}px;
      `.replace(/\s+/g, ' ').trim();

      const safeChar = char === '<' ? '&lt;' : char === '>' ? '&gt;' : char === '&' ? '&amp;' : char === '"' ? '&quot;' : char;
      html += `<span style="${charStyle}">${safeChar}</span>`;
    }

    html += `</span>`;
  }

  return html;
}

/**
 * Generate per-character variation styles for personal handwriting
 */
function generateCharacterVariations(
  text: string,
  baseSeed: number,
  characteristics: HandwritingCharacteristics
): string {
  const chars = text.split('');

  // Extract variation parameters from characteristics (normalized 0-100 to actual values)
  const charHeightCV = (characteristics.connectedness / 100) * ANALYZED_CHARACTERISTICS.charHeightCV;
  const charWidthCV = (characteristics.connectedness / 100) * ANALYZED_CHARACTERISTICS.charWidthCV;
  const slantDeg = characteristics.writingAngle;
  const baselineSigma = (characteristics.baselineAlignment / 100) * ANALYZED_CHARACTERISTICS.baselineSigma;
  const strokeSigma = (characteristics.pressureVariation / 100) * ANALYZED_CHARACTERISTICS.strokeThicknessSigma;
  const connectedness = characteristics.connectedness / 100;

  let html = '';
  let seed = baseSeed;

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    if (char === ' ') {
      html += '&nbsp;';
      continue;
    }

    const rnd = new SeededRandom(seed++);

    // Per-character variations based on analyzed characteristics
    const heightScale = 1 + rnd.nextGaussian(0, charHeightCV);
    const widthScale = 1 + rnd.nextGaussian(0, charWidthCV);
    const rotation = rnd.nextGaussian(0, Math.min(ANALYZED_CHARACTERISTICS.slantCV, 10));
    const xOffset = rnd.nextGaussian(0, VARIATION_RANGES.xOffset);
    const yOffset = rnd.nextGaussian(0, VARIATION_RANGES.yOffset);
    const baselineOffset = rnd.nextGaussian(0, baselineSigma);
    const strokeVariation = 1 + rnd.nextGaussian(0, strokeSigma / ANALYZED_CHARACTERISTICS.strokeThickness);

    // Apply connectedness (reduce spacing for cursive)
    const letterSpacingFactor = 1 - connectedness * 0.7;

    const style = `
      display: inline-block;
      transform:
        scaleX(${widthScale.toFixed(3)})
        scaleY(${heightScale.toFixed(3)})
        rotate(${rotation.toFixed(2)}deg)
        translate(${xOffset.toFixed(2)}px, ${yOffset.toFixed(2)}px);
      margin-bottom: ${baselineOffset.toFixed(2)}px;
      font-weight: ${Math.round(400 * strokeVariation)};
      letter-spacing: ${(0.5 * letterSpacingFactor).toFixed(2)}px;
    `.replace(/\s+/g, ' ').trim();

    const safeChar = char === '<' ? '&lt;' : char === '>' ? '&gt;' : char === '&' ? '&amp;' : char === '"' ? '&quot;' : char;
    html += `<span style="${style}">${safeChar}</span>`;
  }

  return html;
}

/**
 * Generate per-word variation (spacing between words)
 */
function generateWordVariations(
  text: string,
  baseSeed: number,
  characteristics: HandwritingCharacteristics
): string {
  const words = text.split(/(\s+)/); // Keep whitespace
  const connectedness = characteristics.connectedness / 100;

  let html = '';
  let seed = baseSeed;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (/^\s+$/.test(word)) {
      // Whitespace - add variation
      const rnd = new SeededRandom(seed++);
      const spaceWidth = 4 * (1 + rnd.nextGaussian(0, 0.15));
      html += `<span style="display: inline-block; width: ${spaceWidth.toFixed(2)}px;"></span>`;
    } else {
      // Word - apply character variations
      html += generateCharacterVariations(word, seed, characteristics);
      seed += word.length;
    }
  }

  return html;
}

/**
 * Generate per-line variation (line height, baseline, slant)
 */
function generateLineVariations(
  lines: string[],
  baseSeed: number,
  characteristics: HandwritingCharacteristics
): string[] {
  const lineSpacingCV = (characteristics.lineSpacing / 8.5) * ANALYZED_CHARACTERISTICS.lineSpacingCV;
  const baselineSigma = (characteristics.baselineAlignment / 100) * ANALYZED_CHARACTERISTICS.baselineSigma;
  const slantDeg = characteristics.writingAngle;

  return lines.map((line, lineIndex) => {
    const rnd = new SeededRandom(baseSeed + lineIndex * 1000);

    // Per-line variations
    const lineHeightScale = 1 + rnd.nextGaussian(0, lineSpacingCV);
    const baselineOffset = rnd.nextGaussian(0, baselineSigma);
    const lineSlant = slantDeg + rnd.nextGaussian(0, Math.min(ANALYZED_CHARACTERISTICS.slantCV, 8));

    // Apply word variations within the line
    const variedLine = generateWordVariations(line, baseSeed + lineIndex * 1000 + 500, characteristics);

    return `
      <div class="handwriting-line" style="
        line-height: 1.5;
        margin-bottom: 12px;
        transform: skewX(${lineSlant.toFixed(2)}deg) translateY(${baselineOffset.toFixed(2)}px);
        display: block;
      ">
        ${variedLine}
      </div>
    `;
  });
}

/**
 * Generate CSS styles based on handwriting characteristics
 * Enhanced with analyzed characteristics from handwritting6.jpg
 */
function generateHandwritingCSS(characteristics: HandwritingCharacteristics, settings: AssignmentSettings): string {
  const baseFontSize = settings.handwritingSize === 'small' ? 18 : settings.handwritingSize === 'large' ? 22 : 20;
  const fontSize = Math.max(18, Math.min(22, baseFontSize));
  const lineHeight = 35; // Matches the 35px ruled lines of handwritting6.jpg
  const letterSpacing = 0.3 * (settings.characterSpacing || 1.0);
  const wordSpacing = 4.0 * (settings.wordSpacing || 1.0);

  // Slant transformation - upright vertical print (-0.2 deg) from handwritting6.jpg
  const slantDeg = characteristics.writingAngle !== undefined ? characteristics.writingAngle : -0.2;

  // Natural black ballpoint ink matching handwritting6.jpg
  const inkColor = '#1a1a1a';
  const headingColor = '#111111';

  return `
    @import url('https://fonts.googleapis.com/css2?family=Gaegu:wght@400;700&family=Hi+Melody&display=swap');
    @font-face {
      font-family: 'HandwriteAI Handwriting';
      src: local('Gaegu'), local('Hi Melody'), cursive;
      font-display: swap;
    }
    @font-face {
      font-family: 'HandwriteAI Question';
      src: local('Gaegu'), local('Hi Melody'), cursive;
      font-display: swap;
    }
    .paper-ruled {
      background-image: repeating-linear-gradient(
        transparent,
        transparent 34px,
        #b8b8b8 34px,
        #b8b8b8 35px
      );
      background-position: 0 46px;
      background-size: 100% 35px;
      background-color: #fcfcfa;
    }
    .paper-plain {
      background-color: #fcfcfa;
    }
    .handwriting-text {
      font-family: 'HandwriteAI Handwriting', 'Gaegu', cursive;
      font-size: ${fontSize + 4}px;
      line-height: ${lineHeight}px;
      letter-spacing: ${letterSpacing}px;
      word-spacing: ${wordSpacing}px;
      font-weight: 400;
      transform: skewX(${slantDeg}deg);
      color: ${inkColor};
    }
    .handwriting-line {
      font-family: 'HandwriteAI Handwriting', 'Gaegu', cursive;
      font-size: ${fontSize + 4}px;
      line-height: ${lineHeight}px;
      color: ${inkColor};
      margin-bottom: 0;
    }
    .question-text {
      font-family: 'HandwriteAI Handwriting', 'Gaegu', cursive;
      font-size: ${(fontSize + 4) * 1.05}px;
      line-height: ${lineHeight}px;
      font-weight: 700;
      color: ${headingColor};
      margin-bottom: 0;
    }
    .assignment-title {
      font-family: 'HandwriteAI Handwriting', 'Gaegu', cursive;
      font-size: 26px;
      line-height: ${lineHeight}px;
      font-weight: 700;
      color: ${headingColor};
      margin-bottom: 0;
      text-align: center;
    }
    .hw-underline {
      border-bottom: 2px solid #1a1a1a;
      padding-bottom: 1px;
      display: inline-block;
    }
  `;
}

/**
 * Generate HTML for a single page
 */
function generatePageHTML(
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
  const css = generateHandwritingCSS(characteristics, settings);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Gaegu', 'Hi Melody', cursive; background: white; margin: 0; padding: 0; }
        .page-container {
          width: ${dims.width}px;
          height: ${dims.height}px;
          position: relative;
          background: #fcfcfa;
          padding: 30px 35px;
          overflow: hidden;
        }
        .page-border-box {
          width: 100%;
          height: 100%;
          border: 2px solid #222222;
          outline: 1px solid #555555;
          outline-offset: -3px;
          padding: 20px 28px;
          position: relative;
        }
        ${css}
        .question-block {
          margin-bottom: 0;
        }
        .question-number {
          font-weight: 700;
          margin-right: 4px;
        }
        .answer-text {
          margin-left: 0;
        }
        .page-number {
          position: absolute;
          bottom: 10px;
          right: 32px;
          font-family: 'Gaegu', cursive;
          font-size: 13px;
          color: #666666;
        }
        @media print {
          .page-container { page-break-after: always; }
        }
      </style>
    </head>
    <body>
      <div class="page-container">
        <div class="page-border-box paper-${paperStyle} handwriting-text">
          ${content}
        </div>
        ${showPageNumbers ? `<div class="page-number">Page ${pageNumber} of ${totalPages}</div>` : ''}
      </div>
    </body>
    </html>
  `;
}

/**
 * Build assignment content HTML from questions and answers
 * Enhanced with line-by-line pagination budgeting so content NEVER overflows the page border
 */
function buildAssignmentContent(
  assignment: Assignment,
  questions: Question[],
  answers: Answer[],
  settings: AssignmentSettings,
  characteristics: HandwritingCharacteristics
): string[] {
  // Max lines inside the rectangular border (height: 1063px with 35px lines = 24 usable lines, safe cap 21)
  const maxLinesPerPage = 21;
  const pages: string[] = [];
  let currentPageContent = '';
  let currentLineCount = 0;

  function pushPage() {
    if (currentPageContent.trim()) {
      pages.push(currentPageContent);
      currentPageContent = '';
      currentLineCount = 0;
    }
  }

  // Add assignment title on first page
  const safeTitle = sanitizeTitle(assignment.title);
  let globalSeed = 1000;
  const organicTitle = renderOrganicHandwriting(safeTitle, globalSeed++);
  currentPageContent += `<div class="assignment-title"><span class="hw-underline">${organicTitle}</span></div>`;
  currentLineCount += 2; // Title + spacing

  questions.forEach((question, qIndex) => {
    const answer = answers.find(a => a.questionId === question.id);
    const rawAnswerContent: string = (answer?.editedContent || answer?.content || (answer as any)?.text || '')
      .replace(/<[^>]+>/g, '') // Strip stray HTML
      .trim();

    // Clean question text
    const cleanQuestionText = question.text.replace(/<[^>]+>/g, '').trim();
    // Rough calculation of lines for question (A4 line holds ~52 chars inside border padding)
    const qLineCount = Math.max(1, Math.ceil((cleanQuestionText.length + 6) / 52));

    // Force new page if questionStartMode is 'new-page' (except first question)
    if (settings.questionStartMode === 'new-page' && qIndex > 0) {
      pushPage();
    } else if (currentLineCount + qLineCount + 2 > maxLinesPerPage && qIndex > 0) {
      // If question header alone wouldn't have at least 2 lines of answer below it, push new page
      pushPage();
    }

    // Question header HTML - Rendered using organic micro-variations
    let questionHeaderHtml = '<div class="question-block">';
    if (settings.showQuestionNumbers) {
      const qNumHtml = renderOrganicHandwriting(`Q${qIndex + 1}.`, globalSeed++);
      const qTextHtml = renderOrganicHandwriting(cleanQuestionText, globalSeed++);
      questionHeaderHtml += `<div class="question-text" style="font-weight: 700; color: #111111;"><span class="question-number">${qNumHtml}</span> ${qTextHtml}</div>`;
    } else {
      const qTextHtml = renderOrganicHandwriting(cleanQuestionText, globalSeed++);
      questionHeaderHtml += `<div class="question-text" style="font-weight: 700; color: #111111;">${qTextHtml}</div>`;
    }

    currentPageContent += questionHeaderHtml;
    currentLineCount += qLineCount;

    // Now process answer line by line so it splits naturally across pages without overflowing border
    const rawLines = rawAnswerContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    let answerHtml = '<div class="answer-text">';
    for (const line of rawLines) {
      const lineLines = Math.max(1, Math.ceil(line.length / 52));

      // If adding this line would exceed the page, push current page and start a new one
      if (currentLineCount + lineLines > maxLinesPerPage) {
        answerHtml += '</div></div>'; // Close current answer-text and question-block
        currentPageContent += answerHtml;
        pushPage();
        // Reopen question block and answer container on new page
        currentPageContent += '<div class="question-block">';
        answerHtml = '<div class="answer-text">';
      }

      const isHeading = (line.endsWith(':') && line.length < 50) || (line.startsWith('Step ') && line.length < 60);
      const organicLine = renderOrganicHandwriting(line, globalSeed++);
      if (isHeading) {
        answerHtml += `<div class="handwriting-line" style="font-weight: 700; margin-top: 4px;"><span class="hw-underline">${organicLine}</span></div>`;
      } else {
        answerHtml += `<div class="handwriting-line">${organicLine}</div>`;
      }
      currentLineCount += lineLines;
    }
    answerHtml += '</div></div>'; // Close answer-text and question-block
    currentPageContent += answerHtml;
  });

  if (currentPageContent.trim()) {
    pages.push(currentPageContent);
  }

  return pages;
}

/**
 * Generate all handwritten pages for an assignment
 */
export function generateHandwrittenPages(
  assignment: Assignment,
  questions: Question[],
  answers: Answer[],
  handwritingProfile: { characteristics: HandwritingCharacteristics },
  settings: AssignmentSettings
): RenderedAssignment {
  const characteristics = handwritingProfile.characteristics;
  const pageSize = assignment.pageSize || 'A4';
  const paperStyle = assignment.paperStyle || 'ruled';
  const pageContents = buildAssignmentContent(assignment, questions, answers, settings, characteristics);

  const pages: HandwritingPage[] = pageContents.map((content, index) => ({
    pageNumber: index + 1,
    content: generatePageHTML(
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
 * Generate a single consolidated HTML for all pages (for preview/print)
 */
export function generateFullHTML(
  assignment: Assignment,
  questions: Question[],
  answers: Answer[],
  handwritingProfile: { characteristics: HandwritingCharacteristics },
  settings: AssignmentSettings
): string {
  const characteristics = handwritingProfile.characteristics;
  const pageContents = buildAssignmentContent(assignment, questions, answers, settings, characteristics);
  const pageSize = assignment.pageSize || 'A4';
  const dims = PAGE_DIMENSIONS[pageSize];
  const paperStyle = assignment.paperStyle || 'ruled';
  const css = generateHandwritingCSS(characteristics, settings);

  let fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Gaegu', cursive; background: #e0e0e0; padding: 20px; }
        .page-container {
          width: ${dims.width}px;
          height: ${dims.height}px;
          position: relative;
          background: #fcfcfa;
          padding: 30px 35px;
          margin: 0 auto 20px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.15);
          overflow: hidden;
        }
        .page-border-box {
          width: 100%;
          height: 100%;
          border: 2px solid #222222;
          outline: 1px solid #555555;
          outline-offset: -3px;
          padding: 20px 28px;
          position: relative;
        }
        ${css}
        .question-block {
          margin-bottom: 0;
        }
        .question-number {
          font-weight: 700;
          margin-right: 4px;
        }
        .answer-text {
          margin-left: 0;
        }
        .page-number {
          position: absolute;
          bottom: 10px;
          right: 32px;
          font-family: 'Gaegu', cursive;
          font-size: 13px;
          color: #666666;
        }
        @media print {
          body { background: white; padding: 0; }
          .page-container { margin: 0; box-shadow: none; page-break-after: always; }
        }
      </style>
    </head>
    <body>
  `;

  pageContents.forEach((content, index) => {
    fullHtml += `
      <div class="page-container">
        <div class="page-border-box paper-${paperStyle} handwriting-text">
          ${content}
        </div>
        ${settings.showPageNumbers ? `<div class="page-number">Page ${index + 1} of ${pageContents.length}</div>` : ''}
      </div>
    `;
  });

  fullHtml += '</body></html>';
  return fullHtml;
}

export { HandwritingPage, RenderedAssignment, ANALYZED_CHARACTERISTICS };