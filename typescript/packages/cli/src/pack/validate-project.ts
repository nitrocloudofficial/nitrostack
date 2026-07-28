import path from 'path';
import fs from 'fs-extra';
import type { NitrostackProjectInfo } from './types.js';

interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export class PackValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PackValidationError';
  }
}

function collectNitrostackPackages(packageJson: PackageJson): string[] {
  const packages = new Set<string>();
  const sections = [packageJson.dependencies, packageJson.devDependencies];

  for (const section of sections) {
    if (!section) continue;
    for (const pkg of Object.keys(section)) {
      if (pkg.startsWith('@nitrostack/')) {
        packages.add(pkg);
      }
    }
  }

  return Array.from(packages).sort();
}

/**
 * Validate that the target directory is a NitroStack project.
 */
export async function validateNitrostackProject(
  cwd: string = process.cwd(),
): Promise<NitrostackProjectInfo> {
  const projectRoot = path.resolve(cwd);
  const packageJsonPath = path.join(projectRoot, 'package.json');

  if (!(await fs.pathExists(packageJsonPath))) {
    throw new PackValidationError('package.json not found in the current directory');
  }

  const packageJson = await fs.readJSON(packageJsonPath) as PackageJson;
  const nitrostackPackages = collectNitrostackPackages(packageJson);

  if (nitrostackPackages.length === 0) {
    throw new PackValidationError(
      'No @nitrostack/* dependencies found in package.json. Run this command from a NitroStack project.',
    );
  }

  const projectName = packageJson.name || path.basename(projectRoot);

  return {
    projectRoot,
    packageJsonPath,
    projectName,
    nitrostackPackages,
  };
}
