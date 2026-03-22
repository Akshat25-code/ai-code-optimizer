import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Header from "./components/Header";

// Lazy-load page components for code splitting
const WelcomePage = lazy(() => import("./components/WelcomePage"));
const CodeOptimizer = lazy(() => import("./components/CodeOptimizerPro"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const OptimizationPage = lazy(() => import("./pages/OptimizationPage"));
const AnalysisPage = lazy(() => import("./pages/AnalysisPage"));
const BugDetectionPage = lazy(() => import("./pages/BugDetectionPage"));
const DocumentationPage = lazy(() => import("./pages/DocumentationPage"));
const RefactoringPage = lazy(() => import("./pages/RefactoringPage"));
const DebuggingPage = lazy(() => import("./pages/DebuggingPage"));

// Loading fallback for lazy-loaded routes
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-color, #0a0a0a)' }}>
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
      <p className="text-sm text-gray-400">Loading...</p>
    </div>
  </div>
);

function GuardedRoutes() {
  return (
    <>
      <Header />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/optimize" element={<CodeOptimizer />} />
          {/* Individual Feature Pages */}
          <Route path="/optimization" element={<OptimizationPage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/bug-detection" element={<BugDetectionPage />} />
          <Route path="/documentation" element={<DocumentationPage />} />
          <Route path="/refactoring" element={<RefactoringPage />} />
          <Route path="/debugging" element={<DebuggingPage />} />
          {/* Auth Pages */}
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <GuardedRoutes />
    </AuthProvider>
  );
}

export default App;
