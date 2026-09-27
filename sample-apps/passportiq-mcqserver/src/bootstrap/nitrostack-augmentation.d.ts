/**
 * TypeScript augmentation for @nitrostack/core's ExecutionContext.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Every PassportIQ build doc, and NitroStack's own events guide, tells you to
 * finish a tool with:
 *
 *     ctx.emit('pipeline.stage_completed', { applicationId, stage, result });
 *
 * That method does not exist on @nitrostack/core@1.0.14. The interface in
 * dist/core/types.d.ts declares only { requestId, toolName, logger, metadata,
 * auth, task }, and NitroStackServer.createContext() (dist/core/server.js:479)
 * builds exactly those four fields. `ctx.emit(...)` is a runtime TypeError.
 *
 * The real API is the standalone `emitEvent(event, payload)` export.
 *
 * Rather than force all four of us to remember that, installExecutionContextBridge()
 * (./execution-context.bridge.ts) patches `emit` onto every context the server
 * creates, and this file makes TypeScript aware of it. Written `ctx.emit(...)`
 * therefore compiles AND works, exactly as documented.
 *
 * Keep this in sync with execution-context.bridge.ts. If a future
 * @nitrostack/core ships a real `emit`, delete both files and nothing else
 * changes.
 */
import '@nitrostack/core';

declare module '@nitrostack/core' {
  interface ExecutionContext {
    /**
     * Publish an event on NitroStack's global event bus.
     *
     * Installed by installExecutionContextBridge(); delegates to the
     * `emitEvent` export. Fire-and-forget — handler rejections are logged, not
     * thrown back into the caller, so a broken dashboard listener can never
     * fail a verification stage.
     */
    emit?(event: string, payload: unknown): void;

    /**
     * The raw arguments the tool was called with.
     *
     * Guards are invoked as `guard.canActivate(context)` (dist/core/tool.js:59)
     * and are never handed the tool input, so a guard has no other way to see
     * which application it is being asked to authorize. PipelineCompleteGuard
     * reads `ctx.input.applicationId` from here.
     */
    input?: Record<string, unknown>;
  }
}
