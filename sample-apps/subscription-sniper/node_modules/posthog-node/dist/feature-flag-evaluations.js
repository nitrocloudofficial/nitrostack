"use strict";
var __webpack_require__ = {};
(()=>{
    __webpack_require__.d = (exports1, definition)=>{
        for(var key in definition)if (__webpack_require__.o(definition, key) && !__webpack_require__.o(exports1, key)) Object.defineProperty(exports1, key, {
            enumerable: true,
            get: definition[key]
        });
    };
})();
(()=>{
    __webpack_require__.o = (obj, prop)=>Object.prototype.hasOwnProperty.call(obj, prop);
})();
(()=>{
    __webpack_require__.r = (exports1)=>{
        if ('undefined' != typeof Symbol && Symbol.toStringTag) Object.defineProperty(exports1, Symbol.toStringTag, {
            value: 'Module'
        });
        Object.defineProperty(exports1, '__esModule', {
            value: true
        });
    };
})();
var __webpack_exports__ = {};
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
    FeatureFlagEvaluations: ()=>FeatureFlagEvaluations
});
const external_types_js_namespaceObject = require("./types.js");
class FeatureFlagEvaluations {
    constructor(init){
        this._host = init.host;
        this._distinctId = init.distinctId;
        this._groups = init.groups;
        this._disableGeoip = init.disableGeoip;
        this._flags = init.flags;
        this._requestId = init.requestId;
        this._evaluatedAt = init.evaluatedAt;
        this._flagDefinitionsLoadedAt = init.flagDefinitionsLoadedAt;
        this._errorsWhileComputing = init.errorsWhileComputing ?? false;
        this._quotaLimited = init.quotaLimited ?? false;
        this._accessed = init.accessed ?? new Set();
        this._isSlice = init.isSlice ?? false;
    }
    isEnabled(key) {
        const flag = this._flags[key];
        this._recordAccess(key);
        return flag?.enabled ?? false;
    }
    getFlag(key) {
        const flag = this._flags[key];
        this._recordAccess(key);
        if (!flag) return;
        if (!flag.enabled) return false;
        return flag.variant ?? true;
    }
    getFlagPayload(key) {
        return this._flags[key]?.payload;
    }
    onlyAccessed() {
        const filtered = {};
        for (const key of this._accessed){
            const flag = this._flags[key];
            if (flag) filtered[key] = flag;
        }
        return this._cloneWith(filtered);
    }
    only(keys) {
        const filtered = {};
        const missing = [];
        for (const key of keys){
            const flag = this._flags[key];
            if (flag) filtered[key] = flag;
            else missing.push(key);
        }
        if (missing.length > 0) this._host.logWarning(`FeatureFlagEvaluations.only() was called with flag keys that are not in the evaluation set and will be dropped: ${missing.join(', ')}`);
        return this._cloneWith(filtered);
    }
    get keys() {
        return Object.keys(this._flags);
    }
    _getEventProperties() {
        const properties = {};
        const activeFlags = [];
        for (const [key, flag] of Object.entries(this._flags)){
            const value = false === flag.enabled ? false : flag.variant ?? true;
            properties[`$feature/${key}`] = value;
            if (flag.enabled) activeFlags.push(key);
        }
        if (activeFlags.length > 0) {
            activeFlags.sort();
            properties['$active_feature_flags'] = activeFlags;
        }
        return properties;
    }
    _cloneWith(flags) {
        return new FeatureFlagEvaluations({
            host: this._host,
            distinctId: this._distinctId,
            groups: this._groups,
            disableGeoip: this._disableGeoip,
            flags,
            requestId: this._requestId,
            evaluatedAt: this._evaluatedAt,
            flagDefinitionsLoadedAt: this._flagDefinitionsLoadedAt,
            errorsWhileComputing: this._errorsWhileComputing,
            quotaLimited: this._quotaLimited,
            accessed: new Set(this._accessed),
            isSlice: true
        });
    }
    _recordAccess(key) {
        this._accessed.add(key);
        if ('' === this._distinctId) return;
        if (this._isSlice && !(key in this._flags)) return;
        const flag = this._flags[key];
        const response = void 0 === flag ? void 0 : false === flag.enabled ? false : flag.variant ?? true;
        const properties = {
            $feature_flag: key,
            $feature_flag_response: response,
            $feature_flag_id: flag?.id,
            $feature_flag_version: flag?.version,
            $feature_flag_reason: flag?.reason,
            locally_evaluated: flag?.locallyEvaluated ?? false,
            [`$feature/${key}`]: response,
            $feature_flag_request_id: this._requestId,
            $feature_flag_evaluated_at: flag?.locallyEvaluated ? Date.now() : this._evaluatedAt
        };
        if (flag?.hasExperiment !== void 0) properties.$feature_flag_has_experiment = flag.hasExperiment;
        if (flag?.locallyEvaluated && void 0 !== this._flagDefinitionsLoadedAt) properties.$feature_flag_definitions_loaded_at = this._flagDefinitionsLoadedAt;
        const errors = [];
        if (this._errorsWhileComputing) errors.push(external_types_js_namespaceObject.FeatureFlagError.ERRORS_WHILE_COMPUTING);
        if (this._quotaLimited) errors.push(external_types_js_namespaceObject.FeatureFlagError.QUOTA_LIMITED);
        if (void 0 === flag) errors.push(external_types_js_namespaceObject.FeatureFlagError.FLAG_MISSING);
        if (errors.length > 0) properties.$feature_flag_error = errors.join(',');
        this._host.captureFlagCalledEventIfNeeded({
            distinctId: this._distinctId,
            key,
            response,
            groups: this._groups,
            disableGeoip: this._disableGeoip,
            properties
        });
    }
}
exports.FeatureFlagEvaluations = __webpack_exports__.FeatureFlagEvaluations;
for(var __webpack_i__ in __webpack_exports__)if (-1 === [
    "FeatureFlagEvaluations"
].indexOf(__webpack_i__)) exports[__webpack_i__] = __webpack_exports__[__webpack_i__];
Object.defineProperty(exports, '__esModule', {
    value: true
});
