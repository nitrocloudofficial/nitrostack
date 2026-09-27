import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield, GitBranch, Globe, Target, Zap, Clock, AlertTriangle,
  XCircle, CheckCircle, ArrowLeft, ExternalLink, Code, Server,
  Activity, TrendingUp, Download
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { API_ENDPOINTS } from "@/config/api";
import { AuthService } from "@/services/auth.service";
import { toast } from "@/hooks/use-toast";

const ScanDetailPage = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const [scan, setScan] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (type && id) {
      loadScanDetail();
    }
  }, [type, id]);

  const loadScanDetail = async () => {
    try {
      setIsLoading(true);
      const token = AuthService.getToken();
      
      const response = await fetch(API_ENDPOINTS.history.detail(type!, id!), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to load scan details');
      }

      const data = await response.json();
      setScan(data.scan);
    } catch (error: any) {
      console.error('Error loading scan detail:', error);
      toast({
        title: "Error",
        description: "Failed to load scan details",
        variant: "destructive",
      });
      navigate('/history');
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeIcon = () => {
    switch (type) {
      case 'repository': return <GitBranch className="w-6 h-6" />;
      case 'website': return <Globe className="w-6 h-6" />;
      case 'penetration': return <Target className="w-6 h-6" />;
      case 'load': return <Zap className="w-6 h-6" />;
      default: return <Shield className="w-6 h-6" />;
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'repository': return 'Repository Scan';
      case 'website': return 'Website Security Scan';
      case 'penetration': return 'Penetration Test';
      case 'load': return 'Load Test';
      default: return 'Scan';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500 bg-red-500/10';
      case 'high': return 'text-orange-500 bg-orange-500/10';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10';
      case 'low': return 'text-blue-500 bg-blue-500/10';
      case 'info': return 'text-gray-500 bg-gray-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
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
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Scan Not Found</h3>
            <button
              onClick={() => navigate('/history')}
              className="mt-4 px-4 py-2 rounded-md bg-primary text-black hover:opacity-90"
            >
              Back to History
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Navigation />

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/history')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to History
        </button>

        {/* Header */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                {getTypeIcon()}
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">{getTypeLabel()}</div>
                <h1 className="text-2xl font-medium text-foreground mb-2">
                  {type === 'repository' ? scan.repoFullName : scan.url}
                </h1>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {new Date(scan.scanDate || scan.testDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScanDetailPage;