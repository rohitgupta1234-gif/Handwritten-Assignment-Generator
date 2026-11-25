import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Upload,
  Image,
  Check,
  X,
  Brain,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Settings,
  Sparkles,
  Plus,
  FileText,
  Layers,
  Palette,
  Pen,
  PenTool,
  Zap,
} from 'lucide-react';
import { useHandwriting } from '../context/HandwritingContext';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Progress } from '../components/ui/Progress';
import { isValidImageFile, isValidPdfFile, createObjectUrl, revokeObjectUrl } from '../utils/helpers';
import { HandwritingProfile, HandwritingCharacteristics, HandwritingMode, RealisticStyle, PenColor, RealisticHandwritingOptions } from '../types';
import { toast } from 'react-hot-toast';
import { HandwritingModeSelector } from '../components/HandwritingModeSelector';
import { MultiSampleUploader } from '../components/MultiSampleUploader';
import { RealisticHandwritingSettings } from '../components/RealisticHandwritingSettings';
import { sanitizeHtml, escapeHtml } from '../utils/sanitize';

// Helper to map HandwritingProfile status to StatusBadge status
function mapProfileStatusToBadgeStatus(status: HandwritingProfile['status']): 'draft' | 'generating' | 'preview' | 'completed' | 'failed' {
  switch (status) {
    case 'pending': return 'draft';
    case 'analyzing': return 'generating';
    case 'completed': return 'completed';
    case 'failed': return 'failed';
    default: return 'draft';
  }
}

const characteristicLabels: Record<keyof HandwritingCharacteristics, { label: string; unit: string; icon: React.ComponentType<{ className?: string }> }> = {
  letterHeight: { label: 'Letter Height', unit: 'mm', icon: Settings },
  letterWidth: { label: 'Letter Width', unit: 'mm', icon: Settings },
  capitalHeight: { label: 'Capital Height', unit: 'mm', icon: Settings },
  smallHeight: { label: 'Small Letter Height', unit: 'mm', icon: Settings },
  characterSpacing: { label: 'Character Spacing', unit: 'mm', icon: Settings },
  wordSpacing: { label: 'Word Spacing', unit: 'mm', icon: Settings },
  lineSpacing: { label: 'Line Spacing', unit: 'mm', icon: Settings },
  writingAngle: { label: 'Writing Angle', unit: '°', icon: Settings },
  penThickness: { label: 'Pen Thickness', unit: 'mm', icon: Settings },
  baselineAlignment: { label: 'Baseline Alignment', unit: '%', icon: Settings },
  paragraphSpacing: { label: 'Paragraph Spacing', unit: 'mm', icon: Settings },
  avgWordsPerLine: { label: 'Words per Line', unit: '', icon: Settings },
  pageMargins: { label: 'Page Margins', unit: '', icon: Settings },
  slantDirection: { label: 'Slant Direction', unit: '', icon: Settings },
  pressureVariation: { label: 'Pressure Variation', unit: '%', icon: Settings },
  connectedness: { label: 'Connectedness', unit: '%', icon: Settings },
};

export function HandwritingProfilePage() {
  const [searchParams] = useSearchParams();
  const {
    profiles,
    activeProfile,
    samples,
    isSamplesLoading,
    createProfile,
    updateProfile,
    deleteProfile,
    setActiveProfile,
    fetchProfiles,
    analyzeHandwriting,
    addSample,
    removeSample,
    setPrimarySample,
    analyzeMultiSample,
    fetchSamples,
    getDefaultRealisticOptions,
  } = useHandwriting();

  const [currentStep, setCurrentStep] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisResults, setAnalysisResults] = useState<HandwritingCharacteristics | null>(null);
  const [editingProfile, setEditingProfile] = useState<HandwritingProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<HandwritingProfile | null>(null);
  const [generatedSample, setGeneratedSample] = useState<string>('');
  const [sampleText, setSampleText] = useState('The quick brown fox jumps over the lazy dog.');
  const [analyzingProfileId, setAnalyzingProfileId] = useState<string | null>(null);

  // New dual handwriting system state
  const [handwritingMode, setHandwritingMode] = useState<HandwritingMode>('personal');
  const [realisticOptions, setRealisticOptions] = useState<RealisticHandwritingOptions>(getDefaultRealisticOptions());
  const [newProfileMode, setNewProfileMode] = useState<HandwritingMode>('personal');

  // Helper functions for updating realistic options
  const updateRealisticStyle = (style: RealisticStyle) => {
    setRealisticOptions((prev: RealisticHandwritingOptions) => ({ ...prev, style }));
  };
  const updatePenColor = (color: PenColor) => {
    setRealisticOptions((prev: RealisticHandwritingOptions) => ({ ...prev, penColor: color }));
  };

  const action = searchParams.get('action');

  useEffect(() => {
    if (action === 'update' && activeProfile) {
      setEditingProfile(activeProfile);
      setEditName(activeProfile.name);
    } else if (!activeProfile && profiles.length > 0) {
      setActiveProfile(profiles[0]);
    }
  }, [action, activeProfile, profiles, setActiveProfile]);

  // Load samples when profile changes
  useEffect(() => {
    if (activeProfile && handwritingMode === 'personal') {
      fetchSamples(activeProfile.id);
    }
  }, [activeProfile, handwritingMode, fetchSamples]);

  // Load profile's mode and realistic options
  useEffect(() => {
    if (activeProfile) {
      setHandwritingMode(activeProfile.mode || 'personal');
      if (activeProfile.realisticStyle && activeProfile.penColor) {
        setRealisticOptions((prev: RealisticHandwritingOptions) => ({
          ...prev,
          style: activeProfile.realisticStyle || 'cursive',
          penColor: activeProfile.penColor || 'blue',
        }));
      }
    }
  }, [activeProfile]);

  const handleFileSelect = (file: File) => {
    if (!isValidImageFile(file) && !isValidPdfFile(file)) {
      toast.error('Please upload a valid image (JPG, PNG) or PDF file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }
    setUploadedFile(file);
    setPreviewUrl(createObjectUrl(file));
    setCurrentStep(1);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const removeFile = () => {
    if (previewUrl) revokeObjectUrl(previewUrl);
    setUploadedFile(null);
    setPreviewUrl(null);
    setAnalysisResults(null);
    setAnalyzingProfileId(null);
    setCurrentStep(0);
  };

  const startAnalysis = async () => {
    if (!uploadedFile) return;

    setAnalysisProgress(0);

    try {
      // Step 1: Create profile with uploaded image
      const newProfile = await createProfile(uploadedFile, {
        mode: newProfileMode,
        realisticStyle: newProfileMode === 'realistic' ? realisticOptions.style : undefined,
        penColor: newProfileMode === 'realistic' ? realisticOptions.penColor : undefined,
      });
      setAnalyzingProfileId(newProfile.id);
      setAnalysisProgress(30);

      if (newProfileMode === 'personal') {
        // Step 2: Analyze the handwriting for personal mode
        const analyzedProfile = await analyzeHandwriting(newProfile.id);
        setAnalysisProgress(70);

        // Step 3: Fetch updated profiles
        await fetchProfiles();
        setAnalysisProgress(100);

        if (analyzedProfile && analyzedProfile.characteristics) {
          setAnalysisResults(analyzedProfile.characteristics);
          generateHandwritingSample(analyzedProfile.characteristics);
          setCurrentStep(2);
        } else {
          toast.error('Analysis in progress, please wait and try viewing results again');
        }
      } else {
        // For realistic mode, profile is created with style options
        await fetchProfiles();
        setAnalysisProgress(100);
        setAnalysisResults(null); // Realistic mode doesn't need analysis
        setCurrentStep(4); // Skip to success
      }
    } catch (error) {
      toast.error('Failed to analyze handwriting');
      console.error('Analysis error:', error);
    }
  };

  const generateHandwritingSample = (characteristics: HandwritingCharacteristics) => {
    const baseFontSize = 18;
    const baseLineHeight = 32;

    const heightScale = characteristics.letterHeight / 4.2;
    const lineScale = characteristics.lineSpacing / 8.5;
    const charSpacingScale = characteristics.characterSpacing / 0.8;
    const wordSpacingScale = characteristics.wordSpacing / 4.2;
    const penThickness = characteristics.penThickness > 0.8 ? '500' : characteristics.penThickness > 0.5 ? '400' : '300';
    const connectednessFactor = 1 - (characteristics.connectedness / 100) * 0.3;

    const fontSize = baseFontSize * heightScale;
    const lineHeight = baseLineHeight * lineScale;
    const letterSpacing = 0.5 * charSpacingScale * connectednessFactor;
    const wordSpacing = 4 * wordSpacingScale;

    const style = `
      font-family: 'HandwriteAI Handwriting', 'Patrick Hand', 'Comic Neue', 'Brush Script MT', 'Segoe Script', 'Comic Sans MS', cursive;
      font-size: ${fontSize}px;
      line-height: ${lineHeight}px;
      letter-spacing: ${letterSpacing}px;
      word-spacing: ${wordSpacing}px;
      font-weight: ${penThickness};
      transform: skewX(${characteristics.writingAngle}deg);
      color: #1e293b;
    `;

    // Sanitize user input before inserting into HTML
    const safeSampleText = escapeHtml(sampleText);

    setGeneratedSample(`
      <div class="notebook-page p-8" style="${style}">
        <p>${safeSampleText}</p>
        <p>Handwriting analysis complete. Your unique style has been captured.</p>
        <p>Letter height: ${characteristics.letterHeight.toFixed(1)}mm | Word spacing: ${characteristics.wordSpacing.toFixed(1)}mm</p>
      </div>
    `);
  };

  const approveProfile = async () => {
    if (!analysisResults || !analyzingProfileId) return;

    try {
      await updateProfile(analyzingProfileId, { isActive: true });
      toast.success('Handwriting profile created and set as active!');
      setCurrentStep(3);
      await fetchProfiles();
      setAnalyzingProfileId(null);
    } catch (error) {
      toast.error('Failed to save profile');
    }
  };

  const requestNewSample = () => {
    removeFile();
    toast('Please upload a new handwriting sample', { icon: 'ℹ️' });
  };

  const handleDeleteProfile = async (profile: HandwritingProfile) => {
    try {
      await deleteProfile(profile.id);
      toast.success('Profile deleted');
    } catch (error) {
      toast.error('Failed to delete profile');
    }
    setShowDeleteConfirm(null);
  };

  const handleUpdateProfile = async () => {
    if (!editingProfile) return;
    try {
      await updateProfile(editingProfile.id, { name: editName });
      toast.success('Profile updated');
      setEditingProfile(null);
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  const handleGenerateNewSample = async () => {
    if (!activeProfile) return;
    try {
      toast.loading('Generating new sample...', { id: 'generate-sample' });
      await new Promise(resolve => setTimeout(resolve, 500));
      if (analysisResults) {
        generateHandwritingSample(analysisResults);
      }
      toast.success('New sample generated!', { id: 'generate-sample' });
    } catch (error) {
      toast.error('Failed to generate sample', { id: 'generate-sample' });
    }
  };

  // Render different views based on state
  if (profiles.length === 0 && !uploadedFile) {
    return <InitialUploadView onFileSelect={handleFileSelect} onDragOver={handleDragOver} onDrop={handleDrop} />;
  }

  if (currentStep > 0) {
    return (
      <AnalysisFlowView
        currentStep={currentStep}
        previewUrl={previewUrl}
        analysisProgress={analysisProgress}
        analysisResults={analysisResults}
        generatedSample={generatedSample}
        sampleText={sampleText}
        setSampleText={setSampleText}
        onRemoveFile={removeFile}
        onStartAnalysis={startAnalysis}
        onApprove={approveProfile}
        onRequestNew={requestNewSample}
        setCurrentStep={setCurrentStep}
        handwritingMode={newProfileMode}
        setHandwritingMode={setNewProfileMode}
        realisticOptions={realisticOptions}
        updateRealisticStyle={updateRealisticStyle}
        updatePenColor={updatePenColor}
      />
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Handwriting Mode Selector for New Profiles */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pen className="w-5 h-5" />
            Handwriting Mode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <HandwritingModeSelector
            mode={newProfileMode}
            onModeChange={setNewProfileMode}
            realisticStyle={realisticOptions.style}
            onRealisticStyleChange={updateRealisticStyle}
            penColor={realisticOptions.penColor}
            onPenColorChange={updatePenColor}
          />
        </CardContent>
      </Card>

      {/* Profile List */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-3xl text-notebook-ink-50">Handwriting Profiles</h1>
            <p className="text-notebook-blue-600 mt-1">Manage your personalized handwriting profiles</p>
          </div>
          <Button onClick={() => { removeFile(); setCurrentStep(1); }} leftIcon={<Plus className="w-4 h-4" />}>
            New Profile
          </Button>
        </div>

        {profiles.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {profiles.map(profile => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                isActive={activeProfile?.id === profile.id}
                onSetActive={() => {
                  setActiveProfile(profile);
                  setHandwritingMode(profile.mode || 'personal');
                  if (profile.realisticStyle && profile.penColor) {
                    setRealisticOptions((prev: RealisticHandwritingOptions) => ({
                      ...prev,
                      style: profile.realisticStyle || 'cursive',
                      penColor: profile.penColor || 'blue',
                    }));
                  }
                }}
                onEdit={() => { setEditingProfile(profile); setEditName(profile.name); }}
                onDelete={() => setShowDeleteConfirm(profile)}
                onGenerateSample={() => { setActiveProfile(profile); handleGenerateNewSample(); }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Active Profile Details */}
      {activeProfile && (
        <div className="space-y-6">
          {/* Profile Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-notebook-purple-500 to-notebook-purple-600 flex items-center justify-center">
                    {activeProfile.mode === 'personal' ? <PenTool className="w-7 h-7 text-white" /> : <Zap className="w-7 h-7 text-white" />}
                  </div>
                  <div>
                    <h2 className="font-heading text-2xl text-notebook-ink-50">{activeProfile.name}</h2>
                    <div className="flex items-center gap-3 mt-1">
                      <Badge variant={activeProfile.status === 'completed' ? 'success' : 'info'} dot>
                        {activeProfile.status}
                      </Badge>
                      <Badge variant={activeProfile.mode === 'personal' ? 'secondary' : 'primary'} dot>
                        {activeProfile.mode === 'personal' ? '👤 Personal' : '✨ Realistic'}
                      </Badge>
                      {activeProfile.isActive && <Badge variant="primary" dot>Active</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setEditingProfile(activeProfile); setEditName(activeProfile.name); }} leftIcon={<Edit className="w-4 h-4" />}>
                    Edit
                  </Button>
                  <Button variant="outline" onClick={handleGenerateNewSample} leftIcon={<Sparkles className="w-4 h-4" />}>
                    Generate Sample
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Mode-specific content */}
          {activeProfile.mode === 'personal' && (
            <>
              {/* Multi-Sample Uploader */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="w-5 h-5" />
                    Handwriting Samples ({samples.length}/5)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <MultiSampleUploader
                    samples={samples}
                    isLoading={isSamplesLoading}
                    onAddSample={async (file, isPrimary) => { if (activeProfile) await addSample(activeProfile.id, file, isPrimary); }}
                    onRemoveSample={async (sampleId) => { await removeSample(sampleId); }}
                    onSetPrimary={async (sampleId) => { if (activeProfile) await setPrimarySample(activeProfile.id, sampleId); }}
                    onAnalyzeMulti={async () => { if (activeProfile) await analyzeMultiSample(activeProfile.id); }}
                    maxSamples={5}
                  />
                </CardContent>
              </Card>

              {/* Characteristics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    Analyzed Characteristics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analysisResults ? (
                    <CharacteristicsGrid characteristics={analysisResults} />
                  ) : (
                    <CharacteristicsGrid characteristics={activeProfile.characteristics} />
                  )}
                </CardContent>
              </Card>

              {/* Sample Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Handwriting Sample
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="notebook-page p-6 min-h-[300px] font-notebook" style={{ fontSize: '18px', lineHeight: '32px' }}>
                    {generatedSample ? (
                      <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(generatedSample) }} />
                    ) : (
                      <div className="text-center text-notebook-blue-400 py-20">
                        <Brain className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p>Generate a sample to see your handwriting</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 space-y-2">
                    <Textarea
                      value={sampleText}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => { setSampleText(e.target.value); if (analysisResults) generateHandwritingSample(analysisResults); }}
                      placeholder="Type text to see it in your handwriting..."
                      rows={3}
                    />
                    <Button onClick={handleGenerateNewSample} leftIcon={<Sparkles className="w-4 h-4" />}>
                      Generate New Sample
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeProfile.mode === 'realistic' && (
            <>
              {/* Realistic Handwriting Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    Realistic Handwriting Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RealisticHandwritingSettings
                    options={realisticOptions}
                    onChange={setRealisticOptions}
                    showAdvanced={true}
                  />
                </CardContent>
              </Card>

              {/* Quick Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Style Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="notebook-page p-6 min-h-[200px] font-notebook" style={{
                    fontFamily: realisticOptions.style === 'print' ? "'Instrument Serif', Georgia, serif" : "'Patrick Hand', 'Comic Neue', cursive",
                    fontSize: `${16 * realisticOptions.sizeMultiplier}px`,
                    lineHeight: `${28 * realisticOptions.spacingMultiplier}px`,
                    letterSpacing: `${0.5 * realisticOptions.spacingMultiplier}px`,
                    fontWeight: realisticOptions.thicknessMultiplier > 1.2 ? '600' : realisticOptions.thicknessMultiplier > 0.8 ? '500' : '400',
                    transform: `skewX(${realisticOptions.style === 'cursive' ? -8 : realisticOptions.style === 'calligraphy' ? -12 : realisticOptions.style === 'mixed' ? -4 : 0}deg)`,
                    color: realisticOptions.penColor === 'blue' ? '#1e3a5f' : '#1a1a2e',
                    textAlign: realisticOptions.paragraphAlignment,
                  }}>
                    <p>The quick brown fox jumps over the lazy dog.</p>
                    <p>Realistic handwriting with {realisticOptions.style} style and {realisticOptions.penColor} ink.</p>
                  </div>
                  <p className="text-sm text-notebook-blue-500 mt-2">Adjust settings above to see live preview changes</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Edit Profile Modal */}
      <Modal
        isOpen={!!editingProfile}
        onClose={() => setEditingProfile(null)}
        title="Edit Profile"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Profile Name"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            placeholder="My Handwriting"
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEditingProfile(null)}>Cancel</Button>
            <Button onClick={handleUpdateProfile}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        title="Delete Profile"
        size="sm"
      >
        <div className="space-y-4">
          <p>Are you sure you want to delete <strong>{showDeleteConfirm?.name}</strong>? This action cannot be undone.</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => handleDeleteProfile(showDeleteConfirm!)}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Initial Upload View
function InitialUploadView({
  onFileSelect,
  onDragOver,
  onDrop,
}: {
  onFileSelect: (file: File) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-12">
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-notebook-blue-500 to-notebook-purple-600 flex items-center justify-center mx-auto mb-6">
          <Upload className="w-12 h-12 text-white" />
        </div>
        <h1 className="font-heading text-3xl text-notebook-ink-50 mb-3">Create Your Handwriting Profile</h1>
        <p className="text-notebook-blue-600 text-lg">
          Choose your handwriting mode and upload samples to create a personalized profile for generating authentic handwritten assignments.
        </p>
      </div>

      <Card variant="notebook" padding="xl">
        <div
          className="upload-zone"
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={e => e.target.files?.[0] && onFileSelect(e.target.files[0])}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-notebook-blue-100 flex items-center justify-center">
              <Image className="w-10 h-10 text-notebook-blue-500" />
            </div>
            <div>
              <p className="font-medium text-notebook-ink-50 text-lg">Drop your handwriting sample here</p>
              <p className="text-notebook-blue-500 mt-1">or click to browse</p>
            </div>
            <p className="text-sm text-notebook-blue-400">Supports JPG, PNG, PDF (max 10MB)</p>
          </div>
        </div>

        <div className="mt-8 p-4 bg-notebook-blue-50 rounded-xl">
          <h4 className="font-medium text-notebook-blue-800 mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Tips for Best Results
          </h4>
          <ul className="space-y-2 text-sm text-notebook-blue-600">
            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Use a full A4 or Letter page</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Write naturally with your normal pen</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Include all letters (A-Z, a-z), numbers, and punctuation</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Ensure good lighting and flat surface</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Avoid shadows and skewed angles</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Upload 3-5 samples for best personal handwriting results</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}

// Analysis Flow View
function AnalysisFlowView({
  currentStep,
  previewUrl,
  analysisProgress,
  analysisResults,
  generatedSample,
  sampleText,
  setSampleText,
  onRemoveFile,
  onStartAnalysis,
  onApprove,
  onRequestNew,
  setCurrentStep,
  handwritingMode,
  setHandwritingMode,
  realisticOptions,
  updateRealisticStyle,
  updatePenColor,
}: {
  currentStep: number;
  previewUrl: string | null;
  analysisProgress: number;
  analysisResults: HandwritingCharacteristics | null;
  generatedSample: string;
  sampleText: string;
  setSampleText: (text: string) => void;
  onRemoveFile: () => void;
  onStartAnalysis: () => void;
  onApprove: () => void;
  onRequestNew: () => void;
  setCurrentStep: (step: number) => void;
  handwritingMode: HandwritingMode;
  setHandwritingMode: (mode: HandwritingMode) => void;
  realisticOptions: RealisticHandwritingOptions;
  updateRealisticStyle: (style: RealisticStyle) => void;
  updatePenColor: (color: PenColor) => void;
}) {
  const stepNames = ['Upload', 'Analyze', 'Review', 'Approve'];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {stepNames.map((step, index) => (
            <div key={step} className="flex items-center">
              <div className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  currentStep > index
                    ? 'bg-green-500 text-white'
                    : currentStep === index
                    ? 'bg-notebook-blue-500 text-white'
                    : 'bg-notebook-blue-100 text-notebook-blue-400'
                }`}>
                  {currentStep > index ? <Check className="w-5 h-5" /> : index + 1}
                </div>
                <span className={`hidden sm:block font-medium ${currentStep >= index ? 'text-notebook-ink-50' : 'text-notebook-blue-400'}`}>
                  {step}
                </span>
                {index < stepNames.length - 1 && (
                  <div className={`w-16 h-0.5 mx-2 ${currentStep > index ? 'bg-green-500' : 'bg-notebook-blue-100'}`} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {currentStep === 1 && (
        // Step 1: Upload Confirmation with Mode Selection
        <div className="space-y-6">
          <Card variant="notebook" padding="xl">
            <div className="text-center">
              <h2 className="font-heading text-2xl text-notebook-ink-50 mb-4">Confirm Your Sample</h2>
              <p className="text-notebook-blue-600 mb-6">Please verify this is a clear, complete page of your handwriting</p>

              {previewUrl && (
                <div className="relative inline-block max-w-2xl mb-6">
                  <img src={previewUrl} alt="Handwriting sample" className="rounded-xl shadow-lg max-w-full" />
                </div>
              )}

              {/* Mode selector for new profile */}
              <div className="mb-6 p-4 bg-notebook-blue-50 rounded-xl">
                <h4 className="font-medium text-notebook-ink-50 mb-3">Select Handwriting Mode</h4>
                <HandwritingModeSelector
                  mode={handwritingMode}
                  onModeChange={setHandwritingMode}
                  realisticStyle={realisticOptions.style}
                  onRealisticStyleChange={updateRealisticStyle}
                  penColor={realisticOptions.penColor}
                  onPenColorChange={updatePenColor}
                />
              </div>

              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={onRemoveFile} leftIcon={<X className="w-4 h-4" />}>
                  Remove
                </Button>
                <Button onClick={onStartAnalysis} leftIcon={<Brain className="w-4 h-4" />} size="lg">
                  {handwritingMode === 'personal' ? 'Analyze Handwriting' : 'Create Realistic Profile'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {currentStep === 2 && handwritingMode === 'personal' && (
        // Step 2: Analysis Progress (Personal mode only)
        <Card variant="notebook" padding="xl">
          <div className="text-center">
            <h2 className="font-heading text-2xl text-notebook-ink-50 mb-4">Analyzing Your Handwriting</h2>
            <p className="text-notebook-blue-600 mb-6">Our AI is examining letter shapes, spacing, slant, and natural variations</p>

            <div className="max-w-md mx-auto mb-8">
              <Progress
                value={analysisProgress}
                size="lg"
                showLabel
                label="Analysis Progress"
                variant="primary"
                animated
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              {[
                { label: 'Letters', icon: 'Aa', count: '52+' },
                { label: 'Words', icon: '📝', count: '100+' },
                { label: 'Lines', icon: '☰', count: '20+' },
                { label: 'Features', icon: '🔍', count: '16' },
              ].map((item, i) => (
                <div key={i} className="p-4 bg-notebook-blue-50 rounded-xl">
                  <div className="text-2xl font-heading text-notebook-blue-600 mb-1">{item.icon}</div>
                  <p className="font-medium text-notebook-ink-50">{item.label}</p>
                  <p className="text-sm text-notebook-blue-500">{item.count} analyzed</p>
                </div>
              ))}
            </div>

            {analysisProgress === 100 && (
              <Button onClick={() => setCurrentStep(3)} className="mt-6" size="lg" rightIcon={<ChevronRight className="w-4 h-4" />}>
                View Results
              </Button>
            )}
          </div>
        </Card>
      )}

      {currentStep === 2 && handwritingMode === 'realistic' && (
        // Step 2: Realistic Profile Created
        <Card variant="notebook" padding="xl" className="max-w-2xl mx-auto text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="font-heading text-2xl text-notebook-ink-50 mb-3">Realistic Profile Created!</h2>
          <p className="text-notebook-blue-600 mb-6">Your realistic handwriting profile is ready with {realisticOptions.style} style and {realisticOptions.penColor} ink.</p>
          <Button onClick={() => setCurrentStep(4)} className="mt-4" size="lg" rightIcon={<ChevronRight className="w-4 h-4" />}>
            Continue
          </Button>
        </Card>
      )}

      {currentStep === 3 && analysisResults && (
        // Step 3: Review Results (Personal mode)
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Analysis Complete
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-notebook-ink-50 mb-4">Key Characteristics</h4>
                  <CharacteristicsGrid characteristics={analysisResults} />
                </div>
                <div>
                  <h4 className="font-medium text-notebook-ink-50 mb-4">Generated Sample</h4>
                  <div className="notebook-page p-6 min-h-[200px] font-notebook" style={{ fontSize: '18px', lineHeight: '32px' }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(generatedSample) }} />
                  <Textarea
                    value={sampleText}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSampleText(e.target.value)}
                    placeholder="Test your handwriting..."
                    rows={2}
                    className="mt-4"
                  />
                </div>
              </div>
            </CardContent>
            </Card>

          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={onRequestNew} leftIcon={<RefreshCw className="w-4 h-4" />}>
              Request New Analysis
            </Button>
            <Button onClick={onApprove} leftIcon={<Check className="w-4 h-4" />} size="lg">
              Approve & Save Profile
            </Button>
          </div>
        </div>
      )}

      {currentStep === 4 && (
        // Step 4: Success
        <Card variant="notebook" padding="xl" className="max-w-md mx-auto text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="font-heading text-2xl text-notebook-ink-50 mb-3">Profile Created!</h2>
          <p className="text-notebook-blue-600 mb-6">Your handwriting profile is ready to use for generating assignments.</p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" asChild leftIcon={<Eye className="w-4 h-4" />}>
              <a href="/dashboard">Go to Dashboard</a>
            </Button>
            <Button asChild leftIcon={<FileText className="w-4 h-4" />}>
              <a href="/create-assignment">Create Assignment</a>
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

// Profile Card
function ProfileCard({
  profile,
  isActive,
  onSetActive,
  onEdit,
  onDelete,
  onGenerateSample,
}: {
  profile: HandwritingProfile;
  isActive: boolean;
  onSetActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onGenerateSample: () => void;
}) {
  return (
    <Card variant="hover" padding="lg" className={isActive ? 'ring-2 ring-notebook-blue-500' : ''}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-notebook-purple-500 to-notebook-purple-600 flex items-center justify-center">
            {profile.mode === 'personal' ? <PenTool className="w-6 h-6 text-white" /> : <Zap className="w-6 h-6 text-white" />}
          </div>
          <div>
            <h3 className="font-medium text-notebook-ink-50">{profile.name}</h3>
            <StatusBadge status={mapProfileStatusToBadgeStatus(profile.status)} size="sm" />
          </div>
        </div>
        {isActive && (
          <Badge variant="primary" size="sm" dot>Active</Badge>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
        <div className="p-3 bg-notebook-blue-50 rounded-lg">
          <p className="text-notebook-blue-500">Letter Height</p>
          <p className="font-medium text-notebook-ink-50">{profile.characteristics.letterHeight.toFixed(1)}mm</p>
        </div>
        <div className="p-3 bg-notebook-purple-50 rounded-lg">
          <p className="text-notebook-purple-500">Word Spacing</p>
          <p className="font-medium text-notebook-ink-50">{profile.characteristics.wordSpacing.toFixed(1)}mm</p>
        </div>
        <div className="p-3 bg-green-50 rounded-lg">
          <p className="text-green-500">Line Spacing</p>
          <p className="font-medium text-notebook-ink-50">{profile.characteristics.lineSpacing.toFixed(1)}mm</p>
        </div>
      </div>

      {profile.mode === 'realistic' && (
        <div className="mb-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <Palette className="w-4 h-4 text-purple-500" />
            <span className="font-medium text-purple-700">Style: </span>
            <span className="text-purple-600 capitalize">{profile.realisticStyle}</span>
            <Pen className="w-4 h-4 ml-2 text-purple-500" />
            <span className="font-medium text-purple-700">Ink: </span>
            <span className="text-purple-600 capitalize">{profile.penColor}</span>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {!isActive && (
          <Button variant="outline" size="sm" onClick={onSetActive} className="flex-1">
            Set Active
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Edit className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onGenerateSample}>
          <Sparkles className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-500 hover:text-red-700">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}

// Characteristics Grid
function CharacteristicsGrid({ characteristics }: { characteristics: HandwritingCharacteristics }) {
  const displayChars = [
    'letterHeight', 'letterWidth', 'capitalHeight', 'smallHeight',
    'characterSpacing', 'wordSpacing', 'lineSpacing', 'writingAngle',
    'penThickness', 'baselineAlignment', 'paragraphSpacing', 'avgWordsPerLine',
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-3">
      {displayChars.map(key => {
        const config = characteristicLabels[key];
        const value = characteristics[key];
        return (
          <div key={key} className="p-3 bg-notebook-blue-50 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <config.icon className="w-4 h-4 text-notebook-blue-500" />
              <span className="text-xs text-notebook-blue-600">{config.label}</span>
            </div>
            <div className="font-mono text-lg font-medium text-notebook-ink-50">
              {typeof value === 'object' && value !== null && 'top' in value
                ? `${(value as { top: number; right: number; bottom: number; left: number }).top}/${(value as { top: number; right: number; bottom: number; left: number }).right}/${(value as { top: number; right: number; bottom: number; left: number }).bottom}/${(value as { top: number; right: number; bottom: number; left: number }).left}mm`
                : typeof value === 'string'
                  ? value
                  : `${value}${config.unit}`}
            </div>
          </div>
        );
      })}
    </div>
  );
}