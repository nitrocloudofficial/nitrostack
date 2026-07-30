// src/middleware/cache/index.ts
var defaultCacheableStatusCodes = [200];
var shouldSkipCacheControl = (cacheControl) => !!cacheControl && /(?:^|,\s*)(?:private|no-(?:store|cache))(?:\s*(?:=|,|$))/i.test(cacheControl);
var parseVaryDirectives = (vary) => {
  if (vary == null) {
    return [];
  }
  return (Array.isArray(vary) ? vary : vary.split(",")).map((directive) => directive.trim().toLowerCase()).filter(Boolean);
};
var shouldSkipCache = (res, optionsVaryDirectives, responseVary) => responseVary.length && (!optionsVaryDirectives || responseVary.some((name) => !optionsVaryDirectives.has(name))) || shouldSkipCacheControl(res.headers.get("Cache-Control")) || res.headers.has("Set-Cookie");
var cache = (options) => {
  if (!globalThis.caches) {
    if (options.onCacheNotAvailable === false) {
    } else if (options.onCacheNotAvailable) {
      options.onCacheNotAvailable();
    } else {
      console.log("Cache Middleware is not enabled because caches is not defined.");
    }
    return async (_c, next) => await next();
  }
  if (options.wait === void 0) {
    options.wait = false;
  }
  const cacheControlDirectives = options.cacheControl?.split(",").map((directive) => directive.toLowerCase());
  const optionsVaryList = parseVaryDirectives(options.vary);
  const varyDirectives = optionsVaryList.length ? new Set(optionsVaryList) : void 0;
  if (varyDirectives?.has("*")) {
    throw new Error(
      'Middleware vary configuration cannot include "*", as it disallows effective caching.'
    );
  }
  const cacheableStatusCodes = new Set(
    options.cacheableStatusCodes ?? defaultCacheableStatusCodes
  );
  const addHeader = (c, responseVary) => {
    if (cacheControlDirectives) {
      const existingDirectives = c.res.headers.get("Cache-Control")?.split(",").map((d) => d.trim().split("=", 1)[0].toLowerCase()) ?? [];
      for (const directive of cacheControlDirectives) {
        let [name, value] = directive.trim().split("=", 2);
        name = name.toLowerCase();
        if (!existingDirectives.includes(name)) {
          c.header("Cache-Control", `${name}${value ? `=${value}` : ""}`, { append: true });
        }
      }
    }
    if (varyDirectives) {
      if (responseVary.length === 0) {
        c.header("Vary", Array.from(varyDirectives).join(", "));
      } else {
        const merged = new Set(varyDirectives);
        for (const directive of responseVary) {
          merged.add(directive);
        }
        if (merged.has("*")) {
          c.header("Vary", "*");
        } else {
          c.header("Vary", Array.from(merged).join(", "));
        }
      }
    }
  };
  return async function cache2(c, next) {
    if (c.req.method !== "GET" || c.req.raw.headers.has("Authorization")) {
      await next();
      return;
    }
    let key = c.req.url;
    if (options.keyGenerator) {
      key = await options.keyGenerator(c);
    }
    if (varyDirectives) {
      for (const directive of varyDirectives) {
        const value = c.req.raw.headers.get(directive) ?? "";
        key += `::${directive}=${encodeURIComponent(value)}`;
      }
    }
    const cacheName = typeof options.cacheName === "function" ? await options.cacheName(c) : options.cacheName;
    const cache3 = await caches.open(cacheName);
    const response = await cache3.match(key);
    if (response) {
      return new Response(response.body, response);
    }
    await next();
    if (!cacheableStatusCodes.has(c.res.status)) {
      return;
    }
    const responseVary = parseVaryDirectives(c.res.headers.get("Vary"));
    addHeader(c, responseVary);
    if (shouldSkipCache(c.res, varyDirectives, responseVary)) {
      return;
    }
    const res = c.res.clone();
    if (options.wait) {
      await cache3.put(key, res);
    } else {
      c.executionCtx.waitUntil(cache3.put(key, res));
    }
  };
};
export {
  cache
};
