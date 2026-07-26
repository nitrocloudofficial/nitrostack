/** Small presentation helpers shared across screens. */

/** Browser-safe UTF-8 -> base64 (btoa alone breaks on non-Latin1 input). */
export function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

/** Strips the `data:...;base64,` prefix a FileReader result carries. */
export function stripDataUrlPrefix(dataUrl: string): string {
  const comma = dataUrl.indexOf(',');
  return comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
}

/** Reads a File as base64 without ever decoding it as text. */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error(`Could not read ${file.name}.`));
        return;
      }
      resolve(stripDataUrlPrefix(result));
    };
    reader.readAsDataURL(file);
  });
}

export function formatDateTime(iso: string | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** `passport_not_expired` -> `Passport not expired` */
export function humanizeCheck(check: string): string {
  const text = check.replace(/_/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** `fullName` -> `Full name` */
export function humanizeFieldName(field: string): string {
  const spaced = field.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

export function formatConfidence(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return `${Math.round(value * 100)}%`;
}

/** Short, non-identifying case reference for display. */
export function shortId(id: string | undefined): string {
  if (!id) return '—';
  return id.length <= 12 ? id : `${id.slice(0, 8)}…${id.slice(-4)}`;
}
