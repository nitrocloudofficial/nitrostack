import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApiClient } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Loader2, Activity, Zap, TrendingUp, ArrowLeft, Shield, Download, Share2 } from 'lucide-react';
import { API_ENDPOINTS } from '@/config/api';
import { AuthService } from '@/services/auth.service';
import { exportToPDF, downloadPDF, sharePDF } from '@/utils/pdfExport';

interface LoadTestResult {
  url: string;
  testDate: string;
  duration: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errors: Array<{ status: number; count: number; message: string }>;
  recommendations: string[];
}

export default function LoadTestPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const resultId = searchParams.get('resultId');
  const [url, setUrl] = useState(searchParams.get('url') || '');
  const [duration, setDuration] = useState(30);
  const [concurrentUsers, setConcurrentUsers] = useState(10);
  const [requestsPerSecond, setRequestsPerSecond] = useState(10);
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LoadTestResult | null>(null);
  const [testType, setTestType] = useState<'load' | 'resilience'>('load');
  const [viewMode, setViewMode] = useState<'new' | 'view'>(resultId ? 'view' : 'new');

  useEffect(() => {
    if (resultId) {
      loadExistingResult(resultId);
    }
  }, [resultId]);

  const loadExistingResult = async (id: string) => {
    try {
      setLoading(true);
      const token = AuthService.getToken();
      const response = await fetch(API_ENDPOINTS.history.detail('load', id), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to load test result');

      const data = await response.json();
      const scan = data.scan;

      setResult({
        url: scan.url,
        testDate: scan.testDate,
        duration: scan.results.duration,
        totalRequests: scan.results.totalRequests,
        successfulRequests: scan.results.successfulRequests,
        failedRequests: scan.results.failedRequests,
        rateLimitedRequests: scan.results.rateLimitedRequests || 0,
        averageResponseTime: scan.results.averageResponseTime,
        minResponseTime: scan.results.minResponseTime,
        maxResponseTime: scan.results.maxResponseTime,
        requestsPerSecond: scan.results.requestsPerSecond,
        errors: scan.results.errors || [],
        recommendations: scan.results.recommendations || [],
      });
      setUrl(scan.url);
    } catch (error: any) {
      console.error('Error loading result:', error);
      toast({
        title: 'Error',
        description: 'Failed to load test result',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLoadTest = async () => {
    if (!url.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a URL',
        variant: 'destructive',
      });
      return;
    }

    if (!confirm(`⚠️ This will send ${concurrentUsers * requestsPerSecond * duration} requests to your site. Continue?`)) {
      return;
    }

    try {
      setTesting(true);
      setResult(null);

      const response: LoadTestResult = await ApiClient.post('/api/website-scan/loadtest', {
        url,
        duration,
        concurrentUsers,
        requestsPerSecond,
        method: 'GET',
      });

      setResult(response);

      toast({
        title: 'Load Test Complete',
        description: `Sent ${response.totalRequests} requests`,
      });
    } catch (error: any) {
      console.error('Load test error:', error);

      if (error.response?.data?.requiresVerification) {
        toast({
          title: 'Domain Not Verified',
          description: error.response.data.message,
          variant: 'destructive',
        });
        navigate('/domain-verification');
      } else {
        toast({
          title: 'Test Failed',
          description: error.response?.data?.error || error.message || 'Failed to perform load test',
          variant: 'destructive',
        });
      }
    } finally {
      setTesting(false);
    }
  };

  const handleResilienceTest = async () => {
    if (!url.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a URL',
        variant: 'destructive',
      });
      return;
    }

    try {
      setTesting(true);

      const response: any = await ApiClient.post('/api/website-scan/test-resilience', { url });

      toast({
        title: 'Resilience Test Complete',
        description: `Max concurrent users: ${response.maxConcurrentUsers}`,
      });

      alert(JSON.stringify(response, null, 2));
    } catch (error: any) {
      toast({
        title: 'Test Failed',
        description: error.response?.data?.error || 'Failed to test resilience',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  const successRate = result ? (result.successfulRequests / result.totalRequests) * 100 : 0;
  const failureRate = result ? (result.failedRequests / result.totalRequests) * 100 : 0;
  const rateLimitRate = result ? (result.rateLimitedRequests / result.totalRequests) * 100 : 0;

  const handleExportPDF = () => {
    if (!result) return;

    const doc = exportToPDF({
      title: 'Load Test Report',
      subtitle: result.url,
      metadata: {
        date: new Date(result.testDate).toLocaleString(),
        url: result.url,
      },
      sections: [
        {
          title: 'Test Configuration',
          table: {
            headers: ['Parameter', 'Value'],
            rows: [
              ['Duration', `${result.duration}s`],
              ['Total Requests', result.totalRequests.toString()],
              ['Requests/Second', result.requestsPerSecond.toString()],
            ],
          },
        },
        {
          title: 'Results Summary',
          table: {
            headers: ['Metric', 'Value'],
            rows: [
              ['Successful Requests', result.successfulRequests.toString()],
              ['Failed Requests', result.failedRequests.toString()],
              ['Rate Limited', result.rateLimitedRequests.toString()],
              ['Success Rate', `${successRate.toFixed(1)}%`],
              ['Avg Response Time', `${result.averageResponseTime}ms`],
              ['Min Response Time', `${result.minResponseTime}ms`],
              ['Max Response Time', `${result.maxResponseTime}ms`],
            ],
          },
        },
        ...(result.errors.length > 0 ? [{
          title: 'Errors',
          table: {
            headers: ['Status', 'Message', 'Count'],
            rows: result.errors.map(e => [
              e.status.toString(),
              e.message,
              e.count.toString(),
            ]),
          },
        }] : []),
        ...(result.recommendations.length > 0 ? [{
          title: 'Recommendations',
          list: result.recommendations,
        }] : []),
      ],
    });

    downloadPDF(doc, `loadtest-${result.url.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.pdf`);
    
    toast({
      title: 'PDF Downloaded',
      description: 'Load test report has been downloaded',
    });
  };

  const handleShare = async () => {
    if (!result) return;

    const doc = exportToPDF({
      title: 'Load Test Report',
      subtitle: result.url,
      metadata: {
        date: new Date(result.testDate).toLocaleString(),
        url: result.url,
      },
      sections: [
        {
          title: 'Summary',
          content: `Total Requests: ${result.totalRequests}, Success Rate: ${successRate.toFixed(1)}%, Avg Response: ${result.averageResponseTime}ms`,
        },
      ],
    });

    const shared = await sharePDF(doc, `Load Test - ${result.url}`);
    
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
      
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-blue-500" />
              <div>
                <h1 className="text-3xl font-bold text-foreground">Load & Stress Testing</h1>
                <p className="text-muted-foreground">Test your site's capacity and resilience</p>
              </div>
            </div>
            {viewMode === 'view' && (
              <Button variant="outline" onClick={() => navigate('/scan-history')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to History
              </Button>
            )}
          </div>

          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          )}

          {!loading && (
            <>
              <Alert className="mb-6 border-blue-500/50 bg-blue-500/10">
                <AlertTriangle className="h-4 w-4 text-blue-500" />
                <AlertDescription className="ml-2">
                  <div className="space-y-2">
                    <p className="font-semibold text-foreground">ℹ️ Controlled Load Testing</p>
                    <p className="text-sm text-muted-foreground">
                      This tool performs controlled load testing to measure your site's capacity and 
                      identify performance bottlenecks. It's NOT a DDoS attack - it uses reasonable 
                      limits and only works on verified domains.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>

              {viewMode === 'new' && (
                <Card className="mb-6">
            <CardHeader>
              <CardTitle>Test Configuration</CardTitle>
              <CardDescription>
                Configure load testing parameters for your verified website
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <Label htmlFor="url">Website URL</Label>
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://example.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={testing}
                    className="mt-1"
                  />
                </div>

                <Tabs value={testType} onValueChange={(v) => setTestType(v as any)}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="load">Load Test</TabsTrigger>
                    <TabsTrigger value="resilience">Resilience</TabsTrigger>
                  </TabsList>

                  <TabsContent value="load" className="space-y-6 mt-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Duration: {duration} seconds</Label>
                        <span className="text-sm text-muted-foreground">Max: 60s</span>
                      </div>
                      <Slider
                        value={[duration]}
                        onValueChange={(v) => setDuration(v[0])}
                        min={10}
                        max={60}
                        step={5}
                        disabled={testing}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Concurrent Users: {concurrentUsers}</Label>
                        <span className="text-sm text-muted-foreground">Max: 100</span>
                      </div>
                      <Slider
                        value={[concurrentUsers]}
                        onValueChange={(v) => setConcurrentUsers(v[0])}
                        min={1}
                        max={100}
                        step={1}
                        disabled={testing}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Requests/Second: {requestsPerSecond}</Label>
                        <span className="text-sm text-muted-foreground">Max: 50</span>
                      </div>
                      <Slider
                        value={[requestsPerSecond]}
                        onValueChange={(v) => setRequestsPerSecond(v[0])}
                        min={1}
                        max={50}
                        step={1}
                        disabled={testing}
                      />
                    </div>

                    <Alert>
                      <AlertDescription>
                        <div className="text-sm">
                          <p className="font-medium mb-1">Estimated load:</p>
                          <p className="text-muted-foreground">
                            Total requests: ~{concurrentUsers * requestsPerSecond * duration}
                          </p>
                        </div>
                      </AlertDescription>
                    </Alert>

                    <Button
                      onClick={handleLoadTest}
                      disabled={testing || !url.trim()}
                      className="w-full"
                    >
                      {testing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <Zap className="mr-2 h-4 w-4" />
                          Start Load Test
                        </>
                      )}
                    </Button>
                  </TabsContent>

                  <TabsContent value="resilience" className="space-y-4 mt-6">
                    <p className="text-sm text-muted-foreground">
                      This test gradually increases load to find your site's breaking point.
                    </p>
                    <Button
                      onClick={handleResilienceTest}
                      disabled={testing || !url.trim()}
                      className="w-full"
                    >
                      {testing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <TrendingUp className="mr-2 h-4 w-4" />
                          Test Resilience
                        </>
                      )}
                    </Button>
                  </TabsContent>
                </Tabs>
              </div>
            </CardContent>
          </Card>
              )}

          {result && (
            <>
              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Test Results</CardTitle>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleShare}>
                        <Share2 className="mr-2 h-4 w-4" />
                        Share
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleExportPDF}>
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-3xl font-bold text-foreground">{result.totalRequests}</div>
                      <div className="text-sm text-muted-foreground">Total Requests</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-3xl font-bold text-green-500">{successRate.toFixed(1)}%</div>
                      <div className="text-sm text-muted-foreground">Success Rate</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-3xl font-bold text-blue-500">{result.averageResponseTime}ms</div>
                      <div className="text-sm text-muted-foreground">Avg Response</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-3xl font-bold text-orange-500">{result.requestsPerSecond}</div>
                      <div className="text-sm text-muted-foreground">Req/Second</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="p-3 bg-green-500/10 border border-green-500/50 rounded-lg">
                      <div className="text-lg font-bold text-green-500">{result.successfulRequests}</div>
                      <div className="text-xs text-muted-foreground">Successful</div>
                    </div>
                    <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
                      <div className="text-lg font-bold text-red-500">{result.failedRequests}</div>
                      <div className="text-xs text-muted-foreground">Failed</div>
                    </div>
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
                      <div className="text-lg font-bold text-yellow-500">{result.rateLimitedRequests}</div>
                      <div className="text-xs text-muted-foreground">Rate Limited</div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Min Response Time:</span>
                      <span className="font-medium">{result.minResponseTime}ms</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Max Response Time:</span>
                      <span className="font-medium">{result.maxResponseTime}ms</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="font-medium">{result.duration}s</span>
                    </div>
                  </div>

                  {result.errors.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-semibold mb-2">Errors</h3>
                      <div className="space-y-2">
                        {result.errors.map((error, index) => (
                          <div key={index} className="p-2 bg-red-500/10 border border-red-500/50 rounded text-sm">
                            <div className="flex justify-between">
                              <span>HTTP {error.status}: {error.message}</span>
                              <span className="font-medium">{error.count} occurrences</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="font-semibold mb-2">Recommendations</h3>
                    <ul className="space-y-2">
                      {result.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-blue-500 mt-1">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
          </>
        )}
        </div>
      </div>
    </div>
  );
}
