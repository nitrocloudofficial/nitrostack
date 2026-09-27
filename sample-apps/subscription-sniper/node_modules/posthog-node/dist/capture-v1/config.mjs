function isCaptureMode(value) {
    return 'v0' === value || 'v1' === value;
}
function resolveCaptureMode() {
    const envMode = 'undefined' != typeof process ? process.env?.POSTHOG_CAPTURE_MODE : void 0;
    return isCaptureMode(envMode) ? envMode : 'v0';
}
export { resolveCaptureMode };
