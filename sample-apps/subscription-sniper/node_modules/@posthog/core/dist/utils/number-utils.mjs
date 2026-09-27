import { isNumber } from "./type-utils.mjs";
function clampToRange(value, min, max, logger, fallbackValue) {
    if (min > max) {
        logger.warn('min cannot be greater than max.');
        min = max;
    }
    if (isNumber(value)) if (value > max) {
        logger.warn(' cannot be  greater than max: ' + max + '. Using max value instead.');
        return max;
    } else {
        if (!(value < min)) return value;
        logger.warn(' cannot be less than min: ' + min + '. Using min value instead.');
        return min;
    }
    logger.warn(' must be a number. using max or fallback. max: ' + max + ', fallback: ' + fallbackValue);
    return clampToRange(fallbackValue || max, min, max, logger);
}
function getRemoteConfigBool(field, key, defaultValue = true) {
    if (null == field) return defaultValue;
    if ('boolean' == typeof field) return field;
    if ('object' == typeof field) {
        const value = field[key];
        return 'boolean' == typeof value ? value : defaultValue;
    }
    return defaultValue;
}
function getRemoteConfigNumber(field, key) {
    if (null == field || 'object' != typeof field) return;
    const value = field[key];
    if ('number' == typeof value && Number.isFinite(value)) return value;
    if ('string' == typeof value) {
        const trimmed = value.trim();
        if ('' === trimmed) return;
        const parsed = Number(trimmed);
        return Number.isFinite(parsed) ? parsed : void 0;
    }
}
function isValidSampleRate(value) {
    return 'number' == typeof value && Number.isFinite(value) && value >= 0 && value <= 1;
}
export { clampToRange, getRemoteConfigBool, getRemoteConfigNumber, isValidSampleRate };
