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
let HuntTechniqueTools = (() => {
    let _instanceExtraInitializers = [];
    let _huntTechnique_decorators;
    return class HuntTechniqueTools {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _huntTechnique_decorators = [Tool({
                    name: 'hunt_technique',
                    description: 'Hunt for a specific MITRE ATT&CK technique across SIEM data, corroborating evidence across hosts and time.',
                    inputSchema: z.object({
                        technique_id: z.string().describe('MITRE ATT&CK technique ID, e.g. T1059'),
                        timeframe_hours: z.number().describe('How many hours back to search'),
                        host_filter: z.array(z.string()).optional().describe('Optional list of host_ids to restrict the hunt to'),
                    }),
                })];
            __esDecorate(this, null, _huntTechnique_decorators, { kind: "method", name: "huntTechnique", static: false, private: false, access: { has: obj => "huntTechnique" in obj, get: obj => obj.huntTechnique }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        async huntTechnique({ technique_id, timeframe_hours, host_filter }, ctx) {
            ctx.logger.info('Hunting technique', { technique_id, timeframe_hours });
            const since = new Date(Date.now() - timeframe_hours * 3600000);
            const siemHits = await siemLogsResource.query({ technique: technique_id, since });
            // Filter by host if specified
            const filteredHits = host_filter
                ? siemHits.filter(h => host_filter.includes(h.host_id))
                : siemHits;
            return {
                technique_id,
                total_hits: filteredHits.length,
                severity: filteredHits.some(h => h.severity === 'critical') ? 'CRITICAL' :
                    filteredHits.some(h => h.severity === 'high') ? 'HIGH' : 'MEDIUM',
                corroborated_evidence: filteredHits.map(hit => ({
                    timestamp: hit.timestamp,
                    host_id: hit.host_id,
                    user: hit.user,
                    evidence_type: 'siem',
                    description: hit.command_line || hit.query || hit.event_type,
                    confidence: hit.severity === 'critical' ? 95 : hit.severity === 'high' ? 80 : 60
                })),
                recommended_next_steps: filteredHits.length > 0
                    ? ['generate_hypothesis', 'spin_twin']
                    : ['continue_monitoring']
            };
        }
        constructor() {
            __runInitializers(this, _instanceExtraInitializers);
        }
    };
})();
export { HuntTechniqueTools };
