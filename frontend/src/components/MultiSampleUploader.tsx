import { useState, useCallback, useRef } from 'react';
import { Plus, Loader2, Trash2, Star, Eye, Upload } from 'lucide-react';
import { HandwritingSample } from '../types';
import toast from 'react-hot-toast';

interface MultiSampleUploaderProps {
  samples: HandwritingSample[];
  isLoading: boolean;
  onAddSample: (file: File, isPrimary?: boolean) => Promise<void>;
  onRemoveSample: (sampleId: string) => Promise<void>;
  onSetPrimary: (sampleId: string) => Promise<void>;
  onAnalyzeMulti: () => Promise<void>;
  maxSamples?: number;
  acceptedTypes?: string[];
  maxFileSize?: number; // in MB
}

export function MultiSampleUploader({
  samples,
  isLoading,
  onAddSample,
  onRemoveSample,
  onSetPrimary,
  onAnalyzeMulti,
  maxSamples = 5,
  acceptedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
  maxFileSize = 10,
}: MultiSampleUploaderProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);

    const files = Array.from(e.dataTransfer.files);
    await processFiles(files);
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await processFiles(files);
    if (e.target) e.target.value = '';
  }, []);

  const processFiles = async (files: File[]) => {
    if (samples.length + files.length > maxSamples) {
      toast.error(`Maximum ${maxSamples} samples allowed. You have ${samples.length} already.`);
      return;
    }

    for (const file of files) {
      if (!acceptedTypes.includes(file.type)) {
        toast.error(`${file.name}: Only ${acceptedTypes.join(', ')} files are allowed.`);
        continue;
      }

      if (file.size > maxFileSize * 1024 * 1024) {
        toast.error(`${file.name}: File size must be less than ${maxFileSize}MB.`);
        continue;
      }

      // Create preview
      const previewUrl = URL.createObjectURL(file);
      setPreviews(prev => ({ ...prev, [file.name]: previewUrl }));

      try {
        setUploading(file.name);
        const isPrimary = samples.length === 0 && previews[file.name] === undefined;
        await onAddSample(file, isPrimary);
        toast.success(`${file.name} uploaded successfully`);
      } catch (error) {
        toast.error(`Failed to upload ${file.name}`);
      } finally {
        setUploading(null);
        setPreviews(prev => {
          const next = { ...prev };
          delete next[file.name];
          return next;
        });
      }
    }
  };

  const handleRemoveSample = async (sampleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await onRemoveSample(sampleId);
      toast.success('Sample removed');
    } catch (error) {
      toast.error('Failed to remove sample');
    }
  };

  const handleSetPrimary = async (sampleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await onSetPrimary(sampleId);
      toast.success('Primary sample updated');
    } catch (error) {
      toast.error('Failed to update primary sample');
    }
  };

  const handlePreviewClick = (sample: HandwritingSample) => {
    // Open full-size preview in a modal or new tab
    window.open(sample.imageUrl, '_blank');
  };

  const primarySampleId = samples.find(s => s.isPrimary)?.id;

  return (
    <div className="multi-sample-uploader">
      {/* Drop Zone / Upload Area */}
      <div
        className={`drop-zone ${dragging ? 'dragging' : ''} ${samples.length >= maxSamples ? 'full' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          disabled={isLoading || samples.length >= maxSamples}
        />

        {samples.length === 0 ? (
          <div className="drop-zone-empty">
            <Upload size={48} className="drop-icon" />
            <h3>Upload Handwriting Samples</h3>
            <p>Drag & drop or click to upload images of your handwriting</p>
            <p className="drop-hint">Supports: PNG, JPG, WebP • Max {maxFileSize}MB each • Up to {maxSamples} samples</p>
            {isLoading && <Loader2 size={24} className="loading-spinner" />}
          </div>
        ) : (
          <div className="drop-zone-has-samples">
            <Plus size={32} className="add-icon" />
            <span>Add more samples ({samples.length}/{maxSamples})</span>
          </div>
        )}
      </div>

      {/* Samples Grid */}
      {samples.length > 0 && (
        <div className="samples-section">
          <div className="samples-header">
            <h4>Your Samples ({samples.length}/{maxSamples})</h4>
            {samples.length >= 2 && !isLoading && (
              <button
                className="analyze-btn"
                onClick={onAnalyzeMulti}
                disabled={isLoading}
              >
                <Loader2 size={16} className={isLoading ? 'spinning' : ''} />
                Analyze All Samples
              </button>
            )}
          </div>

          <div className="samples-grid">
            {samples.map((sample, index) => (
              <div key={sample.id} className="sample-card">
                <div className="sample-image-wrapper">
                  <img
                    src={sample.imageUrl}
                    alt={`Handwriting sample ${index + 1}`}
                    className="sample-image"
                    onClick={() => handlePreviewClick(sample)}
                  />
                  <div className="sample-overlay">
                    <button
                      className="preview-btn"
                      onClick={() => handlePreviewClick(sample)}
                      title="View full size"
                    >
                      <Eye size={18} />
                    </button>
                    {sample.id !== primarySampleId && (
                      <button
                        className="primary-btn"
                        onClick={(e) => handleSetPrimary(sample.id, e)}
                        title="Set as primary"
                        disabled={isLoading}
                      >
                        <Star size={18} fill={sample.isPrimary ? 'currentColor' : 'none'} />
                      </button>
                    )}
                    <button
                      className="remove-btn"
                      onClick={(e) => handleRemoveSample(sample.id, e)}
                      title="Remove sample"
                      disabled={isLoading}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  {sample.isPrimary && (
                    <div className="primary-badge">
                      <Star size={14} fill="currentColor" />
                      <span>Primary</span>
                    </div>
                  )}
                  {uploading === sample.imageUrl && (
                    <div className="uploading-indicator">
                      <Loader2 size={20} className="spinning" />
                    </div>
                  )}
                </div>
                <div className="sample-info">
                  <div className="sample-meta">
                    <span className="sample-number">Sample {index + 1}</span>
                    <span className="sample-quality">
                      Quality: {Math.round(sample.qualityScore * 100)}%
                    </span>
                  </div>
                  <div className="sample-progress">
                    <div
                      className="quality-bar"
                      style={{ width: `${sample.qualityScore * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {samples.length < maxSamples && (
            <button
              className="add-more-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <Plus size={20} />
              Add More Samples
            </button>
          )}
        </div>
      )}

      {/* Analysis Tips */}
      <div className="analysis-tips">
        <h5><Upload size={18} /> Tips for Best Results</h5>
        <ul>
          <li>Write naturally on plain white paper with a dark pen</li>
          <li>Include all letters (a-z, A-Z) and common punctuation</li>
          <li>Use good lighting - avoid shadows and glare</li>
          <li>Keep the camera parallel to the paper</li>
          <li>Upload 3-5 samples for best consistency analysis</li>
        </ul>
      </div>
    </div>
  );
}