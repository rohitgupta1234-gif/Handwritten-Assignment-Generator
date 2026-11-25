import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout, AuthLayout, LandingLayout } from './components/layout/MainLayout';
import { ProtectedRoute, PublicRoute } from './components/auth/ProtectedRoute';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

// Lazy load pages for code splitting
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const CreateAssignmentPage = lazy(() => import('./pages/CreateAssignmentPage').then(m => ({ default: m.CreateAssignmentPage })));
const HandwritingProfilePage = lazy(() => import('./pages/HandwritingProfilePage').then(m => ({ default: m.HandwritingProfilePage })));
const MyAssignmentsPage = lazy(() => import('./pages/MyAssignmentsPage').then(m => ({ default: m.MyAssignmentsPage })));
const AssignmentPreviewPage = lazy(() => import('./pages/AssignmentPreviewPage').then(m => ({ default: m.AssignmentPreviewPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));

function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-notebook-paper-100">
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
          <Routes>
            {/* Landing Page */}
            <Route element={<LandingLayout />}>
              <Route path="/" element={<LandingPage />} />
            </Route>

            {/* Auth Pages - Public routes that redirect to dashboard if authenticated */}
            <Route element={<PublicRoute><AuthLayout /></PublicRoute>}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<div className="p-8 text-center">Forgot Password Page</div>} />
            </Route>

            {/* Protected Pages with Sidebar - Require authentication */}
            <Route element={<ProtectedRoute><MainLayout showSidebar={true} /></ProtectedRoute>}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/create-assignment" element={<CreateAssignmentPage />} />
              <Route path="/handwriting-profile" element={<HandwritingProfilePage />} />
              <Route path="/my-assignments" element={<MyAssignmentsPage />} />
              <Route path="/assignments" element={<Navigate to="/my-assignments" replace />} />
              <Route path="/assignment-preview" element={<AssignmentPreviewPage />} />
              <Route path="/assignments/:id/preview" element={<AssignmentPreviewPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* Redirect unknown routes */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
    </ErrorBoundary>
  );
}

export default App;