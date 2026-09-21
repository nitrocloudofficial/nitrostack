import { stripUrlHash } from "@posthog/core";
function normalizeRequestCurrentUrl(currentUrl, disableCaptureUrlHashes) {
    return disableCaptureUrlHashes ? stripUrlHash(currentUrl) : currentUrl;
}
function normalizeRequestPath(path, disableCaptureUrlHashes) {
    const pathWithoutSearch = stripUrlSearch(path);
    return disableCaptureUrlHashes ? stripUrlHash(pathWithoutSearch) : pathWithoutSearch;
}
function stripUrlSearch(url) {
    if (!url) return url;
    const searchIndex = url.indexOf('?');
    const hashIndex = url.indexOf('#');
    if (-1 === searchIndex || -1 !== hashIndex && hashIndex < searchIndex) return url;
    return `${url.slice(0, searchIndex)}${-1 === hashIndex ? '' : url.slice(hashIndex)}`;
}
export { normalizeRequestCurrentUrl, normalizeRequestPath };
