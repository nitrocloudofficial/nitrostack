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
    log('No active NitroCloud session found.', 'info');
    return;
  }

  await clearConfig(options.configPath);

  console.log(
    createSuccessBox('Logged Out', [
      'Successfully logged out of NitroCloud.',
    ]),
  );
}
