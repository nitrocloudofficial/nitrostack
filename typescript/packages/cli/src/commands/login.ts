import readline from 'readline';
import open from 'open';
import chalk from 'chalk';
import { sanitizeCallbackApiUrl, startLoopbackAuth } from '../auth/loopback.js';
import { loadConfig, saveConfig, NitroUser, DEFAULT_CLOUD_URL } from '../auth/token-store.js';
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
async function fetchUserProfile(apiUrl: string, token: string): Promise<NitroUser> {
  const meUrl = `${apiUrl.replace(/\/+$/, '')}/auth/me`;
  const response = await fetch(meUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(6000),
  }).catch(() => {
    throw new Error('Could not reach the NitroCloud API to verify the session.');
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error('The NitroCloud API rejected the session. Sign in again or supply a valid token.');
  }
  if (!response.ok) {
    throw new Error(`Could not verify the NitroCloud session (HTTP ${response.status}).`);
  }

  type UserProfile = Partial<NitroUser> & { _id?: string };
  const payload = await response.json().catch(() => undefined) as
    (UserProfile & { data?: UserProfile; user?: UserProfile }) | undefined;
  const user = payload?.data || payload?.user || payload;
  if (!user || !(user.email || user.id || user._id)) {
    throw new Error('The NitroCloud API returned an invalid user profile.');
  }
  return {
    id: String(user._id || user.id || ''),
    email: String(user.email || ''),
    name: user.name ? String(user.name) : undefined,
  };
}

/**
 * Executes the login command, supporting browser loopback OAuth and direct token provisioning.
 */
export async function loginCommand(options: LoginCommandOptions = {}): Promise<string> {
  const currentConfig = await loadConfig(options.configPath);
  const apiUrlOverride = options.apiUrl || process.env.NITRO_API_URL;
  const targetApiUrl = apiUrlOverride || currentConfig.apiUrl;
  const cloudUrl = options.cloudUrl || process.env.NITRO_CLOUD_URL || currentConfig.cloudUrl || DEFAULT_CLOUD_URL;

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
        `Account:        ${chalk.bold(userProfile?.email || 'Token Authentication')}`,
        `Status:         ${chalk.green.bold('Active & Verified')}`,
        '',
        `${chalk.dim('Next: Run')} ${chalk.cyan('nitrostack link')} ${chalk.dim('to connect a project')}`,
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
    const effectiveApiUrl =
      apiUrlOverride || sanitizeCallbackApiUrl(result.apiUrl) || targetApiUrl;
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
        `Account:        ${chalk.bold(userProfile?.email || 'Authenticated User')}`,
        `Status:         ${chalk.green.bold('Active & Verified')}`,
        '',
        `${chalk.dim('Next: Run')} ${chalk.cyan('nitrostack link')} ${chalk.dim('to connect a project')}`,
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
