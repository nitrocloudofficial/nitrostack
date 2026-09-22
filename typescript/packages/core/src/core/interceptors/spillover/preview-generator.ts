export interface PreviewResult {
  preview: unknown;
  summary: string;
  totalItems?: number;
}

function capPreviewValue(value: unknown, previewChars: number): unknown {
  if (value == null || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.length > previewChars ? `${value.slice(0, previewChars)}... [truncated]` : value;
  }
  let encoded: string;
  try {
    encoded = JSON.stringify(value) ?? '';
  } catch {
    return '[unserializable]';
  }
  if (encoded.length <= previewChars) return value;
  return `${encoded.slice(0, previewChars)}... [truncated]`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function generatePreview(
  data: unknown,
  sizeBytes: number,
  previewItems = 3,
  previewChars = 500
): PreviewResult {
  const sizeStr = formatBytes(sizeBytes);

  // 1. Array payload (most common for database queries)
  if (Array.isArray(data)) {
    const totalItems = data.length;
    const preview = data.slice(0, previewItems).map((item) => capPreviewValue(item, previewChars));
    return {
      preview,
      totalItems,
      summary: `Query returned ${totalItems.toLocaleString()} items (${sizeStr})`,
    };
  }

  // 2. String payload (CSV, raw text, HTML)
  if (typeof data === 'string') {
    const preview = data.length > previewChars
      ? `${data.slice(0, previewChars)}... [truncated]`
      : data;
    return {
      preview,
      summary: `Text payload (${sizeStr})`,
    };
  }

  // 3. Plain Object / Dictionary
  if (data && typeof data === 'object') {
    const keys = Object.keys(data);
    const totalItems = keys.length;
    const preview: Record<string, unknown> = {};
    for (let i = 0; i < Math.min(keys.length, previewItems); i++) {
      const key = keys[i];
      preview[key] = capPreviewValue((data as Record<string, unknown>)[key], previewChars);
    }
    return {
      preview,
      totalItems,
      summary: `Object with ${totalItems} top-level fields (${sizeStr})`,
    };
  }

  return {
    preview: data,
    summary: `Dataset payload (${sizeStr})`,
  };
}
