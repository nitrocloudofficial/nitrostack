import { ApiClient } from '@/utils/api';

export interface WebsiteVulnerability {
  type: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  title: string;
  description: string;
  recommendation: string;
  evidence?: string;
}

export interface WebsiteScanResult {
  _id: string;
  userId: number;
  url: string;
  scanDate: string;
  vulnerabilities: WebsiteVulnerability[];
  securityScore: number;
  headers: Record<string, string>;
  technologies: string[];
  ssl: {
    valid: boolean;
    issuer?: string;
    validFrom?: string;
    validTo?: string;
    protocol?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface VerifiedDomain {
  _id: string;
  domain: string;
  verificationToken: string;
  verificationMethod: 'file' | 'dns' | 'meta';
  verified: boolean;
  verifiedAt?: string;
  createdAt: string;
}

export interface VerificationInstructions {
  domain: string;
  token: string;
  method: 'file' | 'dns' | 'meta';
  instructions: string;
}

export interface PenetrationTestResult {
  testName: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  vulnerable: boolean;
  description: string;
  evidence?: string;
  payload?: string;
  recommendation: string;
}

export interface PenetrationTestReport {
  url: string;
  testDate: string;
  testsPerformed: number;
  vulnerabilitiesFound: number;
  results: PenetrationTestResult[];
  riskScore: number;
}

export const websiteScanService = {
  async scanWebsite(url: string): Promise<WebsiteScanResult> {
    return ApiClient.post('/api/website-scan/scan', { url });
  },

  async getScanHistory(url?: string): Promise<WebsiteScanResult[]> {
    const endpoint = url ? `/api/website-scan/history?url=${encodeURIComponent(url)}` : '/api/website-scan/history';
    return ApiClient.get(endpoint);
  },

  async getScanById(scanId: string): Promise<WebsiteScanResult> {
    return ApiClient.get(`/api/website-scan/${scanId}`);
  },

  async deleteScan(scanId: string): Promise<void> {
    return ApiClient.delete(`/api/website-scan/${scanId}`);
  },

  // Domain Verification Methods

  async initiateVerification(domain: string, method: 'file' | 'dns' | 'meta'): Promise<VerificationInstructions> {
    return ApiClient.post('/api/website-scan/verify/initiate', { domain, method });
  },

  async verifyDomain(domain: string): Promise<{ success: boolean; message: string; domain: string }> {
    return ApiClient.post('/api/website-scan/verify/check', { domain });
  },

  async getVerifiedDomains(): Promise<VerifiedDomain[]> {
    return ApiClient.get('/api/website-scan/verify/domains');
  },

  async checkDomainVerification(url: string): Promise<{ domain: string; verified: boolean }> {
    return ApiClient.get(`/api/website-scan/verify/status?url=${encodeURIComponent(url)}`);
  },

  async deleteDomain(domain: string): Promise<void> {
    return ApiClient.delete(`/api/website-scan/verify/domains/${encodeURIComponent(domain)}`);
  },

  async addOwnedDomain(domain: string): Promise<{ success: boolean; message: string; domain: string }> {
    return ApiClient.post('/api/website-scan/verify/add-owned', { domain });
  },

  // Penetration Testing

  async performPenetrationTest(url: string): Promise<PenetrationTestReport> {
    return ApiClient.post('/api/website-scan/pentest', { url });
  },

  async penetrationTest(url: string) {
    return ApiClient.post('/api/website-scan/pentest', { url });
  },

  async loadTest(url: string, config: { duration?: number; concurrentUsers?: number; requestsPerSecond?: number }) {
    return ApiClient.post('/api/website-scan/loadtest', { 
      url,
      duration: config.duration || 30,
      concurrentUsers: config.concurrentUsers || 10,
      requestsPerSecond: config.requestsPerSecond || 10
    });
  },

  async testResilience(url: string) {
    return ApiClient.post('/api/website-scan/test-resilience', { url });
  },

  async getApiHealth() {
    return ApiClient.get('/api/website-scan/api-health');
  },

  async resetApiKeys() {
    return ApiClient.post('/api/website-scan/api-reset');
  },
};
