import type { Logger } from '../types'
import { PostHogMetrics } from './index'
import type { OtlpMetric, OtlpMetricsPayload, ResolvedPostHogMetricsConfig, SendMetricsBatchOutcome } from './types'

const DEFAULT_FLUSH_INTERVAL_MS = 10000
const DEFAULT_MAX_SERIES_PER_FLUSH = 1000

const resolveForTest = (partial?: Partial<ResolvedPostHogMetricsConfig>): ResolvedPostHogMetricsConfig => ({
  ...partial,
  flushIntervalMs: partial?.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS,
  maxSeriesPerFlush: partial?.maxSeriesPerFlush ?? DEFAULT_MAX_SERIES_PER_FLUSH,
})

const createMockInstance = (overrides: Record<string, any> = {}): any => ({
  isDisabled: false,
  optedOut: false,
  getLibraryId: jest.fn(() => 'posthog-core-tests'),
  getLibraryVersion: jest.fn(() => '0.0.0-test'),
  _sendMetricsBatch: jest.fn((): Promise<SendMetricsBatchOutcome> => Promise.resolve({ kind: 'ok' })),
  ...overrides,
})

const createMockLogger = (): Logger => {
  const logger: any = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    critical: jest.fn(),
  }
  logger.createLogger = jest.fn(() => logger)
  return logger as Logger
}

describe('PostHogMetrics', () => {
  let mockInstance: any
  let logger: Logger

  const createMetrics = (config?: Partial<ResolvedPostHogMetricsConfig>, instance?: any): PostHogMetrics => {
    return new PostHogMetrics(instance ?? mockInstance, resolveForTest(config), logger)
  }

  const sentPayloads = (instance?: any): OtlpMetricsPayload[] =>
    (instance ?? mockInstance)._sendMetricsBatch.mock.calls.map((c: any[]) => c[0])

  const sentMetrics = (instance?: any): OtlpMetric[] =>
    sentPayloads(instance).flatMap((p) => p.resourceMetrics[0].scopeMetrics[0].metrics)

  beforeEach(() => {
    jest.useFakeTimers()
    mockInstance = createMockInstance()
    logger = createMockLogger()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('aggregation semantics', () => {
    it('sums count samples for the same series into one delta data point', async () => {
      const metrics = createMetrics()
      metrics.count('orders_created', 1)
      metrics.count('orders_created', 1)
      metrics.count('orders_created', 3)
      await metrics.flush()

      const sent = sentMetrics()
      expect(sent).toHaveLength(1)
      expect(sent[0].name).toBe('orders_created')
      expect(sent[0].sum).toMatchObject({ aggregationTemporality: 1, isMonotonic: true })
      expect(sent[0].sum!.dataPoints).toHaveLength(1)
      expect(sent[0].sum!.dataPoints[0].asDouble).toBe(5)
    })

    it('defaults count value to 1', async () => {
      const metrics = createMetrics()
      metrics.count('clicks')
      metrics.count('clicks')
      await metrics.flush()

      expect(sentMetrics()[0].sum!.dataPoints[0].asDouble).toBe(2)
    })

    it('keeps only the last gauge value per series per window', async () => {
      const metrics = createMetrics()
      metrics.gauge('active_connections', 42)
      metrics.gauge('active_connections', 17)
      await metrics.flush()

      const sent = sentMetrics()
      expect(sent).toHaveLength(1)
      expect(sent[0].gauge!.dataPoints).toHaveLength(1)
      expect(sent[0].gauge!.dataPoints[0].asDouble).toBe(17)
    })

    it('accumulates histogram observations into count/sum/min/max and buckets', async () => {
      const metrics = createMetrics()
      metrics.histogram('api_latency', 10, { unit: 'ms' })
      metrics.histogram('api_latency', 20, { unit: 'ms' })
      metrics.histogram('api_latency', 30, { unit: 'ms' })
      await metrics.flush()

      const sent = sentMetrics()
      expect(sent).toHaveLength(1)
      expect(sent[0].unit).toBe('ms')
      const dp = sent[0].histogram!.dataPoints[0]
      expect(dp.count).toBe(3)
      expect(dp.sum).toBe(60)
      expect(dp.min).toBe(10)
      expect(dp.max).toBe(30)
      expect(dp.explicitBounds.length).toBeGreaterThan(0)
      expect(dp.bucketCounts).toHaveLength(dp.explicitBounds.length + 1)
      expect(dp.bucketCounts.reduce((a, b) => a + b, 0)).toBe(3)
      expect(sent[0].histogram!.aggregationTemporality).toBe(1)
    })

    it('places histogram observations in the correct buckets', async () => {
      const metrics = createMetrics()
      // Default OTel bounds start [0, 5, 10, 25, ...]: -1 → bucket 0 (≤0),
      // 3 → bucket 1 (≤5), 10 → bucket 2 (≤10), 1e9 → overflow bucket.
      metrics.histogram('x', -1)
      metrics.histogram('x', 3)
      metrics.histogram('x', 10)
      metrics.histogram('x', 1e9)
      await metrics.flush()

      const dp = sentMetrics()[0].histogram!.dataPoints[0]
      expect(dp.bucketCounts[0]).toBe(1)
      expect(dp.bucketCounts[1]).toBe(1)
      expect(dp.bucketCounts[2]).toBe(1)
      expect(dp.bucketCounts[dp.bucketCounts.length - 1]).toBe(1)
    })

    it('splits series by attribute values but merges identical attribute sets regardless of key order', async () => {
      const metrics = createMetrics()
      metrics.count('api_calls', 1, { attributes: { route: '/home', plan: 'free' } })
      metrics.count('api_calls', 1, { attributes: { plan: 'free', route: '/home' } })
      metrics.count('api_calls', 1, { attributes: { route: '/checkout', plan: 'free' } })
      await metrics.flush()

      const sent = sentMetrics()
      expect(sent).toHaveLength(1)
      expect(sent[0].sum!.dataPoints).toHaveLength(2)
      const values = sent[0].sum!.dataPoints.map((dp) => dp.asDouble).sort()
      expect(values).toEqual([1, 2])
    })

    it('emits separate metric entries for the same name with different types or units', async () => {
      const metrics = createMetrics()
      metrics.count('throughput', 1)
      metrics.gauge('throughput', 5)
      metrics.histogram('size', 1, { unit: 'byte' })
      metrics.histogram('size', 1, { unit: 'kilobyte' })
      await metrics.flush()

      const sent = sentMetrics()
      expect(sent).toHaveLength(4)
      const throughput = sent.filter((m) => m.name === 'throughput')
      expect(throughput.some((m) => m.sum)).toBe(true)
      expect(throughput.some((m) => m.gauge)).toBe(true)
      const sizes = sent.filter((m) => m.name === 'size')
      expect(sizes.map((m) => m.unit).sort()).toEqual(['byte', 'kilobyte'])
    })

    it('encodes attributes as OTLP key-value pairs on the data point', async () => {
      const metrics = createMetrics()
      metrics.count('api_calls', 1, { attributes: { route: '/home', retries: 2, cached: true } })
      await metrics.flush()

      const attrs = sentMetrics()[0].sum!.dataPoints[0].attributes
      expect(attrs).toContainEqual({ key: 'route', value: { stringValue: '/home' } })
      expect(attrs).toContainEqual({ key: 'retries', value: { intValue: 2 } })
      expect(attrs).toContainEqual({ key: 'cached', value: { boolValue: true } })
    })

    it('stamps delta data points with a window: startTimeUnixNano <= timeUnixNano, both nano strings', async () => {
      const metrics = createMetrics()
      metrics.count('orders_created', 1)
      jest.advanceTimersByTime(2000)
      await metrics.flush()

      const dp = sentMetrics()[0].sum!.dataPoints[0]
      expect(dp.timeUnixNano).toMatch(/^\d+$/)
      expect(dp.startTimeUnixNano).toMatch(/^\d+$/)
      expect(BigInt(dp.startTimeUnixNano!)).toBeLessThanOrEqual(BigInt(dp.timeUnixNano))
    })
  })

  describe('resource attributes', () => {
    it('attaches service.name, sdk identity, and user resource attributes', async () => {
      const metrics = createMetrics({
        serviceName: 'checkout-web',
        environment: 'production',
        resourceAttributes: { 'k8s.pod': 'web-1' },
      })
      metrics.count('orders_created', 1)
      await metrics.flush()

      const payload = sentPayloads()[0]
      const resourceAttrs = payload.resourceMetrics[0].resource.attributes
      expect(resourceAttrs).toContainEqual({ key: 'service.name', value: { stringValue: 'checkout-web' } })
      expect(resourceAttrs).toContainEqual({ key: 'deployment.environment', value: { stringValue: 'production' } })
      expect(resourceAttrs).toContainEqual({ key: 'k8s.pod', value: { stringValue: 'web-1' } })
      expect(resourceAttrs).toContainEqual({ key: 'telemetry.sdk.name', value: { stringValue: 'posthog-core-tests' } })
      expect(payload.resourceMetrics[0].scopeMetrics[0].scope).toEqual({
        name: 'posthog-core-tests',
        version: '0.0.0-test',
      })
    })

    it('falls back to unknown_service and never lets resourceAttributes clobber service.name', async () => {
      const metrics = createMetrics({ resourceAttributes: { 'service.name': 'spoofed' } })
      metrics.count('x', 1)
      await metrics.flush()

      const resourceAttrs = sentPayloads()[0].resourceMetrics[0].resource.attributes
      expect(resourceAttrs).toContainEqual({ key: 'service.name', value: { stringValue: 'unknown_service' } })
      expect(resourceAttrs.filter((kv) => kv.key === 'service.name')).toHaveLength(1)
    })
  })

  describe('flush behavior', () => {
    it('sends nothing until the flush interval elapses, then sends the window once', async () => {
      const metrics = createMetrics({ flushIntervalMs: 5000 })
      metrics.count('orders_created', 1)
      expect(mockInstance._sendMetricsBatch).not.toHaveBeenCalled()

      await jest.advanceTimersByTimeAsync(5000)
      expect(mockInstance._sendMetricsBatch).toHaveBeenCalledTimes(1)
    })

    it('does not send when the window is empty', async () => {
      createMetrics({ flushIntervalMs: 5000 })
      await jest.advanceTimersByTimeAsync(15000)
      expect(mockInstance._sendMetricsBatch).not.toHaveBeenCalled()

      const metrics = createMetrics()
      await metrics.flush()
      expect(mockInstance._sendMetricsBatch).not.toHaveBeenCalled()
    })

    it('resets the window after a successful flush — values do not leak into the next one', async () => {
      const metrics = createMetrics()
      metrics.count('orders_created', 5)
      await metrics.flush()
      metrics.count('orders_created', 2)
      await metrics.flush()

      const payloads = sentPayloads()
      expect(payloads).toHaveLength(2)
      expect(payloads[1].resourceMetrics[0].scopeMetrics[0].metrics[0].sum!.dataPoints[0].asDouble).toBe(2)
    })

    it('retains the window and merges with new samples when the send says retry-later', async () => {
      mockInstance._sendMetricsBatch
        .mockResolvedValueOnce({ kind: 'retry-later', error: new Error('offline') })
        .mockResolvedValue({ kind: 'ok' })

      const metrics = createMetrics()
      metrics.count('orders_created', 5)
      await metrics.flush()
      metrics.count('orders_created', 2)
      await metrics.flush()

      const payloads = sentPayloads()
      expect(payloads).toHaveLength(2)
      expect(payloads[1].resourceMetrics[0].scopeMetrics[0].metrics[0].sum!.dataPoints[0].asDouble).toBe(7)
    })

    it('drops the window on a fatal send outcome', async () => {
      mockInstance._sendMetricsBatch
        .mockResolvedValueOnce({ kind: 'fatal', error: new Error('bad key') })
        .mockResolvedValue({ kind: 'ok' })

      const metrics = createMetrics()
      metrics.count('orders_created', 5)
      await metrics.flush()
      metrics.count('orders_created', 2)
      await metrics.flush()

      expect(sentPayloads()[1].resourceMetrics[0].scopeMetrics[0].metrics[0].sum!.dataPoints[0].asDouble).toBe(2)
    })

    it('keeps flushing on the interval', async () => {
      const metrics = createMetrics({ flushIntervalMs: 5000 })
      metrics.count('a', 1)
      await jest.advanceTimersByTimeAsync(5000)
      metrics.count('a', 1)
      await jest.advanceTimersByTimeAsync(5000)
      expect(mockInstance._sendMetricsBatch).toHaveBeenCalledTimes(2)
    })

    it('stops the timer and clears state on reset', async () => {
      const metrics = createMetrics({ flushIntervalMs: 5000 })
      metrics.count('a', 1)
      metrics.reset()
      await jest.advanceTimersByTimeAsync(20000)
      expect(mockInstance._sendMetricsBatch).not.toHaveBeenCalled()
    })

    it('drainWindow returns the built payload synchronously and resets the window', async () => {
      const metrics = createMetrics()
      metrics.count('orders_created', 3)

      const payload = metrics.drainWindow()
      expect(payload!.resourceMetrics[0].scopeMetrics[0].metrics[0].sum!.dataPoints[0].asDouble).toBe(3)

      // The window was consumed: nothing left for the regular flush.
      await metrics.flush()
      expect(mockInstance._sendMetricsBatch).not.toHaveBeenCalled()
    })

    it('retries a merged-back window on the next interval even with no new samples', async () => {
      mockInstance._sendMetricsBatch
        .mockResolvedValueOnce({ kind: 'retry-later', error: new Error('offline') })
        .mockResolvedValue({ kind: 'ok' })

      const metrics = createMetrics({ flushIntervalMs: 5000 })
      metrics.count('orders_created', 5)
      await jest.advanceTimersByTimeAsync(5000)
      expect(mockInstance._sendMetricsBatch).toHaveBeenCalledTimes(1)

      // No new captures — the retained window must not be stranded until shutdown.
      await jest.advanceTimersByTimeAsync(5000)
      expect(mockInstance._sendMetricsBatch).toHaveBeenCalledTimes(2)
      const payload: OtlpMetricsPayload = mockInstance._sendMetricsBatch.mock.calls[1][0]
      expect(payload.resourceMetrics[0].scopeMetrics[0].metrics[0].sum!.dataPoints[0].asDouble).toBe(5)
    })

    it('drainWindow returns null when the window is empty', () => {
      const metrics = createMetrics()
      expect(metrics.drainWindow()).toBeNull()
    })
  })

  describe('guardrails and filtering', () => {
    it('caps distinct series per window and warns once', async () => {
      const metrics = createMetrics({ maxSeriesPerFlush: 2 })
      metrics.count('a', 1)
      metrics.count('b', 1)
      metrics.count('c', 1)
      metrics.count('d', 1)
      metrics.count('a', 1) // existing series still aggregates
      await metrics.flush()

      const sent = sentMetrics()
      expect(sent.map((m) => m.name).sort()).toEqual(['a', 'b'])
      expect(sent.find((m) => m.name === 'a')!.sum!.dataPoints[0].asDouble).toBe(2)
      expect((logger.warn as jest.Mock).mock.calls.length).toBe(1)
    })

    it('re-applies the series cap when merging a failed window back', async () => {
      let resolveSend!: (outcome: SendMetricsBatchOutcome) => void
      mockInstance._sendMetricsBatch
        .mockImplementationOnce(() => new Promise<SendMetricsBatchOutcome>((resolve) => (resolveSend = resolve)))
        .mockResolvedValue({ kind: 'ok' })

      const metrics = createMetrics({ maxSeriesPerFlush: 2 })
      metrics.count('a', 1)
      metrics.count('b', 1)
      const inflight = metrics.flush()
      // New series captured while the failing send is in flight fill the fresh window to the cap.
      metrics.count('c', 1)
      metrics.count('d', 1)
      resolveSend({ kind: 'retry-later', error: new Error('offline') })
      await inflight

      await metrics.flush()

      const payloads = sentPayloads()
      expect(payloads).toHaveLength(2)
      const dataPointCount = payloads[1].resourceMetrics[0].scopeMetrics[0].metrics.reduce(
        (n, m) => n + (m.sum?.dataPoints.length ?? 0),
        0
      )
      expect(dataPointCount).toBeLessThanOrEqual(2)
      expect((logger.warn as jest.Mock).mock.calls.some((c) => String(c[0]).includes('series cap'))).toBe(true)
    })

    it('drops non-finite values and negative counts', async () => {
      const metrics = createMetrics()
      metrics.count('a', NaN)
      metrics.count('a', Infinity)
      metrics.count('a', -1)
      metrics.gauge('b', NaN)
      metrics.histogram('c', -Infinity)
      metrics.gauge('b', -5) // negative gauge is valid
      await metrics.flush()

      const sent = sentMetrics()
      expect(sent).toHaveLength(1)
      expect(sent[0].name).toBe('b')
      expect(sent[0].gauge!.dataPoints[0].asDouble).toBe(-5)
    })

    it('drops samples with unserializable attributes instead of throwing', async () => {
      const metrics = createMetrics()
      const throwingAttrs = {}
      Object.defineProperty(throwingAttrs, 'bad', {
        enumerable: true,
        get() {
          throw new Error('boom')
        },
      })

      expect(() => metrics.count('good', 1, { attributes: { plan: 'free' } })).not.toThrow()
      expect(() => metrics.count('bigint_attr', 1, { attributes: { jobId: BigInt(1) } as any })).not.toThrow()
      expect(() => metrics.count('throwing_attr', 1, { attributes: throwingAttrs as any })).not.toThrow()
      await metrics.flush()

      // Only the well-formed sample ships; the malformed ones are dropped with a warning.
      expect(sentMetrics().map((m) => m.name)).toEqual(['good'])
      const attrWarns = (logger.warn as jest.Mock).mock.calls.filter((c) => String(c[0]).includes('attributes'))
      expect(attrWarns).toHaveLength(2)
    })

    it('drops samples with an empty name', async () => {
      const metrics = createMetrics()
      metrics.count('', 1)
      await metrics.flush()
      expect(mockInstance._sendMetricsBatch).not.toHaveBeenCalled()
    })

    it('applies beforeSend: transform, chain, drop, and throw', async () => {
      const metrics = createMetrics({
        beforeSend: [
          (m) => (m.name === 'dropped' ? null : m),
          (m) => ({ ...m, attributes: { ...m.attributes, processed: true } }),
        ],
      })
      metrics.count('kept', 1)
      metrics.count('dropped', 1)
      await metrics.flush()

      const sent = sentMetrics()
      expect(sent).toHaveLength(1)
      expect(sent[0].name).toBe('kept')
      expect(sent[0].sum!.dataPoints[0].attributes).toContainEqual({
        key: 'processed',
        value: { boolValue: true },
      })
    })

    it('snapshots attributes at capture time — later caller mutation cannot corrupt the series', async () => {
      const metrics = createMetrics()
      const attributes = { plan: 'free' }
      metrics.count('api_calls', 1, { attributes })
      attributes.plan = 'pro'
      metrics.count('api_calls', 1, { attributes })
      await metrics.flush()

      const sent = sentMetrics()
      expect(sent[0].sum!.dataPoints).toHaveLength(2)
      const values = sent[0].sum!.dataPoints.map((dp) => dp.attributes.find((a) => a.key === 'plan')!.value.stringValue)
      expect(values.sort()).toEqual(['free', 'pro'])
    })

    it('warns once when a metric name is reused with a different type, but keeps both series', async () => {
      const metrics = createMetrics()
      metrics.count('throughput', 5)
      metrics.gauge('throughput', 42)
      metrics.gauge('throughput', 43)
      await metrics.flush()

      // Both series still ship — the warning is a dev-time hint, not a drop.
      const sent = sentMetrics()
      expect(sent.some((m) => m.sum)).toBe(true)
      expect(sent.some((m) => m.gauge)).toBe(true)
      const typeWarns = (logger.warn as jest.Mock).mock.calls.filter((c) => String(c[0]).includes('already used'))
      expect(typeWarns).toHaveLength(1)
    })

    it('drops counts made negative by beforeSend', async () => {
      const metrics = createMetrics({
        beforeSend: (m) => ({ ...m, value: -5 }),
      })
      metrics.count('a', 1)
      await metrics.flush()
      expect(mockInstance._sendMetricsBatch).not.toHaveBeenCalled()
    })

    it('drops the sample when beforeSend throws', async () => {
      const metrics = createMetrics({
        beforeSend: () => {
          throw new Error('boom')
        },
      })
      metrics.count('a', 1)
      await metrics.flush()
      expect(mockInstance._sendMetricsBatch).not.toHaveBeenCalled()
    })

    it('no-ops when the host is disabled or opted out', async () => {
      const disabledInstance = createMockInstance({ isDisabled: true })
      const disabled = createMetrics({}, disabledInstance)
      disabled.count('a', 1)
      await disabled.flush()

      const optedOutInstance = createMockInstance({ optedOut: true })
      const optedOut = createMetrics({}, optedOutInstance)
      optedOut.count('a', 1)
      await optedOut.flush()

      expect(disabledInstance._sendMetricsBatch).not.toHaveBeenCalled()
      expect(optedOutInstance._sendMetricsBatch).not.toHaveBeenCalled()
    })
  })
})
