var appendErrors = (name, validateAllFieldCriteria, errors, type, message) => validateAllFieldCriteria
    ? {
        ...errors[name],
        types: {
            ...(errors[name] && errors[name].types ? errors[name].types : {}),
            [type]: message || true,
        },
    }
    : {};

const EVENTS = {
    BLUR: 'blur',
    FOCUS_OUT: 'focusout',
    SUBMIT: 'submit',
    TRIGGER: 'trigger',
    VALID: 'valid',
};
const VALIDATION_MODE = {
    onBlur: 'onBlur',
    onChange: 'onChange',
    onSubmit: 'onSubmit',
    onTouched: 'onTouched',
    all: 'all',
};
const INPUT_VALIDATION_RULES = {
    max: 'max',
    min: 'min',
    maxLength: 'maxLength',
    minLength: 'minLength',
    pattern: 'pattern',
    required: 'required',
    validate: 'validate',
};
const ROOT_ERROR_TYPE = 'root';
const PROTOTYPE_KEYWORDS = ['__proto__', 'constructor', 'prototype'];

var isDateObject = (value) => value instanceof Date;

var isNullOrUndefined = (value) => value == null;

const isObjectType = (value) => typeof value === 'object';
var isObject = (value) => !isNullOrUndefined(value) &&
    !Array.isArray(value) &&
    isObjectType(value) &&
    !isDateObject(value);

var isPlainObject = (tempObject) => {
    const prototypeCopy = tempObject.constructor && tempObject.constructor.prototype;
    return (isObject(prototypeCopy) && prototypeCopy.hasOwnProperty('isPrototypeOf'));
};

var isWeb = typeof window !== 'undefined' &&
    typeof window.HTMLElement !== 'undefined' &&
    typeof document !== 'undefined';

function cloneObject(data) {
    if (data instanceof Date) {
        return new Date(data);
    }
    const isFileListInstance = typeof FileList !== 'undefined' && data instanceof FileList;
    if (isWeb && (data instanceof Blob || isFileListInstance)) {
        return data;
    }
    const isArray = Array.isArray(data);
    if (!isArray && !(isObject(data) && isPlainObject(data))) {
        return data;
    }
    const copy = isArray ? [] : Object.create(Object.getPrototypeOf(data));
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            copy[key] = cloneObject(data[key]);
        }
    }
    return copy;
}

var compact = (value) => Array.isArray(value) ? value.filter(Boolean) : [];

var convertToArrayPayload = (value) => (Array.isArray(value) ? value : [value]);

var createSubject = () => {
    let _observers = [];
    const next = (value) => {
        for (const observer of _observers) {
            observer.next && observer.next(value);
        }
    };
    const subscribe = (observer) => {
        _observers.push(observer);
        return {
            unsubscribe: () => {
                _observers = _observers.filter((o) => o !== observer);
            },
        };
    };
    const unsubscribe = () => {
        _observers = [];
    };
    return {
        get observers() {
            return _observers;
        },
        next,
        subscribe,
        unsubscribe,
    };
};

var isPrimitive = (value) => isNullOrUndefined(value) || !isObjectType(value);

const isEmptyObjectWithCustomPrototype = (object, keys) => keys.length === 0 && !Array.isArray(object) && !isPlainObject(object);
function deepEqual(object1, object2, visited = new WeakMap()) {
    if (object1 === object2) {
        return true;
    }
    if (isPrimitive(object1) || isPrimitive(object2)) {
        return Object.is(object1, object2);
    }
    if (isDateObject(object1) && isDateObject(object2)) {
        return Object.is(object1.getTime(), object2.getTime());
    }
    const keys1 = Object.keys(object1);
    const keys2 = Object.keys(object2);
    if (keys1.length !== keys2.length) {
        return false;
    }
    if (isEmptyObjectWithCustomPrototype(object1, keys1) ||
        isEmptyObjectWithCustomPrototype(object2, keys2)) {
        return Object.is(object1, object2);
    }
    if (!keys1.length && Array.isArray(object1) !== Array.isArray(object2)) {
        return false;
    }
    const visitedPairs = visited.get(object1);
    if (visitedPairs && visitedPairs.has(object2)) {
        return true;
    }
    if (visitedPairs) {
        visitedPairs.add(object2);
    }
    else {
        const ws = new WeakSet();
        ws.add(object2);
        visited.set(object1, ws);
    }
    for (const key of keys1) {
        const val1 = object1[key];
        if (!(key in object2)) {
            return false;
        }
        if (key !== 'ref') {
            const val2 = object2[key];
            if ((isDateObject(val1) && isDateObject(val2)) ||
                ((isObject(val1) || Array.isArray(val1)) &&
                    (isObject(val2) || Array.isArray(val2)))
                ? !deepEqual(val1, val2, visited)
                : !Object.is(val1, val2)) {
                return false;
            }
        }
    }
    return true;
}

function extractFormValues(fieldsState, formValues) {
    const values = {};
    for (const key in fieldsState) {
        if (fieldsState.hasOwnProperty(key)) {
            const fieldState = fieldsState[key];
            const fieldValue = formValues[key];
            if (fieldState && isObject(fieldState) && fieldValue) {
                const nestedFieldsState = extractFormValues(fieldState, fieldValue);
                if (isObject(nestedFieldsState)) {
                    values[key] = nestedFieldsState;
                }
            }
            else if (fieldsState[key]) {
                values[key] = fieldValue;
            }
        }
    }
    return values;
}

const flatten = (obj) => {
    const output = {};
    for (const key of Object.keys(obj)) {
        if (isObjectType(obj[key]) &&
            obj[key] !== null &&
            !isDateObject(obj[key])) {
            const nested = flatten(obj[key]);
            for (const nestedKey of Object.keys(nested)) {
                output[`${key}.${nestedKey}`] = nested[nestedKey];
            }
        }
        else {
            output[key] = obj[key];
        }
    }
    return output;
};

const IS_KEY_RE = /^\w*$/;
var isKey = (value) => IS_KEY_RE.test(value);

var isUndefined = (val) => val === undefined;

const FIELD_PATH_RE = /[.[\]'"]/;
var stringToPath = (input) => input.split(FIELD_PATH_RE).filter(Boolean);

var get = (object, path, defaultValue) => {
    if (!path || !isObject(object)) {
        return defaultValue;
    }
    const paths = isKey(path) ? [path] : stringToPath(path);
    if (paths.some((key) => PROTOTYPE_KEYWORDS.includes(key))) {
        return defaultValue;
    }
    const result = paths.reduce((result, key) => {
        return isNullOrUndefined(result) ? undefined : result[key];
    }, object);
    return isUndefined(result) || result === object
        ? isUndefined(object[path])
            ? defaultValue
            : object[path]
        : result;
};

var isBoolean = (value) => typeof value === 'boolean';

var isCheckBoxInput = (element) => element.type === 'checkbox';

var isEmptyObject = (value) => isObject(value) && !Object.keys(value).length;

var isFileInput = (element) => element.type === 'file';

var isFunction = (value) => typeof value === 'function';

var isHTMLElement = (value) => {
    if (!isWeb) {
        return false;
    }
    const owner = value ? value.ownerDocument : 0;
    return (value instanceof
        (owner && owner.defaultView ? owner.defaultView.HTMLElement : HTMLElement));
};

var isMultipleSelect = (element) => element.type === `select-multiple`;

var isRadioInput = (element) => element.type === 'radio';

var isRadioOrCheckbox = (ref) => isRadioInput(ref) || isCheckBoxInput(ref);

var isString = (value) => typeof value === 'string';

var live = (ref) => isHTMLElement(ref) && ref.isConnected;

var set = (object, path, value) => {
    let index = -1;
    const tempPath = isKey(path) ? [path] : stringToPath(path);
    const length = tempPath.length;
    const lastIndex = length - 1;
    while (++index < length) {
        const key = tempPath[index];
        let newValue = value;
        if (index !== lastIndex) {
            const objValue = object[key];
            newValue =
                isObject(objValue) || Array.isArray(objValue)
                    ? objValue
                    : !isNaN(+tempPath[index + 1])
                        ? []
                        : {};
        }
        if (PROTOTYPE_KEYWORDS.includes(key)) {
            return;
        }
        object[key] = newValue;
        object = object[key];
    }
};

function baseGet(object, updatePath) {
    const length = updatePath.slice(0, -1).length;
    let index = 0;
    while (index < length) {
        if (isNullOrUndefined(object)) {
            object = undefined;
            break;
        }
        object = object[updatePath[index]];
        index++;
    }
    return object;
}
function isEmptyArray(obj) {
    for (const key in obj) {
        if (obj.hasOwnProperty(key) && !isUndefined(obj[key])) {
            return false;
        }
    }
    return true;
}
function unset(object, path) {
    if (isString(path) && Object.prototype.hasOwnProperty.call(object, path)) {
        delete object[path];
        return object;
    }
    const paths = Array.isArray(path)
        ? path
        : isKey(path)
            ? [path]
            : stringToPath(path);
    if (paths.some((segment) => PROTOTYPE_KEYWORDS.includes(String(segment)))) {
        return object;
    }
    const childObject = paths.length === 1 ? object : baseGet(object, paths);
    const index = paths.length - 1;
    const key = paths[index];
    if (childObject) {
        delete childObject[key];
    }
    if (index !== 0 &&
        ((isObject(childObject) && isEmptyObject(childObject)) ||
            (Array.isArray(childObject) && isEmptyArray(childObject)))) {
        unset(object, paths.slice(0, -1));
    }
    return object;
}

var generateWatchOutput = (names, _names, formValues, isGlobal, defaultValue) => {
    if (isString(names)) {
        isGlobal && _names.watch.add(names);
        return get(formValues, names, defaultValue);
    }
    if (Array.isArray(names)) {
        return names.map((fieldName) => (isGlobal && _names.watch.add(fieldName),
            get(formValues, fieldName)));
    }
    isGlobal && (_names.watchAll = true);
    return formValues;
};

var objectHasFunction = (data) => {
    for (const key in data) {
        if (isFunction(data[key])) {
            return true;
        }
    }
    return false;
};

function isTraversable(value) {
    return Array.isArray(value) || (isObject(value) && !objectHasFunction(value));
}
function isRegisteredLeaf(fieldRef) {
    return !!(fieldRef && '_f' in fieldRef);
}
function isEmptyDirtyContainer(value) {
    return Array.isArray(value)
        ? !value.some((item) => !isUndefined(item))
        : !Object.keys(value).length;
}
function clearDirtyField(container, key) {
    if (Array.isArray(container)) {
        container[key] = undefined;
    }
    else {
        delete container[key];
    }
}
function markFieldsDirty(data, fields = {}, fieldRefs) {
    for (const key in data) {
        const value = data[key];
        const fieldRef = fieldRefs && fieldRefs[key];
        if (isTraversable(value) &&
            (!Array.isArray(value) || !isRegisteredLeaf(fieldRef))) {
            fields[key] = Array.isArray(value) ? [] : {};
            markFieldsDirty(value, fields[key], fieldRef);
            if (isEmptyDirtyContainer(fields[key])) {
                clearDirtyField(fields, key);
            }
        }
        else if (!isUndefined(value)) {
            fields[key] = true;
        }
    }
    return fields;
}
function getDirtyFields(data, formValues, dirtyFieldsFromValues, fieldRefs) {
    if (!dirtyFieldsFromValues) {
        dirtyFieldsFromValues = markFieldsDirty(formValues, {}, fieldRefs);
    }
    for (const key in data) {
        const value = data[key];
        const fieldRef = fieldRefs && fieldRefs[key];
        if (isTraversable(value) &&
            (!Array.isArray(value) || !isRegisteredLeaf(fieldRef))) {
            if (isUndefined(formValues) || isPrimitive(dirtyFieldsFromValues[key])) {
                dirtyFieldsFromValues[key] = markFieldsDirty(value, Array.isArray(value) ? [] : {}, fieldRef);
            }
            else {
                getDirtyFields(value, isNullOrUndefined(formValues) ? {} : formValues[key], dirtyFieldsFromValues[key], fieldRef);
            }
            if (isEmptyDirtyContainer(dirtyFieldsFromValues[key])) {
                clearDirtyField(dirtyFieldsFromValues, key);
            }
        }
        else if (deepEqual(value, formValues[key])) {
            clearDirtyField(dirtyFieldsFromValues, key);
        }
        else {
            dirtyFieldsFromValues[key] = true;
        }
    }
    return dirtyFieldsFromValues;
}

var getEventValue = (event) => isObject(event) && event.target
    ? isCheckBoxInput(event.target)
        ? event.target.checked
        : isFileInput(event.target)
            ? event.target.files
            : event.target.value
    : event;

const defaultResult = {
    value: false,
    isValid: false,
};
const validResult = { value: true, isValid: true };
var getCheckboxValue = (options) => {
    if (Array.isArray(options)) {
        if (options.length > 1) {
            const values = options
                .filter((option) => option && option.checked && !option.disabled)
                .map((option) => option.value);
            return { value: values, isValid: !!values.length };
        }
        return options[0].checked && !options[0].disabled
            ? // @ts-expect-error expected to work in the browser
                options[0].attributes && !isUndefined(options[0].attributes.value)
                    ? isUndefined(options[0].value) || options[0].value === ''
                        ? validResult
                        : { value: options[0].value, isValid: true }
                    : validResult
            : defaultResult;
    }
    return defaultResult;
};

var getFieldValueAs = (value, { valueAsNumber, valueAsDate, setValueAs }) => isUndefined(value)
    ? value
    : valueAsNumber
        ? value === ''
            ? NaN
            : value
                ? +value
                : value
        : valueAsDate && isString(value)
            ? new Date(value)
            : setValueAs
                ? setValueAs(value)
                : value;

const defaultReturn = {
    isValid: false,
    value: null,
};
var getRadioValue = (options) => Array.isArray(options)
    ? options.reduce((previous, option) => option && option.checked && !option.disabled
        ? {
            isValid: true,
            value: option.value,
        }
        : previous, defaultReturn)
    : defaultReturn;

function getFieldValue(_f) {
    const ref = _f.ref;
    if (isFileInput(ref)) {
        return ref.files;
    }
    if (isRadioInput(ref)) {
        return getRadioValue(_f.refs).value;
    }
    if (isMultipleSelect(ref)) {
        return [...ref.selectedOptions].map(({ value }) => value);
    }
    if (isCheckBoxInput(ref)) {
        return getCheckboxValue(_f.refs).value;
    }
    return getFieldValueAs(isUndefined(ref.value) ? _f.ref.value : ref.value, _f);
}

var getResolverOptions = (fieldsNames, _fields, criteriaMode, shouldUseNativeValidation) => {
    const fields = {};
    for (const name of fieldsNames) {
        const field = get(_fields, name);
        field && set(fields, name, field._f);
    }
    return {
        criteriaMode,
        names: [...fieldsNames],
        fields,
        shouldUseNativeValidation,
    };
};

var isRegex = (value) => value instanceof RegExp;

var getRuleValue = (rule) => isUndefined(rule)
    ? rule
    : isRegex(rule)
        ? rule.source
        : isObject(rule)
            ? isRegex(rule.value)
                ? rule.value.source
                : rule.value
            : rule;

var getValidationModes = (mode) => ({
    isOnSubmit: !mode || mode === VALIDATION_MODE.onSubmit,
    isOnBlur: mode === VALIDATION_MODE.onBlur,
    isOnChange: mode === VALIDATION_MODE.onChange,
    isOnAll: mode === VALIDATION_MODE.all,
    isOnTouch: mode === VALIDATION_MODE.onTouched,
});

const ASYNC_FUNCTION = 'AsyncFunction';
var hasPromiseValidation = (fieldReference) => {
    if (!fieldReference || !fieldReference.validate)
        return false;
    if (isFunction(fieldReference.validate)) {
        return fieldReference.validate.constructor.name === ASYNC_FUNCTION;
    }
    if (isObject(fieldReference.validate)) {
        for (const key in fieldReference.validate) {
            if (fieldReference.validate[key].constructor
                .name === ASYNC_FUNCTION) {
                return true;
            }
        }
    }
    return false;
};

var hasValidation = (options) => options.mount &&
    (options.required ||
        options.min ||
        options.max ||
        options.maxLength ||
        options.minLength ||
        options.pattern ||
        options.validate);

var isNameInFieldArray = (names, name) => name
    .split('.')
    .some((part, index, arr) => !isNaN(Number(part)) && names.has(arr.slice(0, index).join('.')));

var isWatched = (name, _names, isBlurEvent) => {
    if (isBlurEvent)
        return false;
    if (_names.watchAll || _names.watch.has(name))
        return true;
    for (const watchName of _names.watch) {
        if (name.startsWith(watchName) && name.charAt(watchName.length) === '.')
            return true;
    }
    return false;
};

const iterateFieldsByAction = (fields, action, fieldsNames, abortEarly) => {
    for (const key of fieldsNames || Object.keys(fields)) {
        const field = get(fields, key);
        if (field) {
            const { _f, ...currentField } = field;
            if (_f) {
                if (_f.refs && _f.refs[0] && action(_f.refs[0], key) && !abortEarly) {
                    return true;
                }
                else if (_f.ref && action(_f.ref, _f.name) && !abortEarly) {
                    return true;
                }
                else {
                    if (iterateFieldsByAction(currentField, action)) {
                        break;
                    }
                }
            }
            else if (isObject(currentField)) {
                if (iterateFieldsByAction(currentField, action)) {
                    break;
                }
            }
        }
    }
    return;
};

function schemaErrorLookup(errors, _fields, name) {
    const error = get(errors, name);
    if (error || isKey(name)) {
        return {
            error,
            name,
        };
    }
    const names = name.split('.');
    while (names.length) {
        const fieldName = names.join('.');
        const field = get(_fields, fieldName);
        const foundError = get(errors, fieldName);
        if (field && !Array.isArray(field) && name !== fieldName) {
            return { name };
        }
        if (foundError && foundError.type) {
            return {
                name: fieldName,
                error: foundError,
            };
        }
        if (foundError && foundError.root && foundError.root.type) {
            return {
                name: `${fieldName}.root`,
                error: foundError.root,
            };
        }
        names.pop();
    }
    return {
        name,
    };
}

var shouldRenderFormState = (formStateData, _proxyFormState, updateFormState, isRoot) => {
    updateFormState(formStateData);
    const { name, ...formState } = formStateData;
    const keys = Object.keys(formState);
    return (!keys.length ||
        (isRoot && keys.length >= Object.keys(_proxyFormState).length) ||
        keys.find((key) => _proxyFormState[key] ===
            (!isRoot || VALIDATION_MODE.all)));
};

var shouldSubscribeByName = (name, signalName, exact) => !name ||
    !signalName ||
    name === signalName ||
    convertToArrayPayload(name).some((currentName) => currentName &&
        (exact
            ? currentName === signalName || currentName.startsWith(signalName + '.')
            : currentName.startsWith(signalName) ||
                signalName.startsWith(currentName)));

var skipValidation = (isBlurEvent, isTouched, isSubmitted, reValidateMode, mode) => {
    if (mode.isOnAll) {
        return false;
    }
    else if (!isSubmitted && mode.isOnTouch) {
        return !(isTouched || isBlurEvent);
    }
    else if (isSubmitted ? reValidateMode.isOnBlur : mode.isOnBlur) {
        return !isBlurEvent;
    }
    else if (isSubmitted ? reValidateMode.isOnChange : mode.isOnChange) {
        return isBlurEvent;
    }
    return true;
};

var unsetEmptyArray = (ref, name) => !compact(get(ref, name)).length && unset(ref, name);

var updateFieldArrayRootError = (errors, error, name) => {
    const existingErrors = get(errors, name);
    const fieldArrayErrors = Array.isArray(existingErrors) ? existingErrors : [];
    set(fieldArrayErrors, ROOT_ERROR_TYPE, error[name]);
    set(errors, name, fieldArrayErrors);
    return errors;
};

function getValidateError(result, ref, type = 'validate') {
    if (isString(result) ||
        (Array.isArray(result) && result.every(isString)) ||
        (isBoolean(result) && !result)) {
        return {
            type,
            message: isString(result) ? result : '',
            ref,
        };
    }
}

var getValueAndMessage = (validationData) => isObject(validationData) && !isRegex(validationData)
    ? validationData
    : {
        value: validationData,
        message: '',
    };

var validateField = async (field, disabledFieldNames, formValues, validateAllFieldCriteria, shouldUseNativeValidation, isFieldArray) => {
    const { ref, refs, required, maxLength, minLength, min, max, pattern, validate, name, valueAsNumber, mount, } = field._f;
    const inputValue = get(formValues, name);
    if (!mount || disabledFieldNames.has(name)) {
        return {};
    }
    const inputRef = refs ? refs[0] : ref;
    const setCustomValidity = (message) => {
        if (shouldUseNativeValidation && inputRef.reportValidity) {
            const validityMessage = isBoolean(message) ? '' : message || '';
            if (refs) {
                refs.forEach((ref) => ref.setCustomValidity(validityMessage));
            }
            else {
                inputRef.setCustomValidity(validityMessage);
            }
            inputRef.reportValidity();
        }
    };
    const error = {};
    const isRadio = isRadioInput(ref);
    const isCheckBox = isCheckBoxInput(ref);
    const isRadioOrCheckbox = isRadio || isCheckBox;
    const isEmpty = ((valueAsNumber || isFileInput(ref)) &&
        isUndefined(ref.value) &&
        isUndefined(inputValue)) ||
        (isHTMLElement(ref) && ref.value === '') ||
        inputValue === '' ||
        (Array.isArray(inputValue) && !inputValue.length);
    const appendErrorsCurry = appendErrors.bind(null, name, validateAllFieldCriteria, error);
    const getMinMaxMessage = (exceedMax, maxLengthMessage, minLengthMessage, maxType = INPUT_VALIDATION_RULES.maxLength, minType = INPUT_VALIDATION_RULES.minLength) => {
        const message = exceedMax ? maxLengthMessage : minLengthMessage;
        error[name] = {
            type: exceedMax ? maxType : minType,
            message,
            ref,
            ...appendErrorsCurry(exceedMax ? maxType : minType, message),
        };
    };
    if (isFieldArray
        ? !Array.isArray(inputValue) || !inputValue.length
        : required &&
            ((!isRadioOrCheckbox && (isEmpty || isNullOrUndefined(inputValue))) ||
                (isBoolean(inputValue) && !inputValue) ||
                (isCheckBox && !getCheckboxValue(refs).isValid) ||
                (isRadio && !getRadioValue(refs).isValid))) {
        const { value, message } = isString(required)
            ? { value: !!required, message: required }
            : getValueAndMessage(required);
        if (value) {
            error[name] = {
                type: INPUT_VALIDATION_RULES.required,
                message,
                ref: inputRef,
                ...appendErrorsCurry(INPUT_VALIDATION_RULES.required, message),
            };
            if (!validateAllFieldCriteria) {
                setCustomValidity(message);
                return error;
            }
        }
    }
    if (!isEmpty && (!isNullOrUndefined(min) || !isNullOrUndefined(max))) {
        let exceedMax;
        let exceedMin;
        const maxOutput = getValueAndMessage(max);
        const minOutput = getValueAndMessage(min);
        if (!isNullOrUndefined(inputValue) && !isNaN(inputValue)) {
            const valueNumber = ref.valueAsNumber ||
                (inputValue ? +inputValue : inputValue);
            if (!isNullOrUndefined(maxOutput.value)) {
                exceedMax = valueNumber > maxOutput.value;
            }
            if (!isNullOrUndefined(minOutput.value)) {
                exceedMin = valueNumber < minOutput.value;
            }
        }
        else {
            const valueDate = ref.valueAsDate || new Date(inputValue);
            const convertTimeToDate = (time) => new Date(new Date().toDateString() + ' ' + time);
            const isTime = ref.type == 'time';
            const isWeek = ref.type == 'week';
            if (isString(maxOutput.value) && inputValue) {
                exceedMax = isTime
                    ? convertTimeToDate(inputValue) > convertTimeToDate(maxOutput.value)
                    : isWeek
                        ? inputValue > maxOutput.value
                        : valueDate > new Date(maxOutput.value);
            }
            if (isString(minOutput.value) && inputValue) {
                exceedMin = isTime
                    ? convertTimeToDate(inputValue) < convertTimeToDate(minOutput.value)
                    : isWeek
                        ? inputValue < minOutput.value
                        : valueDate < new Date(minOutput.value);
            }
        }
        if (exceedMax || exceedMin) {
            getMinMaxMessage(!!exceedMax, maxOutput.message, minOutput.message, INPUT_VALIDATION_RULES.max, INPUT_VALIDATION_RULES.min);
            if (!validateAllFieldCriteria) {
                setCustomValidity(error[name].message);
                return error;
            }
        }
    }
    if ((maxLength || minLength) &&
        !isEmpty &&
        (isString(inputValue) || (isFieldArray && Array.isArray(inputValue)))) {
        const maxLengthOutput = getValueAndMessage(maxLength);
        const minLengthOutput = getValueAndMessage(minLength);
        const exceedMax = !isNullOrUndefined(maxLengthOutput.value) &&
            inputValue.length > +maxLengthOutput.value;
        const exceedMin = !isNullOrUndefined(minLengthOutput.value) &&
            inputValue.length < +minLengthOutput.value;
        if (exceedMax || exceedMin) {
            getMinMaxMessage(exceedMax, maxLengthOutput.message, minLengthOutput.message);
            if (!validateAllFieldCriteria) {
                setCustomValidity(error[name].message);
                return error;
            }
        }
    }
    if (pattern && !isEmpty && isString(inputValue)) {
        const { value: patternValue, message } = getValueAndMessage(pattern);
        if (isRegex(patternValue) && !inputValue.match(patternValue)) {
            error[name] = {
                type: INPUT_VALIDATION_RULES.pattern,
                message,
                ref,
                ...appendErrorsCurry(INPUT_VALIDATION_RULES.pattern, message),
            };
            if (!validateAllFieldCriteria) {
                setCustomValidity(message);
                return error;
            }
        }
    }
    if (validate) {
        if (isFunction(validate)) {
            const result = await validate(inputValue, formValues);
            const validateError = getValidateError(result, inputRef);
            if (validateError) {
                error[name] = {
                    ...validateError,
                    ...appendErrorsCurry(INPUT_VALIDATION_RULES.validate, validateError.message),
                };
                if (!validateAllFieldCriteria) {
                    setCustomValidity(validateError.message);
                    return error;
                }
            }
        }
        else if (isObject(validate)) {
            let validationResult = {};
            for (const key in validate) {
                if (!isEmptyObject(validationResult) && !validateAllFieldCriteria) {
                    break;
                }
                const validateError = getValidateError(await validate[key](inputValue, formValues), inputRef, key);
                if (validateError) {
                    validationResult = {
                        ...validateError,
                        ...appendErrorsCurry(key, validateError.message),
                    };
                    setCustomValidity(validateError.message);
                    if (validateAllFieldCriteria) {
                        error[name] = validationResult;
                    }
                }
            }
            if (!isEmptyObject(validationResult)) {
                error[name] = {
                    ref: inputRef,
                    ...validationResult,
                };
                if (!validateAllFieldCriteria) {
                    return error;
                }
            }
        }
    }
    setCustomValidity(true);
    return error;
};

const defaultOptions = {
    mode: VALIDATION_MODE.onSubmit,
    reValidateMode: VALIDATION_MODE.onChange,
    shouldFocusError: true,
};
const FORM_ERROR_TYPE = 'form';
const updateDirtyFields = (dirtyFields, nextDirtyFields) => {
    for (const key in dirtyFields) {
        if (!(key in nextDirtyFields)) {
            delete dirtyFields[key];
        }
    }
    Object.assign(dirtyFields, nextDirtyFields);
};
const DEFAULT_FORM_STATE = {
    submitCount: 0,
    isDirty: false,
    isReady: false,
    isValidating: false,
    isSubmitted: false,
    isSubmitting: false,
    isSubmitSuccessful: false,
    isValid: false,
    touchedFields: {},
    dirtyFields: {},
    validatingFields: {},
};
function createFormControl(props = {}) {
    let _options = {
        ...defaultOptions,
        ...props,
    };
    let _formState = {
        ...cloneObject(DEFAULT_FORM_STATE),
        isLoading: isFunction(_options.defaultValues),
        errors: _options.errors || {},
        disabled: _options.disabled || false,
    };
    let _fields = {};
    let _defaultValues = isObject(_options.defaultValues) || isObject(_options.values)
        ? cloneObject(_options.defaultValues || _options.values) || {}
        : {};
    let _formValues = _options.shouldUnregister
        ? {}
        : cloneObject(_defaultValues);
    let _state = {
        action: false,
        mount: false,
        watch: false,
        keepIsValid: false,
    };
    let _names = {
        mount: new Set(),
        disabled: new Set(),
        unMount: new Set(),
        array: new Set(),
        watch: new Set(),
        registerName: new Set(),
    };
    const delayErrorCallbacks = {};
    const timers = {};
    let _valuesSubscriberCount = 0;
    let _validationModeBeforeSubmit = getValidationModes(_options.mode);
    let _validationModeAfterSubmit = getValidationModes(_options.reValidateMode);
    const defaultProxyFormState = {
        isDirty: false,
        dirtyFields: false,
        validatingFields: false,
        touchedFields: false,
        isValidating: false,
        isValid: false,
        errors: false,
    };
    const _proxyFormState = {
        ...defaultProxyFormState,
    };
    let _proxySubscribeFormState = {
        ..._proxyFormState,
    };
    const _subjects = {
        array: createSubject(),
        state: createSubject(),
    };
    let _setValidCallId = 0;
    const shouldDisplayAllAssociatedErrors = _options.criteriaMode === VALIDATION_MODE.all;
    const debounce = (name, callback) => (wait) => {
        clearTimeout(timers[name]);
        timers[name] = setTimeout(callback, wait);
    };
    const _setValid = async (shouldUpdateValid) => {
        if (_state.keepIsValid) {
            return;
        }
        if (!_options.disabled &&
            (_proxyFormState.isValid ||
                _proxySubscribeFormState.isValid ||
                shouldUpdateValid)) {
            const callId = ++_setValidCallId;
            let isValid;
            if (_options.resolver) {
                isValid = isEmptyObject((await _runSchema()).errors);
                callId === _setValidCallId && _updateIsValidating();
            }
            else {
                isValid = await executeBuiltInValidation({
                    fields: _fields,
                    onlyCheckValid: true,
                    eventType: EVENTS.VALID,
                });
            }
            if (callId === _setValidCallId && isValid !== _formState.isValid) {
                _subjects.state.next({
                    isValid,
                });
            }
        }
    };
    const _updateIsValidating = (names, isValidating) => {
        if (!_options.disabled &&
            (_proxyFormState.isValidating ||
                _proxyFormState.validatingFields ||
                _proxySubscribeFormState.isValidating ||
                _proxySubscribeFormState.validatingFields)) {
            (names || Array.from(_names.mount)).forEach((name) => {
                if (name) {
                    isValidating
                        ? set(_formState.validatingFields, name, isValidating)
                        : unset(_formState.validatingFields, name);
                }
            });
            _subjects.state.next({
                validatingFields: _formState.validatingFields,
                isValidating: !isEmptyObject(_formState.validatingFields),
            });
        }
    };
    const _updateDirtyFields = () => {
        _formState.dirtyFields = getDirtyFields(_defaultValues, _formValues, undefined, _fields);
    };
    const _setFieldArray = (name, values = [], method, args, shouldSetValues = true, shouldUpdateFieldsAndState = true) => {
        if (args && method && !_options.disabled) {
            _state.action = true;
            if (shouldUpdateFieldsAndState && Array.isArray(get(_fields, name))) {
                const fieldValues = method(get(_fields, name), args.argA, args.argB);
                shouldSetValues && set(_fields, name, fieldValues);
            }
            if (shouldUpdateFieldsAndState &&
                Array.isArray(get(_formState.errors, name))) {
                const errors = method(get(_formState.errors, name), args.argA, args.argB);
                shouldSetValues && set(_formState.errors, name, errors);
                unsetEmptyArray(_formState.errors, name);
            }
            if ((_proxyFormState.touchedFields ||
                _proxySubscribeFormState.touchedFields) &&
                shouldUpdateFieldsAndState &&
                Array.isArray(get(_formState.touchedFields, name))) {
                const touchedFields = method(get(_formState.touchedFields, name), args.argA, args.argB);
                shouldSetValues && set(_formState.touchedFields, name, touchedFields);
            }
            if (_proxyFormState.dirtyFields || _proxySubscribeFormState.dirtyFields) {
                _updateDirtyFields();
            }
            _subjects.state.next({
                name,
                isDirty: _getDirty(name, values),
                dirtyFields: _formState.dirtyFields,
                errors: _formState.errors,
                isValid: _formState.isValid,
            });
        }
        else {
            set(_formValues, name, values);
        }
    };
    const updateErrors = (name, error) => {
        set(_formState.errors, name, error);
        _formState.errors = { ..._formState.errors };
        _subjects.state.next({
            errors: _formState.errors,
        });
    };
    const _setErrors = (errors) => {
        _formState.errors = errors;
        _subjects.state.next({
            errors: _formState.errors,
            isValid: false,
        });
    };
    const hasExplicitNullIntermediate = (name) => {
        const segments = isKey(name) ? [name] : stringToPath(name);
        let formValues = _formValues;
        let defaultValues = _defaultValues;
        for (let i = 0; i < segments.length - 1; i++) {
            const key = segments[i];
            formValues = isNullOrUndefined(formValues) ? formValues : formValues[key];
            defaultValues = isNullOrUndefined(defaultValues)
                ? defaultValues
                : defaultValues[key];
            if (formValues === null && defaultValues !== null) {
                return true;
            }
        }
        return false;
    };
    const updateValidAndValue = (name, shouldSkipSetValueAs, value, ref) => {
        const field = get(_fields, name);
        if (field) {
            if (hasExplicitNullIntermediate(name)) {
                return;
            }
            const wasUnsetInFormValues = isUndefined(get(_formValues, name));
            const defaultValue = get(_formValues, name, isUndefined(value) ? get(_defaultValues, name) : value);
            isUndefined(defaultValue) ||
                (ref && ref.defaultChecked) ||
                shouldSkipSetValueAs
                ? set(_formValues, name, shouldSkipSetValueAs ? defaultValue : getFieldValue(field._f))
                : setFieldValue(name, defaultValue);
            if (_state.mount && !_state.action) {
                _setValid();
                if (wasUnsetInFormValues &&
                    _formState.isDirty &&
                    (_proxyFormState.isDirty || _proxySubscribeFormState.isDirty)) {
                    const isDirty = _getDirty();
                    if (!isDirty) {
                        _formState.isDirty = false;
                        _subjects.state.next({ ..._formState });
                    }
                }
                if (props.shouldUnregister &&
                    wasUnsetInFormValues &&
                    !isUndefined(get(_formValues, name)) &&
                    isWatched(name, _names)) {
                    _state.watch = true;
                }
            }
        }
    };
    const updateTouchAndDirty = (name, fieldValue, isBlurEvent, shouldDirty, shouldRender) => {
        let shouldUpdateField = false;
        let isPreviousDirty = false;
        const output = {
            name,
        };
        // an explicit programmatic update (e.g. setValue with shouldDirty: true)
        // opts into dirty tracking even when the form is disabled
        if (!_options.disabled || shouldDirty === true) {
            if (!isBlurEvent || shouldDirty) {
                const isCurrentFieldPristine = deepEqual(get(_defaultValues, name), fieldValue);
                if (_proxyFormState.isDirty || _proxySubscribeFormState.isDirty) {
                    isPreviousDirty = _formState.isDirty;
                    _formState.isDirty = output.isDirty =
                        !isCurrentFieldPristine || _getDirty();
                    shouldUpdateField = isPreviousDirty !== output.isDirty;
                }
                isPreviousDirty = !!get(_formState.dirtyFields, name);
                if (isCurrentFieldPristine !== _formState.isDirty) {
                    updateDirtyFields(_formState.dirtyFields, getDirtyFields(_defaultValues, _formValues, undefined, _fields));
                }
                else {
                    isCurrentFieldPristine
                        ? unset(_formState.dirtyFields, name)
                        : set(_formState.dirtyFields, name, true);
                }
                output.dirtyFields = _formState.dirtyFields;
                shouldUpdateField =
                    shouldUpdateField ||
                        ((_proxyFormState.dirtyFields ||
                            _proxySubscribeFormState.dirtyFields) &&
                            isPreviousDirty !== !isCurrentFieldPristine);
            }
            if (isBlurEvent) {
                const isPreviousFieldTouched = get(_formState.touchedFields, name);
                if (!isPreviousFieldTouched) {
                    set(_formState.touchedFields, name, isBlurEvent);
                    output.touchedFields = _formState.touchedFields;
                    shouldUpdateField =
                        shouldUpdateField ||
                            ((_proxyFormState.touchedFields ||
                                _proxySubscribeFormState.touchedFields) &&
                                isPreviousFieldTouched !== isBlurEvent);
                }
            }
            shouldUpdateField && shouldRender && _subjects.state.next(output);
        }
        return shouldUpdateField ? output : {};
    };
    const shouldRenderByError = (name, isValid, error, fieldState) => {
        const previousFieldError = get(_formState.errors, name);
        const shouldUpdateValid = (_proxyFormState.isValid || _proxySubscribeFormState.isValid) &&
            isBoolean(isValid) &&
            _formState.isValid !== isValid;
        if (_options.delayError && error) {
            delayErrorCallbacks[name] = debounce(name, () => updateErrors(name, error));
            delayErrorCallbacks[name](_options.delayError);
        }
        else {
            clearTimeout(timers[name]);
            delete delayErrorCallbacks[name];
            error
                ? set(_formState.errors, name, error)
                : unset(_formState.errors, name);
            _formState.errors = { ..._formState.errors };
        }
        if ((error ? !deepEqual(previousFieldError, error) : previousFieldError) ||
            !isEmptyObject(fieldState) ||
            shouldUpdateValid) {
            const updatedFormState = {
                ...fieldState,
                ...(shouldUpdateValid && isBoolean(isValid) ? { isValid } : {}),
                errors: _formState.errors,
                name,
            };
            _formState = {
                ..._formState,
                ...updatedFormState,
            };
            _subjects.state.next(updatedFormState);
        }
    };
    const _runSchema = async (name) => {
        _updateIsValidating(name, true);
        return await _options.resolver(_formValues, _options.context, getResolverOptions(name || _names.mount, _fields, _options.criteriaMode, _options.shouldUseNativeValidation));
    };
    const executeSchemaAndUpdateState = async (names) => {
        const { errors } = await _runSchema(names);
        _updateIsValidating(names);
        if (names) {
            for (const name of names) {
                const error = get(errors, name);
                error
                    ? _names.array.has(name) &&
                        isObject(error) &&
                        !Object.keys(error).some((key) => !Number.isNaN(Number(key)))
                        ? updateFieldArrayRootError(_formState.errors, { [name]: error }, name)
                        : set(_formState.errors, name, error)
                    : unset(_formState.errors, name);
            }
            _formState.errors = { ..._formState.errors };
        }
        else {
            _formState.errors = errors;
        }
        return errors;
    };
    const validateForm = async ({ name, eventType, }) => {
        if (props.validate) {
            const result = await props.validate({
                formValues: _formValues,
                formState: _formState,
                name,
                eventType,
            });
            if (isObject(result)) {
                for (const key in result) {
                    const error = result[key];
                    if (error) {
                        setError(`${FORM_ERROR_TYPE}.${key}`, {
                            message: isString(error.message) ? error.message : '',
                            type: error.type || INPUT_VALIDATION_RULES.validate,
                        });
                    }
                }
            }
            else if (isString(result) || !result) {
                setError(FORM_ERROR_TYPE, {
                    message: result || '',
                    type: INPUT_VALIDATION_RULES.validate,
                });
            }
            else {
                clearErrors(FORM_ERROR_TYPE);
            }
            return result;
        }
        return true;
    };
    const executeBuiltInValidation = async ({ fields, onlyCheckValid, name, eventType, context = {
        valid: true,
        runRootValidation: false,
    }, }) => {
        if (props.validate) {
            context.runRootValidation = true;
            const result = await validateForm({
                name,
                eventType,
            });
            if (!result) {
                context.valid = false;
                if (onlyCheckValid) {
                    return context.valid;
                }
            }
        }
        for (const name in fields) {
            const field = fields[name];
            if (field) {
                const { _f, ...fieldValue } = field;
                if (_f) {
                    const isFieldArrayRoot = _names.array.has(_f.name);
                    const isPromiseFunction = field._f && hasPromiseValidation(field._f);
                    const shouldTrackIsValidatingState = _proxyFormState.validatingFields ||
                        _proxyFormState.isValidating ||
                        _proxySubscribeFormState.validatingFields ||
                        _proxySubscribeFormState.isValidating;
                    if (isPromiseFunction && shouldTrackIsValidatingState) {
                        _updateIsValidating([_f.name], true);
                    }
                    const fieldError = await validateField(field, _names.disabled, _formValues, shouldDisplayAllAssociatedErrors, _options.shouldUseNativeValidation && !onlyCheckValid, isFieldArrayRoot);
                    if (isPromiseFunction && shouldTrackIsValidatingState) {
                        _updateIsValidating([_f.name]);
                    }
                    if (fieldError[_f.name]) {
                        context.valid = false;
                        if (onlyCheckValid) {
                            break;
                        }
                    }
                    !onlyCheckValid &&
                        (get(fieldError, _f.name)
                            ? isFieldArrayRoot
                                ? updateFieldArrayRootError(_formState.errors, fieldError, _f.name)
                                : set(_formState.errors, _f.name, fieldError[_f.name])
                            : unset(_formState.errors, _f.name));
                    if (props.shouldUseNativeValidation && fieldError[_f.name]) {
                        break;
                    }
                }
                !isEmptyObject(fieldValue) &&
                    (await executeBuiltInValidation({
                        context,
                        onlyCheckValid,
                        fields: fieldValue,
                        name: name,
                        eventType,
                    }));
            }
        }
        return context.valid;
    };
    const _removeUnmounted = () => {
        for (const name of _names.unMount) {
            const field = get(_fields, name);
            field &&
                (field._f.refs
                    ? field._f.refs.every((ref) => !live(ref))
                    : !live(field._f.ref)) &&
                unregister(name);
        }
        _names.unMount = new Set();
    };
    const _getDirty = (name, data) => (name && data && set(_formValues, name, data),
        !deepEqual(_state.mount ? _formValues : _defaultValues, _defaultValues));
    const _getWatch = (names, defaultValue, isGlobal) => generateWatchOutput(names, _names, {
        ...(_state.mount
            ? _formValues
            : isUndefined(defaultValue)
                ? _defaultValues
                : isString(names)
                    ? { [names]: defaultValue }
                    : defaultValue),
    }, isGlobal, defaultValue);
    const _getFieldArray = (name) => compact(get(_state.mount ? _formValues : _defaultValues, name, _options.shouldUnregister ? get(_defaultValues, name, []) : []));
    const setFieldValue = (name, value, options = {}, skipClone = false, skipRender = false) => {
        const field = get(_fields, name);
        let fieldValue = value;
        if (field) {
            const fieldReference = field._f;
            if (fieldReference) {
                !fieldReference.disabled &&
                    set(_formValues, name, getFieldValueAs(value, fieldReference));
                fieldValue =
                    isHTMLElement(fieldReference.ref) && isNullOrUndefined(value)
                        ? ''
                        : value;
                if (isMultipleSelect(fieldReference.ref)) {
                    [...fieldReference.ref.options].forEach((optionRef) => (optionRef.selected = fieldValue.includes(optionRef.value)));
                }
                else if (fieldReference.refs) {
                    if (isCheckBoxInput(fieldReference.ref)) {
                        fieldReference.refs.forEach((checkboxRef) => {
                            if (!checkboxRef.defaultChecked || !checkboxRef.disabled) {
                                if (Array.isArray(fieldValue)) {
                                    checkboxRef.checked = !!fieldValue.find((data) => data === checkboxRef.value);
                                }
                                else {
                                    checkboxRef.checked =
                                        fieldValue === checkboxRef.value || !!fieldValue;
                                }
                            }
                        });
                    }
                    else {
                        fieldReference.refs.forEach((radioRef) => (radioRef.checked = radioRef.value === fieldValue));
                    }
                }
                else if (isFileInput(fieldReference.ref)) {
                    fieldReference.ref.value = '';
                }
                else {
                    fieldReference.ref.value = fieldValue;
                    if (!fieldReference.ref.type && !skipRender) {
                        _subjects.state.next({
                            name,
                            values: skipClone ? _formValues : cloneObject(_formValues),
                        });
                    }
                }
            }
        }
        (options.shouldDirty || options.shouldTouch) &&
            updateTouchAndDirty(name, fieldValue, options.shouldTouch, options.shouldDirty, !skipRender);
        options.shouldValidate &&
            trigger(name, {
                delayError: options.delayError,
            });
    };
    const setFieldValues = (name, value, options, skipClone = false, skipRender = false) => {
        for (const fieldKey in value) {
            if (!value.hasOwnProperty(fieldKey)) {
                return;
            }
            const fieldValue = value[fieldKey];
            const fieldName = name + '.' + fieldKey;
            const field = get(_fields, fieldName);
            (_names.array.has(name) ||
                isObject(fieldValue) ||
                (field && !field._f)) &&
                !isDateObject(fieldValue)
                ? setFieldValues(fieldName, fieldValue, options, skipClone, skipRender)
                : setFieldValue(fieldName, fieldValue, options, skipClone, skipRender);
        }
    };
    const _setValue = (name, value, options, skipClone, skipStateEmit = false) => {
        const field = get(_fields, name);
        const isFieldArray = _names.array.has(name);
        const cloneValue = skipClone ? value : cloneObject(value);
        const previousValue = get(_formValues, name);
        const isValueUnchanged = deepEqual(previousValue, cloneValue);
        if (!isValueUnchanged) {
            set(_formValues, name, cloneValue);
        }
        if (isFieldArray) {
            _subjects.array.next({
                name,
                values: skipClone ? _formValues : cloneObject(_formValues),
            });
            if ((_proxyFormState.isDirty ||
                _proxyFormState.dirtyFields ||
                _proxySubscribeFormState.isDirty ||
                _proxySubscribeFormState.dirtyFields) &&
                options.shouldDirty) {
                _updateDirtyFields();
                if (!skipStateEmit) {
                    _subjects.state.next({
                        name,
                        dirtyFields: _formState.dirtyFields,
                        isDirty: _getDirty(name, cloneValue),
                    });
                }
            }
        }
        else {
            const isEmpty = (Array.isArray(cloneValue) && !cloneValue.length) ||
                isEmptyObject(cloneValue);
            if (!field || field._f || isNullOrUndefined(cloneValue) || isEmpty) {
                setFieldValue(name, cloneValue, options, skipClone, skipStateEmit);
            }
            else {
                setFieldValues(name, cloneValue, options, skipClone, skipStateEmit);
            }
        }
        if (!isValueUnchanged && !skipStateEmit) {
            const watched = isWatched(name, _names);
            const values = skipClone ? _formValues : cloneObject(_formValues);
            _subjects.state.next({
                ...(watched && _formState),
                name: _state.mount || watched ? name : undefined,
                values,
            });
        }
    };
    const setValue = (name, value, options = {}) => _setValue(name, value, options, false);
    const setValues = (formValues, options = {}) => {
        const updatedFormValues = isFunction(formValues)
            ? formValues(_formValues)
            : formValues;
        if (!deepEqual(_formValues, updatedFormValues)) {
            _formValues = {
                ..._formValues,
                ...updatedFormValues,
            };
            const flattenedUpdates = flatten(updatedFormValues);
            for (const fieldName of _names.mount) {
                if (fieldName in flattenedUpdates) {
                    _setValue(fieldName, flattenedUpdates[fieldName], options, true, true);
                }
            }
            _subjects.state.next({
                ..._formState,
                name: undefined,
                type: undefined,
                ...(_valuesSubscriberCount ? { values: _formValues } : {}),
            });
            if (options.shouldValidate) {
                _setValid();
            }
        }
    };
    const onChange = async (event) => {
        _state.mount = true;
        const target = event.target;
        let name = target.name;
        let isFieldValueUpdated = true;
        const field = get(_fields, name);
        const _updateIsFieldValueUpdated = (fieldValue) => {
            isFieldValueUpdated =
                Number.isNaN(fieldValue) ||
                    (isDateObject(fieldValue) && isNaN(fieldValue.getTime())) ||
                    deepEqual(fieldValue, get(_formValues, name, fieldValue));
        };
        if (field) {
            let error;
            let isValid;
            const fieldValue = target.type
                ? getFieldValue(field._f)
                : getEventValue(event);
            const isBlurEvent = event.type === EVENTS.BLUR || event.type === EVENTS.FOCUS_OUT;
            const hasNoValidationEffect = !hasValidation(field._f) &&
                !props.validate &&
                !_options.resolver &&
                !get(_formState.errors, name) &&
                !field._f.deps;
            const shouldSkipValidation = hasNoValidationEffect ||
                skipValidation(isBlurEvent, get(_formState.touchedFields, name), _formState.isSubmitted, _validationModeAfterSubmit, _validationModeBeforeSubmit);
            const watched = isWatched(name, _names, isBlurEvent);
            set(_formValues, name, fieldValue);
            if (isBlurEvent) {
                if (!target || !target.readOnly) {
                    field._f.onBlur && field._f.onBlur(event);
                    const pendingDelayError = delayErrorCallbacks[name];
                    pendingDelayError && pendingDelayError(0);
                }
            }
            else if (field._f.onChange) {
                field._f.onChange(event);
            }
            const fieldState = updateTouchAndDirty(name, fieldValue, isBlurEvent);
            const shouldRender = !isEmptyObject(fieldState) || watched;
            !isBlurEvent &&
                _subjects.state.next({
                    name,
                    type: event.type,
                    ...(_valuesSubscriberCount
                        ? { values: cloneObject(_formValues) }
                        : {}),
                });
            if (shouldSkipValidation) {
                if ((!hasNoValidationEffect || !_formState.isValid) &&
                    (_proxyFormState.isValid || _proxySubscribeFormState.isValid)) {
                    if (_options.mode === 'onBlur') {
                        if (isBlurEvent) {
                            _setValid();
                        }
                    }
                    else if (!isBlurEvent) {
                        _setValid();
                    }
                }
                return (shouldRender &&
                    _subjects.state.next({ name, ...(watched ? {} : fieldState) }));
            }
            if (!_options.resolver && props.validate) {
                await validateForm({
                    name: name,
                    eventType: event.type,
                });
            }
            !isBlurEvent && watched && _subjects.state.next({ ..._formState });
            if (_options.resolver) {
                const { errors } = await _runSchema([name]);
                _updateIsValidating([name]);
                _updateIsFieldValueUpdated(fieldValue);
                if (!isFieldValueUpdated) {
                    !isEmptyObject(fieldState) && _subjects.state.next(fieldState);
                    return;
                }
                const previousErrorLookupResult = schemaErrorLookup(_formState.errors, _fields, name);
                const errorLookupResult = schemaErrorLookup(errors, _fields, previousErrorLookupResult.name || name);
                error = errorLookupResult.error;
                name = errorLookupResult.name;
                isValid = isEmptyObject(errors);
            }
            else {
                _updateIsValidating([name], true);
                error = (await validateField(field, _names.disabled, _formValues, shouldDisplayAllAssociatedErrors, _options.shouldUseNativeValidation))[name];
                _updateIsValidating([name]);
                _updateIsFieldValueUpdated(fieldValue);
                if (isFieldValueUpdated) {
                    if (error) {
                        isValid = false;
                    }
                    else if (_proxyFormState.isValid ||
                        _proxySubscribeFormState.isValid) {
                        isValid = await executeBuiltInValidation({
                            fields: _fields,
                            onlyCheckValid: true,
                            name: name,
                            eventType: event.type,
                        });
                    }
                }
            }
            if (isFieldValueUpdated) {
                field._f.deps &&
                    (!Array.isArray(field._f.deps) || field._f.deps.length > 0) &&
                    trigger(field._f.deps);
                shouldRenderByError(name, isValid, error, fieldState);
            }
        }
    };
    const _focusInput = (ref, key) => {
        if (get(_formState.errors, key) && ref.focus) {
            ref.focus();
            return 1;
        }
        return;
    };
    const trigger = async (name, options = {}) => {
        let isValid;
        let validationResult;
        const fieldNames = convertToArrayPayload(name);
        if (_options.resolver) {
            const errors = await executeSchemaAndUpdateState(isUndefined(name) ? name : fieldNames);
            isValid = isEmptyObject(errors);
            validationResult = name
                ? !fieldNames.some((name) => get(errors, name))
                : isValid;
        }
        else if (name) {
            validationResult = (await Promise.all(fieldNames.map(async (fieldName) => {
                const field = get(_fields, fieldName);
                return await executeBuiltInValidation({
                    fields: field && field._f ? { [fieldName]: field } : field,
                    eventType: EVENTS.TRIGGER,
                });
            }))).every(Boolean);
            !(!validationResult && !_formState.isValid) && _setValid();
        }
        else {
            validationResult = isValid = await executeBuiltInValidation({
                fields: _fields,
                name,
                eventType: EVENTS.TRIGGER,
            });
        }
        if (options.delayError && _options.delayError && isString(name)) {
            const error = get(_formState.errors, name);
            if (error) {
                unset(_formState.errors, name);
                delayErrorCallbacks[name] = debounce(name, () => updateErrors(name, error));
                delayErrorCallbacks[name](_options.delayError);
            }
            else {
                clearTimeout(timers[name]);
                delete delayErrorCallbacks[name];
            }
        }
        _subjects.state.next({
            ...(!isString(name) ||
                ((_proxyFormState.isValid || _proxySubscribeFormState.isValid) &&
                    isValid !== _formState.isValid)
                ? {}
                : { name }),
            ...(_options.resolver || !name ? { isValid } : {}),
            errors: _formState.errors,
        });
        options.shouldFocus &&
            !validationResult &&
            iterateFieldsByAction(_fields, _focusInput, name ? fieldNames : _names.mount);
        return validationResult;
    };
    const getValues = (fieldNames, config) => {
        let values = {
            ...(_state.mount ? _formValues : _defaultValues),
        };
        if (config) {
            values = extractFormValues(config.dirtyFields ? _formState.dirtyFields : _formState.touchedFields, values);
        }
        return isUndefined(fieldNames)
            ? values
            : isString(fieldNames)
                ? get(values, fieldNames)
                : fieldNames.map((name) => get(values, name));
    };
    const getFieldState = (name, formState) => ({
        invalid: !!get((formState || _formState).errors, name),
        isDirty: !!get((formState || _formState).dirtyFields, name),
        error: get((formState || _formState).errors, name),
        isValidating: !!get(_formState.validatingFields, name),
        isTouched: !!get((formState || _formState).touchedFields, name),
    });
    const clearErrors = (name) => {
        const names = name ? convertToArrayPayload(name) : undefined;
        names === null || names === void 0 ? void 0 : names.forEach((inputName) => unset(_formState.errors, inputName));
        if (names) {
            names.forEach((inputName) => {
                _subjects.state.next({
                    name: inputName,
                    errors: _formState.errors,
                });
            });
        }
        else {
            _formState.errors = {};
            _subjects.state.next({
                errors: _formState.errors,
            });
        }
    };
    const setError = (name, error, options) => {
        const ref = (get(_fields, name, { _f: {} })._f || {}).ref;
        const currentError = get(_formState.errors, name) || {};
        const { ref: currentRef, message, type, ...restOfErrorTree } = currentError;
        set(_formState.errors, name, {
            ...restOfErrorTree,
            ...error,
            ref,
        });
        _subjects.state.next({
            name,
            errors: _formState.errors,
            isValid: false,
        });
        options && options.shouldFocus && ref && ref.focus && ref.focus();
    };
    const watch = (name, defaultValue) => {
        if (isFunction(name)) {
            _valuesSubscriberCount++;
            const { unsubscribe } = _subjects.state.subscribe({
                next: (payload) => 'values' in payload &&
                    name(payload.values || _getWatch(undefined, defaultValue), payload),
            });
            let called = false;
            return {
                unsubscribe: () => {
                    if (called) {
                        return;
                    }
                    called = true;
                    _valuesSubscriberCount--;
                    unsubscribe();
                },
            };
        }
        return _getWatch(name, defaultValue, true);
    };
    const _subscribe = (props) => {
        var _a;
        const needsValues = !!((_a = props.formState) === null || _a === void 0 ? void 0 : _a.values);
        if (needsValues) {
            _valuesSubscriberCount++;
        }
        const { unsubscribe } = _subjects.state.subscribe({
            next: (formState) => {
                if (shouldSubscribeByName(props.name, formState.name, props.exact) &&
                    shouldRenderFormState(formState, props.formState || _proxyFormState, _setFormState, props.reRenderRoot)) {
                    const snapshot = { ..._formValues };
                    props.callback({
                        values: snapshot,
                        ..._formState,
                        ...formState,
                        defaultValues: _defaultValues,
                    });
                }
            },
        });
        if (!needsValues) {
            return unsubscribe;
        }
        let called = false;
        return () => {
            if (called) {
                return;
            }
            called = true;
            _valuesSubscriberCount--;
            unsubscribe();
        };
    };
    const subscribe = (props) => {
        _state.mount = true;
        _proxySubscribeFormState = {
            ..._proxySubscribeFormState,
            ...props.formState,
        };
        return _subscribe({
            ...props,
            formState: {
                ...defaultProxyFormState,
                ...props.formState,
            },
        });
    };
    const unregister = (name, options = {}) => {
        for (const fieldName of name ? convertToArrayPayload(name) : _names.mount) {
            _names.mount.delete(fieldName);
            _names.array.delete(fieldName);
            if (!options.keepValue) {
                unset(_fields, fieldName);
                unset(_formValues, fieldName);
            }
            !options.keepError && unset(_formState.errors, fieldName);
            !options.keepDirty && unset(_formState.dirtyFields, fieldName);
            !options.keepTouched && unset(_formState.touchedFields, fieldName);
            !options.keepIsValidating &&
                unset(_formState.validatingFields, fieldName);
            !_options.shouldUnregister &&
                !options.keepDefaultValue &&
                unset(_defaultValues, fieldName);
        }
        _subjects.state.next({
            values: cloneObject(_formValues),
        });
        _subjects.state.next({
            ..._formState,
            ...(!options.keepDirty ? {} : { isDirty: _getDirty() }),
        });
        !options.keepIsValid && _setValid();
    };
    const _setDisabledField = ({ disabled, name, }) => {
        if ((isBoolean(disabled) && _state.mount) ||
            !!disabled ||
            _names.disabled.has(name)) {
            const wasDisabled = _names.disabled.has(name);
            const isDisabled = !!disabled;
            const disabledStateChanged = wasDisabled !== isDisabled;
            disabled ? _names.disabled.add(name) : _names.disabled.delete(name);
            disabledStateChanged && _state.mount && !_state.action && _setValid();
        }
    };
    const register = (name, options = {}) => {
        let field = get(_fields, name);
        const disabledIsDefined = isBoolean(options.disabled) || isBoolean(_options.disabled);
        const shouldRevalidateRemount = !_names.registerName.has(name) && field && field._f && !field._f.mount;
        set(_fields, name, {
            ...(field || {}),
            _f: {
                ...(field && field._f ? field._f : { ref: { name } }),
                name,
                mount: true,
                ...options,
            },
        });
        _names.mount.add(name);
        if (field && !shouldRevalidateRemount) {
            _setDisabledField({
                disabled: isBoolean(options.disabled)
                    ? options.disabled
                    : _options.disabled,
                name,
            });
        }
        else {
            updateValidAndValue(name, true, options.value);
        }
        return {
            ...(disabledIsDefined
                ? { disabled: options.disabled || _options.disabled }
                : {}),
            ...(_options.progressive
                ? {
                    required: !!options.required,
                    min: getRuleValue(options.min),
                    max: getRuleValue(options.max),
                    minLength: getRuleValue(options.minLength),
                    maxLength: getRuleValue(options.maxLength),
                    pattern: getRuleValue(options.pattern),
                }
                : {}),
            name,
            onChange,
            onBlur: onChange,
            ref: (ref) => {
                if (ref) {
                    _names.registerName.add(name);
                    register(name, options);
                    _names.registerName.delete(name);
                    field = get(_fields, name);
                    const fieldRef = isUndefined(ref.value)
                        ? ref.querySelectorAll
                            ? ref.querySelectorAll('input,select,textarea')[0] || ref
                            : ref
                        : ref;
                    const radioOrCheckbox = isRadioOrCheckbox(fieldRef);
                    const refs = field._f.refs || [];
                    if (radioOrCheckbox
                        ? refs.find((option) => option === fieldRef)
                        : fieldRef === field._f.ref) {
                        return;
                    }
                    const newField = {
                        ...field._f,
                    };
                    if (radioOrCheckbox) {
                        newField.refs = [
                            ...refs.filter(live),
                            fieldRef,
                            ...(Array.isArray(get(_defaultValues, name)) ? [{}] : []),
                        ];
                        newField.ref = { type: fieldRef.type, name };
                    }
                    else {
                        newField.ref = fieldRef;
                        delete newField.refs;
                    }
                    set(_fields, name, {
                        _f: newField,
                    });
                    updateValidAndValue(name, false, undefined, fieldRef);
                }
                else {
                    field = get(_fields, name, {});
                    if (field._f) {
                        field._f.mount = false;
                    }
                    (_options.shouldUnregister || options.shouldUnregister) &&
                        !(isNameInFieldArray(_names.array, name) && _state.action) &&
                        _names.unMount.add(name);
                }
            },
        };
    };
    const _focusError = () => _options.shouldFocusError &&
        !_options.shouldUseNativeValidation &&
        iterateFieldsByAction(_fields, _focusInput, _names.mount);
    const _disableForm = (disabled) => {
        if (isBoolean(disabled)) {
            _subjects.state.next({ disabled });
            iterateFieldsByAction(_fields, (ref, name) => {
                const currentField = get(_fields, name);
                if (currentField) {
                    ref.disabled = currentField._f.disabled || disabled;
                    if (Array.isArray(currentField._f.refs)) {
                        currentField._f.refs.forEach((inputRef) => {
                            inputRef.disabled = currentField._f.disabled || disabled;
                        });
                    }
                }
            }, 0, false);
        }
    };
    const handleSubmit = (onValid, onInvalid) => async (e) => {
        let onValidError = undefined;
        if (e) {
            e.preventDefault && e.preventDefault();
            e.persist &&
                e.persist();
        }
        let fieldValues = cloneObject(_formValues);
        _subjects.state.next({
            isSubmitting: true,
        });
        if (_options.resolver) {
            const { errors, values } = await _runSchema();
            _updateIsValidating();
            _formState.errors = errors;
            fieldValues = cloneObject(values);
        }
        else {
            await executeBuiltInValidation({
                fields: _fields,
                eventType: EVENTS.SUBMIT,
            });
        }
        if (_names.disabled.size) {
            for (const name of _names.disabled) {
                unset(fieldValues, name);
            }
        }
        unset(_formState.errors, ROOT_ERROR_TYPE);
        if (isEmptyObject(_formState.errors)) {
            _subjects.state.next({
                errors: {},
            });
            try {
                await onValid(fieldValues, e);
            }
            catch (error) {
                onValidError = error;
            }
        }
        else {
            if (onInvalid) {
                await onInvalid({ ..._formState.errors }, e);
            }
            _focusError();
            setTimeout(_focusError);
        }
        _subjects.state.next({
            isSubmitted: true,
            isSubmitting: false,
            isSubmitSuccessful: isEmptyObject(_formState.errors) && !onValidError,
            submitCount: _formState.submitCount + 1,
            errors: _formState.errors,
        });
        if (onValidError) {
            throw onValidError;
        }
    };
    const resetField = (name, options = {}) => {
        if (get(_fields, name)) {
            if (isUndefined(options.defaultValue)) {
                setValue(name, cloneObject(get(_defaultValues, name)));
            }
            else {
                setValue(name, options.defaultValue);
                set(_defaultValues, name, cloneObject(options.defaultValue));
            }
            if (!options.keepTouched) {
                unset(_formState.touchedFields, name);
            }
            if (!options.keepDirty) {
                unset(_formState.dirtyFields, name);
                _formState.isDirty = options.defaultValue
                    ? _getDirty(name, cloneObject(get(_defaultValues, name)))
                    : _getDirty();
            }
            if (!options.keepError) {
                unset(_formState.errors, name);
                _proxyFormState.isValid && _setValid();
            }
            _subjects.state.next({ ..._formState });
        }
    };
    const _reset = (formValues, keepStateOptions = {}) => {
        const updatedValues = formValues ? cloneObject(formValues) : _defaultValues;
        const cloneUpdatedValues = cloneObject(updatedValues);
        const isEmptyResetValues = isEmptyObject(formValues);
        const values = cloneUpdatedValues;
        const fieldRefs = _fields;
        if (!keepStateOptions.keepDefaultValues) {
            _defaultValues = updatedValues;
        }
        if (!keepStateOptions.keepValues) {
            if (keepStateOptions.keepDirtyValues) {
                const fieldsToCheck = new Set([
                    ..._names.mount,
                    ...Object.keys(getDirtyFields(_defaultValues, _formValues, undefined, fieldRefs)),
                ]);
                for (const fieldName of Array.from(fieldsToCheck)) {
                    const isDirty = get(_formState.dirtyFields, fieldName);
                    const existingValue = get(_formValues, fieldName);
                    const newValue = get(values, fieldName);
                    if (isDirty && !isUndefined(existingValue)) {
                        set(values, fieldName, existingValue);
                    }
                    else if (!isDirty && !isUndefined(newValue)) {
                        setValue(fieldName, newValue);
                    }
                }
            }
            else {
                if (isWeb && isUndefined(formValues)) {
                    for (const name of _names.mount) {
                        const field = get(_fields, name);
                        if (field && field._f) {
                            const fieldReference = Array.isArray(field._f.refs)
                                ? field._f.refs[0]
                                : field._f.ref;
                            if (isHTMLElement(fieldReference)) {
                                const form = fieldReference.closest('form');
                                if (form) {
                                    form.reset();
                                    break;
                                }
                            }
                        }
                    }
                }
                if (keepStateOptions.keepFieldsRef) {
                    for (const fieldName of _names.mount) {
                        setValue(fieldName, get(values, fieldName));
                    }
                }
                else {
                    _fields = {};
                }
            }
            if (_options.shouldUnregister) {
                _formValues = keepStateOptions.keepDefaultValues
                    ? cloneObject(_defaultValues)
                    : {};
                if (keepStateOptions.keepFieldsRef) {
                    for (const fieldName of _names.mount) {
                        set(_formValues, fieldName, get(values, fieldName));
                    }
                }
            }
            else {
                _formValues = cloneObject(values);
            }
            _subjects.array.next({
                values: { ...values },
            });
            _subjects.state.next({
                name: undefined,
                type: undefined,
                values: { ...values },
            });
        }
        _names = {
            mount: keepStateOptions.keepDirtyValues ? _names.mount : new Set(),
            unMount: new Set(),
            array: new Set(),
            registerName: new Set(),
            disabled: new Set(),
            watch: new Set(),
            watchAll: false,
            focus: '',
        };
        _state.mount =
            !_proxyFormState.isValid ||
                !!keepStateOptions.keepIsValid ||
                !!keepStateOptions.keepDirtyValues ||
                (!_options.shouldUnregister && !isEmptyObject(values));
        _state.watch = !!_options.shouldUnregister;
        _state.keepIsValid = !!keepStateOptions.keepIsValid;
        _state.action = false;
        if (!keepStateOptions.keepErrors) {
            _formState.errors = {};
        }
        _subjects.state.next({
            submitCount: keepStateOptions.keepSubmitCount
                ? _formState.submitCount
                : 0,
            isDirty: isEmptyResetValues
                ? false
                : keepStateOptions.keepDirty
                    ? _formState.isDirty
                    : keepStateOptions.keepValues
                        ? _getDirty()
                        : !!(keepStateOptions.keepDefaultValues &&
                            !deepEqual(formValues, _defaultValues)),
            isSubmitted: keepStateOptions.keepIsSubmitted
                ? _formState.isSubmitted
                : false,
            dirtyFields: isEmptyResetValues
                ? {}
                : keepStateOptions.keepDirtyValues
                    ? keepStateOptions.keepDefaultValues && _formValues
                        ? getDirtyFields(_defaultValues, _formValues, undefined, fieldRefs)
                        : _formState.dirtyFields
                    : keepStateOptions.keepDefaultValues && formValues
                        ? getDirtyFields(_defaultValues, formValues, undefined, fieldRefs)
                        : keepStateOptions.keepDirty
                            ? _formState.dirtyFields
                            : {},
            touchedFields: keepStateOptions.keepTouched
                ? _formState.touchedFields
                : {},
            errors: keepStateOptions.keepErrors ? _formState.errors : {},
            isSubmitSuccessful: keepStateOptions.keepIsSubmitSuccessful
                ? _formState.isSubmitSuccessful
                : false,
            isSubmitting: false,
            defaultValues: _defaultValues,
        });
    };
    const reset = (formValues, keepStateOptions) => _reset(isFunction(formValues)
        ? formValues(_formValues)
        : formValues, { ..._options.resetOptions, ...keepStateOptions });
    const setFocus = (name, options = {}) => {
        const field = get(_fields, name);
        const fieldReference = field && field._f;
        if (fieldReference) {
            const fieldRef = fieldReference.refs
                ? fieldReference.refs[0]
                : fieldReference.ref;
            if (fieldRef.focus) {
                setTimeout(() => {
                    fieldRef.focus();
                    options.shouldSelect &&
                        isFunction(fieldRef.select) &&
                        fieldRef.select();
                });
            }
        }
    };
    const _setFormState = (updatedFormState) => {
        // `name`, `type`, and `values` describe the event that produced this
        // update, not the form's persisted state (they aren't part of
        // `FormState`). Merging them in would leak a stale `name`/`type` from
        // one event into a later, unrelated notification that doesn't specify
        // its own.
        const { name, type, values, ...formState } = updatedFormState;
        _formState = {
            ..._formState,
            ...formState,
        };
    };
    const _resetDefaultValues = () => isFunction(_options.defaultValues) &&
        _options.defaultValues().then((values) => {
            reset(values, _options.resetOptions);
            _subjects.state.next({
                isLoading: false,
            });
        });
    const resetDefaultValues = (values, options = {}) => {
        _defaultValues = cloneObject(values);
        if (!options.keepDirty) {
            const newDirtyFields = getDirtyFields(_defaultValues, _formValues, undefined, _fields);
            _formState.dirtyFields = newDirtyFields;
            _formState.isDirty = !isEmptyObject(newDirtyFields);
        }
        if (!options.keepIsValid) {
            _setValid();
        }
        _subjects.state.next({
            ..._formState,
            defaultValues: _defaultValues,
        });
    };
    const methods = {
        control: {
            register,
            unregister,
            getFieldState,
            handleSubmit,
            setError,
            _subscribe,
            _runSchema,
            _updateIsValidating,
            _focusError,
            _getWatch,
            _getDirty,
            _setValid,
            _setFieldArray,
            _setDisabledField,
            _setErrors,
            _getFieldArray,
            _reset,
            _resetDefaultValues,
            _removeUnmounted,
            _disableForm,
            _subjects,
            _proxyFormState,
            get _fields() {
                return _fields;
            },
            get _formValues() {
                return _formValues;
            },
            get _state() {
                return _state;
            },
            set _state(value) {
                _state = value;
            },
            get _defaultValues() {
                return _defaultValues;
            },
            get _names() {
                return _names;
            },
            set _names(value) {
                _names = value;
            },
            get _formState() {
                return _formState;
            },
            get _options() {
                return _options;
            },
            set _options(value) {
                _options = {
                    ..._options,
                    ...value,
                };
                _validationModeBeforeSubmit = getValidationModes(_options.mode);
                _validationModeAfterSubmit = getValidationModes(_options.reValidateMode);
            },
        },
        subscribe,
        trigger,
        register,
        handleSubmit,
        watch,
        setValue,
        setValues,
        getValues,
        reset,
        resetField,
        resetDefaultValues,
        clearErrors,
        unregister,
        setError,
        setFocus,
        getFieldState,
    };
    return {
        ...methods,
        formControl: methods,
    };
}

export { appendErrors, createFormControl, get, set };
//# sourceMappingURL=react-server.esm.mjs.map
