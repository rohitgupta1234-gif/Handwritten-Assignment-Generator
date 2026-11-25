import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { marked } from 'marked';

/**
 * Server-side HTML sanitization using DOMPurify with JSDOM
 * Removes all potentially dangerous HTML/JS content while preserving safe formatting
 */

// Create a virtual DOM for DOMPurify to work in Node.js
const window = new JSDOM('').window;
const purify = DOMPurify(window);

// Configure marked for safe parsing
marked.setOptions({
  breaks: true, // Convert \n to <br>
  gfm: true,    // GitHub Flavored Markdown
});

// Sanitization configuration
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'span', 'div',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'blockquote', 'pre', 'code',
    'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'hr',
    // MathML tags for LaTeX rendering
    'math', 'mi', 'mn', 'mo', 'ms', 'mtext', 'mrow', 'mfrac', 'msqrt', 'mroot',
    'mstyle', 'merror', 'mphantom', 'mfenced', 'menclose', 'msub', 'msup',
    'msubsup', 'munder', 'mover', 'munderover', 'mmultiscripts', 'mtable',
    'mtr', 'mtd', 'mlabeledtr', 'maligngroup', 'malignmark',
  ],
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title', 'class', 'id',
    'style', 'width', 'height', 'align',
    'colspan', 'rowspan',
    // MathML attributes
    'mathcolor', 'mathbackground', 'mathsize', 'mathvariant',
    'displaystyle', 'scriptlevel', 'lspace', 'rspace',
    'columnalign', 'rowalign', 'columnspan', 'rowspan',
    'fence', 'separator', 'notation', 'linethickness',
    'edge', 'minlabelspacing', 'fontfamily', 'fontweight',
    'fontstyle', 'fontsize', 'color', 'background',
  ],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
  KEEP_CONTENT: true,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_TRUSTED_TYPE: false,
  SANITIZE_DOM: true,
};

/**
 * Extract LaTeX math expressions from text and replace with placeholders
 * Returns the text with placeholders and a map of placeholders to original LaTeX
 * Uses {{...}} format to avoid conflicts with markdown syntax
 */
function extractLatexMath(text: string): { text: string; latexMap: Map<string, string> } {
  const latexMap = new Map<string, string>();
  let processedText = text;
  let placeholderIndex = 0;

  // Match $$...$$ (display math) first
  const displayMathRegex = /\$\$(.+?)\$\$/gs;
  let match;
  while ((match = displayMathRegex.exec(text)) !== null) {
    const placeholder = `{{LATEX_DISPLAY_${placeholderIndex}}}`;
    latexMap.set(placeholder, match[0]); // Store full $$...$$
    processedText = processedText.replace(match[0], placeholder);
    placeholderIndex++;
  }

  // Match $...$ (inline math) - but not already processed $$...$$
  const inlineMathRegex = /\$(.+?)\$/gs;
  while ((match = inlineMathRegex.exec(text)) !== null) {
    // Check if this is already part of a display math expression
    const fullMatch = match[0];
    if (!processedText.includes(fullMatch)) continue;
    const placeholder = `{{LATEX_INLINE_${placeholderIndex}}}`;
    latexMap.set(placeholder, fullMatch); // Store full $...$
    processedText = processedText.replace(fullMatch, placeholder);
    placeholderIndex++;
  }

  return { text: processedText, latexMap };
}

/**
 * Restore LaTeX math expressions from placeholders
 */
function restoreLatexMath(text: string, latexMap: Map<string, string>): string {
  let result = text;
  for (const [placeholder, latex] of latexMap.entries()) {
    // Wrap in a span with class for MathJax/KaTeX rendering
    if (latex.startsWith('$$') && latex.endsWith('$$')) {
      // Display math
      const content = latex.slice(2, -2);
      result = result.replace(placeholder, `<span class="math-display" data-latex="${escapeHtml(content)}">\\[${content}\\]</span>`);
    } else if (latex.startsWith('$') && latex.endsWith('$')) {
      // Inline math
      const content = latex.slice(1, -1);
      result = result.replace(placeholder, `<span class="math-inline" data-latex="${escapeHtml(content)}">\\(${content}\\)</span>`);
    }
  }
  return result;
}

export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }
  return purify.sanitize(html, SANITIZE_CONFIG);
}

export function escapeHtml(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  return text
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
}

/**
 * Convert plain text to HTML with Markdown support and LaTeX math preservation
 */
export function sanitizeTextToHtml(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Step 1: Extract LaTeX math expressions
  const { text: textWithoutLatex, latexMap } = extractLatexMath(text);

  // Step 2: Parse Markdown to HTML
  let html = marked.parse(textWithoutLatex) as string;

  // Step 3: Restore LaTeX math expressions
  html = restoreLatexMath(html, latexMap);

  // Step 4: Sanitize with DOMPurify
  return purify.sanitize(html, SANITIZE_CONFIG);
}

export function sanitizeTitle(title: string): string {
  return escapeHtml(title).trim();
}

export function sanitizeQuestionAnswer(text: string): string {
  return sanitizeTextToHtml(text);
}

export function sanitizePaperStyle(style: string): 'ruled' | 'plain' | 'grid' {
  const validStyles = ['ruled', 'plain', 'grid'] as const;
  return validStyles.includes(style as any) ? style as 'ruled' | 'plain' | 'grid' : 'ruled';
}

export function sanitizePageSize(size: string): 'A4' | 'A5' | 'Letter' | 'Legal' {
  const validSizes = ['A4', 'A5', 'Letter', 'Legal'] as const;
  return validSizes.includes(size as any) ? size as 'A4' | 'A5' | 'Letter' | 'Legal' : 'A4';
}