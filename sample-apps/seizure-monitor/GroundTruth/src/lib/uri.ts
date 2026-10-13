/**
 * URI template parameter extraction.
 *
 * NitroStack hands a resource handler the resolved URI string, so parameterized
 * resources parse their own placeholders out of it.
 */

/**
 * Pulls `{placeholder}` values out of a concrete URI.
 *
 * @example
 * matchUri('eod://reports/{employeeId}/{date}', 'eod://reports/emp-1/2026-07-25')
 * // → { employeeId: 'emp-1', date: '2026-07-25' }
 *
 * Returns null when the URI doesn't fit the template.
 */
function matchUri(
  template: string,
  uri: string,
): Record<string, string> | null {
  const names: string[] = [];

  const pattern = template
    // Escape regex metacharacters, leaving our {placeholder} braces intact.
    .replace(/[.*+?^${}()|[\]\\]/g, (m) => (m === '{' || m === '}' ? m : `\\${m}`))
    .replace(/\{(\w+)\}/g, (_, name: string) => {
      names.push(name);
      return '([^/]+)';
    });

  const match = new RegExp(`^${pattern}$`).exec(uri);
  if (!match) return null;

  const params: Record<string, string> = {};
  names.forEach((name, i) => {
    params[name] = decodeURIComponent(match[i + 1]);
  });
  return params;
}

/**
 * Same as matchUri but throws a message the calling agent can act on, so a
 * malformed URI produces a useful error instead of a null dereference.
 */
export function requireParams(
  template: string,
  uri: string,
): Record<string, string> {
  const params = matchUri(template, uri);
  if (!params) {
    throw new Error(
      `URI "${uri}" does not match the expected form "${template}".`,
    );
  }
  return params;
}
