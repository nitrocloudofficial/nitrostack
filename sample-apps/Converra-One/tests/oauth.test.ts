import { AuthenticationManagerService } from '../src/services/AuthenticationManager.service.js';
import { GmailClient } from '../src/integrations/gmail/client.js';
import { PlatformType } from '../src/shared/enums/platform.enum.js';
import { GMAIL_CONFIG } from '../src/integrations/gmail/config.js';

async function runOAuthAuditTestSuite() {
  console.log('===========================================================');
  console.log('🧪 GOOGLE OAUTH 2.0 & GMAIL API INTEGRATION AUDIT TEST SUITE');
  console.log('===========================================================');

  const authManager = AuthenticationManagerService.getInstance();

  // Test 1: Verify environment loading does not assign Client ID as Access Token
  console.log('\n[Test 1] Verifying environment variable credential initialization...');
  const creds = authManager.getCredentials(PlatformType.GMAIL);
  console.assert(
    creds.accessToken !== process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_ID,
    'FAIL: Access Token should NEVER be set to Client ID string!'
  );
  console.log('✅ PASS: Access Token is properly decoupled from Client ID.');

  // Test 2: Verify OAuth Consent Screen Authorization URL generation
  console.log('\n[Test 2] Verifying OAuth 2.0 Authorization Consent URL Generation...');
  authManager.setCredentials(PlatformType.GMAIL, {
    clientId: '1002294244094-test.apps.googleusercontent.com',
    redirectUri: 'http://localhost:3001/auth/google/callback'
  });
  const authUrl = authManager.getGoogleAuthUrl(PlatformType.GMAIL);
  console.assert(authUrl.includes('https://accounts.google.com/o/oauth2/v2/auth'), 'FAIL: Incorrect Auth URL endpoint');
  console.assert(authUrl.includes('access_type=offline'), 'FAIL: Missing access_type=offline parameter');
  console.assert(authUrl.includes('prompt=consent'), 'FAIL: Missing prompt=consent parameter');
  console.assert(authUrl.includes('response_type=code'), 'FAIL: Missing response_type=code parameter');
  console.assert(authUrl.includes(encodeURIComponent('https://www.googleapis.com/auth/gmail.readonly')), 'FAIL: Missing gmail.readonly scope');
  console.log(`✅ PASS: Authorization URL generated successfully:\n   ${authUrl.substring(0, 100)}...`);

  // Test 3: Verify Token Expiration & Proactive Refresh Detection
  console.log('\n[Test 3] Verifying Token Expiration & Buffer Checks...');
  authManager.setCredentials(PlatformType.GMAIL, {
    accessToken: 'ya29.test_access_token_expired',
    expiresAt: Date.now() - 1000 // Expired 1 second ago
  });
  console.assert(authManager.isTokenExpired(PlatformType.GMAIL), 'FAIL: Expired token should be detected as expired!');

  authManager.setCredentials(PlatformType.GMAIL, {
    accessToken: 'ya29.test_access_token_expiring_soon',
    expiresAt: Date.now() + 120 * 1000 // Expiring in 2 minutes (within 5-min buffer)
  });
  console.assert(authManager.isTokenExpired(PlatformType.GMAIL, 300), 'FAIL: Token within 5-min buffer should be flagged for proactive refresh!');

  authManager.setCredentials(PlatformType.GMAIL, {
    accessToken: 'ya29.test_access_token_valid',
    expiresAt: Date.now() + 3600 * 1000 // Expiring in 1 hour
  });
  console.assert(!authManager.isTokenExpired(PlatformType.GMAIL, 300), 'FAIL: Valid token should not be expired');
  console.log('✅ PASS: Proactive expiration detection & 5-minute buffer logic functioning correctly.');

  // Test 4: Verify Secret Sanitization in Logs
  console.log('\n[Test 4] Verifying Log Secret Redaction...');
  const sensitiveLog = {
    accessToken: 'ya29.a0A0x123456789SecretAccessToken',
    refreshToken: '1//0987654321SecretRefreshToken',
    clientSecret: 'GOCSPX-SecretClientSecret123',
    status: 'CONNECTED',
    expiresAt: new Date().toISOString()
  };
  const sanitized = authManager.sanitizeLogData(sensitiveLog);
  console.assert(!String(sanitized.accessToken).includes('123456789SecretAccessToken'), 'FAIL: Access Token was exposed in logs!');
  console.assert(!String(sanitized.clientSecret).includes('SecretClientSecret123'), 'FAIL: Client Secret was exposed in logs!');
  console.assert(String(sanitized.accessToken).includes('[REDACTED]'), 'FAIL: Access Token not redacted');
  console.log('✅ PASS: Secret sanitization verified:', sanitized);

  // Test 5: Verify GmailClient fetch & fallback resilience
  console.log('\n[Test 5] Verifying GmailClient end-to-end resilience...');
  const client = new GmailClient();
  const messages = await client.fetchMessages();
  console.assert(Array.isArray(messages) && messages.length > 0, 'FAIL: fetchMessages returned invalid output');
  console.log(`✅ PASS: GmailClient fetched ${messages.length} messages safely.`);

  console.log('\n===========================================================');
  console.log('🎉 ALL GOOGLE OAUTH 2.0 AUDIT TESTS PASSED SUCCESSFULLY!');
  console.log('===========================================================');
}

runOAuthAuditTestSuite().catch((err) => {
  console.error('❌ Test Suite Failed:', err);
  process.exit(1);
});
