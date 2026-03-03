import chalk from 'chalk';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import {
  createHeader,
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

interface InstallOptions {
  skipWidgets?: boolean;
  production?: boolean;
}

/**
 * Run npm install silently
 */
function runNpmInstall(directory: string, production: boolean): void {
  const args = production ? ['install', '--production'] : ['install'];
  execSync(`npm ${args.join(' ')}`, {
    cwd: directory,
    stdio: 'pipe',
  });
}

/**
 * Check if a directory has a package.json
 */
function hasPackageJson(directory: string): boolean {
  return fs.existsSync(path.join(directory, 'package.json'));
}

/**
 * Main install command handler
 */
export async function installCommand(options: InstallOptions): Promise<void> {
  console.log(NITRO_BANNER_FULL);
  console.log(createHeader('Install', 'Install project dependencies'));

  const startTime = Date.now();

  trackEvent('cli_command_invoked', {
    command: 'install',
    options: Object.keys(options).filter(k => options[k as keyof InstallOptions] !== undefined),
  });

  const projectRoot = process.cwd();
  const rootPackageJsonPath = path.join(projectRoot, 'package.json');
  const widgetsPath = path.join(projectRoot, 'src', 'widgets');

  // Validate project
  if (!fs.existsSync(rootPackageJsonPath)) {
    console.log(createErrorBox('Not a Valid Project', 'package.json not found'));
    process.exit(1);
  }

  const production = options.production ?? false;
  const skipWidgets = options.skipWidgets ?? false;

  if (production) {
    log('Production mode - dev dependencies will be skipped', 'info');
    spacer();
  }

  const installed: string[] = [];

  // Install root dependencies
  const rootSpinner = new NitroSpinner('Installing root dependencies...').start();

  try {
    runNpmInstall(projectRoot, production);
    rootSpinner.succeed('Root dependencies installed');
    installed.push('Root project');
  } catch (error) {
    rootSpinner.fail('Failed to install root dependencies');
    console.log(createErrorBox('Installation Failed', error instanceof Error ? error.message : String(error)));
    trackEvent('cli_install_failed', {
      error: (error instanceof Error ? error.message : String(error)).slice(0, 200),
      stage: 'root',
    });
    await shutdownAnalytics();
    process.exit(1);
  }

  // Install widget dependencies if they exist
  if (!skipWidgets && hasPackageJson(widgetsPath)) {
    const widgetsSpinner = new NitroSpinner('Installing widget dependencies...').start();

    try {
      runNpmInstall(widgetsPath, production);
      widgetsSpinner.succeed('Widget dependencies installed');
      installed.push('Widgets (src/widgets)');
    } catch (error) {
      widgetsSpinner.fail('Failed to install widget dependencies');
      log(error instanceof Error ? error.message : String(error), 'dim');
    }
  } else if (!skipWidgets) {
    log('No widgets directory found', 'dim');
  } else {
    log('Widgets skipped (--skip-widgets)', 'dim');
  }

  // Summary
  spacer();
  console.log(createSuccessBox('Installation Complete', installed));

  nextSteps([
    'npm run dev     - Start development server',
    'npm run build   - Build for production',
    'npm run upgrade - Upgrade nitrostack',
  ]);

  showFooter();

  trackEvent('cli_install_completed', {
    has_widgets: hasPackageJson(widgetsPath),
    skip_widgets: skipWidgets,
    production,
    duration_ms: Date.now() - startTime,
  });
  await shutdownAnalytics();
}
