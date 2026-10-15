import readline from 'readline';
import open from 'open';
import chalk from 'chalk';
import { startLoopbackAuth } from '../auth/loopback.js';
import { loadConfig, saveConfig, NitroUser } from '../auth/token-store.js';
import { NitroSpinner, createSuccessBox, createErrorBox } from '../ui/branding.js';

export interface LoginCommandOptions {
  token?: string;
  apiUrl?: string;
  cloudUrl?: string;
  openBrowser?: (url: string) => Promise<any>;
  skipPrompt?: boolean;
  configPath?: string;
}

function waitForEnter(promptText: string): Promise<void> {
  if (!process.stdin.isTTY) {
    return Promise.resolve();
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(promptText, () => {
      rl.close();
      resolve();
    });
  });
}

/**
 * Fetches user profile data from NitroCloud backend to populate local user identity.
 */
async function fetchUserProfile(apiUrl: string, token: string): Promise<NitroUser | undefined> {
  try {
    const meUrl = `${apiUrl.replace(/\/+$/, '')}/auth/me`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(meUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return undefined;
    }

    const payload = (await response.json()) as any;
    const userObj = payload?.data || payload?.user || payload;

    if (userObj && (userObj.email || userObj.id || userObj._id)) {
      return {
        id: String(userObj._id || userObj.id || ''),
        email: String(userObj.email || ''),
        name: userObj.name ? String(userObj.name) : undefined,
      };
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Executes the login command, supporting browser loopback OAuth and direct token provisioning.
 */
export async function loginCommand(options: LoginCommandOptions = {}): Promise<string> {
  const currentConfig = await loadConfig(options.configPath);
  const targetApiUrl = options.apiUrl || currentConfig.apiUrl;
  const cloudUrl = options.cloudUrl || process.env.NITRO_CLOUD_URL || 'https://nitrocloud.ai';

  // 1. Direct Token Provisioning (Headless / CI mode)
  if (options.token) {
    const userProfile = await fetchUserProfile(targetApiUrl, options.token);
    await saveConfig(
      {
        token: options.token,
        apiUrl: targetApiUrl,
        user: userProfile,
      },
      options.configPath,
    );

    console.log(
      createSuccessBox('Logged In', [
        `User:   ${chalk.bold(userProfile?.email || 'Authenticated via token')}`,
        `API:    ${chalk.dim(targetApiUrl)}`,
        `Config: ${chalk.dim('~/.nitrostack/config.json')}`,
      ]),
    );

    return options.token;
  }

  // 2. Interactive Browser Loopback Authentication
  console.log(chalk.bold('\nAuthenticate NitroStack CLI with NitroCloud'));
  console.log(chalk.dim('A browser window will open so you can sign in to your account.\n'));

  if (!options.skipPrompt) {
    await waitForEnter(chalk.cyan('Press Enter to open the browser and log in... '));
  }

  const spinner = new NitroSpinner('Waiting for browser authentication...').start();
  const openFn = options.openBrowser ?? open;

  try {
    const authPromise = startLoopbackAuth(cloudUrl, {
      onServerReady: async (authUrl) => {
        try {
          await openFn(authUrl);
        } catch {
          spinner.info(`Open this URL in your browser to log in:\n  ${chalk.cyan(authUrl)}`);
        }
      },
    });

    const result = await authPromise;
    const effectiveApiUrl = result.apiUrl || targetApiUrl;
    const userProfile = await fetchUserProfile(effectiveApiUrl, result.token);

    await saveConfig(
      {
        token: result.token,
        apiUrl: effectiveApiUrl,
        user: userProfile,
      },
      options.configPath,
    );

    spinner.succeed('Authentication successful!');
    console.log(
      createSuccessBox('Logged In', [
        `User:   ${chalk.bold(userProfile?.email || 'Authenticated')}`,
        `API:    ${chalk.dim(effectiveApiUrl)}`,
        `Config: ${chalk.dim('~/.nitrostack/config.json')}`,
      ]),
    );

    return result.token;
  } catch (error) {
    spinner.fail('Authentication failed');
    const msg = error instanceof Error ? error.message : String(error);
    console.log(createErrorBox('Login Error', msg));
    throw error;
  }
}
