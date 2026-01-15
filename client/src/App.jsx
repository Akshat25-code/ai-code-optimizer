import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import WelcomePage from "./components/WelcomePage";
import CodeOptimizer from "./components/CodeOptimizerPro";
import { AuthProvider } from "./contexts/AuthContext";
import Header from "./components/Header";
import AuthPage from "./pages/AuthPage";
import ProfilePage from "./pages/ProfilePage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import PhoneLoginPage from "./pages/PhoneLoginPage";
import OptimizationPage from "./pages/OptimizationPage";
import AnalysisPage from "./pages/AnalysisPage";
import BugDetectionPage from "./pages/BugDetectionPage";
import DocumentationPage from "./pages/DocumentationPage";
import RefactoringPage from "./pages/RefactoringPage";
import DebuggingPage from "./pages/DebuggingPage";
import { useAuth } from "./contexts/AuthContext";

function GuardedRoutes() {
  return (
    <>
      <Header />
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
        <Route path="/auth/phone" element={<PhoneLoginPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
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
