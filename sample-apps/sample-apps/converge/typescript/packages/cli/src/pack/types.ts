export interface PackOptions {
  output?: string;
  dryRun?: boolean;
  syncGitignore?: boolean;
  includeEnv?: boolean;
  cwd?: string;
}

export interface PackResult {
  outputPath: string | null;
  projectName: string;
  filesIncluded: number;
  zipSizeBytes: number | null;
  gitignoreUpdated: boolean;
  addedGitignoreRules: string[];
  excludedCategories: ExclusionCategory[];
  includedPaths?: string[];
  excludedPaths?: string[];
  dryRunTree?: string;
}

export interface ExclusionCategory {
  category: string;
  paths: string[];
}

export interface NitrostackProjectInfo {
  projectRoot: string;
  packageJsonPath: string;
  projectName: string;
  nitrostackPackages: string[];
}

export interface GitignoreMergeResult {
  mergedContent: string;
  addedRules: string[];
  updated: boolean;
}
