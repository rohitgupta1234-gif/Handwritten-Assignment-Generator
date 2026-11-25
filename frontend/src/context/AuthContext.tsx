import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { User } from '../types';
import api, { setTokenRefresher } from '../utils/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Token refresh state (module-level for shared state across component instances)
let refreshTokenPromise: Promise<void> | null = null;
let isRefreshing = false;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Proactively refresh token before expiry (10 minutes before 15-min expiry)
  const scheduleTokenRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    const REFRESH_BEFORE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
    refreshTimerRef.current = setTimeout(() => {
      refreshToken().catch(() => {
        // If refresh fails, the 401 interceptor will handle logout
      });
    }, REFRESH_BEFORE_EXPIRY_MS);
  }, []);

  // Proactive token refresh - prevents multiple simultaneous refresh requests
  const refreshToken = useCallback(async () => {
    // If already refreshing, return the existing promise
    if (isRefreshing && refreshTokenPromise) {
      return refreshTokenPromise;
    }

    isRefreshing = true;

    refreshTokenPromise = (async () => {
      try {
        const response = await api.post('/auth/refresh');
        const { accessToken: token, user: userData } = response.data;
        localStorage.setItem('token', token);
        setUser(userData);
        scheduleTokenRefresh();
      } finally {
        isRefreshing = false;
        refreshTokenPromise = null;
      }
    })();

    return refreshTokenPromise;
  }, [scheduleTokenRefresh]);

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
    } catch (error) {
      setUser(null);
      throw error;
    }
  }, []);

  useEffect(() => {
    // Register token refresher with API interceptor FIRST, before initAuth
    // This ensures the 401 interceptor has a refresh function available
    // for the initial /auth/me call in initAuth
    setTokenRefresher(() => refreshToken());

    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          await refreshUser();
          // Wait for the user state to be updated in React
          await new Promise(resolve => setTimeout(resolve, 0));
          scheduleTokenRefresh();
          // Notify other contexts that auth state was restored
          window.dispatchEvent(new CustomEvent('auth:login'));
        } catch {
          localStorage.removeItem('token');
        }
      }
      setIsLoading(false);
      setIsInitialized(true);
    };
    initAuth();

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [refreshUser, scheduleTokenRefresh, refreshToken]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    const { accessToken: token, user: userData } = response.data;
    localStorage.setItem('token', token);
    setUser(userData);
    scheduleTokenRefresh();
    // Notify other contexts that auth state changed
    window.dispatchEvent(new CustomEvent('auth:login'));
  }, [scheduleTokenRefresh]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const response = await api.post('/auth/register', { name, email, password });
    const { accessToken: token, user: userData } = response.data;
    localStorage.setItem('token', token);
    setUser(userData);
    scheduleTokenRefresh();
    // Notify other contexts that auth state changed
    window.dispatchEvent(new CustomEvent('auth:login'));
  }, [scheduleTokenRefresh]);

  const logout = useCallback(async () => {
    // Clear the refresh timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    isRefreshing = false;
    refreshTokenPromise = null;

    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('token');
      setUser(null);
    }
    // Notify other contexts that auth state changed
    window.dispatchEvent(new CustomEvent('auth:logout'));
  }, []);

  const updateProfile = useCallback(async (data: Partial<User>) => {
    const response = await api.put('/auth/profile', data);
    setUser(response.data.user);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isInitialized,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      updateProfile,
      refreshUser,
      refreshToken,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}