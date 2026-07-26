(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global["fast-equals"] = {}));
})(this, (function (exports) { 'use strict';

    const { getOwnPropertyNames, getOwnPropertySymbols } = Object;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const { hasOwnProperty } = Object.prototype;
    /**
     * Combine two comparators into a single comparators.
     */
    function combineComparators(comparatorA, comparatorB) {
        return function isEqual(a, b, state) {
            return comparatorA(a, b, state) && comparatorB(a, b, state);
        };
    }
    /**
     * Wrap the provided `areItemsEqual` method to manage the circular state, allowing
     * for circular references to be safely included in the comparison without creating
     * stack overflows.
     */
    function createIsCircular(areItemsEqual) {
        return function isCircular(a, b, state) {
            if (!a || !b || typeof a !== 'object' || typeof b !== 'object') {
                return areItemsEqual(a, b, state);
            }
            const { cache } = state;
            const cachedA = cache.get(a);
            const cachedB = cache.get(b);
            if (cachedA && cachedB) {
                return cachedA === b && cachedB === a;
            }
            cache.set(a, b);
            cache.set(b, a);
            const result = areItemsEqual(a, b, state);
            cache.delete(a);
            cache.delete(b);
            return result;
        };
    }
    /**
     * Get the `@@toStringTag` of the value, if it exists.
     */
    function getShortTag(value) {
        return value != null ? value[Symbol.toStringTag] : undefined;
    }
    /**
     * Get the properties to strictly examine, which include both own properties that are
     * not enumerable and symbol properties.
     */
    function getStrictProperties(object) {
        return getOwnPropertyNames(object).concat(getOwnPropertySymbols(object));
    }
    /**
     * Whether the object contains the property passed as an own property.
     */
    const hasOwn = 
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    Object.hasOwn || ((object, property) => hasOwnProperty.call(object, property));
    /**
     * Whether the values passed are strictly equal or both NaN.
     */
    function sameValueZeroEqual(a, b) {
        return a === b || (!a && !b && a !== a && b !== b);
    }

    const PREACT_VNODE = '__v';
    const PREACT_OWNER = '__o';
    const REACT_OWNER = '_owner';
    const { getOwnPropertyDescriptor, keys } = Object;
    /**
     * Whether the array buffers are equal in value.
     */
    function areArrayBuffersEqual(a, b) {
        return a.byteLength === b.byteLength && areTypedArraysEqual(new Uint8Array(a), new Uint8Array(b));
    }
    /**
     * Whether the arrays are equal in value.
     */
    function areArraysEqual(a, b, state) {
        let index = a.length;
        if (b.length !== index) {
            return false;
        }
        while (index-- > 0) {
            if (!state.equals(a[index], b[index], index, index, a, b, state)) {
                return false;
            }
        }
        return true;
    }
    /**
     * Whether the dataviews are equal in value.
     */
    function areDataViewsEqual(a, b) {
        return (a.byteLength === b.byteLength
            && areTypedArraysEqual(new Uint8Array(a.buffer, a.byteOffset, a.byteLength), new Uint8Array(b.buffer, b.byteOffset, b.byteLength)));
    }
    /**
     * Whether the dates passed are equal in value.
     */
    function areDatesEqual(a, b) {
        return sameValueZeroEqual(a.getTime(), b.getTime());
    }
    /**
     * Whether the errors passed are equal in value.
     */
    function areErrorsEqual(a, b) {
        return a.name === b.name && a.message === b.message && a.cause === b.cause && a.stack === b.stack;
    }
    /**
     * Whether the functions passed are equal in value.
     */
    function areFunctionsEqual(a, b) {
        return a === b;
    }
    /**
     * Whether the `Map`s are equal in value.
     */
    function areMapsEqual(a, b, state) {
        const size = a.size;
        if (size !== b.size) {
            return false;
        }
        if (!size) {
            return true;
        }
        const matchedIndices = new Array(size);
        const aIterable = a.entries();
        let aResult;
        let bResult;
        let index = 0;
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        while ((aResult = aIterable.next())) {
            if (aResult.done) {
                break;
            }
            const bIterable = b.entries();
            let hasMatch = false;
            let matchIndex = 0;
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            while ((bResult = bIterable.next())) {
                if (bResult.done) {
                    break;
                }
                if (matchedIndices[matchIndex]) {
                    matchIndex++;
                    continue;
                }
                const aEntry = aResult.value;
                const bEntry = bResult.value;
                if (state.equals(aEntry[0], bEntry[0], index, matchIndex, a, b, state)
                    && state.equals(aEntry[1], bEntry[1], aEntry[0], bEntry[0], a, b, state)) {
                    hasMatch = matchedIndices[matchIndex] = true;
                    break;
                }
                matchIndex++;
            }
            if (!hasMatch) {
                return false;
            }
            index++;
        }
        return true;
    }
    /**
     * Whether the numbers are equal in value.
     */
    const areNumbersEqual = sameValueZeroEqual;
    /**
     * Whether the objects are equal in value.
     */
    function areObjectsEqual(a, b, state) {
        const properties = keys(a);
        let index = properties.length;
        if (keys(b).length !== index) {
            return false;
        }
        // Decrementing `while` showed faster results than either incrementing or
        // decrementing `for` loop and than an incrementing `while` loop. Declarative
        // methods like `some` / `every` were not used to avoid incurring the garbage
        // cost of anonymous callbacks.
        while (index-- > 0) {
            if (!isPropertyEqual(a, b, state, properties[index])) {
                return false;
            }
        }
        return true;
    }
    /**
     * Whether the objects are equal in value with strict property checking.
     */
    function areObjectsEqualStrict(a, b, state) {
        const properties = getStrictProperties(a);
        let index = properties.length;
        if (getStrictProperties(b).length !== index) {
            return false;
        }
        let property;
        let descriptorA;
        let descriptorB;
        // Decrementing `while` showed faster results than either incrementing or
        // decrementing `for` loop and than an incrementing `while` loop. Declarative
        // methods like `some` / `every` were not used to avoid incurring the garbage
        // cost of anonymous callbacks.
        while (index-- > 0) {
            property = properties[index];
            if (!isPropertyEqual(a, b, state, property)) {
                return false;
            }
            descriptorA = getOwnPropertyDescriptor(a, property);
            descriptorB = getOwnPropertyDescriptor(b, property);
            if ((descriptorA || descriptorB)
                && (!descriptorA
                    || !descriptorB
                    || descriptorA.configurable !== descriptorB.configurable
                    || descriptorA.enumerable !== descriptorB.enumerable
                    || descriptorA.writable !== descriptorB.writable)) {
                return false;
            }
        }
        return true;
    }
    /**
     * Whether the primitive wrappers passed are equal in value.
     */
    function arePrimitiveWrappersEqual(a, b) {
        return sameValueZeroEqual(a.valueOf(), b.valueOf());
    }
    /**
     * Whether the regexps passed are equal in value.
     */
    function areRegExpsEqual(a, b) {
        return a.source === b.source && a.flags === b.flags;
    }
    /**
     * Whether the `Set`s are equal in value.
     */
    function areSetsEqual(a, b, state) {
        const size = a.size;
        if (size !== b.size) {
            return false;
        }
        if (!size) {
            return true;
        }
        const matchedIndices = new Array(size);
        const aIterable = a.values();
        let aResult;
        let bResult;
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        while ((aResult = aIterable.next())) {
            if (aResult.done) {
                break;
            }
            const bIterable = b.values();
            let hasMatch = false;
            let matchIndex = 0;
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            while ((bResult = bIterable.next())) {
                if (bResult.done) {
                    break;
                }
                if (!matchedIndices[matchIndex]
                    && state.equals(aResult.value, bResult.value, aResult.value, bResult.value, a, b, state)) {
                    hasMatch = matchedIndices[matchIndex] = true;
                    break;
                }
                matchIndex++;
            }
            if (!hasMatch) {
                return false;
            }
        }
        return true;
    }
    /**
     * Whether the TypedArray instances are equal in value.
     */
    function areTypedArraysEqual(a, b) {
        let index = a.byteLength;
        if (b.byteLength !== index || a.byteOffset !== b.byteOffset) {
            return false;
        }
        while (index-- > 0) {
            if (a[index] !== b[index]) {
                return false;
            }
        }
        return true;
    }
    /**
     * Whether the URL instances are equal in value.
     */
    function areUrlsEqual(a, b) {
        return (a.hostname === b.hostname
            && a.pathname === b.pathname
            && a.protocol === b.protocol
            && a.port === b.port
            && a.hash === b.hash
            && a.username === b.username
            && a.password === b.password);
    }
    function isPropertyEqual(a, b, state, property) {
        if ((property === REACT_OWNER || property === PREACT_OWNER || property === PREACT_VNODE)
            && (a.$$typeof || b.$$typeof)) {
            return true;
        }
        return hasOwn(b, property) && state.equals(a[property], b[property], property, property, a, b, state);
    }

    const ARRAY_BUFFER_TAG = '[object ArrayBuffer]';
    const ARGUMENTS_TAG = '[object Arguments]';
    const BOOLEAN_TAG = '[object Boolean]';
    const DATA_VIEW_TAG = '[object DataView]';
    const DATE_TAG = '[object Date]';
    const ERROR_TAG = '[object Error]';
    const MAP_TAG = '[object Map]';
    const NUMBER_TAG = '[object Number]';
    const OBJECT_TAG = '[object Object]';
    const REG_EXP_TAG = '[object RegExp]';
    const SET_TAG = '[object Set]';
    const STRING_TAG = '[object String]';
    const TYPED_ARRAY_TAGS = {
        '[object Int8Array]': true,
        '[object Uint8Array]': true,
        '[object Uint8ClampedArray]': true,
        '[object Int16Array]': true,
        '[object Uint16Array]': true,
        '[object Int32Array]': true,
        '[object Uint32Array]': true,
        '[object Float16Array]': true,
        '[object Float32Array]': true,
        '[object Float64Array]': true,
        '[object BigInt64Array]': true,
        '[object BigUint64Array]': true,
    };
    const URL_TAG = '[object URL]';
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const toString = Object.prototype.toString;
    /**
     * Create a comparator method based on the type-specific equality comparators passed.
     */
    function createEqualityComparator({ areArrayBuffersEqual, areArraysEqual, areDataViewsEqual, areDatesEqual, areErrorsEqual, areFunctionsEqual, areMapsEqual, areNumbersEqual, areObjectsEqual, arePrimitiveWrappersEqual, areRegExpsEqual, areSetsEqual, areTypedArraysEqual, areUrlsEqual, unknownTagComparators, }) {
        /**
         * compare the value of the two objects and return true if they are equivalent in values
         */
        return function comparator(a, b, state) {
            // If the items are strictly equal, no need to do a value comparison.
            if (a === b) {
                return true;
            }
            // If either of the items are nullish and fail the strictly equal check
            // above, then they must be unequal.
            if (a == null || b == null) {
                return false;
            }
            const type = typeof a;
            if (type !== typeof b) {
                return false;
            }
            if (type !== 'object') {
                if (type === 'number') {
                    return areNumbersEqual(a, b, state);
                }
                if (type === 'function') {
                    return areFunctionsEqual(a, b, state);
                }
                // If a primitive value that is not strictly equal, it must be unequal.
                return false;
            }
            const constructor = a.constructor;
            // Checks are listed in order of commonality of use-case:
            //   1. Common complex object types (plain object, array)
            //   2. Common data values (date, regexp)
            //   3. Less-common complex object types (map, set)
            //   4. Less-common data values (promise, primitive wrappers)
            // Inherently this is both subjective and assumptive, however
            // when reviewing comparable libraries in the wild this order
            // appears to be generally consistent.
            // Constructors should match, otherwise there is potential for false positives
            // between class and subclass or custom object and POJO.
            if (constructor !== b.constructor) {
                return false;
            }
            // `isPlainObject` only checks against the object's own realm. Cross-realm
            // comparisons are rare, and will be handled in the ultimate fallback, so
            // we can avoid capturing the string tag.
            if (constructor === Object) {
                return areObjectsEqual(a, b, state);
            }
            // `isArray()` works on subclasses and is cross-realm, so we can avoid capturing
            // the string tag or doing an `instanceof` check.
            if (Array.isArray(a)) {
                return areArraysEqual(a, b, state);
            }
            // Try to fast-path equality checks for other complex object types in the
            // same realm to avoid capturing the string tag. Strict equality is used
            // instead of `instanceof` because it is more performant for the common
            // use-case. If someone is subclassing a native class, it will be handled
            // with the string tag comparison.
            if (constructor === Date) {
                return areDatesEqual(a, b, state);
            }
            if (constructor === RegExp) {
                return areRegExpsEqual(a, b, state);
            }
            if (constructor === Map) {
                return areMapsEqual(a, b, state);
            }
            if (constructor === Set) {
                return areSetsEqual(a, b, state);
            }
            // Since this is a custom object, capture the string tag to determing its type.
            // This is reasonably performant in modern environments like v8 and SpiderMonkey.
            const tag = toString.call(a);
            if (tag === DATE_TAG) {
                return areDatesEqual(a, b, state);
            }
            // For RegExp, the properties are not enumerable, and therefore will give false positives if
            // tested like a standard object.
            if (tag === REG_EXP_TAG) {
                return areRegExpsEqual(a, b, state);
            }
            if (tag === MAP_TAG) {
                return areMapsEqual(a, b, state);
            }
            if (tag === SET_TAG) {
                return areSetsEqual(a, b, state);
            }
            if (tag === OBJECT_TAG) {
                // The exception for value comparison is custom `Promise`-like class instances. These should
                // be treated the same as standard `Promise` objects, which means strict equality, and if
                // it reaches this point then that strict equality comparison has already failed.
                return typeof a.then !== 'function' && typeof b.then !== 'function' && areObjectsEqual(a, b, state);
            }
            // If a URL tag, it should be tested explicitly. Like RegExp, the properties are not
            // enumerable, and therefore will give false positives if tested like a standard object.
            if (tag === URL_TAG) {
                return areUrlsEqual(a, b, state);
            }
            // If an error tag, it should be tested explicitly. Like RegExp, the properties are not
            // enumerable, and therefore will give false positives if tested like a standard object.
            if (tag === ERROR_TAG) {
                return areErrorsEqual(a, b, state);
            }
            // If an arguments tag, it should be treated as a standard object.
            if (tag === ARGUMENTS_TAG) {
                return areObjectsEqual(a, b, state);
            }
            if (TYPED_ARRAY_TAGS[tag]) {
                return areTypedArraysEqual(a, b, state);
            }
            if (tag === ARRAY_BUFFER_TAG) {
                return areArrayBuffersEqual(a, b, state);
            }
            if (tag === DATA_VIEW_TAG) {
                return areDataViewsEqual(a, b, state);
            }
            // As the penultimate fallback, check if the values passed are primitive wrappers. This
            // is very rare in modern JS, which is why it is deprioritized compared to all other object
            // types.
            if (tag === BOOLEAN_TAG || tag === NUMBER_TAG || tag === STRING_TAG) {
                return arePrimitiveWrappersEqual(a, b, state);
            }
            if (unknownTagComparators) {
                let unknownTagComparator = unknownTagComparators[tag];
                if (!unknownTagComparator) {
                    const shortTag = getShortTag(a);
                    if (shortTag) {
                        unknownTagComparator = unknownTagComparators[shortTag];
                    }
                }
                // If the custom config has an unknown tag comparator that matches the captured tag or the
                // @@toStringTag, it is the source of truth for whether the values are equal.
                if (unknownTagComparator) {
                    return unknownTagComparator(a, b, state);
                }
            }
            // If not matching any tags that require a specific type of comparison, then we hard-code false because
            // the only thing remaining is strict equality, which has already been compared. This is for a few reasons:
            //   - Certain types that cannot be introspected (e.g., `WeakMap`). For these types, this is the only
            //     comparison that can be made.
            //   - For types that can be introspected, but rarely have requirements to be compared
            //     (`ArrayBuffer`, `DataView`, etc.), the cost is avoided to prioritize the common
            //     use-cases (may be included in a future release, if requested enough).
            //   - For types that can be introspected but do not have an objective definition of what
            //     equality is (`Error`, etc.), the subjective decision is to be conservative and strictly compare.
            // In all cases, these decisions should be reevaluated based on changes to the language and
            // common development practices.
            return false;
        };
    }
    /**
     * Create the configuration object used for building comparators.
     */
    function createEqualityComparatorConfig({ circular, createCustomConfig, strict, }) {
        let config = {
            areArrayBuffersEqual,
            areArraysEqual: strict ? areObjectsEqualStrict : areArraysEqual,
            areDataViewsEqual,
            areDatesEqual: areDatesEqual,
            areErrorsEqual: areErrorsEqual,
            areFunctionsEqual: areFunctionsEqual,
            areMapsEqual: strict ? combineComparators(areMapsEqual, areObjectsEqualStrict) : areMapsEqual,
            areNumbersEqual: areNumbersEqual,
            areObjectsEqual: strict ? areObjectsEqualStrict : areObjectsEqual,
            arePrimitiveWrappersEqual: arePrimitiveWrappersEqual,
            areRegExpsEqual: areRegExpsEqual,
            areSetsEqual: strict ? combineComparators(areSetsEqual, areObjectsEqualStrict) : areSetsEqual,
            areTypedArraysEqual: strict
                ? combineComparators(areTypedArraysEqual, areObjectsEqualStrict)
                : areTypedArraysEqual,
            areUrlsEqual: areUrlsEqual,
            unknownTagComparators: undefined,
        };
        if (createCustomConfig) {
            config = Object.assign({}, config, createCustomConfig(config));
        }
        if (circular) {
            const areArraysEqual = createIsCircular(config.areArraysEqual);
            const areMapsEqual = createIsCircular(config.areMapsEqual);
            const areObjectsEqual = createIsCircular(config.areObjectsEqual);
            const areSetsEqual = createIsCircular(config.areSetsEqual);
            config = Object.assign({}, config, {
                areArraysEqual,
                areMapsEqual,
                areObjectsEqual,
                areSetsEqual,
            });
        }
        return config;
    }
    /**
     * Default equality comparator pass-through, used as the standard `isEqual` creator for
     * use inside the built comparator.
     */
    function createInternalEqualityComparator(compare) {
        return function (a, b, _indexOrKeyA, _indexOrKeyB, _parentA, _parentB, state) {
            return compare(a, b, state);
        };
    }
    /**
     * Create the `isEqual` function used by the consuming application.
     */
    function createIsEqual({ circular, comparator, createState, equals, strict }) {
        if (createState) {
            return function isEqual(a, b) {
                const { cache = circular ? new WeakMap() : undefined, meta } = createState();
                return comparator(a, b, {
                    cache,
                    equals,
                    meta,
                    strict,
                });
            };
        }
        if (circular) {
            return function isEqual(a, b) {
                return comparator(a, b, {
                    cache: new WeakMap(),
                    equals,
                    meta: undefined,
                    strict,
                });
            };
        }
        const state = {
            cache: undefined,
            equals,
            meta: undefined,
            strict,
        };
        return function isEqual(a, b) {
            return comparator(a, b, state);
        };
    }

    /**
     * Whether the items passed are deeply-equal in value.
     */
    const deepEqual = createCustomEqual();
    /**
     * Whether the items passed are deeply-equal in value based on strict comparison.
     */
    const strictDeepEqual = createCustomEqual({ strict: true });
    /**
     * Whether the items passed are deeply-equal in value, including circular references.
     */
    const circularDeepEqual = createCustomEqual({ circular: true });
    /**
     * Whether the items passed are deeply-equal in value, including circular references,
     * based on strict comparison.
     */
    const strictCircularDeepEqual = createCustomEqual({
        circular: true,
        strict: true,
    });
    /**
     * Whether the items passed are shallowly-equal in value.
     */
    const shallowEqual = createCustomEqual({
        createInternalComparator: () => sameValueZeroEqual,
    });
    /**
     * Whether the items passed are shallowly-equal in value based on strict comparison
     */
    const strictShallowEqual = createCustomEqual({
        strict: true,
        createInternalComparator: () => sameValueZeroEqual,
    });
    /**
     * Whether the items passed are shallowly-equal in value, including circular references.
     */
    const circularShallowEqual = createCustomEqual({
        circular: true,
        createInternalComparator: () => sameValueZeroEqual,
    });
    /**
     * Whether the items passed are shallowly-equal in value, including circular references,
     * based on strict comparison.
     */
    const strictCircularShallowEqual = createCustomEqual({
        circular: true,
        createInternalComparator: () => sameValueZeroEqual,
        strict: true,
    });
    /**
     * Create a custom equality comparison method.
     *
     * This can be done to create very targeted comparisons in extreme hot-path scenarios
     * where the standard methods are not performant enough, but can also be used to provide
     * support for legacy environments that do not support expected features like
     * `RegExp.prototype.flags` out of the box.
     */
    function createCustomEqual(options = {}) {
        const { circular = false, createInternalComparator: createCustomInternalComparator, createState, strict = false, } = options;
        const config = createEqualityComparatorConfig(options);
        const comparator = createEqualityComparator(config);
        const equals = createCustomInternalComparator
            ? createCustomInternalComparator(comparator)
            : createInternalEqualityComparator(comparator);
        return createIsEqual({ circular, comparator, createState, equals, strict });
    }

    exports.circularDeepEqual = circularDeepEqual;
    exports.circularShallowEqual = circularShallowEqual;
    exports.createCustomEqual = createCustomEqual;
    exports.deepEqual = deepEqual;
    exports.sameValueZeroEqual = sameValueZeroEqual;
    exports.shallowEqual = shallowEqual;
    exports.strictCircularDeepEqual = strictCircularDeepEqual;
    exports.strictCircularShallowEqual = strictCircularShallowEqual;
    exports.strictDeepEqual = strictDeepEqual;
    exports.strictShallowEqual = strictShallowEqual;

}));
//# sourceMappingURL=index.js.map
