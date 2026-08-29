import { AsyncLocalStorage } from "node:async_hooks";
class PostHogContext {
    constructor(){
        this.storage = new AsyncLocalStorage();
    }
    get() {
        return this.storage.getStore();
    }
    run(context, fn, options) {
        return this.storage.run(this.resolve(context, options), fn);
    }
    enter(context, options) {
        this.storage.enterWith(this.resolve(context, options));
    }
    resolve(context, options) {
        if (options?.fresh === true) return context;
        const current = this.get() || {};
        return {
            distinctId: context.distinctId ?? current.distinctId,
            sessionId: context.sessionId ?? current.sessionId,
            properties: {
                ...current.properties || {},
                ...context.properties || {}
            }
        };
    }
}
export { PostHogContext };
