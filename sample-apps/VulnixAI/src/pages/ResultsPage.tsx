import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle, Download, GitPullRequest, Code2,
  ChevronDown, ChevronRight, FileWarning, CheckCircle2, XCircle, Loader2
} from "lucide-react";
import { Severity, Vulnerability, ScanResult } from "@/types/sentinel";
import { Navigation } from "@/components/Navigation";
import { ScanService } from "@/services/scan.service";
import { AuthService } from "@/services/auth.service";
import { API_ENDPOINTS } from "@/config/api";

const severityConfig: Record<Severity, { color: string; bg: string; border: string }> = {
  critical: { color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30" },
  high: { color: "text-warning", bg: "bg-warning/10", border: "border-warning/30" },
  medium: { color: "text-primary", bg: "bg-primary/10", border: "border-primary/30" },
  low: { color: "text-muted-foreground", bg: "bg-muted", border: "border-border" },
};

const SeverityBadge = ({ severity }: { severity: Severity }) => {
  const cfg = severityConfig[severity];
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-mono uppercase ${cfg.color} ${cfg.bg} ${cfg.border} border`}>
      {severity}
    </span>
  );
};

const VulnRow = ({ vuln, onViewDiff }: { vuln: Vulnerability; onViewDiff: () => void }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border rounded-lg overflow-hidden ${severityConfig[vuln.severity].border} bg-card`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-secondary/30 transition-colors"
      >
        <span className="shrink-0">{open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}</span>
        <SeverityBadge severity={vuln.severity} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground truncate">{vuln.title}</div>
          <div className="text-xs text-muted-foreground font-mono mt-0.5 flex items-center gap-2 font-light">
            <FileWarning className="w-3 h-3" />
            {vuln.file}:{vuln.line}
            <span className="opacity-50">|</span>
            <span>{vuln.scanner}</span>
            <span className="opacity-50">|</span>
            <span>{vuln.cweId}</span>
          </div>
        </div>
        {vuln.fixAvailable ? (
          <span className="shrink-0 flex items-center gap-1 text-xs text-success font-mono font-light">
            <CheckCircle2 className="w-3.5 h-3.5" /> Patch ready
          </span>
        ) : (
          <span className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground font-mono font-light">
            <XCircle className="w-3.5 h-3.5" /> Manual fix
          </span>
        )}
      </button>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-t border-border px-4 py-4 space-y-4"
        >
          <p className="text-sm text-secondary-foreground font-light">{vuln.description}</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-mono text-destructive mb-2">— VULNERABLE</div>
              <pre className="bg-destructive/5 border border-destructive/20 rounded-md p-3 text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap font-light">
                {vuln.originalCode}
              </pre>
            </div>
            <div>
              <div className="text-xs font-mono text-success mb-2">+ PATCHED</div>
              <pre className="bg-success/5 border border-success/20 rounded-md p-3 text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap font-light">
                {vuln.patchedCode}
              </pre>
            </div>
          </div>
          <button
            onClick={onViewDiff}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-black text-sm hover:opacity-90 transition-opacity"
          >
            <Code2 className="w-4 h-4" /> Open in Editor
          </button>
        </motion.div>
      )}
    </div>
  );
};

const ResultsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const scanId = searchParams.get("scanId");
  const isWebsite = searchParams.get("mode") === "website";
  const websiteUrl = searchParams.get("url") || "";
  
  const [scanData, setScanData] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingPR, setCreatingPR] = useState(false);
  const [prCreated, setPrCreated] = useState<{ url: string; number: number } | null>(null);

  useEffect(() => {
    if (!scanId && !isWebsite) {
      navigate("/repos");
      return;
    }

    if (scanId) {
      fetchScanResults();
    } else {
      // For website mode, use mock data for now
      setLoading(false);
    }
  }, [scanId]);

  const fetchScanResults = async () => {
    if (!scanId) return;

    try {
      setLoading(true);
      const results = await ScanService.getScanResults(scanId);
      setScanData(results);
    } catch (err: any) {
      console.error("Error fetching scan results:", err);
      setError(err.message || "Failed to load scan results");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePR = async () => {
    if (!scanId || !scanData) return;

    try {
      setCreatingPR(true);
      const result = await ScanService.createFixPR(scanId);
      setPrCreated({ url: result.prUrl, number: result.prNumber });
    } catch (err: any) {
      console.error("Error creating PR:", err);
      alert(err.message || "Failed to create pull request");
    } finally {
      setCreatingPR(false);
    }
  };

  const handleDownload = () => {
    if (!scanId) return;
    
    const token = AuthService.getToken();
    if (!token) return;

    // Create download link
    const downloadUrl = `${API_ENDPOINTS.scan.download(scanId)}`;
    
    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', `security-fixes-${scanData?.repoName || 'repo'}.zip`);
    link.style.display = 'none';
    
    // Add authorization header by opening in new window with token
    window.open(`${downloadUrl}?token=${token}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Navigation />
        <div className="max-w-5xl mx-auto px-6 py-10 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading scan results...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !scanData) {
    return (
      <div className="min-h-screen bg-black">
        <Navigation />
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-medium text-foreground mb-2">Failed to Load Results</h2>
            <p className="text-muted-foreground mb-4">{error || "Scan results not found"}</p>
            <button
              onClick={() => navigate("/repos")}
              className="px-4 py-2 rounded-md bg-primary text-black text-sm hover:opacity-90"
            >
              Back to Scans
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { summary, vulnerabilities } = scanData;

  const fixableCount = vulnerabilities.filter(v => v.fixAvailable).length;

  const statCards = [
    { label: "Critical", value: summary.critical, color: "text-destructive", glow: "glow-destructive" },
    { label: "High", value: summary.high, color: "text-warning" },
    { label: "Medium", value: summary.medium, color: "text-primary" },
    { label: "Low", value: summary.low, color: "text-muted-foreground" },
  ];

  return (
    <div className="min-h-screen bg-black">
      <Navigation />

      <div className="max-w-5xl mx-auto px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {/* PR Success Banner */}
          {prCreated && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-success/10 border border-success/30 rounded-lg p-4"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-success">Pull Request Created!</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Security fixes have been committed to a new branch
                  </p>
                </div>
                <a
                  href={prCreated.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-md bg-success text-black text-sm hover:opacity-90 transition-opacity"
                >
                  View PR #{prCreated.number}
                </a>
              </div>
            </motion.div>
          )}

          {/* Action Bar */}
          <div className="flex items-center justify-end gap-2 mb-6">
            <button
              onClick={() => navigate("/editor")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-foreground text-sm hover:bg-card transition-colors"
            >
              <Code2 className="w-4 h-4" /> Editor
            </button>
            <button
              onClick={handleDownload}
              disabled={fixableCount === 0}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-foreground text-sm hover:bg-card transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" /> Download ZIP ({fixableCount} fixes)
            </button>
            {!prCreated && fixableCount > 0 && (
              <button
                onClick={handleCreatePR}
                disabled={creatingPR}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-black text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingPR ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Creating PR...
                  </>
                ) : (
                  <>
                    <GitPullRequest className="w-4 h-4" /> Create PR ({fixableCount} fixes)
                  </>
                )}
              </button>
            )}
          </div>
          {/* Summary */}
          <div className="flex items-center gap-4 mb-8">
            <AlertTriangle className="w-7 h-7 text-warning" />
            <div>
              <h1 className="text-2xl font-medium text-foreground">
                {summary.total} Vulnerabilities Found
              </h1>
              <p className="text-muted-foreground text-sm font-light">
                {summary.patchable} auto-patchable · {isWebsite ? websiteUrl : scanData.repoName}
              </p>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-4 gap-3 mb-8">
            {statCards.map((s) => (
              <div key={s.label} className={`bg-card border border-border rounded-lg p-4 text-center ${s.glow || ""}`}>
                <div className={`text-3xl font-medium font-mono ${s.color}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Vulnerability List */}
          <div className="space-y-2">
            {vulnerabilities.map((v) => (
              <VulnRow key={v.id} vuln={v} onViewDiff={() => navigate("/editor")} />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ResultsPage;
