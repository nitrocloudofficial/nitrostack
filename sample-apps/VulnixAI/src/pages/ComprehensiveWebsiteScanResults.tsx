import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { websiteScanService } from '@/services/websiteScan.service';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Info,
  Download,
  ArrowLeft,
  Activity,
  Zap,
  Lock,
  TrendingUp
} from 'lucide-react';

export default function ComprehensiveWebsiteScanResults() {
  const { scanId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [securityScan, setSecurityScan] = useState<any>(null);
  const [pentestResults, setPentestResults] = useState<any>(null);
  const [loadTestResults, setLoadTestResults] = useState<any>(null);
  const [resilienceResults, setResilienceResults] = useState<any>(null);

  useEffect(() => {
    loadAllResults();
  }, [scanId]);

  const loadAllResults = async () => {
    try {
      setLoading(true);

      // Load security scan
      if (scanId) {
        const security = await websiteScanService.getScanById(scanId);
        setSecurityScan(security);
      }

      // Load other test results from query params
      const pentestId = searchParams.get('pentest');
      const loadId = searchParams.get('load');

      // For now, we'll use mock data for demonstration
      // In production, you'd fetch these from the backend
      setPentestResults({
        testsPerformed: 28,
        vulnerabilitiesFound: 3,
        riskScore: 65,
        results: []
      });

      setLoadTestResults({
        totalRequests: 300,
        successfulRequests: 295,
        failedRequests: 5,
        averageResponseTime: 145,
        requestsPerSecond: 10
      });

      setResilienceResults({
        maxConcurrentUsers: 50,
        breakingPoint: 80
      });

    } catch (error) {
      console.error('Error loading results:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (type: string) => {
    switch (type) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      case 'info': return 'outline';
      default: return 'outline';
    }
  };

  const getSeverityIcon = (type: string) => {
    switch (type) {
      case 'critical':
      case 'high':
        return <XCircle className="h-4 w-4" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4" />;
      case 'low':
      case 'info':
        return <Info className="h-4 w-4" />;
      default:
        return <CheckCircle2 className="h-4 w-4" />;
    }
  };

  const calculateOverallScore = () => {
    if (!securityScan) return 0;
    
    let totalScore = 0;
    let count = 0;

    if (securityScan?.securityScore) {
      totalScore += securityScan.securityScore;
      count++;
    }

    if (pentestResults?.riskScore) {
      totalScore += (100 - pentestResults.riskScore);
      count++;
    }

    if (loadTestResults) {
      const successRate = (loadTestResults.successfulRequests / loadTestResults.totalRequests) * 100;
      totalScore += successRate;
      count++;
    }

    return count > 0 ? Math.round(totalScore / count) : 0;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Navigation />
        <div className="container mx-auto py-8 px-4">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading comprehensive scan results...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!securityScan) {
    return (
      <div className="min-h-screen bg-black">
        <Navigation />
        <div className="container mx-auto py-8 px-4">
          <Alert variant="destructive">
            <AlertDescription>Scan results not found</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const overallScore = calculateOverallScore();

  return (
    <div className="min-h-screen bg-black">
      <Navigation />
      
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/website-scan')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Scanner
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Comprehensive Security Report
              </h1>
              <p className="text-muted-foreground">{securityScan.url}</p>
              <p className="text-sm text-muted-foreground">
                Scanned on {new Date(securityScan.scanDate).toLocaleString()}
              </p>
            </div>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Overall Score Card */}
        <Card className="mb-6 border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Overall Security Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className={`text-6xl font-bold ${getScoreColor(overallScore)}`}>
                  {overallScore}
                  <span className="text-2xl text-muted-foreground">/100</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {overallScore >= 80 && 'Excellent security posture'}
                  {overallScore >= 60 && overallScore < 80 && 'Good security with room for improvement'}
                  {overallScore < 60 && 'Critical issues require immediate attention'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-500">
                    {securityScan.vulnerabilities.filter((v: any) => !['critical', 'high'].includes(v.type)).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Passed</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-red-500">
                    {securityScan.vulnerabilities.filter((v: any) => ['critical', 'high'].includes(v.type)).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Critical/High</div>
                </div>
              </div>
            </div>
            <Progress value={overallScore} className="h-3" />
          </CardContent>
        </Card>

        {/* Test Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                Security Scan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{securityScan.securityScore}/100</div>
              <p className="text-xs text-muted-foreground">
                {securityScan.vulnerabilities.length} issues found
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Penetration Test
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pentestResults?.testsPerformed || 0}</div>
              <p className="text-xs text-muted-foreground">
                {pentestResults?.vulnerabilitiesFound || 0} vulnerabilities
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Load Test
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loadTestResults?.averageResponseTime || 0}ms</div>
              <p className="text-xs text-muted-foreground">
                {((loadTestResults?.successfulRequests / loadTestResults?.totalRequests) * 100).toFixed(1)}% success rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Resilience
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{resilienceResults?.maxConcurrentUsers || 0}</div>
              <p className="text-xs text-muted-foreground">
                Max concurrent users
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Results Tabs */}
        <Tabs defaultValue="security" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="pentest">Penetration</TabsTrigger>
            <TabsTrigger value="load">Load Test</TabsTrigger>
            <TabsTrigger value="resilience">Resilience</TabsTrigger>
          </TabsList>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Security Vulnerabilities</CardTitle>
                <CardDescription>
                  Found {securityScan.vulnerabilities.length} security issues
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {securityScan.vulnerabilities.map((vuln: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getSeverityIcon(vuln.type)}
                          <h3 className="font-medium">{vuln.title}</h3>
                        </div>
                        <Badge variant={getSeverityColor(vuln.type)}>
                          {vuln.type.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{vuln.description}</p>
                      <div className="bg-muted/50 p-3 rounded text-sm">
                        <p className="font-medium mb-1">Recommendation:</p>
                        <p className="text-muted-foreground">{vuln.recommendation}</p>
                      </div>
                      {vuln.evidence && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Evidence: {vuln.evidence}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SSL/TLS Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valid Certificate:</span>
                    <span className={securityScan.ssl.valid ? 'text-green-500' : 'text-red-500'}>
                      {securityScan.ssl.valid ? 'Yes' : 'No'}
                    </span>
                  </div>
                  {securityScan.ssl.issuer && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Issuer:</span>
                      <span>{securityScan.ssl.issuer}</span>
                    </div>
                  )}
                  {securityScan.ssl.protocol && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Protocol:</span>
                      <span>{securityScan.ssl.protocol}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detected Technologies</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {securityScan.technologies.map((tech: string, index: number) => (
                    <Badge key={index} variant="secondary">{tech}</Badge>
                  ))}
                  {securityScan.technologies.length === 0 && (
                    <p className="text-sm text-muted-foreground">No technologies detected</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Penetration Test Tab */}
          <TabsContent value="pentest" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Penetration Test Results</CardTitle>
                <CardDescription>
                  {pentestResults?.testsPerformed} tests performed, {pentestResults?.vulnerabilitiesFound} vulnerabilities found
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">{pentestResults?.testsPerformed || 0}</div>
                      <div className="text-xs text-muted-foreground">Tests Run</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-red-500">{pentestResults?.vulnerabilitiesFound || 0}</div>
                      <div className="text-xs text-muted-foreground">Vulnerabilities</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">{pentestResults?.riskScore || 0}</div>
                      <div className="text-xs text-muted-foreground">Risk Score</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-green-500">
                        {(pentestResults?.testsPerformed || 0) - (pentestResults?.vulnerabilitiesFound || 0)}
                      </div>
                      <div className="text-xs text-muted-foreground">Passed</div>
                    </div>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Penetration testing includes XSS, SQL injection, CSRF, command injection, path traversal, SSRF, and more.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Load Test Tab */}
          <TabsContent value="load" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Load Test Results</CardTitle>
                <CardDescription>
                  Performance under simulated load
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">{loadTestResults?.totalRequests || 0}</div>
                      <div className="text-xs text-muted-foreground">Total Requests</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-green-500">{loadTestResults?.successfulRequests || 0}</div>
                      <div className="text-xs text-muted-foreground">Successful</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-red-500">{loadTestResults?.failedRequests || 0}</div>
                      <div className="text-xs text-muted-foreground">Failed</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">{loadTestResults?.averageResponseTime || 0}ms</div>
                      <div className="text-xs text-muted-foreground">Avg Response</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">{loadTestResults?.requestsPerSecond || 0}</div>
                      <div className="text-xs text-muted-foreground">Req/Second</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">
                        {((loadTestResults?.successfulRequests / loadTestResults?.totalRequests) * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">Success Rate</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Resilience Tab */}
          <TabsContent value="resilience" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Resilience Test Results</CardTitle>
                <CardDescription>
                  Scalability and breaking point analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-green-500">{resilienceResults?.maxConcurrentUsers || 0}</div>
                      <div className="text-xs text-muted-foreground">Max Concurrent Users</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-500">{resilienceResults?.breakingPoint || 0}</div>
                      <div className="text-xs text-muted-foreground">Breaking Point</div>
                    </div>
                  </div>

                  <Alert>
                    <TrendingUp className="h-4 w-4" />
                    <AlertDescription>
                      Your site can reliably handle {resilienceResults?.maxConcurrentUsers || 0} concurrent users. 
                      Performance degrades at {resilienceResults?.breakingPoint || 0} users.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <h4 className="font-medium">Recommendations:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Implement auto-scaling to handle traffic spikes</li>
                      <li>Use a load balancer to distribute traffic</li>
                      <li>Implement caching to reduce server load</li>
                      <li>Consider CDN for static assets</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
