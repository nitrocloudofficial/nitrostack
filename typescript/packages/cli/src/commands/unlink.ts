import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { loadProjectConfig, removeProjectConfig } from '../project/project-config.js';
import { createSuccessBox, log } from '../ui/branding.js';

export interface UnlinkCommandOptions {
  cwd?: string;
  yes?: boolean;
  promptFn?: (questions: any[]) => Promise<any>;
}

/**
 * Unlinks the current project directory from NitroCloud by safely removing `.nitro/project.json`.
 */
export async function unlinkCommand(options: UnlinkCommandOptions = {}): Promise<boolean> {
  const cwd = path.resolve(options.cwd || process.cwd());
  const existingConfig = await loadProjectConfig(cwd);

  if (!existingConfig) {
    log('No project linkage found in this directory.', 'warning');
    console.log(chalk.dim('Run "nitrostack link" to connect this directory to a NitroCloud app.\n'));
    return false;
  }

  const prompt = options.promptFn || inquirer.prompt;

  if (!options.yes) {
    const { confirmed } = await prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: `Are you sure you want to unlink from "${existingConfig.appName}"?`,
        default: false,
      },
    ]);

    if (!confirmed) {
      log('Unlink operation cancelled.', 'info');
      return false;
    }
  }

  await removeProjectConfig(cwd);

  console.log(
    createSuccessBox('Project Unlinked', [
      `App:            ${chalk.bold(existingConfig.appName || 'MCP Server')}`,
      `Status:         ${chalk.yellow.bold('Disconnected')}`,
      '',
      `${chalk.dim('To link again, run:')} ${chalk.cyan('nitrostack link')}`,
    ]),
  );

  return true;
}
