import chalk from 'chalk';
import { clearConfig, loadConfig } from '../auth/token-store.js';
import { createSuccessBox, log } from '../ui/branding.js';

export interface LogoutCommandOptions {
  configPath?: string;
}

/**
 * Logs out of NitroCloud and cleans up stored session tokens.
 */
export async function logoutCommand(options: LogoutCommandOptions = {}): Promise<void> {
  const currentConfig = await loadConfig(options.configPath);

  if (!currentConfig.token && !currentConfig.user) {
    console.log(chalk.yellow('\nNo active NitroCloud session found.'));
    console.log(chalk.dim('You are already logged out. Run "nitrostack login" to authenticate.\n'));
    return;
  }

  const accountEmail = currentConfig.user?.email || 'Authenticated User';

  await clearConfig(options.configPath);

  console.log(
    createSuccessBox('Logged Out', [
      `Account:        ${chalk.bold(accountEmail)}`,
      `Status:         ${chalk.yellow.bold('Signed Out')}`,
      '',
      `${chalk.dim('To sign in again, run:')} ${chalk.cyan('nitrostack login')}`,
    ]),
  );
}
