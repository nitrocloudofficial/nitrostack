import path from 'path';
import fs from 'fs-extra';

export interface NitroProjectConfig {
  organizationId: string;
  orgSlug?: string;
  orgName?: string;
  appId: string;
  appName: string;
  linkedAt: string;
}

export const NITRO_DIR_NAME = '.nitro';
export const PROJECT_CONFIG_FILENAME = 'project.json';

/**
 * Returns the absolute path to the `.nitro` directory for a given working directory.
 */
export function getProjectConfigDir(cwd: string = process.cwd()): string {
  return path.join(path.resolve(cwd), NITRO_DIR_NAME);
}

/**
 * Returns the absolute path to `.nitro/project.json` for a given working directory.
 */
export function getProjectConfigPath(cwd: string = process.cwd()): string {
  return path.join(getProjectConfigDir(cwd), PROJECT_CONFIG_FILENAME);
}

/**
 * Loads and validates `.nitro/project.json` from the project directory.
 */
export async function loadProjectConfig(
  cwd: string = process.cwd(),
): Promise<NitroProjectConfig | null> {
  const configPath = getProjectConfigPath(cwd);
  if (!(await fs.pathExists(configPath))) {
    return null;
  }

  try {
    const raw = (await fs.readJSON(configPath)) as Partial<NitroProjectConfig>;
    if (raw && typeof raw === 'object' && raw.organizationId && raw.appId && raw.appName) {
      return {
        organizationId: String(raw.organizationId),
        orgSlug: raw.orgSlug ? String(raw.orgSlug) : undefined,
        orgName: raw.orgName ? String(raw.orgName) : undefined,
        appId: String(raw.appId),
        appName: String(raw.appName),
        linkedAt: raw.linkedAt || new Date().toISOString(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Persists the project linkage configuration into `.nitro/project.json`.
 */
export async function saveProjectConfig(
  config: NitroProjectConfig,
  cwd: string = process.cwd(),
): Promise<void> {
  const dirPath = getProjectConfigDir(cwd);
  const configPath = getProjectConfigPath(cwd);

  await fs.mkdirp(dirPath);
  await fs.writeJSON(configPath, config, { spaces: 2 });
}

/**
 * Removes `.nitro/project.json` and deletes the `.nitro` directory if empty.
 */
export async function removeProjectConfig(cwd: string = process.cwd()): Promise<boolean> {
  const configPath = getProjectConfigPath(cwd);
  const dirPath = getProjectConfigDir(cwd);

  if (!(await fs.pathExists(configPath))) {
    return false;
  }

  await fs.remove(configPath);

  try {
    const remainingFiles = await fs.readdir(dirPath);
    if (remainingFiles.length === 0) {
      await fs.remove(dirPath);
    }
  } catch {}

  return true;
}

/**
 * Ensures that `.nitro` is listed in the project's `.gitignore` file to prevent committing local workspace linkage.
 */
export async function ensureGitignoreContainsNitro(cwd: string = process.cwd()): Promise<boolean> {
  const gitignorePath = path.join(path.resolve(cwd), '.gitignore');
  const targetPattern = '.nitro';

  if (!(await fs.pathExists(gitignorePath))) {
    await fs.writeFile(gitignorePath, `# NitroStack local configuration\n${targetPattern}\n`, 'utf8');
    return true;
  }

  const content = await fs.readFile(gitignorePath, 'utf8');
  const lines = content.split(/\r?\n/).map((line) => line.trim());

  const alreadyIgnored = lines.some((line) => {
    return line === '.nitro' || line === '.nitro/' || line === '/.nitro' || line === '/.nitro/';
  });

  if (alreadyIgnored) {
    return false;
  }

  const trailingNewline = content.endsWith('\n') ? '' : '\n';
  const entry = `${trailingNewline}\n# NitroStack local workspace configuration\n${targetPattern}\n`;
  await fs.appendFile(gitignorePath, entry, 'utf8');
  return true;
}
