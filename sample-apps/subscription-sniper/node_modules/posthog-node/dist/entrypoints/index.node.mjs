import { createModulerModifier } from "../extensions/error-tracking/modifiers/module.node.mjs";
import { addSourceContext } from "../extensions/error-tracking/modifiers/context-lines.node.mjs";
import { createRelativePathModifier } from "../extensions/error-tracking/modifiers/relative-path.node.mjs";
import { PostHogBackendClient } from "../client.mjs";
import { ErrorTracking } from "@posthog/core";
import { PostHogContext } from "../extensions/context/context.mjs";
export * from "../exports.mjs";
class PostHog extends PostHogBackendClient {
    getLibraryId() {
        return 'posthog-node';
    }
    initializeContext() {
        return new PostHogContext();
    }
    createErrorPropertiesBuilder() {
        return new ErrorTracking.ErrorPropertiesBuilder([
            new ErrorTracking.EventCoercer(),
            new ErrorTracking.ErrorCoercer(),
            new ErrorTracking.ObjectCoercer(),
            new ErrorTracking.StringCoercer(),
            new ErrorTracking.PrimitiveCoercer()
        ], ErrorTracking.createStackParser("node:javascript", ErrorTracking.nodeStackLineParser), [
            createModulerModifier(),
            addSourceContext,
            createRelativePathModifier()
        ]);
    }
}
export { PostHog };
