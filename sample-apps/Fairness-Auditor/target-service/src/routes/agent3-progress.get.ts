import Redis from 'ioredis';

/**
 * GET /agent3-progress
 *
 * SSE bridge — subscribes to the Redis `agent3:progress` channel that
 * Person C's Agent 3 publishes to, and forwards each message as a
 * Server-Sent Event.
 *
 * Browser EventSource connects to this endpoint; the widget's live-log
 * feed updates in real time as Agent 3 posts re-verification results.
 *
 * Smoke-test in isolation (before wiring the widget):
 *   docker exec afo-redis redis-cli PUBLISH agent3:progress \
 *     '{"combo":"zip_code","status":"fixed","ts":1234567890}'
 *
 * Then open http://localhost:3002/agent3-progress — you should see
 * the raw `data: {...}` line appear immediately.
 *
 * Implementation note: Nitro's defineEventHandler supports streaming
 * responses via sendStream + ReadableStream. This is compatible with
 * EventSource's `text/event-stream` contract.
 */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Content-Type', 'text/event-stream');
  setResponseHeader(event, 'Cache-Control', 'no-cache');
  setResponseHeader(event, 'Connection', 'keep-alive');
  setResponseHeader(event, 'X-Accel-Buffering', 'no');

  const subscriber = new Redis(
    process.env.REDIS_URL || 'redis://localhost:6379',
    { lazyConnect: false, enableReadyCheck: false }
  );

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send an initial comment to open the SSE connection
      controller.enqueue(encoder.encode(': connected\n\n'));

      subscriber.subscribe('agent3:progress', (err) => {
        if (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'subscribe failed' })}\n\n`));
          controller.close();
        }
      });

      subscriber.on('message', (_channel: string, message: string) => {
        controller.enqueue(encoder.encode(`data: ${message}\n\n`));
      });

      subscriber.on('error', () => {
        // Redis disconnected — send a reconnect hint and close
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'redis_disconnected' })}\n\n`));
          controller.close();
        } catch {
          // controller already closed
        }
      });
    },
    cancel() {
      subscriber.unsubscribe('agent3:progress').catch(() => {});
      subscriber.quit().catch(() => {});
    },
  });

  return sendStream(event, stream);
});
