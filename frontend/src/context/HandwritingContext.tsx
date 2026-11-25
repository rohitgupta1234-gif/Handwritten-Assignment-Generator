import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  HandwritingProfile,
  HandwritingCharacteristics,
  HandwritingSample,
  GenerationSettings,
  GeneratedAssignment,
  ForgeHealthStatus,
  RealisticHandwritingOptions,
  HandwritingMode,
  RealisticStyle,
  PenColor,
  MultiSampleAnalysisResult,
} from '../types';

interface HandwritingContextType {
  // Profiles
  profiles: HandwritingProfile[];
  activeProfile: HandwritingProfile | null;
  isLoading: boolean;
  error: string | null;
  fetchProfiles: () => Promise<void>;
  createProfile: (file: File, options?: { name?: string; mode?: HandwritingMode; realisticStyle?: RealisticStyle; penColor?: PenColor }) => Promise<HandwritingProfile>;
  updateProfile: (id: string, data: Partial<HandwritingProfile>) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  setActiveProfile: (profile: HandwritingProfile | null) => void;
  analyzeHandwriting: (profileId: string) => Promise<HandwritingProfile>;
  getCharacteristics: () => HandwritingCharacteristics | null;

  // Samples (Multi-sample for personal mode)
  samples: HandwritingSample[];
  isSamplesLoading: boolean;
  addSample: (profileId: string, file: File, isPrimary?: boolean) => Promise<HandwritingSample>;
  removeSample: (sampleId: string) => Promise<void>;
  fetchSamples: (profileId: string) => Promise<void>;
  setPrimarySample: (profileId: string, sampleId: string) => Promise<void>;
  analyzeMultiSample: (profileId: string) => Promise<MultiSampleAnalysisResult>;

  // Generation Settings
  generationSettings: GenerationSettings[];
  activeGenerationSettings: GenerationSettings | null;
  isSettingsLoading: boolean;
  fetchGenerationSettings: () => Promise<void>;
  createGenerationSettings: (data: Partial<GenerationSettings>) => Promise<GenerationSettings>;
  updateGenerationSettings: (id: string, data: Partial<GenerationSettings>) => Promise<void>;
  deleteGenerationSettings: (id: string) => Promise<void>;
  setActiveGenerationSettings: (settings: GenerationSettings | null) => void;
  getDefaultGenerationSettings: () => GenerationSettings | null;

  // Generation Jobs
  generationJobs: GeneratedAssignment[];
  isJobsLoading: boolean;
  fetchGenerationJobs: (limit?: number, offset?: number) => Promise<void>;
  createGenerationJob: (options: any) => Promise<GeneratedAssignment>;
  getGenerationJob: (jobId: string) => Promise<GeneratedAssignment | null>;
  cancelGenerationJob: (jobId: string) => Promise<boolean>;

  // Forge API
  forgeStatus: ForgeHealthStatus | null;
  isForgeLoading: boolean;
  checkForgeStatus: () => Promise<void>;
  retryForgeConnection: () => Promise<boolean>;
  getRealisticOptions: () => Promise<{ styles: any[]; penColors: any[] }>;

  // Realistic Handwriting
  getDefaultRealisticOptions: (style?: RealisticStyle, penColor?: PenColor) => RealisticHandwritingOptions;
}

const HandwritingContext = createContext<HandwritingContextType | undefined>(undefined);

export function HandwritingProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<HandwritingProfile[]>([]);
  const [activeProfile, setActiveProfileState] = useState<HandwritingProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Samples
  const [samples, setSamples] = useState<HandwritingSample[]>([]);
  const [isSamplesLoading, setIsSamplesLoading] = useState(false);

  // Generation Settings
  const [generationSettings, setGenerationSettings] = useState<GenerationSettings[]>([]);
  const [activeGenerationSettings, setActiveGenerationSettingsState] = useState<GenerationSettings | null>(null);
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);

  // Generation Jobs
  const [generationJobs, setGenerationJobs] = useState<GeneratedAssignment[]>([]);
  const [isJobsLoading, setIsJobsLoading] = useState(false);

  // Forge
  const [forgeStatus, setForgeStatus] = useState<ForgeHealthStatus | null>(null);
  const [isForgeLoading, setIsForgeLoading] = useState(false);

  useEffect(() => {
    fetchProfiles();
    fetchGenerationSettings();
  }, []);

  // Listen for auth changes to refetch profiles and settings
  useEffect(() => {
    const handleAuthChange = () => {
      fetchProfiles();
      fetchGenerationSettings();
    };

    window.addEventListener('auth:login', handleAuthChange);
    window.addEventListener('auth:logout', handleAuthChange);

    return () => {
      window.removeEventListener('auth:login', handleAuthChange);
      window.removeEventListener('auth:logout', handleAuthChange);
    };
  }, []);

  // ==================== PROFILES ====================

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const isFormData = options.body instanceof FormData;
    const customHeaders = (options.headers as Record<string, string>) || {};
    const headers: Record<string, string> = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...getAuthHeaders(),
      ...customHeaders,
    };
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}${url}`, {
      ...options,
      headers,
      credentials: 'include',
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }
    return response.json();
  };

  const fetchProfiles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchWithAuth('/handwriting/profiles');
      setProfiles(data.profiles);
      const active = data.profiles?.find((p: HandwritingProfile) => p.isActive) || (data.profiles && data.profiles.length > 0 ? data.profiles[0] : null);
      if (active) setActiveProfileState(active);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch profiles');
    } finally {
      setIsLoading(false);
    }
  };

  const createProfile = async (file: File, options?: { name?: string; mode?: HandwritingMode; realisticStyle?: RealisticStyle; penColor?: PenColor }): Promise<HandwritingProfile> => {
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('image', file);
      if (options?.name) formData.append('name', options.name);
      if (options?.mode) formData.append('mode', options.mode);
      if (options?.realisticStyle) formData.append('realisticStyle', options.realisticStyle);
      if (options?.penColor) formData.append('penColor', options.penColor);
      const data = await fetchWithAuth('/handwriting/profiles', {
        method: 'POST',
        body: formData,
      });
      const newProfile = data.profile;
      setProfiles(prev => [...prev, newProfile]);
      if (newProfile.isActive) setActiveProfileState(newProfile);
      return newProfile;
    } catch (err: any) {
      setError(err.message || 'Failed to create profile');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (id: string, data: Partial<HandwritingProfile>) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchWithAuth(`/handwriting/profiles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      const updated = response.profile;
      setProfiles(prev => prev.map(p => p.id === id ? updated : p));
      if (activeProfile?.id === id) setActiveProfileState(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteProfile = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await fetchWithAuth(`/handwriting/profiles/${id}`, { method: 'DELETE' });
      setProfiles(prev => prev.filter(p => p.id !== id));
      if (activeProfile?.id === id) {
        const remaining = profiles.filter(p => p.id !== id);
        setActiveProfileState(remaining[0] || null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete profile');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const setActiveProfile = (profile: HandwritingProfile | null) => {
    setActiveProfileState(profile);
    if (profile) {
      fetchWithAuth(`/handwriting/profiles/${profile.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: true }),
      }).catch(console.error);
    }
  };

  const analyzeHandwriting = async (profileId: string): Promise<HandwritingProfile> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchWithAuth(`/handwriting/profiles/${profileId}/analyze`, { method: 'POST' });
      const updated = data.profile;
      setProfiles(prev => prev.map(p => p.id === profileId ? updated : p));
      if (activeProfile?.id === profileId) setActiveProfileState(updated);
      return updated;
    } catch (err: any) {
      setError(err.message || 'Failed to analyze handwriting');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getCharacteristics = (): HandwritingCharacteristics | null => {
    if (!activeProfile) return null;
    return activeProfile.characteristics;
  };

  // ==================== SAMPLES ====================

  const fetchSamples = async (profileId: string) => {
    setIsSamplesLoading(true);
    try {
      const data = await fetchWithAuth(`/handwriting/profiles/${profileId}/samples`);
      setSamples(data.samples);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch samples');
    } finally {
      setIsSamplesLoading(false);
    }
  };

  const addSample = async (profileId: string, file: File, isPrimary = false): Promise<HandwritingSample> => {
    setIsSamplesLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('isPrimary', isPrimary.toString());
      const data = await fetchWithAuth(`/handwriting/profiles/${profileId}/samples`, {
        method: 'POST',
        body: formData,
      });
      const newSample = data.sample;
      setSamples(prev => [...prev, newSample]);
      return newSample;
    } catch (err: any) {
      setError(err.message || 'Failed to add sample');
      throw err;
    } finally {
      setIsSamplesLoading(false);
    }
  };

  const removeSample = async (sampleId: string) => {
    setIsSamplesLoading(true);
    setError(null);
    try {
      await fetchWithAuth(`/handwriting/samples/${sampleId}`, { method: 'DELETE' });
      setSamples(prev => prev.filter(s => s.id !== sampleId));
    } catch (err: any) {
      setError(err.message || 'Failed to remove sample');
      throw err;
    } finally {
      setIsSamplesLoading(false);
    }
  };

  const setPrimarySample = async (profileId: string, sampleId: string) => {
    setIsSamplesLoading(true);
    setError(null);
    try {
      const data = await fetchWithAuth(`/handwriting/profiles/${profileId}/samples/${sampleId}/primary`, {
        method: 'PUT',
      });
      const updated = data.profile;
      setProfiles(prev => prev.map(p => p.id === profileId ? updated : p));
      if (activeProfile?.id === profileId) setActiveProfileState(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to set primary sample');
      throw err;
    } finally {
      setIsSamplesLoading(false);
    }
  };

  const analyzeMultiSample = async (profileId: string): Promise<MultiSampleAnalysisResult> => {
    setIsSamplesLoading(true);
    setError(null);
    try {
      const data = await fetchWithAuth(`/handwriting/profiles/${profileId}/analyze-multi`, { method: 'POST' });
      const result = data.result;
      // Update profile with combined characteristics
      const updated = data.profile;
      setProfiles(prev => prev.map(p => p.id === profileId ? updated : p));
      if (activeProfile?.id === profileId) setActiveProfileState(updated);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to analyze multi-sample');
      throw err;
    } finally {
      setIsSamplesLoading(false);
    }
  };

  // ==================== GENERATION SETTINGS ====================

  const fetchGenerationSettings = async () => {
    setIsSettingsLoading(true);
    try {
      const data = await fetchWithAuth('/handwriting/generation-settings');
      setGenerationSettings(data.settings);
      const active = data.settings.find((s: GenerationSettings) => s.isDefault);
      if (active) setActiveGenerationSettingsState(active);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch generation settings');
    } finally {
      setIsSettingsLoading(false);
    }
  };

  const createGenerationSettings = async (data: Partial<GenerationSettings>): Promise<GenerationSettings> => {
    setIsSettingsLoading(true);
    setError(null);
    try {
      const response = await fetchWithAuth('/handwriting/generation-settings', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      const newSettings = response.settings;
      setGenerationSettings(prev => [...prev, newSettings]);
      if (newSettings.isDefault) setActiveGenerationSettingsState(newSettings);
      return newSettings;
    } catch (err: any) {
      setError(err.message || 'Failed to create generation settings');
      throw err;
    } finally {
      setIsSettingsLoading(false);
    }
  };

  const updateGenerationSettings = async (id: string, data: Partial<GenerationSettings>) => {
    setIsSettingsLoading(true);
    setError(null);
    try {
      const response = await fetchWithAuth(`/handwriting/generation-settings/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      const updated = response.settings;
      setGenerationSettings(prev => prev.map(s => s.id === id ? updated : s));
      if (activeGenerationSettings?.id === id) setActiveGenerationSettingsState(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to update generation settings');
      throw err;
    } finally {
      setIsSettingsLoading(false);
    }
  };

  const deleteGenerationSettings = async (id: string) => {
    setIsSettingsLoading(true);
    setError(null);
    try {
      await fetchWithAuth(`/handwriting/generation-settings/${id}`, { method: 'DELETE' });
      setGenerationSettings(prev => prev.filter(s => s.id !== id));
      if (activeGenerationSettings?.id === id) {
        const remaining = generationSettings.filter(s => s.id !== id);
        setActiveGenerationSettingsState(remaining[0] || null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete generation settings');
      throw err;
    } finally {
      setIsSettingsLoading(false);
    }
  };

  const setActiveGenerationSettings = (settings: GenerationSettings | null) => {
    setActiveGenerationSettingsState(settings);
    if (settings) {
      fetchWithAuth(`/handwriting/generation-settings/${settings.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isDefault: true }),
      }).catch(console.error);
    }
  };

  const getDefaultGenerationSettings = (): GenerationSettings | null => {
    return generationSettings.find(s => s.isDefault) || generationSettings[0] || null;
  };

  // ==================== GENERATION JOBS ====================

  const fetchGenerationJobs = async (limit = 20, offset = 0) => {
    setIsJobsLoading(true);
    try {
      const data = await fetchWithAuth(`/handwriting/generated?limit=${limit}&offset=${offset}`);
      setGenerationJobs(data.assignments);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch generation jobs');
    } finally {
      setIsJobsLoading(false);
    }
  };

  const createGenerationJob = async (options: any): Promise<GeneratedAssignment> => {
    setIsJobsLoading(true);
    setError(null);
    try {
      const data = await fetchWithAuth('/handwriting/generate', {
        method: 'POST',
        body: JSON.stringify(options),
      });
      const job = data.job;
      setGenerationJobs(prev => [job, ...prev]);
      return job;
    } catch (err: any) {
      setError(err.message || 'Failed to create generation job');
      throw err;
    } finally {
      setIsJobsLoading(false);
    }
  };

  const getGenerationJob = async (jobId: string): Promise<GeneratedAssignment | null> => {
    try {
      const data = await fetchWithAuth(`/handwriting/generate/${jobId}`);
      return data.job;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch generation job');
      return null;
    }
  };

  const cancelGenerationJob = async (jobId: string): Promise<boolean> => {
    setIsJobsLoading(true);
    setError(null);
    try {
      await fetchWithAuth(`/handwriting/generate/${jobId}/cancel`, { method: 'POST' });
      setGenerationJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'failed' as const, errorMessage: 'Cancelled by user' } : j));
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to cancel generation job');
      return false;
    } finally {
      setIsJobsLoading(false);
    }
  };

  // ==================== FORGE API ====================

  const checkForgeStatus = async () => {
    setIsForgeLoading(true);
    try {
      const data = await fetchWithAuth('/handwriting/forge/status');
      setForgeStatus(data.status);
    } catch (err: any) {
      setError(err.message || 'Failed to check Forge status');
      setForgeStatus({ healthy: false, status: 'unhealthy', lastCheck: new Date().toISOString() });
    } finally {
      setIsForgeLoading(false);
    }
  };

  const retryForgeConnection = async () => {
    setIsForgeLoading(true);
    try {
      const data = await fetchWithAuth('/handwriting/forge/check', { method: 'POST' });
      setForgeStatus(data);
      return data.healthy;
    } catch (err: any) {
      setError(err.message || 'Failed to check Forge status');
      setForgeStatus({ healthy: false, status: 'unhealthy', lastCheck: new Date().toISOString() });
      return false;
    } finally {
      setIsForgeLoading(false);
    }
  };

  const getRealisticOptions = async () => {
    try {
      const data = await fetchWithAuth('/handwriting/realistic/options');
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to get realistic options');
      return { styles: [], penColors: [] };
    }
  };

  // ==================== REALISTIC HANDWRITING ====================

  const getDefaultRealisticOptions = (style: RealisticStyle = 'cursive', penColor: PenColor = 'blue'): RealisticHandwritingOptions => {
    return {
      style,
      penColor,
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
  };

  return (
    <HandwritingContext.Provider value={{
      // Profiles
      profiles,
      activeProfile,
      isLoading,
      error,
      fetchProfiles,
      createProfile,
      updateProfile,
      deleteProfile,
      setActiveProfile,
      analyzeHandwriting,
      getCharacteristics,
      // Samples
      samples,
      isSamplesLoading,
      addSample,
      removeSample,
      fetchSamples,
      setPrimarySample,
      analyzeMultiSample,
      // Generation Settings
      generationSettings,
      activeGenerationSettings,
      isSettingsLoading,
      fetchGenerationSettings,
      createGenerationSettings,
      updateGenerationSettings,
      deleteGenerationSettings,
      setActiveGenerationSettings,
      getDefaultGenerationSettings,
      // Generation Jobs
      generationJobs,
      isJobsLoading,
      fetchGenerationJobs,
      createGenerationJob,
      getGenerationJob,
      cancelGenerationJob,
      // Forge
      forgeStatus,
      isForgeLoading,
      checkForgeStatus,
      retryForgeConnection,
      getRealisticOptions,
      // Realistic Handwriting
      getDefaultRealisticOptions,
    }}>
      {children}
    </HandwritingContext.Provider>
  );
}

export function useHandwriting() {
  const context = useContext(HandwritingContext);
  if (!context) {
    throw new Error('useHandwriting must be used within a HandwritingProvider');
  }
  return context;
}