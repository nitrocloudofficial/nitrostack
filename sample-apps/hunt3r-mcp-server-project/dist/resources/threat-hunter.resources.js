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
import { ResourceDecorator as Resource } from '@nitrostack/core';
import { networkTopologyResource, siemLogsResource, actionHistoryResource, } from './index.js';
let ThreatHunterResources = (() => {
    let _instanceExtraInitializers = [];
    let _getNetworkTopology_decorators;
    let _getRecentSiemLogs_decorators;
    let _getThreatIntelProfiles_decorators;
    let _getActionHistory_decorators;
    return class ThreatHunterResources {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _getNetworkTopology_decorators = [Resource({
                    uri: 'hunt3r://network-topology',
                    name: 'Network Topology',
                    description: 'Current in-memory network topology graph (hosts, trust relationships, criticality).',
                    mimeType: 'application/json',
                })];
            _getRecentSiemLogs_decorators = [Resource({
                    uri: 'hunt3r://siem-logs/recent',
                    name: 'Recent SIEM Logs',
                    description: 'Most recent SIEM events loaded into memory, sorted by timestamp.',
                    mimeType: 'application/json',
                })];
            _getThreatIntelProfiles_decorators = [Resource({
                    uri: 'hunt3r://threat-intel/apt-profiles',
                    name: 'APT Threat Intel Profiles',
                    description: 'Loaded APT actor profiles including TTPs and kill-chain phase timing.',
                    mimeType: 'application/json',
                })];
            _getActionHistory_decorators = [Resource({
                    uri: 'hunt3r://action-history',
                    name: 'Action History',
                    description: 'Log of pre-emptive containment actions executed by HUNT3R-T.',
                    mimeType: 'application/json',
                })];
            __esDecorate(this, null, _getNetworkTopology_decorators, { kind: "method", name: "getNetworkTopology", static: false, private: false, access: { has: obj => "getNetworkTopology" in obj, get: obj => obj.getNetworkTopology }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getRecentSiemLogs_decorators, { kind: "method", name: "getRecentSiemLogs", static: false, private: false, access: { has: obj => "getRecentSiemLogs" in obj, get: obj => obj.getRecentSiemLogs }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getThreatIntelProfiles_decorators, { kind: "method", name: "getThreatIntelProfiles", static: false, private: false, access: { has: obj => "getThreatIntelProfiles" in obj, get: obj => obj.getThreatIntelProfiles }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getActionHistory_decorators, { kind: "method", name: "getActionHistory", static: false, private: false, access: { has: obj => "getActionHistory" in obj, get: obj => obj.getActionHistory }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        async getNetworkTopology(uri, ctx) {
            ctx.logger.info('Fetching network topology resource');
            const criticalAssets = await networkTopologyResource.getCriticalAssets();
            return {
                contents: [{
                        uri,
                        mimeType: 'application/json',
                        text: JSON.stringify({ critical_assets: criticalAssets }, null, 2)
                    }]
            };
        }
        async getRecentSiemLogs(uri, ctx) {
            ctx.logger.info('Fetching recent SIEM logs resource');
            const recent = await siemLogsResource.query({});
            return {
                contents: [{
                        uri,
                        mimeType: 'application/json',
                        text: JSON.stringify({ logs: recent.slice(-100) }, null, 2)
                    }]
            };
        }
        async getThreatIntelProfiles(uri, ctx) {
            ctx.logger.info('Fetching threat intel profiles resource');
            return {
                contents: [{
                        uri,
                        mimeType: 'application/json',
                        text: JSON.stringify({ note: 'Query via matchTechniquesToAPT/predictNextPhase tools for profile lookups.' }, null, 2)
                    }]
            };
        }
        async getActionHistory(uri, ctx) {
            ctx.logger.info('Fetching action history resource');
            const actions = await actionHistoryResource.getAllActions();
            return {
                contents: [{
                        uri,
                        mimeType: 'application/json',
                        text: JSON.stringify({ actions }, null, 2)
                    }]
            };
        }
        constructor() {
            __runInitializers(this, _instanceExtraInitializers);
        }
    };
})();
export { ThreatHunterResources };
