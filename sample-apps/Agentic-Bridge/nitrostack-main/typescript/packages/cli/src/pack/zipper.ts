import path from 'path';
import fs from 'fs';
import { createWriteStream } from 'fs';
import archiver from 'archiver';
import { isPathIgnored } from './gitignore.js';
import type { IgnoreMatcher } from './ignore-matcher.js';

export interface ZipCollectionResult {
  filesIncluded: number;
  includedPaths: string[];
  excludedPaths: string[];
}

/** True when realPath is the root or a descendant of rootReal. */
function isInsideRoot(realPath: string, rootReal: string): boolean {
  const relative = path.relative(rootReal, realPath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

/**
 * Collect relative file paths that should be included, and pruned excluded roots.
 * Excluded directories are recorded once and not descended into.
 * Symlinks are resolved via stat/realpath so:
 * - symlink-to-directory is walked (not archived as a file)
 * - cycles and targets outside the project root are skipped
 */
export async function collectFilesToPack(
  projectRoot: string,
  matcher: IgnoreMatcher,
): Promise<ZipCollectionResult> {
  const includedPaths: string[] = [];
  const excludedPaths: string[] = [];
  const visitedDirs = new Set<string>();

  let projectRootReal: string;
  try {
    projectRootReal = await fs.promises.realpath(projectRoot);
  } catch {
    projectRootReal = path.resolve(projectRoot);
  }

  async function walk(currentDir: string): Promise<void> {
    let currentReal: string;
    try {
      currentReal = await fs.promises.realpath(currentDir);
    } catch {
      return;
    }

    if (visitedDirs.has(currentReal)) {
      return;
    }
    if (!isInsideRoot(currentReal, projectRootReal)) {
      return;
    }
    visitedDirs.add(currentReal);

    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);
      const relativePath = path.relative(projectRoot, absolutePath).split(path.sep).join('/');

      let isDirectory = entry.isDirectory();
      let isFile = entry.isFile();

      if (entry.isSymbolicLink()) {
        try {
          const realTarget = await fs.promises.realpath(absolutePath);
          if (!isInsideRoot(realTarget, projectRootReal)) {
            // Symlink escapes the project — skip
            continue;
          }
          const stats = await fs.promises.stat(absolutePath);
          isDirectory = stats.isDirectory();
          isFile = stats.isFile();
        } catch {
          // Broken symlink — skip
          continue;
        }
      }

      if (isPathIgnored(matcher, projectRoot, absolutePath, isDirectory)) {
        const displayPath = isDirectory ? `${relativePath}/` : relativePath;
        excludedPaths.push(displayPath);
        continue;
      }

      if (isDirectory) {
        await walk(absolutePath);
        continue;
      }

      if (isFile) {
        includedPaths.push(relativePath);
      }
    }
  }

  await walk(projectRoot);
  includedPaths.sort();
  excludedPaths.sort();

  return {
    filesIncluded: includedPaths.length,
    includedPaths,
    excludedPaths,
  };
}

/**
 * Create an optimized zip archive from the project directory.
 */
export async function createOptimizedZip(
  projectRoot: string,
  outputPath: string,
  matcher: IgnoreMatcher,
): Promise<ZipCollectionResult> {
  const collection = await collectFilesToPack(projectRoot, matcher);
  const outputDir = path.dirname(outputPath);
  await fs.promises.mkdir(outputDir, { recursive: true });

  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve());
    output.on('error', reject);
    archive.on('error', reject);

    archive.pipe(output);

    for (const relativePath of collection.includedPaths) {
      const absolutePath = path.join(projectRoot, relativePath);
      archive.file(absolutePath, { name: relativePath });
    }

    void archive.finalize();
  });

  return collection;
}

export async function getZipSizeBytes(outputPath: string): Promise<number> {
  const stats = await fs.promises.stat(outputPath);
  return stats.size;
}
