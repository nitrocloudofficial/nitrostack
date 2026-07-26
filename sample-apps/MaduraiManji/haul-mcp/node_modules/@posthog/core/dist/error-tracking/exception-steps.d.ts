export declare const EXCEPTION_STEP_INTERNAL_FIELDS: {
    readonly MESSAGE: "$message";
    readonly TIMESTAMP: "$timestamp";
};
export type ExceptionStep = {
    [EXCEPTION_STEP_INTERNAL_FIELDS.MESSAGE]: string;
    [EXCEPTION_STEP_INTERNAL_FIELDS.TIMESTAMP]: string | number;
    [key: string]: unknown;
};
/** NOTE: This type is also defined in `@posthog/types` (posthog-config.ts). Keep both in sync. */
export type ExceptionStepsConfig = {
    enabled?: boolean;
    max_bytes?: number;
};
export type ResolvedExceptionStepsConfig = {
    enabled: boolean;
    max_bytes: number;
};
export declare const DEFAULT_EXCEPTION_STEPS_CONFIG: ResolvedExceptionStepsConfig;
export declare function resolveExceptionStepsConfig(config?: ExceptionStepsConfig | null): ResolvedExceptionStepsConfig;
export declare function stripReservedExceptionStepFields(properties?: Record<string, unknown> | null): {
    sanitizedProperties: Record<string, unknown>;
    droppedKeys: string[];
};
export declare class ExceptionStepsBuffer {
    private _entries;
    private _totalBytes;
    private _config;
    constructor(config?: ExceptionStepsConfig | null);
    setConfig(config?: ExceptionStepsConfig | null): void;
    add(step: ExceptionStep): void;
    getAttachable(): ExceptionStep[];
    clear(): void;
    size(): number;
    private _trimToMaxBytes;
}
export declare function getUtf8ByteLength(value: string): number;
//# sourceMappingURL=exception-steps.d.ts.map