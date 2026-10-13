import path from 'path';
import { getExclusionReport } from './exclusions.js';
import { buildIgnoreMatcher, syncProjectGitignore } from './gitignore.js';
import { formatPackTree } from './tree.js';
import type { PackOptions, PackResult } from './types.js';
import { validateNitrostackProject } from './validate-project.js';
import { collectFilesToPack, createOptimizedZip, getZipSizeBytes } from './zipper.js';

function sanitizeZipName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'nitrostack-project';
}

/**
 * Always place the zip in the project root.
 * If --output is provided, only the filename is used (directories / absolute paths are ignored).
 */
function resolveOutputPath(projectRoot: string, projectName: string, output?: string): string {
  const rawName = output
    ? path.basename(output).replace(/\.zip$/i, '') || projectName
    : projectName;
  const fileName = sanitizeZipName(rawName);

  return path.join(projectRoot, `${fileName}.zip`);
}

/**
 * Pack a NitroStack project into an optimized zip archive.
 */
export async function packProject(options: PackOptions = {}): Promise<PackResult> {
  const cwd = options.cwd ?? process.cwd();
  const syncGitignore = options.syncGitignore ?? true;
  const dryRun = options.dryRun ?? false;
  const includeEnv = options.includeEnv ?? false;

  const project = await validateNitrostackProject(cwd);
  const mergeResult = await syncProjectGitignore(project.projectRoot, syncGitignore);
  const matcher = buildIgnoreMatcher(mergeResult.mergedContent, { includeEnv });
  const outputPath = resolveOutputPath(project.projectRoot, project.projectName, options.output);

  if (dryRun) {
    const collection = await collectFilesToPack(project.projectRoot, matcher);
    return {
      outputPath: null,
      projectName: project.projectName,
      filesIncluded: collection.filesIncluded,
      zipSizeBytes: null,
      gitignoreUpdated: mergeResult.updated,
      addedGitignoreRules: mergeResult.addedRules,
      excludedCategories: getExclusionReport(includeEnv),
      includedPaths: collection.includedPaths,
      excludedPaths: collection.excludedPaths,
      dryRunTree: formatPackTree(
        project.projectName,
        collection.includedPaths,
        collection.excludedPaths,
      ),
    };
  }

  const collection = await createOptimizedZip(project.projectRoot, outputPath, matcher);
  const zipSizeBytes = await getZipSizeBytes(outputPath);

  return {
    outputPath,
    projectName: project.projectName,
    filesIncluded: collection.filesIncluded,
    zipSizeBytes,
    gitignoreUpdated: mergeResult.updated,
    addedGitignoreRules: mergeResult.addedRules,
    excludedCategories: getExclusionReport(includeEnv),
  };
}
