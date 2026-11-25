import puppeteer, { Browser, Page } from 'puppeteer';
import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';
import { Assignment, Question, Answer, AssignmentSettings, HandwritingCharacteristics, PageSize, PAGE_DIMENSIONS } from '../types';
import { generateFullHTML, HandwritingPage, generateHandwrittenPages } from './handwritingSynthesis';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

interface PDFExportOptions {
  assignment: Assignment;
  questions: Question[];
  answers: Answer[];
  handwritingProfile: { characteristics: HandwritingCharacteristics };
  settings: AssignmentSettings;
}

// Browser pool management for better memory handling
interface BrowserPool {
  browser: Browser;
  pageCount: number;
  createdAt: number;
}

const browserPool: BrowserPool[] = [];
const MAX_PAGES_PER_BROWSER = 50; // Restart browser after this many pages to prevent memory leaks
const MAX_BROWSER_AGE_MS = 10 * 60 * 1000; // 10 minutes max browser lifetime
const MAX_CONCURRENT_BROWSERS = 2;

// Ensure browsers are closed on process exit
process.on('exit', () => {
  closeAllBrowsers().catch(() => {});
});

process.on('SIGINT', async () => {
  await closeAllBrowsers();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeAllBrowsers();
  process.exit(0);
});

/**
 * Detect if running in a container environment
 */
function isRunningInContainer(): boolean {
  return fs.existsSync('/.dockerenv') ||
         process.env.CONTAINER === 'true' ||
         process.env.KUBERNETES_SERVICE_HOST !== undefined;
}

/**
 * Create a new browser instance with optimized settings
 */
async function createBrowser(): Promise<Browser> {
  const inContainer = isRunningInContainer();
  const isWindows = process.platform === 'win32';
  const args = [
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--no-first-run',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-features=TranslateUI',
    '--disable-ipc-flooding-protection',
  ];

  // Disable sandbox in container environments or on Windows
  if (inContainer || isWindows) {
    args.push('--no-sandbox', '--disable-setuid-sandbox');
    logger.info('Sandbox disabled for environment compatibility');
  } else {
    logger.info('Running on bare metal, sandbox enabled');
  }

  const browser = await puppeteer.launch({
    headless: true,
    args,
  });

  // Handle browser disconnect
  browser.on('disconnected', () => {
    const index = browserPool.findIndex(b => b.browser === browser);
    if (index !== -1) {
      browserPool.splice(index, 1);
    }
  });

  return browser;
}

/**
 * Get or create a browser from the pool
 */
export async function getBrowser(): Promise<Browser> {
  // Clean up old/stale browsers
  const now = Date.now();
  for (let i = browserPool.length - 1; i >= 0; i--) {
    const pool = browserPool[i];
    if (!pool.browser.isConnected() ||
        pool.pageCount >= MAX_PAGES_PER_BROWSER ||
        now - pool.createdAt > MAX_BROWSER_AGE_MS) {
      try {
        await pool.browser.close();
      } catch (e) {
        // Ignore errors during cleanup
      }
      browserPool.splice(i, 1);
    }
  }

  // Find available browser with capacity
  for (const pool of browserPool) {
    if (pool.browser.isConnected() && pool.pageCount < MAX_PAGES_PER_BROWSER) {
      pool.pageCount++;
      return pool.browser;
    }
  }

  // Create new browser if under limit
  if (browserPool.length < MAX_CONCURRENT_BROWSERS) {
    const browser = await createBrowser();
    browserPool.push({ browser, pageCount: 1, createdAt: Date.now() });
    return browser;
  }

  // Wait for a browser to become available (with timeout)
  const startTime = Date.now();
  while (Date.now() - startTime < 30000) { // 30 second timeout
    for (const pool of browserPool) {
      if (pool.browser.isConnected() && pool.pageCount < MAX_PAGES_PER_BROWSER) {
        pool.pageCount++;
        return pool.browser;
      }
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Fallback: create emergency browser
  logger.warn('Browser pool exhausted, creating emergency browser');
  const browser = await createBrowser();
  browserPool.push({ browser, pageCount: 1, createdAt: Date.now() });
  return browser;
}

/**
 * Release a browser back to the pool (decrement page count)
 */
export function releaseBrowser(browser: Browser): void {
  const pool = browserPool.find(b => b.browser === browser);
  if (pool) {
    pool.pageCount = Math.max(0, pool.pageCount - 1);
  }
}

/**
 * Close all browsers in the pool
 */
export async function closeAllBrowsers(): Promise<void> {
  for (const pool of browserPool) {
    try {
      await pool.browser.close();
    } catch (e) {
      logger.error('Error closing browser:', e);
    }
  }
  browserPool.length = 0;
}

/**
 * Close browser instance (legacy function, now uses pool)
 */
export async function closeBrowser(): Promise<void> {
  await closeAllBrowsers();
}

/**
 * Get browser pool stats for monitoring
 */
export function getBrowserPoolStats(): {
  activeBrowsers: number;
  totalPagesRendered: number;
  browsers: Array<{ pageCount: number; age: number; connected: boolean }>
} {
  const now = Date.now();
  return {
    activeBrowsers: browserPool.length,
    totalPagesRendered: browserPool.reduce((sum, b) => sum + b.pageCount, 0),
    browsers: browserPool.map(b => ({
      pageCount: b.pageCount,
      age: now - b.createdAt,
      connected: b.browser.isConnected(),
    })),
  };
}

/**
 * Generate PDF from handwritten assignment using headless browser
 * This renders each page separately for reliable multi-page capture,
 * then embeds them in a PDF for perfect visual fidelity.
 */
export async function generateAssignmentPDF(options: PDFExportOptions): Promise<Buffer> {
  const { assignment, questions, answers, handwritingProfile, settings } = options;

  // Generate individual handwritten pages
  const { pages } = generateHandwrittenPages(assignment, questions, answers, handwritingProfile, settings);

  // Get page dimensions
  const pageSize = assignment.pageSize || 'A4';
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
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'HandwriteAI Handwriting', cursive; background: white; }
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

  // Generate PDF with embedded images
  return await generatePDFFromImages(pageImages, dims, assignment.title, settings);
}

/**
 * Generate PDF by embedding page images
 */
async function generatePDFFromImages(
  pageImages: Buffer[],
  dims: { width: number; height: number },
  title: string,
  settings: AssignmentSettings
): Promise<Buffer> {
  const doc = new PDFDocument({
    size: [dims.width, dims.height],
    margin: 0,
    info: {
      Title: title,
      Author: 'AI Handwritten Assignment Generator',
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

    pageImages.forEach((imageBuffer, index) => {
      if (index > 0) {
        doc.addPage({ size: [dims.width, dims.height], margin: 0 });
      }

      // Embed the page image to fill the entire page
      doc.image(imageBuffer, 0, 0, {
        width: dims.width,
        height: dims.height,
      });

      // Add page number if enabled
      if (settings.showPageNumbers) {
        doc.save();
        doc.fontSize(10).fillColor('#93c5fd');
        doc.text(
          `Page ${index + 1} of ${pageImages.length}`,
          dims.width - 100,
          dims.height - 40,
          { width: 80, align: 'right' }
        );
        doc.restore();
      }
    });

    doc.end();
  });
}

/**
 * Alternative: Generate PDF directly from HTML using Puppeteer's PDF generation
 * This can be used for simpler cases but may not handle complex CSS as well
 */
export async function generateAssignmentPDFDirect(
  html: string,
  pageSize: PageSize = 'A4',
  settings: AssignmentSettings = {
    handwritingSize: 'medium',
    lineSpacing: 1,
    wordSpacing: 1,
    characterSpacing: 1,
    margins: { top: 80, right: 60, bottom: 80, left: 60 },
    penThickness: 1,
    questionStartMode: 'continuous',
    showQuestionNumbers: true,
    showPageNumbers: true,
  }
): Promise<Buffer> {
  const dims = PAGE_DIMENSIONS[pageSize];
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewport({
      width: dims.width,
      height: dims.height,
      deviceScaleFactor: 2,
    });

    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    await page.evaluateHandle('document.fonts.ready');

    // Generate PDF directly from Puppeteer
    const pdfBuffer = await page.pdf({
      width: `${dims.width}px`,
      height: `${dims.height}px`,
      margin: {
        top: `${settings.margins.top}px`,
        right: `${settings.margins.right}px`,
        bottom: `${settings.margins.bottom}px`,
        left: `${settings.margins.left}px`,
      },
      printBackground: true,
      preferCSSPageSize: true,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
}

/**
 * Generate PDF by rendering each page separately and combining
 * This provides better control over page breaks and margins
 */
export async function generateAssignmentPDFPaged(
  pages: HandwritingPage[],
  pageSize: PageSize = 'A4',
  settings: AssignmentSettings = {
    handwritingSize: 'medium',
    lineSpacing: 1,
    wordSpacing: 1,
    characterSpacing: 1,
    margins: { top: 80, right: 60, bottom: 80, left: 60 },
    penThickness: 1,
    questionStartMode: 'continuous',
    showQuestionNumbers: true,
    showPageNumbers: true,
  },
  title: string = 'Assignment'
): Promise<Buffer> {
  const dims = PAGE_DIMENSIONS[pageSize];
  const browser = await getBrowser();

  const pageImages: Buffer[] = [];

  for (let i = 0; i < pages.length; i++) {
    const page = await browser.newPage();

    try {
      await page.setViewport({
        width: dims.width * 2,
        height: dims.height * 2,
        deviceScaleFactor: 2,
      });

      // Create HTML for single page (using local font fallbacks)
      const pageHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'HandwriteAI Handwriting', cursive; background: white; }
            .page-container {
              width: ${dims.width}px;
              height: ${dims.height}px;
              position: relative;
              background: white;
            }
            ${pages[i].content.match(/<style>([\s\S]*?)<\/style>/)?.[1] || ''}
          </style>
        </head>
        <body>
          <div class="page-container">
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

      await page.evaluateHandle('document.fonts.ready');
      await new Promise(resolve => setTimeout(resolve, 200));

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

  return await generatePDFFromImages(pageImages, dims, title, settings);
}

export { PDFExportOptions };