export * from "./bot-detection.mjs";
export * from "./bucketed-rate-limiter.mjs";
export * from "./number-utils.mjs";
export * from "./string-utils.mjs";
export * from "./type-utils.mjs";
export * from "./promise-queue.mjs";
export * from "./logger.mjs";
export * from "./user-agent-utils.mjs";
const STRING_FORMAT = 'utf8';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUUID(value) {
    return 'string' == typeof value && UUID_REGEX.test(value);
}
function getEventUuid(uuid, generateUuid) {
    return isValidUUID(uuid) ? uuid : generateUuid();
}
function assert(truthyValue, message) {
    if (!truthyValue || 'string' != typeof truthyValue || isEmpty(truthyValue)) throw new Error(message);
}
function isEmpty(truthyValue) {
    if (0 === truthyValue.trim().length) return true;
    return false;
}
function removeTrailingSlash(url) {
    return url?.replace(/\/+$/, '');
}
function stripUrlHash(url) {
    if (!url) return url;
    return url.split('#')[0];
}
async function retriable(fn, props) {
    let lastError = null;
    for(let i = 0; i < props.retryCount + 1; i++){
        if (i > 0) await new Promise((r)=>setTimeout(r, props.retryDelay));
        try {
            const res = await fn();
            return res;
        } catch (e) {
            lastError = e;
            if (!props.retryCheck(e)) throw e;
        }
    }
    throw lastError;
}
function currentTimestamp() {
    return new Date().getTime();
}
function currentISOTime() {
    return new Date().toISOString();
}
function safeSetTimeout(fn, timeout) {
    const t = setTimeout(fn, timeout);
    t?.unref && t?.unref();
    return t;
}
const isPromise = (obj)=>obj && 'function' == typeof obj.then;
const isError = (x)=>x instanceof Error;
function getFetch() {
    return 'undefined' != typeof fetch ? fetch : void 0 !== globalThis.fetch ? globalThis.fetch : void 0;
}
function allSettled(promises) {
    return Promise.all(promises.map((p)=>(p ?? Promise.resolve()).then((value)=>({
                status: 'fulfilled',
                value
            }), (reason)=>({
                status: 'rejected',
                reason
            }))));
}
export { STRING_FORMAT, UUID_REGEX, allSettled, assert, currentISOTime, currentTimestamp, getEventUuid, getFetch, isError, isPromise, isValidUUID, removeTrailingSlash, retriable, safeSetTimeout, stripUrlHash };
