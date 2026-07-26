import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield, AlertTriangle, CheckCircle, XCircle, Info,
  ArrowLeft, Globe, Lock, Server, Code, Clock, TrendingUp,
  History, ChevronDown, ChevronUp, Download, Share2
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { websiteScanService, WebsiteScanResult } from "@/services/websiteScan.service";
import { toast } from "@/hooks/use-toast";
import { exportToPDF, downloadPDF, sharePDF } from "@/utils/pdfExport";

const severityConfig = {
  critical: { color: "text-red-500", bg: "bg-red-500/10", icon: XCircle, label: "Critical" },
  high: { color: "text-orange-500", bg: "bg-orange-500/10", icon: AlertTriangle, label: "High" },
  medium: { color: "text-yellow-500", bg: "bg-yellow-500/10", icon: AlertTriangle, label: "Medium" },
  low: { color: "text-blue-500", bg: "bg-blue-500/10", icon: Info, label: "Low" },
  info: { color: "text-gray-500", bg: "bg-gray-500/10", icon: Info, label: "Info" },
};

const WebsiteScanResultsPage = () => {
  const { scanId } = useParams<{ scanId: string }>();
  const navigate = useNavigate();
  const [scan, setScan] = useState<WebsiteScanResult | null>(null);
  const [scanHistory, setScanHistory] = useState<WebsiteScanResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (scanId) {
      loadScan();
    }
  }, [scanId]);

  const loadScan = async () => {
    try {
      setIsLoading(true);
      const result = await websiteScanService.getScanById(scanId!);
      setScan(result);
      
      // Load scan history for this URL
      const history = await websiteScanService.getScanHistory(result.url);
      // Filter out current scan and sort by date
      const filteredHistory = history
        .filter(h => h._id !== scanId)
        .sort((a, b) => new Date(b.scanDate).getTime() - new Date(a.scanDate).getTime());
      setScanHistory(filteredHistory);
    } catch (error: any) {
      console.error('Error loading scan:', error);
      toast({
        title: "Error",
        description: "Failed to load scan results",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black">
        <Navigation />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="min-h-screen bg-black">
        <Navigation />
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-medium text-foreground mb-2">Scan Not Found</h2>
          <p className="text-muted-foreground mb-6">The requested scan could not be found.</p>
          <button
            onClick={() => navigate('/monitoring')}
            className="px-4 py-2 rounded-md bg-primary text-black hover:opacity-90"
          >
            Back to Monitoring
          </button>
        </div>
      </div>
    );
  }

  const categories = Array.from(new Set(scan.vulnerabilities.map(v => v.category)));
  const filteredVulns = selectedCategory
    ? scan.vulnerabilities.filter(v => v.category === selectedCategory)
    : scan.vulnerabilities;

  // Sort vulnerabilities by severity (critical first)
  const sortedVulns = [...filteredVulns].sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    return severityOrder[a.type] - severityOrder[b.type];
  });

  const vulnCounts = {
    critical: scan.vulnerabilities.filter(v => v.type === 'critical').length,
    high: scan.vulnerabilities.filter(v => v.type === 'high').length,
    medium: scan.vulnerabilities.filter(v => v.type === 'medium').length,
    low: scan.vulnerabilities.filter(v => v.type === 'low').length,
    info: scan.vulnerabilities.filter(v => v.type === 'info').length,
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-destructive";
  };

  const handleExportPDF = () => {
    if (!scan) return;

    // Separate and sort vulnerabilities by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    const sortedVulns = [...scan.vulnerabilities].sort((a, b) => 
      severityOrder[a.type] - severityOrder[b.type]
    );

    const doc = exportToPDF({
      title: 'WEBSITE SECURITY SCAN REPORT',
      subtitle: scan.url,
      metadata: {
        date: new Date(scan.scanDate).toLocaleString(),
        url: scan.url,
        score: scan.securityScore,
      },
      sections: [
        {
          title: 'Security Score Overview',
          content: `Overall Security Score: ${scan.securityScore}/100\nTotal Vulnerabilities Detected: ${scan.vulnerabilities.length}\nScan Status: ${scan.securityScore >= 80 ? 'GOOD' : scan.securityScore >= 60 ? 'NEEDS IMPROVEMENT' : 'CRITICAL'}`,
        },
        {
          title: 'Vulnerability Breakdown by Severity',
          table: {
            headers: ['Severity Level', 'Count', 'Status'],
            rows: Object.entries(severityConfig).map(([severity, config]) => {
              const count = scan.vulnerabilities.filter(v => v.type === severity).length;
              if (count === 0) return null;
              return [
                config.label,
                count.toString(),
                count > 0 ? 'FOUND' : 'NONE'
              ];
            }).filter(Boolean) as (string | number)[][],
          },
        },
        {
          title: 'Technologies Detected',
          list: scan.technologies.length > 0 ? scan.technologies : ['None detected'],
        },
        {
          title: 'SSL/TLS Certificate Status',
          content: scan.ssl.valid 
            ? `Valid SSL Certificate\nIssuer: ${scan.ssl.issuer || 'N/A'}\nProtocol: ${scan.ssl.protocol || 'N/A'}\nValid Until: ${scan.ssl.validTo || 'N/A'}`
            : 'No valid SSL certificate detected - SECURITY RISK',
        },
        // VULNERABILITIES SECTION
        ...(sortedVulns.length > 0 ? [{
          title: '═══════════════════════════════════════',
        }, {
          title: 'DETECTED VULNERABILITIES',
        }, {
          title: '═══════════════════════════════════════',
        }] : []),
        ...sortedVulns.map((vuln) => ({
          title: `VULNERABILITY: ${vuln.title}`,
          content: `SEVERITY: ${vuln.type.toUpperCase()}\nCATEGORY: ${vuln.category}\n\nDESCRIPTION:\n${vuln.description}`,
          list: [
            vuln.evidence ? `EVIDENCE:\n${vuln.evidence}` : null,
            `RECOMMENDATION:\n${vuln.recommendation}`,
          ].filter(Boolean) as string[],
        })),
      ],
    });

    downloadPDF(doc, `website-scan-${scan.url.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.pdf`);
    
    toast({
      title: 'PDF Downloaded',
      description: 'Website scan report has been downloaded',
    });
  };

  const handleShare = async () => {
    if (!scan) return;

    const doc = exportToPDF({
      title: 'Website Security Scan Report',
      subtitle: scan.url,
      metadata: {
        date: new Date(scan.scanDate).toLocaleString(),
        url: scan.url,
        score: scan.securityScore,
      },
      sections: [
        {
          title: 'Summary',
          content: `Security Score: ${scan.securityScore}/100\nVulnerabilities: ${scan.vulnerabilities.length}`,
        },
      ],
    });

    const shared = await sharePDF(doc, `Website Scan - ${scan.url}`);
    
    if (shared) {
      toast({
        title: 'Shared',
        description: 'Report shared successfully',
      });
    } else {
      toast({
        title: 'Share Not Available',
        description: 'PDF has been downloaded instead',
      });
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <Navigation />

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/monitoring')}
            className="p-2 rounded-md border border-border hover:bg-card transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-medium text-foreground mb-1">Website Security Scan</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Globe className="w-4 h-4" />
                {scan.url}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {new Date(scan.scanDate).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Security Score */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-medium text-foreground mb-2">Security Score</h2>
              <p className="text-sm text-muted-foreground">
                Overall security assessment based on detected vulnerabilities
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleShare}
                className="px-3 py-2 rounded-md border border-border hover:bg-secondary transition-colors flex items-center gap-2 text-sm"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button
                onClick={handleExportPDF}
                className="px-3 py-2 rounded-md border border-border hover:bg-secondary transition-colors flex items-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className={`text-6xl font-bold font-mono ${getScoreColor(scan.securityScore)}`}>
                {scan.securityScore}
              </div>
              <div className="text-sm text-muted-foreground">out of 100</div>
            </div>
          </div>
        </div>

        {/* Scan History */}
        {scanHistory.length > 0 && (
          <div className="bg-card border border-border rounded-lg mb-6">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-medium text-foreground">
                  Previous Scans ({scanHistory.length})
                </h2>
              </div>
              {showHistory ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
            
            {showHistory && (
              <div className="border-t border-border p-4">
                {/* Score Trend */}
                <div className="mb-6 p-4 bg-secondary/30 rounded-lg">
                  <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Security Score Trend
                  </h3>
                  <div className="flex items-end gap-2 h-32">
                    {[...scanHistory].reverse().slice(-10).concat([scan]).map((s, index, arr) => {
                      const height = (s.securityScore / 100) * 100;
                      const isLatest = index === arr.length - 1;
                      return (
                        <div key={s._id} className="flex-1 flex flex-col items-center gap-1">
                          <div className="text-xs font-mono text-muted-foreground">
                            {s.securityScore}
                          </div>
                          <div
                            className={`w-full rounded-t transition-all ${
                              isLatest ? 'bg-primary' : getScoreColor(s.securityScore).replace('text-', 'bg-')
                            }`}
                            style={{ height: `${height}%` }}
                          />
                          <div className="text-[10px] text-muted-foreground">
                            {new Date(s.scanDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  {scanHistory.map((historyScan) => {
                    const scoreChange = historyScan.securityScore - scan.securityScore;
                    const isImprovement = scoreChange > 0;
                    
                    return (
                      <motion.div
                        key={historyScan._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/website-scan/${historyScan._id}`)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <div className={`text-2xl font-bold font-mono ${getScoreColor(historyScan.securityScore)}`}>
                              {historyScan.securityScore}
                            </div>
                            <div className="text-xs text-muted-foreground">score</div>
                          </div>
                          
                          <div>
                            <div className="text-sm text-foreground font-medium">
                              {new Date(historyScan.scanDate).toLocaleDateString()} at{' '}
                              {new Date(historyScan.scanDate).toLocaleTimeString()}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <XCircle className="w-3 h-3 text-red-500" />
                                {historyScan.vulnerabilities.filter(v => v.type === 'critical').length} Critical
                              </span>
                              <span className="flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-orange-500" />
                                {historyScan.vulnerabilities.filter(v => v.type === 'high').length} High
                              </span>
                              <span className="flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-yellow-500" />
                                {historyScan.vulnerabilities.filter(v => v.type === 'medium').length} Medium
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {scoreChange !== 0 && (
                            <div className={`flex items-center gap-1 text-sm font-medium ${
                              isImprovement ? 'text-success' : 'text-destructive'
                            }`}>
                              <TrendingUp className={`w-4 h-4 ${isImprovement ? '' : 'rotate-180'}`} />
                              {Math.abs(scoreChange)} points
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {historyScan.vulnerabilities.length} issues
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
                
                {scanHistory.length > 5 && (
                  <div className="mt-4 text-center">
                    <p className="text-xs text-muted-foreground">
                      Showing {scanHistory.length} previous scans
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Vulnerability Summary */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          {Object.entries(vulnCounts).map(([type, count]) => {
            const config = severityConfig[type as keyof typeof severityConfig];
            const Icon = config.icon;
            return (
              <div key={type} className={`${config.bg} border border-border rounded-lg p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${config.color}`} />
                  <span className="text-xs text-muted-foreground uppercase">{config.label}</span>
                </div>
                <div className={`text-3xl font-bold font-mono ${config.color}`}>{count}</div>
              </div>
            );
          })}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Vulnerabilities List */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-foreground">
                Vulnerabilities ({filteredVulns.length})
              </h2>
              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-xs text-primary hover:underline"
                >
                  Clear filter
                </button>
              )}
            </div>

            {filteredVulns.length === 0 ? (
              <div className="bg-card border border-border rounded-lg p-8 text-center">
                <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Vulnerabilities Found</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedCategory ? "No vulnerabilities in this category" : "Great job! No security issues detected."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedVulns.map((vuln, index) => {
                  const config = severityConfig[vuln.type];
                  const Icon = config.icon;
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-card border border-border rounded-lg p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`${config.bg} p-2 rounded-lg`}>
                          <Icon className={`w-5 h-5 ${config.color}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs font-medium ${config.color} uppercase`}>
                              {config.label}
                            </span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">{vuln.category}</span>
                          </div>
                          <h3 className="font-medium text-foreground mb-2">{vuln.title}</h3>
                          <p className="text-sm text-muted-foreground mb-3">{vuln.description}</p>
                          {vuln.evidence && (
                            <div className="bg-secondary/50 rounded p-2 mb-3">
                              <code className="text-xs font-mono text-foreground">{vuln.evidence}</code>
                            </div>
                          )}
                          <div className="bg-primary/10 border border-primary/20 rounded p-3">
                            <div className="text-xs font-medium text-primary mb-1">Recommendation</div>
                            <div className="text-sm text-foreground">{vuln.recommendation}</div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Categories */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-sm font-medium text-foreground mb-3">Categories</h3>
              <div className="space-y-2">
                {categories.map(category => {
                  const count = scan.vulnerabilities.filter(v => v.category === category).length;
                  return (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category === selectedCategory ? null : category)}
                      className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                        selectedCategory === category
                          ? "bg-primary/20 text-primary"
                          : "hover:bg-secondary text-foreground"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{category}</span>
                        <span className="text-xs text-muted-foreground">{count}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Technologies */}
            {scan.technologies.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  Detected Technologies
                </h3>
                <div className="flex flex-wrap gap-2">
                  {scan.technologies.map((tech, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 rounded text-xs bg-secondary text-foreground"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* SSL Info */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                SSL Certificate
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className={scan.ssl.valid ? "text-success" : "text-destructive"}>
                    {scan.ssl.valid ? "Valid" : "Invalid"}
                  </span>
                </div>
                {scan.ssl.issuer && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Issuer</span>
                    <span className="text-foreground">{scan.ssl.issuer}</span>
                  </div>
                )}
                {scan.ssl.validTo && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expires</span>
                    <span className="text-foreground">
                      {new Date(scan.ssl.validTo).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {scan.ssl.protocol && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Protocol</span>
                    <span className="text-foreground">{scan.ssl.protocol}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebsiteScanResultsPage;
