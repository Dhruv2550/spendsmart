// src/App.tsx - Updated with proper routing for page persistence
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import SignUpPage from './components/auth/SignUpPage';
import ConfirmationPage from './components/auth/ConfirmationPage';
import { DarkModeProvider } from "./contexts/DarkModeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import AppLayout from "./components/AppLayout";
import LoginPage from "./components/auth/LoginPage";

const queryClient = new QueryClient();

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    // Show loading spinner while checking authentication
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Public Route Component (redirects to dashboard if already logged in)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <DarkModeProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              } 
            />
            <Route 
              path="/signup" 
              element={
                <PublicRoute>
                  <SignUpPage />
                </PublicRoute>
              } 
            />
            <Route 
              path="/confirm-email" 
              element={
                <PublicRoute>
                  <ConfirmationPage />
                </PublicRoute>
              } 
            />
            
            {/* Protected Routes - Individual pages with proper URLs */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <AppLayout currentPage="dashboard" />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/analytics" 
              element={
                <ProtectedRoute>
                  <AppLayout currentPage="analytics" />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/goals" 
              element={
                <ProtectedRoute>
                  <AppLayout currentPage="goals" />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/recurring" 
              element={
                <ProtectedRoute>
                  <AppLayout currentPage="recurring" />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/budgeting" 
              element={
                <ProtectedRoute>
                  <AppLayout currentPage="budgeting" />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute>
                  <AppLayout currentPage="settings" />
                </ProtectedRoute>
              } 
            />
            
            {/* Root redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Catch-all redirect for unknown routes */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </DarkModeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;