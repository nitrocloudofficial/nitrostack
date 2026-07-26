export * from '../exports';
import { PostHogBackendClient } from '../client';
import { ErrorTracking as CoreErrorTracking } from '@posthog/core';
export declare class PostHog extends PostHogBackendClient {
    getLibraryId(): string;
    protected initializeContext(): undefined;
    protected createErrorPropertiesBuilder(): CoreErrorTracking.ErrorPropertiesBuilder;
}
//# sourceMappingURL=index.edge.d.ts.map