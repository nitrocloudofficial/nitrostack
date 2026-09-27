import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Terminal, CheckCircle, AlertTriangle, XCircle, Info } from "lucide-react";
import { ScanService } from "@/services/scan.service";
import type { ScanLog } from "@/types/sentinel";

const logIcons: Record<string, React.ReactNode> = {
  info: <Info className="w-3.5 h-3.5 text-info" />,
  success: <CheckCircle className="w-3.5 h-3.5 text-success" />,
  warning: <AlertTriangle className="w-3.5 h-3.5 text-warning" />,
  error: <XCircle className="w-3.5 h-3.5 text-destructive" />,
};

const logColors: Record<string, string> = {
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  error: "text-destructive",
};

const ScanProgressPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const scanId = searchParams.get("scanId");
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [phase, setPhase] = useState("Initializing...");
  const [progress, setProgress] = useState(0);
  const [repoName, setRepoName] = useState("Repository");
  const [status, setStatus] = useState<"queued" | "scanning" | "completed" | "failed">("queued");
  const [error, setError] = useState<string | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scanId) {
      navigate("/repos");
      return;
    }

    let cancelled = false;
    let pollInterval: NodeJS.Timeout;

    const pollScanStatus = async () => {
      try {
        const scanStatus = await ScanService.getScanStatus(scanId);
        
        if (cancelled) return;

        setRepoName(scanStatus.repoFullName);
        setStatus(scanStatus.status);
        setLogs(scanStatus.logs.map(log => ({
          time: new Date(log.time).toLocaleTimeString(),
          message: log.message,
          level: log.level,
        })));

        // Calculate progress based on status
        if (scanStatus.status === "queued") {
          setProgress(5);
          setPhase("Queued");
        } else if (scanStatus.status === "scanning") {
          const logCount = scanStatus.logs.length;
          setProgress(Math.min(10 + logCount * 5, 95));
          
          // Determine phase from logs
          const lastLog = scanStatus.logs[scanStatus.logs.length - 1];
          if (lastLog) {
            if (lastLog.message.includes("Fetching")) setPhase("Fetching Repository");
            else if (lastLog.message.includes("AI")) setPhase("AI Security Analysis");
            else if (lastLog.message.includes("analysis")) setPhase("Analyzing Code");
            else setPhase("Scanning");
          }
        } else if (scanStatus.status === "completed") {
          setProgress(100);
          setPhase("Complete");
          clearInterval(pollInterval);
          setTimeout(() => {
            if (!cancelled) navigate(`/results?scanId=${scanId}`);
          }, 1500);
        } else if (scanStatus.status === "failed") {
          setProgress(100);
          setPhase("Failed");
          setError(scanStatus.error || "Scan failed");
          clearInterval(pollInterval);
        }
      } catch (err: any) {
        console.error("Error polling scan status:", err);
        if (!cancelled) {
          setError(err.message || "Failed to get scan status");
          clearInterval(pollInterval);
        }
      }
    };

    // Initial poll
    pollScanStatus();

    // Poll every 2 seconds
    pollInterval = setInterval(pollScanStatus, 2000);

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
    };
  }, [scanId, navigate]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="min-h-screen bg-black">
      <header className="border-b border-border/50 px-6 py-4 backdrop-blur-sm bg-black/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <button onClick={() => navigate("/")} className="font-medium text-base text-foreground hover:text-primary transition-colors">
              VulnixAI
            </button>
            <div className="flex items-center gap-6">
              <button onClick={() => navigate("/repos")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Scan
              </button>
              <button onClick={() => navigate("/monitoring")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Monitoring
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-4 mb-8">
            <div className="relative">
              <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center">
                <Terminal className="w-6 h-6 text-black" />
              </div>
              {progress < 100 && status !== "failed" && (
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary animate-pulse" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-medium text-foreground">
                {status === "failed" ? "Scan Failed" : "Scanning Repository"}
              </h1>
              <p className="text-muted-foreground text-sm font-mono font-light">{repoName}</p>
              {error && (
                <p className="text-destructive text-sm mt-1">{error}</p>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground font-mono font-light">{phase}</span>
              <span className="text-primary font-mono">{progress}%</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Log Terminal */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
              <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-warning/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
              <span className="ml-2 text-xs text-muted-foreground font-mono font-light">scan-output.log</span>
            </div>
            <div className="h-[400px] overflow-y-auto p-4 font-mono text-sm space-y-1.5">
              {logs.map((log, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-3"
                >
                  <span className="text-muted-foreground text-xs mt-0.5 shrink-0 font-light">{log.time}</span>
                  <span className="mt-0.5 shrink-0">{logIcons[log.level]}</span>
                  <span className={`${logColors[log.level]} font-light`}>{log.message}</span>
                </motion.div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ScanProgressPage;
