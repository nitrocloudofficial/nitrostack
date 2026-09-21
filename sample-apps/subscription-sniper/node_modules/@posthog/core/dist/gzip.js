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
    isNativeAsyncGzipError: ()=>isNativeAsyncGzipError,
    isNativeAsyncGzipReadError: ()=>isNativeAsyncGzipReadError,
    isGzipRequest: ()=>isGzipRequest,
    isGzipSupported: ()=>isGzipSupported,
    gzipCompress: ()=>gzipCompress,
    isGzipData: ()=>isGzipData
});
const external_types_js_namespaceObject = require("./types.js");
function isGzipSupported() {
    return 'CompressionStream' in globalThis && 'TextEncoder' in globalThis && 'Response' in globalThis && 'function' == typeof Response.prototype.blob;
}
const NATIVE_GZIP_VALIDATION_ERROR = 'NativeGzipValidationError';
const GZIP_MAGIC_FIRST_BYTE = 0x1f;
const GZIP_MAGIC_SECOND_BYTE = 0x8b;
const GZIP_DEFLATE_METHOD = 0x08;
const hasGzipMagic = (bytes)=>bytes.length >= 2 && bytes[0] === GZIP_MAGIC_FIRST_BYTE && bytes[1] === GZIP_MAGIC_SECOND_BYTE;
const isGzipData = (body)=>{
    if (body instanceof ArrayBuffer) return hasGzipMagic(new Uint8Array(body));
    if (ArrayBuffer.isView(body)) return hasGzipMagic(new Uint8Array(body.buffer, body.byteOffset, body.byteLength));
    return false;
};
const isGzipRequest = (compression, urlCompression)=>compression === external_types_js_namespaceObject.Compression.GZipJS || urlCompression === external_types_js_namespaceObject.Compression.GZipJS || 'gzip' === urlCompression;
const isNativeAsyncGzipReadError = (error)=>{
    if (!error || 'object' != typeof error) return false;
    const name = 'name' in error ? String(error.name) : '';
    return 'NotReadableError' === name;
};
const isNativeAsyncGzipError = (error)=>{
    if (!error || 'object' != typeof error) return false;
    const name = 'name' in error ? String(error.name) : '';
    return isNativeAsyncGzipReadError(error) || name === NATIVE_GZIP_VALIDATION_ERROR;
};
let crc32Table;
const getCrc32Table = ()=>{
    if (crc32Table) return crc32Table;
    crc32Table = [];
    for(let i = 0; i < 256; i++){
        let crc = i;
        for(let j = 0; j < 8; j++)crc = 1 & crc ? 0xedb88320 ^ crc >>> 1 : crc >>> 1;
        crc32Table[i] = crc >>> 0;
    }
    return crc32Table;
};
const crc32 = (bytes)=>{
    const table = getCrc32Table();
    let crc = 0xffffffff;
    for(let i = 0; i < bytes.length; i++)crc = table[(crc ^ bytes[i]) & 0xff] ^ crc >>> 8;
    return (0xffffffff ^ crc) >>> 0;
};
const throwNativeGzipValidationError = (reason)=>{
    const error = new Error(`Native gzip produced invalid output: ${reason}`);
    error.name = NATIVE_GZIP_VALIDATION_ERROR;
    throw error;
};
const validateNativeGzip = async (compressed, inputBytes)=>{
    if (compressed.size < 18) throwNativeGzipValidationError('too-short');
    const header = new Uint8Array(await compressed.slice(0, 10).arrayBuffer());
    if (!hasGzipMagic(header) || header[2] !== GZIP_DEFLATE_METHOD) throwNativeGzipValidationError('invalid-header');
    const trailer = new DataView(await compressed.slice(compressed.size - 8).arrayBuffer());
    if (trailer.getUint32(0, true) !== crc32(inputBytes)) throwNativeGzipValidationError('invalid-crc');
    const inputSize = inputBytes.length >>> 0;
    if (trailer.getUint32(4, true) !== inputSize) throwNativeGzipValidationError('invalid-size');
};
async function gzipCompress(input, isDebug = true, options) {
    try {
        const inputBytes = new TextEncoder().encode(input);
        const compressedStream = new globalThis.CompressionStream('gzip');
        const writer = compressedStream.writable.getWriter();
        const writePromise = writer.write(inputBytes).then(()=>writer.close()).catch(async (err)=>{
            try {
                await writer.abort(err);
            } catch  {}
            throw err;
        });
        const responsePromise = new Response(compressedStream.readable).blob();
        const [compressed] = await Promise.all([
            responsePromise,
            writePromise
        ]);
        await validateNativeGzip(compressed, inputBytes);
        return compressed;
    } catch (error) {
        if (options?.rethrow) throw error;
        if (isDebug) console.error('Failed to gzip compress data', error);
        return null;
    }
}
exports.gzipCompress = __webpack_exports__.gzipCompress;
exports.isGzipData = __webpack_exports__.isGzipData;
exports.isGzipRequest = __webpack_exports__.isGzipRequest;
exports.isGzipSupported = __webpack_exports__.isGzipSupported;
exports.isNativeAsyncGzipError = __webpack_exports__.isNativeAsyncGzipError;
exports.isNativeAsyncGzipReadError = __webpack_exports__.isNativeAsyncGzipReadError;
for(var __webpack_i__ in __webpack_exports__)if (-1 === [
    "gzipCompress",
    "isGzipData",
    "isGzipRequest",
    "isGzipSupported",
    "isNativeAsyncGzipError",
    "isNativeAsyncGzipReadError"
].indexOf(__webpack_i__)) exports[__webpack_i__] = __webpack_exports__[__webpack_i__];
Object.defineProperty(exports, '__esModule', {
    value: true
});
