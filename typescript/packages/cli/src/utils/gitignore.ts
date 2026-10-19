import path from 'path';
import fs from 'fs-extra';

/**
 * Ensures that a pattern is listed in the project's .gitignore file.
 * Returns true if the file was modified/created, false if pattern was already present.
 */
export async function ensureGitignoreContains(
  pattern: string,
  cwd: string = process.cwd(),
): Promise<boolean> {
  const gitignorePath = path.join(path.resolve(cwd), '.gitignore');
  const normalizedPattern = pattern.trim();

  if (!(await fs.pathExists(gitignorePath))) {
    await fs.writeFile(
      gitignorePath,
      `# Local Environment Variables & Secrets\n${normalizedPattern}\n`,
      'utf8',
    );
    return true;
  }

  const content = await fs.readFile(gitignorePath, 'utf8');
  const lines = content.split(/\r?\n/).map((line) => line.trim());

  const alreadyIgnored = lines.some((line) => {
    return (
      line === normalizedPattern ||
      line === `${normalizedPattern}/` ||
      line === `/${normalizedPattern}` ||
      line === `/${normalizedPattern}/`
    );
  });

  if (alreadyIgnored) {
    return false;
  }

  const trailingNewline = content.endsWith('\n') ? '' : '\n';
  const entry = `${trailingNewline}\n# Local Environment Variables & Secrets\n${normalizedPattern}\n`;
  await fs.appendFile(gitignorePath, entry, 'utf8');
  return true;
}
