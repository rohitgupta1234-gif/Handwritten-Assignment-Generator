import { useMemo, useState, useEffect } from 'react';
import { Maximize2, Minimize2, Download, Printer, RotateCcw, ZoomIn, ZoomOut, FileText } from 'lucide-react';
import { Question, Answer, AssignmentSettings, RealisticHandwritingOptions, HandwritingCharacteristics, GeneratedPage, PaperStyle } from '../types';
import { generateRealisticFullHTML, generateRealisticHandwrittenPages } from '../utils/realisticHandwritingPreview';
import { generateHandwrittenPages, generateFullHTML } from '../utils/handwritingSynthesisPreview';

interface HandwritingPreviewProps {
  // Optional assignment for backward compatibility (local preview)
  assignment?: {
    id: string;
    title: string;
    paperStyle: PaperStyle;
    pageSize: 'A4' | 'A5' | 'Letter' | 'Legal' | 'Custom';
  } | null;
  questions: Question[];
  answers: Answer[];
  settings: AssignmentSettings;
  mode: 'personal' | 'realistic';
  realisticOptions?: RealisticHandwritingOptions;
  profileCharacteristics?: HandwritingCharacteristics | null;
  generatedPages?: GeneratedPage[];
  title?: string;
  paperStyle?: PaperStyle;
  pageSize?: 'A4' | 'A5' | 'Letter' | 'Legal' | 'Custom';
  className?: string;
  onDownloadPDF?: () => void;
  onDownloadDOCX?: () => void;
  onPrint?: () => void;
}

export function HandwritingPreview({
  assignment,
  questions,
  answers,
  settings,
  mode,
  realisticOptions,
  profileCharacteristics,
  generatedPages = [],
  title,
  paperStyle = 'ruled',
  pageSize = 'A4',
  className = '',
  onDownloadPDF,
  onDownloadDOCX,
  onPrint,
}: HandwritingPreviewProps) {
  const [scale, setScale] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  // Get display title and paper style from props or assignment
  const displayTitle = title || assignment?.title || 'Assignment Preview';
  const displayPaperStyle = paperStyle || assignment?.paperStyle || 'ruled';
  const displayPageSize = pageSize || assignment?.pageSize || 'A4';

  const previewHtml = useMemo(() => {
    // If we have generated pages from the backend, use those
    if (generatedPages && generatedPages.length > 0) {
      // Build full HTML from generated pages
      const dims = { width: 794, height: 1123 }; // A4 default
      const margins = settings.margins;

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
            .paper-${displayPaperStyle} { background-color: white; }
          </style>
        </head>
        <body>
      `;

      generatedPages.forEach((page) => {
        fullHtml += `
          <div class="page-container paper-${displayPaperStyle}">
            ${page.htmlContent}
          </div>
        `;
      });

      fullHtml += '</body></html>';
      return fullHtml;
    }

    // Fallback to local preview generation
    if ((!assignment && questions.length === 0) || (!assignment && !generatedPages)) return null;

    // Create a minimal assignment object for local preview functions
    const localAssignment = assignment || {
      id: 'preview',
      title: displayTitle,
      paperStyle: displayPaperStyle,
      pageSize: displayPageSize,
    };

    if (mode === 'realistic' && realisticOptions) {
      return generateRealisticFullHTML(
        localAssignment,
        questions,
        answers,
        realisticOptions,
        settings,
        profileCharacteristics || undefined
      );
    } else if (mode === 'personal' && profileCharacteristics) {
      return generateFullHTML(
        localAssignment,
        questions,
        answers,
        { characteristics: profileCharacteristics },
        settings
      );
    }
    return null;
  }, [assignment, questions, answers, settings, mode, realisticOptions, profileCharacteristics, generatedPages, displayTitle, displayPaperStyle, displayPageSize]);

  const pageCount = useMemo(() => {
    if (generatedPages && generatedPages.length > 0) {
      return generatedPages.length;
    }
    if ((!assignment && questions.length === 0) || (!assignment && !generatedPages)) return 0;

    // Create a minimal assignment object for local preview functions
    const localAssignment = assignment || {
      id: 'preview',
      title: displayTitle,
      paperStyle: displayPaperStyle,
      pageSize: displayPageSize,
    };

    if (mode === 'realistic' && realisticOptions) {
      const result = generateRealisticHandwrittenPages(
        localAssignment,
        questions,
        answers,
        realisticOptions,
        settings,
        profileCharacteristics || undefined
      );
      return result.totalPages;
    } else if (mode === 'personal' && profileCharacteristics) {
      const result = generateHandwrittenPages(
        localAssignment,
        questions,
        answers,
        { characteristics: profileCharacteristics },
        settings
      );
      return result.totalPages;
    }
    return 0;
  }, [assignment, questions, answers, settings, mode, realisticOptions, profileCharacteristics, generatedPages, displayTitle, displayPaperStyle, displayPageSize]);

  const handleZoomIn = () => setScale(prev => Math.min(2, prev + 0.1));
  const handleZoomOut = () => setScale(prev => Math.max(0.3, prev - 0.1));
  const handleResetZoom = () => setScale(1);

  const handleFullscreenChange = () => {
    setFullscreen(prev => !prev);
    if (!fullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  };

  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!assignment || questions.length === 0) {
    return (
      <div className={`handwriting-preview ${className} empty`}>
        <div className="preview-placeholder">
          <div className="placeholder-icon">📝</div>
          <h3>No Preview Available</h3>
          <p>Add questions and generate answers to see a live preview of your handwritten assignment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`handwriting-preview ${className} ${fullscreen ? 'fullscreen' : ''}`}>
      {/* Toolbar */}
      <div className="preview-toolbar">
        <div className="toolbar-left">
          <h3 className="preview-title">{displayTitle}</h3>
          <span className="preview-mode">{mode === 'personal' ? '👤 Personal' : '✨ Realistic'}</span>
          {pageCount > 1 && (
            <div className="page-nav">
              <button
                className="nav-btn"
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0}
              >
                ← Prev
              </button>
              <span className="page-indicator">
                Page {currentPage + 1} of {pageCount}
              </span>
              <button
                className="nav-btn"
                onClick={() => setCurrentPage(p => Math.min(pageCount - 1, p + 1))}
                disabled={currentPage >= pageCount - 1}
              >
                Next →
              </button>
            </div>
          )}
        </div>
        <div className="toolbar-right">
          <div className="zoom-control">
            <button className="tool-btn" onClick={handleZoomOut} title="Zoom out" disabled={scale <= 0.3}>
              <ZoomOut size={16} />
            </button>
            <span className="zoom-level">{Math.round(scale * 100)}%</span>
            <button className="tool-btn" onClick={handleZoomIn} title="Zoom in" disabled={scale >= 2}>
              <ZoomIn size={16} />
            </button>
            <button className="tool-btn" onClick={handleResetZoom} title="Reset zoom">
              <RotateCcw size={16} />
            </button>
          </div>
          <button className="tool-btn" onClick={onDownloadPDF} title="Download PDF">
            <Download size={16} />
          </button>
          <button className="tool-btn" onClick={onDownloadDOCX} title="Download DOCX">
            <FileText size={16} />
          </button>
          <button className="tool-btn" onClick={onPrint} title="Print">
            <Printer size={16} />
          </button>
          <button className="tool-btn" onClick={handleFullscreenChange} title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Preview Content */}
      <div
        className="preview-container"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          width: `${100 / scale}%`,
        }}
      >
        {previewHtml && (
          <iframe
            className="preview-iframe"
            srcDoc={previewHtml}
            sandbox="allow-same-origin"
            title="Handwriting Preview"
          />
        )}
      </div>

      {fullscreen && (
        <button className="fullscreen-exit-hint" onClick={handleFullscreenChange}>
          Press ESC or click to exit fullscreen
        </button>
      )}
    </div>
  );
}