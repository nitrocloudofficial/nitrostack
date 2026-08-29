import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import AuthCallback from "./pages/AuthCallback";
import RepoSelectPage from "./pages/RepoSelectPage";
import ScanProgressPage from "./pages/ScanProgressPage";
import ResultsPage from "./pages/ResultsPage";
import EditorPage from "./pages/EditorPage";
import MonitoringPage from "./pages/MonitoringPage";
import WebsiteScanPage from "./pages/WebsiteScanPage";
import WebsiteScanResultsPage from "./pages/WebsiteScanResultsPage";
import ComprehensiveWebsiteScanResults from "./pages/ComprehensiveWebsiteScanResults";
import PenetrationTestPage from "./pages/PenetrationTestPage";
import LoadTestPage from "./pages/LoadTestPage";
import DomainVerificationPage from "./pages/DomainVerificationPage";
import ScanHistoryPage from "./pages/ScanHistoryPage";
import UnifiedHistoryPage from "./pages/UnifiedHistoryPage";
import ProfilePage from "./pages/ProfilePage";
import SandboxScanPage from "./pages/SandboxScanPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/repos" element={<RepoSelectPage />} />
            <Route path="/scan" element={<ScanProgressPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/editor" element={<EditorPage />} />
            <Route path="/monitoring" element={<MonitoringPage />} />
            <Route path="/website-scan" element={<WebsiteScanPage />} />
            <Route path="/website-scan/:scanId" element={<ComprehensiveWebsiteScanResults />} />
            <Route path="/website-scan-basic/:scanId" element={<WebsiteScanResultsPage />} />
            <Route path="/pentest" element={<PenetrationTestPage />} />
            <Route path="/loadtest" element={<LoadTestPage />} />
            <Route path="/domain-verification" element={<DomainVerificationPage />} />
            <Route path="/scan-history" element={<UnifiedHistoryPage />} />
            <Route path="/sandbox" element={<SandboxScanPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
