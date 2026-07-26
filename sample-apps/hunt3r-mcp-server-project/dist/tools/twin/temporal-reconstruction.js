var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
import { ToolDecorator as Tool, z } from '@nitrostack/core';
import { siemLogsResource } from '../../resources/index.js';
let TemporalReconstructionTools = (() => {
    let _instanceExtraInitializers = [];
    let _temporalReconstruction_decorators;
    return class TemporalReconstructionTools {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _temporalReconstruction_decorators = [Tool({
                    name: 'temporal_reconstruction',
                    description: 'Reconstruct the timeline of suspicious activity on a host to find patient zero and dwell time.',
                    inputSchema: z.object({
                        host_id: z.string().describe('The host to reconstruct a timeline for'),
                        lookback_hours: z.number().describe('How many hours back to search'),
                    }),
                })];
            __esDecorate(this, null, _temporalReconstruction_decorators, { kind: "method", name: "temporalReconstruction", static: false, private: false, access: { has: obj => "temporalReconstruction" in obj, get: obj => obj.temporalReconstruction }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        async temporalReconstruction({ host_id, lookback_hours }, ctx) {
            ctx.logger.info('Reconstructing timeline', { host_id, lookback_hours });
            const siem = siemLogsResource;
            const since = new Date(Date.now() - lookback_hours * 3600000);
            const events = await siem.query({ host_id, since });
            const suspicious = events.filter(e => ['high', 'critical'].includes(e.severity) || e.mitre_technique);
            const patientZero = suspicious[0] || null;
            const dwellTime = patientZero
                ? (new Date().getTime() - new Date(patientZero.timestamp).getTime()) / 3600000
                : 0;
            return {
                host_id,
                patient_zero: patientZero ? {
                    timestamp: patientZero.timestamp,
                    technique: patientZero.mitre_technique,
                    description: `${patientZero.process_name}: ${patientZero.command_line?.substring(0, 80)}...`
                } : null,
                dwell_time_hours: Math.round(dwellTime * 100) / 100,
                total_events: events.length,
                suspicious_events: suspicious.length,
                key_moments: suspicious.map(e => ({
                    timestamp: e.timestamp,
                    type: e.mitre_technique || e.event_type,
                    severity: e.severity
                }))
            };
        }
        constructor() {
            __runInitializers(this, _instanceExtraInitializers);
        }
    };
})();
export { TemporalReconstructionTools };
