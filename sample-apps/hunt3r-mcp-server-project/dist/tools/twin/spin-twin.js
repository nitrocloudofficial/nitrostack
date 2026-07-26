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
import { networkTopologyResource } from '../../resources/index.js';
let SpinTwinTools = (() => {
    let _instanceExtraInitializers = [];
    let _spinTwin_decorators;
    return class SpinTwinTools {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _spinTwin_decorators = [Tool({
                    name: 'spin_twin',
                    description: 'Spin up a digital twin of the network around a seed host, out to a given depth of trust relationships.',
                    inputSchema: z.object({
                        seed_host_id: z.string().describe('The host_id to center the twin on'),
                        depth_hops: z.number().describe('How many trust-relationship hops to include'),
                    }),
                })];
            __esDecorate(this, null, _spinTwin_decorators, { kind: "method", name: "spinTwin", static: false, private: false, access: { has: obj => "spinTwin" in obj, get: obj => obj.spinTwin }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        async spinTwin({ seed_host_id, depth_hops }, ctx) {
            ctx.logger.info('Spinning digital twin', { seed_host_id, depth_hops });
            const topology = networkTopologyResource;
            const seed = await topology.getHost(seed_host_id);
            if (!seed)
                throw new Error(`Host ${seed_host_id} not found`);
            const neighbors = await topology.getNeighbors(seed_host_id, depth_hops);
            const allHosts = [seed, ...neighbors];
            return {
                twin_id: `TWIN-${Date.now()}`,
                seed_host: seed_host_id,
                depth: depth_hops,
                total_hosts: allHosts.length,
                critical_assets_in_scope: allHosts.filter(h => h.criticality === 'CRITICAL').length,
                hosts: allHosts.map(h => ({
                    host_id: h.host_id,
                    compromised: h.host_id === seed_host_id,
                    criticality: h.criticality,
                    trust_relationships: h.trust_relationships.filter(t => allHosts.some(ah => ah.host_id === t))
                })),
                simulation_ready: true
            };
        }
        constructor() {
            __runInitializers(this, _instanceExtraInitializers);
        }
    };
})();
export { SpinTwinTools };
