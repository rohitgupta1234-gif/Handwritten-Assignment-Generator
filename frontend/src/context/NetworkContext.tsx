import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface QueuedRequest {
  id: string;
  config: {
    method: string;
    url: string;
    data?: unknown;
    params?: Record<string, unknown>;
    headers?: Record<string, string>;
  };
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timestamp: number;
  retries: number;
}

interface NetworkContextType {
  isOnline: boolean;
  isConnecting: boolean;
  queueLength: number;
  queueRequest: (config: {
    method: string;
    url: string;
    data?: unknown;
    params?: Record<string, unknown>;
    headers?: Record<string, string>;
  }) => Promise<unknown>;
  flushQueue: () => Promise<void>;
  clearQueue: () => void;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const STORAGE_KEY = 'offline_queue';

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [queue, setQueue] = useState<QueuedRequest[]>([]);

  // Load queue from localStorage on init
  useEffect(() => {
    const savedQueue = localStorage.getItem(STORAGE_KEY);
    if (savedQueue) {
      try {
        const parsed = JSON.parse(savedQueue);
        setQueue(parsed.map((item: Omit<QueuedRequest, 'resolve' | 'reject'>) => ({
          ...item,
          resolve: () => {},
          reject: () => {},
        })));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Save queue to localStorage
  useEffect(() => {
    if (queue.length > 0) {
      const serializable = queue.map(({ resolve, reject, ...rest }) => rest);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [queue]);

  // Network status detection
  useEffect(() => {
    const updateOnlineStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      if (online) {
        setIsConnecting(true);
        // Small delay to ensure connection is stable
        setTimeout(() => {
          setIsConnecting(false);
          flushQueue();
        }, 500);
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Initial check
    updateOnlineStatus();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const flushQueue = useCallback(async () => {
    if (!isOnline || queue.length === 0) return;

    const currentQueue = [...queue];

    for (const request of currentQueue) {
      if (!isOnline) break;

      try {
        // Dynamic import to avoid circular dependency
        const { default: api } = await import('../utils/api');

        const response = await api.request({
          method: request.config.method,
          url: request.config.url,
          data: request.config.data,
          params: request.config.params,
          headers: request.config.headers,
        });

        request.resolve(response.data);

        // Remove from queue
        setQueue(prev => prev.filter(q => q.id !== request.id));
      } catch (error) {
        const axiosError = error as { response?: { status?: number }; message: string };

        // Don't retry on 4xx errors (except 429)
        const status = axiosError.response?.status;
        const shouldRetry = !status || status >= 500 || status === 429;

        if (shouldRetry && request.retries < MAX_RETRIES) {
          // Update retry count
          setQueue(prev => prev.map(q =>
            q.id === request.id ? { ...q, retries: q.retries + 1 } : q
          ));

          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (request.retries + 1)));
        } else {
          // Max retries reached or non-retryable error
          request.reject(new Error(axiosError.message || 'Request failed'));
          setQueue(prev => prev.filter(q => q.id !== request.id));
        }
      }
    }
  }, [isOnline, queue]);

  const queueRequest = useCallback((config: QueuedRequest['config']): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        config,
        resolve,
        reject,
        timestamp: Date.now(),
        retries: 0,
      };

      setQueue(prev => [...prev, request]);

      // Try to flush immediately if online
      if (isOnline) {
        flushQueue();
      }
    });
  }, [isOnline, flushQueue]);

  const clearQueue = useCallback(() => {
    const errors = queue.map(req => req.reject(new Error('Queue cleared')));
    Promise.all(errors).catch(() => {});
    setQueue([]);
  }, [queue]);

  return (
    <NetworkContext.Provider value={{
      isOnline,
      isConnecting,
      queueLength: queue.length,
      queueRequest,
      flushQueue,
      clearQueue,
    }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
}

// Hook for components that want to show network status
export function useNetworkStatus() {
  const { isOnline, isConnecting, queueLength } = useNetwork();
  return { isOnline, isConnecting, queueLength };
}