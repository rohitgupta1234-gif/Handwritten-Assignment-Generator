import { useNetworkStatus } from '../../context/NetworkContext';
import { Wifi, WifiOff, Loader2, AlertTriangle } from 'lucide-react';

export function NetworkStatusIndicator() {
  const { isOnline, isConnecting, queueLength } = useNetworkStatus();

  if (isOnline && !isConnecting && queueLength === 0) {
    return null; // Don't show when everything is normal
  }

  if (isConnecting) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-800 text-sm font-medium animate-pulse">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Reconnecting...</span>
        {queueLength > 0 && (
          <span className="px-2 py-0.5 bg-blue-200 rounded-full text-xs">
            {queueLength} queued
          </span>
        )}
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 text-sm font-medium">
        <WifiOff className="w-4 h-4" />
        <span>Offline</span>
        {queueLength > 0 && (
          <span className="px-2 py-0.5 bg-amber-200 rounded-full text-xs">
            {queueLength} queued
          </span>
        )}
      </div>
    );
  }

  // Online but has queued requests
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 text-green-800 text-sm font-medium animate-pulse">
      <Wifi className="w-4 h-4" />
      <span>Syncing...</span>
      <span className="px-2 py-0.5 bg-green-200 rounded-full text-xs">
        {queueLength} remaining
      </span>
    </div>
  );
}

// Detailed network status for settings or debug pages
export function NetworkStatusDetail() {
  const { isOnline, isConnecting, queueLength } = useNetworkStatus();

  return (
    <div className="p-4 rounded-lg bg-white border border-gray-200">
      <h3 className="font-semibold text-gray-900 mb-3">Network Status</h3>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Connection</span>
          <span className={`font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Sync Status</span>
          <span className={`font-medium ${isConnecting ? 'text-blue-600' : queueLength > 0 ? 'text-amber-600' : 'text-green-600'}`}>
            {isConnecting ? 'Reconnecting...' : queueLength > 0 ? `Syncing (${queueLength} queued)` : 'Synced'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Queued Requests</span>
          <span className="font-medium text-gray-900">{queueLength}</span>
        </div>
      </div>
      {!isOnline && (
        <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <div className="flex items-center gap-2 text-amber-800 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Changes will be synced when connection is restored.</span>
          </div>
        </div>
      )}
    </div>
  );
}