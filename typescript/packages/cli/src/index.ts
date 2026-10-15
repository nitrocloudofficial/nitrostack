#!/usr/bin/env node
import { Command } from 'commander';
import { createRequire } from 'module';
import { initCommand } from './commands/init.js';
import { devCommand } from './commands/dev.js';
import { buildCommand } from './commands/build.js';
import { startCommand } from './commands/start.js';
import { generate } from './commands/generate.js';
import { upgradeCommand } from './commands/upgrade.js';
import { installCommand } from './commands/install.js';
import { cursorCommand } from './commands/cursor.js';
import { packCommand } from './commands/pack.js';
import { loginCommand } from './commands/login.js';
import { logoutCommand } from './commands/logout.js';
import { whoamiCommand } from './commands/whoami.js';
import { linkCommand } from './commands/link.js';
import { unlinkCommand } from './commands/unlink.js';
import { deployCommand } from './commands/deploy.js';
import { logsCommand } from './commands/logs.js';
import { testRemoteCommand } from './commands/test-remote.js';
import { envPullCommand, envPushCommand } from './commands/env.js';
import { registerCursorMcpServer } from './integrations/cursor.js';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json');

export function createProgram() {
  const program = new Command();

  program
    .name('nitrostack')
    .description('NitroStack - Build MCP servers with ease')
    .version(packageJson.version);

  program
    .command('init')
    .description('Initialize a new NitroStack project')
    .argument('[project-name]', 'Name of the project')
    .option('--template <template>', 'Template to use (typescript-starter, typescript-pizzaz, typescript-oauth)')
    .option('--preset <preset>', 'Preset to use (enterprise-search, code-mode, starter, pizzaz, oauth)')
    .option('--description <description>', 'Description of the project')
    .option('--author <author>', 'Author of the project')
    .option('--skip-install', 'Skip installing dependencies')
    .option('--force', 'Overwrite existing skill files when adding agent skills')
    .action(initCommand);

  program
    .command('dev')
    .description('Start development server (MCP server + widgets) with hot reload')
    .option('--port <port>', 'Port for widget dev server', '3001')
    .action(devCommand);

  program
    .command('build')
    .description('Build the project for production')
    .option('--output <path>', 'Output directory', 'dist')
    .action(buildCommand);

  program
    .command('start')
    .description('Start the production server')
    .option('--port <port>', 'Port for server', '3000')
    .action(startCommand);

  program
    .command('generate')
    .alias('g')
    .description('Generate boilerplate code or types')
    .argument('<type>', 'Type of component (middleware, interceptor, pipe, filter, service, guard, health, module, tools, resources, prompts, types)')
    .argument('[name]', 'Name of the component (optional for "types")')
    .option('--module <module>', 'Module name (for module-specific generation)')
    .option('--output <path>', 'Output path (for types generation)')
    .option('--force', 'Overwrite existing files')
    .option('--skip-related', 'Skip generating related files (for modules)')
    .action(generate);

  program
    .command('upgrade')
    .description('Upgrade nitrostack to the latest version in the project')
    .option('--dry-run', 'Show what would be upgraded without making changes')
    .option('--latest', 'Force upgrade to the latest version even if already up to date')
    .action(upgradeCommand);

  program
    .command('install')
    .alias('i')
    .description('Install dependencies in root and src/widgets directories')
    .option('--skip-widgets', 'Skip installing widget dependencies')
    .option('--production', 'Install production dependencies only')
    .action(installCommand);

  program
    .command('cursor')
    .alias('c')
    .description('Integrate this MCP server with Cursor')
    .option('-g, --global', 'Install globally to ~/.cursor/mcp.json')
    .option('-l, --local', 'Install locally to .cursor/mcp.json')
    .option('-t, --type <type>', 'Connection type: "command", "legacy-sse", or "streamable-http" (alias: "sse" → legacy-sse)')
    .option('-u, --url <url>', 'HTTP connection URL (for legacy-sse or streamable-http)')
    .option('-p, --port <port>', 'Port for default HTTP URL (for legacy-sse or streamable-http)')
    .option('--force', 'Force overwrite of existing configuration')
    .action(cursorCommand);

  program
    .command('pack')
    .description('Create an optimized zip of the project (excludes build artifacts)')
    .option('-o, --output <path>', 'Zip filename (always written to the project root)')
    .option('--dry-run', 'Show excluded/included summary without creating zip')
    .option('--include-env', 'Include .env files in the zip')
    .option('--no-sync-gitignore', 'Skip merging canonical rules into local .gitignore')
    .option('--cwd <dir>', 'Project directory', process.cwd())
    .action(packCommand);

  program
    .command('login')
    .description('Log in to NitroCloud and authenticate this CLI')
    .option('--token <token>', 'Authenticate directly using an API token (headless / CI)')
    .option('--api-url <url>', 'Override NitroCloud API URL')
    .option('--cloud-url <url>', 'Override NitroCloud web portal URL')
    .action(async (options) => {
      await loginCommand(options);
    });

  program
    .command('logout')
    .description('Log out of NitroCloud and clear local credentials')
    .action(logoutCommand);

  program
    .command('whoami')
    .description('Display the currently authenticated NitroCloud user and session')
    .action(whoamiCommand);

  program
    .command('link')
    .description('Link this directory to a NitroCloud organization and application')
    .option('--org <orgId>', 'Organization ID or slug to link to')
    .option('--app <appId>', 'App ID or name to link to')
    .option('--cwd <dir>', 'Working directory', process.cwd())
    .action(async (options) => {
      await linkCommand(options);
    });

  program
    .command('unlink')
    .description('Unlink current project from NitroCloud')
    .option('-y, --yes', 'Skip confirmation prompt')
    .option('--cwd <dir>', 'Working directory', process.cwd())
    .action(async (options) => {
      await unlinkCommand(options);
    });

  program
    .command('deploy')
    .description('Deploy the local MCP server project to NitroCloud')
    .option('--prod', 'Deploy directly to production environment')
    .option('--token <token>', 'Authenticate directly via API token (headless / CI)')
    .option('--app <appId>', 'Override linked application ID')
    .option('--org <orgId>', 'Override linked organization ID')
    .option('--include-env', 'Include .env files in deployment bundle')
    .option('--no-wait', 'Trigger deployment and exit immediately without waiting for build completion')
    .option('--cursor', 'Automatically register the deployed live MCP endpoint in ~/.cursor/mcp.json')
    .option('--cursor-project', 'Automatically register the deployed live MCP endpoint in .cursor/mcp.json')
    .option('--cwd <dir>', 'Project root directory', process.cwd())
    .option('-y, --yes', 'Skip confirmation prompts')
    .action(async (options) => {
      await deployCommand(options);
    });

  program
    .command('logs [deployment-id]')
    .description('View and stream build and container runtime logs from NitroCloud')
    .option('-f, --follow', 'Follow log stream continuously')
    .option('--build', 'Stream build and compilation logs (default)')
    .option('--runtime', 'Stream container stdout and stderr runtime logs')
    .option('-n, --lines <number>', 'Number of initial lines to output', '50')
    .option('--cwd <dir>', 'Project root directory', process.cwd())
    .action(async (deploymentId, options) => {
      await logsCommand(deploymentId, options);
    });

  program
    .command('test-remote [target]')
    .description('Probe and verify remote deployed MCP endpoints over SSE / HTTP')
    .option('--timeout <ms>', 'Connection timeout in milliseconds', '5000')
    .option('--cwd <dir>', 'Project root directory', process.cwd())
    .action(async (target, options) => {
      await testRemoteCommand(target, options);
    });

  const envCmd = program
    .command('env')
    .description('Manage encrypted environment secrets in NitroCloud OpenBao vault');

  envCmd
    .command('pull [destination]')
    .description('Pull decrypted environment secrets from NitroCloud vault into a local file')
    .option('--app <appId>', 'Application ID to pull secrets for')
    .option('--cwd <dir>', 'Project root directory', process.cwd())
    .action(async (destination, options) => {
      await envPullCommand(destination, options);
    });

  envCmd
    .command('push [source]')
    .description('Push local environment secrets into NitroCloud OpenBao vault')
    .option('--app <appId>', 'Application ID to push secrets for')
    .option('--cwd <dir>', 'Project root directory', process.cwd())
    .action(async (source, options) => {
      await envPushCommand(source, options);
    });

  return program;
}

// Re-export commands for programmatic use
export { initCommand } from './commands/init.js';
export { devCommand } from './commands/dev.js';
export { buildCommand } from './commands/build.js';
export { startCommand } from './commands/start.js';
export { generate } from './commands/generate.js';
export { upgradeCommand } from './commands/upgrade.js';
export { installCommand } from './commands/install.js';
export { cursorCommand } from './commands/cursor.js';
export { packCommand } from './commands/pack.js';
export { packProject } from './pack/pack-project.js';
export { loginCommand } from './commands/login.js';
export { logoutCommand } from './commands/logout.js';
export { whoamiCommand } from './commands/whoami.js';
export { linkCommand } from './commands/link.js';
export { unlinkCommand } from './commands/unlink.js';
export { deployCommand } from './commands/deploy.js';
export { logsCommand } from './commands/logs.js';
export { testRemoteCommand } from './commands/test-remote.js';
export { envPullCommand, envPushCommand } from './commands/env.js';
export { registerCursorMcpServer } from './integrations/cursor.js';
export { startLoopbackAuth } from './auth/loopback.js';
export { loadConfig, saveConfig, clearConfig } from './auth/token-store.js';
export {
  loadProjectConfig,
  saveProjectConfig,
  removeProjectConfig,
  ensureGitignoreContainsNitro,
} from './project/project-config.js';
export { StudioApiClient, StudioApiError } from './api/client.js';
export { uploadZipToS3 } from './deploy/s3-uploader.js';
export {
  requestAppPresignedUpload,
  markUploadComplete,
  confirmDeployment,
} from './deploy/lifecycle.js';
export {
  pollDeploymentStatus,
  fetchDeploymentStatus,
  isTerminalStatus,
  isSuccessfulStatus,
} from './deploy/status-poller.js';
export {
  DeploymentLogStreamer,
  colorizeLogLine,
} from './deploy/log-streamer.js';
export { ensureGitignoreContains } from './utils/gitignore.js';

// Run the CLI when this module is the entry point
import { fileURLToPath } from 'url';
import { realpathSync } from 'fs';

const currentFilePath = fileURLToPath(import.meta.url);

// Resolve symlinks to compare actual file paths
function isMainModule(): boolean {
  try {
    const argvPath = realpathSync(process.argv[1]);
    const modulePath = realpathSync(currentFilePath);
    return argvPath === modulePath;
  } catch {
    // If we can't resolve paths, check if the filename matches
    return process.argv[1]?.includes('index.js') ||
      process.argv[1]?.endsWith('nitrostack-cli');
  }
}

if (isMainModule()) {
  createProgram().parse();
}
