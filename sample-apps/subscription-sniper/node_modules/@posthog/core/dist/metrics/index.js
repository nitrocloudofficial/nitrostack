"use strict";
var __webpack_require__ = {};
(()=>{
    __webpack_require__.d = (exports1, definition)=>{
        for(var key in definition)if (__webpack_require__.o(definition, key) && !__webpack_require__.o(exports1, key)) Object.defineProperty(exports1, key, {
            enumerable: true,
            get: definition[key]
        });
    };
})();
(()=>{
    __webpack_require__.o = (obj, prop)=>Object.prototype.hasOwnProperty.call(obj, prop);
})();
(()=>{
    __webpack_require__.r = (exports1)=>{
        if ('undefined' != typeof Symbol && Symbol.toStringTag) Object.defineProperty(exports1, Symbol.toStringTag, {
            value: 'Module'
        });
        Object.defineProperty(exports1, '__esModule', {
            value: true
        });
    };
})();
var __webpack_exports__ = {};
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
    buildMetricsResourceAttributes: ()=>external_metrics_utils_js_namespaceObject.buildMetricsResourceAttributes,
    PostHogMetrics: ()=>PostHogMetrics,
    buildOtlpMetricsPayload: ()=>external_metrics_utils_js_namespaceObject.buildOtlpMetricsPayload,
    resolveMetricsConfig: ()=>external_config_js_namespaceObject.resolveMetricsConfig,
    DEFAULT_HISTOGRAM_BOUNDS: ()=>external_metrics_utils_js_namespaceObject.DEFAULT_HISTOGRAM_BOUNDS
});
const index_js_namespaceObject = require("../utils/index.js");
const logs_utils_js_namespaceObject = require("../logs/logs-utils.js");
const external_metrics_utils_js_namespaceObject = require("./metrics-utils.js");
const external_config_js_namespaceObject = require("./config.js");
const OTLP_TEMPORALITY_DELTA = 1;
class PostHogMetrics {
    constructor(_instance, _config, _logger){
        this._instance = _instance;
        this._config = _config;
        this._logger = _logger;
        this._series = new Map();
        this._flushPromise = null;
        this._seriesCapWarned = false;
        this._typeByName = new Map();
        this._typeCollisionWarned = new Set();
        this._generation = 0;
    }
    count(name, value = 1, options) {
        this._capture({
            name,
            type: 'count',
            value,
            unit: options?.unit,
            attributes: options?.attributes
        });
    }
    gauge(name, value, options) {
        this._capture({
            name,
            type: 'gauge',
            value,
            unit: options?.unit,
            attributes: options?.attributes
        });
    }
    histogram(name, value, options) {
        this._capture({
            name,
            type: 'histogram',
            value,
            unit: options?.unit,
            attributes: options?.attributes
        });
    }
    flush() {
        const prev = this._flushPromise;
        const run = async ()=>{
            if (prev) await prev.catch(()=>{});
            await this._doFlush();
        };
        const p = run().finally(()=>{
            if (this._flushPromise === p) this._flushPromise = null;
        });
        this._flushPromise = p;
        return p;
    }
    drainWindow() {
        if (0 === this._series.size) return null;
        const window = this._series;
        this._series = new Map();
        this._seriesCapWarned = false;
        this._typeByName = new Map();
        this._typeCollisionWarned = new Set();
        return this._buildPayload(window);
    }
    reset() {
        this._generation++;
        this._clearFlushTimer();
        this._series = new Map();
        this._flushPromise = null;
        this._seriesCapWarned = false;
        this._typeByName = new Map();
        this._typeCollisionWarned = new Set();
    }
    _capture(sample) {
        if (this._instance.isDisabled || this._instance.optedOut) return;
        const filtered = this._runBeforeSend(sample);
        if (null === filtered) return;
        if (!filtered.name || 'string' != typeof filtered.name) return void this._logger.warn('Dropping metric with empty name');
        if ('number' != typeof filtered.value || !Number.isFinite(filtered.value)) return void this._logger.warn(`Dropping metric '${filtered.name}': value must be a finite number`);
        if ('count' === filtered.type && filtered.value < 0) return void this._logger.warn(`Dropping count '${filtered.name}': counters are monotonic, value must be >= 0`);
        let attributes;
        let key;
        try {
            attributes = filtered.attributes ? {
                ...filtered.attributes
            } : void 0;
            key = (0, external_metrics_utils_js_namespaceObject.seriesKey)(filtered.type, filtered.name, filtered.unit, attributes);
        } catch (e) {
            this._logger.warn(`Dropping metric '${filtered.name}': attributes could not be serialized`, e);
            return;
        }
        let state = this._series.get(key);
        if (!state) {
            if (!this._admitNewSeries()) return;
            state = {
                name: filtered.name,
                type: filtered.type,
                unit: filtered.unit,
                attributes,
                windowStartMs: Date.now()
            };
            this._series.set(key, state);
        }
        const seenType = this._typeByName.get(filtered.name);
        if (void 0 === seenType) this._typeByName.set(filtered.name, filtered.type);
        else if (seenType !== filtered.type && !this._typeCollisionWarned.has(filtered.name)) {
            this._typeCollisionWarned.add(filtered.name);
            this._logger.warn(`Metric name '${filtered.name}' is already used as a ${seenType}; recording it as a ${filtered.type} too will blend both series in charts. Use a distinct name.`);
        }
        this._fold(state, filtered.value);
        this._armFlushTimer();
    }
    _admitNewSeries() {
        if (this._series.size < this._config.maxSeriesPerFlush) return true;
        if (!this._seriesCapWarned) {
            this._seriesCapWarned = true;
            this._logger.warn(`Metric series cap reached (${this._config.maxSeriesPerFlush} per flush window); dropping new series until the next flush. Reduce attribute cardinality.`);
        }
        return false;
    }
    _fold(state, value) {
        switch(state.type){
            case 'count':
                state.total = (state.total ?? 0) + value;
                break;
            case 'gauge':
                state.last = value;
                break;
            case 'histogram':
                {
                    if (!state.hist) state.hist = {
                        count: 0,
                        sum: 0,
                        min: value,
                        max: value,
                        bucketCounts: new Array(external_metrics_utils_js_namespaceObject.DEFAULT_HISTOGRAM_BOUNDS.length + 1).fill(0)
                    };
                    const hist = state.hist;
                    hist.count += 1;
                    hist.sum += value;
                    hist.min = Math.min(hist.min, value);
                    hist.max = Math.max(hist.max, value);
                    hist.bucketCounts[(0, external_metrics_utils_js_namespaceObject.bucketIndexFor)(value, external_metrics_utils_js_namespaceObject.DEFAULT_HISTOGRAM_BOUNDS)] += 1;
                    break;
                }
        }
    }
    _runBeforeSend(sample) {
        const beforeSend = this._config.beforeSend;
        if (!beforeSend) return sample;
        const fns = (0, index_js_namespaceObject.isArray)(beforeSend) ? beforeSend : [
            beforeSend
        ];
        let result = sample;
        for (const fn of fns)try {
            const next = fn(result);
            if (!next) {
                this._logger.info("Metric was rejected in beforeSend function");
                return null;
            }
            result = next;
        } catch (e) {
            this._logger.error("Error in beforeSend function for metric:", e);
            return null;
        }
        return result;
    }
    _armFlushTimer() {
        if (this._flushTimer) return;
        this._flushTimer = (0, index_js_namespaceObject.safeSetTimeout)(()=>{
            this._flushTimer = void 0;
            this.flush().catch((e)=>{
                this._logger.error('Metrics flush failed:', e);
            });
        }, this._config.flushIntervalMs);
    }
    _clearFlushTimer() {
        if (this._flushTimer) {
            clearTimeout(this._flushTimer);
            this._flushTimer = void 0;
        }
    }
    async _doFlush() {
        if (0 === this._series.size) return;
        const window = this._series;
        this._series = new Map();
        this._seriesCapWarned = false;
        this._typeByName = new Map();
        this._typeCollisionWarned = new Set();
        const generation = this._generation;
        const outcome = await this._instance._sendMetricsBatch(this._buildPayload(window));
        if (generation !== this._generation) return;
        switch(outcome.kind){
            case 'ok':
                return;
            case 'retry-later':
                this._mergeWindowBack(window);
                this._armFlushTimer();
                return;
            case 'too-large':
                this._logger.warn('Metrics batch exceeded the server size limit and was dropped');
                return;
            case 'fatal':
                this._logger.error('Failed to send metrics batch:', outcome.error);
                return;
        }
    }
    _buildPayload(window) {
        return (0, external_metrics_utils_js_namespaceObject.buildOtlpMetricsPayload)(this._buildMetrics(window), (0, external_metrics_utils_js_namespaceObject.buildMetricsResourceAttributes)(this._config, this._instance.getLibraryId(), this._instance.getLibraryVersion()), this._instance.getLibraryId(), this._instance.getLibraryVersion());
    }
    _buildMetrics(window) {
        const nowNano = (0, external_metrics_utils_js_namespaceObject.msToUnixNano)(Date.now());
        const byMetric = new Map();
        for (const state of window.values()){
            const metricKey = (0, external_metrics_utils_js_namespaceObject.seriesKey)(state.type, state.name, state.unit, void 0);
            let metric = byMetric.get(metricKey);
            if (!metric) {
                metric = {
                    name: state.name,
                    ...state.unit && {
                        unit: state.unit
                    }
                };
                if ('count' === state.type) metric.sum = {
                    aggregationTemporality: OTLP_TEMPORALITY_DELTA,
                    isMonotonic: true,
                    dataPoints: []
                };
                else if ('gauge' === state.type) metric.gauge = {
                    dataPoints: []
                };
                else metric.histogram = {
                    aggregationTemporality: OTLP_TEMPORALITY_DELTA,
                    dataPoints: []
                };
                byMetric.set(metricKey, metric);
            }
            const attributes = (0, logs_utils_js_namespaceObject.toOtlpKeyValueList)(state.attributes ?? {});
            const startNano = (0, external_metrics_utils_js_namespaceObject.msToUnixNano)(state.windowStartMs);
            if ('count' === state.type) {
                const dp = {
                    attributes,
                    startTimeUnixNano: startNano,
                    timeUnixNano: nowNano,
                    asDouble: state.total ?? 0
                };
                metric.sum.dataPoints.push(dp);
            } else if ('gauge' === state.type) {
                const dp = {
                    attributes,
                    timeUnixNano: nowNano,
                    asDouble: state.last ?? 0
                };
                metric.gauge.dataPoints.push(dp);
            } else if (state.hist) {
                const dp = {
                    attributes,
                    startTimeUnixNano: startNano,
                    timeUnixNano: nowNano,
                    count: state.hist.count,
                    sum: state.hist.sum,
                    min: state.hist.min,
                    max: state.hist.max,
                    bucketCounts: state.hist.bucketCounts,
                    explicitBounds: external_metrics_utils_js_namespaceObject.DEFAULT_HISTOGRAM_BOUNDS
                };
                metric.histogram.dataPoints.push(dp);
            }
        }
        return Array.from(byMetric.values());
    }
    _mergeWindowBack(window) {
        for (const [key, old] of window){
            const current = this._series.get(key);
            if (!current) {
                if (this._admitNewSeries()) this._series.set(key, old);
                continue;
            }
            current.windowStartMs = Math.min(current.windowStartMs, old.windowStartMs);
            switch(current.type){
                case 'count':
                    current.total = (current.total ?? 0) + (old.total ?? 0);
                    break;
                case 'gauge':
                    break;
                case 'histogram':
                    if (old.hist) if (current.hist) {
                        current.hist.count += old.hist.count;
                        current.hist.sum += old.hist.sum;
                        current.hist.min = Math.min(current.hist.min, old.hist.min);
                        current.hist.max = Math.max(current.hist.max, old.hist.max);
                        for(let i = 0; i < current.hist.bucketCounts.length; i++)current.hist.bucketCounts[i] += old.hist.bucketCounts[i];
                    } else current.hist = old.hist;
                    break;
            }
        }
    }
}
exports.DEFAULT_HISTOGRAM_BOUNDS = __webpack_exports__.DEFAULT_HISTOGRAM_BOUNDS;
exports.PostHogMetrics = __webpack_exports__.PostHogMetrics;
exports.buildMetricsResourceAttributes = __webpack_exports__.buildMetricsResourceAttributes;
exports.buildOtlpMetricsPayload = __webpack_exports__.buildOtlpMetricsPayload;
exports.resolveMetricsConfig = __webpack_exports__.resolveMetricsConfig;
for(var __webpack_i__ in __webpack_exports__)if (-1 === [
    "DEFAULT_HISTOGRAM_BOUNDS",
    "PostHogMetrics",
    "buildMetricsResourceAttributes",
    "buildOtlpMetricsPayload",
    "resolveMetricsConfig"
].indexOf(__webpack_i__)) exports[__webpack_i__] = __webpack_exports__[__webpack_i__];
Object.defineProperty(exports, '__esModule', {
    value: true
});
