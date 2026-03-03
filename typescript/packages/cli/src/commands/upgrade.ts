import chalk from 'chalk';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import {
  createHeader,
  createBox,
  createSuccessBox,
  createErrorBox,
  NitroSpinner,
  log,
  spacer,
  nextSteps,
  brand,
  NITRO_BANNER_FULL,
  showFooter
} from '../ui/branding.js';
import { trackEvent, shutdownAnalytics } from '../analytics/posthog.js';

interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface UpgradeOptions {
  latest?: boolean;
  dryRun?: boolean;
}

interface UpgradeResult {
  location: string;
  packageName: string;
  previousVersion: string;
  newVersion: string;
  upgraded: boolean;
}

/**
 * Get the latest version of a package from npm registry
 */
function getLatestVersion(packageName: string = '@nitrostack/core'): string {
  try {
    const result = execSync(`npm view ${packageName} version`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return result;
  } catch {
    throw new Error(`Failed to fetch latest version for ${packageName} from npm`);
  }
}

/**
 * Get the current installed version of @nitrostack/core from package.json
 */
function getCoreVersion(packageJsonPath: string): string | null {
  if (!fs.existsSync(packageJsonPath)) {
    return null;
  }

  const packageJson: PackageJson = fs.readJSONSync(packageJsonPath);
  return packageJson.dependencies?.['@nitrostack/core'] ||
    packageJson.devDependencies?.['@nitrostack/core'] ||
    null;
}

/**
 * Parse version string to extract the actual version number
 */
function parseVersion(versionString: string): string {
  return versionString.replace(/^[\^~>=<]+/, '');
}

/**
 * Compare two version strings
 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = parseVersion(v1).split('.').map(Number);
  const parts2 = parseVersion(v2).split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;

    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }

  return 0;
}

/**
 * Update all @nitrostack/* versions in package.json
 */
function updatePackageJson(
  packageJsonPath: string,
  newVersion: string,
  dryRun: boolean
): UpgradeResult[] {
  if (!fs.existsSync(packageJsonPath)) {
    return [];
  }

  const packageJson: PackageJson = fs.readJSONSync(packageJsonPath);
  const results: UpgradeResult[] = [];
  let hasChanges = false;

  const updateDeps = (deps?: Record<string, string>) => {
    if (!deps) return;
    for (const pkg of Object.keys(deps)) {
      if (pkg.startsWith('@nitrostack/')) {
        const currentVersion = deps[pkg];
        if (compareVersions(currentVersion, newVersion) < 0) {
          results.push({
            location: path.basename(path.dirname(packageJsonPath)),
            packageName: pkg,
            previousVersion: currentVersion,
            newVersion: `^${newVersion}`,
            upgraded: true,
          });
          deps[pkg] = `^${newVersion}`;
          hasChanges = true;
        }
      }
    }
  };

  updateDeps(packageJson.dependencies);
  updateDeps(packageJson.devDependencies);

  if (hasChanges && !dryRun) {
    fs.writeJSONSync(packageJsonPath, packageJson, { spaces: 2 });
  }

  return results;
}

/**
 * Run npm install silently
 */
function runNpmInstall(directory: string): void {
  execSync('npm install', {
    cwd: directory,
    stdio: 'pipe',
  });
}

/**
 * Main upgrade command handler
 */
export async function upgradeCommand(options: UpgradeOptions): Promise<void> {
  console.log(NITRO_BANNER_FULL);
  console.log(createHeader('Upgrade', 'Update @nitrostack packages to latest'));

  trackEvent('cli_command_invoked', {
    command: 'upgrade',
    options: Object.keys(options).filter(k => options[k as keyof UpgradeOptions] !== undefined),
  });

  const projectRoot = process.cwd();
  const rootPackageJsonPath = path.join(projectRoot, 'package.json');
  const widgetsPath = path.join(projectRoot, 'src', 'widgets');
  const widgetsPackageJsonPath = path.join(widgetsPath, 'package.json');

  // Validate project
  if (!fs.existsSync(rootPackageJsonPath)) {
    console.log(createErrorBox('Not a NitroStack Project', 'package.json not found'));
    process.exit(1);
  }

  const coreVersion = getCoreVersion(rootPackageJsonPath);
  if (!coreVersion) {
    console.log(createErrorBox('Not a NitroStack Project', '@nitrostack/core is not a dependency'));
    process.exit(1);
  }

  // Fetch latest version
  const spinner = new NitroSpinner('Checking for updates...').start();
  let latestVersion: string;

  try {
    latestVersion = getLatestVersion('@nitrostack/core');
    spinner.succeed(`Latest version: ${chalk.cyan(latestVersion)}`);
  } catch (error) {
    spinner.fail('Failed to fetch latest version');
    process.exit(1);
  }

  // Check if already on latest
  const currentParsedVersion = parseVersion(coreVersion);
  if (compareVersions(currentParsedVersion, latestVersion) >= 0) {
    spacer();
    console.log(createSuccessBox('Already Up to Date', [
      `Current version: ${currentParsedVersion}`,
      `Latest version:  ${latestVersion}`,
    ]));
    trackEvent('cli_upgrade_completed', {
      packages_upgraded: 0,
      from_version: currentParsedVersion,
      to_version: latestVersion,
      dry_run: !!options.dryRun,
      already_current: true,
    });
    await shutdownAnalytics();
    return;
  }

  const allResults: UpgradeResult[] = [];
  const dryRun = options.dryRun ?? false;

  if (dryRun) {
    spacer();
    log('Dry run mode - no changes will be made', 'warning');
  }

  spacer();
  log('Upgrading dependencies...', 'info');
  spacer();

  // Upgrade root
  const rootSpinner = new NitroSpinner('Updating root package.json...').start();
  try {
    const results = updatePackageJson(rootPackageJsonPath, latestVersion, dryRun);
    if (results.length > 0) {
      allResults.push(...results);
      rootSpinner.succeed(`Root: Updated ${results.length} @nitrostack packages`);

      if (!dryRun) {
        const installSpinner = new NitroSpinner('Installing dependencies...').start();
        runNpmInstall(projectRoot);
        installSpinner.succeed('Root dependencies installed');
      }
    } else {
      rootSpinner.info('Root: All @nitrostack packages are up to date');
    }
  } catch (error) {
    rootSpinner.fail('Failed to upgrade root');
    console.error(error);
  }

  // Upgrade widgets if they exist
  if (fs.existsSync(widgetsPackageJsonPath)) {
    const widgetsSpinner = new NitroSpinner('Updating widgets package.json...').start();
    try {
      const results = updatePackageJson(widgetsPackageJsonPath, latestVersion, dryRun);
      if (results.length > 0) {
        allResults.push(...results);
        widgetsSpinner.succeed(`Widgets: Updated ${results.length} @nitrostack packages`);

        if (!dryRun) {
          const installSpinner = new NitroSpinner('Installing widget dependencies...').start();
          runNpmInstall(widgetsPath);
          installSpinner.succeed('Widget dependencies installed');
        }
      } else {
        widgetsSpinner.info('Widgets: All @nitrostack packages are up to date');
      }
    } catch (error) {
      widgetsSpinner.fail('Failed to upgrade widgets');
    }
  }

  // Summary
  spacer();
  if (allResults.length === 0) {
    log('No packages were upgraded', 'warning');
  } else {
    // Unique packages upgraded
    const uniquePackages = Array.from(new Set(allResults.map(r => r.packageName)));
    const summaryItems = uniquePackages.map(pkg => {
      const result = allResults.find(r => r.packageName === pkg)!;
      return `${pkg}: ${parseVersion(result.previousVersion)} → ${parseVersion(result.newVersion)}`;
    });

    if (dryRun) {
      spacer();
      console.log(createBox([
        chalk.yellow.bold('Dry run complete'),
        '',
        chalk.dim('No changes were made to your project.'),
        chalk.dim('Run without --dry-run to apply the upgrade.'),
      ], 'warning'));
    } else {
      console.log(createSuccessBox('Upgrade Complete', [
        ...summaryItems,
        '',
        chalk.dim(`Total updates across all packages: ${allResults.length}`)
      ]));
      nextSteps([
        'Review the changes in package.json',
        'Restart your development server',
        'Check docs.nitrostack.ai for migration guides',
      ]);
    }
    showFooter();

    trackEvent('cli_upgrade_completed', {
      packages_upgraded: allResults.length,
      from_version: currentParsedVersion,
      to_version: latestVersion,
      dry_run: dryRun,
      already_current: false,
    });
    await shutdownAnalytics();
  }
}
