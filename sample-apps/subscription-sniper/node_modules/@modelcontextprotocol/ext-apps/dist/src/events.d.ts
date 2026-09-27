import { Protocol } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { Request, Notification, Result } from "@modelcontextprotocol/sdk/types.js";
import { ZodLiteral, ZodObject } from "zod/v4";
type MethodSchema = ZodObject<{
    method: ZodLiteral<string>;
}>;
/**
 * Intermediate base class that adds DOM-style event support on top of the
 * MCP SDK's `Protocol`.
 *
 * The base `Protocol` class stores one handler per method:
 * `setRequestHandler()` and `setNotificationHandler()` replace any existing
 * handler for the same method silently. This class introduces a two-channel
 * event model inspired by the DOM:
 *
 * ### Singular `on*` handler (like `el.onclick`)
 *
 * Subclasses expose `get`/`set` pairs that delegate to
 * {@link setEventHandler `setEventHandler`} /
 * {@link getEventHandler `getEventHandler`}. Assigning replaces the previous
 * handler; assigning `undefined` clears it. `addEventListener` listeners are
 * unaffected.
 *
 * ### Multi-listener (`addEventListener` / `removeEventListener`)
 *
 * Append to a per-event listener array. Listeners fire in insertion order
 * after the singular `on*` handler.
 *
 * ### Dispatch order
 *
 * When a notification arrives for a mapped event:
 * 1. {@link onEventDispatch `onEventDispatch`} (subclass side-effects)
 * 2. The singular `on*` handler (if set)
 * 3. All `addEventListener` listeners in insertion order
 *
 * ### Double-set protection
 *
 * Direct calls to {@link setRequestHandler `setRequestHandler`} /
 * {@link setNotificationHandler `setNotificationHandler`} throw if a handler
 * for the same method has already been registered (through any path), so
 * accidental overwrites surface as errors instead of silent bugs.
 *
 * @typeParam EventMap - Maps event names to the listener's `params` type.
 */
export declare abstract class ProtocolWithEvents<SendRequestT extends Request, SendNotificationT extends Notification, SendResultT extends Result, EventMap extends Record<string, unknown>> extends Protocol<SendRequestT, SendNotificationT, SendResultT> {
    private _registeredMethods;
    private _eventSlots;
    /**
     * Event name → notification schema. Subclasses populate this so that
     * the event system can lazily register a dispatcher with the correct
     * schema on first use.
     */
    protected abstract readonly eventSchemas: {
        [K in keyof EventMap]: MethodSchema;
    };
    /**
     * Called once per incoming notification, before any handlers or listeners
     * fire. Subclasses may override to perform side effects such as merging
     * notification params into cached state.
     */
    protected onEventDispatch<K extends keyof EventMap>(_event: K, _params: EventMap[K]): void;
    /**
     * Lazily create the event slot and register a single dispatcher with the
     * base `Protocol`. The dispatcher fans out to the `on*` handler and all
     * `addEventListener` listeners.
     */
    private _ensureEventSlot;
    /**
     * Set or clear the singular `on*` handler for an event.
     *
     * Replace semantics — like the DOM's `el.onclick = fn`. Assigning
     * `undefined` clears the handler without affecting `addEventListener`
     * listeners.
     */
    protected setEventHandler<K extends keyof EventMap>(event: K, handler: ((params: EventMap[K]) => void) | undefined): void;
    /**
     * Get the singular `on*` handler for an event, or `undefined` if none is
     * set. `addEventListener` listeners are not reflected here.
     */
    protected getEventHandler<K extends keyof EventMap>(event: K): ((params: EventMap[K]) => void) | undefined;
    /**
     * Add a listener for a notification event.
     *
     * Unlike the singular `on*` handler, calling this multiple times appends
     * listeners rather than replacing them. All registered listeners fire in
     * insertion order after the `on*` handler when the notification arrives.
     *
     * Registration is lazy: the first call (for a given event, from either
     * this method or the `on*` setter) registers a dispatcher with the base
     * `Protocol`.
     *
     * @param event - Event name (a key of the `EventMap` type parameter).
     * @param handler - Listener invoked with the notification `params`.
     */
    addEventListener<K extends keyof EventMap>(event: K, handler: (params: EventMap[K]) => void): void;
    /**
     * Remove a previously registered event listener. The dispatcher stays
     * registered even if the listener array becomes empty; future
     * notifications simply have no listeners to call.
     */
    removeEventListener<K extends keyof EventMap>(event: K, handler: (params: EventMap[K]) => void): void;
    /**
     * Registers a request handler. Throws if a handler for the same method
     * has already been registered — use the `on*` setter (replace semantics)
     * or `addEventListener` (multi-listener) for notification events.
     *
     * @throws {Error} if a handler for this method is already registered.
     */
    setRequestHandler: Protocol<SendRequestT, SendNotificationT, SendResultT>["setRequestHandler"];
    /**
     * Registers a notification handler. Throws if a handler for the same
     * method has already been registered — use the `on*` setter (replace
     * semantics) or `addEventListener` (multi-listener) for mapped events.
     *
     * @throws {Error} if a handler for this method is already registered.
     */
    setNotificationHandler: Protocol<SendRequestT, SendNotificationT, SendResultT>["setNotificationHandler"];
    /**
     * Warn if a request handler `on*` setter is replacing a previously-set
     * handler. Call from each request setter before updating the backing field.
     */
    protected warnIfRequestHandlerReplaced(name: string, previous: unknown, next: unknown): void;
    /**
     * Replace a request handler, bypassing double-set protection. Used by
     * `on*` request-handler setters that need replace semantics.
     */
    protected replaceRequestHandler: Protocol<SendRequestT, SendNotificationT, SendResultT>["setRequestHandler"];
    private _assertMethodNotRegistered;
}
export {};
