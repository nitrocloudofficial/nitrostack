import { stripUrlHash } from '@posthog/core'

export function normalizeRequestCurrentUrl(
  currentUrl: string | undefined,
  disableCaptureUrlHashes: boolean
): string | undefined {
  return disableCaptureUrlHashes ? stripUrlHash(currentUrl) : currentUrl
}

export function normalizeRequestPath(path: string | undefined, disableCaptureUrlHashes: boolean): string | undefined {
  const pathWithoutSearch = stripUrlSearch(path)
  return disableCaptureUrlHashes ? stripUrlHash(pathWithoutSearch) : pathWithoutSearch
}

function stripUrlSearch<T extends string | undefined>(url: T): T extends string ? string : undefined {
  if (!url) {
    return url as any
  }

  const searchIndex = url.indexOf('?')
  const hashIndex = url.indexOf('#')
  if (searchIndex === -1 || (hashIndex !== -1 && hashIndex < searchIndex)) {
    return url as any
  }

  return `${url.slice(0, searchIndex)}${hashIndex === -1 ? '' : url.slice(hashIndex)}` as any
}
