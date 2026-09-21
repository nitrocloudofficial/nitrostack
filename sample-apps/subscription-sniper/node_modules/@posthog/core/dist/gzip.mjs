import { Compression } from "./types.mjs";
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
const isGzipRequest = (compression, urlCompression)=>compression === Compression.GZipJS || urlCompression === Compression.GZipJS || 'gzip' === urlCompression;
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
export { gzipCompress, isGzipData, isGzipRequest, isGzipSupported, isNativeAsyncGzipError, isNativeAsyncGzipReadError };
