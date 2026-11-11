import http from 'node:http';
import zlib from 'node:zlib';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

type CapturedBody = {
  batch?: Array<{ event: string; properties?: Record<string, unknown> }>;
  event?: string;
};

describe('analytics/posthog stub capture', () => {
  const port = 19876;
  let server: http.Server;
  const captured: CapturedBody[] = [];

  beforeAll(
    () =>
      new Promise<void>((resolve) => {
        server = http.createServer((req, res) => {
          const chunks: Buffer[] = [];
          req.on('data', (c) => chunks.push(c));
          req.on('end', () => {
            let raw = Buffer.concat(chunks);
            if (req.headers['content-encoding'] === 'gzip') {
              try {
                raw = zlib.gunzipSync(raw);
              } catch {
                /* keep raw */
              }
            }
            try {
              captured.push(JSON.parse(raw.toString('utf8')) as CapturedBody);
            } catch {
              /* ignore parse errors */
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok' }));
          });
        });
        server.listen(port, '127.0.0.1', () => resolve());
      }),
  );

  afterAll(
    () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  );

  it('delivers cli_command_invoked to stub after shutdownAnalytics', async () => {
    captured.length = 0;
    process.env.NITROSTACK_POSTHOG_KEY = 'test_posthog_project_key_stub';
    process.env.NITROSTACK_POSTHOG_HOST = `http://127.0.0.1:${port}`;
    delete process.env.DO_NOT_TRACK;
    delete process.env.CI;
    delete process.env.container;

    const analytics = await import('../posthog.js');
    analytics.__resetAnalyticsModuleForTests();

    analytics.trackEvent('cli_command_invoked', { command: 'build' });
    await analytics.shutdownAnalytics();

    await new Promise((r) => setTimeout(r, 800));

    expect(captured.length).toBeGreaterThan(0);
    const batch = captured.flatMap((body) =>
      body.batch ?? (body.event ? [{ event: body.event, properties: {} }] : []),
    );
    expect(batch.some((ev) => ev.event === 'cli_command_invoked')).toBe(true);
  });
});
