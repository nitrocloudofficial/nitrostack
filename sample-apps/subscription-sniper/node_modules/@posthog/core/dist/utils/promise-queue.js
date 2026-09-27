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
    PromiseQueue: ()=>PromiseQueue
});
const uuidv7_js_namespaceObject = require("../vendor/uuidv7.js");
class PromiseQueue {
    add(promise) {
        const promiseUUID = (0, uuidv7_js_namespaceObject.uuidv7)();
        const id = ++this.nextId;
        this.promiseByIds[promiseUUID] = {
            id,
            promise
        };
        promise.catch(()=>{}).finally(()=>{
            delete this.promiseByIds[promiseUUID];
        });
        return promise;
    }
    async join() {
        let promises = Object.values(this.promiseByIds).map((item)=>item.promise);
        let length = promises.length;
        while(length > 0){
            await Promise.all(promises);
            promises = Object.values(this.promiseByIds).map((item)=>item.promise);
            length = promises.length;
        }
    }
    getPromises(ignoredPromises = [], maxId = this.nextId) {
        const ignoredPromiseSet = new Set(ignoredPromises);
        return Object.values(this.promiseByIds).filter((item)=>item.id <= maxId && !ignoredPromiseSet.has(item.promise)).map((item)=>item.promise);
    }
    get maxId() {
        return this.nextId;
    }
    get length() {
        return Object.keys(this.promiseByIds).length;
    }
    constructor(){
        this.promiseByIds = {};
        this.nextId = 0;
    }
}
exports.PromiseQueue = __webpack_exports__.PromiseQueue;
for(var __webpack_i__ in __webpack_exports__)if (-1 === [
    "PromiseQueue"
].indexOf(__webpack_i__)) exports[__webpack_i__] = __webpack_exports__[__webpack_i__];
Object.defineProperty(exports, '__esModule', {
    value: true
});
