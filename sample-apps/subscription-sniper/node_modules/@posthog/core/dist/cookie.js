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
    getConsentCookieName: ()=>getConsentCookieName,
    parsePostHogCookie: ()=>parsePostHogCookie,
    isOptedOut: ()=>isOptedOut,
    readPostHogCookie: ()=>readPostHogCookie,
    serializePostHogCookie: ()=>serializePostHogCookie,
    cookieStateToProperties: ()=>cookieStateToProperties,
    getPostHogCookieName: ()=>getPostHogCookieName,
    cookieStoreFromHeader: ()=>cookieStoreFromHeader
});
const index_js_namespaceObject = require("./utils/index.js");
const uuidv7_js_namespaceObject = require("./vendor/uuidv7.js");
const COOKIE_PREFIX = 'ph_';
const COOKIE_SUFFIX = '_posthog';
function cookieStoreFromHeader(cookieHeader) {
    const cookies = {};
    if (cookieHeader) for (const pair of cookieHeader.split(';')){
        const [key, ...valueParts] = pair.trim().split('=');
        if (key) {
            const raw = valueParts.join('=').trim();
            try {
                cookies[key.trim()] = decodeURIComponent(raw);
            } catch  {
                cookies[key.trim()] = raw;
            }
        }
    }
    return {
        get: (name)=>name in cookies ? {
                value: cookies[name]
            } : void 0
    };
}
function getPostHogCookieName(apiKey) {
    const sanitized = apiKey.replace(/\+/g, 'PL').replace(/\//g, 'SL').replace(/=/g, 'EQ');
    return `${COOKIE_PREFIX}${sanitized}${COOKIE_SUFFIX}`;
}
function serializePostHogCookie(anonymousId) {
    const now = Date.now();
    const sessionId = (0, uuidv7_js_namespaceObject.uuidv7)();
    return JSON.stringify({
        distinct_id: anonymousId,
        $device_id: anonymousId,
        $user_state: 'anonymous',
        $sesid: [
            now,
            sessionId,
            now
        ]
    });
}
function readPostHogCookie(cookies, apiKey) {
    const cookieName = getPostHogCookieName(apiKey);
    const cookie = cookies.get(cookieName);
    return cookie ? parsePostHogCookie(cookie.value) : null;
}
function cookieStateToProperties(state) {
    if (!state) return;
    const props = {};
    if (state.sessionId) props.$session_id = state.sessionId;
    if (state.deviceId) props.$device_id = state.deviceId;
    return Object.keys(props).length > 0 ? props : void 0;
}
function parsePostHogCookie(cookieValue) {
    if (!cookieValue) return null;
    try {
        const parsed = JSON.parse(cookieValue);
        if (!parsed || 'object' != typeof parsed || !parsed.distinct_id) return null;
        const sesid = (0, index_js_namespaceObject.isArray)(parsed.$sesid) ? parsed.$sesid[1] : void 0;
        return {
            distinctId: String(parsed.distinct_id),
            isIdentified: 'identified' === parsed.$user_state,
            sessionId: 'string' == typeof sesid ? sesid : void 0,
            deviceId: 'string' == typeof parsed.$device_id ? parsed.$device_id : void 0
        };
    } catch  {
        return null;
    }
}
const CONSENT_PREFIX = '__ph_opt_in_out_';
function getConsentCookieName(apiKey, config) {
    if (config?.consent_persistence_name) return config.consent_persistence_name;
    if (config?.opt_out_capturing_cookie_prefix) return config.opt_out_capturing_cookie_prefix + apiKey;
    return CONSENT_PREFIX + apiKey;
}
function isOptedOut(cookies, apiKey, config) {
    const cookieName = getConsentCookieName(apiKey, config);
    const cookie = cookies.get(cookieName);
    if (cookie) return (0, index_js_namespaceObject.isNoLike)(cookie.value);
    return config?.opt_out_capturing_by_default ?? false;
}
exports.cookieStateToProperties = __webpack_exports__.cookieStateToProperties;
exports.cookieStoreFromHeader = __webpack_exports__.cookieStoreFromHeader;
exports.getConsentCookieName = __webpack_exports__.getConsentCookieName;
exports.getPostHogCookieName = __webpack_exports__.getPostHogCookieName;
exports.isOptedOut = __webpack_exports__.isOptedOut;
exports.parsePostHogCookie = __webpack_exports__.parsePostHogCookie;
exports.readPostHogCookie = __webpack_exports__.readPostHogCookie;
exports.serializePostHogCookie = __webpack_exports__.serializePostHogCookie;
for(var __webpack_i__ in __webpack_exports__)if (-1 === [
    "cookieStateToProperties",
    "cookieStoreFromHeader",
    "getConsentCookieName",
    "getPostHogCookieName",
    "isOptedOut",
    "parsePostHogCookie",
    "readPostHogCookie",
    "serializePostHogCookie"
].indexOf(__webpack_i__)) exports[__webpack_i__] = __webpack_exports__[__webpack_i__];
Object.defineProperty(exports, '__esModule', {
    value: true
});
