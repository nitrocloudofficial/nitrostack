import { buildOtlpLogRecord, buildOtlpLogsPayload, buildResourceAttributes } from "./logs-utils.mjs";
import { PostHogPersistedProperty } from "../types.mjs";
import { isArray, safeSetTimeout } from "../utils/index.mjs";
const MAX_FLUSH_BACKOFF_EXPONENT = 6;
class PostHogLogs {
    constructor(_instance, _config, _logger, _getContext, _onReady, _waitForStoragePersist = ()=>Promise.resolve(), _scopeName){
        this._instance = _instance;
        this._config = _config;
        this._logger = _logger;
        this._getContext = _getContext;
        this._onReady = _onReady;
        this._waitForStoragePersist = _waitForStoragePersist;
        this._scopeName = _scopeName;
        this._flushPromise = null;
        this._evictedSinceAdvance = 0;
        this._consecutiveFlushFailures = 0;
        this._intervalWindowStart = 0;
        this._intervalLogCount = 0;
        this._droppedWarned = false;
        this._maxBufferSize = _config.maxBufferSize;
        this._maxQueueSize = Math.max(_config.maxQueueSize ?? _config.maxBufferSize, _config.maxBufferSize);
        this._flushIntervalMs = _config.flushIntervalMs;
        this._maxBatchRecordsPerPost = _config.maxBatchRecordsPerPost;
        this._rateCapWindowMs = _config.rateCapWindowMs;
        this._maxLogsPerInterval = _config.maxLogsPerInterval;
    }
    reset() {
        this._clearFlushTimer();
        this._flushPromise = null;
        this._intervalWindowStart = 0;
        this._intervalLogCount = 0;
        this._droppedWarned = false;
        this._evictedSinceAdvance = 0;
        this._consecutiveFlushFailures = 0;
        this._maxBatchRecordsPerPost = this._config.maxBatchRecordsPerPost;
    }
    onReconnect() {
        this._consecutiveFlushFailures = 0;
        this._flushInBackground();
    }
    captureLog(options) {
        if (this._instance.isDisabled) return;
        if (this._instance.optedOut) return;
        if (!options?.body) return;
        const filtered = this._runBeforeSend(options);
        if (null === filtered) return;
        if (!filtered.body) return void this._logger.info("Log was rejected in beforeSend function");
        if (!this._checkRateLimit()) return;
        const record = buildOtlpLogRecord(filtered, this._getContext());
        const entry = {
            record
        };
        this._onReady(()=>this._enqueue(entry));
    }
    _runBeforeSend(options) {
        const beforeSend = this._config.beforeSend;
        if (!beforeSend) return options;
        const fns = isArray(beforeSend) ? beforeSend : [
            beforeSend
        ];
        let result = options;
        for (const fn of fns)try {
            const next = fn(result);
            if (!next) {
                this._logger.info("Log was rejected in beforeSend function");
                return null;
            }
            result = next;
        } catch (e) {
            this._logger.error("Error in beforeSend function for log:", e);
            return null;
        }
        return result;
    }
    _checkRateLimit() {
        if (void 0 === this._maxLogsPerInterval) return true;
        const now = Date.now();
        const elapsed = now - this._intervalWindowStart;
        if (elapsed >= this._rateCapWindowMs || elapsed < 0) {
            this._intervalWindowStart = now;
            this._intervalLogCount = 0;
            this._droppedWarned = false;
        }
        if (this._intervalLogCount >= this._maxLogsPerInterval) {
            if (!this._droppedWarned) {
                this._logger.warn(`captureLog dropping logs: exceeded ${this._maxLogsPerInterval} logs per ${this._rateCapWindowMs}ms`);
                this._droppedWarned = true;
            }
            return false;
        }
        this._intervalLogCount++;
        return true;
    }
    async flush() {
        if (this._instance.isDisabled) return;
        if (this._flushPromise) return this._flushPromise;
        this._flushPromise = this._flushInner().finally(()=>{
            this._flushPromise = null;
        });
        return this._flushPromise;
    }
    async _flushInner() {
        this._clearFlushTimer();
        let queue = this._instance.getPersistedProperty(PostHogPersistedProperty.LogsQueue) ?? [];
        if (0 === queue.length) return;
        const originalQueueLength = queue.length;
        let sentCount = 0;
        while(queue.length > 0 && sentCount < originalQueueLength){
            this._evictedSinceAdvance = 0;
            const batchSize = Math.min(queue.length, this._maxBatchRecordsPerPost);
            const batch = queue.slice(0, batchSize);
            const records = batch.map((e)=>e.record);
            const payload = buildOtlpLogsPayload(records, this._buildResourceAttributes(), this._scopeName ?? this._instance.getLibraryId(), this._instance.getLibraryVersion());
            const outcome = await this._instance._sendLogsBatch(payload);
            if ('too-large' === outcome.kind && batch.length > 1) {
                this._maxBatchRecordsPerPost = Math.max(1, Math.floor(batch.length / 2));
                this._logger.warn(`Received 413 when sending logs batch of size ${batch.length}, reducing batch size to ${this._maxBatchRecordsPerPost}`);
                continue;
            }
            if ('retry-later' === outcome.kind) throw outcome.error;
            if ('too-large' === outcome.kind) this._logger.warn("Dropping a single log record after 413 with batch size 1 \u2014 the record is larger than the server cap and cannot be split further.");
            else if ('ok' === outcome.kind && this._maxBatchRecordsPerPost < this._config.maxBatchRecordsPerPost) this._maxBatchRecordsPerPost = Math.min(this._config.maxBatchRecordsPerPost, this._maxBatchRecordsPerPost + 1);
            await this._persistQueueAdvance(batch.length);
            queue = this._instance.getPersistedProperty(PostHogPersistedProperty.LogsQueue) ?? [];
            sentCount += batch.length;
            if ('fatal' === outcome.kind) throw outcome.error;
        }
    }
    async _persistQueueAdvance(consumed) {
        const evicted = this._evictedSinceAdvance;
        const drop = Math.max(0, consumed - evicted);
        const refreshed = this._instance.getPersistedProperty(PostHogPersistedProperty.LogsQueue) ?? [];
        this._instance.setPersistedProperty(PostHogPersistedProperty.LogsQueue, refreshed.slice(drop));
        await this._waitForStoragePersist();
    }
    _buildResourceAttributes() {
        return buildResourceAttributes(this._config, this._instance.getLibraryId(), this._instance.getLibraryVersion());
    }
    _enqueue(entry) {
        if (this._instance.optedOut) return;
        const queue = this._instance.getPersistedProperty(PostHogPersistedProperty.LogsQueue) ?? [];
        if (queue.length >= this._maxQueueSize) {
            queue.shift();
            this._evictedSinceAdvance++;
            this._logger.info('Logs queue is full, dropping oldest record.');
        }
        queue.push(entry);
        this._instance.setPersistedProperty(PostHogPersistedProperty.LogsQueue, queue);
        if (queue.length >= this._maxBufferSize) return void this._flushInBackground();
        this._armFlushTimer();
    }
    _armFlushTimer(delayMs = this._flushIntervalMs) {
        if (this._flushTimer) return;
        this._flushTimer = safeSetTimeout(()=>{
            this._flushTimer = void 0;
            this._flushInBackground();
        }, delayMs);
    }
    _nextFlushDelay() {
        const exponent = Math.min(Math.max(0, this._consecutiveFlushFailures - 1), MAX_FLUSH_BACKOFF_EXPONENT);
        return this._flushIntervalMs * 2 ** exponent;
    }
    _hasQueuedRecords() {
        const queue = this._instance.getPersistedProperty(PostHogPersistedProperty.LogsQueue);
        return !!queue && queue.length > 0;
    }
    async shutdown(timeoutMs) {
        this._clearFlushTimer();
        const flushPromise = this.flush().catch(()=>{});
        if (void 0 === timeoutMs) return void await flushPromise;
        await Promise.race([
            flushPromise,
            new Promise((resolve)=>safeSetTimeout(resolve, timeoutMs))
        ]);
    }
    async flushWithTimeout(timeoutMs) {
        let timedOut = false;
        const flushPromise = this.flush();
        const timerPromise = new Promise((resolve)=>safeSetTimeout(()=>{
                timedOut = true;
                resolve();
            }, timeoutMs));
        try {
            await Promise.race([
                flushPromise,
                timerPromise
            ]);
        } finally{
            if (timedOut) flushPromise.catch(()=>{});
        }
    }
    _flushInBackground() {
        this.flush().then(()=>{
            this._consecutiveFlushFailures = 0;
        }, (err)=>{
            this._consecutiveFlushFailures++;
            this._logger.error('PostHog logs flush failed:', err);
        }).finally(()=>{
            if (!this._instance.isDisabled && this._hasQueuedRecords()) this._armFlushTimer(this._nextFlushDelay());
        });
    }
    _clearFlushTimer() {
        if (this._flushTimer) {
            clearTimeout(this._flushTimer);
            this._flushTimer = void 0;
        }
    }
}
export { PostHogLogs };
