import { ContextData, ContextOptions, IPostHogContext } from './types';
export declare class PostHogContext implements IPostHogContext {
    private storage;
    constructor();
    get(): ContextData | undefined;
    run<T>(context: ContextData, fn: () => T, options?: ContextOptions): T;
    enter(context: ContextData, options?: ContextOptions): void;
    private resolve;
}
//# sourceMappingURL=context.d.ts.map