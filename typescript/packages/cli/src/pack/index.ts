export { createIgnoreMatcher } from './ignore-matcher.js';
export type { IgnoreMatcher } from './ignore-matcher.js';
export {
  mergeGitignoreRules,
  buildIgnoreMatcher,
  syncProjectGitignore,
  isPathIgnored,
} from './gitignore.js';
export { loadCanonicalGitignore, getCanonicalGitignorePath, writeCanonicalGitignore } from './canonical-gitignore.js';
export {
  getExclusionReport,
  HARD_EXCLUDED_PATTERNS,
  ENV_EXCLUDED_PATTERNS,
  EXCLUSION_CATEGORIES,
} from './exclusions.js';
export { collectFilesToPack, createOptimizedZip } from './zipper.js';
export { formatPackTree } from './tree.js';
export { packProject } from './pack-project.js';
export { validateNitrostackProject, PackValidationError } from './validate-project.js';
export type {
  PackOptions,
  PackResult,
  ExclusionCategory,
  NitrostackProjectInfo,
  GitignoreMergeResult,
} from './types.js';
