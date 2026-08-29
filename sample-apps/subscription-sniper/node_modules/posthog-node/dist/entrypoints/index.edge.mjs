import { PostHogBackendClient } from "../client.mjs";
import { ErrorTracking } from "@posthog/core";
export * from "../exports.mjs";
class PostHog extends PostHogBackendClient {
    getLibraryId() {
        return 'posthog-edge';
    }
    initializeContext() {}
    createErrorPropertiesBuilder() {
        return new ErrorTracking.ErrorPropertiesBuilder([
            new ErrorTracking.EventCoercer(),
            new ErrorTracking.ErrorCoercer(),
            new ErrorTracking.ObjectCoercer(),
            new ErrorTracking.StringCoercer(),
            new ErrorTracking.PrimitiveCoercer()
        ], ErrorTracking.createStackParser("node:javascript", ErrorTracking.nodeStackLineParser));
    }
}
export { PostHog };
