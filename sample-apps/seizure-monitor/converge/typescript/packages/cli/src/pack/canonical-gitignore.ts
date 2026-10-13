import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Resolve the bundled canonical .gitignore shipped with the CLI package.
 */
export function getCanonicalGitignorePath(): string {
  return path.join(moduleDir, '../../assets/canonical.gitignore');
}

/**
 * Load canonical .gitignore rules from the bundled starter template copy.
 */
export async function loadCanonicalGitignore(): Promise<string> {
  const canonicalPath = getCanonicalGitignorePath();
  if (!(await fs.pathExists(canonicalPath))) {
    throw new Error(`Canonical .gitignore not found at ${canonicalPath}`);
  }
  return fs.readFile(canonicalPath, 'utf-8');
}

/**
 * Write the bundled canonical .gitignore into a project root as `.gitignore`.
 * Used by init because npm never ships files named `.gitignore` in the package tarball.
 */
export async function writeCanonicalGitignore(projectRoot: string): Promise<void> {
  const content = await loadCanonicalGitignore();
  await fs.writeFile(path.join(projectRoot, '.gitignore'), content, 'utf-8');
}
