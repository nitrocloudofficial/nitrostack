import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { websiteScanService, PenetrationTestReport } from '@/services/websiteScan.service';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Loader2, Target, Zap, CheckCircle, XCircle, Info, ArrowLeft, Download, Share2 } from 'lucide-react';
import { API_ENDPOINTS } from '@/config/api';
import { AuthService } from '@/services/auth.service';
import { exportToPDF, downloadPDF, sharePDF } from '@/utils/pdfExport';

const severityConfig = {
  critical: { color: 'text-red-500', bg: 'bg-red-500/10', icon: XCircle },
  high: { color: 'text-orange-500', bg: 'bg-orange-500/10', icon: AlertTriangle },
  medium: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: AlertTriangle },
  low: { color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Info },
  info: { color: 'text-gray-500', bg: 'bg-gray-500/10', icon: Info },
};

export default function PenetrationTestPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const resultId = searchParams.get('resultId');
  const [url, setUrl] = useState(searchParams.get('url') || '');
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<PenetrationTestReport | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
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
      const response = await fetch(API_ENDPOINTS.history.detail('penetration', id), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to load test result');

      const data = await response.json();
      const scan = data.scan;

      // Convert to report format
      setReport({
        url: scan.url,
        testDate: scan.testDate,
        testsPerformed: scan.summary.totalTests,
        vulnerabilitiesFound: scan.summary.failed,
        riskScore: Math.round((scan.summary.failed / scan.summary.totalTests) * 100),
        results: scan.results.map((r: any) => ({
          testName: r.testName,
          category: r.category,
          vulnerable: !r.passed,
          severity: r.severity,
          description: r.description,
          evidence: r.evidence,
          payload: r.payload,
          recommendation: r.recommendation,
        })),
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

  const handleTest = async () => {
    if (!url.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a URL',
        variant: 'destructive',
      });
      return;
    }

    if (!confirm('⚠️ WARNING: This will perform active penetration testing on the target website. Only proceed if you own this website or have explicit permission. Continue?')) {
      return;
    }

    try {
      setTesting(true);
      setReport(null);

      const result = await websiteScanService.performPenetrationTest(url);
      setReport(result);

      toast({
        title: 'Penetration Test Complete',
        description: `Found ${result.vulnerabilitiesFound} vulnerabilities`,
      });
    } catch (error: any) {
      console.error('Penetration test error:', error);

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
          description: error.response?.data?.error || error.message || 'Failed to perform penetration test',
          variant: 'destructive',
        });
      }
    } finally {
      setTesting(false);
    }
  };

  const categories = report ? Array.from(new Set(report.results.map(r => r.category))) : [];
  const filteredResults = selectedCategory
    ? report?.results.filter(r => r.category === selectedCategory)
    : report?.results;

  // Sort results to show vulnerabilities first, then by severity
  const sortedResults = filteredResults ? [...filteredResults].sort((a, b) => {
    // Vulnerable items first
    if (a.vulnerable && !b.vulnerable) return -1;
    if (!a.vulnerable && b.vulnerable) return 1;
    
    // If both vulnerable or both secure, sort by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  }) : [];

  const vulnerableResults = report?.results.filter(r => r.vulnerable) || [];

  const handleExportPDF = () => {
    if (!report) return;

    // Separate vulnerable and secure results
    const vulnerableTests = report.results.filter(r => r.vulnerable);
    const secureTests = report.results.filter(r => !r.vulnerable);

    // Sort vulnerabilities by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    vulnerableTests.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    const doc = exportToPDF({
      title: 'PENETRATION TEST REPORT',
      subtitle: report.url,
      metadata: {
        date: new Date(report.testDate).toLocaleString(),
        url: report.url,
        score: report.riskScore,
      },
      sections: [
        {
          title: 'Executive Summary',
          table: {
            headers: ['Metric', 'Value'],
            rows: [
              ['Tests Performed', report.testsPerformed.toString()],
              ['VULNERABILITIES FOUND', report.vulnerabilitiesFound.toString()],
              ['Risk Score', `${report.riskScore}/100`],
              ['Passed Tests', (report.testsPerformed - report.vulnerabilitiesFound).toString()],
            ],
          },
        },
        {
          title: 'Vulnerability Breakdown by Severity',
          table: {
            headers: ['Severity Level', 'Count', 'Status'],
            rows: Object.entries(severityConfig).map(([severity, config]) => {
              const count = vulnerableResults.filter(r => r.severity === severity).length;
              if (count === 0) return null;
              return [
                severity.toUpperCase(),
                count.toString(),
                count > 0 ? 'ACTION REQUIRED' : 'OK'
              ];
            }).filter(Boolean) as (string | number)[][],
          },
        },
        // VULNERABILITIES SECTION - Show first
        ...(vulnerableTests.length > 0 ? [{
          title: '═══════════════════════════════════════',
        }, {
          title: 'CRITICAL VULNERABILITIES DETECTED',
        }, {
          title: '═══════════════════════════════════════',
        }] : []),
        ...vulnerableTests.map((result) => ({
          title: `VULNERABILITY: ${result.testName}`,
          content: `SEVERITY: ${result.severity.toUpperCase()}\nCATEGORY: ${result.category}\nSTATUS: VULNERABLE\n\nDESCRIPTION:\n${result.description}`,
          list: [
            result.evidence ? `EVIDENCE:\n${result.evidence}` : null,
            result.payload ? `ATTACK PAYLOAD:\n${result.payload}` : null,
            `RECOMMENDATION:\n${result.recommendation}`,
          ].filter(Boolean) as string[],
        })),
        // SECURE TESTS SECTION - Show after vulnerabilities
        ...(secureTests.length > 0 ? [{
          title: '═══════════════════════════════════════',
        }, {
          title: 'SECURE TESTS (Passed)',
        }, {
          title: '═══════════════════════════════════════',
        }] : []),
        ...secureTests.map((result) => ({
          title: `${result.testName} - SECURE`,
          content: `Category: ${result.category}\nSeverity Level: ${result.severity}\nStatus: PASSED\n\nDescription: ${result.description}`,
          list: [`Recommendation: ${result.recommendation}`],
        })),
      ],
    });

    downloadPDF(doc, `pentest-${report.url.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.pdf`);
    
    toast({
      title: 'PDF Downloaded',
      description: 'Penetration test report has been downloaded',
    });
  };

  const handleShare = async () => {
    if (!report) return;

    const doc = exportToPDF({
      title: 'Penetration Test Report',
      subtitle: report.url,
      metadata: {
        date: new Date(report.testDate).toLocaleString(),
        url: report.url,
        score: report.riskScore,
      },
      sections: [
        {
          title: 'Summary',
          content: `Tests: ${report.testsPerformed}, Vulnerabilities: ${report.vulnerabilitiesFound}, Risk Score: ${report.riskScore}`,
        },
      ],
    });

    const shared = await sharePDF(doc, `Pentest Report - ${report.url}`);
    
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
              <Target className="h-8 w-8 text-red-500" />
              <div>
                <h1 className="text-3xl font-bold text-foreground">Penetration Testing</h1>
                <p className="text-muted-foreground">Active security testing for verified domains</p>
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
              <Alert className="mb-6 border-red-500/50 bg-red-500/10">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <AlertDescription className="ml-2">
                  <div className="space-y-2">
                    <p className="font-semibold text-foreground">⚠️ WARNING: Active Attack Mode</p>
                    <p className="text-sm text-muted-foreground">
                      This tool performs active penetration testing including injection attacks, 
                      path traversal, and other potentially harmful tests. Only use on websites 
                      you own or have explicit written permission to test. Unauthorized testing 
                      is illegal.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>

              {viewMode === 'new' && (
                <Card className="mb-6">
            <CardHeader>
              <CardTitle>Target Configuration</CardTitle>
              <CardDescription>
                Enter the URL of your verified website to perform penetration testing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
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

                <div className="flex gap-2">
                  <Button
                    onClick={handleTest}
                    disabled={testing || !url.trim()}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    {testing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Testing... (This may take a while)
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-4 w-4" />
                        Start Penetration Test
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/domain-verification')}
                  >
                    Verify Domain
                  </Button>
                </div>

                <Alert>
                  <AlertDescription>
                    <div className="space-y-2 text-sm">
                      <p className="font-medium">Tests performed:</p>
                      <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                        <div>• XSS (Cross-Site Scripting)</div>
                        <div>• SQL Injection</div>
                        <div>• Command Injection</div>
                        <div>• Path Traversal</div>
                        <div>• CSRF</div>
                        <div>• SSRF</div>
                        <div>• Open Redirect</div>
                        <div>• XXE</div>
                        <div>• Security Misconfigurations</div>
                        <div>• Session Management</div>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
              )}

              {report && (
            <>
              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Test Summary</CardTitle>
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-3xl font-bold text-foreground">{report.testsPerformed}</div>
                      <div className="text-sm text-muted-foreground">Tests Performed</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-3xl font-bold text-red-500">{report.vulnerabilitiesFound}</div>
                      <div className="text-sm text-muted-foreground">Vulnerabilities</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-3xl font-bold text-orange-500">{report.riskScore}</div>
                      <div className="text-sm text-muted-foreground">Risk Score</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-3xl font-bold text-green-500">
                        {report.testsPerformed - report.vulnerabilitiesFound}
                      </div>
                      <div className="text-sm text-muted-foreground">Passed</div>
                    </div>
                  </div>

                  {vulnerableResults.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2">
                      {Object.entries(severityConfig).map(([severity, config]) => {
                        const count = vulnerableResults.filter(r => r.severity === severity).length;
                        if (count === 0) return null;
                        return (
                          <div key={severity} className={`p-2 rounded-lg ${config.bg}`}>
                            <div className={`text-lg font-bold ${config.color}`}>{count}</div>
                            <div className="text-xs text-muted-foreground capitalize">{severity}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Detailed Results</CardTitle>
                  <div className="flex gap-2 flex-wrap mt-2">
                    <Button
                      size="sm"
                      variant={selectedCategory === null ? 'default' : 'outline'}
                      onClick={() => setSelectedCategory(null)}
                    >
                      All ({report.results.length})
                    </Button>
                    {categories.map(category => (
                      <Button
                        key={category}
                        size="sm"
                        variant={selectedCategory === category ? 'default' : 'outline'}
                        onClick={() => setSelectedCategory(category)}
                      >
                        {category} ({report.results.filter(r => r.category === category).length})
                      </Button>
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {sortedResults?.map((result, index) => {
                      const config = severityConfig[result.severity];
                      const Icon = result.vulnerable ? config.icon : CheckCircle;
                      
                      return (
                        <div
                          key={index}
                          className={`p-4 border rounded-lg ${result.vulnerable ? config.bg : 'bg-green-500/10'}`}
                        >
                          <div className="flex items-start gap-3">
                            <Icon className={`h-5 w-5 mt-0.5 ${result.vulnerable ? config.color : 'text-green-500'}`} />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-foreground">{result.testName}</h3>
                                <Badge variant={result.vulnerable ? 'destructive' : 'default'}>
                                  {result.vulnerable ? 'VULNERABLE' : 'SECURE'}
                                </Badge>
                                <Badge variant="outline" className="capitalize">
                                  {result.severity}
                                </Badge>
                              </div>
                              
                              <p className="text-sm text-muted-foreground mb-2">{result.description}</p>
                              
                              {result.evidence && (
                                <div className="mb-2">
                                  <p className="text-xs font-semibold text-foreground mb-1">Evidence:</p>
                                  <code className="text-xs bg-black/50 p-2 rounded block">
                                    {result.evidence}
                                  </code>
                                </div>
                              )}
                              
                              {result.payload && (
                                <div className="mb-2">
                                  <p className="text-xs font-semibold text-foreground mb-1">Payload Used:</p>
                                  <code className="text-xs bg-black/50 p-2 rounded block break-all">
                                    {result.payload}
                                  </code>
                                </div>
                              )}
                              
                              <div className="mt-2 p-2 bg-black/30 rounded">
                                <p className="text-xs font-semibold text-foreground mb-1">Recommendation:</p>
                                <p className="text-xs text-muted-foreground">{result.recommendation}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
