import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { GitBranch, Play, Shield, AlertCircle, CheckCircle, Loader2, ExternalLink } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { API_ENDPOINTS } from "@/config/api";
import { AuthService } from "@/services/auth.service";

interface SandboxStatus {
  status: 'idle' | 'cloning' | 'installing' | 'running' | 'scanning' | 'completed' | 'failed';
  message: string;
  url?: string;
  scanId?: string;
  vulnerabilities?: number;
  codeScanResults?: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  } | null;
  penTestResults?: {
    vulnerabilitiesFound: number;
    riskScore: number;
  } | null;
  error?: string;
}

const SandboxScanPage = () => {
  const navigate = useNavigate();
  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [sandboxStatus, setSandboxStatus] = useState<SandboxStatus>({ status: 'idle', message: '' });
  const [logs, setLogs] = useState<Array<{ time: string; message: string; level: string }>>([]);

  const addLog = (message: string, level: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), message, level }]);
  };

  const handleCloneAndScan = async () => {
    if (!repoUrl.trim()) return;

    try {
      setLogs([]);
      setSandboxStatus({ status: 'cloning', message: 'Cloning repository...' });
      addLog('Starting sandbox environment...', 'info');
      addLog(`Cloning: ${repoUrl}`, 'info');

      const token = AuthService.getToken();
      const response = await fetch(API_ENDPOINTS.scan.sandboxScan, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          repoUrl: repoUrl.trim(),
          branch: branch.trim() || 'main',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start sandbox scan');
      }

      const { sandboxId } = await response.json();
      addLog('Repository cloned successfully', 'success');

      // Poll for status updates
      pollSandboxStatus(sandboxId);
    } catch (error: any) {
      console.error('Error starting sandbox scan:', error);
      setSandboxStatus({ status: 'failed', message: error.message, error: error.message });
      addLog(`Error: ${error.message}`, 'error');
    }
  };

  const pollSandboxStatus = async (sandboxId: string) => {
    const token = AuthService.getToken();
    
    const poll = async () => {
      try {
        const response = await fetch(`${API_ENDPOINTS.scan.sandboxStatus}/${sandboxId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Failed to get status');

        const data = await response.json();
        setSandboxStatus(data);

        // Replace logs entirely (don't accumulate)
        if (data.logs) {
          setLogs(data.logs);
        }

        // Continue polling if not done
        if (!['completed', 'failed'].includes(data.status)) {
          setTimeout(poll, 2000);
        } else if (data.status === 'completed') {
          // Don't auto-navigate — let user see the full summary first
          addLog(`Scan completed!`, 'success');
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    poll();
  };

  const getStatusIcon = () => {
    switch (sandboxStatus.status) {
      case 'cloning':
      case 'installing':
      case 'running':
      case 'scanning':
        return <Loader2 className="w-5 h-5 animate-spin text-primary" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      default:
        return <Shield className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const isProcessing = ['cloning', 'installing', 'running', 'scanning'].includes(sandboxStatus.status);

  return (
    <div className="min-h-screen bg-black">
      <Navigation />

      <div className="max-w-4xl mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-medium text-foreground mb-2">Sandbox Clone & Attack</h1>
          <p className="text-muted-foreground mb-8 font-light">
            Clone any GitHub repo, run it in a sandbox, and scan for vulnerabilities
          </p>

          {/* Input Section */}
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Repository URL</label>
                <div className="relative">
                  <GitBranch className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/username/repo"
                    disabled={isProcessing}
                    className="w-full pl-11 pr-4 py-2.5 rounded-md bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono text-sm disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-2">Branch (optional)</label>
                <input
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                  disabled={isProcessing}
                  className="w-full px-4 py-2.5 rounded-md bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono text-sm disabled:opacity-50"
                />
              </div>

              <button
                onClick={handleCloneAndScan}
                disabled={!repoUrl.trim() || isProcessing}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-md bg-primary text-black text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                <Play className="w-4 h-4" />
                {isProcessing ? 'Processing...' : 'Clone & Attack'}
              </button>
            </div>
          </div>

          {/* Status Section */}
          {sandboxStatus.status !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-lg p-6 mb-6"
            >
              <div className="flex items-center gap-3 mb-4">
                {getStatusIcon()}
                <div>
                  <h3 className="text-sm font-medium text-foreground">
                    {sandboxStatus.status.charAt(0).toUpperCase() + sandboxStatus.status.slice(1)}
                  </h3>
                  <p className="text-xs text-muted-foreground">{sandboxStatus.message}</p>
                </div>
              </div>

              {sandboxStatus.url && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                  <ExternalLink className="w-3 h-3" />
                  <span>Running at:</span>
                  <a
                    href={sandboxStatus.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-mono"
                  >
                    {sandboxStatus.url}
                  </a>
                </div>
              )}

              {/* Progress Steps */}
              <div className="space-y-2">
                {['cloning', 'installing', 'running', 'scanning', 'completed'].map((step, idx) => {
                  const currentIdx = ['cloning', 'installing', 'running', 'scanning', 'completed'].indexOf(sandboxStatus.status);
                  const isComplete = idx < currentIdx || sandboxStatus.status === 'completed';
                  const isCurrent = idx === currentIdx;

                  return (
                    <div key={step} className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                        isComplete ? 'bg-green-500/20 text-green-500' :
                        isCurrent ? 'bg-primary/20 text-primary' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {isComplete ? '✓' : idx + 1}
                      </div>
                      <span className={`text-sm ${
                        isComplete || isCurrent ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                        {step.charAt(0).toUpperCase() + step.slice(1)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Results Summary — shown when completed */}
              {sandboxStatus.status === 'completed' && (
                <div className="mt-5 space-y-4">
                  <p className="text-xs font-medium text-foreground uppercase tracking-wider">Scan Report</p>

                  {/* AI Code Analysis */}
                  {sandboxStatus.codeScanResults ? (
                    <div className="rounded-md border border-border bg-background p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-foreground">AI Code Analysis</p>
                        <span className="text-xs text-muted-foreground">{sandboxStatus.codeScanResults.total} total issues</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: 'Critical', val: sandboxStatus.codeScanResults.critical, color: 'text-red-500', bg: 'bg-red-500/10' },
                          { label: 'High', val: sandboxStatus.codeScanResults.high, color: 'text-orange-500', bg: 'bg-orange-500/10' },
                          { label: 'Medium', val: sandboxStatus.codeScanResults.medium, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
                          { label: 'Low', val: sandboxStatus.codeScanResults.low, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                        ].map(({ label, val, color, bg }) => (
                          <div key={label} className={`rounded p-2 text-center ${bg}`}>
                            <p className={`text-xl font-bold ${color}`}>{val}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                          </div>
                        ))}
                      </div>
                      {sandboxStatus.codeScanResults.total === 0 && (
                        <p className="text-xs text-muted-foreground mt-2 text-center">No code vulnerabilities detected</p>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-md border border-border bg-background p-4 text-center">
                      <p className="text-xs text-muted-foreground">AI code analysis was skipped or failed</p>
                    </div>
                  )}

                  {/* Website Scan */}
                  {sandboxStatus.scanId ? (
                    <div className="rounded-md border border-border bg-background p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-foreground">Website Scan</p>
                        <span className="text-xs text-green-500">✓ Complete</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {sandboxStatus.vulnerabilities ?? 0} header/SSL/HTML issues found on the running app
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-md border border-border bg-background p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-foreground">Website Scan</p>
                        <span className="text-xs text-yellow-500">Skipped</span>
                      </div>
                      <p className="text-xs text-muted-foreground">App could not be booted (unsupported runtime)</p>
                    </div>
                  )}

                  {/* Pen Test */}
                  {sandboxStatus.penTestResults ? (
                    <div className="rounded-md border border-border bg-background p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-foreground">Penetration Test</p>
                        <span className="text-xs text-green-500">✓ Complete</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded p-2 text-center bg-red-500/10">
                          <p className="text-xl font-bold text-red-500">{sandboxStatus.penTestResults.vulnerabilitiesFound}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Vulnerabilities</p>
                        </div>
                        <div className={`rounded p-2 text-center ${sandboxStatus.penTestResults.riskScore >= 70 ? 'bg-red-500/10' : sandboxStatus.penTestResults.riskScore >= 40 ? 'bg-yellow-500/10' : 'bg-green-500/10'}`}>
                          <p className={`text-xl font-bold ${sandboxStatus.penTestResults.riskScore >= 70 ? 'text-red-500' : sandboxStatus.penTestResults.riskScore >= 40 ? 'text-yellow-500' : 'text-green-500'}`}>
                            {sandboxStatus.penTestResults.riskScore}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">Risk Score /100</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-md border border-border bg-background p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground">Penetration Test</p>
                        <span className="text-xs text-yellow-500">Skipped</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">App could not be booted (unsupported runtime)</p>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-1">
                    {sandboxStatus.scanId && (
                      <button
                        onClick={() => navigate(`/website-scan/${sandboxStatus.scanId}`)}
                        className="flex-1 py-2 rounded-md bg-primary text-black text-sm font-medium hover:opacity-90 transition-opacity"
                      >
                        View Website Report
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSandboxStatus({ status: 'idle', message: '' });
                        setLogs([]);
                      }}
                      className="flex-1 py-2 rounded-md border border-border text-foreground text-sm hover:bg-card transition-colors"
                    >
                      Scan Another Repo
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Logs Section */}
          {logs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-lg p-6"
            >
              <h3 className="text-sm font-medium text-foreground mb-4">Activity Log</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto font-mono text-xs">
                {logs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <span className="text-muted-foreground shrink-0">{log.time}</span>
                    <span className={`${
                      log.level === 'error' ? 'text-destructive' :
                      log.level === 'success' ? 'text-green-500' :
                      log.level === 'warning' ? 'text-yellow-500' :
                      'text-muted-foreground'
                    }`}>
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Info Box */}
          <div className="mt-6 bg-primary/5 border border-primary/20 rounded-lg p-4">
            <h3 className="text-sm font-medium text-foreground mb-2">How it works</h3>
            <ul className="text-xs text-muted-foreground space-y-1.5 font-light">
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-primary" />
                Clones the repository in an isolated sandbox environment
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-primary" />
                AI scans all code files for vulnerabilities (no GitHub token needed)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-primary" />
                Supports Node.js, Python, Go, Ruby, and PHP projects
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-primary" />
                Boots the app and runs website scan + penetration test in parallel
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-primary" />
                Sandbox is destroyed after scan completes
              </li>
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SandboxScanPage;
