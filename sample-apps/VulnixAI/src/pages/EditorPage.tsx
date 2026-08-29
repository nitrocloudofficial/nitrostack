import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import {
  ChevronLeft, FileCode, Save, RotateCcw, History, GitPullRequest,
  Clock, CheckCircle2, XCircle, AlertCircle, Loader2, ExternalLink
} from "lucide-react";
import { ScanService } from "@/services/scan.service";
import type { ScanResult, Vulnerability } from "@/types/sentinel";

const EditorPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const scanId = searchParams.get("scanId");

  const [scanData, setScanData] = useState<ScanResult | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [selectedFile, setSelectedFile] = useState(0);
  const [showPatched, setShowPatched] = useState(true);
  const [fileContent, setFileContent] = useState<string>("");
  const [fileSha, setFileSha] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);

  useEffect(() => {
    if (scanId) {
      fetchScanData();
      fetchScanHistory();
    } else {
      navigate("/repos");
    }
  }, [scanId]);

  const fetchScanData = async () => {
    if (!scanId) return;

    try {
      setLoading(true);
      const data = await ScanService.getScanResults(scanId);
      setScanData(data);
      
      if (data.vulnerabilities.length > 0) {
        loadFileContent(data.vulnerabilities[0].file);
      }
    } catch (error) {
      console.error("Error fetching scan data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchScanHistory = async () => {
    try {
      const history = await ScanService.getScanHistory(50);
      setScanHistory(history);
    } catch (error) {
      console.error("Error fetching scan history:", error);
    }
  };

  const loadFileContent = async (filePath: string) => {
    if (!scanData) return;
    
    try {
      setLoadingFile(true);
      const response = await ScanService.getFileContent(
        scanData.repository.owner,
        scanData.repository.name,
        filePath,
        scanData.repository.branch
      );
      setFileContent(response.content);
      setFileSha(response.sha);
    } catch (error) {
      console.error("Error loading file content:", error);
    } finally {
      setLoadingFile(false);
    }
  };

  const handleSaveFile = async () => {
    if (!scanData || !scanId) return;

    try {
      setSaving(true);
      await ScanService.updateFile(
        scanData.repository.owner,
        scanData.repository.name,
        scanData.vulnerabilities[selectedFile].file,
        fileContent,
        fileSha,
        `Fix: ${scanData.vulnerabilities[selectedFile].title}`
      );
      alert("File saved successfully!");
    } catch (error) {
      console.error("Error saving file:", error);
      alert("Failed to save file");
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePR = async () => {
    if (!scanData || !scanId) return;

    try {
      const response = await ScanService.createPullRequest(scanId);
      window.open(response.prUrl, "_blank");
    } catch (error) {
      console.error("Error creating PR:", error);
      alert("Failed to create pull request");
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!scanData || scanData.vulnerabilities.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No vulnerabilities found</p>
        </div>
      </div>
    );
  }

  const files = scanData.vulnerabilities.map((v) => ({
    path: v.file,
    original: v.originalCode || "",
    patched: v.patchedCode || "",
    vulnTitle: v.title,
    severity: v.severity,
  }));

  const currentFile = files[selectedFile];
  const code = showPatched ? currentFile.patched : currentFile.original;

  const severityColors: Record<string, string> = {
    critical: "bg-destructive/20 text-destructive border-destructive/30",
    high: "bg-warning/20 text-warning border-warning/30",
    medium: "bg-primary/20 text-primary border-primary/30",
    low: "bg-muted text-muted-foreground border-border",
  };

  return (
    <div className="h-screen flex flex-col bg-black">
      {/* Header */}
      <header className="border-b border-border/50 px-4 py-3 flex items-center justify-between shrink-0 backdrop-blur-sm bg-black/50">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/results")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => navigate("/")} className="font-medium text-foreground text-sm hover:text-primary transition-colors">
            VulnixAI
          </button>
          <span className="text-muted-foreground text-sm font-mono mx-2">›</span>
          <span className="text-sm font-mono text-muted-foreground font-light">{currentFile.path}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono border border-border hover:bg-secondary/30 transition-colors"
          >
            <History className="w-3 h-3" />
            History
          </button>
          <button
            onClick={() => setShowPatched(!showPatched)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono border transition-colors ${
              showPatched
                ? "bg-success/10 text-success border-success/30"
                : "bg-destructive/10 text-destructive border-destructive/30"
            }`}
          >
            <RotateCcw className="w-3 h-3" />
            {showPatched ? "Viewing: Patched" : "Viewing: Original"}
          </button>
          <button
            onClick={handleSaveFile}
            disabled={saving}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono bg-primary text-black hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Save
          </button>
          <button
            onClick={handleCreatePR}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono bg-success text-black hover:opacity-90 transition-opacity"
          >
            <GitPullRequest className="w-3 h-3" />
            Create PR
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* File Sidebar */}
        <div className="w-72 border-r border-border/50 bg-card shrink-0 overflow-y-auto">
          <div className="px-4 py-3 text-xs text-muted-foreground font-light border-b border-border/50">
            Affected Files ({files.length})
          </div>
          {files.map((f, i) => (
            <button
              key={i}
              onClick={() => {
                setSelectedFile(i);
                setShowPatched(true);
                loadFileContent(f.path);
              }}
              className={`w-full text-left px-4 py-3 border-b border-border/50 transition-colors ${
                selectedFile === i ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-secondary/30"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <FileCode className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs font-mono text-foreground truncate font-light">{f.path.split("/").pop()}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded border font-mono ${severityColors[f.severity]}`}>
                  {f.severity}
                </span>
                <span className="text-[10px] text-muted-foreground truncate font-light">{f.vulnTitle}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Monaco Editor */}
        <div className="flex-1 min-w-0 relative">
          {loadingFile && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
          <Editor
            height="100%"
            language="typescript"
            theme="vs-dark"
            value={code}
            onChange={(value) => setFileContent(value || "")}
            options={{
              readOnly: false,
              minimap: { enabled: true },
              fontSize: 14,
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: "400",
              padding: { top: 16 },
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              renderLineHighlight: "all",
            }}
          />
        </div>

        {/* History Sidebar */}
        {showHistory && (
          <motion.div
            initial={{ x: 300 }}
            animate={{ x: 0 }}
            className="w-80 border-l border-border/50 bg-card shrink-0 overflow-y-auto"
          >
            <div className="px-4 py-3 text-xs text-muted-foreground font-light border-b border-border/50 flex items-center justify-between">
              <span>Scan History</span>
              <button onClick={() => setShowHistory(false)} className="hover:text-foreground">
                <XCircle className="w-4 h-4" />
              </button>
            </div>
            {scanHistory.map((scan) => (
              <div
                key={scan._id}
                className="px-4 py-3 border-b border-border/50 hover:bg-secondary/30 cursor-pointer"
                onClick={() => navigate(`/editor?scanId=${scan._id}`)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {new Date(scan.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="text-xs font-mono mb-1">{scan.repository.name}</div>
                <div className="flex items-center gap-2">
                  {scan.status === "completed" && <CheckCircle2 className="w-3 h-3 text-success" />}
                  {scan.status === "failed" && <XCircle className="w-3 h-3 text-destructive" />}
                  {scan.status === "scanning" && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                  <span className="text-[10px] text-muted-foreground">
                    {scan.vulnerabilities.length} vulnerabilities
                  </span>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default EditorPage;
