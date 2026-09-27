import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { websiteScanService } from '@/services/websiteScan.service';
import { useToast } from '@/hooks/use-toast';
import { Shield, AlertTriangle, Loader2, History, CheckCircle2, XCircle } from 'lucide-react';

interface ScanProgress {
  stage: string;
  progress: number;
  message: string;
}

export default function WebsiteScanPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [url, setUrl] = useState(searchParams.get('url') || '');
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress>({
    stage: '',
    progress: 0,
    message: ''
  });
  const [verificationError, setVerificationError] = useState<{
    domain: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    const urlParam = searchParams.get('url');
    if (urlParam) {
      setUrl(urlParam);
      // Auto-check verification status
      checkVerification(urlParam);
    }
  }, [searchParams]);

  const checkVerification = async (urlToCheck: string) => {
    try {
      const result = await websiteScanService.checkDomainVerification(urlToCheck);
      if (!result.verified) {
        setVerificationError({
          domain: result.domain,
          message: `Domain ${result.domain} is not verified. Please verify ownership before scanning.`,
        });
      } else {
        setVerificationError(null);
      }
    } catch (error: any) {
      console.error('Error checking verification:', error);
    }
  };

  const handleScan = async () => {
    if (!url.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a URL',
        variant: 'destructive',
      });
      return;
    }

    try {
      setScanning(true);
      setVerificationError(null);

      // Stage 1: Basic Security Scan
      setScanProgress({ stage: 'security', progress: 10, message: 'Scanning security headers and SSL...' });
      const securityResult = await websiteScanService.scanWebsite(url);

      // Stage 2: Penetration Testing
      setScanProgress({ stage: 'pentest', progress: 30, message: 'Running penetration tests...' });
      const pentestResult = await websiteScanService.penetrationTest(url);

      // Stage 3: Load Testing
      setScanProgress({ stage: 'load', progress: 50, message: 'Performing load testing...' });
      const loadTestResult = await websiteScanService.loadTest(url, {
        duration: 30,
        concurrentUsers: 10,
        requestsPerSecond: 10
      });

      // Stage 4: Resilience Testing
      setScanProgress({ stage: 'resilience', progress: 85, message: 'Testing resilience...' });
      const resilienceResult = await websiteScanService.testResilience(url);

      setScanProgress({ stage: 'complete', progress: 100, message: 'Scan complete!' });

      toast({
        title: 'Comprehensive Scan Complete',
        description: `All tests completed successfully`,
      });

      // Navigate to unified results page with all test IDs
      navigate(`/website-scan/${securityResult._id}?pentest=${pentestResult._id}&load=${loadTestResult._id}`);
    } catch (error: any) {
      console.error('Scan error:', error);

      // Check if it's a verification error
      if (error.response?.data?.requiresVerification) {
        const domain = error.response.data.domain;
        setVerificationError({
          domain,
          message: error.response.data.message,
        });
      } else {
        toast({
          title: 'Scan Failed',
          description: error.response?.data?.error || error.message || 'Failed to scan website',
          variant: 'destructive',
        });
      }
    } finally {
      setScanning(false);
      setScanProgress({ stage: '', progress: 0, message: '' });
    }
  };

  const handleVerifyDomain = () => {
    navigate('/domain-verification');
  };

  return (
    <div className="min-h-screen bg-black">
      <Navigation />
      
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Website Vulnerability Scanner</h1>
              <p className="text-muted-foreground">Scan your website for security vulnerabilities</p>
            </div>
          </div>

          {verificationError && (
            <Alert className="mb-6 border-yellow-500/50 bg-yellow-500/10">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <AlertDescription className="ml-2">
                <div className="space-y-3">
                  <p className="text-foreground">{verificationError.message}</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleVerifyDomain}
                      className="bg-yellow-500 text-black hover:bg-yellow-600"
                    >
                      Verify Domain
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setVerificationError(null)}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Comprehensive Website Security Scan</CardTitle>
              <CardDescription>
                Complete security assessment including vulnerability scanning, penetration testing, load testing, rate limiting, and resilience testing.
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
                    onChange={(e) => {
                      setUrl(e.target.value);
                      setVerificationError(null);
                    }}
                    onBlur={() => url && checkVerification(url)}
                    disabled={scanning}
                    className="mt-1"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter the full URL including https://
                  </p>
                </div>

                {scanning && (
                  <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{scanProgress.message}</span>
                      <span className="text-sm text-muted-foreground">{scanProgress.progress}%</span>
                    </div>
                    <Progress value={scanProgress.progress} className="h-2" />
                    <div className="grid grid-cols-5 gap-2 text-xs">
                      <div className={`flex items-center gap-1 ${scanProgress.progress >= 10 ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {scanProgress.progress >= 30 ? <CheckCircle2 className="h-3 w-3" /> : <Loader2 className="h-3 w-3 animate-spin" />}
                        Security
                      </div>
                      <div className={`flex items-center gap-1 ${scanProgress.progress >= 30 ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {scanProgress.progress >= 50 ? <CheckCircle2 className="h-3 w-3" /> : scanProgress.progress >= 30 ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                        Pentest
                      </div>
                      <div className={`flex items-center gap-1 ${scanProgress.progress >= 50 ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {scanProgress.progress >= 70 ? <CheckCircle2 className="h-3 w-3" /> : scanProgress.progress >= 50 ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                        Load Test
                      </div>
                      <div className={`flex items-center gap-1 ${scanProgress.progress >= 85 ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {scanProgress.progress >= 100 ? <CheckCircle2 className="h-3 w-3" /> : scanProgress.progress >= 85 ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                        Resilience
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleScan}
                    disabled={scanning || !url.trim()}
                    className="flex-1"
                  >
                    {scanning ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Running Comprehensive Scan...
                      </>
                    ) : (
                      <>
                        <Shield className="mr-2 h-4 w-4" />
                        Start Comprehensive Scan
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleVerifyDomain}
                  >
                    Manage Domains
                  </Button>
                </div>

                <Alert>
                  <AlertDescription>
                    <div className="space-y-2 text-sm">
                      <p className="font-medium">Before scanning:</p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>Verify domain ownership in the Domains page</li>
                        <li>Ensure you have permission to scan the website</li>
                        <li>Only scan websites you own or have authorization to test</li>
                        <li>Comprehensive scan may take 2-3 minutes to complete</li>
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>

                <div className="pt-4 border-t">
                  <h3 className="font-medium mb-3">Comprehensive Testing Includes:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="space-y-2">
                      <h4 className="font-medium text-primary">Security Scanning</h4>
                      <ul className="text-muted-foreground space-y-1">
                        <li>• Security headers analysis</li>
                        <li>• SSL/TLS configuration</li>
                        <li>• Mixed content detection</li>
                        <li>• Information disclosure</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-primary">Penetration Testing</h4>
                      <ul className="text-muted-foreground space-y-1">
                        <li>• XSS vulnerabilities</li>
                        <li>• SQL injection</li>
                        <li>• CSRF protection</li>
                        <li>• Command injection</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-primary">Load Testing</h4>
                      <ul className="text-muted-foreground space-y-1">
                        <li>• Performance under load</li>
                        <li>• Response time analysis</li>
                        <li>• Concurrent user handling</li>
                        <li>• Error rate monitoring</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-primary">Resilience Testing</h4>
                      <ul className="text-muted-foreground space-y-1">
                        <li>• Load capacity analysis</li>
                        <li>• DDoS protection</li>
                        <li>• Breaking point analysis</li>
                        <li>• Scalability assessment</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 flex justify-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/scan-history')}
            >
              <History className="mr-2 h-4 w-4" />
              View Scan History
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
