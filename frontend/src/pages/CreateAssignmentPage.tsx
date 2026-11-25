import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Plus,
  Trash2,
  FileText,
  Image,
  Brain,
  Settings,
  Eye,
  Download,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Loader2,
  Sparkles,
  Upload,
  PenTool,
  Pen,
  Layers,
  Palette,
  Save,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { useHandwriting } from '../context/HandwritingContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Input';
import { Select } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { TabPanel } from '../components/ui/Tabs';
import { Modal } from '../components/ui/Modal';
import { formatFileSize, isValidImageFile, isValidPdfFile, generateId } from '../utils/helpers';
import { Question, SUBJECTS, AssignmentSettings, Answer, HandwritingMode, RealisticStyle, PenColor, RealisticHandwritingOptions, GeneratedAssignment, GeneratedPage } from '../types';
import { toast } from 'react-hot-toast';
import api from '../utils/api';
import { HandwritingModeSelector } from '../components/HandwritingModeSelector';
import { MultiSampleUploader } from '../components/MultiSampleUploader';
import { RealisticHandwritingSettings } from '../components/RealisticHandwritingSettings';
import { GenerationSettingsPanel } from '../components/GenerationSettingsPanel';
import { GenerationProgressModal } from '../components/GenerationProgressModal';
import { Suspense, lazy } from 'react';

// Lazy load HandwritingPreview component for better code splitting (named export)
const HandwritingPreview = lazy(() => import('../components/HandwritingPreview').then(module => ({ default: module.HandwritingPreview })));

const initialSettings: AssignmentSettings = {
  handwritingSize: 'medium',
  lineSpacing: 1.0,
  wordSpacing: 1.0,
  characterSpacing: 1.0,
  margins: { top: 80, right: 60, bottom: 80, left: 60 },
  penThickness: 1.0,
  questionStartMode: 'continuous',
  showQuestionNumbers: true,
  showPageNumbers: true,
};

const paperStyleOptions = [
  { value: 'ruled', label: 'Ruled Notebook', description: 'Classic lined paper with margins' },
  { value: 'plain', label: 'Plain White', description: 'Clean white paper without lines' },
  { value: 'grid', label: 'Grid Paper', description: 'Graph paper for diagrams and math' },
];

const pageSizeOptions = [
  { value: 'A4', label: 'A4 (210 × 297 mm)' },
  { value: 'A5', label: 'A5 (148 × 210 mm)' },
  { value: 'Letter', label: 'Letter (8.5 × 11 in)' },
  { value: 'Legal', label: 'Legal (8.5 × 14 in)' },
];

const subjectOptions = SUBJECTS.map(s => ({ value: s.id, label: s.name }));

const DEFAULT_REALISTIC_OPTIONS: RealisticHandwritingOptions = {
  style: 'cursive',
  penColor: 'blue',
  sizeMultiplier: 1.0,
  spacingMultiplier: 1.0,
  thicknessMultiplier: 1.0,
  variationLevel: 'medium',
  paperStyle: 'ruled',
  margins: { top: 80, right: 60, bottom: 80, left: 60 },
  paragraphAlignment: 'left',
  lineVariation: true,
  wordVariation: true,
};

export function CreateAssignmentPage() {
  const navigate = useNavigate();
  const params = useParams();
  const {
    activeProfile,
    samples,
    isSamplesLoading,
    generationSettings,
    activeGenerationSettings,
    isSettingsLoading,
    forgeStatus,
    addSample,
    removeSample,
    setPrimarySample,
    analyzeMultiSample,
    fetchSamples,
    createGenerationJob,
    getGenerationJob,
    cancelGenerationJob,
    setActiveGenerationSettings,
  retryForgeConnection,
  } = useHandwriting();

  const [isRetryingForge, setIsRetryingForge] = useState(false);

  const [activeStep, setActiveStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [generatedAssignment, setGeneratedAssignment] = useState<GeneratedAssignment | null>(null);
  const [generatedPages, setGeneratedPages] = useState<GeneratedPage[]>([]);

  // Handwriting mode
  const [handwritingMode, setHandwritingMode] = useState<HandwritingMode>('realistic');
  const [realisticOptions, setRealisticOptions] = useState<RealisticHandwritingOptions>(DEFAULT_REALISTIC_OPTIONS);
  const [selectedGenerationSettingsId, setSelectedGenerationSettingsId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState<'school' | 'college' | 'university' | 'professional'>('university');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [answerLengths, setAnswerLengths] = useState<Record<string, 'short' | 'medium' | 'detailed'>>({});
  const [paperStyle, setPaperStyle] = useState<'ruled' | 'plain' | 'grid' | 'custom'>('ruled');
  const [pageSize, setPageSize] = useState<'A4' | 'A5' | 'Letter' | 'Legal' | 'Custom'>('A4');
  const [settings, setSettings] = useState<AssignmentSettings>(initialSettings);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  // Load existing assignment if editing
  useEffect(() => {
    if (params.id) {
      const fetchAssignment = async () => {
        try {
          const response = await api.get(`/assignments/${params.id}`);
          const assignment = response.data.assignment;
          setTitle(assignment.title);
          setSubject(assignment.subject);
          setLevel(assignment.level);
          setQuestions(assignment.questions);
          setPaperStyle(assignment.paperStyle);
          setPageSize(assignment.pageSize);
          setSettings(assignment.settings);
          if (assignment.handwritingMode) {
            setHandwritingMode(assignment.handwritingMode);
          }
          if (assignment.realisticOptions) {
            setRealisticOptions(assignment.realisticOptions);
          }
          if (assignment.generationSettingsId) {
            setSelectedGenerationSettingsId(assignment.generationSettingsId);
          }
          if (assignment.answers && assignment.answers.length > 0) {
            const answersMap: Record<string, string> = {};
            const answerLengthsMap: Record<string, 'short' | 'medium' | 'detailed'> = {};
            assignment.answers.forEach((ans: Answer) => {
              answersMap[ans.questionId] = ans.content;
              answerLengthsMap[ans.questionId] = ans.length;
            });
            setAnswers(answersMap);
            setAnswerLengths(answerLengthsMap);
            setActiveStep(3);
          }
        } catch (error) {
          toast.error('Failed to load assignment');
          navigate('/dashboard');
        }
      };
      fetchAssignment();
    }
  }, [params.id, navigate]);

  // Load samples when profile changes
  useEffect(() => {
    if (activeProfile && handwritingMode === 'personal') {
      fetchSamples(activeProfile.id);
    }
  }, [activeProfile, handwritingMode, fetchSamples]);

  // Load default generation settings
  useEffect(() => {
    if (activeGenerationSettings && !selectedGenerationSettingsId) {
      setSelectedGenerationSettingsId(activeGenerationSettings.id);
    }
  }, [activeGenerationSettings, selectedGenerationSettingsId]);

  // Check for generation resume on page load
  useEffect(() => {
    const resumeGeneration = async () => {
      try {
        const stored = sessionStorage.getItem(GENERATION_STORAGE_KEY);
        if (stored) {
          const state = JSON.parse(stored);
          // Check if state is not too old (within last 24 hours)
          if (Date.now() - state.timestamp < 24 * 60 * 60 * 1000) {
            const job = await getGenerationJob(state.jobId);
            if (job && (job.status === 'generating' || job.status === 'pending')) {
              // Resume polling for the job
              setCurrentJobId(job.id);
              setShowProgressModal(true);
              toast('Resuming generation...', { icon: 'ℹ️' });
            } else if (job && (job.status === 'completed' || job.status === 'failed')) {
              // Job already finished, clear state
              clearGenerationState();
              if (job.status === 'completed') {
                setGeneratedAssignment(job);
                setActiveStep(4);
              }
            } else {
              // Job not found or unknown status, clear state
              clearGenerationState();
            }
          } else {
            // State too old, clear it
            clearGenerationState();
          }
        }
      } catch (error) {
        console.warn('Failed to resume generation:', error);
        clearGenerationState();
      }
    };

    resumeGeneration();
  }, [getGenerationJob]);

  // Check Forge status
  useEffect(() => {
    if (handwritingMode === 'realistic') {
      // Forge status is checked automatically in context
    }
  }, [handwritingMode]);

  // Question management
  const addQuestion = () => {
    const newQuestion: Question = {
      id: generateId(),
      text: '',
      type: 'medium',
      subject,
      order: questions.length + 1,
      estimatedLength: 100,
    };
    setQuestions([...questions, newQuestion]);
    setAnswerLengths(prev => ({ ...prev, [newQuestion.id]: 'medium' }));
  };

  const removeQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
    setAnswers(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setAnswerLengths(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const updateQuestion = (id: string, text: string, type?: Question['type']) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, text, type: type || q.type } : q));
  };

  const updateAnswerLength = (questionId: string, length: 'short' | 'medium' | 'detailed') => {
    setAnswerLengths(prev => ({ ...prev, [questionId]: length }));
  };

  const reorderQuestions = (fromIndex: number, toIndex: number) => {
    const newQuestions = [...questions];
    const [removed] = newQuestions.splice(fromIndex, 1);
    newQuestions.splice(toIndex, 0, removed);
    setQuestions(newQuestions.map((q, i) => ({ ...q, order: i + 1 })));
  };

  // File upload handling
  const handleFileUpload = async (files: File[]) => {
    const validFiles = files.filter(f => isValidImageFile(f) || isValidPdfFile(f));
    if (validFiles.length !== files.length) {
      toast.error('Some files were rejected. Only images (JPG, PNG) and PDFs are allowed.');
    }
    setUploadedFiles(prev => [...prev, ...validFiles]);

    for (const file of validFiles) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const uploadResponse = await api.post('/files/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const fileId = uploadResponse.data.file.id;
        const ocrResponse = await api.post('/ai/ocr', { fileId });

        if (ocrResponse.data.text) {
          const ocrText = ocrResponse.data.text;
          const extractedQuestions = parseOCRTextToQuestions(ocrText);
          if (extractedQuestions.length > 0) {
            setQuestions(prev => [...prev, ...extractedQuestions]);
            extractedQuestions.forEach(q => {
              setAnswerLengths(prev => ({ ...prev, [q.id]: 'medium' }));
            });
            toast.success(`Extracted ${extractedQuestions.length} question(s) from ${file.name}`);
          } else {
            toast.success(`Processed ${file.name} (no questions detected)`);
          }
        }
      } catch (error) {
        console.error('OCR failed:', error);
        toast.error(`Failed to process ${file.name}`);
      }
    }
  };

  const parseOCRTextToQuestions = (text: string): Question[] => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const questions: Question[] = [];
    let currentQuestion = '';

    for (const line of lines) {
      const isQuestionMarker = /^[Qq]\d*[\.\)]\s/.test(line) ||
                               /^[Qq]uestion\s*\d*/.test(line) ||
                               line.endsWith('?');

      if (isQuestionMarker && currentQuestion) {
        questions.push({
          id: generateId(),
          text: currentQuestion.trim(),
          type: 'medium',
          subject,
          order: questions.length + 1,
          estimatedLength: 100,
        });
        currentQuestion = line;
      } else {
        currentQuestion += (currentQuestion ? ' ' : '') + line;
      }
    }

    if (currentQuestion.trim()) {
      questions.push({
        id: generateId(),
        text: currentQuestion.trim(),
        type: 'medium',
        subject,
        order: questions.length + 1,
        estimatedLength: 100,
      });
    }

    if (questions.length === 0 && text.trim()) {
      questions.push({
        id: generateId(),
        text: text.trim().substring(0, 500),
        type: 'medium',
        subject,
        order: 1,
        estimatedLength: 100,
      });
    }

    return questions;
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Generate answers using AI
  const handleGenerateAnswers = async () => {
    if (questions.length === 0) {
      toast.error('Please add at least one question');
      return;
    }
    if (questions.some(q => !q.text.trim())) {
      toast.error('Please fill in all questions');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await api.post('/ai/generate-answers', {
        questions: questions.map(q => ({
          id: q.id,
          text: q.text,
          type: answerLengths[q.id] || 'medium',
          subject,
          order: q.order
        })),
        subject,
        level,
        handwritingProfileId: activeProfile?.id,
      });

      const generatedAnswers: Record<string, string> = {};
      response.data.answers.forEach((ans: any) => {
        generatedAnswers[ans.questionId] = ans.content;
      });

      setAnswers(generatedAnswers);
      setActiveStep(3);
      toast.success('Answers generated successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to generate answers');
    } finally {
      setIsGenerating(false);
    }
  };

  // Regenerate a single answer
  const handleRegenerateAnswer = async (question: Question, length: 'short' | 'medium' | 'detailed') => {
    try {
      const response = await api.post('/ai/generate-answer', {
        question: question.text,
        subject,
        level,
        length,
      });
      setAnswers(prev => ({ ...prev, [question.id]: response.data.answer }));
      toast.success('Answer regenerated');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to regenerate answer');
    }
  };

  // Session storage keys for resume functionality
  const GENERATION_STORAGE_KEY = 'handwriting_generation_resume';

  // Save generation state to sessionStorage for resume after refresh
  const saveGenerationState = (jobId: string, options: any) => {
    try {
      const state = {
        jobId,
        options,
        timestamp: Date.now(),
        step: 4, // Preview step
      };
      sessionStorage.setItem(GENERATION_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save generation state:', e);
    }
  };

  // Clear generation state from sessionStorage
  const clearGenerationState = () => {
    try {
      sessionStorage.removeItem(GENERATION_STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear generation state:', e);
    }
  };

  // Handle handwriting generation
  const handleGenerateHandwriting = async () => {
    if (questions.length === 0) {
      toast.error('Please add at least one question');
      return;
    }
    if (Object.keys(answers).length === 0) {
      toast.error('Please generate answers first');
      return;
    }
    if (!activeProfile) {
      toast.error('Please create a handwriting profile first');
      return;
    }

    setIsGenerating(true);
    try {
      // First save the assignment to get an ID
      const answersArray = questions.map(q => ({
        questionId: q.id,
        content: answers[q.id] || '',
        length: answerLengths[q.id] || 'medium',
      }));

      const payload: any = {
        title,
        subject,
        level,
        questions,
        answers: answersArray,
        handwritingProfileId: activeProfile.id,
        paperStyle,
        pageSize,
        settings,
        handwritingMode,
        realisticOptions: handwritingMode === 'realistic' ? realisticOptions : undefined,
        generationSettingsId: selectedGenerationSettingsId,
      };

      let assignmentId: string;
      if (params.id) {
        await api.put(`/assignments/${params.id}`, payload);
        assignmentId = params.id;
        toast.success('Assignment updated!');
      } else {
        const response = await api.post('/assignments', payload);
        assignmentId = response.data.assignment.id;
        toast.success('Assignment saved!');
      }

      // Now create the generation job
      const generationOptions = {
        assignmentId,
        mode: handwritingMode,
        handwritingProfileId: activeProfile.id,
        generationSettingsId: selectedGenerationSettingsId,
        realisticOptions: handwritingMode === 'realistic' ? realisticOptions : undefined,
        forgeOptions: {
          useForge: forgeStatus?.healthy && handwritingMode === 'realistic',
        },
      };

      const job = await createGenerationJob(generationOptions);

      // Save generation state for resume after browser refresh
      saveGenerationState(job.id, generationOptions);

      setCurrentJobId(job.id);
      setShowProgressModal(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to start generation');
      setIsGenerating(false);
    }
  };

  // Fetch completed job data
  const fetchCompletedJob = async (jobId: string) => {
    try {
      const job = await getGenerationJob(jobId);
      if (job) {
        setGeneratedAssignment(job);
        if (job.pagesData) {
          setGeneratedPages(job.pagesData);
        }
        // Clear generation state when job is completed (success or failure)
        if (job.status === 'completed' || job.status === 'failed') {
          clearGenerationState();
        }
      }
    } catch (error) {
      console.error('Failed to fetch completed job:', error);
    }
  };

  const handleProgressComplete = async () => {
    if (currentJobId) {
      await fetchCompletedJob(currentJobId);
    }
    setShowProgressModal(false);
    setCurrentJobId(null);
    setIsGenerating(false);
    setActiveStep(4);
    toast.success('Handwritten assignment generated successfully!');
  };

  const handleProgressCancel = async () => {
    if (currentJobId) {
      await cancelGenerationJob(currentJobId);
    }
    setShowProgressModal(false);
    setCurrentJobId(null);
    setIsGenerating(false);
  };

  // Download PDF from backend
  const handleDownloadPDF = async (assignmentId?: string) => {
    const targetId = assignmentId || generatedAssignment?.id || params.id;
    if (!targetId) {
      toast.error('No assignment available for download');
      return;
    }
    try {
      const response = await api.get(`/assignments/${targetId}/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title || 'assignment'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('PDF downloaded successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to download PDF');
    }
  };

  // Download DOCX from backend
  const handleDownloadDOCX = async (assignmentId?: string) => {
    const targetId = assignmentId || generatedAssignment?.id || params.id;
    if (!targetId) {
      toast.error('No assignment available for download');
      return;
    }
    try {
      const response = await api.get(`/assignments/${targetId}/docx`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title || 'assignment'}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('DOCX downloaded successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to download DOCX');
    }
  };

  // Print using browser print dialog
  const handlePrint = () => {
    window.print();
  };

  // Save assignment
  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Please enter an assignment title');
      return;
    }
    if (questions.length === 0) {
      toast.error('Please add at least one question');
      return;
    }
    if (!activeProfile) {
      toast.error('Please create a handwriting profile first');
      navigate('/handwriting-profile');
      return;
    }

    try {
      const answersArray = questions.map(q => ({
        questionId: q.id,
        content: answers[q.id] || '',
        length: answerLengths[q.id] || 'medium',
      }));

      const payload: any = {
        title,
        subject,
        level,
        questions,
        answers: answersArray,
        handwritingProfileId: activeProfile.id,
        paperStyle,
        pageSize,
        settings,
        handwritingMode,
        realisticOptions: handwritingMode === 'realistic' ? realisticOptions : undefined,
        generationSettingsId: selectedGenerationSettingsId,
      };

      if (params.id) {
        await api.put(`/assignments/${params.id}`, payload);
        toast.success('Assignment updated!');
      } else {
        await api.post('/assignments', payload);
        toast.success('Assignment saved!');
      }
      navigate('/my-assignments');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save assignment');
    }
  };

  const canProceed = (step: number) => {
    switch (step) {
      case 1: return title.trim() && subject && questions.length > 0;
      case 2: return true;
      case 3: return Object.keys(answers).length > 0;
      default: return false;
    }
  };

  const steps = [
    { id: 1, title: 'Questions', icon: FileText, description: 'Enter your assignment questions' },
    { id: 2, title: 'Settings', icon: Settings, description: 'Configure handwriting and paper' },
    { id: 3, title: 'Generate', icon: Brain, description: 'Generate answers & handwriting' },
    { id: 4, title: 'Preview', icon: Eye, description: 'Review and finalize' },
  ];

  return (
    <div className="animate-fade-in">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    activeStep >= step.id
                      ? 'bg-gradient-to-br from-notebook-blue-500 to-notebook-purple-600 text-white'
                      : 'bg-notebook-blue-100 text-notebook-blue-400'
                  }`}
                >
                  {activeStep > step.id ? <Check className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-16 h-0.5 mx-2 transition-all ${
                      activeStep > step.id
                        ? 'bg-gradient-to-r from-notebook-blue-500 to-notebook-purple-600'
                        : 'bg-notebook-blue-100'
                    }`}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-center text-sm text-notebook-blue-500">
          Step {activeStep} of {steps.length}: {steps[activeStep - 1].description}
        </div>
      </div>

      <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-6">
        {/* Step 1: Questions */}
        <TabPanel tabId="1" activeTab={activeStep.toString()}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Assignment Questions</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" type="button" leftIcon={<Image className="w-4 h-4" />} onClick={() => setActiveStep(1)}>
                    Upload Files
                  </Button>
                  <Button type="button" leftIcon={<Plus className="w-4 h-4" />} onClick={addQuestion}>
                    Add Question
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mb-6">
                <Input
                  label="Assignment Title"
                  name="title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g., Calculus Problem Set 3"
                  leftIcon={<FileText className="w-5 h-5" />}
                />
                <div className="grid sm:grid-cols-2 gap-4">
                  <Select
                    label="Subject"
                    name="subject"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    options={subjectOptions}
                    placeholder="Select subject"
                  />
                  <Select
                    label="Academic Level"
                    name="level"
                    value={level}
                    onChange={e => setLevel(e.target.value as any)}
                    options={[
                      { value: 'school', label: 'High School' },
                      { value: 'college', label: 'College' },
                      { value: 'university', label: 'University' },
                      { value: 'professional', label: 'Professional' },
                    ]}
                    placeholder="Select level"
                  />
                </div>
              </div>

              {/* Upload Zone */}
              <div
                className={`upload-zone relative ${uploadedFiles.length > 0 ? 'upload-zone-active' : ''}`}
                onDragOver={e => { e.preventDefault(); }}
                onDragLeave={e => { e.preventDefault(); }}
                onDrop={e => { e.preventDefault(); handleFileUpload(Array.from(e.dataTransfer.files)); }}
              >
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={e => e.target.files && handleFileUpload(Array.from(e.target.files))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center gap-3">
                  <Upload className="w-10 h-10 text-notebook-blue-400" />
                  <p className="text-notebook-blue-600 font-medium">
                    {uploadedFiles.length > 0 ? `${uploadedFiles.length} file(s) uploaded` : 'Drag & drop question papers or click to browse'}
                  </p>
                  <p className="text-sm text-notebook-blue-400">Supports JPG, PNG, PDF (max 10MB each)</p>
                </div>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-notebook-blue-50 rounded-xl">
                      <div className="w-10 h-10 rounded-lg bg-notebook-blue-100 flex items-center justify-center">
                        {isValidImageFile(file) ? <Image className="w-5 h-5 text-notebook-blue-600" /> : <FileText className="w-5 h-5 text-notebook-blue-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-notebook-ink-50 truncate">{file.name}</p>
                        <p className="text-xs text-notebook-blue-500">{formatFileSize(file.size)}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeFile(index)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Questions List */}
              {questions.length > 0 && (
                <div className="mt-6 space-y-4">
                  <h4 className="font-medium text-notebook-ink-50">Questions</h4>
                  {questions.map((question, index) => (
                    <QuestionCard
                      key={question.id}
                      question={question}
                      index={index}
                      answerLength={answerLengths[question.id] || 'medium'}
                      answer={answers[question.id]}
                      onTextChange={text => updateQuestion(question.id, text)}
                      onAnswerLengthChange={length => updateAnswerLength(question.id, length)}
                      onQuestionTypeChange={(qid, type) => updateQuestion(qid, questions.find(q => q.id === qid)?.text || '', type)}
                      onRemove={() => removeQuestion(question.id)}
                      onMoveUp={() => index > 0 && reorderQuestions(index, index - 1)}
                      onMoveDown={() => index < questions.length - 1 && reorderQuestions(index, index + 1)}
                    />
                  ))}
                </div>
              )}

              {questions.length === 0 && uploadedFiles.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-notebook-blue-200 mx-auto mb-4" />
                  <p className="text-notebook-blue-500">Add questions manually or upload question papers</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabPanel>

        {/* Step 2: Settings - Now with Handwriting Mode Selector */}
        <TabPanel tabId="2" activeTab={activeStep.toString()}>
          <div className="space-y-6">
            {/* Handwriting Mode Selector */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pen className="w-5 h-5" />
                  Handwriting Mode
                </CardTitle>
              </CardHeader>
              <CardContent>
                <HandwritingModeSelector
                  mode={handwritingMode}
                  onModeChange={setHandwritingMode}
                  realisticStyle={realisticOptions.style}
                  onRealisticStyleChange={(style: RealisticStyle) => { setRealisticOptions((prev: RealisticHandwritingOptions) => ({ ...prev, style })); }}
                  penColor={realisticOptions.penColor}
                  onPenColorChange={(color: PenColor) => { setRealisticOptions((prev: RealisticHandwritingOptions) => ({ ...prev, penColor: color })); }}
                />
              </CardContent>
            </Card>

            {/* Personal Mode: Multi-Sample Uploader */}
            {handwritingMode === 'personal' && activeProfile && (
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
                    isLoading={isSamplesLoading || isGenerating}
                    onAddSample={async (file, isPrimary) => { if (activeProfile) await addSample(activeProfile.id, file, isPrimary); }}
                    onRemoveSample={async (sampleId) => { await removeSample(sampleId); }}
                    onSetPrimary={async (sampleId) => { if (activeProfile) await setPrimarySample(activeProfile.id, sampleId); }}
                    onAnalyzeMulti={async () => { if (activeProfile) await analyzeMultiSample(activeProfile.id); }}
                    maxSamples={5}
                  />
                </CardContent>
              </Card>
            )}

            {/* Realistic Mode: Style Settings */}
            {handwritingMode === 'realistic' && (
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
                  {forgeStatus && (
                    <div className={`mt-4 p-4 rounded-xl ${forgeStatus.healthy ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${forgeStatus.healthy ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div className="flex-1">
                          <p className="font-medium text-notebook-ink-50">
                            {forgeStatus.healthy ? 'Forge AI Available' : 'Forge AI Unavailable'}
                          </p>
                          <p className="text-sm text-notebook-blue-500">
                            {forgeStatus.healthy
                              ? 'AI enhancement will be used for generation'
                              : 'CSS-based engine will be used (Forge not responding)'}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            setIsRetryingForge(true);
                            const healthy = await retryForgeConnection();
                            setIsRetryingForge(false);
                            if (healthy) {
                              toast.success('Forge connection restored');
                            } else {
                              toast.error('Forge still unavailable');
                            }
                          }}
                          disabled={isRetryingForge}
                          leftIcon={isRetryingForge ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        >
                          {isRetryingForge ? 'Retrying...' : 'Retry Connection'}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Generation Settings Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Generation Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <GenerationSettingsPanel
                  settings={generationSettings}
                  activeSettings={generationSettings.find(s => s.id === selectedGenerationSettingsId) || null}
                  isLoading={isSettingsLoading}
                  onCreate={async (data) => {
                    const newSettings = await api.post('/handwriting/generation-settings', data);
                    setSelectedGenerationSettingsId(newSettings.data.settings.id);
                  }}
                  onUpdate={async (id, data) => {
                    await api.put(`/handwriting/generation-settings/${id}`, data);
                  }}
                  onDelete={async (id) => {
                    await api.delete(`/handwriting/generation-settings/${id}`);
                    if (selectedGenerationSettingsId === id) {
                      setSelectedGenerationSettingsId(generationSettings.find(s => s.id !== id)?.id || null);
                    }
                  }}
                  onSetActive={(setting) => {
                    setSelectedGenerationSettingsId(setting?.id || null);
                    if (setting) setActiveGenerationSettings(setting);
                  }}
                />
              </CardContent>
            </Card>

            {/* Paper & Layout Settings */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Paper Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <label className="label-text">Paper Style</label>
                    <div className="grid grid-cols-3 gap-3">
                      {paperStyleOptions.map(style => (
                        <label
                          key={style.value}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            paperStyle === style.value
                              ? 'border-notebook-blue-500 bg-notebook-blue-50'
                              : 'border-notebook-blue-100 hover:border-notebook-blue-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="paperStyle"
                            value={style.value}
                            checked={paperStyle === style.value}
                            onChange={e => setPaperStyle(e.target.value as any)}
                            className="sr-only"
                          />
                          <p className="font-medium text-notebook-ink-50">{style.label}</p>
                          <p className="text-sm text-notebook-blue-500 mt-1">{style.description}</p>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="label-text">Page Size</label>
                    <Select
                      value={pageSize}
                      onChange={e => setPageSize(e.target.value as any)}
                      options={pageSizeOptions}
                      placeholder="Select page size"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: 'top', label: 'Top Margin (px)' },
                      { key: 'right', label: 'Right Margin (px)' },
                      { key: 'bottom', label: 'Bottom Margin (px)' },
                      { key: 'left', label: 'Left Margin (px)' },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label className="label-text">{label}</label>
                        <Input
                          type="number"
                          value={settings.margins[key as keyof typeof settings.margins]}
                          onChange={e => setSettings(prev => ({
                            ...prev,
                            margins: { ...prev.margins, [key]: parseInt(e.target.value) || 0 }
                          }))}
                          min="0"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Question Layout
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="label-text">Question Start Mode</label>
                    <Select
                      value={settings.questionStartMode}
                      onChange={e => setSettings(prev => ({ ...prev, questionStartMode: e.target.value as any }))}
                      options={[
                        { value: 'continuous', label: 'Continuous' },
                        { value: 'new-line', label: 'New Line' },
                        { value: 'new-page', label: 'New Page' },
                      ]}
                      placeholder="Select mode"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.showQuestionNumbers}
                        onChange={e => setSettings(prev => ({ ...prev, showQuestionNumbers: e.target.checked }))}
                        className="w-4 h-4 rounded border-notebook-blue-300 text-notebook-blue-600 focus:ring-notebook-blue-500"
                      />
                      <span className="text-sm text-notebook-ink-50">Show Question Numbers</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.showPageNumbers}
                        onChange={e => setSettings(prev => ({ ...prev, showPageNumbers: e.target.checked }))}
                        className="w-4 h-4 rounded border-notebook-blue-300 text-notebook-blue-600 focus:ring-notebook-blue-500"
                      />
                      <span className="text-sm text-notebook-ink-50">Show Page Numbers</span>
                    </label>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabPanel>

        {/* Step 3: Generate */}
        <TabPanel tabId="3" activeTab={activeStep.toString()}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Generate Handwritten Assignment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-4 bg-notebook-blue-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-notebook-blue-100 flex items-center justify-center">
                      <Brain className="w-6 h-6 text-notebook-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-notebook-ink-50">Ready to Generate</h4>
                      <p className="text-sm text-notebook-blue-600">
                        {questions.length} question(s) · {Object.keys(answers).length} answer(s) ·{' '}
                        {handwritingMode === 'personal' ? 'Personal Handwriting' : 'Realistic Handwriting'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Answers Preview */}
                <div className="space-y-4">
                  <h4 className="font-medium text-notebook-ink-50">Generated Answers</h4>
                  {questions.map((question, _index) => (
                    <AnswerCard
                      key={question.id}
                      question={question}
                      answer={answers[question.id]}
                      answerLength={answerLengths[question.id] || 'medium'}
                      onAnswerLengthChange={length => updateAnswerLength(question.id, length)}
                      onEdit={newAnswer => {
                        setAnswers(prev => ({ ...prev, [question.id]: newAnswer }));
                      }}
                      onRegenerate={() => {
                        const length = answerLengths[question.id] || 'medium';
                        handleRegenerateAnswer(question, length);
                      }}
                    />
                  ))}
                </div>

                {questions.length > 0 && Object.keys(answers).length === 0 && (
                  <div className="text-center py-12">
                    <Brain className="w-16 h-16 text-notebook-blue-200 mx-auto mb-4" />
                    <p className="text-notebook-blue-500 mb-4">Click "Generate Answers" to create AI-powered responses</p>
                    <Button onClick={handleGenerateAnswers} isLoading={isGenerating} leftIcon={<Sparkles className="w-5 h-5" />}>
                      Generate Answers
                    </Button>
                  </div>
                )}

                {/* Generate Handwriting Button */}
                {Object.keys(answers).length > 0 && (
                  <div className="pt-4 border-t border-notebook-blue-100">
                    <Button
                      onClick={handleGenerateHandwriting}
                      isLoading={isGenerating}
                      className="w-full"
                      size="lg"
                      leftIcon={handwritingMode === 'personal' ? <PenTool className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                    >
                      {handwritingMode === 'personal'
                        ? 'Generate Handwritten Assignment (Personal)'
                        : 'Generate Handwritten Assignment (Realistic)'}
                    </Button>
                    <p className="text-center text-sm text-notebook-blue-500 mt-2">
                      {handwritingMode === 'personal'
                        ? 'Uses your uploaded handwriting samples'
                        : 'Uses AI-generated realistic handwriting styles'}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <div className="flex justify-between w-full">
                <Button variant="outline" onClick={() => setActiveStep(2)} leftIcon={<ArrowLeft className="w-4 h-4" />}>
                  Back
                </Button>
                {Object.keys(answers).length === 0 ? (
                  <Button onClick={handleGenerateAnswers} isLoading={isGenerating} rightIcon={<ArrowRight className="w-4 h-4" />} leftIcon={<Sparkles className="w-5 h-5" />}>
                    Generate Answers
                  </Button>
                ) : (
                  <Button onClick={() => setActiveStep(4)} rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Preview
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
        </TabPanel>

        {/* Step 4: Preview - Enhanced with HandwritingPreview component */}
        <TabPanel tabId="4" activeTab={activeStep.toString()}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Handwriting Preview
                </CardTitle>
                <Button variant="outline" onClick={() => setShowFullPreview(true)} leftIcon={<Eye className="w-4 h-4" />}>
                  Full Screen Preview
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-notebook-blue-500" /><span className="ml-3 text-notebook-blue-500">Loading preview...</span></div>}>
                <HandwritingPreview
                  title={title || 'Assignment Preview'}
                  paperStyle={paperStyle}
                  pageSize={pageSize}
                  generatedPages={generatedPages}
                  questions={questions}
                  answers={questions.map(q => ({
                    id: generateId(),
                    questionId: q.id,
                    content: answers[q.id] || '',
                    length: answerLengths[q.id] || 'medium',
                    isEdited: false,
                    generatedAt: new Date().toISOString(),
                  }))}
                  settings={settings}
                  mode={handwritingMode}
                  realisticOptions={handwritingMode === 'realistic' ? realisticOptions : undefined}
                  profileCharacteristics={activeProfile?.characteristics || null}
                  onDownloadPDF={handleDownloadPDF}
                  onDownloadDOCX={handleDownloadDOCX}
                  onPrint={handlePrint}
                />
              </Suspense>
            </CardContent>
            <CardFooter>
              <div className="flex justify-between w-full">
                <Button variant="outline" onClick={() => setActiveStep(3)} leftIcon={<ArrowLeft className="w-4 h-4" />}>
                  Back
                </Button>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleSave} leftIcon={<Save className="w-4 h-4" />}>
                    Save Draft
                  </Button>
                  <Button onClick={handleSave} rightIcon={<Download className="w-4 h-4" />} leftIcon={<Check className="w-4 h-4" />}>
                    Finalize & Download
                  </Button>
                </div>
              </div>
            </CardFooter>
          </Card>
        </TabPanel>
      </form>

      {/* Navigation */}
      <div className="mt-6 flex justify-between" role="navigation" aria-label="Step navigation">
        <Button variant="outline" onClick={() => setActiveStep(Math.max(1, activeStep - 1))} disabled={activeStep === 1} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Previous
        </Button>
        <div className="flex items-center gap-4 text-sm text-notebook-blue-500">
          Step {activeStep} of {steps.length}
        </div>
        <Button onClick={() => setActiveStep(Math.min(steps.length, activeStep + 1))} disabled={activeStep === steps.length || !canProceed(activeStep)} rightIcon={<ArrowRight className="w-4 h-4" />}>
          Next
        </Button>
      </div>

      {/* Full Preview Modal */}
      <Modal
        isOpen={showFullPreview}
        onClose={() => setShowFullPreview(false)}
        title="Full Preview"
        size="full"
      >
        <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-notebook-blue-500" /><span className="ml-3 text-notebook-blue-500">Loading preview...</span></div>}>
          <HandwritingPreview
            title={title || 'Assignment Preview'}
            paperStyle={paperStyle}
            pageSize={pageSize}
            generatedPages={generatedPages}
            questions={questions}
            answers={questions.map(q => ({
              id: generateId(),
              questionId: q.id,
              content: answers[q.id] || '',
              length: answerLengths[q.id] || 'medium',
              isEdited: false,
              generatedAt: new Date().toISOString(),
            }))}
            settings={settings}
            mode={handwritingMode}
            realisticOptions={handwritingMode === 'realistic' ? realisticOptions : undefined}
            profileCharacteristics={activeProfile?.characteristics || null}
            onDownloadPDF={handleDownloadPDF}
            onDownloadDOCX={handleDownloadDOCX}
            onPrint={handlePrint}
          />
        </Suspense>
      </Modal>

      {/* Generation Progress Modal */}
      <GenerationProgressModal
        isOpen={showProgressModal}
        onClose={handleProgressCancel}
        jobId={currentJobId}
        onCancel={handleProgressCancel}
        onDownloadPDF={() => handleDownloadPDF(generatedAssignment?.id)}
        onDownloadDOCX={() => handleDownloadDOCX(generatedAssignment?.id)}
        onViewAssignment={() => {
          handleProgressComplete();
          navigate('/my-assignments');
        }}
      />
    </div>
  );
}

// Question Card Component
function QuestionCard({
  question,
  index,
  answerLength,
  answer,
  onTextChange,
  onAnswerLengthChange,
  onQuestionTypeChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  question: Question;
  index: number;
  answerLength: 'short' | 'medium' | 'detailed';
  answer: string | undefined;
  onTextChange: (text: string) => void;
  onAnswerLengthChange: (length: 'short' | 'medium' | 'detailed') => void;
  onQuestionTypeChange: (questionId: string, type: Question['type']) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-notebook-blue-100 p-4">
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-1 text-notebook-blue-400 pt-1">
          <button onClick={onMoveUp} disabled={index === 0} className="p-1 hover:bg-notebook-blue-100 rounded" aria-label="Move up">
            <ChevronDown className="w-4 h-4 rotate-180" />
          </button>
          <span className="font-medium w-8 text-center">{index + 1}</span>
          <button onClick={onMoveDown} className="p-1 hover:bg-notebook-blue-100 rounded" aria-label="Move down">
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <Textarea
            name={`questions.${index}.text`}
            value={question.text}
            onChange={e => onTextChange(e.target.value)}
            placeholder="Enter your question here..."
            rows={2}
            className="resize-none"
          />
          <div className="flex items-center gap-3 mt-2">
            <Select
              name={`questions.${index}.type`}
              value={question.type}
              onChange={e => onQuestionTypeChange(question.id, e.target.value as Question['type'])}
              options={[
                { value: 'short', label: 'Short Answer' },
                { value: 'medium', label: 'Medium Answer' },
                { value: 'detailed', label: 'Detailed Answer' },
                { value: 'essay', label: 'Essay' },
              ]}
              className="w-40"
            />
            <Select
              value={answerLength}
              onChange={e => onAnswerLengthChange(e.target.value as any)}
              options={[
                { value: 'short', label: 'Short' },
                { value: 'medium', label: 'Medium' },
                { value: 'detailed', label: 'Detailed' },
              ]}
              className="w-40"
            />
            {answer && (
              <Badge variant="success" dot size="sm">Answer Generated</Badge>
            )}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onRemove} className="text-red-500 hover:text-red-700">
          <Trash2 className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}

// Answer Card Component
function AnswerCard({
  question,
  answer,
  answerLength,
  onAnswerLengthChange,
  onEdit,
  onRegenerate,
}: {
  question: Question;
  answer: string | undefined;
  answerLength: 'short' | 'medium' | 'detailed';
  onAnswerLengthChange: (length: 'short' | 'medium' | 'detailed') => void;
  onEdit: (answer: string) => void;
  onRegenerate: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(answer || '');

  const handleSave = () => {
    onEdit(editValue);
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-xl border border-notebook-blue-100 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-notebook-ink-50 mb-1">Q: {question.text}</p>
          <div className="flex items-center gap-2">
            <Select
              value={answerLength}
              onChange={e => onAnswerLengthChange(e.target.value as any)}
              options={[
                { value: 'short', label: 'Short' },
                { value: 'medium', label: 'Medium' },
                { value: 'detailed', label: 'Detailed' },
              ]}
              className="w-36"
            />
            <Button variant="ghost" size="sm" onClick={onRegenerate}>
              <Loader2 className="w-4 h-4" /> Regenerate
            </Button>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? <Check className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
        </Button>
      </div>

      {isEditing ? (
        <Textarea
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          rows={4}
          onBlur={handleSave}
          onKeyDown={e => e.key === 'Enter' && (e.metaKey || e.ctrlKey) && handleSave()}
        />
      ) : (
        <div className="notebook-page p-4 min-h-[80px] font-notebook text-notebook-ink-50" style={{ fontSize: '16px', lineHeight: '28px' }}>
          {answer ? (
            <span dangerouslySetInnerHTML={{ __html: answer.replace(/\n/g, '<br>') }} />
          ) : (
            <span className="text-notebook-blue-300 italic">No answer generated yet</span>
          )}
        </div>
      )}
    </div>
  );
}