import http from 'http';
import Redis from 'ioredis';

async function main() {
  console.log('[SSE Test] Connecting HTTP client to http://localhost:3002/agent3-progress ...');

  const req = http.get('http://localhost:3002/agent3-progress', (res) => {
    console.log(`[SSE Test] Connected! HTTP Status: ${res.statusCode}`);
    console.log(`[SSE Test] Headers: Content-Type=${res.headers['content-type']}`);

    res.on('data', (chunk) => {
      const text = chunk.toString();
      console.log('[SSE Test RECEIVED DATA]:\n' + text.trim());
      if (text.includes('zip_code') || text.includes('fixed')) {
        console.log('[SSE Test SUCCESS] Received expected Redis payload over SSE stream!');
        process.exit(0);
      }
    });
  });

  req.on('error', (err) => {
    console.error('[SSE Test Error]:', err.message);
    process.exit(1);
  });

  // Wait 1 second for SSE connection to establish, then publish message to Redis
  setTimeout(async () => {
    console.log('[SSE Test] Publishing message to Redis channel "agent3:progress"...');
    const publisher = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    const testPayload = JSON.stringify({
      combo: 'zip_code',
      status: 'fixed',
      ts: 1753493857
    });
    const subCount = await publisher.publish('agent3:progress', testPayload);
    console.log(`[SSE Test] Published to Redis! Receivers count: ${subCount}`);
    await publisher.quit();
  }, 1200);

  // Timeout safety
  setTimeout(() => {
    console.error('[SSE Test] Timed out waiting for SSE data');
    process.exit(1);
  }, 5000);
}

main();
