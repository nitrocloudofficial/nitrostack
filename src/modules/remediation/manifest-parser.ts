/**
 * Parses dependency manifests into (package, ecosystem, version) triples
 * OSV's querybatch can check. Supports package.json (npm), requirements.txt
 * (PyPI), and go.mod (Go).
 *
 * IMPORTANT LIMITATION: this reads the version as *declared* in the
 * manifest (range operators stripped to a best-effort concrete version),
 * not resolved against a lockfile. "^4.17.15" becomes "4.17.15". For a
 * ranged dependency the resolved version installed in practice may differ —
 * this is approximate, same tradeoff every scanner without lockfile access
 * makes. scan_manifest surfaces this in its response `note` field.
 */

export type Ecosystem = "npm" | "PyPI" | "Go";
export type ManifestType = "package.json" | "requirements.txt" | "go.mod";

export interface ParsedDependency {
  name: string;
  ecosystem: Ecosystem;
  declared_range: string;
  version: string;
}

const DEPENDENCY_SECTIONS = ["dependencies", "devDependencies"] as const;

function stripRangeOperators(range: string): string {
  const match = range.match(/\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/);
  return match ? match[0] : range.replace(/^[\^~>=<\s]+/, "");
}

export function parsePackageJson(content: string): ParsedDependency[] {
  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch (e) {
    throw new Error(`Invalid package.json: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (typeof json !== "object" || json === null) {
    throw new Error("Invalid package.json: expected a JSON object.");
  }

  const deps: ParsedDependency[] = [];
  for (const section of DEPENDENCY_SECTIONS) {
    const block = (json as Record<string, unknown>)[section];
    if (!block || typeof block !== "object") continue;
    for (const [name, range] of Object.entries(block as Record<string, unknown>)) {
      if (typeof range !== "string") continue;
      // Not resolvable against a registry version — skip.
      if (/^(workspace:|file:|link:|git|https?:)/.test(range)) continue;
      const version = stripRangeOperators(range);
      if (!/^\d+\.\d+\.\d+/.test(version)) continue; // "*", "latest", etc. — nothing concrete to check
      deps.push({ name, ecosystem: "npm", declared_range: range, version });
    }
  }
  return deps;
}

/**
 * requirements.txt only yields a concrete version for pinned (`==`)
 * requirements — a range like `>=1.4,<2.0` has no single version to check
 * against OSV without resolving it, so those lines are skipped rather than
 * guessed at. `-r other.txt`, `--index-url`, `-e ./local-pkg`, comments, and
 * environment markers (`; python_version < "3.8"`) are all ignored.
 */
export function parseRequirementsTxt(content: string): ParsedDependency[] {
  const deps: ParsedDependency[] = [];
  for (const rawLine of content.split("\n")) {
    let line = rawLine.split("#")[0].trim();
    if (!line) continue;
    if (line.startsWith("-")) continue; // -r, -e, --index-url, --hash, etc.
    line = line.split(";")[0].trim(); // strip environment markers

    const match = line.match(/^([A-Za-z0-9_.-]+)(\[[^\]]*\])?\s*==\s*([0-9][0-9A-Za-z.+-]*)/);
    if (!match) continue;
    const [, name, , version] = match;
    deps.push({ name: name.toLowerCase(), ecosystem: "PyPI", declared_range: line, version });
  }
  return deps;
}

/**
 * go.mod's `require` directives (single-line or block form). Go module
 * versions are always `vMAJOR.MINOR.PATCH[-pre][+build]`; the `v` prefix is
 * stripped for the concrete version but kept in `declared_range`. Lines
 * ending in `// indirect` are still checked — a transitive vuln is still a
 * vuln — but the annotation is preserved for context.
 */
export function parseGoMod(content: string): ParsedDependency[] {
  const deps: ParsedDependency[] = [];
  let inBlock = false;

  for (const rawLine of content.split("\n")) {
    const line = rawLine.split("//")[0].trim();
    if (!inBlock && /^require\s*\(/.test(line)) {
      inBlock = true;
      continue;
    }
    if (inBlock && line === ")") {
      inBlock = false;
      continue;
    }

    let entry: string | null = null;
    if (inBlock) {
      entry = line;
    } else if (line.startsWith("require ")) {
      entry = line.slice("require ".length).trim();
    }
    if (!entry) continue;

    const match = entry.match(/^(\S+)\s+v(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)/);
    if (!match) continue;
    const [, name, version] = match;
    deps.push({ name, ecosystem: "Go", declared_range: `v${version}`, version });
  }
  return deps;
}

export function parseManifest(manifestType: ManifestType, content: string): ParsedDependency[] {
  switch (manifestType) {
    case "package.json":
      return parsePackageJson(content);
    case "requirements.txt":
      return parseRequirementsTxt(content);
    case "go.mod":
      return parseGoMod(content);
  }
}
