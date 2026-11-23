export interface S3UploadOptions {
  fetchFn?: typeof fetch;
  onProgress?: (percent: number) => void;
  /** Max attempts for transient upload failures (default 3). */
  maxAttempts?: number;
  /** Per-attempt timeout in ms (default 120s). */
  timeoutMs?: number;
  sleepFn?: (ms: number) => Promise<void>;
}

const DEFAULT_ALLOWED_UPLOAD_HOST_SUFFIXES = [
  'amazonaws.com',
  'nitrocloud.ai',
];

/**
 * Validate that a presigned URL targets an expected S3 / NitroCloud host.
 */
export function assertSafePresignedUploadUrl(
  presignedUrl: string,
  allowedHostSuffixes: string[] = DEFAULT_ALLOWED_UPLOAD_HOST_SUFFIXES,
): URL {
  let parsed: URL;
  try {
    parsed = new URL(presignedUrl);
  } catch {
    throw new Error('Invalid presigned upload URL');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Presigned upload URL must use http(s)');
  }
  const host = parsed.hostname.toLowerCase();
  const allowed = allowedHostSuffixes.some((suffix) => {
    const normalized = suffix.toLowerCase();
    return host === normalized || host.endsWith(`.${normalized}`);
  });
  if (!allowed) {
    throw new Error(`Refusing to upload to unexpected host: ${host}`);
  }
  return parsed;
}

/**
 * Uploads an in-memory zip archive directly to an AWS S3 presigned PUT URL.
 */
export async function uploadZipToS3(
  presignedUrl: string,
  zipBuffer: Buffer,
  options: S3UploadOptions = {},
): Promise<void> {
  const fetchFn = options.fetchFn || fetch;
  const maxAttempts = options.maxAttempts ?? 3;
  const timeoutMs = options.timeoutMs ?? 120_000;
  const sleepFn =
    options.sleepFn || ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));

  assertSafePresignedUploadUrl(presignedUrl);

  // Must match ContentType signed by NitroCloud getPresignedUploadUrl (application/zip).
  // NitroStudio uses the same header; octet-stream causes SigV4 rejection.
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchFn(presignedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/zip',
          'Content-Length': String(zipBuffer.length),
        },
        body: zipBuffer,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          `S3 package upload failed with status ${response.status}: ${response.statusText}`,
        );
      }

      if (options.onProgress) {
        options.onProgress(100);
      }
      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const retryable =
        lastError.name === 'AbortError' ||
        /network|fetch|ECONNRESET|ETIMEDOUT|503|500|429/i.test(lastError.message);
      if (!retryable || attempt >= maxAttempts) {
        throw lastError;
      }
      await sleepFn(Math.min(1000 * 2 ** (attempt - 1), 8000));
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError || new Error('S3 package upload failed');
}
