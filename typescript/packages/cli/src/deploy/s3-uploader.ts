export interface S3UploadOptions {
  fetchFn?: typeof fetch;
  onProgress?: (percent: number) => void;
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

  const response = await fetchFn(presignedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(zipBuffer.length),
    },
    body: zipBuffer,
  });

  if (!response.ok) {
    throw new Error(
      `S3 package upload failed with status ${response.status}: ${response.statusText}`,
    );
  }

  if (options.onProgress) {
    options.onProgress(100);
  }
}
