import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Edit,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileText,
  X,
  Settings,
  Printer,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Dropdown, DropdownOption } from '../components/ui/Dropdown';
import { Tooltip } from '../components/ui/Tooltip';
import { Select, Textarea } from '../components/ui/Input';
import { SubjectIcon } from '../components/ui/SubjectIcon';
import { getSubjectColor } from '../utils/helpers';
import { Assignment, HandwritingPage } from '../types';
import { toast } from 'react-hot-toast';
import api, { apiEndpoints } from '../utils/api';
import { sanitizeHtml } from '../utils/sanitize';

/**
 * Parse the full HTML from preview endpoint to extract individual pages
 * More robust implementation with multiple fallback strategies
 */
function parsePreviewHtml(html: string): HandwritingPage[] {
  const pages: HandwritingPage[] = [];
  const DEFAULT_WIDTH = 794;
  const DEFAULT_HEIGHT = 1123;

  try {
    // Create a temporary DOM parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Check for parsing errors
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      console.warn('HTML parsing warning:', parserError.textContent);
    }

    // Strategy 1: Look for page-container elements (primary method)
    const pageContainers = doc.querySelectorAll('.page-container');

    if (pageContainers.length > 0) {
      pageContainers.forEach((container, index) => {
        const pageNumber = index + 1;
        const content = container.innerHTML;

        // Extract dimensions from the container style or use defaults
        const element = container as HTMLElement;
        const width = extractDimension(element.style.width) || DEFAULT_WIDTH;
        const height = extractDimension(element.style.height) || DEFAULT_HEIGHT;

        pages.push({
          pageNumber,
          content: sanitizePageContent(content),
          height,
          width,
          elements: [],
        });
      });
    } else {
      // Strategy 2: Look for elements with page-break-after or page class
      const pageElements = doc.querySelectorAll('[style*="page-break-after"], .page, [data-page]');

      if (pageElements.length > 0) {
        pageElements.forEach((element, index) => {
          const pageNumber = index + 1;
          const content = element.innerHTML;
          const htmlElement = element as HTMLElement;

          const width = extractDimension(htmlElement.style.width) || DEFAULT_WIDTH;
          const height = extractDimension(htmlElement.style.height) || DEFAULT_HEIGHT;

          pages.push({
            pageNumber,
            content: sanitizePageContent(content),
            height,
            width,
            elements: [],
          });
        });
      } else {
        // Strategy 3: Split by explicit page break markers or use body content
        const bodyContent = doc.body?.innerHTML || '';

        // Check if content has explicit page separators
        const pageSeparators = bodyContent.match(/<div class="page-break"[^>]*>|<hr[^>]*class="page-break"[^>]*>/gi);

        if (pageSeparators && pageSeparators.length > 0) {
          // Split by page separators
          const pageContents = bodyContent.split(/<div class="page-break"[^>]*>|<hr[^>]*class="page-break"[^>]*>/i);

          pageContents.forEach((content, index) => {
            if (content.trim()) {
              pages.push({
                pageNumber: index + 1,
                content: sanitizePageContent(content),
                height: DEFAULT_HEIGHT,
                width: DEFAULT_WIDTH,
                elements: [],
              });
            }
          });
        } else {
          // Strategy 4: Treat entire body as single page
          pages.push({
            pageNumber: 1,
            content: sanitizePageContent(bodyContent),
            height: DEFAULT_HEIGHT,
            width: DEFAULT_WIDTH,
            elements: [],
          });
        }
      }
    }
  } catch (error) {
    console.error('Failed to parse preview HTML:', error);
    // Fallback: return empty page
    pages.push({
      pageNumber: 1,
      content: '<p class="text-center text-red-500 p-8">Failed to parse assignment preview</p>',
      height: DEFAULT_HEIGHT,
      width: DEFAULT_WIDTH,
      elements: [],
    });
  }

  // Ensure at least one page
  if (pages.length === 0) {
    pages.push({
      pageNumber: 1,
      content: '<p class="text-center text-gray-500 p-8">No content available</p>',
      height: DEFAULT_HEIGHT,
      width: DEFAULT_WIDTH,
      elements: [],
    });
  }

  return pages;
}

/**
 * Extract numeric dimension from CSS value (e.g., "794px" -> 794)
 */
function extractDimension(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.match(/^(\d+(?:\.\d+)?)px?$/i);
  return match ? parseFloat(match[1]) : null;
}

/**
 * Sanitize page content to remove unwanted elements
 */
function sanitizePageContent(content: string): string {
  // Remove script tags and their content
  content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove style tags (we'll use our own styles)
  content = content.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove any parser error elements
  content = content.replace(/<parsererror\b[^<]*(?:(?!<\/parsererror>)<[^<]*)*<\/parsererror>/gi, '');

  // Remove empty page-number divs (we'll add our own)
  content = content.replace(/<div class="page-number"[^>]*>.*?<\/div>/gi, '');

  return content.trim();
}

export function AssignmentPreviewPage() {
  const [searchParams] = useSearchParams();
  const routeParams = useParams();
  const navigate = useNavigate();
  const assignmentId = searchParams.get('id') || routeParams.id;

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [pages, setPages] = useState<HandwritingPage[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAnswer, setEditingAnswer] = useState<{ answerId: string; content: string } | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingDocx, setIsGeneratingDocx] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const previewRef = useRef<HTMLDivElement>(null);

  // Settings
  const [previewSettings, setPreviewSettings] = useState({
    handwritingSize: 'medium' as 'small' | 'medium' | 'large',
    showQuestionNumbers: true,
    showPageNumbers: true,
    paperStyle: 'ruled' as 'ruled' | 'plain' | 'grid',
  });

  useEffect(() => {
    const loadAssignment = async () => {
      if (!assignmentId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Fetch assignment details
        const assignmentResponse = await api.get(apiEndpoints.assignments.get(assignmentId));
        const assignmentData = assignmentResponse.data.assignment || assignmentResponse.data;
        setAssignment(assignmentData);

        // Fetch preview HTML
        const previewResponse = await api.get(apiEndpoints.assignments.preview(assignmentId), {
          responseType: 'text',
        });
        const fullHtml = previewResponse.data;
        const parsedPages = parsePreviewHtml(fullHtml);
        setPages(parsedPages);
      } catch (error) {
        console.error('Failed to load assignment:', error);
        toast.error('Failed to load assignment');
        navigate('/my-assignments');
      } finally {
        setIsLoading(false);
      }
    };

    loadAssignment();
  }, [assignmentId, navigate]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleZoomReset = () => setZoom(1);

  const handlePageChange = (delta: number) => {
    setCurrentPage(prev => Math.max(1, Math.min(pages.length, prev + delta)));
  };

  const handleDownloadPdf = async () => {
    if (!assignmentId) return;
    setIsGeneratingPdf(true);
    try {
      const response = await api.get(apiEndpoints.assignments.pdf(assignmentId), {
        responseType: 'blob',
      });
      // Create download link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${assignment?.title || 'assignment'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadDocx = async () => {
    if (!assignmentId) return;
    setIsGeneratingDocx(true);
    try {
      const response = await api.get(apiEndpoints.assignments.docx(assignmentId), {
        responseType: 'blob',
      });
      // Create download link
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${assignment?.title || 'assignment'}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('DOCX downloaded successfully!');
    } catch (error) {
      console.error('Failed to generate DOCX:', error);
      toast.error('Failed to generate DOCX');
    } finally {
      setIsGeneratingDocx(false);
    }
  };

  const handleEditAnswer = (answerId: string, currentContent: string) => {
    setEditingAnswer({ answerId, content: currentContent });
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (!editingAnswer || !assignment) return;
    const updatedAnswers = assignment.answers.map(a =>
      a.id === editingAnswer.answerId ? { ...a, content: editingAnswer.content, isEdited: true } : a
    );
    setAssignment(prev => prev ? { ...prev, answers: updatedAnswers } : null);
    setShowEditModal(false);
    setEditingAnswer(null);
    toast.success('Answer updated');
  };

  const handleRegenerateAnswer = (_answerId: string) => {
    toast.success('Regenerating answer...');
    // In production, call API to regenerate
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-notebook-blue-200 border-t-notebook-blue-600 rounded-full" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-notebook-blue-500">Assignment not found</p>
      </div>
    );
  }

  const currentPageData = pages[currentPage - 1];
  const subjectColor = getSubjectColor(assignment.subject);

  const pageActions: DropdownOption[] = [
    { value: 'edit', label: 'Edit This Page', icon: <Edit className="w-4 h-4" /> },
    { value: 'regenerate', label: 'Regenerate', icon: <RotateCcw className="w-4 h-4" /> },
    { value: 'insert', label: 'Insert Page Before', icon: <FileText className="w-4 h-4" /> },
    { value: 'delete', label: 'Delete Page', icon: <X className="w-4 h-4 text-red-500" /> },
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/my-assignments')} aria-label="Back to assignments">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-heading text-2xl text-notebook-ink-50">{assignment.title}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-notebook-blue-500">
              <span className="flex items-center gap-1">
                <SubjectIcon subject={assignment.subject} className="w-4 h-4" style={{ color: subjectColor }} />
                {assignment.subject}
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                {pages.length} pages
              </span>
              <StatusBadge status={assignment.status} size="sm" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip content="Settings" position="bottom">
            <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)}>
              <Settings className="w-5 h-5" />
            </Button>
          </Tooltip>
          <Tooltip content="Print" position="bottom">
            <Button variant="ghost" size="sm" onClick={() => window.print()}>
              <Printer className="w-5 h-5" />
            </Button>
          </Tooltip>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownloadDocx} isLoading={isGeneratingDocx} leftIcon={<FileText className="w-4 h-4" />}>
              DOCX
            </Button>
            <Button onClick={handleDownloadPdf} isLoading={isGeneratingPdf} leftIcon={<Download className="w-4 h-4" />}>
              Download PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <Card className="mb-6 animate-slide-up">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="label-text">Handwriting Size</label>
                <Select
                  value={previewSettings.handwritingSize}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPreviewSettings(prev => ({ ...prev, handwritingSize: e.target.value as 'small' | 'medium' | 'large' }))}
                  options={[
                    { value: 'small', label: 'Small' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'large', label: 'Large' },
                  ]}
                  placeholder="Size"
                />
              </div>
              <div>
                <label className="label-text">Paper Style</label>
                <Select
                  value={previewSettings.paperStyle}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPreviewSettings(prev => ({ ...prev, paperStyle: e.target.value as 'ruled' | 'plain' | 'grid' }))}
                  options={[
                    { value: 'ruled', label: 'Ruled' },
                    { value: 'plain', label: 'Plain' },
                    { value: 'grid', label: 'Grid' },
                  ]}
                  placeholder="Style"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer mt-6">
                <input
                  type="checkbox"
                  checked={previewSettings.showQuestionNumbers}
                  onChange={e => setPreviewSettings(prev => ({ ...prev, showQuestionNumbers: e.target.checked }))}
                  className="w-4 h-4 rounded border-notebook-blue-300 text-notebook-blue-600 focus:ring-notebook-blue-500"
                />
                <span className="text-sm text-notebook-ink-50">Question Numbers</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer mt-6">
                <input
                  type="checkbox"
                  checked={previewSettings.showPageNumbers}
                  onChange={e => setPreviewSettings(prev => ({ ...prev, showPageNumbers: e.target.checked }))}
                  className="w-4 h-4 rounded border-notebook-blue-300 text-notebook-blue-600 focus:ring-notebook-blue-500"
                />
                <span className="text-sm text-notebook-ink-50">Page Numbers</span>
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Area */}
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Thumbnail Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pages ({pages.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {pages.map((page, index) => (
                  <button
                    key={page.pageNumber}
                    onClick={() => setCurrentPage(index + 1)}
                    className={`w-full p-2 rounded-lg text-left transition-all ${
                      currentPage === index + 1
                        ? 'bg-notebook-blue-50 border border-notebook-blue-500'
                        : 'hover:bg-notebook-blue-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded flex-shrink-0 bg-notebook-blue-100 flex items-center justify-center text-sm font-medium text-notebook-blue-600">
                        {page.pageNumber}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-notebook-ink-50 truncate">Page {page.pageNumber}</p>
                        <p className="text-xs text-notebook-blue-500">Click to view</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Preview */}
        <div className="lg:col-span-3">
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-notebook-blue-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => handlePageChange(-1)} disabled={currentPage === 1} leftIcon={<ChevronLeft className="w-4 h-4" />}>
                  Previous
                </Button>
                <span className="font-medium text-notebook-ink-50">
                  Page {currentPage} of {pages.length}
                </span>
                <Button variant="ghost" size="sm" onClick={() => handlePageChange(1)} disabled={currentPage === pages.length} rightIcon={<ChevronRight className="w-4 h-4" />}>
                  Next
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Tooltip content="Zoom Out" position="bottom">
                  <Button variant="ghost" size="sm" onClick={handleZoomOut} disabled={zoom <= 0.5}>
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                </Tooltip>
                <span className="text-sm text-notebook-blue-600 w-16 text-center">{Math.round(zoom * 100)}%</span>
                <Tooltip content="Zoom In" position="bottom">
                  <Button variant="ghost" size="sm" onClick={handleZoomIn} disabled={zoom >= 3}>
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </Tooltip>
                <Tooltip content="Reset Zoom" position="bottom">
                  <Button variant="ghost" size="sm" onClick={handleZoomReset}>
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </Tooltip>
              </div>
            </div>
            <div className="relative" style={{ minHeight: '700px' }}>
              <div
                ref={previewRef}
                className={`notebook-page mx-auto transition-transform duration-200 ${previewSettings.paperStyle}`}
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top center',
                  width: '794px',
                  height: '1123px',
                }}
              >
                <div className="p-8 h-full font-notebook" style={{
                  fontSize: previewSettings.handwritingSize === 'small' ? '16px' : previewSettings.handwritingSize === 'large' ? '20px' : '18px',
                  lineHeight: previewSettings.handwritingSize === 'small' ? '28px' : previewSettings.handwritingSize === 'large' ? '36px' : '32px',
                }}>
                  <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(currentPageData?.content || '') }} />
                  {previewSettings.showPageNumbers && (
                    <div className="absolute bottom-4 right-4 text-notebook-blue-300 text-sm font-medium">
                      Page {currentPage} of {pages.length}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <CardFooter className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {assignment.answers.map((answer, index) => (
                  <button
                    key={answer.id}
                    onClick={() => handleEditAnswer(answer.id, answer.content)}
                    className="px-3 py-1.5 text-xs rounded-full bg-notebook-blue-100 text-notebook-blue-700 hover:bg-notebook-blue-200 transition-colors"
                  >
                    Edit Answer {index + 1}
                  </button>
                ))}
              </div>
              <Dropdown
                options={pageActions}
                placeholder="Page Actions"
                onChange={value => {
                  if (value === 'edit') handleEditAnswer(assignment.answers[0]?.id || '', '');
                  else if (value === 'regenerate') handleRegenerateAnswer(assignment.answers[0]?.id || '');
                }}
              />
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Edit Answer Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setEditingAnswer(null); }}
        title="Edit Answer"
        size="lg"
      >
        {editingAnswer && (
          <div className="space-y-4">
            <Textarea
              value={editingAnswer.content}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditingAnswer(prev => prev ? { ...prev, content: e.target.value } : null)}
              rows={8}
              placeholder="Edit the answer content..."
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setShowEditModal(false); setEditingAnswer(null); }}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}