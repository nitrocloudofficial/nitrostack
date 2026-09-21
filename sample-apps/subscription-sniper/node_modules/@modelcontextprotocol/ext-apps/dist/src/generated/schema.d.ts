import { z } from "zod/v4";
/**
 * @description Color theme preference for the host environment.
 */
export declare const McpUiThemeSchema: z.ZodUnion<readonly [z.ZodLiteral<"light">, z.ZodLiteral<"dark">]>;
/**
 * @description Display mode for UI presentation.
 */
export declare const McpUiDisplayModeSchema: z.ZodUnion<readonly [z.ZodLiteral<"inline">, z.ZodLiteral<"fullscreen">, z.ZodLiteral<"pip">]>;
/**
 * @description CSS variable keys available to MCP apps for theming.
 */
export declare const McpUiStyleVariableKeySchema: z.ZodUnion<readonly [z.ZodLiteral<"--color-background-primary">, z.ZodLiteral<"--color-background-secondary">, z.ZodLiteral<"--color-background-tertiary">, z.ZodLiteral<"--color-background-inverse">, z.ZodLiteral<"--color-background-ghost">, z.ZodLiteral<"--color-background-info">, z.ZodLiteral<"--color-background-danger">, z.ZodLiteral<"--color-background-success">, z.ZodLiteral<"--color-background-warning">, z.ZodLiteral<"--color-background-disabled">, z.ZodLiteral<"--color-text-primary">, z.ZodLiteral<"--color-text-secondary">, z.ZodLiteral<"--color-text-tertiary">, z.ZodLiteral<"--color-text-inverse">, z.ZodLiteral<"--color-text-ghost">, z.ZodLiteral<"--color-text-info">, z.ZodLiteral<"--color-text-danger">, z.ZodLiteral<"--color-text-success">, z.ZodLiteral<"--color-text-warning">, z.ZodLiteral<"--color-text-disabled">, z.ZodLiteral<"--color-border-primary">, z.ZodLiteral<"--color-border-secondary">, z.ZodLiteral<"--color-border-tertiary">, z.ZodLiteral<"--color-border-inverse">, z.ZodLiteral<"--color-border-ghost">, z.ZodLiteral<"--color-border-info">, z.ZodLiteral<"--color-border-danger">, z.ZodLiteral<"--color-border-success">, z.ZodLiteral<"--color-border-warning">, z.ZodLiteral<"--color-border-disabled">, z.ZodLiteral<"--color-ring-primary">, z.ZodLiteral<"--color-ring-secondary">, z.ZodLiteral<"--color-ring-inverse">, z.ZodLiteral<"--color-ring-info">, z.ZodLiteral<"--color-ring-danger">, z.ZodLiteral<"--color-ring-success">, z.ZodLiteral<"--color-ring-warning">, z.ZodLiteral<"--font-sans">, z.ZodLiteral<"--font-mono">, z.ZodLiteral<"--font-weight-normal">, z.ZodLiteral<"--font-weight-medium">, z.ZodLiteral<"--font-weight-semibold">, z.ZodLiteral<"--font-weight-bold">, z.ZodLiteral<"--font-text-xs-size">, z.ZodLiteral<"--font-text-sm-size">, z.ZodLiteral<"--font-text-md-size">, z.ZodLiteral<"--font-text-lg-size">, z.ZodLiteral<"--font-heading-xs-size">, z.ZodLiteral<"--font-heading-sm-size">, z.ZodLiteral<"--font-heading-md-size">, z.ZodLiteral<"--font-heading-lg-size">, z.ZodLiteral<"--font-heading-xl-size">, z.ZodLiteral<"--font-heading-2xl-size">, z.ZodLiteral<"--font-heading-3xl-size">, z.ZodLiteral<"--font-text-xs-line-height">, z.ZodLiteral<"--font-text-sm-line-height">, z.ZodLiteral<"--font-text-md-line-height">, z.ZodLiteral<"--font-text-lg-line-height">, z.ZodLiteral<"--font-heading-xs-line-height">, z.ZodLiteral<"--font-heading-sm-line-height">, z.ZodLiteral<"--font-heading-md-line-height">, z.ZodLiteral<"--font-heading-lg-line-height">, z.ZodLiteral<"--font-heading-xl-line-height">, z.ZodLiteral<"--font-heading-2xl-line-height">, z.ZodLiteral<"--font-heading-3xl-line-height">, z.ZodLiteral<"--border-radius-xs">, z.ZodLiteral<"--border-radius-sm">, z.ZodLiteral<"--border-radius-md">, z.ZodLiteral<"--border-radius-lg">, z.ZodLiteral<"--border-radius-xl">, z.ZodLiteral<"--border-radius-full">, z.ZodLiteral<"--border-width-regular">, z.ZodLiteral<"--shadow-hairline">, z.ZodLiteral<"--shadow-sm">, z.ZodLiteral<"--shadow-md">, z.ZodLiteral<"--shadow-lg">]>;
/**
 * @description Style variables for theming MCP apps.
 *
 * Individual style keys are optional - hosts may provide any subset of these values.
 * Values are strings containing CSS values (colors, sizes, font stacks, etc.).
 *
 * Note: This type uses `Record<K, string | undefined>` rather than `Partial<Record<K, string>>`
 * for compatibility with Zod schema generation. Both are functionally equivalent for validation.
 */
export declare const McpUiStylesSchema: z.ZodRecord<z.ZodUnion<readonly [z.ZodLiteral<"--color-background-primary">, z.ZodLiteral<"--color-background-secondary">, z.ZodLiteral<"--color-background-tertiary">, z.ZodLiteral<"--color-background-inverse">, z.ZodLiteral<"--color-background-ghost">, z.ZodLiteral<"--color-background-info">, z.ZodLiteral<"--color-background-danger">, z.ZodLiteral<"--color-background-success">, z.ZodLiteral<"--color-background-warning">, z.ZodLiteral<"--color-background-disabled">, z.ZodLiteral<"--color-text-primary">, z.ZodLiteral<"--color-text-secondary">, z.ZodLiteral<"--color-text-tertiary">, z.ZodLiteral<"--color-text-inverse">, z.ZodLiteral<"--color-text-ghost">, z.ZodLiteral<"--color-text-info">, z.ZodLiteral<"--color-text-danger">, z.ZodLiteral<"--color-text-success">, z.ZodLiteral<"--color-text-warning">, z.ZodLiteral<"--color-text-disabled">, z.ZodLiteral<"--color-border-primary">, z.ZodLiteral<"--color-border-secondary">, z.ZodLiteral<"--color-border-tertiary">, z.ZodLiteral<"--color-border-inverse">, z.ZodLiteral<"--color-border-ghost">, z.ZodLiteral<"--color-border-info">, z.ZodLiteral<"--color-border-danger">, z.ZodLiteral<"--color-border-success">, z.ZodLiteral<"--color-border-warning">, z.ZodLiteral<"--color-border-disabled">, z.ZodLiteral<"--color-ring-primary">, z.ZodLiteral<"--color-ring-secondary">, z.ZodLiteral<"--color-ring-inverse">, z.ZodLiteral<"--color-ring-info">, z.ZodLiteral<"--color-ring-danger">, z.ZodLiteral<"--color-ring-success">, z.ZodLiteral<"--color-ring-warning">, z.ZodLiteral<"--font-sans">, z.ZodLiteral<"--font-mono">, z.ZodLiteral<"--font-weight-normal">, z.ZodLiteral<"--font-weight-medium">, z.ZodLiteral<"--font-weight-semibold">, z.ZodLiteral<"--font-weight-bold">, z.ZodLiteral<"--font-text-xs-size">, z.ZodLiteral<"--font-text-sm-size">, z.ZodLiteral<"--font-text-md-size">, z.ZodLiteral<"--font-text-lg-size">, z.ZodLiteral<"--font-heading-xs-size">, z.ZodLiteral<"--font-heading-sm-size">, z.ZodLiteral<"--font-heading-md-size">, z.ZodLiteral<"--font-heading-lg-size">, z.ZodLiteral<"--font-heading-xl-size">, z.ZodLiteral<"--font-heading-2xl-size">, z.ZodLiteral<"--font-heading-3xl-size">, z.ZodLiteral<"--font-text-xs-line-height">, z.ZodLiteral<"--font-text-sm-line-height">, z.ZodLiteral<"--font-text-md-line-height">, z.ZodLiteral<"--font-text-lg-line-height">, z.ZodLiteral<"--font-heading-xs-line-height">, z.ZodLiteral<"--font-heading-sm-line-height">, z.ZodLiteral<"--font-heading-md-line-height">, z.ZodLiteral<"--font-heading-lg-line-height">, z.ZodLiteral<"--font-heading-xl-line-height">, z.ZodLiteral<"--font-heading-2xl-line-height">, z.ZodLiteral<"--font-heading-3xl-line-height">, z.ZodLiteral<"--border-radius-xs">, z.ZodLiteral<"--border-radius-sm">, z.ZodLiteral<"--border-radius-md">, z.ZodLiteral<"--border-radius-lg">, z.ZodLiteral<"--border-radius-xl">, z.ZodLiteral<"--border-radius-full">, z.ZodLiteral<"--border-width-regular">, z.ZodLiteral<"--shadow-hairline">, z.ZodLiteral<"--shadow-sm">, z.ZodLiteral<"--shadow-md">, z.ZodLiteral<"--shadow-lg">]>, z.ZodUnion<readonly [z.ZodString, z.ZodUndefined]>>;
/**
 * @description Request to open an external URL in the host's default browser.
 * @see {@link app!App.openLink `App.openLink`} for the method that sends this request
 */
export declare const McpUiOpenLinkRequestSchema: z.ZodObject<{
    method: z.ZodLiteral<"ui/open-link">;
    params: z.ZodObject<{
        url: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * @description Result from opening a URL.
 * @see {@link McpUiOpenLinkRequest `McpUiOpenLinkRequest`}
 */
export declare const McpUiOpenLinkResultSchema: z.ZodObject<{
    isError: z.ZodOptional<z.ZodBoolean>;
}, z.core.$loose>;
/**
 * @description Result from a file download request.
 * @see {@link McpUiDownloadFileRequest `McpUiDownloadFileRequest`}
 */
export declare const McpUiDownloadFileResultSchema: z.ZodObject<{
    isError: z.ZodOptional<z.ZodBoolean>;
}, z.core.$loose>;
/**
 * @description Result from sending a message.
 * @see {@link McpUiMessageRequest `McpUiMessageRequest`}
 */
export declare const McpUiMessageResultSchema: z.ZodObject<{
    isError: z.ZodOptional<z.ZodBoolean>;
}, z.core.$loose>;
/**
 * @description Notification that the sandbox proxy iframe is ready to receive content.
 * @internal
 * @see https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx#sandbox-proxy
 */
export declare const McpUiSandboxProxyReadyNotificationSchema: z.ZodObject<{
    method: z.ZodLiteral<"ui/notifications/sandbox-proxy-ready">;
    params: z.ZodObject<{}, z.core.$strip>;
}, z.core.$strip>;
/**
 * @description Content Security Policy configuration for UI resources.
 *
 * Servers declare which origins their UI requires. Hosts use this to enforce appropriate CSP headers.
 *
 * > [!IMPORTANT]
 * > MCP App HTML runs in a sandboxed iframe with no same-origin server.
 * > **All** origins must be declared—including where your bundled JS/CSS is
 * > served from (`localhost` in dev, your CDN in production).
 */
export declare const McpUiResourceCspSchema: z.ZodObject<{
    connectDomains: z.ZodOptional<z.ZodArray<z.ZodString>>;
    resourceDomains: z.ZodOptional<z.ZodArray<z.ZodString>>;
    frameDomains: z.ZodOptional<z.ZodArray<z.ZodString>>;
    baseUriDomains: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
/**
 * @description Sandbox permissions requested by the UI resource.
 *
 * Servers declare which browser capabilities their UI needs.
 * Hosts MAY honor these by setting appropriate iframe `allow` attributes.
 * Apps SHOULD NOT assume permissions are granted; use JS feature detection as fallback.
 */
export declare const McpUiResourcePermissionsSchema: z.ZodObject<{
    camera: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
    microphone: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
    geolocation: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
    clipboardWrite: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
}, z.core.$strip>;
/**
 * @description Notification of UI size changes (View -> Host).
 * @see {@link app!App.sendSizeChanged `App.sendSizeChanged`} for the method to send this from View
 */
export declare const McpUiSizeChangedNotificationSchema: z.ZodObject<{
    method: z.ZodLiteral<"ui/notifications/size-changed">;
    params: z.ZodObject<{
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * @description Notification containing complete tool arguments (Host -> View).
 */
export declare const McpUiToolInputNotificationSchema: z.ZodObject<{
    method: z.ZodLiteral<"ui/notifications/tool-input">;
    params: z.ZodObject<{
        arguments: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * @description Notification containing partial/streaming tool arguments (Host -> View).
 */
export declare const McpUiToolInputPartialNotificationSchema: z.ZodObject<{
    method: z.ZodLiteral<"ui/notifications/tool-input-partial">;
    params: z.ZodObject<{
        arguments: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * @description Notification that tool execution was cancelled (Host -> View).
 * Host MUST send this if tool execution was cancelled for any reason (user action,
 * sampling error, classifier intervention, etc.).
 */
export declare const McpUiToolCancelledNotificationSchema: z.ZodObject<{
    method: z.ZodLiteral<"ui/notifications/tool-cancelled">;
    params: z.ZodObject<{
        reason: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * @description CSS blocks that can be injected by apps.
 */
export declare const McpUiHostCssSchema: z.ZodObject<{
    fonts: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/**
 * @description Style configuration for theming MCP apps.
 */
export declare const McpUiHostStylesSchema: z.ZodObject<{
    variables: z.ZodOptional<z.ZodRecord<z.ZodUnion<readonly [z.ZodLiteral<"--color-background-primary">, z.ZodLiteral<"--color-background-secondary">, z.ZodLiteral<"--color-background-tertiary">, z.ZodLiteral<"--color-background-inverse">, z.ZodLiteral<"--color-background-ghost">, z.ZodLiteral<"--color-background-info">, z.ZodLiteral<"--color-background-danger">, z.ZodLiteral<"--color-background-success">, z.ZodLiteral<"--color-background-warning">, z.ZodLiteral<"--color-background-disabled">, z.ZodLiteral<"--color-text-primary">, z.ZodLiteral<"--color-text-secondary">, z.ZodLiteral<"--color-text-tertiary">, z.ZodLiteral<"--color-text-inverse">, z.ZodLiteral<"--color-text-ghost">, z.ZodLiteral<"--color-text-info">, z.ZodLiteral<"--color-text-danger">, z.ZodLiteral<"--color-text-success">, z.ZodLiteral<"--color-text-warning">, z.ZodLiteral<"--color-text-disabled">, z.ZodLiteral<"--color-border-primary">, z.ZodLiteral<"--color-border-secondary">, z.ZodLiteral<"--color-border-tertiary">, z.ZodLiteral<"--color-border-inverse">, z.ZodLiteral<"--color-border-ghost">, z.ZodLiteral<"--color-border-info">, z.ZodLiteral<"--color-border-danger">, z.ZodLiteral<"--color-border-success">, z.ZodLiteral<"--color-border-warning">, z.ZodLiteral<"--color-border-disabled">, z.ZodLiteral<"--color-ring-primary">, z.ZodLiteral<"--color-ring-secondary">, z.ZodLiteral<"--color-ring-inverse">, z.ZodLiteral<"--color-ring-info">, z.ZodLiteral<"--color-ring-danger">, z.ZodLiteral<"--color-ring-success">, z.ZodLiteral<"--color-ring-warning">, z.ZodLiteral<"--font-sans">, z.ZodLiteral<"--font-mono">, z.ZodLiteral<"--font-weight-normal">, z.ZodLiteral<"--font-weight-medium">, z.ZodLiteral<"--font-weight-semibold">, z.ZodLiteral<"--font-weight-bold">, z.ZodLiteral<"--font-text-xs-size">, z.ZodLiteral<"--font-text-sm-size">, z.ZodLiteral<"--font-text-md-size">, z.ZodLiteral<"--font-text-lg-size">, z.ZodLiteral<"--font-heading-xs-size">, z.ZodLiteral<"--font-heading-sm-size">, z.ZodLiteral<"--font-heading-md-size">, z.ZodLiteral<"--font-heading-lg-size">, z.ZodLiteral<"--font-heading-xl-size">, z.ZodLiteral<"--font-heading-2xl-size">, z.ZodLiteral<"--font-heading-3xl-size">, z.ZodLiteral<"--font-text-xs-line-height">, z.ZodLiteral<"--font-text-sm-line-height">, z.ZodLiteral<"--font-text-md-line-height">, z.ZodLiteral<"--font-text-lg-line-height">, z.ZodLiteral<"--font-heading-xs-line-height">, z.ZodLiteral<"--font-heading-sm-line-height">, z.ZodLiteral<"--font-heading-md-line-height">, z.ZodLiteral<"--font-heading-lg-line-height">, z.ZodLiteral<"--font-heading-xl-line-height">, z.ZodLiteral<"--font-heading-2xl-line-height">, z.ZodLiteral<"--font-heading-3xl-line-height">, z.ZodLiteral<"--border-radius-xs">, z.ZodLiteral<"--border-radius-sm">, z.ZodLiteral<"--border-radius-md">, z.ZodLiteral<"--border-radius-lg">, z.ZodLiteral<"--border-radius-xl">, z.ZodLiteral<"--border-radius-full">, z.ZodLiteral<"--border-width-regular">, z.ZodLiteral<"--shadow-hairline">, z.ZodLiteral<"--shadow-sm">, z.ZodLiteral<"--shadow-md">, z.ZodLiteral<"--shadow-lg">]>, z.ZodUnion<readonly [z.ZodString, z.ZodUndefined]>>>;
    css: z.ZodOptional<z.ZodObject<{
        fonts: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
/**
 * @description Request for graceful shutdown of the View (Host -> View).
 * @see {@link app-bridge!AppBridge.teardownResource `AppBridge.teardownResource`} for the host method that sends this
 */
export declare const McpUiResourceTeardownRequestSchema: z.ZodObject<{
    method: z.ZodLiteral<"ui/resource-teardown">;
    params: z.ZodObject<{}, z.core.$strip>;
}, z.core.$strip>;
/**
 * @description Result from graceful shutdown request.
 * @see {@link McpUiResourceTeardownRequest `McpUiResourceTeardownRequest`}
 */
export declare const McpUiResourceTeardownResultSchema: z.ZodRecord<z.ZodString, z.ZodUnknown>;
export declare const McpUiSupportedContentBlockModalitiesSchema: z.ZodObject<{
    text: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
    image: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
    audio: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
    resource: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
    resourceLink: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
    structuredContent: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
}, z.core.$strip>;
/**
 * @description Notification for app-initiated teardown request (View -> Host).
 * Views send this to request that the host tear them down. The host decides
 * whether to proceed - if approved, the host will send
 * `ui/resource-teardown` to allow the view to perform cleanup before being
 * unmounted.
 * @see {@link app.App.requestTeardown} for the app method that sends this
 */
export declare const McpUiRequestTeardownNotificationSchema: z.ZodObject<{
    method: z.ZodLiteral<"ui/notifications/request-teardown">;
    params: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
}, z.core.$strip>;
/**
 * @description Capabilities supported by the host application.
 * @see {@link McpUiInitializeResult `McpUiInitializeResult`} for the initialization result that includes these capabilities
 */
export declare const McpUiHostCapabilitiesSchema: z.ZodObject<{
    experimental: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
    openLinks: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
    downloadFile: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
    serverTools: z.ZodOptional<z.ZodObject<{
        listChanged: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
    serverResources: z.ZodOptional<z.ZodObject<{
        listChanged: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
    logging: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
    sandbox: z.ZodOptional<z.ZodObject<{
        permissions: z.ZodOptional<z.ZodObject<{
            camera: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
            microphone: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
            geolocation: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
            clipboardWrite: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
        }, z.core.$strip>>;
        csp: z.ZodOptional<z.ZodObject<{
            connectDomains: z.ZodOptional<z.ZodArray<z.ZodString>>;
            resourceDomains: z.ZodOptional<z.ZodArray<z.ZodString>>;
            frameDomains: z.ZodOptional<z.ZodArray<z.ZodString>>;
            baseUriDomains: z.ZodOptional<z.ZodArray<z.ZodString>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    updateModelContext: z.ZodOptional<z.ZodObject<{
        text: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
        image: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
        audio: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
        resource: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
        resourceLink: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
        structuredContent: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
    }, z.core.$strip>>;
    message: z.ZodOptional<z.ZodObject<{
        text: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
        image: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
        audio: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
        resource: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
        resourceLink: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
        structuredContent: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
    }, z.core.$strip>>;
    sampling: z.ZodOptional<z.ZodObject<{
        tools: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
/**
 * @description Capabilities provided by the View ({@link app!App `App`}).
 * @see {@link McpUiInitializeRequest `McpUiInitializeRequest`} for the initialization request that includes these capabilities
 */
export declare const McpUiAppCapabilitiesSchema: z.ZodObject<{
    experimental: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
    tools: z.ZodOptional<z.ZodObject<{
        listChanged: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
    availableDisplayModes: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodLiteral<"inline">, z.ZodLiteral<"fullscreen">, z.ZodLiteral<"pip">]>>>;
}, z.core.$strip>;
/**
 * @description Notification that View has completed initialization (View -> Host).
 * @see {@link app!App.connect `App.connect`} for the method that sends this notification
 */
export declare const McpUiInitializedNotificationSchema: z.ZodObject<{
    method: z.ZodLiteral<"ui/notifications/initialized">;
    params: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
}, z.core.$strip>;
/**
 * @description UI Resource metadata for security and rendering configuration.
 */
export declare const McpUiResourceMetaSchema: z.ZodObject<{
    csp: z.ZodOptional<z.ZodObject<{
        connectDomains: z.ZodOptional<z.ZodArray<z.ZodString>>;
        resourceDomains: z.ZodOptional<z.ZodArray<z.ZodString>>;
        frameDomains: z.ZodOptional<z.ZodArray<z.ZodString>>;
        baseUriDomains: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>;
    permissions: z.ZodOptional<z.ZodObject<{
        camera: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
        microphone: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
        geolocation: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
        clipboardWrite: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
    }, z.core.$strip>>;
    domain: z.ZodOptional<z.ZodString>;
    prefersBorder: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
/**
 * @description Request to change the display mode of the UI.
 * The host will respond with the actual display mode that was set,
 * which may differ from the requested mode if not supported.
 * @see {@link app!App.requestDisplayMode `App.requestDisplayMode`} for the method that sends this request
 */
export declare const McpUiRequestDisplayModeRequestSchema: z.ZodObject<{
    method: z.ZodLiteral<"ui/request-display-mode">;
    params: z.ZodObject<{
        mode: z.ZodUnion<readonly [z.ZodLiteral<"inline">, z.ZodLiteral<"fullscreen">, z.ZodLiteral<"pip">]>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * @description Result from requesting a display mode change.
 * @see {@link McpUiRequestDisplayModeRequest `McpUiRequestDisplayModeRequest`}
 */
export declare const McpUiRequestDisplayModeResultSchema: z.ZodObject<{
    mode: z.ZodUnion<readonly [z.ZodLiteral<"inline">, z.ZodLiteral<"fullscreen">, z.ZodLiteral<"pip">]>;
}, z.core.$loose>;
/**
 * @description Tool visibility scope - who can access the tool.
 */
export declare const McpUiToolVisibilitySchema: z.ZodUnion<readonly [z.ZodLiteral<"model">, z.ZodLiteral<"app">]>;
/**
 * @description UI-related metadata for tools.
 */
export declare const McpUiToolMetaSchema: z.ZodObject<{
    resourceUri: z.ZodOptional<z.ZodString>;
    visibility: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodLiteral<"model">, z.ZodLiteral<"app">]>>>;
    csp: z.ZodOptional<z.ZodNever>;
    permissions: z.ZodOptional<z.ZodNever>;
}, z.core.$strip>;
/**
 * @description MCP Apps capability settings advertised by clients to servers.
 *
 * Clients advertise these capabilities via the `extensions` field in their
 * capabilities during MCP initialization. Servers can check for MCP Apps
 * support using {@link server-helpers!getUiCapability}.
 */
export declare const McpUiClientCapabilitiesSchema: z.ZodObject<{
    mimeTypes: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
/**
 * @description Request to download a file through the host.
 *
 * Sent from the View to the Host when the app wants to trigger a file download.
 * Since MCP Apps run in sandboxed iframes where direct downloads are blocked,
 * this provides a host-mediated mechanism for file exports.
 * The host SHOULD show a confirmation dialog before initiating the download.
 *
 * @see {@link app!App.downloadFile `App.downloadFile`} for the method that sends this request
 */
export declare const McpUiDownloadFileRequestSchema: z.ZodObject<{
    method: z.ZodLiteral<"ui/download-file">;
    params: z.ZodObject<{
        contents: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
            type: z.ZodLiteral<"resource">;
            resource: z.ZodUnion<readonly [z.ZodObject<{
                uri: z.ZodString;
                mimeType: z.ZodOptional<z.ZodString>;
                _meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
                text: z.ZodString;
            }, z.core.$strip>, z.ZodObject<{
                uri: z.ZodString;
                mimeType: z.ZodOptional<z.ZodString>;
                _meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
                blob: z.ZodString;
            }, z.core.$strip>]>;
            annotations: z.ZodOptional<z.ZodObject<{
                audience: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                    user: "user";
                    assistant: "assistant";
                }>>>;
                priority: z.ZodOptional<z.ZodNumber>;
                lastModified: z.ZodOptional<z.ZodISODateTime>;
            }, z.core.$strip>>;
            _meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.core.$strip>, z.ZodObject<{
            uri: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            mimeType: z.ZodOptional<z.ZodString>;
            size: z.ZodOptional<z.ZodNumber>;
            annotations: z.ZodOptional<z.ZodObject<{
                audience: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                    user: "user";
                    assistant: "assistant";
                }>>>;
                priority: z.ZodOptional<z.ZodNumber>;
                lastModified: z.ZodOptional<z.ZodISODateTime>;
            }, z.core.$strip>>;
            _meta: z.ZodOptional<z.ZodObject<{}, z.core.$loose>>;
            icons: z.ZodOptional<z.ZodArray<z.ZodObject<{
                src: z.ZodString;
                mimeType: z.ZodOptional<z.ZodString>;
                sizes: z.ZodOptional<z.ZodArray<z.ZodString>>;
                theme: z.ZodOptional<z.ZodEnum<{
                    light: "light";
                    dark: "dark";
                }>>;
            }, z.core.$strip>>>;
            name: z.ZodString;
            title: z.ZodOptional<z.ZodString>;
            type: z.ZodLiteral<"resource_link">;
        }, z.core.$strip>]>>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * @description Request to send a message to the host's chat interface.
 * @see {@link app!App.sendMessage `App.sendMessage`} for the method that sends this request
 */
export declare const McpUiMessageRequestSchema: z.ZodObject<{
    method: z.ZodLiteral<"ui/message">;
    params: z.ZodObject<{
        role: z.ZodLiteral<"user">;
        content: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
            type: z.ZodLiteral<"text">;
            text: z.ZodString;
            annotations: z.ZodOptional<z.ZodObject<{
                audience: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                    user: "user";
                    assistant: "assistant";
                }>>>;
                priority: z.ZodOptional<z.ZodNumber>;
                lastModified: z.ZodOptional<z.ZodISODateTime>;
            }, z.core.$strip>>;
            _meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"image">;
            data: z.ZodString;
            mimeType: z.ZodString;
            annotations: z.ZodOptional<z.ZodObject<{
                audience: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                    user: "user";
                    assistant: "assistant";
                }>>>;
                priority: z.ZodOptional<z.ZodNumber>;
                lastModified: z.ZodOptional<z.ZodISODateTime>;
            }, z.core.$strip>>;
            _meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"audio">;
            data: z.ZodString;
            mimeType: z.ZodString;
            annotations: z.ZodOptional<z.ZodObject<{
                audience: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                    user: "user";
                    assistant: "assistant";
                }>>>;
                priority: z.ZodOptional<z.ZodNumber>;
                lastModified: z.ZodOptional<z.ZodISODateTime>;
            }, z.core.$strip>>;
            _meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.core.$strip>, z.ZodObject<{
            uri: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            mimeType: z.ZodOptional<z.ZodString>;
            size: z.ZodOptional<z.ZodNumber>;
            annotations: z.ZodOptional<z.ZodObject<{
                audience: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                    user: "user";
                    assistant: "assistant";
                }>>>;
                priority: z.ZodOptional<z.ZodNumber>;
                lastModified: z.ZodOptional<z.ZodISODateTime>;
            }, z.core.$strip>>;
            _meta: z.ZodOptional<z.ZodObject<{}, z.core.$loose>>;
            icons: z.ZodOptional<z.ZodArray<z.ZodObject<{
                src: z.ZodString;
                mimeType: z.ZodOptional<z.ZodString>;
                sizes: z.ZodOptional<z.ZodArray<z.ZodString>>;
                theme: z.ZodOptional<z.ZodEnum<{
                    light: "light";
                    dark: "dark";
                }>>;
            }, z.core.$strip>>>;
            name: z.ZodString;
            title: z.ZodOptional<z.ZodString>;
            type: z.ZodLiteral<"resource_link">;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"resource">;
            resource: z.ZodUnion<readonly [z.ZodObject<{
                uri: z.ZodString;
                mimeType: z.ZodOptional<z.ZodString>;
                _meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
                text: z.ZodString;
            }, z.core.$strip>, z.ZodObject<{
                uri: z.ZodString;
                mimeType: z.ZodOptional<z.ZodString>;
                _meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
                blob: z.ZodString;
            }, z.core.$strip>]>;
            annotations: z.ZodOptional<z.ZodObject<{
                audience: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                    user: "user";
                    assistant: "assistant";
                }>>>;
                priority: z.ZodOptional<z.ZodNumber>;
                lastModified: z.ZodOptional<z.ZodISODateTime>;
            }, z.core.$strip>>;
            _meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.core.$strip>]>>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * @description Notification containing HTML resource for the sandbox proxy to load.
 * @internal
 * @see https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx#sandbox-proxy
 */
export declare const McpUiSandboxResourceReadyNotificationSchema: z.ZodObject<{
    method: z.ZodLiteral<"ui/notifications/sandbox-resource-ready">;
    params: z.ZodObject<{
        html: z.ZodString;
        sandbox: z.ZodOptional<z.ZodString>;
        csp: z.ZodOptional<z.ZodObject<{
            connectDomains: z.ZodOptional<z.ZodArray<z.ZodString>>;
            resourceDomains: z.ZodOptional<z.ZodArray<z.ZodString>>;
            frameDomains: z.ZodOptional<z.ZodArray<z.ZodString>>;
            baseUriDomains: z.ZodOptional<z.ZodArray<z.ZodString>>;
        }, z.core.$strip>>;
        permissions: z.ZodOptional<z.ZodObject<{
            camera: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
            microphone: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
            geolocation: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
            clipboardWrite: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * @description Notification containing tool execution result (Host -> View).
 */
export declare const McpUiToolResultNotificationSchema: z.ZodObject<{
    method: z.ZodLiteral<"ui/notifications/tool-result">;
    params: z.ZodObject<{
        _meta: z.ZodOptional<z.ZodObject<{
            progressToken: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
            "io.modelcontextprotocol/related-task": z.ZodOptional<z.ZodObject<{
                taskId: z.ZodString;
            }, z.core.$strip>>;
        }, z.core.$loose>>;
        content: z.ZodDefault<z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
            type: z.ZodLiteral<"text">;
            text: z.ZodString;
            annotations: z.ZodOptional<z.ZodObject<{
                audience: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                    user: "user";
                    assistant: "assistant";
                }>>>;
                priority: z.ZodOptional<z.ZodNumber>;
                lastModified: z.ZodOptional<z.ZodISODateTime>;
            }, z.core.$strip>>;
            _meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"image">;
            data: z.ZodString;
            mimeType: z.ZodString;
            annotations: z.ZodOptional<z.ZodObject<{
                audience: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                    user: "user";
                    assistant: "assistant";
                }>>>;
                priority: z.ZodOptional<z.ZodNumber>;
                lastModified: z.ZodOptional<z.ZodISODateTime>;
            }, z.core.$strip>>;
            _meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"audio">;
            data: z.ZodString;
            mimeType: z.ZodString;
            annotations: z.ZodOptional<z.ZodObject<{
                audience: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                    user: "user";
                    assistant: "assistant";
                }>>>;
                priority: z.ZodOptional<z.ZodNumber>;
                lastModified: z.ZodOptional<z.ZodISODateTime>;
            }, z.core.$strip>>;
            _meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.core.$strip>, z.ZodObject<{
            uri: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            mimeType: z.ZodOptional<z.ZodString>;
            size: z.ZodOptional<z.ZodNumber>;
            annotations: z.ZodOptional<z.ZodObject<{
                audience: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                    user: "user";
                    assistant: "assistant";
                }>>>;
                priority: z.ZodOptional<z.ZodNumber>;
                lastModified: z.ZodOptional<z.ZodISODateTime>;
            }, z.core.$strip>>;
            _meta: z.ZodOptional<z.ZodObject<{}, z.core.$loose>>;
            icons: z.ZodOptional<z.ZodArray<z.ZodObject<{
                src: z.ZodString;
                mimeType: z.ZodOptional<z.ZodString>;
                sizes: z.ZodOptional<z.ZodArray<z.ZodString>>;
                theme: z.ZodOptional<z.ZodEnum<{
                    light: "light";
                    dark: "dark";
                }>>;
            }, z.core.$strip>>>;
            name: z.ZodString;
            title: z.ZodOptional<z.ZodString>;
            type: z.ZodLiteral<"resource_link">;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"resource">;
            resource: z.ZodUnion<readonly [z.ZodObject<{
                uri: z.ZodString;
                mimeType: z.ZodOptional<z.ZodString>;
                _meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
                text: z.ZodString;
            }, z.core.$strip>, z.ZodObject<{
                uri: z.ZodString;
                mimeType: z.ZodOptional<z.ZodString>;
                _meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
                blob: z.ZodString;
            }, z.core.$strip>]>;
            annotations: z.ZodOptional<z.ZodObject<{
                audience: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                    user: "user";
                    assistant: "assistant";
                }>>>;
                priority: z.ZodOptional<z.ZodNumber>;
                lastModified: z.ZodOptional<z.ZodISODateTime>;
            }, z.core.$strip>>;
            _meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.core.$strip>]>>>;
        structuredContent: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        isError: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$loose>;
}, z.core.$strip>;
/**
 * @description Rich context about the host environment provided to views.
 */
export declare const McpUiHostContextSchema: z.ZodObject<{
    toolInfo: z.ZodOptional<z.ZodObject<{
        id: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
        tool: z.ZodObject<{
            description: z.ZodOptional<z.ZodString>;
            inputSchema: z.ZodObject<{
                type: z.ZodLiteral<"object">;
                properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodCustom<object, object>>>;
                required: z.ZodOptional<z.ZodArray<z.ZodString>>;
            }, z.core.$catchall<z.ZodUnknown>>;
            outputSchema: z.ZodOptional<z.ZodObject<{
                type: z.ZodLiteral<"object">;
                properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodCustom<object, object>>>;
                required: z.ZodOptional<z.ZodArray<z.ZodString>>;
            }, z.core.$catchall<z.ZodUnknown>>>;
            annotations: z.ZodOptional<z.ZodObject<{
                title: z.ZodOptional<z.ZodString>;
                readOnlyHint: z.ZodOptional<z.ZodBoolean>;
                destructiveHint: z.ZodOptional<z.ZodBoolean>;
                idempotentHint: z.ZodOptional<z.ZodBoolean>;
                openWorldHint: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strip>>;
            execution: z.ZodOptional<z.ZodObject<{
                taskSupport: z.ZodOptional<z.ZodEnum<{
                    optional: "optional";
                    required: "required";
                    forbidden: "forbidden";
                }>>;
            }, z.core.$strip>>;
            _meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            icons: z.ZodOptional<z.ZodArray<z.ZodObject<{
                src: z.ZodString;
                mimeType: z.ZodOptional<z.ZodString>;
                sizes: z.ZodOptional<z.ZodArray<z.ZodString>>;
                theme: z.ZodOptional<z.ZodEnum<{
                    light: "light";
                    dark: "dark";
                }>>;
            }, z.core.$strip>>>;
            name: z.ZodString;
            title: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip>>;
    theme: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"light">, z.ZodLiteral<"dark">]>>;
    styles: z.ZodOptional<z.ZodObject<{
        variables: z.ZodOptional<z.ZodRecord<z.ZodUnion<readonly [z.ZodLiteral<"--color-background-primary">, z.ZodLiteral<"--color-background-secondary">, z.ZodLiteral<"--color-background-tertiary">, z.ZodLiteral<"--color-background-inverse">, z.ZodLiteral<"--color-background-ghost">, z.ZodLiteral<"--color-background-info">, z.ZodLiteral<"--color-background-danger">, z.ZodLiteral<"--color-background-success">, z.ZodLiteral<"--color-background-warning">, z.ZodLiteral<"--color-background-disabled">, z.ZodLiteral<"--color-text-primary">, z.ZodLiteral<"--color-text-secondary">, z.ZodLiteral<"--color-text-tertiary">, z.ZodLiteral<"--color-text-inverse">, z.ZodLiteral<"--color-text-ghost">, z.ZodLiteral<"--color-text-info">, z.ZodLiteral<"--color-text-danger">, z.ZodLiteral<"--color-text-success">, z.ZodLiteral<"--color-text-warning">, z.ZodLiteral<"--color-text-disabled">, z.ZodLiteral<"--color-border-primary">, z.ZodLiteral<"--color-border-secondary">, z.ZodLiteral<"--color-border-tertiary">, z.ZodLiteral<"--color-border-inverse">, z.ZodLiteral<"--color-border-ghost">, z.ZodLiteral<"--color-border-info">, z.ZodLiteral<"--color-border-danger">, z.ZodLiteral<"--color-border-success">, z.ZodLiteral<"--color-border-warning">, z.ZodLiteral<"--color-border-disabled">, z.ZodLiteral<"--color-ring-primary">, z.ZodLiteral<"--color-ring-secondary">, z.ZodLiteral<"--color-ring-inverse">, z.ZodLiteral<"--color-ring-info">, z.ZodLiteral<"--color-ring-danger">, z.ZodLiteral<"--color-ring-success">, z.ZodLiteral<"--color-ring-warning">, z.ZodLiteral<"--font-sans">, z.ZodLiteral<"--font-mono">, z.ZodLiteral<"--font-weight-normal">, z.ZodLiteral<"--font-weight-medium">, z.ZodLiteral<"--font-weight-semibold">, z.ZodLiteral<"--font-weight-bold">, z.ZodLiteral<"--font-text-xs-size">, z.ZodLiteral<"--font-text-sm-size">, z.ZodLiteral<"--font-text-md-size">, z.ZodLiteral<"--font-text-lg-size">, z.ZodLiteral<"--font-heading-xs-size">, z.ZodLiteral<"--font-heading-sm-size">, z.ZodLiteral<"--font-heading-md-size">, z.ZodLiteral<"--font-heading-lg-size">, z.ZodLiteral<"--font-heading-xl-size">, z.ZodLiteral<"--font-heading-2xl-size">, z.ZodLiteral<"--font-heading-3xl-size">, z.ZodLiteral<"--font-text-xs-line-height">, z.ZodLiteral<"--font-text-sm-line-height">, z.ZodLiteral<"--font-text-md-line-height">, z.ZodLiteral<"--font-text-lg-line-height">, z.ZodLiteral<"--font-heading-xs-line-height">, z.ZodLiteral<"--font-heading-sm-line-height">, z.ZodLiteral<"--font-heading-md-line-height">, z.ZodLiteral<"--font-heading-lg-line-height">, z.ZodLiteral<"--font-heading-xl-line-height">, z.ZodLiteral<"--font-heading-2xl-line-height">, z.ZodLiteral<"--font-heading-3xl-line-height">, z.ZodLiteral<"--border-radius-xs">, z.ZodLiteral<"--border-radius-sm">, z.ZodLiteral<"--border-radius-md">, z.ZodLiteral<"--border-radius-lg">, z.ZodLiteral<"--border-radius-xl">, z.ZodLiteral<"--border-radius-full">, z.ZodLiteral<"--border-width-regular">, z.ZodLiteral<"--shadow-hairline">, z.ZodLiteral<"--shadow-sm">, z.ZodLiteral<"--shadow-md">, z.ZodLiteral<"--shadow-lg">]>, z.ZodUnion<readonly [z.ZodString, z.ZodUndefined]>>>;
        css: z.ZodOptional<z.ZodObject<{
            fonts: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    displayMode: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"inline">, z.ZodLiteral<"fullscreen">, z.ZodLiteral<"pip">]>>;
    availableDisplayModes: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodLiteral<"inline">, z.ZodLiteral<"fullscreen">, z.ZodLiteral<"pip">]>>>;
    containerDimensions: z.ZodOptional<z.ZodIntersection<z.ZodUnion<readonly [z.ZodObject<{
        height: z.ZodNumber;
    }, z.core.$strip>, z.ZodObject<{
        maxHeight: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodUndefined]>>;
    }, z.core.$strip>]>, z.ZodUnion<readonly [z.ZodObject<{
        width: z.ZodNumber;
    }, z.core.$strip>, z.ZodObject<{
        maxWidth: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodUndefined]>>;
    }, z.core.$strip>]>>>;
    locale: z.ZodOptional<z.ZodString>;
    timeZone: z.ZodOptional<z.ZodString>;
    userAgent: z.ZodOptional<z.ZodString>;
    platform: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"web">, z.ZodLiteral<"desktop">, z.ZodLiteral<"mobile">]>>;
    deviceCapabilities: z.ZodOptional<z.ZodObject<{
        touch: z.ZodOptional<z.ZodBoolean>;
        hover: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
    safeAreaInsets: z.ZodOptional<z.ZodObject<{
        top: z.ZodNumber;
        right: z.ZodNumber;
        bottom: z.ZodNumber;
        left: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$loose>;
/**
 * @description Notification that host context has changed (Host -> View).
 * @see {@link McpUiHostContext `McpUiHostContext`} for the full context structure
 */
export declare const McpUiHostContextChangedNotificationSchema: z.ZodObject<{
    method: z.ZodLiteral<"ui/notifications/host-context-changed">;
    params: z.ZodObject<{
        toolInfo: z.ZodOptional<z.ZodObject<{
            id: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
            tool: z.ZodObject<{
                description: z.ZodOptional<z.ZodString>;
                inputSchema: z.ZodObject<{
                    type: z.ZodLiteral<"object">;
                    properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodCustom<object, object>>>;
                    required: z.ZodOptional<z.ZodArray<z.ZodString>>;
                }, z.core.$catchall<z.ZodUnknown>>;
                outputSchema: z.ZodOptional<z.ZodObject<{
                    type: z.ZodLiteral<"object">;
                    properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodCustom<object, object>>>;
                    required: z.ZodOptional<z.ZodArray<z.ZodString>>;
                }, z.core.$catchall<z.ZodUnknown>>>;
                annotations: z.ZodOptional<z.ZodObject<{
                    title: z.ZodOptional<z.ZodString>;
                    readOnlyHint: z.ZodOptional<z.ZodBoolean>;
                    destructiveHint: z.ZodOptional<z.ZodBoolean>;
                    idempotentHint: z.ZodOptional<z.ZodBoolean>;
                    openWorldHint: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strip>>;
                execution: z.ZodOptional<z.ZodObject<{
                    taskSupport: z.ZodOptional<z.ZodEnum<{
                        optional: "optional";
                        required: "required";
                        forbidden: "forbidden";
                    }>>;
                }, z.core.$strip>>;
                _meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
                icons: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    src: z.ZodString;
                    mimeType: z.ZodOptional<z.ZodString>;
                    sizes: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    theme: z.ZodOptional<z.ZodEnum<{
                        light: "light";
                        dark: "dark";
                    }>>;
                }, z.core.$strip>>>;
                name: z.ZodString;
                title: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
        }, z.core.$strip>>;
        theme: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"light">, z.ZodLiteral<"dark">]>>;
        styles: z.ZodOptional<z.ZodObject<{
            variables: z.ZodOptional<z.ZodRecord<z.ZodUnion<readonly [z.ZodLiteral<"--color-background-primary">, z.ZodLiteral<"--color-background-secondary">, z.ZodLiteral<"--color-background-tertiary">, z.ZodLiteral<"--color-background-inverse">, z.ZodLiteral<"--color-background-ghost">, z.ZodLiteral<"--color-background-info">, z.ZodLiteral<"--color-background-danger">, z.ZodLiteral<"--color-background-success">, z.ZodLiteral<"--color-background-warning">, z.ZodLiteral<"--color-background-disabled">, z.ZodLiteral<"--color-text-primary">, z.ZodLiteral<"--color-text-secondary">, z.ZodLiteral<"--color-text-tertiary">, z.ZodLiteral<"--color-text-inverse">, z.ZodLiteral<"--color-text-ghost">, z.ZodLiteral<"--color-text-info">, z.ZodLiteral<"--color-text-danger">, z.ZodLiteral<"--color-text-success">, z.ZodLiteral<"--color-text-warning">, z.ZodLiteral<"--color-text-disabled">, z.ZodLiteral<"--color-border-primary">, z.ZodLiteral<"--color-border-secondary">, z.ZodLiteral<"--color-border-tertiary">, z.ZodLiteral<"--color-border-inverse">, z.ZodLiteral<"--color-border-ghost">, z.ZodLiteral<"--color-border-info">, z.ZodLiteral<"--color-border-danger">, z.ZodLiteral<"--color-border-success">, z.ZodLiteral<"--color-border-warning">, z.ZodLiteral<"--color-border-disabled">, z.ZodLiteral<"--color-ring-primary">, z.ZodLiteral<"--color-ring-secondary">, z.ZodLiteral<"--color-ring-inverse">, z.ZodLiteral<"--color-ring-info">, z.ZodLiteral<"--color-ring-danger">, z.ZodLiteral<"--color-ring-success">, z.ZodLiteral<"--color-ring-warning">, z.ZodLiteral<"--font-sans">, z.ZodLiteral<"--font-mono">, z.ZodLiteral<"--font-weight-normal">, z.ZodLiteral<"--font-weight-medium">, z.ZodLiteral<"--font-weight-semibold">, z.ZodLiteral<"--font-weight-bold">, z.ZodLiteral<"--font-text-xs-size">, z.ZodLiteral<"--font-text-sm-size">, z.ZodLiteral<"--font-text-md-size">, z.ZodLiteral<"--font-text-lg-size">, z.ZodLiteral<"--font-heading-xs-size">, z.ZodLiteral<"--font-heading-sm-size">, z.ZodLiteral<"--font-heading-md-size">, z.ZodLiteral<"--font-heading-lg-size">, z.ZodLiteral<"--font-heading-xl-size">, z.ZodLiteral<"--font-heading-2xl-size">, z.ZodLiteral<"--font-heading-3xl-size">, z.ZodLiteral<"--font-text-xs-line-height">, z.ZodLiteral<"--font-text-sm-line-height">, z.ZodLiteral<"--font-text-md-line-height">, z.ZodLiteral<"--font-text-lg-line-height">, z.ZodLiteral<"--font-heading-xs-line-height">, z.ZodLiteral<"--font-heading-sm-line-height">, z.ZodLiteral<"--font-heading-md-line-height">, z.ZodLiteral<"--font-heading-lg-line-height">, z.ZodLiteral<"--font-heading-xl-line-height">, z.ZodLiteral<"--font-heading-2xl-line-height">, z.ZodLiteral<"--font-heading-3xl-line-height">, z.ZodLiteral<"--border-radius-xs">, z.ZodLiteral<"--border-radius-sm">, z.ZodLiteral<"--border-radius-md">, z.ZodLiteral<"--border-radius-lg">, z.ZodLiteral<"--border-radius-xl">, z.ZodLiteral<"--border-radius-full">, z.ZodLiteral<"--border-width-regular">, z.ZodLiteral<"--shadow-hairline">, z.ZodLiteral<"--shadow-sm">, z.ZodLiteral<"--shadow-md">, z.ZodLiteral<"--shadow-lg">]>, z.ZodUnion<readonly [z.ZodString, z.ZodUndefined]>>>;
            css: z.ZodOptional<z.ZodObject<{
                fonts: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
        }, z.core.$strip>>;
        displayMode: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"inline">, z.ZodLiteral<"fullscreen">, z.ZodLiteral<"pip">]>>;
        availableDisplayModes: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodLiteral<"inline">, z.ZodLiteral<"fullscreen">, z.ZodLiteral<"pip">]>>>;
        containerDimensions: z.ZodOptional<z.ZodIntersection<z.ZodUnion<readonly [z.ZodObject<{
            height: z.ZodNumber;
        }, z.core.$strip>, z.ZodObject<{
            maxHeight: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodUndefined]>>;
        }, z.core.$strip>]>, z.ZodUnion<readonly [z.ZodObject<{
            width: z.ZodNumber;
        }, z.core.$strip>, z.ZodObject<{
            maxWidth: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodUndefined]>>;
        }, z.core.$strip>]>>>;
        locale: z.ZodOptional<z.ZodString>;
        timeZone: z.ZodOptional<z.ZodString>;
        userAgent: z.ZodOptional<z.ZodString>;
        platform: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"web">, z.ZodLiteral<"desktop">, z.ZodLiteral<"mobile">]>>;
        deviceCapabilities: z.ZodOptional<z.ZodObject<{
            touch: z.ZodOptional<z.ZodBoolean>;
            hover: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
        safeAreaInsets: z.ZodOptional<z.ZodObject<{
            top: z.ZodNumber;
            right: z.ZodNumber;
            bottom: z.ZodNumber;
            left: z.ZodNumber;
        }, z.core.$strip>>;
    }, z.core.$loose>;
}, z.core.$strip>;
/**
 * @description Request to update the agent's context without requiring a follow-up action (View -> Host).
 *
 * Unlike `notifications/message` which is for debugging/logging, this request is intended
 * to update the Host's model context. Each request overwrites the previous context sent by the View.
 * Unlike messages, context updates do not trigger follow-ups.
 *
 * The host will typically defer sending the context to the model until the next user message
 * (including `ui/message`), and will only send the last update received.
 *
 * @see {@link app.App.updateModelContext `App.updateModelContext`} for the method that sends this request
 */
export declare const McpUiUpdateModelContextRequestSchema: z.ZodObject<{
    method: z.ZodLiteral<"ui/update-model-context">;
    params: z.ZodObject<{
        content: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
            type: z.ZodLiteral<"text">;
            text: z.ZodString;
            annotations: z.ZodOptional<z.ZodObject<{
                audience: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                    user: "user";
                    assistant: "assistant";
                }>>>;
                priority: z.ZodOptional<z.ZodNumber>;
                lastModified: z.ZodOptional<z.ZodISODateTime>;
            }, z.core.$strip>>;
            _meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"image">;
            data: z.ZodString;
            mimeType: z.ZodString;
            annotations: z.ZodOptional<z.ZodObject<{
                audience: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                    user: "user";
                    assistant: "assistant";
                }>>>;
                priority: z.ZodOptional<z.ZodNumber>;
                lastModified: z.ZodOptional<z.ZodISODateTime>;
            }, z.core.$strip>>;
            _meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"audio">;
            data: z.ZodString;
            mimeType: z.ZodString;
            annotations: z.ZodOptional<z.ZodObject<{
                audience: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                    user: "user";
                    assistant: "assistant";
                }>>>;
                priority: z.ZodOptional<z.ZodNumber>;
                lastModified: z.ZodOptional<z.ZodISODateTime>;
            }, z.core.$strip>>;
            _meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.core.$strip>, z.ZodObject<{
            uri: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            mimeType: z.ZodOptional<z.ZodString>;
            size: z.ZodOptional<z.ZodNumber>;
            annotations: z.ZodOptional<z.ZodObject<{
                audience: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                    user: "user";
                    assistant: "assistant";
                }>>>;
                priority: z.ZodOptional<z.ZodNumber>;
                lastModified: z.ZodOptional<z.ZodISODateTime>;
            }, z.core.$strip>>;
            _meta: z.ZodOptional<z.ZodObject<{}, z.core.$loose>>;
            icons: z.ZodOptional<z.ZodArray<z.ZodObject<{
                src: z.ZodString;
                mimeType: z.ZodOptional<z.ZodString>;
                sizes: z.ZodOptional<z.ZodArray<z.ZodString>>;
                theme: z.ZodOptional<z.ZodEnum<{
                    light: "light";
                    dark: "dark";
                }>>;
            }, z.core.$strip>>>;
            name: z.ZodString;
            title: z.ZodOptional<z.ZodString>;
            type: z.ZodLiteral<"resource_link">;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"resource">;
            resource: z.ZodUnion<readonly [z.ZodObject<{
                uri: z.ZodString;
                mimeType: z.ZodOptional<z.ZodString>;
                _meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
                text: z.ZodString;
            }, z.core.$strip>, z.ZodObject<{
                uri: z.ZodString;
                mimeType: z.ZodOptional<z.ZodString>;
                _meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
                blob: z.ZodString;
            }, z.core.$strip>]>;
            annotations: z.ZodOptional<z.ZodObject<{
                audience: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                    user: "user";
                    assistant: "assistant";
                }>>>;
                priority: z.ZodOptional<z.ZodNumber>;
                lastModified: z.ZodOptional<z.ZodISODateTime>;
            }, z.core.$strip>>;
            _meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.core.$strip>]>>>;
        structuredContent: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * @description Initialization request sent from View to Host.
 * @see {@link app!App.connect `App.connect`} for the method that sends this request
 */
export declare const McpUiInitializeRequestSchema: z.ZodObject<{
    method: z.ZodLiteral<"ui/initialize">;
    params: z.ZodObject<{
        appInfo: z.ZodObject<{
            version: z.ZodString;
            websiteUrl: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
            icons: z.ZodOptional<z.ZodArray<z.ZodObject<{
                src: z.ZodString;
                mimeType: z.ZodOptional<z.ZodString>;
                sizes: z.ZodOptional<z.ZodArray<z.ZodString>>;
                theme: z.ZodOptional<z.ZodEnum<{
                    light: "light";
                    dark: "dark";
                }>>;
            }, z.core.$strip>>>;
            name: z.ZodString;
            title: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        appCapabilities: z.ZodObject<{
            experimental: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
            tools: z.ZodOptional<z.ZodObject<{
                listChanged: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$strip>>;
            availableDisplayModes: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodLiteral<"inline">, z.ZodLiteral<"fullscreen">, z.ZodLiteral<"pip">]>>>;
        }, z.core.$strip>;
        protocolVersion: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * @description Initialization result returned from Host to View.
 * @see {@link McpUiInitializeRequest `McpUiInitializeRequest`}
 */
export declare const McpUiInitializeResultSchema: z.ZodObject<{
    protocolVersion: z.ZodString;
    hostInfo: z.ZodObject<{
        version: z.ZodString;
        websiteUrl: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        icons: z.ZodOptional<z.ZodArray<z.ZodObject<{
            src: z.ZodString;
            mimeType: z.ZodOptional<z.ZodString>;
            sizes: z.ZodOptional<z.ZodArray<z.ZodString>>;
            theme: z.ZodOptional<z.ZodEnum<{
                light: "light";
                dark: "dark";
            }>>;
        }, z.core.$strip>>>;
        name: z.ZodString;
        title: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    hostCapabilities: z.ZodObject<{
        experimental: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
        openLinks: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
        downloadFile: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
        serverTools: z.ZodOptional<z.ZodObject<{
            listChanged: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
        serverResources: z.ZodOptional<z.ZodObject<{
            listChanged: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
        logging: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
        sandbox: z.ZodOptional<z.ZodObject<{
            permissions: z.ZodOptional<z.ZodObject<{
                camera: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
                microphone: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
                geolocation: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
                clipboardWrite: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
            }, z.core.$strip>>;
            csp: z.ZodOptional<z.ZodObject<{
                connectDomains: z.ZodOptional<z.ZodArray<z.ZodString>>;
                resourceDomains: z.ZodOptional<z.ZodArray<z.ZodString>>;
                frameDomains: z.ZodOptional<z.ZodArray<z.ZodString>>;
                baseUriDomains: z.ZodOptional<z.ZodArray<z.ZodString>>;
            }, z.core.$strip>>;
        }, z.core.$strip>>;
        updateModelContext: z.ZodOptional<z.ZodObject<{
            text: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
            image: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
            audio: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
            resource: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
            resourceLink: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
            structuredContent: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
        }, z.core.$strip>>;
        message: z.ZodOptional<z.ZodObject<{
            text: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
            image: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
            audio: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
            resource: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
            resourceLink: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
            structuredContent: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
        }, z.core.$strip>>;
        sampling: z.ZodOptional<z.ZodObject<{
            tools: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
    hostContext: z.ZodObject<{
        toolInfo: z.ZodOptional<z.ZodObject<{
            id: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
            tool: z.ZodObject<{
                description: z.ZodOptional<z.ZodString>;
                inputSchema: z.ZodObject<{
                    type: z.ZodLiteral<"object">;
                    properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodCustom<object, object>>>;
                    required: z.ZodOptional<z.ZodArray<z.ZodString>>;
                }, z.core.$catchall<z.ZodUnknown>>;
                outputSchema: z.ZodOptional<z.ZodObject<{
                    type: z.ZodLiteral<"object">;
                    properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodCustom<object, object>>>;
                    required: z.ZodOptional<z.ZodArray<z.ZodString>>;
                }, z.core.$catchall<z.ZodUnknown>>>;
                annotations: z.ZodOptional<z.ZodObject<{
                    title: z.ZodOptional<z.ZodString>;
                    readOnlyHint: z.ZodOptional<z.ZodBoolean>;
                    destructiveHint: z.ZodOptional<z.ZodBoolean>;
                    idempotentHint: z.ZodOptional<z.ZodBoolean>;
                    openWorldHint: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$strip>>;
                execution: z.ZodOptional<z.ZodObject<{
                    taskSupport: z.ZodOptional<z.ZodEnum<{
                        optional: "optional";
                        required: "required";
                        forbidden: "forbidden";
                    }>>;
                }, z.core.$strip>>;
                _meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
                icons: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    src: z.ZodString;
                    mimeType: z.ZodOptional<z.ZodString>;
                    sizes: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    theme: z.ZodOptional<z.ZodEnum<{
                        light: "light";
                        dark: "dark";
                    }>>;
                }, z.core.$strip>>>;
                name: z.ZodString;
                title: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
        }, z.core.$strip>>;
        theme: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"light">, z.ZodLiteral<"dark">]>>;
        styles: z.ZodOptional<z.ZodObject<{
            variables: z.ZodOptional<z.ZodRecord<z.ZodUnion<readonly [z.ZodLiteral<"--color-background-primary">, z.ZodLiteral<"--color-background-secondary">, z.ZodLiteral<"--color-background-tertiary">, z.ZodLiteral<"--color-background-inverse">, z.ZodLiteral<"--color-background-ghost">, z.ZodLiteral<"--color-background-info">, z.ZodLiteral<"--color-background-danger">, z.ZodLiteral<"--color-background-success">, z.ZodLiteral<"--color-background-warning">, z.ZodLiteral<"--color-background-disabled">, z.ZodLiteral<"--color-text-primary">, z.ZodLiteral<"--color-text-secondary">, z.ZodLiteral<"--color-text-tertiary">, z.ZodLiteral<"--color-text-inverse">, z.ZodLiteral<"--color-text-ghost">, z.ZodLiteral<"--color-text-info">, z.ZodLiteral<"--color-text-danger">, z.ZodLiteral<"--color-text-success">, z.ZodLiteral<"--color-text-warning">, z.ZodLiteral<"--color-text-disabled">, z.ZodLiteral<"--color-border-primary">, z.ZodLiteral<"--color-border-secondary">, z.ZodLiteral<"--color-border-tertiary">, z.ZodLiteral<"--color-border-inverse">, z.ZodLiteral<"--color-border-ghost">, z.ZodLiteral<"--color-border-info">, z.ZodLiteral<"--color-border-danger">, z.ZodLiteral<"--color-border-success">, z.ZodLiteral<"--color-border-warning">, z.ZodLiteral<"--color-border-disabled">, z.ZodLiteral<"--color-ring-primary">, z.ZodLiteral<"--color-ring-secondary">, z.ZodLiteral<"--color-ring-inverse">, z.ZodLiteral<"--color-ring-info">, z.ZodLiteral<"--color-ring-danger">, z.ZodLiteral<"--color-ring-success">, z.ZodLiteral<"--color-ring-warning">, z.ZodLiteral<"--font-sans">, z.ZodLiteral<"--font-mono">, z.ZodLiteral<"--font-weight-normal">, z.ZodLiteral<"--font-weight-medium">, z.ZodLiteral<"--font-weight-semibold">, z.ZodLiteral<"--font-weight-bold">, z.ZodLiteral<"--font-text-xs-size">, z.ZodLiteral<"--font-text-sm-size">, z.ZodLiteral<"--font-text-md-size">, z.ZodLiteral<"--font-text-lg-size">, z.ZodLiteral<"--font-heading-xs-size">, z.ZodLiteral<"--font-heading-sm-size">, z.ZodLiteral<"--font-heading-md-size">, z.ZodLiteral<"--font-heading-lg-size">, z.ZodLiteral<"--font-heading-xl-size">, z.ZodLiteral<"--font-heading-2xl-size">, z.ZodLiteral<"--font-heading-3xl-size">, z.ZodLiteral<"--font-text-xs-line-height">, z.ZodLiteral<"--font-text-sm-line-height">, z.ZodLiteral<"--font-text-md-line-height">, z.ZodLiteral<"--font-text-lg-line-height">, z.ZodLiteral<"--font-heading-xs-line-height">, z.ZodLiteral<"--font-heading-sm-line-height">, z.ZodLiteral<"--font-heading-md-line-height">, z.ZodLiteral<"--font-heading-lg-line-height">, z.ZodLiteral<"--font-heading-xl-line-height">, z.ZodLiteral<"--font-heading-2xl-line-height">, z.ZodLiteral<"--font-heading-3xl-line-height">, z.ZodLiteral<"--border-radius-xs">, z.ZodLiteral<"--border-radius-sm">, z.ZodLiteral<"--border-radius-md">, z.ZodLiteral<"--border-radius-lg">, z.ZodLiteral<"--border-radius-xl">, z.ZodLiteral<"--border-radius-full">, z.ZodLiteral<"--border-width-regular">, z.ZodLiteral<"--shadow-hairline">, z.ZodLiteral<"--shadow-sm">, z.ZodLiteral<"--shadow-md">, z.ZodLiteral<"--shadow-lg">]>, z.ZodUnion<readonly [z.ZodString, z.ZodUndefined]>>>;
            css: z.ZodOptional<z.ZodObject<{
                fonts: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
        }, z.core.$strip>>;
        displayMode: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"inline">, z.ZodLiteral<"fullscreen">, z.ZodLiteral<"pip">]>>;
        availableDisplayModes: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodLiteral<"inline">, z.ZodLiteral<"fullscreen">, z.ZodLiteral<"pip">]>>>;
        containerDimensions: z.ZodOptional<z.ZodIntersection<z.ZodUnion<readonly [z.ZodObject<{
            height: z.ZodNumber;
        }, z.core.$strip>, z.ZodObject<{
            maxHeight: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodUndefined]>>;
        }, z.core.$strip>]>, z.ZodUnion<readonly [z.ZodObject<{
            width: z.ZodNumber;
        }, z.core.$strip>, z.ZodObject<{
            maxWidth: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodUndefined]>>;
        }, z.core.$strip>]>>>;
        locale: z.ZodOptional<z.ZodString>;
        timeZone: z.ZodOptional<z.ZodString>;
        userAgent: z.ZodOptional<z.ZodString>;
        platform: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"web">, z.ZodLiteral<"desktop">, z.ZodLiteral<"mobile">]>>;
        deviceCapabilities: z.ZodOptional<z.ZodObject<{
            touch: z.ZodOptional<z.ZodBoolean>;
            hover: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
        safeAreaInsets: z.ZodOptional<z.ZodObject<{
            top: z.ZodNumber;
            right: z.ZodNumber;
            bottom: z.ZodNumber;
            left: z.ZodNumber;
        }, z.core.$strip>>;
    }, z.core.$loose>;
}, z.core.$loose>;
