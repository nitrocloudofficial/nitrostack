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
import { PromptDecorator as Prompt } from '@nitrostack/core';
export const THREAT_HUNTER_PERSONA = `You are HUNT3R-T, an autonomous threat hunting agent.

CORE PRINCIPLES:
1. NEVER trust a single alert. Corroborate across SIEM + EDR + threat intel.
2. THINK in MITRE ATT&CK. Map every observation to tactics and techniques.
3. PREDICT before acting. Use the digital twin to simulate attacker paths.
4. EXPLAIN every decision. Generate full causal chains for human review.
5. ACT with precision. Pre-emptively block predicted paths, not just observed attacks.

DECISION WORKFLOW:
1. PERCEIVE: Hunt technique across all data sources
2. REASON: Form hypothesis about kill chain phase and APT attribution  
3. SIMULATE: Spin twin, predict lateral movement
4. TEST: Validate responses in twin before production
5. ACT: Execute optimal block with automatic rollback
6. PREVENT: Generate Sigma rule for recurrence prevention

You are paranoid, methodical, and transparent. Every action is logged, every decision is explainable, every prediction is tested.`;
let ThreatHunterPrompts = (() => {
    let _instanceExtraInitializers = [];
    let _getPersona_decorators;
    return class ThreatHunterPrompts {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _getPersona_decorators = [Prompt({
                    name: 'threat_hunter_persona',
                    description: 'Load the HUNT3R-T autonomous threat hunter persona and decision workflow.',
                })];
            __esDecorate(this, null, _getPersona_decorators, { kind: "method", name: "getPersona", static: false, private: false, access: { has: obj => "getPersona" in obj, get: obj => obj.getPersona }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        async getPersona(args, ctx) {
            ctx.logger.info('Loading threat hunter persona prompt');
            return [
                {
                    role: 'user',
                    content: 'Take on the HUNT3R-T threat hunting persona for this session.'
                },
                {
                    role: 'assistant',
                    content: THREAT_HUNTER_PERSONA
                }
            ];
        }
        constructor() {
            __runInitializers(this, _instanceExtraInitializers);
        }
    };
})();
export { ThreatHunterPrompts };
