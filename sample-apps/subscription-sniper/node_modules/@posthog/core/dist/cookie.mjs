import { isArray, isNoLike } from "./utils/index.mjs";
import { uuidv7 } from "./vendor/uuidv7.mjs";
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
    const sessionId = uuidv7();
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
        const sesid = isArray(parsed.$sesid) ? parsed.$sesid[1] : void 0;
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
    if (cookie) return isNoLike(cookie.value);
    return config?.opt_out_capturing_by_default ?? false;
}
export { cookieStateToProperties, cookieStoreFromHeader, getConsentCookieName, getPostHogCookieName, isOptedOut, parsePostHogCookie, readPostHogCookie, serializePostHogCookie };
