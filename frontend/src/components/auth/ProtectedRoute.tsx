import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * ProtectedRoute - Wrapper component that ensures user is authenticated
 * before rendering protected content.
 * Redirects to /login if not authenticated.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading, isInitialized, isAuthenticated } = useAuth();
  const location = useLocation();

  // Show loading state while auth is initializing
  if (isLoading || !isInitialized) {
    return (
      <div className="min-h-screen bg-notebook-paper-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-notebook-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-notebook-blue-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    // Save the current location to redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If requiredProfile is true, we could add a check here
  // but we'll let individual pages handle that since they have their own logic

  return <>{children}</>;
}

/**
 * PublicRoute - Wrapper component for public pages (login, register)
 * Redirects authenticated users to /dashboard
 */
export function PublicRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-notebook-paper-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-notebook-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-notebook-blue-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}