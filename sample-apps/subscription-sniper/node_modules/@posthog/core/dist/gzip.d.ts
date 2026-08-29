/**
 * Older browsers and some runtimes don't support this yet
 * This API (as of 2025-05-07) is not available on React Native.
 */
export declare function isGzipSupported(): boolean;
export declare const isGzipData: (body: unknown) => boolean;
export declare const isGzipRequest: (compression?: unknown, urlCompression?: unknown) => boolean;
export declare const isNativeAsyncGzipReadError: (error: unknown) => boolean;
export declare const isNativeAsyncGzipError: (error: unknown) => boolean;
export type GzipCompressOptions = {
    /**
     * By default this helper swallows compression errors and returns null.
     * Some browsers, notably Safari 16, can throw NotReadableError from the
     * native CompressionStream path. Callers can opt into rethrowing so they
     * can detect that case and change future compression behavior if needed.
     */
    rethrow?: boolean;
};
/**
 * Gzip a string using Compression Streams API if it's available
 */
export declare function gzipCompress(input: string, isDebug?: boolean, options?: GzipCompressOptions): Promise<Blob | null>;
//# sourceMappingURL=gzip.d.ts.map