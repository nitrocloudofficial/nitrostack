import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield, GitBranch, Globe, Target, Zap, Clock, AlertTriangle,
  XCircle, CheckCircle, Filter, Search, TrendingUp, Activity
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { API_ENDPOINTS } from "@/config/api";
import { AuthService } from "@/services/auth.service";
import { toast } from "@/hooks/use-toast";

type ScanType = 'repository' | 'website' | 'penetration' | 'load';

interface UnifiedScan {
  id: string;
  type: ScanType;
  target: string;
  url: string;
  date: string;
  status: string;
  vulnerabilities?: number;
  score?: number;
  summary?: any;
  results?: any;
  technologies?: string[];
}

const UnifiedHistoryPage = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<UnifiedScan[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<UnifiedScan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<ScanType | 'all'>('all');
  const [stats, setStats] = useState({
    totalScans: 0,
    repoScans: 0,
    websiteScans: 0,
    pentests: 0,
    loadTests: 0,
  });

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    filterHistory();
  }, [history, searchQuery, filterType]);

  const calculateRepoScore = (summary: any): number => {
    const total = summary.total || 0;
    if (total === 0) return 100;
    const weighted = 
      (summary.critical || 0) * 10 +
      (summary.high || 0) * 5 +
      (summary.medium || 0) * 2 +
      (summary.low || 0) * 1;
    return Math.max(0, Math.min(100, 100 - weighted));
  };

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      const token = AuthService.getToken();
      
      // Try the unified endpoint first
      try {
        const response = await fetch(`${API_ENDPOINTS.history.all}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setHistory(data.history);
          setStats(data.stats);
          return;
        }
      } catch (unifiedError) {
        console.warn('Unified history endpoint failed, falling back to individual endpoints');
      }

      // Fallback: Fetch from individual endpoints
      const [repoScans, websiteScans] = await Promise.allSettled([
        fetch(`${API_ENDPOINTS.scan.history}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.ok ? r.json() : { scans: [] }),
        
        fetch(`${API_ENDPOINTS.websiteScan.history}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.ok ? r.json() : []),
      ]);

      const repoScansData = repoScans.status === 'fulfilled' ? repoScans.value.scans || [] : [];
      const websiteScansData = websiteScans.status === 'fulfilled' ? websiteScans.value : [];

      // Normalize to unified format
      const unifiedHistory: UnifiedScan[] = [
        ...repoScansData.map((scan: any) => ({
          id: scan.id,
          type: 'repository' as ScanType,
          target: scan.repoFullName,
          url: scan.repoUrl || '',
          date: scan.startedAt,
          status: scan.status,
          summary: scan.summary,
          vulnerabilities: scan.summary?.total || 0,
          score: scan.summary ? calculateRepoScore(scan.summary) : 0,
        })),
        ...websiteScansData.map((scan: any) => ({
          id: scan._id,
          type: 'website' as ScanType,
          target: scan.url,
          url: scan.url,
          date: scan.scanDate,
          status: 'completed',
          vulnerabilities: scan.vulnerabilities?.length || 0,
          score: scan.securityScore || 0,
          technologies: scan.technologies || [],
        })),
      ];

      unifiedHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setHistory(unifiedHistory);
      setStats({
        totalScans: unifiedHistory.length,
        repoScans: repoScansData.length,
        websiteScans: websiteScansData.length,
        pentests: 0,
        loadTests: 0,
      });
    } catch (error: any) {
      console.error('Error loading history:', error);
      toast({
        title: "Error",
        description: "Failed to load scan history",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterHistory = () => {
    let filtered = history;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(scan =>
        scan.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
        scan.url.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(scan => scan.type === filterType);
    }

    setFilteredHistory(filtered);
  };

  const getTypeIcon = (type: ScanType) => {
    switch (type) {
      case 'repository': return <GitBranch className="w-4 h-4" />;
      case 'website': return <Globe className="w-4 h-4" />;
      case 'penetration': return <Target className="w-4 h-4" />;
      case 'load': return <Zap className="w-4 h-4" />;
    }
  };

  const getTypeBadge = (type: ScanType) => {
    const config = {
      repository: { label: 'Repo Scan', color: 'bg-blue-500/20 text-blue-500' },
      website: { label: 'Website', color: 'bg-green-500/20 text-green-500' },
      penetration: { label: 'Pentest', color: 'bg-red-500/20 text-red-500' },
      load: { label: 'Load Test', color: 'bg-yellow-500/20 text-yellow-500' },
    };
    return config[type];
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const handleScanClick = (scan: UnifiedScan) => {
    switch (scan.type) {
      case 'repository':
        navigate(`/results?scanId=${scan.id}`);
        break;
      case 'website':
        navigate(`/website-scan/${scan.id}`);
        break;
      case 'penetration':
        navigate(`/pentest?resultId=${scan.id}`);
        break;
      case 'load':
        navigate(`/loadtest?resultId=${scan.id}`);
        break;
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <Navigation />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-medium text-foreground mb-2">Complete Scan History</h1>
          <p className="text-muted-foreground">
            All security tests, scans, and assessments in one place
          </p>
        </div>

        {/* Stats Cards */}
        {!isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-card border border-border rounded-lg p-4 text-center">
              <Activity className="w-5 h-5 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold font-mono text-foreground">{stats.totalScans}</div>
              <div className="text-xs text-muted-foreground">Total Scans</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4 text-center">
              <GitBranch className="w-5 h-5 text-blue-500 mx-auto mb-2" />
              <div className="text-2xl font-bold font-mono text-foreground">{stats.repoScans}</div>
              <div className="text-xs text-muted-foreground">Repo Scans</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4 text-center">
              <Globe className="w-5 h-5 text-green-500 mx-auto mb-2" />
              <div className="text-2xl font-bold font-mono text-foreground">{stats.websiteScans}</div>
              <div className="text-xs text-muted-foreground">Website Scans</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4 text-center">
              <Target className="w-5 h-5 text-red-500 mx-auto mb-2" />
              <div className="text-2xl font-bold font-mono text-foreground">{stats.pentests}</div>
              <div className="text-xs text-muted-foreground">Pentests</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4 text-center">
              <Zap className="w-5 h-5 text-yellow-500 mx-auto mb-2" />
              <div className="text-2xl font-bold font-mono text-foreground">{stats.loadTests}</div>
              <div className="text-xs text-muted-foreground">Load Tests</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-card border border-border rounded-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by URL or target..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-md bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="px-4 py-2 rounded-md bg-secondary border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              >
                <option value="all">All Types</option>
                <option value="repository">Repository Scans</option>
                <option value="website">Website Scans</option>
                <option value="penetration">Penetration Tests</option>
                <option value="load">Load Tests</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Scans Found</h3>
            <p className="text-sm text-muted-foreground mb-6">
              {searchQuery || filterType !== "all"
                ? "Try adjusting your filters"
                : "Start by running your first security scan"}
            </p>
            <button
              onClick={() => navigate('/repos')}
              className="px-4 py-2 rounded-md bg-primary text-black hover:opacity-90"
            >
              Start Scanning
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHistory.map((scan, idx) => {
              const typeBadge = getTypeBadge(scan.type);
              
              return (
                <motion.div
                  key={scan.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  onClick={() => handleScanClick(scan)}
                  className="bg-card border border-border rounded-lg p-4 hover:bg-secondary/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Type Icon */}
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-primary">
                        {getTypeIcon(scan.type)}
                      </div>

                      {/* Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeBadge.color}`}>
                            {typeBadge.label}
                          </span>
                          <span className="text-sm font-medium text-foreground font-mono">
                            {scan.target}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(scan.date).toLocaleDateString()} at{' '}
                            {new Date(scan.date).toLocaleTimeString()}
                          </span>
                          
                          {scan.vulnerabilities !== undefined && (
                            <span className="flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {scan.vulnerabilities} issues
                            </span>
                          )}

                          {scan.technologies && scan.technologies.length > 0 && (
                            <span className="flex items-center gap-1">
                              {scan.technologies.slice(0, 2).join(', ')}
                              {scan.technologies.length > 2 && ` +${scan.technologies.length - 2}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Score */}
                    {scan.score !== undefined && (
                      <div className="text-center">
                        <div className={`text-2xl font-bold font-mono ${getScoreColor(scan.score)}`}>
                          {scan.score}
                        </div>
                        <div className="text-xs text-muted-foreground">Score</div>
                      </div>
                    )}

                    {/* Status */}
                    {scan.status && (
                      <div className="ml-4">
                        {scan.status === 'completed' ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : scan.status === 'failed' ? (
                          <XCircle className="w-5 h-5 text-red-500" />
                        ) : (
                          <Clock className="w-5 h-5 text-yellow-500" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Summary for repo scans */}
                  {scan.type === 'repository' && scan.summary && (
                    <div className="mt-3 pt-3 border-t border-border flex items-center gap-4 text-xs">
                      {scan.summary.critical > 0 && (
                        <span className="flex items-center gap-1 text-red-500">
                          <XCircle className="w-3 h-3" /> {scan.summary.critical} Critical
                        </span>
                      )}
                      {scan.summary.high > 0 && (
                        <span className="flex items-center gap-1 text-orange-500">
                          <AlertTriangle className="w-3 h-3" /> {scan.summary.high} High
                        </span>
                      )}
                      {scan.summary.medium > 0 && (
                        <span className="flex items-center gap-1 text-yellow-500">
                          <AlertTriangle className="w-3 h-3" /> {scan.summary.medium} Medium
                        </span>
                      )}
                      {scan.summary.low > 0 && (
                        <span className="flex items-center gap-1 text-blue-500">
                          <AlertTriangle className="w-3 h-3" /> {scan.summary.low} Low
                        </span>
                      )}
                    </div>
                  )}

                  {/* Summary for pentests */}
                  {scan.type === 'penetration' && scan.summary && (
                    <div className="mt-3 pt-3 border-t border-border flex items-center gap-4 text-xs">
                      <span className="text-muted-foreground">
                        {scan.summary.totalTests} tests
                      </span>
                      <span className="flex items-center gap-1 text-green-500">
                        <CheckCircle className="w-3 h-3" /> {scan.summary.passed} passed
                      </span>
                      <span className="flex items-center gap-1 text-red-500">
                        <XCircle className="w-3 h-3" /> {scan.summary.failed} failed
                      </span>
                    </div>
                  )}

                  {/* Summary for load tests */}
                  {scan.type === 'load' && scan.results && (
                    <div className="mt-3 pt-3 border-t border-border flex items-center gap-4 text-xs">
                      <span className="text-muted-foreground">
                        {scan.results.totalRequests} requests
                      </span>
                      <span className="flex items-center gap-1 text-green-500">
                        <CheckCircle className="w-3 h-3" /> {scan.results.successfulRequests} success
                      </span>
                      <span className="flex items-center gap-1 text-red-500">
                        <XCircle className="w-3 h-3" /> {scan.results.failedRequests} failed
                      </span>
                      <span className="text-muted-foreground">
                        Avg: {scan.results.averageResponseTime}ms
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedHistoryPage;
