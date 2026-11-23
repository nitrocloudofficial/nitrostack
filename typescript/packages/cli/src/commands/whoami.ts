import chalk from 'chalk';
import { loadConfig, saveConfig } from '../auth/token-store.js';
import { createSuccessBox, log } from '../ui/branding.js';

export interface WhoamiCommandOptions {
  configPath?: string;
}

/**
 * Checks and displays the currently authenticated NitroCloud identity.
 */
export async function whoamiCommand(options: WhoamiCommandOptions = {}): Promise<void> {
  const config = await loadConfig(options.configPath);

  if (!config.token) {
    console.log(chalk.yellow('\nNo active session found.'));
    console.log(chalk.dim('Run "nitrostack login" to authenticate with NitroCloud.\n'));
    return;
  }

  // Attempt to probe backend for fresh identity verification
  let isVerified = false;
  let activeEmail = config.user?.email;
  let activeName = config.user?.name;

  try {
    const meUrl = `${config.apiUrl.replace(/\/+$/, '')}/auth/me`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(meUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      isVerified = true;
      const payload = (await response.json()) as any;
      const userObj = payload?.data || payload?.user || payload;
      if (userObj?.email) {
        activeEmail = String(userObj.email);
        activeName = userObj.name ? String(userObj.name) : activeName;
        // Update local cache
        await saveConfig(
          {
            user: {
              id: String(userObj._id || userObj.id || config.user?.id || ''),
              email: activeEmail,
              name: activeName,
            },
          },
          options.configPath,
        );
      }
    } else if (response.status === 401) {
      log('Session expired or revoked. Run "nitrostack login" to re-authenticate.', 'error');
      return;
    }
  } catch {
    // Network unreachable or timeout: fall back gracefully to local cached identity
  }

  const emailDisplay = activeEmail || 'Authenticated User';

  const details = [
    `Logged in as:   ${chalk.bold(emailDisplay)}`,
    ...(activeName ? [`Name:           ${chalk.white(activeName)}`] : []),
    `Status:         ${isVerified ? chalk.green.bold('Active & Verified') : chalk.yellow.bold('Cached (Offline)')}`,
  ];

  console.log(createSuccessBox('Authenticated', details));
}
