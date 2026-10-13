// NitroStack Core 1.0.14 starts a referenced rate-limit cleanup interval when
// its root module is imported. Background intervals must not keep unit-test
// workers alive after all assertions and resource cleanup have completed.
const nativeSetInterval = globalThis.setInterval;
globalThis.setInterval = (...args) => {
  const timer = nativeSetInterval(...args);
  timer.unref?.();
  return timer;
};
