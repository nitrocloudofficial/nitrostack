import { RateLimiterService } from '../src/services/RateLimiter.service.js';
import { PlatformType } from '../src/shared/enums/platform.enum.js';

async function testRateLimiter() {
  console.log('🧪 Testing RateLimiterService...');
  const rateLimiter = RateLimiterService.getInstance();
  let calls = 0;

  const result = await rateLimiter.executeWithRateLimit(PlatformType.GMAIL, async () => {
    calls++;
    return 'ok';
  });

  console.assert(result === 'ok', 'Rate limiter should return function execution result');
  console.assert(calls === 1, 'Function should execute exactly once');
  console.log('✅ RateLimiterService test passed!');
}

testRateLimiter().catch(err => {
  console.error('❌ RateLimiterService test failed:', err);
  process.exit(1);
});
