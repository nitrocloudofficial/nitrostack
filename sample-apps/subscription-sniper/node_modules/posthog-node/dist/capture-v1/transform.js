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
    buildV1Batch: ()=>buildV1Batch,
    buildV1Event: ()=>buildV1Event,
    coerceBool: ()=>coerceBool,
    coerceString: ()=>coerceString
});
function coerceBool(value) {
    if ('boolean' == typeof value) return value;
    if ('number' == typeof value) return 0 !== value;
    if ('string' == typeof value) {
        const normalized = value.trim().toLowerCase();
        if ('true' === normalized || '1' === normalized) return true;
        if ('false' === normalized || '0' === normalized) return false;
    }
}
function coerceString(value) {
    return 'string' == typeof value ? value : void 0;
}
const OPTION_SENTINELS = [
    {
        property: '$cookieless_mode',
        optionKey: 'cookieless_mode',
        coerce: coerceBool
    },
    {
        property: '$ignore_sent_at',
        optionKey: 'disable_skew_correction',
        coerce: coerceBool
    },
    {
        property: '$process_person_profile',
        optionKey: 'process_person_profile',
        coerce: coerceBool
    },
    {
        property: '$product_tour_id',
        optionKey: 'product_tour_id',
        coerce: coerceString
    }
];
const TOPLEVEL_SENTINELS = [
    {
        property: '$session_id',
        field: 'session_id'
    },
    {
        property: '$window_id',
        field: 'window_id'
    }
];
function isRecord(value) {
    return 'object' == typeof value && null !== value && !Array.isArray(value);
}
function toRfc3339(timestamp) {
    if ('string' == typeof timestamp) {
        const asDate = new Date(timestamp);
        return Number.isNaN(asDate.getTime()) ? new Date().toISOString() : timestamp;
    }
    if (timestamp instanceof Date) return Number.isNaN(timestamp.getTime()) ? new Date().toISOString() : timestamp.toISOString();
    const asDate = null == timestamp ? new Date() : new Date(timestamp);
    return Number.isNaN(asDate.getTime()) ? new Date().toISOString() : asDate.toISOString();
}
function relocateInto(properties, key, value) {
    if (void 0 !== value && !(key in properties)) properties[key] = value;
}
function buildV1Event(message) {
    const sourceProperties = isRecord(message.properties) ? message.properties : {};
    const properties = {
        ...sourceProperties
    };
    const options = {};
    for (const { property, optionKey, coerce } of OPTION_SENTINELS)if (property in properties) {
        const coerced = coerce(properties[property]);
        if (void 0 !== coerced) options[optionKey] = coerced;
        delete properties[property];
    }
    const topLevel = {};
    for (const { property, field } of TOPLEVEL_SENTINELS)if (property in properties) {
        const value = properties[property];
        if ('string' == typeof value) topLevel[field] = value;
        delete properties[property];
    }
    delete properties.$lib;
    delete properties.$lib_version;
    relocateInto(properties, '$set', message.$set);
    relocateInto(properties, '$set_once', message.$set_once);
    return {
        event: String(message.event ?? ''),
        uuid: String(message.uuid ?? ''),
        distinct_id: String(message.distinct_id ?? ''),
        timestamp: toRfc3339(message.timestamp),
        ...topLevel,
        options,
        properties
    };
}
function buildV1Batch(messages, { createdAt, historicalMigration }) {
    const batch = {
        created_at: createdAt,
        batch: messages.map(buildV1Event)
    };
    if (historicalMigration) batch.historical_migration = true;
    return batch;
}
exports.buildV1Batch = __webpack_exports__.buildV1Batch;
exports.buildV1Event = __webpack_exports__.buildV1Event;
exports.coerceBool = __webpack_exports__.coerceBool;
exports.coerceString = __webpack_exports__.coerceString;
for(var __webpack_i__ in __webpack_exports__)if (-1 === [
    "buildV1Batch",
    "buildV1Event",
    "coerceBool",
    "coerceString"
].indexOf(__webpack_i__)) exports[__webpack_i__] = __webpack_exports__[__webpack_i__];
Object.defineProperty(exports, '__esModule', {
    value: true
});
