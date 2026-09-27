const DEFAULT_FLUSH_INTERVAL_MS = 10000;
const DEFAULT_MAX_SERIES_PER_FLUSH = 1000;
function resolveMetricsConfig(config) {
    const resourceAttributes = config?.resourceAttributes;
    return {
        serviceName: resourceAttributes?.['service.name'] ?? config?.serviceName,
        serviceVersion: resourceAttributes?.['service.version'] ?? config?.serviceVersion,
        environment: resourceAttributes?.['deployment.environment'] ?? config?.environment,
        resourceAttributes,
        beforeSend: config?.beforeSend,
        flushIntervalMs: config?.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS,
        maxSeriesPerFlush: config?.maxSeriesPerFlush ?? DEFAULT_MAX_SERIES_PER_FLUSH
    };
}
export { resolveMetricsConfig };
