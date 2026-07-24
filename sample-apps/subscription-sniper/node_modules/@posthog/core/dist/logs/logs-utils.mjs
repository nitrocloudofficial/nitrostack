import { isArray, isBoolean, isNull, isNullish, isUndefined } from "../utils/index.mjs";
const OTLP_SEVERITY_MAP = {
    trace: {
        text: 'TRACE',
        number: 1
    },
    debug: {
        text: 'DEBUG',
        number: 5
    },
    info: {
        text: 'INFO',
        number: 9
    },
    warn: {
        text: 'WARN',
        number: 13
    },
    error: {
        text: 'ERROR',
        number: 17
    },
    fatal: {
        text: 'FATAL',
        number: 21
    }
};
const DEFAULT_OTLP_SEVERITY = OTLP_SEVERITY_MAP.info;
function getOtlpSeverityText(level) {
    return (OTLP_SEVERITY_MAP[level] || DEFAULT_OTLP_SEVERITY).text;
}
function getOtlpSeverityNumber(level) {
    return (OTLP_SEVERITY_MAP[level] || DEFAULT_OTLP_SEVERITY).number;
}
function toOtlpAnyValue(value) {
    if (isBoolean(value)) return {
        boolValue: value
    };
    if ('number' == typeof value) {
        if (!Number.isFinite(value)) return {
            stringValue: String(value)
        };
        if (Number.isInteger(value)) return {
            intValue: value
        };
        return {
            doubleValue: value
        };
    }
    if ('string' == typeof value) return {
        stringValue: value
    };
    if (isArray(value)) return {
        arrayValue: {
            values: value.map((v)=>toOtlpAnyValue(v))
        }
    };
    try {
        return {
            stringValue: JSON.stringify(value)
        };
    } catch  {
        return {
            stringValue: String(value)
        };
    }
}
function toOtlpKeyValueList(attrs) {
    const result = [];
    for(const key in attrs){
        const value = attrs[key];
        if (!(isNull(value) || isUndefined(value))) result.push({
            key,
            value: toOtlpAnyValue(value)
        });
    }
    return result;
}
function timestampToUnixNano() {
    return String(Date.now()) + '000000';
}
function buildOtlpLogRecord(options, sdkContext) {
    const level = options.level || 'info';
    const { text: severityText, number: severityNumber } = OTLP_SEVERITY_MAP[level] || DEFAULT_OTLP_SEVERITY;
    const now = timestampToUnixNano();
    const autoAttributes = {};
    if (sdkContext.distinctId) autoAttributes.posthogDistinctId = sdkContext.distinctId;
    if (sdkContext.sessionId) autoAttributes.sessionId = sdkContext.sessionId;
    if (sdkContext.windowId) autoAttributes['window.id'] = sdkContext.windowId;
    if (!isNullish(sdkContext.sessionStartTimestamp)) autoAttributes.sessionStartTimestamp = String(sdkContext.sessionStartTimestamp);
    if (!isNullish(sdkContext.lastActivityTimestamp)) autoAttributes.lastActivityTimestamp = String(sdkContext.lastActivityTimestamp);
    if (sdkContext.currentUrl) autoAttributes['url.full'] = sdkContext.currentUrl;
    if (sdkContext.screenName) autoAttributes['screen.name'] = sdkContext.screenName;
    if (sdkContext.appState) autoAttributes['app.state'] = sdkContext.appState;
    if (sdkContext.activeFeatureFlags && sdkContext.activeFeatureFlags.length > 0) autoAttributes.feature_flags = sdkContext.activeFeatureFlags;
    const mergedAttributes = {
        ...autoAttributes,
        ...options.attributes || {}
    };
    const record = {
        timeUnixNano: now,
        observedTimeUnixNano: now,
        severityNumber,
        severityText,
        body: {
            stringValue: options.body
        },
        attributes: toOtlpKeyValueList(mergedAttributes)
    };
    if (options.trace_id) record.traceId = options.trace_id;
    if (options.span_id) record.spanId = options.span_id;
    if (!isUndefined(options.trace_flags)) record.flags = options.trace_flags;
    return record;
}
function buildResourceAttributes(config, sdkName, sdkVersion) {
    return {
        ...config.resourceAttributes,
        'service.name': config.serviceName || 'unknown_service',
        ...config.environment && {
            'deployment.environment': config.environment
        },
        ...config.serviceVersion && {
            'service.version': config.serviceVersion
        },
        'telemetry.sdk.name': sdkName,
        'telemetry.sdk.version': sdkVersion
    };
}
function buildOtlpLogsPayload(logRecords, resourceAttributes, scopeName, scopeVersion) {
    return {
        resourceLogs: [
            {
                resource: {
                    attributes: toOtlpKeyValueList(resourceAttributes)
                },
                scopeLogs: [
                    {
                        scope: {
                            name: scopeName,
                            version: scopeVersion
                        },
                        logRecords
                    }
                ]
            }
        ]
    };
}
export { buildOtlpLogRecord, buildOtlpLogsPayload, buildResourceAttributes, getOtlpSeverityNumber, getOtlpSeverityText, toOtlpAnyValue, toOtlpKeyValueList };
