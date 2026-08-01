#!/usr/bin/env node
import { Command } from 'commander';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { realpathSync } from 'fs';
import { packProject } from './pack-project.js';
import { PackValidationError } from './validate-project.js';
import type { PackOptions, PackResult } from './types.js';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function printExclusionReport(result: PackResult): void {
  console.log(chalk.bold('\nExcluded from zip:'));
  for (const category of result.excludedCategories) {
    console.log(`  ${chalk.cyan(category.category)}: ${category.paths.join(', ')}`);
  }
}

function printDryRunTree(result: PackResult): void {
  if (!result.dryRunTree) return;
  console.log(chalk.bold('\nFile tree:'));
  console.log(result.dryRunTree);
}

function printPackSummary(result: PackResult, dryRun: boolean): void {
  if (result.gitignoreUpdated) {
    console.log(chalk.green(`Updated .gitignore with ${result.addedGitignoreRules.length} rule(s).`));
  }

  printExclusionReport(result);

  if (dryRun) {
    printDryRunTree(result);
  }

  console.log(chalk.bold('\nPack summary:'));
  console.log(`  Project: ${result.projectName}`);
  console.log(`  Files included: ${result.filesIncluded}`);

  if (result.outputPath) {
    console.log(`  Output: ${result.outputPath}`);
  }

  if (result.zipSizeBytes !== null) {
    console.log(`  Zip size: ${formatBytes(result.zipSizeBytes)}`);
  } else {
    console.log('  Dry run: zip file was not created.');
  }
}

export async function runStandalonePack(argv: string[] = process.argv): Promise<void> {
  const program = new Command();

  program
    .name('nitrostack-pack')
    .description('Create an optimized zip of a NitroStack project')
    .option('-o, --output <path>', 'Zip filename (always written to the project root)')
    .option('--dry-run', 'Show excluded/included summary without creating zip')
    .option('--include-env', 'Include .env files in the zip')
    .option('--no-sync-gitignore', 'Skip merging canonical rules into local .gitignore')
    .option('--cwd <dir>', 'Project directory', process.cwd())
    .action(async (options: {
      output?: string;
      dryRun?: boolean;
      includeEnv?: boolean;
      syncGitignore: boolean;
      cwd: string;
    }) => {
      const packOptions: PackOptions = {
        output: options.output,
        dryRun: options.dryRun,
        includeEnv: options.includeEnv ?? false,
        syncGitignore: options.syncGitignore,
        cwd: path.resolve(options.cwd),
      };

      try {
        const result = await packProject(packOptions);
        printPackSummary(result, Boolean(packOptions.dryRun));
      } catch (error) {
        if (error instanceof PackValidationError) {
          console.error(chalk.red(`Error: ${error.message}`));
          process.exitCode = 1;
          return;
        }
        throw error;
      }
    });

  await program.parseAsync(argv);
}

function isMainModule(): boolean {
  try {
    const argvPath = realpathSync(process.argv[1]);
    const modulePath = realpathSync(fileURLToPath(import.meta.url));
    return argvPath === modulePath;
  } catch {
    return process.argv[1]?.includes('standalone.js')
      || process.argv[1]?.endsWith('nitrostack-pack');
  }
}

if (isMainModule()) {
  void runStandalonePack();
}
