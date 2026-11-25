import { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle, Settings, Copy, Star, Edit2 } from 'lucide-react';
import { GenerationSettings, HandwritingMode, RealisticStyle, PenColor, PaperStyle, PageSize } from '../types';
import toast from 'react-hot-toast';

interface GenerationSettingsPanelProps {
  settings: GenerationSettings[];
  activeSettings: GenerationSettings | null;
  isLoading: boolean;
  onCreate: (data: Partial<GenerationSettings>) => Promise<void>;
  onUpdate: (id: string, data: Partial<GenerationSettings>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSetActive: (settings: GenerationSettings | null) => void;
  onDuplicate?: (id: string) => Promise<void>;
  className?: string;
}

const HANDWRITING_SIZES = [
  { value: 'small', label: 'Small', description: 'Compact handwriting' },
  { value: 'medium', label: 'Medium', description: 'Standard handwriting' },
  { value: 'large', label: 'Large', description: 'Large, readable handwriting' },
];

const QUESTION_START_MODES = [
  { value: 'continuous', label: 'Continuous', description: 'Questions flow naturally' },
  { value: 'new-line', label: 'New Line', description: 'Each question on new line' },
  { value: 'new-page', label: 'New Page', description: 'Each question starts on new page' },
];

const PAPER_STYLES: { value: PaperStyle; label: string; description: string }[] = [
  { value: 'ruled', label: 'Ruled', description: 'Traditional lined paper' },
  { value: 'plain', label: 'Plain', description: 'Clean white paper' },
  { value: 'grid', label: 'Grid', description: 'Graph paper style' },
];

const PAGE_SIZES: { value: PageSize; label: string; dimensions: string }[] = [
  { value: 'A4', label: 'A4', dimensions: '210 × 297 mm' },
  { value: 'A5', label: 'A5', dimensions: '148 × 210 mm' },
  { value: 'Letter', label: 'Letter', dimensions: '8.5 × 11 in' },
  { value: 'Legal', label: 'Legal', dimensions: '8.5 × 14 in' },
];

const DEFAULT_SETTINGS: Partial<GenerationSettings> = {
  name: 'New Settings',
  handwritingMode: 'realistic',
  realisticStyle: 'cursive',
  penColor: 'blue',
  handwritingSize: 'medium',
  lineSpacing: 1.0,
  wordSpacing: 1.0,
  characterSpacing: 1.0,
  margins: { top: 80, right: 60, bottom: 80, left: 60 },
  penThickness: 1.0,
  questionStartMode: 'continuous',
  showQuestionNumbers: true,
  showPageNumbers: true,
  paperStyle: 'ruled',
  pageSize: 'A4',
  isDefault: false,
};

export function GenerationSettingsPanel({
  settings,
  activeSettings,
  isLoading,
  onCreate,
  onUpdate,
  onDelete,
  onSetActive,
  onDuplicate,
  className = '',
}: GenerationSettingsPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<GenerationSettings>>(DEFAULT_SETTINGS);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (editingId) {
      const setting = settings.find(s => s.id === editingId);
      if (setting) {
        setEditData({ ...setting });
      }
    } else if (showCreate) {
      setEditData({ ...DEFAULT_SETTINGS, name: `Settings ${settings.length + 1}` });
    }
  }, [editingId, showCreate, settings]);

  const handleStartEdit = (setting: GenerationSettings) => {
    setEditingId(setting.id);
    setShowCreate(false);
  };

  const handleStartCreate = () => {
    setEditingId('new');
    setShowCreate(true);
  };

  const handleCancel = () => {
    setEditingId(null);
    setShowCreate(false);
    setEditData(DEFAULT_SETTINGS);
  };

  const handleSave = async () => {
    try {
      if (showCreate || editingId === 'new') {
        await onCreate(editData);
        toast.success('Settings created');
      } else if (editingId) {
        await onUpdate(editingId, editData);
        toast.success('Settings updated');
      }
      handleCancel();
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete these settings?')) {
      try {
        await onDelete(id);
        toast.success('Settings deleted');
      } catch (error) {
        toast.error('Failed to delete settings');
      }
    }
  };

  const handleDuplicate = async (id: string) => {
    if (onDuplicate) {
      try {
        await onDuplicate(id);
        toast.success('Settings duplicated');
      } catch (error) {
        toast.error('Failed to duplicate settings');
      }
    }
  };

  const updateEditData = <K extends keyof GenerationSettings>(key: K, value: GenerationSettings[K]) => {
    setEditData(prev => ({ ...prev, [key]: value }));
  };

  const updateNestedEditData = <K extends keyof GenerationSettings['margins']>(
    parentKey: 'margins',
    key: K,
    value: GenerationSettings['margins'][K]
  ) => {
    setEditData(prev => ({
      ...prev,
      [parentKey]: { ...(prev[parentKey] ?? { top: 80, right: 60, bottom: 80, left: 60 }), [key]: value },
    }));
  };

  // Render settings list
  if (!editingId && !showCreate) {
    return (
      <div className={`generation-settings-panel ${className}`}>
        <div className="panel-header">
          <h3>
            <Settings size={20} />
            Generation Settings
          </h3>
          <button className="btn-create" onClick={handleStartCreate} disabled={isLoading}>
            <Plus size={18} />
            Create New
          </button>
        </div>

        {settings.length === 0 ? (
          <div className="empty-state">
            <Settings size={48} />
            <h4>No Generation Settings</h4>
            <p>Create your first generation settings to customize handwriting output</p>
            <button className="btn-primary" onClick={handleStartCreate}>
              <Plus size={18} />
              Create Settings
            </button>
          </div>
        ) : (
          <div className="settings-list">
            {settings.map((setting) => (
              <div key={setting.id} className={`settings-card ${activeSettings?.id === setting.id ? 'active' : ''}`}>
                <div className="settings-card-header">
                  <div className="settings-info">
                    <div className="settings-name-row">
                      <h4>{setting.name}</h4>
                      {setting.isDefault && (
                        <span className="default-badge">
                          <Star size={14} fill="currentColor" />
                          Default
                        </span>
                      )}
                      {activeSettings?.id === setting.id && (
                        <span className="active-badge">Active</span>
                      )}
                    </div>
                    {setting.description && (
                      <p className="settings-description">{setting.description}</p>
                    )}
                    <div className="settings-meta">
                      <span className="meta-item">
                        <span className="meta-label">Mode:</span>
                        <span className="meta-value mode-{setting.handwritingMode}">{setting.handwritingMode}</span>
                      </span>
                      {setting.handwritingMode === 'realistic' && (
                        <>
                          <span className="meta-item">
                            <span className="meta-label">Style:</span>
                            <span className="meta-value">{setting.realisticStyle}</span>
                          </span>
                          <span className="meta-item">
                            <span className="meta-label">Ink:</span>
                            <span className="meta-value color-{setting.penColor}">{setting.penColor}</span>
                          </span>
                        </>
                      )}
                      <span className="meta-item">
                        <span className="meta-label">Size:</span>
                        <span className="meta-value">{setting.handwritingSize}</span>
                      </span>
                      <span className="meta-item">
                        <span className="meta-label">Paper:</span>
                        <span className="meta-value">{setting.paperStyle} ({setting.pageSize})</span>
                      </span>
                    </div>
                  </div>
                  <div className="settings-actions">
                    {activeSettings?.id !== setting.id && (
                      <button
                        className="action-btn"
                        onClick={() => onSetActive(setting)}
                        title="Set as active"
                        disabled={isLoading}
                      >
                        <CheckCircle size={16} />
                      </button>
                    )}
                    <button
                      className="action-btn"
                      onClick={() => handleStartEdit(setting)}
                      title="Edit"
                      disabled={isLoading}
                    >
                      <Edit2 size={16} />
                    </button>
                    {onDuplicate && (
                      <button
                        className="action-btn"
                        onClick={() => handleDuplicate(setting.id)}
                        title="Duplicate"
                        disabled={isLoading}
                      >
                        <Copy size={16} />
                      </button>
                    )}
                    {settings.length > 1 && (
                      <button
                        className="action-btn danger"
                        onClick={() => handleDelete(setting.id)}
                        title="Delete"
                        disabled={isLoading || setting.isDefault}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Render edit/create form
  return (
    <div className={`generation-settings-panel ${className} editing`}>
      <div className="panel-header">
        <h3>{showCreate ? 'Create Settings' : 'Edit Settings'}</h3>
        <div className="header-actions">
          <button className="btn-secondary" onClick={handleCancel} disabled={isLoading}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={isLoading || !editData.name?.trim()}>
            {isLoading ? 'Saving...' : (showCreate ? 'Create' : 'Save')}
          </button>
        </div>
      </div>

      <div className="settings-form">
        <div className="form-section">
          <h4>Basic Information</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                value={editData.name || ''}
                onChange={(e) => updateEditData('name', e.target.value)}
                placeholder="My Handwriting Settings"
                required
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <input
                type="text"
                value={editData.description || ''}
                onChange={(e) => updateEditData('description', e.target.value)}
                placeholder="Optional description"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h4>Handwriting Mode</h4>
          <div className="mode-selector">
            {(['personal', 'realistic'] as HandwritingMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`mode-option ${editData.handwritingMode === mode ? 'selected' : ''}`}
                onClick={() => updateEditData('handwritingMode', mode)}
              >
                {mode === 'personal' ? 'Personal Handwriting' : 'Realistic Handwriting'}
              </button>
            ))}
          </div>
        </div>

        {/* Realistic-specific settings */}
        {editData.handwritingMode === 'realistic' && (
          <>
            <div className="form-section">
              <h4>Realistic Style Options</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>Style</label>
                  <div className="select-grid">
                    {(['cursive', 'print', 'mixed', 'calligraphy'] as RealisticStyle[]).map((style) => (
                      <button
                        key={style}
                        type="button"
                        className={`style-option ${editData.realisticStyle === style ? 'selected' : ''}`}
                        onClick={() => updateEditData('realisticStyle', style)}
                      >
                        {style.charAt(0).toUpperCase() + style.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label>Pen Color</label>
                  <div className="select-grid">
                    {(['blue', 'black'] as PenColor[]).map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`color-option ${editData.penColor === color ? 'selected' : ''}`}
                        onClick={() => updateEditData('penColor', color)}
                      >
                        <span className="color-swatch" style={{ backgroundColor: color === 'blue' ? '#1e3a5f' : '#1a1a2e' }} />
                        {color.charAt(0).toUpperCase() + color.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4>Handwriting Appearance</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>Size</label>
                  <select
                    value={editData.handwritingSize || 'medium'}
                    onChange={(e) => updateEditData('handwritingSize', e.target.value as any)}
                  >
                    {HANDWRITING_SIZES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Line Spacing</label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={editData.lineSpacing || 1}
                    onChange={(e) => updateEditData('lineSpacing', parseFloat(e.target.value))}
                  />
                  <span className="range-value">{editData.lineSpacing?.toFixed(1)}x</span>
                </div>
                <div className="form-group">
                  <label>Word Spacing</label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={editData.wordSpacing || 1}
                    onChange={(e) => updateEditData('wordSpacing', parseFloat(e.target.value))}
                  />
                  <span className="range-value">{editData.wordSpacing?.toFixed(1)}x</span>
                </div>
                <div className="form-group">
                  <label>Character Spacing</label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={editData.characterSpacing || 1}
                    onChange={(e) => updateEditData('characterSpacing', parseFloat(e.target.value))}
                  />
                  <span className="range-value">{editData.characterSpacing?.toFixed(1)}x</span>
                </div>
                <div className="form-group">
                  <label>Pen Thickness</label>
                  <input
                    type="range"
                    min="0.3"
                    max="3"
                    step="0.1"
                    value={editData.penThickness || 1}
                    onChange={(e) => updateEditData('penThickness', parseFloat(e.target.value))}
                  />
                  <span className="range-value">{editData.penThickness?.toFixed(1)}x</span>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="form-section">
          <h4>Page Layout</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Question Start Mode</label>
              <select
                value={editData.questionStartMode || 'continuous'}
                onChange={(e) => updateEditData('questionStartMode', e.target.value as any)}
              >
                {QUESTION_START_MODES.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Paper Style</label>
              <select
                value={editData.paperStyle || 'ruled'}
                onChange={(e) => updateEditData('paperStyle', e.target.value as any)}
              >
                {PAPER_STYLES.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Page Size</label>
              <select
                value={editData.pageSize || 'A4'}
                onChange={(e) => updateEditData('pageSize', e.target.value as any)}
              >
                {PAGE_SIZES.map(p => (
                  <option key={p.value} value={p.value}>{p.label} ({p.dimensions})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Show Question Numbers</label>
              <div className="checkbox-wrapper">
                <input
                  type="checkbox"
                  checked={editData.showQuestionNumbers ?? true}
                  onChange={(e) => updateEditData('showQuestionNumbers', e.target.checked)}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Show Page Numbers</label>
              <div className="checkbox-wrapper">
                <input
                  type="checkbox"
                  checked={editData.showPageNumbers ?? true}
                  onChange={(e) => updateEditData('showPageNumbers', e.target.checked)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h4>Margins (pixels)</h4>
          <div className="margins-grid">
            {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
              <div key={side} className="form-group">
                <label>{side.charAt(0).toUpperCase() + side.slice(1)}</label>
                <input
                  type="number"
                  value={editData.margins?.[side] || 60}
                  onChange={(e) => updateNestedEditData('margins', side, parseInt(e.target.value) || 60)}
                  min="20"
                  max="200"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="form-section">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={editData.isDefault || false}
              onChange={(e) => updateEditData('isDefault', e.target.checked)}
            />
            Set as default settings
          </label>
        </div>
      </div>
    </div>
  );
}