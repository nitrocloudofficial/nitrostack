"use strict";
var __webpack_require__ = {};
(()=>{
    __webpack_require__.d = (exports1, definition)=>{
        for(var key in definition)if (__webpack_require__.o(definition, key) && !__webpack_require__.o(exports1, key)) Object.defineProperty(exports1, key, {
            enumerable: true,
            get: definition[key]
        });
    };
})();
(()=>{
    __webpack_require__.o = (obj, prop)=>Object.prototype.hasOwnProperty.call(obj, prop);
})();
(()=>{
    __webpack_require__.r = (exports1)=>{
        if ('undefined' != typeof Symbol && Symbol.toStringTag) Object.defineProperty(exports1, Symbol.toStringTag, {
            value: 'Module'
        });
        Object.defineProperty(exports1, '__esModule', {
            value: true
        });
    };
})();
var __webpack_exports__ = {};
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
    PostHogContext: ()=>PostHogContext
});
const external_node_async_hooks_namespaceObject = require("node:async_hooks");
class PostHogContext {
    constructor(){
        this.storage = new external_node_async_hooks_namespaceObject.AsyncLocalStorage();
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
exports.PostHogContext = __webpack_exports__.PostHogContext;
for(var __webpack_i__ in __webpack_exports__)if (-1 === [
    "PostHogContext"
].indexOf(__webpack_i__)) exports[__webpack_i__] = __webpack_exports__[__webpack_i__];
Object.defineProperty(exports, '__esModule', {
    value: true
});
