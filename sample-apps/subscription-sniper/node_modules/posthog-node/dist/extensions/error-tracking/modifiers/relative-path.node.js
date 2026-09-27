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
    createRelativePathModifier: ()=>createRelativePathModifier
});
const external_path_namespaceObject = require("path");
function createRelativePathModifier(basePath = process.cwd()) {
    const isWindows = '\\' === external_path_namespaceObject.sep;
    const toUnix = (p)=>isWindows ? p.replace(/\\/g, '/') : p;
    const normalizedBase = toUnix(basePath);
    return async (frames)=>{
        for (const frame of frames)if (!(!frame.filename || frame.filename.startsWith('node:') || frame.filename.startsWith('data:'))) {
            if ((0, external_path_namespaceObject.isAbsolute)(frame.filename)) frame.filename = toUnix((0, external_path_namespaceObject.relative)(normalizedBase, toUnix(frame.filename)));
        }
        return frames;
    };
}
exports.createRelativePathModifier = __webpack_exports__.createRelativePathModifier;
for(var __webpack_i__ in __webpack_exports__)if (-1 === [
    "createRelativePathModifier"
].indexOf(__webpack_i__)) exports[__webpack_i__] = __webpack_exports__[__webpack_i__];
Object.defineProperty(exports, '__esModule', {
    value: true
});
