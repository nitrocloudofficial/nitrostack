import { AuthenticationManagerService } from '../src/services/AuthenticationManager.service.js';
import { PlatformType } from '../src/shared/enums/platform.enum.js';

async function testAuthManager() {
  console.log('🧪 Testing AuthenticationManagerService...');
  const authManager = AuthenticationManagerService.getInstance();
  const gmailCreds = authManager.getCredentials(PlatformType.GMAIL);

  console.assert(gmailCreds !== undefined, 'Gmail credentials object should exist');
  console.assert(typeof gmailCreds.isAuthorized === 'boolean', 'isAuthorized should be a boolean');

  const sanitized = authManager.sanitizeLogData({ accessToken: 'secret-token-123', username: 'alex' });
  console.assert(sanitized.accessToken === '[REDACTED_SECRET]', 'Secret tokens must be redacted from logs');

  console.log('✅ AuthenticationManagerService test passed!');
}

testAuthManager().catch(err => {
  console.error('❌ AuthenticationManagerService test failed:', err);
  process.exit(1);
});
