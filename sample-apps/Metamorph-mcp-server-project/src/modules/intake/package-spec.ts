import { assertPackageRef, type Ecosystem, type PackageRef } from './osv.client.js';

// Flat input format for forms and AI clients: "npm:lodash@4.17.15" or "Packagist:guzzlehttp/guzzle@6.5.0".
// Scoped npm names work too ("npm:@scope/pkg@1.2.3") because the LAST "@" separates the version.
const ECOSYSTEMS: Record<string, Ecosystem> = { npm: 'npm', packagist: 'Packagist' };
const HELP = 'Invalid package. Use ecosystem:name@version, for example npm:lodash@4.17.15 or Packagist:guzzlehttp/guzzle@6.5.0.';

export function parsePackageSpec(spec: string): PackageRef {
  if (typeof spec !== 'string' || spec.length === 0 || spec.length > 300) throw new RangeError(HELP);
  const colon = spec.indexOf(':');
  const ecosystem = colon > 0 ? ECOSYSTEMS[spec.slice(0, colon).trim().toLowerCase()] : undefined;
  if (!ecosystem) throw new RangeError(HELP);
  const rest = spec.slice(colon + 1).trim();
  const at = rest.lastIndexOf('@');
  if (at <= 0) throw new RangeError(HELP);
  const ref: PackageRef = { name: rest.slice(0, at).trim(), ecosystem, version: rest.slice(at + 1).trim() };
  assertPackageRef(ref); // name and version patterns, length caps
  return ref;
}
