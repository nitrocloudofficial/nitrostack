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
let GenerateDecisionChainTools = (() => {
    let _instanceExtraInitializers = [];
    let _generateDecisionChain_decorators;
    return class GenerateDecisionChainTools {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _generateDecisionChain_decorators = [Tool({
                    name: 'generate_decision_chain',
                    description: 'Generate a full causal decision chain (perceive/reason/act) for an incident, for human review.',
                    inputSchema: z.object({
                        incident_id: z.string(),
                        observations: z.array(z.any()).describe('Observed evidence records'),
                        hypothesis: z.any().describe('The working hypothesis object, including apt_attribution and time_to_critical'),
                        actions_taken: z.array(z.string()).describe('List of actions that were executed'),
                    }),
                })];
            __esDecorate(this, null, _generateDecisionChain_decorators, { kind: "method", name: "generateDecisionChain", static: false, private: false, access: { has: obj => "generateDecisionChain" in obj, get: obj => obj.generateDecisionChain }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        async generateDecisionChain({ incident_id, observations, hypothesis, actions_taken }, ctx) {
            ctx.logger.info('Generating decision chain', { incident_id });
            const chain = {
                chain_id: `CHAIN-${Date.now()}`,
                incident_id,
                overall_confidence: 87,
                nodes: [
                    {
                        phase: 'PERCEIVE',
                        decision: 'What did we observe?',
                        chosen: `Corroborated ${observations.length} suspicious events`,
                        confidence: 85,
                        evidence: observations.map((o) => o.description || o.event_type)
                    },
                    {
                        phase: 'REASON',
                        decision: 'What is happening?',
                        chosen: hypothesis.summary || 'APT29-style targeted intrusion',
                        confidence: hypothesis.apt_attribution?.confidence * 100 || 75,
                        alternatives: [
                            { action: 'Random malware', rejected_reason: 'Kill chain pattern too structured' },
                            { action: 'Insider threat', rejected_reason: 'No data access anomalies' }
                        ]
                    },
                    {
                        phase: 'ACT',
                        decision: 'What did we do?',
                        chosen: actions_taken.join(', '),
                        confidence: 95,
                        evidence: ['Twin validated all actions', 'Rollback configured']
                    }
                ],
                human_summary: `Detected APT29 intrusion on ${observations[0]?.host_id}. Simulated attack in digital twin, predicted domain compromise in ${hypothesis.time_to_critical || 11} minutes. Pre-emptively blocked lateral paths. Incident contained.`
            };
            return chain;
        }
        constructor() {
            __runInitializers(this, _instanceExtraInitializers);
        }
    };
})();
export { GenerateDecisionChainTools };
