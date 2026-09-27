import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { CallToolRequest, CallToolResult, CreateMessageRequest, CreateMessageResult, CreateMessageResultWithTools, EmptyResult, Implementation, ListPromptsRequest, ListPromptsResult, ListResourcesRequest, ListResourcesResult, ListResourceTemplatesRequest, ListResourceTemplatesResult, ListToolsRequest, LoggingMessageNotification, PingRequest, PromptListChangedNotification, ReadResourceRequest, ReadResourceResult, ResourceListChangedNotification, Tool, ToolListChangedNotification } from "@modelcontextprotocol/sdk/types.js";
import { Protocol, ProtocolOptions, RequestOptions } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { ProtocolWithEvents } from "./events";
import { type AppNotification, type AppRequest, type AppResult, type McpUiSandboxResourceReadyNotification, type McpUiSizeChangedNotification, type McpUiToolCancelledNotification, type McpUiToolInputNotification, type McpUiToolInputPartialNotification, type McpUiToolResultNotification, McpUiAppCapabilities, McpUiUpdateModelContextRequest, McpUiHostCapabilities, McpUiHostContext, McpUiHostContextChangedNotification, McpUiInitializedNotification, McpUiMessageRequest, McpUiMessageResult, McpUiOpenLinkRequest, McpUiOpenLinkResult, McpUiDownloadFileRequest, McpUiDownloadFileResult, McpUiResourceTeardownRequest, McpUiRequestTeardownNotification, McpUiSandboxProxyReadyNotification, McpUiRequestDisplayModeRequest, McpUiRequestDisplayModeResult, McpUiResourcePermissions } from "./types";
export * from "./types";
export { RESOURCE_URI_META_KEY, RESOURCE_MIME_TYPE } from "./app";
export { PostMessageTransport } from "./message-transport";
/**
 * Extract UI resource URI from tool metadata.
 *
 * Supports both the new nested format (`_meta.ui.resourceUri`) and the
 * deprecated flat format (`_meta["ui/resourceUri"]`). The new nested format
 * takes precedence if both are present.
 *
 * @param tool - A tool object with optional `_meta` property
 * @returns The UI resource URI if valid, undefined if not present
 * @throws Error if resourceUri is present but invalid (does not start with "ui://")
 *
 * @example
 * ```typescript
 * // New nested format (preferred)
 * const uri = getToolUiResourceUri({
 *   _meta: { ui: { resourceUri: "ui://server/app.html" } }
 * });
 *
 * // Deprecated flat format (still supported)
 * const uri = getToolUiResourceUri({
 *   _meta: { "ui/resourceUri": "ui://server/app.html" }
 * });
 * ```
 */
export declare function getToolUiResourceUri(tool: Partial<Tool>): string | undefined;
/**
 * Check if a tool is visible to the model only.
 *
 * @param tool - Tool object with visibility metadata
 * @returns True if the tool is visible to the model only, false otherwise
 */
export declare function isToolVisibilityModelOnly(tool: Partial<Tool>): boolean;
/**
 * Check if a tool is visible to the app only.
 *
 * @param tool - Tool object with visibility metadata
 * @returns True if the tool is visible to the app only, false otherwise
 */
export declare function isToolVisibilityAppOnly(tool: Partial<Tool>): boolean;
/**
 * Build iframe `allow` attribute string from permissions.
 *
 * Maps McpUiResourcePermissions to the Permission Policy allow attribute
 * format used by iframes (e.g., "microphone; clipboard-write").
 *
 * @param permissions - Permissions requested by the UI resource
 * @returns Space-separated permission directives, or empty string if none
 *
 * @example
 * ```typescript
 * const allow = buildAllowAttribute({ microphone: {}, clipboardWrite: {} });
 * // Returns: "microphone; clipboard-write"
 * iframe.setAttribute("allow", allow);
 * ```
 */
export declare function buildAllowAttribute(permissions: McpUiResourcePermissions | undefined): string;
/**
 * Options for configuring {@link AppBridge `AppBridge`} behavior.
 *
 * @property hostContext - Optional initial host context to provide to the view
 *
 * @see `ProtocolOptions` from @modelcontextprotocol/sdk for available options
 * @see {@link McpUiHostContext `McpUiHostContext`} for the hostContext structure
 */
export type HostOptions = ProtocolOptions & {
    hostContext?: McpUiHostContext;
};
/**
 * Protocol versions supported by this AppBridge implementation.
 *
 * The SDK automatically handles version negotiation during initialization.
 * Hosts don't need to manage protocol versions manually.
 */
export declare const SUPPORTED_PROTOCOL_VERSIONS: string[];
/**
 * Extra metadata passed to request handlers.
 *
 * This type represents the additional context provided by the `Protocol` class
 * when handling requests, including abort signals and session information.
 * It is extracted from the MCP SDK's request handler signature.
 *
 * @internal
 */
type RequestHandlerExtra = Parameters<Parameters<AppBridge["setRequestHandler"]>[1]>[1];
/**
 * Maps DOM-style event names to their notification `params` types.
 *
 * Used by {@link AppBridge `AppBridge`} to provide type-safe
 * `addEventListener` / `removeEventListener` and singular `on*` handler
 * support.
 */
export type AppBridgeEventMap = {
    sizechange: McpUiSizeChangedNotification["params"];
    sandboxready: McpUiSandboxProxyReadyNotification["params"];
    initialized: McpUiInitializedNotification["params"];
    requestteardown: McpUiRequestTeardownNotification["params"];
    loggingmessage: LoggingMessageNotification["params"];
};
/**
 * Host-side bridge for communicating with a single View ({@link app!App `App`}).
 *
 * `AppBridge` extends the MCP SDK's `Protocol` class and acts as a proxy between
 * the host application and a view running in an iframe. When an MCP client
 * is provided to the constructor, it automatically forwards MCP server capabilities
 * (tools, resources, prompts) to the view. It also handles the initialization
 * handshake.
 *
 * ## Architecture
 *
 * **View ↔ AppBridge ↔ Host ↔ MCP Server**
 *
 * The bridge proxies requests from the view to the MCP server and forwards
 * responses back. It also sends host-initiated notifications like tool input
 * and results to the view.
 *
 * ## Lifecycle
 *
 * 1. **Create**: Instantiate `AppBridge` with MCP client and capabilities
 * 2. **Connect**: Call `connect()` with transport to establish communication
 * 3. **Wait for init**: View sends initialize request, bridge responds
 * 4. **Send data**: Call {@link sendToolInput `sendToolInput`}, {@link sendToolResult `sendToolResult`}, etc.
 * 5. **Teardown**: Call {@link teardownResource `teardownResource`} before unmounting iframe
 *
 * @example Basic usage
 * ```ts source="./app-bridge.examples.ts#AppBridge_basicUsage"
 * // Create MCP client for the server
 * const client = new Client({
 *   name: "MyHost",
 *   version: "1.0.0",
 * });
 * await client.connect(serverTransport);
 *
 * // Create bridge for the View
 * const bridge = new AppBridge(
 *   client,
 *   { name: "MyHost", version: "1.0.0" },
 *   { openLinks: {}, serverTools: {}, logging: {} },
 * );
 *
 * // Set up iframe and connect
 * const iframe = document.getElementById("app") as HTMLIFrameElement;
 * const transport = new PostMessageTransport(
 *   iframe.contentWindow!,
 *   iframe.contentWindow!,
 * );
 *
 * bridge.oninitialized = () => {
 *   console.log("View initialized");
 *   // Now safe to send tool input
 *   bridge.sendToolInput({ arguments: { location: "NYC" } });
 * };
 *
 * await bridge.connect(transport);
 * ```
 */
export declare class AppBridge extends ProtocolWithEvents<AppRequest, AppNotification, AppResult, AppBridgeEventMap> {
    private _client;
    private _hostInfo;
    private _capabilities;
    private _appCapabilities?;
    private _hostContext;
    private _appInfo?;
    private _initializedReceived;
    /**
     * Wrap every handler registered via `replaceRequestHandler` with a check
     * that the View has sent `ui/notifications/initialized`. Warns (never
     * throws) so lenient hosts keep working while still surfacing the
     * misordering that leaves strict hosts with a permanently hidden iframe.
     * `ui/initialize` and `ping` use `setRequestHandler` directly and are
     * intentionally exempt.
     *
     * @see {@link https://github.com/anthropics/claude-ai-mcp/issues/149 claude-ai-mcp#149}
     */
    private _baseReplaceRequestHandler;
    protected replaceRequestHandler: Protocol<AppRequest, AppNotification, AppResult>["setRequestHandler"];
    protected readonly eventSchemas: {
        sizechange: import("zod").ZodObject<{
            method: import("zod").ZodLiteral<"ui/notifications/size-changed">;
            params: import("zod").ZodObject<{
                width: import("zod").ZodOptional<import("zod").ZodNumber>;
                height: import("zod").ZodOptional<import("zod").ZodNumber>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip>;
        sandboxready: import("zod").ZodObject<{
            method: import("zod").ZodLiteral<"ui/notifications/sandbox-proxy-ready">;
            params: import("zod").ZodObject<{}, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip>;
        initialized: import("zod").ZodObject<{
            method: import("zod").ZodLiteral<"ui/notifications/initialized">;
            params: import("zod").ZodOptional<import("zod").ZodObject<{}, import("zod/v4/core").$strip>>;
        }, import("zod/v4/core").$strip>;
        requestteardown: import("zod").ZodObject<{
            method: import("zod").ZodLiteral<"ui/notifications/request-teardown">;
            params: import("zod").ZodOptional<import("zod").ZodObject<{}, import("zod/v4/core").$strip>>;
        }, import("zod/v4/core").$strip>;
        loggingmessage: import("zod").ZodObject<{
            method: import("zod").ZodLiteral<"notifications/message">;
            params: import("zod").ZodObject<{
                _meta: import("zod").ZodOptional<import("zod").ZodObject<{
                    progressToken: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodString, import("zod").ZodNumber]>>;
                    "io.modelcontextprotocol/related-task": import("zod").ZodOptional<import("zod").ZodObject<{
                        taskId: import("zod").ZodString;
                    }, import("zod/v4/core").$strip>>;
                }, import("zod/v4/core").$loose>>;
                level: import("zod").ZodEnum<{
                    error: "error";
                    debug: "debug";
                    info: "info";
                    notice: "notice";
                    warning: "warning";
                    critical: "critical";
                    alert: "alert";
                    emergency: "emergency";
                }>;
                logger: import("zod").ZodOptional<import("zod").ZodString>;
                data: import("zod").ZodUnknown;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip>;
    };
    /**
     * Create a new AppBridge instance.
     *
     * @param _client - MCP client connected to the server, or `null`. When provided,
     *   {@link connect `connect`} will automatically set up forwarding of MCP requests/notifications
     *   between the View and the server. When `null`, you must register handlers
     *   manually using the {@link oncalltool `oncalltool`}, {@link onlistresources `onlistresources`}, etc. setters.
     * @param _hostInfo - Host application identification (name and version)
     * @param _capabilities - Features and capabilities the host supports
     * @param options - Configuration options (inherited from Protocol)
     *
     * @example With MCP client (automatic forwarding)
     * ```ts source="./app-bridge.examples.ts#AppBridge_constructor_withMcpClient"
     * const bridge = new AppBridge(
     *   mcpClient,
     *   { name: "MyHost", version: "1.0.0" },
     *   { openLinks: {}, serverTools: {}, logging: {} },
     * );
     * ```
     *
     * @example Without MCP client (manual handlers)
     * ```ts source="./app-bridge.examples.ts#AppBridge_constructor_withoutMcpClient"
     * const bridge = new AppBridge(
     *   null,
     *   { name: "MyHost", version: "1.0.0" },
     *   { openLinks: {}, serverTools: {}, logging: {} },
     * );
     * bridge.oncalltool = async (params, extra) => {
     *   // Handle tool calls manually
     *   return { content: [] };
     * };
     * ```
     */
    constructor(_client: Client | null, _hostInfo: Implementation, _capabilities: McpUiHostCapabilities, options?: HostOptions);
    /**
     * Get the view's capabilities discovered during initialization.
     *
     * Returns the capabilities that the view advertised during its
     * initialization request. Returns `undefined` if called before
     * initialization completes.
     *
     * @returns view capabilities, or `undefined` if not yet initialized
     *
     * @example Check view capabilities after initialization
     * ```ts source="./app-bridge.examples.ts#AppBridge_getAppCapabilities_checkAfterInit"
     * bridge.oninitialized = () => {
     *   const caps = bridge.getAppCapabilities();
     *   if (caps?.tools) {
     *     console.log("View provides tools");
     *   }
     * };
     * ```
     *
     * @see {@link McpUiAppCapabilities `McpUiAppCapabilities`} for the capabilities structure
     */
    getAppCapabilities(): McpUiAppCapabilities | undefined;
    /**
     * Get the view's implementation info discovered during initialization.
     *
     * Returns the view's name and version as provided in its initialization
     * request. Returns `undefined` if called before initialization completes.
     *
     * @returns view implementation info, or `undefined` if not yet initialized
     *
     * @example Log view information after initialization
     * ```ts source="./app-bridge.examples.ts#AppBridge_getAppVersion_logAfterInit"
     * bridge.oninitialized = () => {
     *   const appInfo = bridge.getAppVersion();
     *   if (appInfo) {
     *     console.log(`View: ${appInfo.name} v${appInfo.version}`);
     *   }
     * };
     * ```
     */
    getAppVersion(): Implementation | undefined;
    /**
     * Optional handler for ping requests from the view.
     *
     * The View can send standard MCP `ping` requests to verify the connection
     * is alive. The {@link AppBridge `AppBridge`} automatically responds with an empty object, but this
     * handler allows the host to observe or log ping activity.
     *
     * Unlike the other handlers which use setters, this is a direct property
     * assignment. It is optional; if not set, pings are still handled automatically.
     *
     * @param params - Empty params object from the ping request
     * @param extra - Request metadata (abort signal, session info)
     *
     * @example
     * ```ts source="./app-bridge.examples.ts#AppBridge_onping_handleRequest"
     * bridge.onping = (params, extra) => {
     *   console.log("Received ping from view");
     * };
     * ```
     */
    onping?: (params: PingRequest["params"], extra: RequestHandlerExtra) => void;
    /**
     * Register a handler for size change notifications from the view.
     *
     * The view sends `ui/notifications/size-changed` when its rendered content
     * size changes, typically via `ResizeObserver`. Set this callback to dynamically
     * adjust the iframe container dimensions based on the view's content.
     *
     * Note: This is for View → Host communication. To notify the View of
     * host container dimension changes, use {@link setHostContext `setHostContext`}.
     *
     * @example
     * ```ts source="./app-bridge.examples.ts#AppBridge_onsizechange_handleResize"
     * bridge.onsizechange = ({ width, height }) => {
     *   if (width != null) {
     *     iframe.style.width = `${width}px`;
     *   }
     *   if (height != null) {
     *     iframe.style.height = `${height}px`;
     *   }
     * };
     * ```
     *
     * @see {@link McpUiSizeChangedNotification `McpUiSizeChangedNotification`} for the notification type
     * @see {@link app!App.sendSizeChanged `App.sendSizeChanged`} - the View method that sends these notifications
     * @deprecated Use {@link addEventListener `addEventListener("sizechange", handler)`} instead — it composes with other listeners and supports cleanup via {@link removeEventListener `removeEventListener`}.
     */
    get onsizechange(): ((params: McpUiSizeChangedNotification["params"]) => void) | undefined;
    set onsizechange(callback: ((params: McpUiSizeChangedNotification["params"]) => void) | undefined);
    /**
     * Register a handler for sandbox proxy ready notifications.
     *
     * This is an internal callback used by web-based hosts implementing the
     * double-iframe sandbox architecture. The sandbox proxy sends
     * `ui/notifications/sandbox-proxy-ready` after it loads and is ready to receive
     * HTML content.
     *
     * When this fires, the host should call {@link sendSandboxResourceReady `sendSandboxResourceReady`} with
     * the HTML content to load into the inner sandboxed iframe.
     *
     * @example
     * ```typescript
     * bridge.onsandboxready = async () => {
     *   const resource = await mcpClient.request(
     *     { method: "resources/read", params: { uri: "ui://my-app" } },
     *     ReadResourceResultSchema
     *   );
     *
     *   bridge.sendSandboxResourceReady({
     *     html: resource.contents[0].text,
     *     sandbox: "allow-scripts"
     *   });
     * };
     * ```
     *
     * @internal
     * @see {@link McpUiSandboxProxyReadyNotification `McpUiSandboxProxyReadyNotification`} for the notification type
     * @see {@link sendSandboxResourceReady `sendSandboxResourceReady`} for sending content to the sandbox
     * @deprecated Use {@link addEventListener `addEventListener("sandboxready", handler)`} instead — it composes with other listeners and supports cleanup via {@link removeEventListener `removeEventListener`}.
     */
    get onsandboxready(): ((params: McpUiSandboxProxyReadyNotification["params"]) => void) | undefined;
    set onsandboxready(callback: ((params: McpUiSandboxProxyReadyNotification["params"]) => void) | undefined);
    /**
     * Called when the view completes initialization.
     *
     * Set this callback to be notified when the view has finished its
     * initialization handshake and is ready to receive tool input and other data.
     *
     * @example
     * ```ts source="./app-bridge.examples.ts#AppBridge_oninitialized_sendToolInput"
     * bridge.oninitialized = () => {
     *   console.log("View ready");
     *   bridge.sendToolInput({ arguments: toolArgs });
     * };
     * ```
     *
     * @see {@link McpUiInitializedNotification `McpUiInitializedNotification`} for the notification type
     * @see {@link sendToolInput `sendToolInput`} for sending tool arguments to the View
     * @deprecated Use {@link addEventListener `addEventListener("initialized", handler)`} instead — it composes with other listeners and supports cleanup via {@link removeEventListener `removeEventListener`}.
     */
    get oninitialized(): ((params: McpUiInitializedNotification["params"]) => void) | undefined;
    set oninitialized(callback: ((params: McpUiInitializedNotification["params"]) => void) | undefined);
    /**
     * Register a handler for message requests from the view.
     *
     * The view sends `ui/message` requests when it wants to add a message to
     * the host's chat interface. This enables interactive apps to communicate with
     * the user through the conversation thread.
     *
     * The handler should process the message (add it to the chat) and return a
     * result indicating success or failure. For security, the host should NOT
     * return conversation content or follow-up results to prevent information
     * leakage.
     *
     * @param callback - Handler that receives message params and returns a result
     *   - `params.role` - Message role (currently only "user" is supported)
     *   - `params.content` - Message content blocks (text, image, etc.)
     *   - `extra` - Request metadata (abort signal, session info)
     *   - Returns: `Promise<McpUiMessageResult>` with optional `isError` flag
     *
     * @example
     * ```ts source="./app-bridge.examples.ts#AppBridge_onmessage_logMessage"
     * bridge.onmessage = async ({ role, content }, extra) => {
     *   try {
     *     await chatManager.addMessage({ role, content, source: "app" });
     *     return {}; // Success
     *   } catch (error) {
     *     console.error("Failed to add message:", error);
     *     return { isError: true };
     *   }
     * };
     * ```
     *
     * @see {@link McpUiMessageRequest `McpUiMessageRequest`} for the request type
     * @see {@link McpUiMessageResult `McpUiMessageResult`} for the result type
     */
    private _onmessage?;
    get onmessage(): ((params: McpUiMessageRequest["params"], extra: RequestHandlerExtra) => Promise<McpUiMessageResult>) | undefined;
    set onmessage(callback: ((params: McpUiMessageRequest["params"], extra: RequestHandlerExtra) => Promise<McpUiMessageResult>) | undefined);
    /**
     * Register a handler for external link requests from the view.
     *
     * The view sends `ui/open-link` requests when it wants to open an external
     * URL in the host's default browser. The handler should validate the URL and
     * open it according to the host's security policy and user preferences.
     *
     * The host MAY:
     * - Show a confirmation dialog before opening
     * - Block URLs based on a security policy or allowlist
     * - Log the request for audit purposes
     * - Reject the request entirely
     *
     * @param callback - Handler that receives URL params and returns a result
     *   - `params.url` - URL to open in the host's browser
     *   - `extra` - Request metadata (abort signal, session info)
     *   - Returns: `Promise<McpUiOpenLinkResult>` with optional `isError` flag
     *
     * @example
     * ```ts source="./app-bridge.examples.ts#AppBridge_onopenlink_handleRequest"
     * bridge.onopenlink = async ({ url }, extra) => {
     *   if (!isAllowedDomain(url)) {
     *     console.warn("Blocked external link:", url);
     *     return { isError: true };
     *   }
     *
     *   const confirmed = await showDialog({
     *     message: `Open external link?\n${url}`,
     *     buttons: ["Open", "Cancel"],
     *   });
     *
     *   if (confirmed) {
     *     window.open(url, "_blank", "noopener,noreferrer");
     *     return {};
     *   }
     *
     *   return { isError: true };
     * };
     * ```
     *
     * @see {@link McpUiOpenLinkRequest `McpUiOpenLinkRequest`} for the request type
     * @see {@link McpUiOpenLinkResult `McpUiOpenLinkResult`} for the result type
     */
    private _onopenlink?;
    get onopenlink(): ((params: McpUiOpenLinkRequest["params"], extra: RequestHandlerExtra) => Promise<McpUiOpenLinkResult>) | undefined;
    set onopenlink(callback: ((params: McpUiOpenLinkRequest["params"], extra: RequestHandlerExtra) => Promise<McpUiOpenLinkResult>) | undefined);
    /**
     * Register a handler for file download requests from the View.
     *
     * The View sends `ui/download-file` requests when the user wants to
     * download a file. The params contain an array of MCP resource content
     * items — either `EmbeddedResource` (inline data) or `ResourceLink`
     * (URI the host can fetch). The host should show a confirmation dialog
     * and then trigger the download.
     *
     * @param callback - Handler that receives download params and returns a result
     *   - `params.contents` - Array of `EmbeddedResource` or `ResourceLink` items
     *   - `extra` - Request metadata (abort signal, session info)
     *   - Returns: `Promise<McpUiDownloadFileResult>` with optional `isError` flag
     *
     * @example
     * ```ts
     * bridge.ondownloadfile = async ({ contents }, extra) => {
     *   for (const item of contents) {
     *     if (item.type === "resource") {
     *       // EmbeddedResource — inline content
     *       const res = item.resource;
     *       const blob = res.blob
     *         ? new Blob([Uint8Array.from(atob(res.blob), c => c.charCodeAt(0))], { type: res.mimeType })
     *         : new Blob([res.text ?? ""], { type: res.mimeType });
     *       const url = URL.createObjectURL(blob);
     *       const link = document.createElement("a");
     *       link.href = url;
     *       link.download = res.uri.split("/").pop() ?? "download";
     *       link.click();
     *       URL.revokeObjectURL(url);
     *     } else if (item.type === "resource_link") {
     *       // ResourceLink — host fetches or opens directly
     *       window.open(item.uri, "_blank");
     *     }
     *   }
     *   return {};
     * };
     * ```
     *
     * @see {@link McpUiDownloadFileRequest `McpUiDownloadFileRequest`} for the request type
     * @see {@link McpUiDownloadFileResult `McpUiDownloadFileResult`} for the result type
     */
    private _ondownloadfile?;
    get ondownloadfile(): ((params: McpUiDownloadFileRequest["params"], extra: RequestHandlerExtra) => Promise<McpUiDownloadFileResult>) | undefined;
    set ondownloadfile(callback: ((params: McpUiDownloadFileRequest["params"], extra: RequestHandlerExtra) => Promise<McpUiDownloadFileResult>) | undefined);
    /**
     * Register a handler for app-initiated teardown request notifications from the view.
     *
     * The view sends `ui/notifications/request-teardown` when it wants the host to tear it down.
     * If the host decides to proceed, it should send
     * `ui/resource-teardown` (via {@link teardownResource `teardownResource`}) to allow
     * the view to perform gracefull termination, then unmount the iframe after the view responds.
     *
     * @example
     * ```typescript
     * bridge.onrequestteardown = async (params) => {
     *   console.log("App requested teardown");
     *   // Initiate teardown to allow the app to persist unsaved state
     *   // Alternatively, the callback can early return to prevent teardown
     *   await bridge.teardownResource({});
     *   // Now safe to unmount the iframe
     *   iframe.remove();
     * };
     * ```
     *
     * @see {@link McpUiRequestTeardownNotification `McpUiRequestTeardownNotification`} for the notification type
     * @see {@link teardownResource `teardownResource`} for initiating teardown
     * @deprecated Use {@link addEventListener `addEventListener("requestteardown", handler)`} instead — it composes with other listeners and supports cleanup via {@link removeEventListener `removeEventListener`}.
     */
    get onrequestteardown(): ((params: McpUiRequestTeardownNotification["params"]) => void) | undefined;
    set onrequestteardown(callback: ((params: McpUiRequestTeardownNotification["params"]) => void) | undefined);
    /**
     * Register a handler for display mode change requests from the view.
     *
     * The view sends `ui/request-display-mode` requests when it wants to change
     * its display mode (e.g., from "inline" to "fullscreen"). The handler should
     * check if the requested mode is in `availableDisplayModes` from the host context,
     * update the display mode if supported, and return the actual mode that was set.
     *
     * If the requested mode is not available, the handler should return the current
     * display mode instead.
     *
     * By default, `AppBridge` returns the current `displayMode` from host context (or "inline").
     * Setting this property replaces that default behavior.
     *
     * @param callback - Handler that receives the requested mode and returns the actual mode set
     *   - `params.mode` - The display mode being requested ("inline" | "fullscreen" | "pip")
     *   - `extra` - Request metadata (abort signal, session info)
     *   - Returns: `Promise<McpUiRequestDisplayModeResult>` with the actual mode set
     *
     * @example
     * ```ts source="./app-bridge.examples.ts#AppBridge_onrequestdisplaymode_handleRequest"
     * bridge.onrequestdisplaymode = async ({ mode }, extra) => {
     *   if (availableDisplayModes.includes(mode)) {
     *     currentDisplayMode = mode;
     *   }
     *   return { mode: currentDisplayMode };
     * };
     * ```
     *
     * @see {@link McpUiRequestDisplayModeRequest `McpUiRequestDisplayModeRequest`} for the request type
     * @see {@link McpUiRequestDisplayModeResult `McpUiRequestDisplayModeResult`} for the result type
     */
    private _onrequestdisplaymode?;
    get onrequestdisplaymode(): ((params: McpUiRequestDisplayModeRequest["params"], extra: RequestHandlerExtra) => Promise<McpUiRequestDisplayModeResult>) | undefined;
    set onrequestdisplaymode(callback: ((params: McpUiRequestDisplayModeRequest["params"], extra: RequestHandlerExtra) => Promise<McpUiRequestDisplayModeResult>) | undefined);
    /**
     * Register a handler for logging messages from the view.
     *
     * The view sends standard MCP `notifications/message` (logging) notifications
     * to report debugging information, errors, warnings, and other telemetry to the
     * host. The host can display these in a console, log them to a file, or send
     * them to a monitoring service.
     *
     * This uses the standard MCP logging notification format, not a UI-specific
     * message type.
     *
     * The handler receives `LoggingMessageNotification["params"]`:
     *   - `level` — "debug" | "info" | "notice" | "warning" | "error" | "critical" | "alert" | "emergency"
     *   - `logger` — optional logger name/identifier
     *   - `data` — log message and optional structured data
     *
     * @example
     * ```ts source="./app-bridge.examples.ts#AppBridge_onloggingmessage_handleLog"
     * bridge.onloggingmessage = ({ level, logger, data }) => {
     *   console[level === "error" ? "error" : "log"](
     *     `[${logger ?? "View"}] ${level.toUpperCase()}:`,
     *     data,
     *   );
     * };
     * ```
     * @deprecated Use {@link addEventListener `addEventListener("loggingmessage", handler)`} instead — it composes with other listeners and supports cleanup via {@link removeEventListener `removeEventListener`}.
     */
    get onloggingmessage(): ((params: LoggingMessageNotification["params"]) => void) | undefined;
    set onloggingmessage(callback: ((params: LoggingMessageNotification["params"]) => void) | undefined);
    /**
     * Register a handler for model context updates from the view.
     *
     * The view sends `ui/update-model-context` requests to update the Host's
     * model context. Each request overwrites the previous context stored by the view.
     * Unlike logging messages, context updates are intended to be available to
     * the model in future turns. Unlike messages, context updates do not trigger follow-ups.
     *
     * The host will typically defer sending the context to the model until the
     * next user message (including `ui/message`), and will only send the last
     * update received.
     *
     * @example
     * ```ts source="./app-bridge.examples.ts#AppBridge_onupdatemodelcontext_storeContext"
     * bridge.onupdatemodelcontext = async (
     *   { content, structuredContent },
     *   extra,
     * ) => {
     *   // Store the context snapshot for inclusion in the next model request
     *   modelContextManager.update({ content, structuredContent });
     *   return {};
     * };
     * ```
     *
     * @see {@link McpUiUpdateModelContextRequest `McpUiUpdateModelContextRequest`} for the request type
     */
    private _onupdatemodelcontext?;
    get onupdatemodelcontext(): ((params: McpUiUpdateModelContextRequest["params"], extra: RequestHandlerExtra) => Promise<EmptyResult>) | undefined;
    set onupdatemodelcontext(callback: ((params: McpUiUpdateModelContextRequest["params"], extra: RequestHandlerExtra) => Promise<EmptyResult>) | undefined);
    /**
     * Register a handler for tool call requests from the view.
     *
     * The view sends `tools/call` requests to execute MCP server tools. This
     * handler allows the host to intercept and process these requests, typically
     * by forwarding them to the MCP server.
     *
     * @param callback - Handler that receives tool call params and returns a
     *   `CallToolResult`
     *   - `params` - Tool call parameters (name and arguments)
     *   - `extra` - Request metadata (abort signal, session info)
     *
     * @example
     * ```ts source="./app-bridge.examples.ts#AppBridge_oncalltool_forwardToServer"
     * bridge.oncalltool = async (params, extra) => {
     *   return mcpClient.request(
     *     { method: "tools/call", params },
     *     CallToolResultSchema,
     *     { signal: extra.signal },
     *   );
     * };
     * ```
     *
     * @see `CallToolRequest` from @modelcontextprotocol/sdk for the request type
     * @see `CallToolResult` from @modelcontextprotocol/sdk for the result type
     */
    private _oncalltool?;
    get oncalltool(): ((params: CallToolRequest["params"], extra: RequestHandlerExtra) => Promise<CallToolResult>) | undefined;
    set oncalltool(callback: ((params: CallToolRequest["params"], extra: RequestHandlerExtra) => Promise<CallToolResult>) | undefined);
    /**
     * Register a handler for LLM sampling requests from the view.
     *
     * The view sends standard MCP `sampling/createMessage` requests to obtain
     * LLM completions via the host's model connection. The host has full
     * discretion over which model to use and SHOULD apply rate limiting,
     * cost controls, and user approval (human-in-the-loop) before sampling.
     *
     * Hosts that register this handler SHOULD advertise `sampling` (and
     * `sampling.tools` if tool-calling is supported) in
     * {@link McpUiHostCapabilities `McpUiHostCapabilities`}.
     *
     * @param callback - Handler that receives `CreateMessageRequest` params and
     *   returns a `CreateMessageResult` (or `CreateMessageResultWithTools` when
     *   `params.tools` was provided)
     *   - `params` - Standard MCP sampling params (messages, maxTokens, tools, etc.)
     *   - `extra` - Request metadata (abort signal, session info)
     *
     * @example Forward to your LLM provider
     * ```ts source="./app-bridge.examples.ts#AppBridge_oncreatesamplingmessage_forwardToLlm"
     * bridge.oncreatesamplingmessage = async (params, extra) => {
     *   // Apply rate limiting, user approval, cost controls here
     *   return await myLlmProvider.complete(params, { signal: extra.signal });
     * };
     * ```
     *
     * @see `CreateMessageRequest` from @modelcontextprotocol/sdk for the request type
     * @see `CreateMessageResult` / `CreateMessageResultWithTools` from @modelcontextprotocol/sdk for result types
     */
    set oncreatesamplingmessage(callback: (params: CreateMessageRequest["params"], extra: RequestHandlerExtra) => Promise<CreateMessageResult | CreateMessageResultWithTools>);
    /**
     * Notify the view that the MCP server's tool list has changed.
     *
     * The host sends `notifications/tools/list_changed` to the view when it
     * receives this notification from the MCP server. This allows the view
     * to refresh its tool cache or UI accordingly.
     *
     * @param params - Optional notification params (typically empty)
     *
     * @example
     * ```typescript
     * // In your MCP client notification handler:
     * mcpClient.setNotificationHandler(ToolListChangedNotificationSchema, () => {
     *   bridge.sendToolListChanged();
     * });
     * ```
     *
     * @see `ToolListChangedNotification` from @modelcontextprotocol/sdk for the notification type
     */
    sendToolListChanged(params?: ToolListChangedNotification["params"]): Promise<void>;
    /**
     * Register a handler for list resources requests from the view.
     *
     * The view sends `resources/list` requests to enumerate available MCP
     * resources. This handler allows the host to intercept and process these
     * requests, typically by forwarding them to the MCP server.
     *
     * @param callback - Handler that receives list params and returns a
     *   `ListResourcesResult`
     *   - `params` - Request params (may include cursor for pagination)
     *   - `extra` - Request metadata (abort signal, session info)
     *
     * @example
     * ```ts source="./app-bridge.examples.ts#AppBridge_onlistresources_returnResources"
     * bridge.onlistresources = async (params, extra) => {
     *   return mcpClient.request(
     *     { method: "resources/list", params },
     *     ListResourcesResultSchema,
     *     { signal: extra.signal },
     *   );
     * };
     * ```
     *
     * @see `ListResourcesRequest` from @modelcontextprotocol/sdk for the request type
     * @see `ListResourcesResult` from @modelcontextprotocol/sdk for the result type
     */
    private _onlistresources?;
    get onlistresources(): ((params: ListResourcesRequest["params"], extra: RequestHandlerExtra) => Promise<ListResourcesResult>) | undefined;
    set onlistresources(callback: ((params: ListResourcesRequest["params"], extra: RequestHandlerExtra) => Promise<ListResourcesResult>) | undefined);
    /**
     * Register a handler for list resource templates requests from the view.
     *
     * The view sends `resources/templates/list` requests to enumerate available
     * MCP resource templates. This handler allows the host to intercept and process
     * these requests, typically by forwarding them to the MCP server.
     *
     * @param callback - Handler that receives list params and returns a
     *   `ListResourceTemplatesResult`
     *   - `params` - Request params (may include cursor for pagination)
     *   - `extra` - Request metadata (abort signal, session info)
     *
     * @example
     * ```typescript
     * bridge.onlistresourcetemplates = async (params, extra) => {
     *   return mcpClient.request(
     *     { method: "resources/templates/list", params },
     *     ListResourceTemplatesResultSchema,
     *     { signal: extra.signal }
     *   );
     * };
     * ```
     *
     * @see `ListResourceTemplatesRequest` from @modelcontextprotocol/sdk for the request type
     * @see `ListResourceTemplatesResult` from @modelcontextprotocol/sdk for the result type
     */
    private _onlistresourcetemplates?;
    get onlistresourcetemplates(): ((params: ListResourceTemplatesRequest["params"], extra: RequestHandlerExtra) => Promise<ListResourceTemplatesResult>) | undefined;
    set onlistresourcetemplates(callback: ((params: ListResourceTemplatesRequest["params"], extra: RequestHandlerExtra) => Promise<ListResourceTemplatesResult>) | undefined);
    /**
     * Register a handler for read resource requests from the view.
     *
     * The view sends `resources/read` requests to retrieve the contents of an
     * MCP resource. This handler allows the host to intercept and process these
     * requests, typically by forwarding them to the MCP server.
     *
     * @param callback - Handler that receives read params and returns a
     *   `ReadResourceResult`
     *   - `params` - Read parameters including the resource URI
     *   - `extra` - Request metadata (abort signal, session info)
     *
     * @example
     * ```ts source="./app-bridge.examples.ts#AppBridge_onreadresource_returnResource"
     * bridge.onreadresource = async (params, extra) => {
     *   return mcpClient.request(
     *     { method: "resources/read", params },
     *     ReadResourceResultSchema,
     *     { signal: extra.signal },
     *   );
     * };
     * ```
     *
     * @see `ReadResourceRequest` from @modelcontextprotocol/sdk for the request type
     * @see `ReadResourceResult` from @modelcontextprotocol/sdk for the result type
     */
    private _onreadresource?;
    get onreadresource(): ((params: ReadResourceRequest["params"], extra: RequestHandlerExtra) => Promise<ReadResourceResult>) | undefined;
    set onreadresource(callback: ((params: ReadResourceRequest["params"], extra: RequestHandlerExtra) => Promise<ReadResourceResult>) | undefined);
    /**
     * Notify the view that the MCP server's resource list has changed.
     *
     * The host sends `notifications/resources/list_changed` to the view when it
     * receives this notification from the MCP server. This allows the view
     * to refresh its resource cache or UI accordingly.
     *
     * @param params - Optional notification params (typically empty)
     *
     * @example
     * ```typescript
     * // In your MCP client notification handler:
     * mcpClient.setNotificationHandler(ResourceListChangedNotificationSchema, () => {
     *   bridge.sendResourceListChanged();
     * });
     * ```
     *
     * @see `ResourceListChangedNotification` from @modelcontextprotocol/sdk for the notification type
     */
    sendResourceListChanged(params?: ResourceListChangedNotification["params"]): Promise<void>;
    /**
     * Register a handler for list prompts requests from the view.
     *
     * The view sends `prompts/list` requests to enumerate available MCP
     * prompts. This handler allows the host to intercept and process these
     * requests, typically by forwarding them to the MCP server.
     *
     * @param callback - Handler that receives list params and returns a
     *   `ListPromptsResult`
     *   - `params` - Request params (may include cursor for pagination)
     *   - `extra` - Request metadata (abort signal, session info)
     *
     * @example
     * ```ts source="./app-bridge.examples.ts#AppBridge_onlistprompts_returnPrompts"
     * bridge.onlistprompts = async (params, extra) => {
     *   return mcpClient.request(
     *     { method: "prompts/list", params },
     *     ListPromptsResultSchema,
     *     { signal: extra.signal },
     *   );
     * };
     * ```
     *
     * @see `ListPromptsRequest` from @modelcontextprotocol/sdk for the request type
     * @see `ListPromptsResult` from @modelcontextprotocol/sdk for the result type
     */
    private _onlistprompts?;
    get onlistprompts(): ((params: ListPromptsRequest["params"], extra: RequestHandlerExtra) => Promise<ListPromptsResult>) | undefined;
    set onlistprompts(callback: ((params: ListPromptsRequest["params"], extra: RequestHandlerExtra) => Promise<ListPromptsResult>) | undefined);
    /**
     * Notify the view that the MCP server's prompt list has changed.
     *
     * The host sends `notifications/prompts/list_changed` to the view when it
     * receives this notification from the MCP server. This allows the view
     * to refresh its prompt cache or UI accordingly.
     *
     * @param params - Optional notification params (typically empty)
     *
     * @example
     * ```typescript
     * // In your MCP client notification handler:
     * mcpClient.setNotificationHandler(PromptListChangedNotificationSchema, () => {
     *   bridge.sendPromptListChanged();
     * });
     * ```
     *
     * @see `PromptListChangedNotification` from @modelcontextprotocol/sdk for the notification type
     */
    sendPromptListChanged(params?: PromptListChangedNotification["params"]): Promise<void>;
    /**
     * Verify that the guest supports the capability required for the given request method.
     * @internal
     */
    assertCapabilityForMethod(method: AppRequest["method"]): void;
    /**
     * Verify that a request handler is registered and supported for the given method.
     * @internal
     */
    assertRequestHandlerCapability(method: AppRequest["method"]): void;
    /**
     * Verify that the host supports the capability required for the given notification method.
     * @internal
     */
    assertNotificationCapability(method: AppNotification["method"]): void;
    /**
     * Verify that task creation is supported for the given request method.
     * @internal
     */
    protected assertTaskCapability(_method: string): void;
    /**
     * Verify that task handler is supported for the given method.
     * @internal
     */
    protected assertTaskHandlerCapability(_method: string): void;
    /**
     * Get the host capabilities passed to the constructor.
     *
     * @returns Host capabilities object
     *
     * @see {@link McpUiHostCapabilities `McpUiHostCapabilities`} for the capabilities structure
     */
    getCapabilities(): McpUiHostCapabilities;
    /**
     * Handle the ui/initialize request from the guest.
     * @internal
     */
    private _oninitialize;
    /**
     * Update the host context and notify the view of changes.
     *
     * Compares fields present in the new context with the current context and sends a
     * `ui/notifications/host-context-changed` notification containing only fields
     * that have been added or modified. If no fields have changed, no notification is sent.
     * The new context fully replaces the internal state.
     *
     * Common use cases include notifying the view when:
     * - Theme changes (light/dark mode toggle)
     * - Viewport size changes (window resize)
     * - Display mode changes (inline/fullscreen)
     * - Locale or timezone changes
     *
     * @param hostContext - The complete new host context state
     *
     * @example Update theme when user toggles dark mode
     * ```ts source="./app-bridge.examples.ts#AppBridge_setHostContext_updateTheme"
     * bridge.setHostContext({ theme: "dark" });
     * ```
     *
     * @example Update multiple context fields
     * ```ts source="./app-bridge.examples.ts#AppBridge_setHostContext_updateMultiple"
     * bridge.setHostContext({
     *   theme: "dark",
     *   containerDimensions: { maxHeight: 600, width: 800 },
     * });
     * ```
     *
     * @see {@link McpUiHostContext `McpUiHostContext`} for the context structure
     * @see {@link McpUiHostContextChangedNotification `McpUiHostContextChangedNotification`} for the notification type
     */
    setHostContext(hostContext: McpUiHostContext): void;
    /**
     * Low-level method to notify the view of host context changes.
     *
     * Most hosts should use {@link setHostContext `setHostContext`} instead, which automatically
     * detects changes and calls this method with only the modified fields.
     * Use this directly only when you need fine-grained control over change detection.
     *
     * @param params - The context fields that have changed (partial update)
     */
    sendHostContextChange(params: McpUiHostContextChangedNotification["params"]): Promise<void> | void;
    /**
     * Send complete tool arguments to the view.
     *
     * The host MUST send this notification after the View completes initialization
     * (after {@link oninitialized `oninitialized`} callback fires) and complete tool arguments become available.
     * This notification is sent exactly once and is required before {@link sendToolResult `sendToolResult`}.
     *
     * @param params - Complete tool call arguments
     *
     * @example
     * ```ts source="./app-bridge.examples.ts#AppBridge_sendToolInput_afterInit"
     * bridge.oninitialized = () => {
     *   bridge.sendToolInput({
     *     arguments: { location: "New York", units: "metric" },
     *   });
     * };
     * ```
     *
     * @see {@link McpUiToolInputNotification `McpUiToolInputNotification`} for the notification type
     * @see {@link oninitialized `oninitialized`} for the initialization callback
     * @see {@link sendToolResult `sendToolResult`} for sending results after execution
     */
    sendToolInput(params: McpUiToolInputNotification["params"]): Promise<void>;
    /**
     * Send streaming partial tool arguments to the view.
     *
     * The host MAY send this notification zero or more times while tool arguments
     * are being streamed, before {@link sendToolInput `sendToolInput`} is called with complete
     * arguments. This enables progressive rendering of tool arguments in the
     * view.
     *
     * The arguments represent best-effort recovery of incomplete JSON. views
     * SHOULD handle missing or changing fields gracefully between notifications.
     *
     * @param params - Partial tool call arguments (may be incomplete)
     *
     * @example Stream partial arguments as they arrive
     * ```ts source="./app-bridge.examples.ts#AppBridge_sendToolInputPartial_streaming"
     * // As streaming progresses...
     * bridge.sendToolInputPartial({ arguments: { loc: "N" } });
     * bridge.sendToolInputPartial({ arguments: { location: "New" } });
     * bridge.sendToolInputPartial({ arguments: { location: "New York" } });
     *
     * // When complete, send final input
     * bridge.sendToolInput({
     *   arguments: { location: "New York", units: "metric" },
     * });
     * ```
     *
     * @see {@link McpUiToolInputPartialNotification `McpUiToolInputPartialNotification`} for the notification type
     * @see {@link sendToolInput `sendToolInput`} for sending complete arguments
     */
    sendToolInputPartial(params: McpUiToolInputPartialNotification["params"]): Promise<void>;
    /**
     * Send tool execution result to the view.
     *
     * The host MUST send this notification when tool execution completes successfully,
     * provided the view is still displayed. If the view was closed before execution
     * completes, the host MAY skip this notification. This must be sent after
     * {@link sendToolInput `sendToolInput`}.
     *
     * @param params - Standard MCP tool execution result
     *
     * @example
     * ```ts source="./app-bridge.examples.ts#AppBridge_sendToolResult_afterExecution"
     * const result = await mcpClient.request(
     *   { method: "tools/call", params: { name: "get_weather", arguments: args } },
     *   CallToolResultSchema,
     * );
     * bridge.sendToolResult(result);
     * ```
     *
     * @see {@link McpUiToolResultNotification `McpUiToolResultNotification`} for the notification type
     * @see {@link sendToolInput `sendToolInput`} for sending tool arguments before results
     */
    sendToolResult(params: McpUiToolResultNotification["params"]): Promise<void>;
    /**
     * Notify the view that tool execution was cancelled.
     *
     * The host MUST send this notification if tool execution was cancelled for any
     * reason, including user action, sampling error, classifier intervention, or
     * any other interruption. This allows the view to update its state and
     * display appropriate feedback to the user.
     *
     * @param params - Cancellation details object
     *   - `reason`: Human-readable explanation for why the tool was cancelled
     *
     * @example User-initiated cancellation
     * ```ts source="./app-bridge.examples.ts#AppBridge_sendToolCancelled_userInitiated"
     * // User clicked "Cancel" button
     * bridge.sendToolCancelled({ reason: "User cancelled the operation" });
     * ```
     *
     * @example System-level cancellation
     * ```ts source="./app-bridge.examples.ts#AppBridge_sendToolCancelled_systemLevel"
     * // Sampling error or timeout
     * bridge.sendToolCancelled({ reason: "Request timeout after 30 seconds" });
     *
     * // Classifier intervention
     * bridge.sendToolCancelled({ reason: "Content policy violation detected" });
     * ```
     *
     * @see {@link McpUiToolCancelledNotification `McpUiToolCancelledNotification`} for the notification type
     * @see {@link sendToolResult `sendToolResult`} for sending successful results
     * @see {@link sendToolInput `sendToolInput`} for sending tool arguments
     */
    sendToolCancelled(params: McpUiToolCancelledNotification["params"]): Promise<void>;
    /**
     * Send HTML resource to the sandbox proxy for secure loading.
     *
     * This is an internal method used by web-based hosts implementing the
     * double-iframe sandbox architecture. After the sandbox proxy signals readiness
     * via `ui/notifications/sandbox-proxy-ready`, the host sends this notification
     * with the HTML content to load.
     *
     * @param params - HTML content and sandbox configuration:
     *   - `html`: The HTML content to load into the sandboxed iframe
     *   - `sandbox`: Optional sandbox attribute value (e.g., "allow-scripts")
     *
     * @internal
     * @see {@link onsandboxready `onsandboxready`} for handling the sandbox proxy ready notification
     */
    sendSandboxResourceReady(params: McpUiSandboxResourceReadyNotification["params"]): Promise<void>;
    /**
     * Request graceful shutdown of the view.
     *
     * The host MUST send this request before tearing down the UI resource (before
     * unmounting the iframe). This gives the view an opportunity to save state,
     * cancel pending operations, or show confirmation dialogs.
     *
     * The host SHOULD wait for the response before unmounting to prevent data loss.
     *
     * @param params - Empty params object
     * @param options - Request options (timeout, etc.)
     * @returns Promise resolving when view confirms readiness for teardown
     *
     * @example
     * ```ts source="./app-bridge.examples.ts#AppBridge_teardownResource_gracefulShutdown"
     * try {
     *   await bridge.teardownResource({});
     *   // View is ready, safe to unmount iframe
     *   iframe.remove();
     * } catch (error) {
     *   console.error("Teardown failed:", error);
     * }
     * ```
     */
    teardownResource(params: McpUiResourceTeardownRequest["params"], options?: RequestOptions): Promise<Record<string, unknown>>;
    /** @deprecated Use {@link teardownResource `teardownResource`} instead */
    sendResourceTeardown: AppBridge["teardownResource"];
    /**
     * Call a tool on the view.
     *
     * Sends a `tools/call` request to the view and returns the result.
     *
     * @param params - Tool call parameters (name and arguments)
     * @param options - Request options (timeout, abort signal, etc.)
     * @returns Promise resolving to the tool call result
     */
    callTool(params: CallToolRequest["params"], options?: RequestOptions): Promise<{
        [x: string]: unknown;
        content: ({
            type: "text";
            text: string;
            annotations?: {
                audience?: ("user" | "assistant")[] | undefined;
                priority?: number | undefined;
                lastModified?: string | undefined;
            } | undefined;
            _meta?: Record<string, unknown> | undefined;
        } | {
            type: "image";
            data: string;
            mimeType: string;
            annotations?: {
                audience?: ("user" | "assistant")[] | undefined;
                priority?: number | undefined;
                lastModified?: string | undefined;
            } | undefined;
            _meta?: Record<string, unknown> | undefined;
        } | {
            type: "audio";
            data: string;
            mimeType: string;
            annotations?: {
                audience?: ("user" | "assistant")[] | undefined;
                priority?: number | undefined;
                lastModified?: string | undefined;
            } | undefined;
            _meta?: Record<string, unknown> | undefined;
        } | {
            uri: string;
            name: string;
            type: "resource_link";
            description?: string | undefined;
            mimeType?: string | undefined;
            size?: number | undefined;
            annotations?: {
                audience?: ("user" | "assistant")[] | undefined;
                priority?: number | undefined;
                lastModified?: string | undefined;
            } | undefined;
            _meta?: {
                [x: string]: unknown;
            } | undefined;
            icons?: {
                src: string;
                mimeType?: string | undefined;
                sizes?: string[] | undefined;
                theme?: "light" | "dark" | undefined;
            }[] | undefined;
            title?: string | undefined;
        } | {
            type: "resource";
            resource: {
                uri: string;
                text: string;
                mimeType?: string | undefined;
                _meta?: Record<string, unknown> | undefined;
            } | {
                uri: string;
                blob: string;
                mimeType?: string | undefined;
                _meta?: Record<string, unknown> | undefined;
            };
            annotations?: {
                audience?: ("user" | "assistant")[] | undefined;
                priority?: number | undefined;
                lastModified?: string | undefined;
            } | undefined;
            _meta?: Record<string, unknown> | undefined;
        })[];
        _meta?: {
            [x: string]: unknown;
            progressToken?: string | number | undefined;
            "io.modelcontextprotocol/related-task"?: {
                taskId: string;
            } | undefined;
        } | undefined;
        structuredContent?: Record<string, unknown> | undefined;
        isError?: boolean | undefined;
    }>;
    /**
     * List tools available on the view.
     *
     * Sends a `tools/list` request to the view and returns the result.
     *
     * @param params - List tools parameters (may include cursor for pagination)
     * @param options - Request options (timeout, abort signal, etc.)
     * @returns Promise resolving to the list of tools
     */
    listTools(params: ListToolsRequest["params"], options?: RequestOptions): Promise<{
        [x: string]: unknown;
        tools: {
            inputSchema: {
                [x: string]: unknown;
                type: "object";
                properties?: Record<string, object> | undefined;
                required?: string[] | undefined;
            };
            name: string;
            description?: string | undefined;
            outputSchema?: {
                [x: string]: unknown;
                type: "object";
                properties?: Record<string, object> | undefined;
                required?: string[] | undefined;
            } | undefined;
            annotations?: {
                title?: string | undefined;
                readOnlyHint?: boolean | undefined;
                destructiveHint?: boolean | undefined;
                idempotentHint?: boolean | undefined;
                openWorldHint?: boolean | undefined;
            } | undefined;
            execution?: {
                taskSupport?: "optional" | "required" | "forbidden" | undefined;
            } | undefined;
            _meta?: Record<string, unknown> | undefined;
            icons?: {
                src: string;
                mimeType?: string | undefined;
                sizes?: string[] | undefined;
                theme?: "light" | "dark" | undefined;
            }[] | undefined;
            title?: string | undefined;
        }[];
        _meta?: {
            [x: string]: unknown;
            progressToken?: string | number | undefined;
            "io.modelcontextprotocol/related-task"?: {
                taskId: string;
            } | undefined;
        } | undefined;
        nextCursor?: string | undefined;
    }>;
    /**
     * Connect to the view via transport and optionally set up message forwarding.
     *
     * This method establishes the transport connection. If an MCP client was passed
     * to the constructor, it also automatically sets up request/notification forwarding
     * based on the MCP server's capabilities, proxying the following to the view:
     * - Tools (tools/call, notifications/tools/list_changed)
     * - Resources (resources/list, resources/read, resources/templates/list, notifications/resources/list_changed)
     * - Prompts (prompts/list, notifications/prompts/list_changed)
     *
     * If no client was passed to the constructor, no automatic forwarding is set up
     * and you must register handlers manually using the {@link oncalltool `oncalltool`}, {@link onlistresources `onlistresources`},
     * etc. setters.
     *
     * After calling connect, wait for the {@link oninitialized `oninitialized`} callback before sending
     * tool input and other data to the View.
     *
     * @param transport - Transport layer (typically {@link PostMessageTransport `PostMessageTransport`})
     * @returns Promise resolving when connection is established
     *
     * @throws {Error} If a client was passed but server capabilities are not available.
     *   This occurs when connect() is called before the MCP client has completed its
     *   initialization with the server. Ensure `await client.connect()` completes
     *   before calling `bridge.connect()`.
     *
     * @example With MCP client (automatic forwarding)
     * ```ts source="./app-bridge.examples.ts#AppBridge_connect_withMcpClient"
     * const bridge = new AppBridge(mcpClient, hostInfo, capabilities);
     * const transport = new PostMessageTransport(
     *   iframe.contentWindow!,
     *   iframe.contentWindow!,
     * );
     *
     * bridge.oninitialized = () => {
     *   console.log("View ready");
     *   bridge.sendToolInput({ arguments: toolArgs });
     * };
     *
     * await bridge.connect(transport);
     * ```
     *
     * @example Without MCP client (manual handlers)
     * ```ts source="./app-bridge.examples.ts#AppBridge_connect_withoutMcpClient"
     * const bridge = new AppBridge(null, hostInfo, capabilities);
     *
     * // Register handlers manually
     * bridge.oncalltool = async (params, extra) => {
     *   // Custom tool call handling
     *   return { content: [] };
     * };
     *
     * await bridge.connect(transport);
     * ```
     */
    connect(transport: Transport): Promise<void>;
}
