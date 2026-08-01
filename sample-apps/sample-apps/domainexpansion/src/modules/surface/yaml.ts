/**
 * Minimal, dependency-free JSON-to-YAML serialiser, scoped to the MCP output
 * layer (not the engine — this is pure output shaping, not detection logic).
 * Handles exactly what a JSON-safe OpenAPI document needs: objects, arrays,
 * strings, numbers, booleans, null. No anchors, no multi-line block scalars —
 * deliberately not a general-purpose YAML library, just enough to satisfy
 * export_reconstructed_spec's format:'yaml' option without adding a
 * dependency for one output format.
 */

function needsQuoting(s: string): boolean {
  if (s.length === 0) return true;
  if (/^[\s]|[\s]$/.test(s)) return true;
  if (/^[-?:,\[\]{}#&*!|>'"%@`]/.test(s)) return true;
  if (/[:#]/.test(s)) return true;
  if (/^(true|false|null|~|yes|no)$/i.test(s)) return true;
  if (/^-?\d+(\.\d+)?$/.test(s)) return true;
  return false;
}

function scalarToYaml(v: string | number | boolean | null): string {
  if (v === null) return 'null';
  if (typeof v === 'boolean' || typeof v === 'number') return String(v);
  return needsQuoting(v) ? JSON.stringify(v) : v;
}

export function toYaml(value: unknown, indent = 0): string {
  const pad = '  '.repeat(indent);

  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return scalarToYaml(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return value
      .map((item) => {
        if (item !== null && typeof item === 'object') {
          const nested = toYaml(item, indent + 1);
          return `${pad}- ${nested.trimStart().replace(new RegExp(`\\n${'  '.repeat(indent + 1)}`, 'g'), `\n${pad}  `)}`;
        }
        return `${pad}- ${scalarToYaml(item as string | number | boolean | null)}`;
      })
      .join('\n');
  }

  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return '{}';
  return entries
    .map(([key, v]) => {
      const safeKey = needsQuoting(key) ? JSON.stringify(key) : key;
      if (v !== null && typeof v === 'object' && (Array.isArray(v) ? v.length > 0 : Object.keys(v).length > 0)) {
        return `${pad}${safeKey}:\n${toYaml(v, indent + 1)}`;
      }
      return `${pad}${safeKey}: ${toYaml(v, indent + 1)}`;
    })
    .join('\n');
}
