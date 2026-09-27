import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { MainLayout } from './layouts/MainLayout';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';

import { Dashboard } from './pages/Dashboard';
import { CreditAnalysis } from './pages/CreditAnalysis';
import { LoanApplication } from './pages/LoanApplication';
import { ActiveLoans } from './pages/ActiveLoans';
import { LoanHistory } from './pages/LoanHistory';
import { Repayment } from './pages/Repayment';
import { RepaymentDashboard } from './pages/RepaymentDashboard';
import { FraudShield } from './pages/FraudShield';
import { InvoiceUpload } from './pages/InvoiceUpload';
import { Succession } from './pages/Succession';
import { SuccessionDashboard } from './pages/SuccessionDashboard';
import { Nominee } from './pages/Nominee';
import { NomineeDashboard } from './pages/NomineeDashboard';
import { Claims } from './pages/Claims';
import { Reports } from './pages/Reports';
import { Notifications } from './pages/Notifications';
import { Profile } from './pages/Profile';
import { Admin } from './pages/Admin';
import { AdminDashboard } from './pages/AdminDashboard';
import { AnalyticsDashboard } from './pages/AnalyticsDashboard';
import { Settings } from './pages/Settings';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <MainLayout>{children}</MainLayout>;
};

export const AppContent: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/credit-analysis" element={<ProtectedRoute><CreditAnalysis /></ProtectedRoute>} />
      <Route path="/loan-application" element={<ProtectedRoute><LoanApplication /></ProtectedRoute>} />
      <Route path="/active-loans" element={<ProtectedRoute><ActiveLoans /></ProtectedRoute>} />
      <Route path="/loan-history" element={<ProtectedRoute><LoanHistory /></ProtectedRoute>} />
      <Route path="/repayment" element={<ProtectedRoute><Repayment /></ProtectedRoute>} />
      <Route path="/repayment-dashboard" element={<ProtectedRoute><RepaymentDashboard /></ProtectedRoute>} />
      <Route path="/fraud-shield" element={<ProtectedRoute><FraudShield /></ProtectedRoute>} />
      <Route path="/invoice-upload" element={<ProtectedRoute><InvoiceUpload /></ProtectedRoute>} />
      <Route path="/succession" element={<ProtectedRoute><Succession /></ProtectedRoute>} />
      <Route path="/succession-dashboard" element={<ProtectedRoute><SuccessionDashboard /></ProtectedRoute>} />
      <Route path="/nominee" element={<ProtectedRoute><Nominee /></ProtectedRoute>} />
      <Route path="/nominee-dashboard" element={<ProtectedRoute><NomineeDashboard /></ProtectedRoute>} />
      <Route path="/claims" element={<ProtectedRoute><Claims /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
      <Route path="/admin-dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
      <Route path="/analytics-dashboard" element={<ProtectedRoute><AnalyticsDashboard /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <NotificationProvider>
          <Router>
            <AppContent />
          </Router>
        </NotificationProvider>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;
