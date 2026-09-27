import { Logger } from '../types';
type ConsoleLike = {
    debug: (...args: any[]) => void;
    log: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
};
export declare const _createLogger: (prefix: string, maybeCall: (fn: () => void) => void, consoleLike: ConsoleLike) => Logger;
export declare function createLogger(prefix: string, maybeCall?: (fn: () => void) => void): Logger;
export {};
//# sourceMappingURL=logger.d.ts.map