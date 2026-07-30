import type {
  CaptureMetricOptions,
  MetricAttributes,
  MetricSample,
  MetricType,
  OtlpHistogramDataPoint,
  OtlpMetric,
  OtlpMetricsPayload,
  OtlpNumberDataPoint,
} from '@posthog/types'
import type { Logger } from '../types'
import { isArray, safeSetTimeout } from '../utils'
import { toOtlpKeyValueList } from '../logs/logs-utils'
import {
  DEFAULT_HISTOGRAM_BOUNDS,
  bucketIndexFor,
  buildMetricsResourceAttributes,
  buildOtlpMetricsPayload,
  msToUnixNano,
  seriesKey,
} from './metrics-utils'
import type { MetricsHost, ResolvedPostHogMetricsConfig } from './types'

const OTLP_TEMPORALITY_DELTA = 1

interface HistogramState {
  count: number
  sum: number
  min: number
  max: number
  bucketCounts: number[]
}

/**
 * One aggregated series within the current flush window. Exactly one of
 * `total` (count), `last` (gauge), or `hist` is populated, matching `type`.
 */
interface SeriesState {
  name: string
  type: MetricType
  unit?: string
  attributes?: MetricAttributes
  windowStartMs: number
  total?: number
  last?: number
  hist?: HistogramState
}

/**
 * Statsd-style pre-aggregating metrics client.
 *
 * Samples are folded into per-series aggregates in memory (counts sum,
 * gauges keep the last value, histograms accumulate buckets) and flushed as
 * one OTLP data point per series per window — a burst of 10k `count()` calls
 * costs one data point on the wire. Sums and histograms use delta
 * temporality, so each data point stands alone and client restarts need no
 * cross-window state.
 *
 * Deliberately unlike logs, no per-user context (distinct ID, session ID) is
 * attached: every attribute value creates a new series, and per-user series
 * are the canonical metrics-cardinality explosion.
 */
export class PostHogMetrics {
  private _series = new Map<string, SeriesState>()
  private _flushTimer?: ReturnType<typeof safeSetTimeout>
  // Serializes flushes — a manual flush() during an in-flight timer flush
  // queues behind it instead of racing it for the same window.
  private _flushPromise: Promise<void> | null = null
  // One cardinality warning per window, however many series get dropped.
  private _seriesCapWarned = false
  // Type seen per metric name this window; reusing a name with a different
  // type gets a one-time dev hint. The read path queries by name, so mixing
  // types under one name produces charts that blend both series.
  private _typeByName = new Map<string, MetricType>()
  private _typeCollisionWarned = new Set<string>()
  // Bumped by reset(). A flush that was in flight when reset() ran (e.g. it
  // lost a shutdown race) sees a stale generation when its send settles and
  // discards its window instead of merging it back and re-arming the timer.
  private _generation = 0

  constructor(
    private readonly _instance: MetricsHost,
    private readonly _config: ResolvedPostHogMetricsConfig,
    private readonly _logger: Logger
  ) {}

  count(name: string, value: number = 1, options?: CaptureMetricOptions): void {
    this._capture({ name, type: 'count', value, unit: options?.unit, attributes: options?.attributes })
  }

  gauge(name: string, value: number, options?: CaptureMetricOptions): void {
    this._capture({ name, type: 'gauge', value, unit: options?.unit, attributes: options?.attributes })
  }

  histogram(name: string, value: number, options?: CaptureMetricOptions): void {
    this._capture({ name, type: 'histogram', value, unit: options?.unit, attributes: options?.attributes })
  }

  /** Sends everything aggregated so far without waiting for the flush interval. */
  flush(): Promise<void> {
    const prev = this._flushPromise
    const run = async (): Promise<void> => {
      if (prev) {
        await prev.catch(() => {})
      }
      await this._doFlush()
    }
    const p = run().finally(() => {
      if (this._flushPromise === p) {
        this._flushPromise = null
      }
    })
    this._flushPromise = p
    return p
  }

  /**
   * Synchronously snapshots the current window into an OTLP payload and
   * resets it, bypassing the flush serializer entirely — for unload-time
   * drains where the host must hand the payload to a synchronous transport
   * (sendBeacon) in the same tick. Returns `null` when there is nothing to
   * send. The caller owns delivery; there is no retry for a drained window.
   */
  drainWindow(): OtlpMetricsPayload | null {
    if (this._series.size === 0) {
      return null
    }
    const window = this._series
    this._series = new Map()
    this._seriesCapWarned = false
    this._typeByName = new Map()
    this._typeCollisionWarned = new Set()
    return this._buildPayload(window)
  }

  /** Clears the flush timer, drops the current window, and invalidates in-flight flushes. */
  reset(): void {
    this._generation++
    this._clearFlushTimer()
    this._series = new Map()
    this._flushPromise = null
    this._seriesCapWarned = false
    this._typeByName = new Map()
    this._typeCollisionWarned = new Set()
  }

  private _capture(sample: MetricSample): void {
    if (this._instance.isDisabled || this._instance.optedOut) {
      return
    }

    const filtered = this._runBeforeSend(sample)
    if (filtered === null) {
      return
    }

    if (!filtered.name || typeof filtered.name !== 'string') {
      this._logger.warn('Dropping metric with empty name')
      return
    }
    if (typeof filtered.value !== 'number' || !Number.isFinite(filtered.value)) {
      this._logger.warn(`Dropping metric '${filtered.name}': value must be a finite number`)
      return
    }
    // Checked after beforeSend so a hook can't turn a count negative either.
    if (filtered.type === 'count' && filtered.value < 0) {
      this._logger.warn(`Dropping count '${filtered.name}': counters are monotonic, value must be >= 0`)
      return
    }

    // Snapshot: the key is computed from these values, so a caller mutating
    // the object after capture must not change the stored series. Reading and
    // serializing the attributes can throw (BigInt values, throwing
    // getters/proxies) — a malformed sample is dropped, never thrown.
    let attributes: MetricAttributes | undefined
    let key: string
    try {
      attributes = filtered.attributes ? { ...filtered.attributes } : undefined
      key = seriesKey(filtered.type, filtered.name, filtered.unit, attributes)
    } catch (e) {
      this._logger.warn(`Dropping metric '${filtered.name}': attributes could not be serialized`, e)
      return
    }

    let state = this._series.get(key)
    if (!state) {
      if (!this._admitNewSeries()) {
        return
      }
      state = {
        name: filtered.name,
        type: filtered.type,
        unit: filtered.unit,
        attributes,
        windowStartMs: Date.now(),
      }
      this._series.set(key, state)
    }

    // Bookkeeping only for admitted samples, so name-cardinality misuse (IDs
    // interpolated into metric names) can't grow this map past the series cap.
    const seenType = this._typeByName.get(filtered.name)
    if (seenType === undefined) {
      this._typeByName.set(filtered.name, filtered.type)
    } else if (seenType !== filtered.type && !this._typeCollisionWarned.has(filtered.name)) {
      this._typeCollisionWarned.add(filtered.name)
      this._logger.warn(
        `Metric name '${filtered.name}' is already used as a ${seenType}; ` +
          `recording it as a ${filtered.type} too will blend both series in charts. Use a distinct name.`
      )
    }

    this._fold(state, filtered.value)
    this._armFlushTimer()
  }

  /**
   * Cardinality gate for adding a series to the live window — warns once per
   * window when the cap is hit. Applied on capture and on merge-back alike.
   */
  private _admitNewSeries(): boolean {
    if (this._series.size < this._config.maxSeriesPerFlush) {
      return true
    }
    if (!this._seriesCapWarned) {
      this._seriesCapWarned = true
      this._logger.warn(
        `Metric series cap reached (${this._config.maxSeriesPerFlush} per flush window); ` +
          `dropping new series until the next flush. Reduce attribute cardinality.`
      )
    }
    return false
  }

  private _fold(state: SeriesState, value: number): void {
    switch (state.type) {
      case 'count':
        state.total = (state.total ?? 0) + value
        break
      case 'gauge':
        state.last = value
        break
      case 'histogram': {
        if (!state.hist) {
          state.hist = {
            count: 0,
            sum: 0,
            min: value,
            max: value,
            bucketCounts: new Array(DEFAULT_HISTOGRAM_BOUNDS.length + 1).fill(0),
          }
        }
        const hist = state.hist
        hist.count += 1
        hist.sum += value
        hist.min = Math.min(hist.min, value)
        hist.max = Math.max(hist.max, value)
        hist.bucketCounts[bucketIndexFor(value, DEFAULT_HISTOGRAM_BOUNDS)] += 1
        break
      }
    }
  }

  private _runBeforeSend(sample: MetricSample): MetricSample | null {
    const beforeSend = this._config.beforeSend
    if (!beforeSend) {
      return sample
    }
    const fns = isArray(beforeSend) ? beforeSend : [beforeSend]
    let result: MetricSample = sample
    for (const fn of fns) {
      try {
        const next = fn(result)
        if (!next) {
          this._logger.info(`Metric was rejected in beforeSend function`)
          return null
        }
        result = next
      } catch (e) {
        this._logger.error(`Error in beforeSend function for metric:`, e)
        return null
      }
    }
    return result
  }

  private _armFlushTimer(): void {
    if (this._flushTimer) {
      return
    }
    this._flushTimer = safeSetTimeout(() => {
      this._flushTimer = undefined
      this.flush().catch((e) => {
        this._logger.error('Metrics flush failed:', e)
      })
    }, this._config.flushIntervalMs)
  }

  private _clearFlushTimer(): void {
    if (this._flushTimer) {
      clearTimeout(this._flushTimer)
      this._flushTimer = undefined
    }
  }

  private async _doFlush(): Promise<void> {
    if (this._series.size === 0) {
      return
    }

    // Snapshot and reset the window; samples captured while the send is in
    // flight fold into a fresh window instead of the one being sent.
    const window = this._series
    this._series = new Map()
    this._seriesCapWarned = false
    this._typeByName = new Map()
    this._typeCollisionWarned = new Set()

    const generation = this._generation
    const outcome = await this._instance._sendMetricsBatch(this._buildPayload(window))
    if (generation !== this._generation) {
      // reset() ran while the send was in flight — the client was torn down or
      // reconfigured, so this window is dropped whatever the outcome was.
      return
    }
    switch (outcome.kind) {
      case 'ok':
        return
      case 'retry-later':
        // Transient failure: merge the unsent window back so the data rides
        // the next flush instead of being lost — and re-arm the timer, since
        // with no new captures nothing else would schedule that flush.
        this._mergeWindowBack(window)
        this._armFlushTimer()
        return
      case 'too-large':
        this._logger.warn('Metrics batch exceeded the server size limit and was dropped')
        return
      case 'fatal':
        this._logger.error('Failed to send metrics batch:', outcome.error)
        return
    }
  }

  private _buildPayload(window: Map<string, SeriesState>): OtlpMetricsPayload {
    return buildOtlpMetricsPayload(
      this._buildMetrics(window),
      buildMetricsResourceAttributes(this._config, this._instance.getLibraryId(), this._instance.getLibraryVersion()),
      this._instance.getLibraryId(),
      this._instance.getLibraryVersion()
    )
  }

  /**
   * Groups the window's series into OTLP metric entries — one entry per
   * (type, name, unit), one data point per attribute combination.
   */
  private _buildMetrics(window: Map<string, SeriesState>): OtlpMetric[] {
    const nowNano = msToUnixNano(Date.now())
    const byMetric = new Map<string, OtlpMetric>()

    for (const state of window.values()) {
      const metricKey = seriesKey(state.type, state.name, state.unit, undefined)
      let metric = byMetric.get(metricKey)
      if (!metric) {
        metric = { name: state.name, ...(state.unit && { unit: state.unit }) }
        if (state.type === 'count') {
          metric.sum = { aggregationTemporality: OTLP_TEMPORALITY_DELTA, isMonotonic: true, dataPoints: [] }
        } else if (state.type === 'gauge') {
          metric.gauge = { dataPoints: [] }
        } else {
          metric.histogram = { aggregationTemporality: OTLP_TEMPORALITY_DELTA, dataPoints: [] }
        }
        byMetric.set(metricKey, metric)
      }

      const attributes = toOtlpKeyValueList(state.attributes ?? {})
      const startNano = msToUnixNano(state.windowStartMs)

      if (state.type === 'count') {
        const dp: OtlpNumberDataPoint = {
          attributes,
          startTimeUnixNano: startNano,
          timeUnixNano: nowNano,
          asDouble: state.total ?? 0,
        }
        metric.sum!.dataPoints.push(dp)
      } else if (state.type === 'gauge') {
        const dp: OtlpNumberDataPoint = {
          attributes,
          timeUnixNano: nowNano,
          asDouble: state.last ?? 0,
        }
        metric.gauge!.dataPoints.push(dp)
      } else if (state.hist) {
        const dp: OtlpHistogramDataPoint = {
          attributes,
          startTimeUnixNano: startNano,
          timeUnixNano: nowNano,
          count: state.hist.count,
          sum: state.hist.sum,
          min: state.hist.min,
          max: state.hist.max,
          bucketCounts: state.hist.bucketCounts,
          explicitBounds: DEFAULT_HISTOGRAM_BOUNDS,
        }
        metric.histogram!.dataPoints.push(dp)
      }
    }

    return Array.from(byMetric.values())
  }

  /** Folds an unsent window back into the live one after a transient send failure. */
  private _mergeWindowBack(window: Map<string, SeriesState>): void {
    for (const [key, old] of window) {
      const current = this._series.get(key)
      if (!current) {
        // The cap still applies here: an unbounded merge-back would let a
        // failed flush reintroduce series past maxSeriesPerFlush.
        if (this._admitNewSeries()) {
          this._series.set(key, old)
        }
        continue
      }
      current.windowStartMs = Math.min(current.windowStartMs, old.windowStartMs)
      switch (current.type) {
        case 'count':
          current.total = (current.total ?? 0) + (old.total ?? 0)
          break
        case 'gauge':
          // The live window's value is newer — keep it.
          break
        case 'histogram':
          if (old.hist) {
            if (!current.hist) {
              current.hist = old.hist
            } else {
              current.hist.count += old.hist.count
              current.hist.sum += old.hist.sum
              current.hist.min = Math.min(current.hist.min, old.hist.min)
              current.hist.max = Math.max(current.hist.max, old.hist.max)
              for (let i = 0; i < current.hist.bucketCounts.length; i++) {
                current.hist.bucketCounts[i] += old.hist.bucketCounts[i]
              }
            }
          }
          break
      }
    }
  }
}

export { buildOtlpMetricsPayload, buildMetricsResourceAttributes, DEFAULT_HISTOGRAM_BOUNDS } from './metrics-utils'
export { resolveMetricsConfig } from './config'
export type { MetricsHost, PostHogMetricsConfig, ResolvedPostHogMetricsConfig, SendMetricsBatchOutcome } from './types'
