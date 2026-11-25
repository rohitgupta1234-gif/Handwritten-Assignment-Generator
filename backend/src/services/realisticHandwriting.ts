import { HandwritingCharacteristics, Assignment, Question, Answer, AssignmentSettings, PageSize, PaperStyle, PAGE_DIMENSIONS, RealisticHandwritingOptions, RealisticStyle, PenColor } from '../types';
import { sanitizeTitle, sanitizeQuestionAnswer } from '../utils/sanitize';

/**
 * Realistic Handwriting Generation Engine - ENHANCED WITH ANALYZED CHARACTERISTICS
 * Generates handwritten text using CSS-based rendering with multiple styles,
 * pen colors, natural variations, and paper types
 *
 * Enhanced with characteristics from handwritting6.jpg analysis:
 * - Character Height: 24.9px (CV=0.309)
 * - Character Width: 24.3px (CV=0.600)
 * - Line Spacing: 114.1px (CV=0.706)
 * - Slant: 6.0° (CV=8.665)
 * - Baseline Variation: σ=9.5px
 * - Stroke Thickness: 2.14px (σ=0.55px)
 * - Connectedness: 0.899
 * - Ink Density: 0.153
 */

// Font families for different realistic styles
const STYLE_FONTS: Record<RealisticStyle, { primary: string; fallbacks: string[] }> = {
  cursive: {
    primary: 'Gaegu',
    fallbacks: ['Gaegu', 'Hi Melody', 'cursive'],
  },
  print: {
    primary: 'Gaegu',
    fallbacks: ['Gaegu', 'Hi Melody', 'cursive'],
  },
  mixed: {
    primary: 'Gaegu',
    fallbacks: ['Gaegu', 'Hi Melody', 'cursive'],
  },
  calligraphy: {
    primary: 'Gaegu',
    fallbacks: ['Gaegu', 'cursive'],
  },
};

// Pen color CSS
const PEN_COLORS: Record<PenColor, { color: string; shadow: string }> = {
  blue: { color: '#142c54', shadow: 'rgba(20, 44, 84, 0.2)' },
  black: { color: '#1a1a1a', shadow: 'rgba(26, 26, 26, 0.3)' },
};

// Paper background patterns
const PAPER_PATTERNS: Record<PaperStyle, string> = {
  ruled: `
    background-image:
      repeating-linear-gradient(
        transparent,
        transparent 34px,
        #b8b8b8 34px,
        #b8b8b8 35px
      );
    background-position: 0 46px;
    background-size: 100% 35px;
    background-color: #fcfcfa;
  `,
  plain: `
    background-color: #fcfcfa;
  `,
  grid: `
    background-image:
      linear-gradient(rgba(180, 180, 180, 0.3) 1px, transparent 1px),
      linear-gradient(90deg, rgba(180, 180, 180, 0.3) 1px, transparent 1px);
    background-size: 20px 20px;
    background-color: #fcfcfa;
  `,
  custom: `
    background-color: #fcfcfa;
  `,
};

// Natural variation ranges
type VariationLevel = 'low' | 'medium' | 'high';
interface VariationConfig {
  rotation: Record<VariationLevel, number>;
  xOffset: Record<VariationLevel, number>;
  yOffset: Record<VariationLevel, number>;
  scale: Record<VariationLevel, number>;
  lineHeight: Record<VariationLevel, number>;
  letterSpacing: Record<VariationLevel, number>;
}

const VARIATION_CONFIG: VariationConfig = {
  rotation: { low: 1, medium: 3, high: 5 }, // degrees
  xOffset: { low: 0.5, medium: 1.5, high: 3 }, // pixels
  yOffset: { low: 0.5, medium: 1.5, high: 3 }, // pixels
  scale: { low: 0.02, medium: 0.05, high: 0.08 }, // scale variation
  lineHeight: { low: 0.02, medium: 0.05, high: 0.08 }, // line height variation
  letterSpacing: { low: 0.02, medium: 0.05, high: 0.08 }, // letter spacing variation
};

/**
 * Analyzed characteristics from handwritting6.jpg (normalized for A4: 794x1123)
 */
const ANALYZED_CHARACTERISTICS = {
  // Character dimensions (normalized to A4 page)
  charHeight: 24.9,           // px on A4
  charWidth: 24.3,            // px on A4
  charHeightCV: 0.309,        // coefficient of variation
  charWidthCV: 0.600,

  // Line spacing
  lineSpacing: 114.1,         // px on A4
  lineSpacingCV: 0.706,

  // Slant
  slantDeg: 6.0,              // degrees (rightward)
  slantCV: 8.665,             // high variation

  // Baseline
  baselineSigma: 9.5,         // px standard deviation

  // Stroke
  strokeThickness: 2.14,      // px
  strokeThicknessSigma: 0.55, // px

  // Connectedness
  connectedness: 0.899,       // ratio (highly cursive)

  // Ink density
  inkDensity: 0.153,

  // Margins (from analysis - these are pixel positions on 1237x1600 image)
  // Normalized to A4 (794x1123)
  margins: {
    left: 579.5 / 1237 * 794,   // ~372px
    right: 616.1 / 1237 * 794,  // ~395px
    top: 49.0 / 1600 * 1123,    // ~34px
    bottom: 46.0 / 1600 * 1123, // ~32px
  },

  // Reference image dimensions for normalization
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
 * Generate per-character variation styles
 */
function generateCharacterVariations(
  text: string,
  baseSeed: number,
  variation: VariationConfig[keyof VariationConfig] | number,
  options: RealisticHandwritingOptions,
  baseCharacteristics?: HandwritingCharacteristics
): string {
  if (!options.lineVariation && !options.wordVariation) {
    return text; // No variation requested
  }

  const chars = text.split('');
  const variationLevel = options.variationLevel;
  const charHeightCV = baseCharacteristics ? (baseCharacteristics.connectedness / 100) * 0.309 : ANALYZED_CHARACTERISTICS.charHeightCV;
  const charWidthCV = baseCharacteristics ? (baseCharacteristics.connectedness / 100) * 0.600 : ANALYZED_CHARACTERISTICS.charWidthCV;
  const slantDeg = baseCharacteristics ? baseCharacteristics.writingAngle : ANALYZED_CHARACTERISTICS.slantDeg;
  const slantCV = baseCharacteristics ? 8.665 : ANALYZED_CHARACTERISTICS.slantCV;
  const baselineSigma = baseCharacteristics ? (baseCharacteristics.baselineAlignment / 100) * 9.5 : ANALYZED_CHARACTERISTICS.baselineSigma;
  const strokeSigma = baseCharacteristics ? (baseCharacteristics.pressureVariation / 100) * 0.55 : ANALYZED_CHARACTERISTICS.strokeThicknessSigma;
  const connectedness = baseCharacteristics ? baseCharacteristics.connectedness / 100 : ANALYZED_CHARACTERISTICS.connectedness;

  let html = '';
  let seed = baseSeed;

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    if (char === ' ') {
      html += '&nbsp;';
      continue;
    }

    const rnd = new SeededRandom(seed++);

    // Per-character variations
    const heightScale = 1 + rnd.nextGaussian(0, charHeightCV);
    const widthScale = 1 + rnd.nextGaussian(0, charWidthCV);
    const rotation = rnd.nextGaussian(0, Math.min(slantCV, 10)); // clamp for visual sanity
    const xOffset = rnd.nextGaussian(0, VARIATION_CONFIG.xOffset[variationLevel]);
    const yOffset = rnd.nextGaussian(0, VARIATION_CONFIG.yOffset[variationLevel]);
    const baselineOffset = rnd.nextGaussian(0, baselineSigma);
    const strokeVariation = 1 + rnd.nextGaussian(0, strokeSigma / ANALYZED_CHARACTERISTICS.strokeThickness);

    // Apply connectedness (reduce spacing for cursive)
    const letterSpacingFactor = options.style === 'cursive' || options.style === 'calligraphy'
      ? (1 - connectedness * 0.7)
      : 1;

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

    html += `<span style="${style}">${char === '<' ? '<' : char === '>' ? '>' : char === '&' ? '&' : char}</span>`;
  }

  return html;
}

/**
 * Generate per-word variation (spacing between words)
 */
function generateWordVariations(
  text: string,
  baseSeed: number,
  options: RealisticHandwritingOptions,
  baseCharacteristics?: HandwritingCharacteristics
): string {
  if (!options.wordVariation) {
    return text;
  }

  const words = text.split(/(\s+)/); // Keep whitespace
  const variationLevel = options.variationLevel;
  const connectedness = baseCharacteristics ? baseCharacteristics.connectedness / 100 : ANALYZED_CHARACTERISTICS.connectedness;

  let html = '';
  let seed = baseSeed;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (/^\s+$/.test(word)) {
      // Whitespace - add variation
      const rnd = new SeededRandom(seed++);
      const spaceWidth = 4 * options.spacingMultiplier * (1 + rnd.nextGaussian(0, 0.15));
      html += `<span style="display: inline-block; width: ${spaceWidth.toFixed(2)}px;"></span>`;
    } else {
      // Word - apply character variations
      html += generateCharacterVariations(word, seed, VARIATION_CONFIG.letterSpacing, options, baseCharacteristics);
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
  options: RealisticHandwritingOptions,
  baseCharacteristics?: HandwritingCharacteristics
): string[] {
  if (!options.lineVariation) {
    return lines;
  }

  const lineSpacingCV = baseCharacteristics
    ? (baseCharacteristics.lineSpacing / 8.5) * 0.706
    : ANALYZED_CHARACTERISTICS.lineSpacingCV;
  const baselineSigma = baseCharacteristics
    ? (baseCharacteristics.baselineAlignment / 100) * 9.5
    : ANALYZED_CHARACTERISTICS.baselineSigma;
  const slantDeg = baseCharacteristics
    ? baseCharacteristics.writingAngle
    : ANALYZED_CHARACTERISTICS.slantDeg;
  const slantCV = ANALYZED_CHARACTERISTICS.slantCV;

  return lines.map((line, lineIndex) => {
    const rnd = new SeededRandom(baseSeed + lineIndex * 1000);

    // Per-line variations
    const lineHeightScale = 1 + rnd.nextGaussian(0, lineSpacingCV);
    const baselineOffset = rnd.nextGaussian(0, baselineSigma);
    const lineSlant = slantDeg + rnd.nextGaussian(0, Math.min(slantCV, 8));

    // Apply word variations within the line
    const variedLine = generateWordVariations(line, baseSeed + lineIndex * 1000 + 500, options, baseCharacteristics);

    return `
      <div class="handwriting-line" style="
        line-height: ${lineHeightScale.toFixed(3)};
        transform: skewX(${lineSlant.toFixed(2)}deg) translateY(${baselineOffset.toFixed(2)}px);
        display: block;
      ">
        ${variedLine}
      </div>
    `;
  });
}

/**
 * Generate CSS for realistic handwriting with analyzed characteristics
 */
export function generateRealisticHandwritingCSS(
  options: RealisticHandwritingOptions,
  settings: AssignmentSettings,
  baseCharacteristics?: HandwritingCharacteristics
): string {
  const safeOptions = validateRealisticOptions(options);
  const styleFonts = STYLE_FONTS[safeOptions.style] || STYLE_FONTS.cursive;
  const penColor = PEN_COLORS[safeOptions.penColor] || PEN_COLORS.blue;
  const paperPattern = PAPER_PATTERNS[safeOptions.paperStyle] || PAPER_PATTERNS.ruled;

  // Base font size from settings
  const baseFontSize = settings.handwritingSize === 'small' ? 16 : settings.handwritingSize === 'large' ? 20 : 18;
  const baseLineHeight = settings.handwritingSize === 'small' ? 28 : settings.handwritingSize === 'large' ? 36 : 32;

  // Apply analyzed characteristics for sizing
  const analyzedCharHeight = baseCharacteristics
    ? baseCharacteristics.letterHeight * 6 // Convert from mm to px approximation
    : ANALYZED_CHARACTERISTICS.charHeight;
  const analyzedLineSpacing = baseCharacteristics
    ? baseCharacteristics.lineSpacing * 13 // Convert from mm to px
    : ANALYZED_CHARACTERISTICS.lineSpacing;

  const fontSize = baseFontSize * safeOptions.sizeMultiplier * (analyzedCharHeight / 18);
  const lineHeight = baseLineHeight * safeOptions.spacingMultiplier * settings.lineSpacing * (analyzedLineSpacing / 32);

  // Character/word spacing with analyzed connectedness
  const analyzedConnectedness = baseCharacteristics
    ? baseCharacteristics.connectedness / 100
    : ANALYZED_CHARACTERISTICS.connectedness;
  const letterSpacing = 0.5 * safeOptions.spacingMultiplier * settings.characterSpacing * (1 - analyzedConnectedness * 0.5);
  const wordSpacing = 4 * safeOptions.spacingMultiplier * settings.wordSpacing;

  // Pen thickness affects font weight
  const analyzedThickness = baseCharacteristics
    ? baseCharacteristics.penThickness
    : ANALYZED_CHARACTERISTICS.strokeThickness / 3; // normalize
  const thicknessMultiplier = safeOptions.thicknessMultiplier * settings.penThickness * analyzedThickness;
  const fontWeight = thicknessMultiplier > 1.2 ? '600' : thicknessMultiplier > 0.8 ? '500' : thicknessMultiplier > 0.5 ? '400' : '300';

  // Variation level
  const variationConfig = VARIATION_CONFIG.rotation[safeOptions.variationLevel] !== undefined
    ? safeOptions.variationLevel
    : 'medium';
  const variation = {
    rotation: VARIATION_CONFIG.rotation[variationConfig],
    xOffset: VARIATION_CONFIG.xOffset[variationConfig],
    yOffset: VARIATION_CONFIG.yOffset[variationConfig],
    scale: VARIATION_CONFIG.scale[variationConfig],
    lineHeight: VARIATION_CONFIG.lineHeight[variationConfig],
    letterSpacing: VARIATION_CONFIG.letterSpacing[variationConfig],
  };

  // Connectedness (affects letter spacing for cursive)
  const connectednessFactor = safeOptions.style === 'cursive' || safeOptions.style === 'calligraphy'
    ? 1 - (0.7 * analyzedConnectedness)
    : 1;

  // Slant angle based on style + analyzed characteristics
  const styleSlants: Record<RealisticStyle, number> = {
    cursive: -8,
    print: 0,
    mixed: -4,
    calligraphy: -12,
  };

  const analyzedSlant = baseCharacteristics ? baseCharacteristics.writingAngle : ANALYZED_CHARACTERISTICS.slantDeg;
  const slantDeg = (styleSlants[safeOptions.style] ?? -8) + analyzedSlant * 0.3;

  // Build font-family with fallbacks
  const fontFamily = `'${styleFonts.primary}', ${styleFonts.fallbacks.join(', ')}`;

  // Question font - match handwriting style, exactly same font family
  const questionFontFamily = fontFamily;

  // Ink density affects color opacity
  const inkOpacity = baseCharacteristics
    ? Math.min(1, baseCharacteristics.pressureVariation / 100 * 1.5)
    : ANALYZED_CHARACTERISTICS.inkDensity * 2;
  const penColorWithOpacity = penColor.color.replace('#', '#').replace(')', `, ${inkOpacity.toFixed(2)})`).replace('rgb', 'rgba');

  return `
    @font-face {
      font-family: '${styleFonts.primary}';
      src: local('${styleFonts.fallbacks[0]}'), local('${styleFonts.fallbacks[1]}'), local('${styleFonts.fallbacks[2]}');
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
    .handwriting-line {
      font-family: ${fontFamily};
      font-size: ${fontSize}px;
      font-weight: ${fontWeight};
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
    .paper-${safeOptions.paperStyle} {
      ${paperPattern}
    }
    .margin-line {
      background-image: linear-gradient(to right, rgba(239, 68, 68, 0.4) 1px, transparent 1px);
      background-position: ${settings.margins.left}px 0;
      background-size: 1px 100%;
      background-repeat: no-repeat;
    }
    /* Natural variation keyframes */
    @keyframes subtle-drift {
      0%, 100% { transform: translate(0, 0) rotate(0deg); }
      25% { transform: translate(${variation.xOffset}px, ${variation.yOffset}px) rotate(${variation.rotation}deg); }
      75% { transform: translate(-${variation.xOffset}px, -${variation.yOffset}px) rotate(-${variation.rotation}deg); }
    }
    .natural-variation {
      animation: subtle-drift 8s ease-in-out infinite;
    }
  `;
}

/**
 * Generate HTML for a single page with realistic handwriting
 */
export function generateRealisticPageHTML(
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
  const css = generateRealisticHandwritingCSS(options, settings, baseCharacteristics);

  // Analyzed margins (override settings with analyzed values if available)
  const analyzedMargins = baseCharacteristics ? {
    top: baseCharacteristics.pageMargins.top * 3.78, // mm to px
    right: baseCharacteristics.pageMargins.right * 3.78,
    bottom: baseCharacteristics.pageMargins.bottom * 3.78,
    left: baseCharacteristics.pageMargins.left * 3.78,
  } : {
    top: ANALYZED_CHARACTERISTICS.margins.top,
    right: ANALYZED_CHARACTERISTICS.margins.right,
    bottom: ANALYZED_CHARACTERISTICS.margins.bottom,
    left: ANALYZED_CHARACTERISTICS.margins.left,
  };

  // Use analyzed margins with some settings influence
  const finalMargins = {
    top: margins.top * 0.5 + analyzedMargins.top * 0.5,
    right: margins.right * 0.5 + analyzedMargins.right * 0.5,
    bottom: margins.bottom * 0.5 + analyzedMargins.bottom * 0.5,
    left: margins.left * 0.5 + analyzedMargins.left * 0.5,
  };

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
          padding: ${finalMargins.top}px ${finalMargins.right}px ${finalMargins.bottom}px ${finalMargins.left}px;
          background: white;
        }
        ${css}
        .assignment-title {
          font-family: ${options.style === 'print' ? "'Instrument Serif', Georgia, serif" : "'Realistic Cursive', cursive"};
          font-size: ${24 * options.sizeMultiplier}px;
          font-weight: 600;
          color: ${PEN_COLORS[options.penColor].color};
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
          color: ${PEN_COLORS[options.penColor].color}80;
        }
        .paragraph-left { text-align: left; }
        .paragraph-center { text-align: center; }
        .paragraph-justify { text-align: justify; }
        @media print {
          .page-container { page-break-after: always; }
        }
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
 * Build assignment content HTML from questions and answers with realistic handwriting
 * Enhanced with per-character, per-word, per-line, and per-page variations
 */
export function buildRealisticAssignmentContent(
  assignment: Assignment,
  questions: Question[],
  answers: Answer[],
  settings: AssignmentSettings,
  options: RealisticHandwritingOptions,
  baseCharacteristics?: HandwritingCharacteristics
): string[] {
  const pageSize = assignment.pageSize || 'A4';
  const dims = PAGE_DIMENSIONS[pageSize];
  const margins = settings.margins;
  const contentWidth = dims.width - margins.left - margins.right;
  const contentHeight = dims.height - margins.top - margins.bottom;

  // Line height calculation - use ratio relative to 8.5mm baseline (like original handwritingSynthesis)
  // baseCharacteristics.lineSpacing is in mm, 8.5mm is the standard baseline
  const lineSpacingRatio = baseCharacteristics
    ? baseCharacteristics.lineSpacing / 8.5
    : 1.0;
  const baseLineHeight = settings.handwritingSize === 'small' ? 28 : settings.handwritingSize === 'large' ? 36 : 32;
  const lineHeight = baseLineHeight * options.spacingMultiplier * settings.lineSpacing * lineSpacingRatio;

  // Calculate max lines per page
  const maxLinesPerPage = Math.floor(contentHeight / lineHeight);

  const pages: string[] = [];
  let currentPageContent = '';
  let currentLineCount = 0;
  let isFirstPage = true;

  // Add title on first page - SANITIZED
  if (isFirstPage) {
    const safeTitle = sanitizeTitle(assignment.title);
    currentPageContent += `<h1 class="assignment-title">${safeTitle}</h1>`;
    currentLineCount += 2;
    isFirstPage = false;
  }

  questions.forEach((question, qIndex) => {
    const answer = answers.find(a => a.questionId === question.id);
    const answerContent: string = answer?.editedContent || answer?.content || (answer as any)?.text || '';
    const answerLength = answer?.length || 'detailed';

    // Estimate lines for question
    const questionLines = Math.ceil(question.text.length / 80) + 1;

    // Estimate lines for answer based on length
    const answerLineEstimates = { short: 3, medium: 6, detailed: 12 };
    const answerLines = answerLineEstimates[answerLength] * (answerContent.length / 200);

    const totalBlockLines = questionLines + answerLines + 2; // +2 for spacing

    // Check if we need a new page based on questionStartMode
    const needsNewPage =
      (settings.questionStartMode === 'new-page' && !isFirstPage) ||
      (settings.questionStartMode === 'new-line' && currentLineCount + questionLines > maxLinesPerPage) ||
      (currentLineCount + totalBlockLines > maxLinesPerPage);

    if (needsNewPage && currentPageContent) {
      pages.push(currentPageContent);
      currentPageContent = '';
      currentLineCount = 0;
    }

    // Build question block - SANITIZED
    let blockHtml = '<div class="question-block">';

    const safeQuestionText = sanitizeQuestionAnswer(question.text);

    if (settings.showQuestionNumbers) {
      blockHtml += `<p class="question-text"><span class="question-number">Q${qIndex + 1}:</span> ${safeQuestionText}</p>`;
    } else {
      blockHtml += `<p class="question-text">${safeQuestionText}</p>`;
    }

    if (answerContent) {
      const alignmentClass = options.paragraphAlignment === 'center' ? 'paragraph-center' :
                             options.paragraphAlignment === 'justify' ? 'paragraph-justify' : 'paragraph-left';

      // Split answer into lines BEFORE sanitization (since sanitizeQuestionAnswer converts \n to <br>)
      const rawAnswerLines = answerContent.split('\n').filter(l => l.trim().length > 0);

      // Sanitize each line individually
      const safeAnswerLines = rawAnswerLines.map(line => sanitizeQuestionAnswer(line));
      const safeAnswerContent = safeAnswerLines.join('\n'); // Keep \n for single-line path

      if (options.lineVariation && safeAnswerLines.length > 1) {
        // Apply per-line variations
        const variedLines = generateLineVariations(
          safeAnswerLines,
          qIndex * 10000 + answerContent.length,
          options,
          baseCharacteristics
        );
        blockHtml += `<div class="answer-text handwriting-text ${alignmentClass}">${variedLines.join('')}</div>`;
      } else if (options.wordVariation || options.lineVariation) {
        // Apply per-word/character variations to single line
        const variedContent = generateWordVariations(
          safeAnswerContent,
          qIndex * 10000 + answerContent.length,
          options,
          baseCharacteristics
        );
        blockHtml += `<div class="answer-text handwriting-text ${alignmentClass}">${variedContent}</div>`;
      } else {
        // No variation - use simple rendering
        blockHtml += `<div class="answer-text handwriting-text ${alignmentClass}">${safeAnswerContent}</div>`;
      }
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
  assignment: Assignment,
  questions: Question[],
  answers: Answer[],
  options: RealisticHandwritingOptions,
  settings: AssignmentSettings,
  baseCharacteristics?: HandwritingCharacteristics
): RenderedAssignment {
  const pageSize = assignment.pageSize || 'A4';
  const paperStyle = assignment.paperStyle || 'ruled';
  const pageContents = buildRealisticAssignmentContent(assignment, questions, answers, settings, options, baseCharacteristics);

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
 * Generate a single consolidated HTML for all pages (for preview/print)
 */
export function generateRealisticFullHTML(
  assignment: Assignment,
  questions: Question[],
  answers: Answer[],
  options: RealisticHandwritingOptions,
  settings: AssignmentSettings,
  baseCharacteristics?: HandwritingCharacteristics
): string {
  const pageContents = buildRealisticAssignmentContent(assignment, questions, answers, settings, options, baseCharacteristics);
  const pageSize = assignment.pageSize || 'A4';
  const dims = PAGE_DIMENSIONS[pageSize];
  const margins = settings.margins;
  const paperStyle = assignment.paperStyle || 'ruled';

  const css = generateRealisticHandwritingCSS(options, settings, baseCharacteristics);

  // Analyzed margins for full HTML
  const analyzedMargins = baseCharacteristics ? {
    top: baseCharacteristics.pageMargins.top * 3.78,
    right: baseCharacteristics.pageMargins.right * 3.78,
    bottom: baseCharacteristics.pageMargins.bottom * 3.78,
    left: baseCharacteristics.pageMargins.left * 3.78,
  } : {
    top: ANALYZED_CHARACTERISTICS.margins.top,
    right: ANALYZED_CHARACTERISTICS.margins.right,
    bottom: ANALYZED_CHARACTERISTICS.margins.bottom,
    left: ANALYZED_CHARACTERISTICS.margins.left,
  };

  const finalMargins = {
    top: margins.top * 0.5 + analyzedMargins.top * 0.5,
    right: margins.right * 0.5 + analyzedMargins.right * 0.5,
    bottom: margins.bottom * 0.5 + analyzedMargins.bottom * 0.5,
    left: margins.left * 0.5 + analyzedMargins.left * 0.5,
  };

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
          padding: ${finalMargins.top}px ${finalMargins.right}px ${finalMargins.bottom}px ${finalMargins.left}px;
          background: white;
          margin: 0 auto 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .paper-${paperStyle} { background-color: white; }
        ${css}
        .assignment-title {
          font-family: ${options.style === 'print' ? "'Instrument Serif', Georgia, serif" : "'Realistic Cursive', cursive"};
          font-size: ${24 * options.sizeMultiplier}px;
          font-weight: 600;
          color: ${PEN_COLORS[options.penColor].color};
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
          color: ${PEN_COLORS[options.penColor].color}80;
        }
        .paragraph-left { text-align: left; }
        .paragraph-center { text-align: center; }
        .paragraph-justify { text-align: justify; }
        @media print {
          body { background: white; padding: 0; }
          .page-container { margin: 0; box-shadow: none; page-break-after: always; }
        }
      </style>
    </head>
    <body>
  `;

  pageContents.forEach((content, index) => {
    const safeTitle = sanitizeTitle(assignment.title);
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

/**
 * Create default realistic handwriting options
 */
export function createDefaultRealisticOptions(
  style: RealisticStyle = 'cursive',
  penColor: PenColor = 'blue'
): RealisticHandwritingOptions {
  return {
    style,
    penColor,
    sizeMultiplier: 1.0,
    spacingMultiplier: 1.0,
    thicknessMultiplier: 1.0,
    variationLevel: 'medium',
    paperStyle: 'ruled',
    margins: { top: 80, right: 60, bottom: 80, left: 60 },
    paragraphAlignment: 'left',
    lineVariation: true,
    wordVariation: true,
  };
}

/**
 * Validate realistic handwriting options
 */
export function validateRealisticOptions(options?: Partial<RealisticHandwritingOptions>): RealisticHandwritingOptions {
  const defaults = createDefaultRealisticOptions();
  if (!options) return defaults;

  const styleAliases: Record<string, RealisticStyle> = {
    casual: 'cursive',
    formal: 'print',
    handwritten: 'cursive',
    script: 'cursive',
    standard: 'print',
  };

  const rawStyle = String(options.style || '').toLowerCase();
  const validStyles: RealisticStyle[] = ['cursive', 'print', 'mixed', 'calligraphy'];
  let style: RealisticStyle = defaults.style;
  if (styleAliases[rawStyle]) {
    style = styleAliases[rawStyle];
  } else if (validStyles.includes(rawStyle as RealisticStyle)) {
    style = rawStyle as RealisticStyle;
  }

  const validPenColors: PenColor[] = ['blue', 'black'];
  const rawPenColor = String(options.penColor || '').toLowerCase();
  const penColor: PenColor = validPenColors.includes(rawPenColor as PenColor)
    ? (rawPenColor as PenColor)
    : defaults.penColor;

  const validVariations = ['low', 'medium', 'high'] as const;
  const rawVariation = String(options.variationLevel || '').toLowerCase();
  const variationLevel = (validVariations as readonly string[]).includes(rawVariation)
    ? (rawVariation as 'low' | 'medium' | 'high')
    : defaults.variationLevel;

  const validPaperStyles: PaperStyle[] = ['ruled', 'plain', 'grid', 'custom'];
  const rawPaper = String(options.paperStyle || '').toLowerCase();
  const paperStyle: PaperStyle = validPaperStyles.includes(rawPaper as PaperStyle)
    ? (rawPaper as PaperStyle)
    : defaults.paperStyle;

  return {
    style,
    penColor,
    sizeMultiplier: Math.max(0.5, Math.min(2, typeof options.sizeMultiplier === 'number' && !isNaN(options.sizeMultiplier) ? options.sizeMultiplier : defaults.sizeMultiplier)),
    spacingMultiplier: Math.max(0.5, Math.min(2, typeof options.spacingMultiplier === 'number' && !isNaN(options.spacingMultiplier) ? options.spacingMultiplier : defaults.spacingMultiplier)),
    thicknessMultiplier: Math.max(0.3, Math.min(3, typeof options.thicknessMultiplier === 'number' && !isNaN(options.thicknessMultiplier) ? options.thicknessMultiplier : defaults.thicknessMultiplier)),
    variationLevel,
    paperStyle,
    margins: options.margins || defaults.margins,
    paragraphAlignment: options.paragraphAlignment || defaults.paragraphAlignment,
    lineVariation: options.lineVariation ?? defaults.lineVariation,
    wordVariation: options.wordVariation ?? defaults.wordVariation,
  };
}

export { STYLE_FONTS, PEN_COLORS, PAPER_PATTERNS, VARIATION_CONFIG, ANALYZED_CHARACTERISTICS };