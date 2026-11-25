import { useEffect, useState, useRef, useCallback } from 'react';
import { X, CheckCircle, Loader2, AlertCircle, FileText, Download, ExternalLink } from 'lucide-react';
import { GenerationProgress, GeneratedAssignment } from '../types';

interface GenerationProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string | null;
  onCancel?: () => void;
  onDownloadPDF?: (jobId: string) => void;
  onDownloadDOCX?: (jobId: string) => void;
  onViewAssignment?: (jobId: string) => void;
  pollInterval?: number; // Base poll interval in ms
}

const STAGES = [
  { id: 'initializing', label: 'Initializing', icon: Loader2, description: 'Setting up generation environment' },
  { id: 'analyzing', label: 'Analyzing', icon: FileText, description: 'Processing handwriting characteristics' },
  { id: 'generating', label: 'Generating', icon: Loader2, description: 'Creating handwritten pages' },
  { id: 'rendering', label: 'Rendering', icon: FileText, description: 'Rendering page layouts' },
  { id: 'exporting', label: 'Exporting', icon: Download, description: 'Generating PDF and DOCX files' },
  { id: 'completed', label: 'Completed', icon: CheckCircle, description: 'Generation finished successfully' },
  { id: 'failed', label: 'Failed', icon: AlertCircle, description: 'Generation encountered an error' },
];

// Exponential backoff configuration
const POLL_CONFIG = {
  baseInterval: 2000,        // Initial interval (2 seconds)
  maxInterval: 10000,        // Maximum interval (10 seconds)
  backoffMultiplier: 1.5,    // Exponential backoff factor
  jitterFactor: 0.2,         // Random jitter to prevent thundering herd
};

export function GenerationProgressModal({
  isOpen,
  onClose,
  jobId,
  onCancel,
  onDownloadPDF,
  onDownloadDOCX,
  onViewAssignment,
  pollInterval = POLL_CONFIG.baseInterval,
}: GenerationProgressModalProps) {
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [job, setJob] = useState<GeneratedAssignment | null>(null);
  const [polling, setPolling] = useState(false);

  // Refs for exponential backoff
  const currentIntervalRef = useRef(pollInterval);
  const consecutiveErrorsRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // Reset backoff on new job or when modal opens
  useEffect(() => {
    currentIntervalRef.current = pollInterval;
    consecutiveErrorsRef.current = 0;
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [jobId, pollInterval]);

  const fetchJob = useCallback(async () => {
    if (!jobId || !isMountedRef.current) return;

    try {
      const response = await fetch(`/api/handwriting/generate/${jobId}`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!isMountedRef.current) return;

      if (response.ok) {
        consecutiveErrorsRef.current = 0; // Reset error count on success
        // Reset interval on success (but don't go below base)
        currentIntervalRef.current = Math.max(pollInterval, currentIntervalRef.current * 0.9);

        const data = await response.json();
        setJob(data.job);

        if (data.job.pagesData) {
          // Calculate progress from job data
          setProgress({
            stage: data.job.status === 'completed' ? 'completed' :
              data.job.status === 'failed' ? 'failed' : 'generating',
            progress: data.job.status === 'completed' ? 100 :
              data.job.status === 'failed' ? 0 : Math.min(90, 10 + (data.job.totalPages || 1) * 10),
            message: getStageMessage(data.job.status, data.job.totalPages),
            totalPages: data.job.totalPages,
            currentPage: data.job.totalPages,
            error: data.job.errorMessage,
          });
        }

        if (data.job.status === 'completed' || data.job.status === 'failed') {
          setPolling(false);
          return; // Stop polling
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      if (!isMountedRef.current) return;

      consecutiveErrorsRef.current++;
      console.warn(`Failed to fetch job (attempt ${consecutiveErrorsRef.current}):`, err);

      // Exponential backoff with jitter
      const baseDelay = Math.min(
        currentIntervalRef.current * POLL_CONFIG.backoffMultiplier,
        POLL_CONFIG.maxInterval
      );
      const jitter = baseDelay * POLL_CONFIG.jitterFactor * Math.random();
      currentIntervalRef.current = baseDelay + jitter;
    }

    // Schedule next poll with exponential backoff
    if (isMountedRef.current && polling) {
      timeoutRef.current = setTimeout(fetchJob, currentIntervalRef.current);
    }
  }, [jobId, pollInterval, polling]);

  // Start/stop polling based on isOpen and jobId
  useEffect(() => {
    if (!isOpen || !jobId) {
      setProgress(null);
      setJob(null);
      setPolling(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    setPolling(true);
    currentIntervalRef.current = pollInterval;
    consecutiveErrorsRef.current = 0;

    // Initial fetch
    fetchJob();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isOpen, jobId, fetchJob]);

  const getStageMessage = (status: string, totalPages: number): string => {
    switch (status) {
      case 'pending': return 'Waiting to start...';
      case 'generating': return `Generating ${totalPages} page(s)...`;
      case 'completed': return `Successfully generated ${totalPages} page(s)!`;
      case 'failed': return 'Generation failed';
      default: return 'Processing...';
    }
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    setPolling(false);
  };

  const handleDownloadPDF = () => {
    if (jobId && onDownloadPDF) onDownloadPDF(jobId);
  };

  const handleDownloadDOCX = () => {
    if (jobId && onDownloadDOCX) onDownloadDOCX(jobId);
  };

  const handleView = () => {
    if (jobId && onViewAssignment) onViewAssignment(jobId);
  };

  if (!isOpen) return null;

  const currentStageIndex = progress ? STAGES.findIndex(s => s.id === progress.stage) : 0;
  const overallProgress = progress?.progress || 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Generating Handwritten Assignment</h2>
          <button className="close-btn" onClick={onClose} disabled={polling}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-content">
          {/* Overall Progress */}
          <div className="overall-progress">
            <div className="progress-header">
              <span className="progress-label">Overall Progress</span>
              <span className="progress-percent">{Math.round(overallProgress)}%</span>
            </div>
            <div className="progress-bar-container">
              <div
                className="progress-bar"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            {progress && (
              <p className="progress-message">{progress.message}</p>
            )}
          </div>

          {/* Stage Steps */}
          <div className="stages">
            {STAGES.map((stage, index) => {
              const isCompleted = index < currentStageIndex;
              const isCurrent = index === currentStageIndex;
              const isFailed = progress?.stage === 'failed' && isCurrent;

              return (
                <div key={stage.id} className={`stage ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isFailed ? 'failed' : ''}`}>
                  <div className="stage-indicator">
                    {isCompleted ? (
                      <CheckCircle size={20} />
                    ) : isFailed ? (
                      <AlertCircle size={20} />
                    ) : isCurrent ? (
                      <Loader2 size={20} className="spinning" />
                    ) : (
                      <span className="stage-number">{index + 1}</span>
                    )}
                  </div>
                  <div className="stage-content">
                    <div className="stage-title-row">
                      <h4>{stage.label}</h4>
                      {isCurrent && polling && <span className="stage-status">In Progress</span>}
                      {isCompleted && <span className="stage-status completed">Done</span>}
                      {isFailed && <span className="stage-status failed">Failed</span>}
                    </div>
                    <p className="stage-description">{stage.description}</p>
                  </div>
                  {index < STAGES.length - 1 && (
                    <div className="stage-connector" style={{ height: isCompleted ? '100%' : '0%' }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Error Display */}
          {progress?.stage === 'failed' && progress.error && (
            <div className="error-display">
              <AlertCircle size={20} />
              <p>{progress.error}</p>
            </div>
          )}

          {/* Page Progress (during rendering) */}
          {progress && (progress.stage === 'rendering' || progress.stage === 'generating') && progress.totalPages && (
            <div className="page-progress">
              <div className="page-progress-header">
                <span>Pages: {progress.currentPage || 1} / {progress.totalPages}</span>
              </div>
              <div className="page-progress-bar-container">
                <div
                  className="page-progress-bar"
                  style={{ width: `${((progress.currentPage || 1) / progress.totalPages) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="modal-actions">
          {progress?.stage === 'completed' && job && (
            <>
              <button className="btn btn-primary" onClick={handleDownloadPDF}>
                <Download size={18} />
                Download PDF
              </button>
              <button className="btn btn-secondary" onClick={handleDownloadDOCX}>
                <FileText size={18} />
                Download DOCX
              </button>
              <button className="btn btn-outline" onClick={handleView}>
                <ExternalLink size={18} />
                View Assignment
              </button>
            </>
          )}
          {polling && progress?.stage !== 'completed' && progress?.stage !== 'failed' && onCancel && (
            <button className="btn btn-danger" onClick={handleCancel}>
              <X size={18} />
              Cancel Generation
            </button>
          )}
          {(progress?.stage === 'completed' || progress?.stage === 'failed') && !polling && (
            <button className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// CSS-in-JS styles
const styles = `
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    z-index: 1000;
    animation: fadeIn 0.2s ease;
  }

  .modal-container {
    background: var(--bg-secondary, #fff);
    border-radius: 16px;
    width: 100%;
    max-width: 560px;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
    animation: slideUp 0.3s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid var(--border-color, #e5e7eb);
  }

  .modal-header h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary, #1f2937);
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: transparent;
    border: none;
    border-radius: 8px;
    color: var(--text-secondary, #6b7280);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .close-btn:hover:not(:disabled) {
    background: var(--bg-tertiary, #f3f4f6);
    color: var(--text-primary, #1f2937);
  }

  .close-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .modal-content {
    padding: 24px;
    overflow-y: auto;
    flex: 1;
  }

  /* Overall Progress */
  .overall-progress {
    margin-bottom: 24px;
  }

  .progress-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .progress-label {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary, #1f2937);
  }

  .progress-percent {
    font-size: 14px;
    font-weight: 600;
    color: var(--primary-color, #3b82f6);
  }

  .progress-bar-container {
    height: 8px;
    background: var(--bg-tertiary, #e5e7eb);
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, var(--primary-color, #3b82f6), var(--primary-light, #60a5fa));
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .progress-message {
    margin: 8px 0 0;
    font-size: 13px;
    color: var(--text-secondary, #6b7280);
  }

  /* Stages */
  .stages {
    display: flex;
    flex-direction: column;
    gap: 0;
    margin-bottom: 20px;
  }

  .stage {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding: 16px 0;
    position: relative;
  }

  .stage:not(:last-child)::before {
    content: '';
    position: absolute;
    left: 11px;
    top: 48px;
    bottom: 0;
    width: 2px;
    background: var(--border-color, #e5e7eb);
    z-index: 0;
  }

  .stage-connector {
    position: absolute;
    left: 11px;
    top: 48px;
    bottom: 0;
    width: 2px;
    background: var(--primary-color, #3b82f6);
    z-index: 1;
    transition: height 0.3s ease;
  }

  .stage-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--bg-tertiary, #e5e7eb);
    color: var(--text-tertiary, #9ca3af);
    flex-shrink: 0;
    z-index: 2;
    transition: all 0.3s ease;
  }

  .stage.completed .stage-indicator {
    background: var(--primary-color, #3b82f6);
    color: white;
  }

  .stage.current .stage-indicator {
    background: var(--primary-color, #3b82f6);
    color: white;
  }

  .stage.failed .stage-indicator {
    background: #ef4444;
    color: white;
  }

  .stage-number {
    font-size: 12px;
    font-weight: 600;
  }

  .spinning {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .stage-content {
    flex: 1;
    min-width: 0;
  }

  .stage-title-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 4px;
  }

  .stage-title-row h4 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary, #1f2937);
  }

  .stage-status {
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 10px;
    text-transform: uppercase;
  }

  .stage-status.completed {
    background: rgba(34, 197, 94, 0.1);
    color: #22c55e;
  }

  .stage-status.failed {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }

  .stage-description {
    margin: 0;
    font-size: 12px;
    color: var(--text-secondary, #6b7280);
  }

  .stage.completed .stage-title-row h4,
  .stage.completed .stage-description {
    color: var(--text-secondary, #6b7280);
  }

  /* Error Display */
  .error-display {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 10px;
    margin-bottom: 20px;
    color: #ef4444;
  }

  .error-display svg {
    flex-shrink: 0;
    margin-top: 2px;
  }

  .error-display p {
    margin: 0;
    font-size: 13px;
  }

  /* Page Progress */
  .page-progress {
    padding: 16px;
    background: var(--bg-tertiary, #f3f4f6);
    border-radius: 10px;
    margin-bottom: 20px;
  }

  .page-progress-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary, #1f2937);
  }

  .page-progress-bar-container {
    height: 6px;
    background: var(--border-color, #e5e7eb);
    border-radius: 3px;
    overflow: hidden;
  }

  .page-progress-bar {
    height: 100%;
    background: var(--primary-color, #3b82f6);
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  /* Actions */
  .modal-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    padding: 20px 24px;
    border-top: 1px solid var(--border-color, #e5e7eb);
    justify-content: flex-end;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
  }

  .btn-primary {
    background: linear-gradient(135deg, var(--primary-color, #3b82f6), var(--primary-dark, #2563eb));
    color: white;
  }

  .btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
  }

  .btn-secondary {
    background: var(--bg-tertiary, #f3f4f6);
    color: var(--text-primary, #1f2937);
    border: 1px solid var(--border-color, #e5e7eb);
  }

  .btn-secondary:hover {
    background: var(--border-color, #e5e7eb);
  }

  .btn-outline {
    background: transparent;
    color: var(--primary-color, #3b82f6);
    border: 1px solid var(--primary-color, #3b82f6);
  }

  .btn-outline:hover {
    background: rgba(59, 130, 246, 0.1);
  }

  .btn-danger {
    background: #ef4444;
    color: white;
  }

  .btn-danger:hover {
    background: #dc2626;
  }

  @media (prefers-color-scheme: dark) {
    .modal-container {
      background: var(--bg-secondary, #1f2937);
    }

    .progress-bar-container,
    .page-progress-bar-container {
      background: var(--bg-tertiary, #374151);
    }

    .stage:not(:last-child)::before {
      background: var(--border-color, #374151);
    }

    .stage-indicator {
      background: var(--bg-tertiary, #374151);
      color: var(--text-tertiary, #6b7280);
    }

    .stage-title-row h4 {
      color: var(--text-primary, #f3f4f6);
    }

    .stage.completed .stage-title-row h4,
    .stage.completed .stage-description {
      color: var(--text-tertiary, #9ca3af);
    }

    .stage-description {
      color: var(--text-secondary, #9ca3af);
    }

    .error-display {
      background: rgba(239, 68, 68, 0.2);
      border-color: rgba(239, 68, 68, 0.3);
    }

    .page-progress {
      background: var(--bg-tertiary, #374151);
    }

    .btn-secondary {
      background: var(--bg-tertiary, #374151);
      border-color: var(--border-color, #4b5563);
      color: var(--text-primary, #f3f4f6);
    }

    .btn-secondary:hover {
      background: var(--border-color, #4b5563);
    }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleId = 'generation-progress-modal-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = styles;
    document.head.appendChild(style);
  }
}