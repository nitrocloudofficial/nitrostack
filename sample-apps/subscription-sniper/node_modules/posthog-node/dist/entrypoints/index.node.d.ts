export * from '../exports';
import { PostHogBackendClient } from '../client';
import { ErrorTracking as CoreErrorTracking } from '@posthog/core';
import { PostHogContext } from '../extensions/context/context';
export declare class PostHog extends PostHogBackendClient {
    getLibraryId(): string;
    protected initializeContext(): PostHogContext;
    protected createErrorPropertiesBuilder(): CoreErrorTracking.ErrorPropertiesBuilder;
}
//# sourceMappingURL=index.node.d.ts.map