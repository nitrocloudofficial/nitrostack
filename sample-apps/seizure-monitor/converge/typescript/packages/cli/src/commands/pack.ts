import chalk from 'chalk';
import path from 'path';
import {
  createHeader,
  createSuccessBox,
  createErrorBox,
  NitroSpinner,
  spacer,
  brand,
  NITRO_BANNER_FULL,
  showFooter,
} from '../ui/branding.js';
import { trackEvent, shutdownAnalytics } from '../analytics/posthog.js';
import { packProject } from '../pack/pack-project.js';
import { PackValidationError } from '../pack/validate-project.js';
import type { PackOptions, PackResult } from '../pack/types.js';

interface PackCommandOptions {
  output?: string;
  dryRun?: boolean;
  syncGitignore?: boolean;
  includeEnv?: boolean;
  cwd?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function buildSummaryItems(result: PackResult): string[] {
  const items = [
    `${brand.skyBold(String(result.filesIncluded))} file(s) included`,
  ];

  if (result.outputPath) {
    items.push(`Output: ${brand.sky(result.outputPath)}`);
  }

  if (result.zipSizeBytes !== null) {
    items.push(`Size: ${brand.skyBold(formatBytes(result.zipSizeBytes))}`);
  }

  if (result.gitignoreUpdated) {
    items.push(`Added ${result.addedGitignoreRules.length} .gitignore rule(s)`);
  }

  return items;
}

function printExcludedCategories(result: PackResult): void {
  console.log(chalk.bold('\nExcluded from zip:'));
  for (const category of result.excludedCategories) {
    console.log(`  ${chalk.cyan(category.category)}: ${category.paths.join(', ')}`);
  }
  spacer();
}

function printDryRunTree(result: PackResult): void {
  if (!result.dryRunTree) return;
  console.log(chalk.bold('File tree:'));
  console.log(result.dryRunTree);
  spacer();
}

export async function packCommand(options: PackCommandOptions): Promise<void> {
  console.log(NITRO_BANNER_FULL);
  console.log(createHeader('Pack', 'Create optimized project archive'));

  trackEvent('cli_command_invoked', {
    command: 'pack',
    options: Object.keys(options).filter((key) => options[key as keyof PackCommandOptions] !== undefined),
  });

  const packOptions: PackOptions = {
    output: options.output,
    dryRun: options.dryRun,
    syncGitignore: options.syncGitignore ?? true,
    includeEnv: options.includeEnv ?? false,
    cwd: path.resolve(options.cwd ?? process.cwd()),
  };

  const spinner = new NitroSpinner(
    packOptions.dryRun ? 'Analyzing project files...' : 'Creating optimized zip...',
  ).start();

  try {
    const result = await packProject(packOptions);

    spinner.succeed(
      packOptions.dryRun
        ? 'Dry run complete'
        : `Created ${path.basename(result.outputPath ?? 'archive')}`,
    );

    printExcludedCategories(result);

    if (packOptions.dryRun) {
      printDryRunTree(result);
    }

    console.log(createSuccessBox(
      packOptions.dryRun ? 'Dry Run Complete' : 'Project Packed',
      buildSummaryItems(result),
    ));

    showFooter();
    await shutdownAnalytics();
  } catch (error) {
    spinner.fail('Pack failed');

    if (error instanceof PackValidationError) {
      console.log(createErrorBox('Pack Failed', error.message));
      await shutdownAnalytics();
      process.exit(1);
    }

    console.log(createErrorBox(
      'Pack Failed',
      error instanceof Error ? error.message : String(error),
    ));
    await shutdownAnalytics();
    process.exit(1);
  }
}
