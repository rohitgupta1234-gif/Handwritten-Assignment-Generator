import { useState } from 'react';
import { PenTool, Pen, FileText, Zap, Layers, Palette } from 'lucide-react';
import { HandwritingMode, RealisticStyle, PenColor } from '../types';

interface HandwritingModeSelectorProps {
  mode: HandwritingMode;
  onModeChange: (mode: HandwritingMode) => void;
  realisticStyle?: RealisticStyle;
  onRealisticStyleChange?: (style: RealisticStyle) => void;
  penColor?: PenColor;
  onPenColorChange?: (color: PenColor) => void;
  className?: string;
}

const MODE_OPTIONS = [
  {
    id: 'personal' as HandwritingMode,
    icon: PenTool,
    title: 'Personal Handwriting',
    subtitle: 'Imitate your own handwriting',
    description: 'Upload samples of your handwriting to create a personalized style that mimics your unique writing patterns.',
    features: ['Multi-sample upload', 'Style analysis', 'Natural variations', 'Consistent reproduction'],
  },
  {
    id: 'realistic' as HandwritingMode,
    icon: Pen,
    title: 'Realistic Handwriting',
    subtitle: 'Professional AI-generated styles',
    description: 'Choose from curated handwriting styles with natural pen strokes, ink variations, and paper textures.',
    features: ['4 distinct styles', 'Blue/Black ink', '3 paper types', 'Forge AI enhancement'],
  },
];

const STYLE_OPTIONS: { id: RealisticStyle; icon: any; title: string; description: string }[] = [
  { id: 'cursive', icon: PenTool, title: 'Cursive', description: 'Flowing connected letters with natural pen strokes' },
  { id: 'print', icon: FileText, title: 'Print', description: 'Clear separated letters, neat block style' },
  { id: 'mixed', icon: Layers, title: 'Mixed', description: 'Natural mix of cursive and print styles' },
  { id: 'calligraphy', icon: Zap, title: 'Calligraphy', description: 'Artistic letterforms with varied stroke width' },
];

const COLOR_OPTIONS: { id: PenColor; icon: any; title: string; hex: string; description: string }[] = [
  { id: 'blue', icon: Palette, title: 'Blue Ink', hex: '#1e3a5f', description: 'Classic blue ballpoint pen' },
  { id: 'black', icon: Palette, title: 'Black Ink', hex: '#1a1a2e', description: 'Professional black ink' },
];

export function HandwritingModeSelector({
  mode,
  onModeChange,
  realisticStyle,
  onRealisticStyleChange,
  penColor,
  onPenColorChange,
  className = '',
}: HandwritingModeSelectorProps) {
  const [expandedMode, setExpandedMode] = useState<HandwritingMode | null>(mode);

  const handleModeClick = (newMode: HandwritingMode) => {
    onModeChange(newMode);
    setExpandedMode(newMode);
  };

  return (
    <div className={`handwriting-mode-selector ${className}`}>
      {/* Mode Selection Cards */}
      <div className="mode-cards">
        {MODE_OPTIONS.map((option) => {
          const isSelected = mode === option.id;
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              type="button"
              className={`mode-card ${isSelected ? 'selected' : ''} ${expandedMode === option.id ? 'expanded' : ''}`}
              onClick={() => handleModeClick(option.id)}
            >
              <div className="mode-card-header">
                <div className="mode-icon">
                  <Icon size={28} strokeWidth={2} />
                </div>
                <div className="mode-info">
                  <h3>{option.title}</h3>
                  <p className="mode-subtitle">{option.subtitle}</p>
                </div>
                {isSelected && (
                  <div className="mode-check">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
              </div>
              <p className="mode-description">{option.description}</p>
              <div className="mode-features">
                {option.features.map((feature, i) => (
                  <span key={i} className="feature-tag">{feature}</span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Realistic Style Options (shown when realistic mode is selected) */}
      {mode === 'realistic' && (
        <div className="realistic-options">
          <h4 className="section-title">Handwriting Style</h4>
          <div className="style-grid">
            {STYLE_OPTIONS.map((style) => {
              const isSelected = realisticStyle === style.id;
              const Icon = style.icon;
              return (
                <button
                  key={style.id}
                  type="button"
                  className={`style-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => onRealisticStyleChange?.(style.id)}
                >
                  <div className="style-icon">
                    <Icon size={24} strokeWidth={2} />
                  </div>
                  <div className="style-info">
                    <h5>{style.title}</h5>
                    <p>{style.description}</p>
                  </div>
                  {isSelected && (
                    <div className="style-check">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Pen Color Options (shown when realistic mode is selected) */}
      {mode === 'realistic' && (
        <div className="realistic-options">
          <h4 className="section-title">Pen Color</h4>
          <div className="color-grid">
            {COLOR_OPTIONS.map((color) => {
              const isSelected = penColor === color.id;
              return (
                <button
                  key={color.id}
                  type="button"
                  className={`color-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => onPenColorChange?.(color.id)}
                >
                  <div className="color-preview" style={{ backgroundColor: color.hex }} />
                  <div className="color-info">
                    <h5>{color.title}</h5>
                    <p>{color.description}</p>
                  </div>
                  {isSelected && (
                    <div className="color-check">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}