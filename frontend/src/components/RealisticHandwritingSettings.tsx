import { useState } from 'react';
import { Minus, Plus, Sun, Grid, Type, AlignLeft, AlignCenter, AlignJustify, Settings, Sparkles } from 'lucide-react';
import { RealisticHandwritingOptions, RealisticStyle, PenColor, PaperStyle } from '../types';

interface RealisticHandwritingSettingsProps {
  options: RealisticHandwritingOptions;
  onChange: (options: RealisticHandwritingOptions) => void;
  className?: string;
  showAdvanced?: boolean;
}

const VARIATION_LEVELS = [
  { value: 'low', label: 'Low', description: 'Subtle, consistent handwriting' },
  { value: 'medium', label: 'Medium', description: 'Natural variation, balanced' },
  { value: 'high', label: 'High', description: 'Expressive, organic variation' },
];

const PAPER_STYLES: { value: PaperStyle; label: string; icon: any; description: string }[] = [
  { value: 'ruled', label: 'Ruled', icon: Type, description: 'Traditional lined paper' },
  { value: 'plain', label: 'Plain', icon: Sun, description: 'Clean white paper' },
  { value: 'grid', label: 'Grid', icon: Grid, description: 'Graph paper style' },
];

const PARAGRAPH_ALIGNMENTS = [
  { value: 'left', label: 'Left', icon: AlignLeft },
  { value: 'center', label: 'Center', icon: AlignCenter },
  { value: 'justify', label: 'Justify', icon: AlignJustify },
];

export function RealisticHandwritingSettings({
  options,
  onChange,
  className = '',
  showAdvanced = true,
}: RealisticHandwritingSettingsProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    advanced: showAdvanced,
    preview: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const updateOption = <K extends keyof RealisticHandwritingOptions>(
    key: K,
    value: RealisticHandwritingOptions[K]
  ) => {
    onChange({ ...options, [key]: value });
  };

  const updateNestedOption = <K extends keyof RealisticHandwritingOptions['margins']>(
    parentKey: 'margins',
    key: K,
    value: RealisticHandwritingOptions['margins'][K]
  ) => {
    onChange({
      ...options,
      [parentKey]: { ...options[parentKey], [key]: value },
    });
  };

  return (
    <div className={`realistic-handwriting-settings ${className}`}>
      {/* Basic Settings */}
      <div className="settings-section">
        <button className="section-header" onClick={() => toggleSection('basic')} type="button">
          <div className="section-title-row">
            <Sparkles size={20} />
            <h3>Basic Settings</h3>
          </div>
          <span className={expandedSections.basic ? 'expanded' : ''}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </button>

        {expandedSections.basic && (
          <div className="section-content">
            <div className="settings-grid">
              {/* Handwriting Style */}
              <div className="setting-group">
                <label>Handwriting Style</label>
                <div className="style-selector">
                  {(['cursive', 'print', 'mixed', 'calligraphy'] as RealisticStyle[]).map((style) => {
                    const isSelected = options.style === style;
                    const styleLabels: Record<RealisticStyle, string> = {
                      cursive: 'Cursive',
                      print: 'Print',
                      mixed: 'Mixed',
                      calligraphy: 'Calligraphy',
                    };
                    return (
                      <button
                        key={style}
                        type="button"
                        className={`style-option ${isSelected ? 'selected' : ''}`}
                        onClick={() => updateOption('style', style)}
                      >
                        {styleLabels[style]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pen Color */}
              <div className="setting-group">
                <label>Pen Color</label>
                <div className="color-selector">
                  {(['blue', 'black'] as PenColor[]).map((color) => {
                    const isSelected = options.penColor === color;
                    const colorHex = color === 'blue' ? '#1e3a5f' : '#1a1a2e';
                    return (
                      <button
                        key={color}
                        type="button"
                        className={`color-option ${isSelected ? 'selected' : ''}`}
                        onClick={() => updateOption('penColor', color)}
                      >
                        <span className="color-swatch" style={{ backgroundColor: colorHex }} />
                        <span>{color.charAt(0).toUpperCase() + color.slice(1)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Paper Style */}
              <div className="setting-group">
                <label>Paper Style</label>
                <div className="paper-selector">
                  {PAPER_STYLES.map((paper) => {
                    const isSelected = options.paperStyle === paper.value;
                    const Icon = paper.icon;
                    return (
                      <button
                        key={paper.value}
                        type="button"
                        className={`paper-option ${isSelected ? 'selected' : ''}`}
                        onClick={() => updateOption('paperStyle', paper.value)}
                      >
                        <Icon size={18} />
                        <span>{paper.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Size, Spacing, Thickness Controls */}
            <div className="controls-row">
              <SliderControl
                label="Size"
                value={options.sizeMultiplier}
                min={0.5}
                max={2}
                step={0.1}
                onChange={(v) => updateOption('sizeMultiplier', v)}
                format={(v) => `${Math.round(v * 100)}%`}
              />
              <SliderControl
                label="Spacing"
                value={options.spacingMultiplier}
                min={0.5}
                max={2}
                step={0.1}
                onChange={(v) => updateOption('spacingMultiplier', v)}
                format={(v) => `${Math.round(v * 100)}%`}
              />
              <SliderControl
                label="Thickness"
                value={options.thicknessMultiplier}
                min={0.3}
                max={3}
                step={0.1}
                onChange={(v) => updateOption('thicknessMultiplier', v)}
                format={(v) => `${Math.round(v * 100)}%`}
              />
            </div>

            {/* Variation Level */}
            <div className="setting-group">
              <label>Variation Level</label>
              <div className="variation-selector">
                {VARIATION_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    type="button"
                    className={`variation-option ${options.variationLevel === level.value ? 'selected' : ''}`}
                    onClick={() => updateOption('variationLevel', level.value as any)}
                  >
                    <span className="variation-label">{level.label}</span>
                    <span className="variation-desc">{level.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Settings */}
      {showAdvanced && (
        <div className="settings-section">
          <button className="section-header" onClick={() => toggleSection('advanced')} type="button">
            <div className="section-title-row">
              <Settings size={20} />
              <h3>Advanced Settings</h3>
            </div>
            <span className={expandedSections.advanced ? 'expanded' : ''}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </button>

          {expandedSections.advanced && (
            <div className="section-content">
              {/* Margins */}
              <div className="setting-group">
                <label>Page Margins (px)</label>
                <div className="margins-grid">
                  <NumberInput
                    label="Top"
                    value={options.margins.top}
                    onChange={(v) => updateNestedOption('margins', 'top', v)}
                    min={20}
                    max={200}
                  />
                  <NumberInput
                    label="Right"
                    value={options.margins.right}
                    onChange={(v) => updateNestedOption('margins', 'right', v)}
                    min={20}
                    max={200}
                  />
                  <NumberInput
                    label="Bottom"
                    value={options.margins.bottom}
                    onChange={(v) => updateNestedOption('margins', 'bottom', v)}
                    min={20}
                    max={200}
                  />
                  <NumberInput
                    label="Left"
                    value={options.margins.left}
                    onChange={(v) => updateNestedOption('margins', 'left', v)}
                    min={20}
                    max={200}
                  />
                </div>
              </div>

              {/* Paragraph Alignment */}
              <div className="setting-group">
                <label>Paragraph Alignment</label>
                <div className="alignment-selector">
                  {PARAGRAPH_ALIGNMENTS.map((align) => {
                    const Icon = align.icon;
                    return (
                      <button
                        key={align.value}
                        type="button"
                        className={`alignment-option ${options.paragraphAlignment === align.value ? 'selected' : ''}`}
                        onClick={() => updateOption('paragraphAlignment', align.value as any)}
                      >
                        <Icon size={18} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Variation Toggles */}
              <div className="controls-row">
                <ToggleControl
                  label="Line Variation"
                  description="Subtle line position variations"
                  checked={options.lineVariation}
                  onChange={(v) => updateOption('lineVariation', v)}
                />
                <ToggleControl
                  label="Word Variation"
                  description="Natural word spacing variations"
                  checked={options.wordVariation}
                  onChange={(v) => updateOption('wordVariation', v)}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Live Preview */}
      <div className="settings-section">
        <button className="section-header" onClick={() => toggleSection('preview')} type="button">
          <div className="section-title-row">
            <Sun size={20} />
            <h3>Live Preview</h3>
          </div>
          <span className={expandedSections.preview ? 'expanded' : ''}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </button>

        {expandedSections.preview && (
          <div className="section-content">
            <div className="preview-container">
              <div className={`preview-paper preview-paper-${options.paperStyle}`}>
                <div className="preview-text" style={{
                  fontFamily: getPreviewFontFamily(options.style),
                  fontSize: `${16 * options.sizeMultiplier}px`,
                  lineHeight: `${28 * options.spacingMultiplier}px`,
                  letterSpacing: `${0.5 * options.spacingMultiplier}px`,
                  fontWeight: options.thicknessMultiplier > 1.2 ? '600' : options.thicknessMultiplier > 0.8 ? '500' : '400',
                  transform: `skewX(${getStyleSlant(options.style)}deg)`,
                  textAlign: options.paragraphAlignment,
                }}>
                  The quick brown fox jumps over the lazy dog.
                  <br />
                  Handwriting assignment generator creates
                  <br />
                  realistic handwritten documents with AI.
                </div>
              </div>
            </div>
            <p className="preview-note">This preview shows approximate styling. Actual output may vary based on content length and page layout.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper Components
function SliderControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
}) {
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value));
  };

  const handleButtonClick = (delta: number) => {
    const newValue = Math.max(min, Math.min(max, Math.round((value + delta) / step) * step));
    onChange(newValue);
  };

  return (
    <div className="slider-control">
      <div className="slider-header">
        <label>{label}</label>
        <span className="slider-value">{format(value)}</span>
      </div>
      <div className="slider-wrapper">
        <button
          className="slider-btn"
          onClick={() => handleButtonClick(-step)}
          disabled={value <= min}
        >
          <Minus size={16} />
        </button>
        <input
          type="range"
          className="slider-input"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleSliderChange}
        />
        <button
          className="slider-btn"
          onClick={() => handleButtonClick(step)}
          disabled={value >= max}
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
}) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || min;
    onChange(Math.max(min, Math.min(max, val)));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || min;
    onChange(Math.max(min, Math.min(max, val)));
  };

  const handleButtonClick = (delta: number) => {
    const newValue = Math.max(min, Math.min(max, value + delta));
    onChange(newValue);
  };

  return (
    <div className="number-input">
      <label>{label}</label>
      <div className="number-input-wrapper">
        <button
          className="number-input-btn"
          onClick={() => handleButtonClick(-1)}
          disabled={value <= min}
        >
          <Minus size={14} />
        </button>
        <input
          type="number"
          value={value}
          onChange={handleInputChange}
          onBlur={handleBlur}
          min={min}
          max={max}
        />
        <button
          className="number-input-btn"
          onClick={() => handleButtonClick(1)}
          disabled={value >= max}
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

function ToggleControl({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="toggle-control">
      <div className="toggle-info">
        <span className="toggle-label">{label}</span>
        <span className="toggle-desc">{description}</span>
      </div>
      <label className="toggle-switch">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="toggle-slider" />
      </label>
    </div>
  );
}

function getPreviewFontFamily(style: RealisticStyle): string {
  const fonts: Record<RealisticStyle, string> = {
    cursive: "'Patrick Hand', 'Comic Neue', cursive",
    print: "'Instrument Serif', Georgia, serif",
    mixed: "'Patrick Hand', 'Instrument Serif', cursive",
    calligraphy: "'Brush Script MT', 'Segoe Script', cursive",
  };
  return fonts[style];
}

function getStyleSlant(style: RealisticStyle): number {
  const slants: Record<RealisticStyle, number> = {
    cursive: -8,
    print: 0,
    mixed: -4,
    calligraphy: -12,
  };
  return slants[style];
}