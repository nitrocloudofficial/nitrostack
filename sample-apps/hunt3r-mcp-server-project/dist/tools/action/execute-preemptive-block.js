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
import { actionHistoryResource } from '../../resources/index.js';
let ExecutePreemptiveBlockTools = (() => {
    let _instanceExtraInitializers = [];
    let _executePreemptiveBlock_decorators;
    return class ExecutePreemptiveBlockTools {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _executePreemptiveBlock_decorators = [Tool({
                    name: 'execute_preemptive_block',
                    description: 'Execute a pre-emptive containment action (block domain, isolate host, or revoke credential) validated against a digital twin simulation.',
                    inputSchema: z.object({
                        action: z.enum(['BLOCK_DOMAIN', 'ISOLATE_HOST', 'REVOKE_CRED']).describe('The containment action to execute'),
                        target: z.string().describe('Target of the action (domain, host_id, or credential)'),
                        justification: z.string().describe('Why this action is being taken'),
                        twin_validation_id: z.string().describe('twin_id or simulation result id that validated this action'),
                    }),
                    annotations: {
                        destructiveHint: true,
                    },
                })];
            __esDecorate(this, null, _executePreemptiveBlock_decorators, { kind: "method", name: "executePreemptiveBlock", static: false, private: false, access: { has: obj => "executePreemptiveBlock" in obj, get: obj => obj.executePreemptiveBlock }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        async executePreemptiveBlock({ action, target, justification, twin_validation_id }, ctx) {
            ctx.logger.info('Executing preemptive block', { action, target, twin_validation_id });
            await actionHistoryResource.logAction({
                action_id: `ACT-${Date.now()}`,
                timestamp: new Date().toISOString(),
                action_type: action,
                target,
                justification,
                twin_validation_id,
                status: 'EXECUTED'
            });
            return {
                status: 'EXECUTED',
                action,
                target,
                twin_validation_id,
                rollback_window_seconds: 300,
                estimated_impact: action === 'ISOLATE_HOST' ? '1 service affected' : '0 services affected'
            };
        }
        constructor() {
            __runInitializers(this, _instanceExtraInitializers);
        }
    };
})();
export { ExecutePreemptiveBlockTools };
