import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield, AlertTriangle, XCircle, Clock, Globe, TrendingUp,
  Filter, Search, Calendar
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { websiteScanService, WebsiteScanResult } from "@/services/websiteScan.service";
import { toast } from "@/hooks/use-toast";

const severityConfig = {
  critical: { color: "text-red-500", label: "Critical" },
  high: { color: "text-orange-500", label: "High" },
  medium: { color: "text-yellow-500", label: "Medium" },
  low: { color: "text-blue-500", label: "Low" },
  info: { color: "text-gray-500", label: "Info" },
};

const ScanHistoryPage = () => {
  const navigate = useNavigate();
  const [scans, setScans] = useState<WebsiteScanResult[]>([]);
  const [filteredScans, setFilteredScans] = useState<WebsiteScanResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterScore, setFilterScore] = useState<"all" | "good" | "medium" | "poor">("all");

  useEffect(() => {
    loadScans();
  }, []);

  useEffect(() => {
    filterScans();
  }, [scans, searchQuery, filterScore]);

  const loadScans = async () => {
    try {
      setIsLoading(true);
      const results = await websiteScanService.getScanHistory();
      setScans(results);
    } catch (error: any) {
      console.error('Error loading scans:', error);
      toast({
        title: "Error",
        description: "Failed to load scan history",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterScans = () => {
    let filtered = scans;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(scan =>
        scan.url.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by score
    if (filterScore !== "all") {
      filtered = filtered.filter(scan => {
        if (filterScore === "good") return scan.securityScore >= 80;
        if (filterScore === "medium") return scan.securityScore >= 60 && scan.securityScore < 80;
        if (filterScore === "poor") return scan.securityScore < 60;
        return true;
      });
    }

    setFilteredScans(filtered);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-destructive";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return { label: "Excellent", color: "bg-success/20 text-success" };
    if (score >= 60) return { label: "Good", color: "bg-warning/20 text-warning" };
    return { label: "Needs Attention", color: "bg-destructive/20 text-destructive" };
  };

  // Group scans by URL
  const scansByUrl = filteredScans.reduce((acc, scan) => {
    if (!acc[scan.url]) {
      acc[scan.url] = [];
    }
    acc[scan.url].push(scan);
    return acc;
  }, {} as Record<string, WebsiteScanResult[]>);

  return (
    <div className="min-h-screen bg-black">
      <Navigation />

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-medium text-foreground mb-2">Scan History</h1>
          <p className="text-muted-foreground">
            View all website security scans and track improvements over time
          </p>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by URL..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-md bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>

            {/* Score Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={filterScore}
                onChange={(e) => setFilterScore(e.target.value as any)}
                className="px-4 py-2 rounded-md bg-secondary border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              >
                <option value="all">All Scores</option>
                <option value="good">Good (80+)</option>
                <option value="medium">Medium (60-79)</option>
                <option value="poor">Poor (&lt;60)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filteredScans.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Scans Found</h3>
            <p className="text-sm text-muted-foreground mb-6">
              {searchQuery || filterScore !== "all"
                ? "Try adjusting your filters"
                : "Start by scanning a website from the monitoring page"}
            </p>
            <button
              onClick={() => navigate('/monitoring')}
              className="px-4 py-2 rounded-md bg-primary text-black hover:opacity-90"
            >
              Go to Monitoring
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(scansByUrl).map(([url, urlScans]) => {
              const latestScan = urlScans[0];
              const badge = getScoreBadge(latestScan.securityScore);
              
              return (
                <motion.div
                  key={url}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card border border-border rounded-lg overflow-hidden"
                >
                  {/* Website Header */}
                  <div className="p-4 border-b border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Globe className="w-5 h-5 text-primary" />
                        <div>
                          <h3 className="font-medium text-foreground">{url}</h3>
                          <p className="text-xs text-muted-foreground">
                            {urlScans.length} scan{urlScans.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                          {badge.label}
                        </span>
                        <div className="text-center">
                          <div className={`text-2xl font-bold font-mono ${getScoreColor(latestScan.securityScore)}`}>
                            {latestScan.securityScore}
                          </div>
                          <div className="text-xs text-muted-foreground">Latest</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Scans List */}
                  <div className="divide-y divide-border">
                    {urlScans.map((scan) => (
                      <div
                        key={scan._id}
                        onClick={() => navigate(`/website-scan/${scan._id}`)}
                        className="p-4 hover:bg-secondary/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <div className={`text-xl font-bold font-mono ${getScoreColor(scan.securityScore)}`}>
                                {scan.securityScore}
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center gap-2 text-sm text-foreground mb-1">
                                <Clock className="w-3 h-3" />
                                {new Date(scan.scanDate).toLocaleDateString()} at{' '}
                                {new Date(scan.scanDate).toLocaleTimeString()}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <XCircle className="w-3 h-3 text-red-500" />
                                  {scan.vulnerabilities.filter(v => v.type === 'critical').length} Critical
                                </span>
                                <span className="flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-orange-500" />
                                  {scan.vulnerabilities.filter(v => v.type === 'high').length} High
                                </span>
                                <span className="flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-yellow-500" />
                                  {scan.vulnerabilities.filter(v => v.type === 'medium').length} Medium
                                </span>
                                <span>•</span>
                                <span>{scan.vulnerabilities.length} total issues</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {scan.technologies.length > 0 && (
                              <div className="flex gap-1">
                                {scan.technologies.slice(0, 3).map((tech, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-1 rounded text-xs bg-secondary text-foreground"
                                  >
                                    {tech}
                                  </span>
                                ))}
                                {scan.technologies.length > 3 && (
                                  <span className="px-2 py-1 rounded text-xs bg-secondary text-muted-foreground">
                                    +{scan.technologies.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Summary Stats */}
        {!isLoading && filteredScans.length > 0 && (
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-lg p-4 text-center">
              <div className="text-3xl font-bold font-mono text-primary mb-1">
                {Object.keys(scansByUrl).length}
              </div>
              <div className="text-sm text-muted-foreground">Websites Scanned</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4 text-center">
              <div className="text-3xl font-bold font-mono text-primary mb-1">
                {filteredScans.length}
              </div>
              <div className="text-sm text-muted-foreground">Total Scans</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4 text-center">
              <div className="text-3xl font-bold font-mono text-primary mb-1">
                {Math.round(filteredScans.reduce((sum, s) => sum + s.securityScore, 0) / filteredScans.length)}
              </div>
              <div className="text-sm text-muted-foreground">Average Score</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScanHistoryPage;
