import chalk from 'chalk';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import {
  createHeader,
  createBox,
  createInfoBox,
  createErrorBox,
  log,
  spacer,
  brand,
  NITRO_BANNER_FULL,
  showFooter
} from '../ui/branding.js';
import { trackEvent, shutdownAnalytics } from '../analytics/posthog.js';

interface StartOptions {
  port?: string;
}

export async function startCommand(options: StartOptions) {
  console.log(NITRO_BANNER_FULL);
  console.log(createHeader('Start', 'Production mode'));

  const port = options.port || '3000';

  trackEvent('cli_command_invoked', {
    command: 'start',
    options: Object.keys(options).filter(k => options[k as keyof StartOptions] !== undefined),
  });

  // Check if dist/index.js exists
  const distIndexPath = path.join(process.cwd(), 'dist', 'index.js');
  if (!fs.existsSync(distIndexPath)) {
    console.log(createErrorBox('Build Required', 'Run npm run build first'));
    spacer();
    log('npm run build', 'dim');
    process.exit(1);
  }

  // Auto-detect widgets
  const widgetsOutPath = path.join(process.cwd(), 'src', 'widgets', 'out');
  const hasBuiltWidgets = fs.existsSync(widgetsOutPath);

  if (!hasBuiltWidgets) {
    const widgetsPackageJsonPath = path.join(process.cwd(), 'src', 'widgets', 'package.json');
    if (fs.existsSync(widgetsPackageJsonPath)) {
      log('Widgets not built - run npm run build to include widgets', 'warning');
      spacer();
    }
  }

  // Show server info
  console.log(createInfoBox([
    { label: 'Server', value: `http://localhost:${port}` },
    { label: 'Mode', value: 'Production' },
    { label: 'Transport', value: 'HTTP + STDIO (dual)' },
    { label: 'Streamable HTTP', value: `http://localhost:${port}/mcp` },
    { label: 'Legacy SDK SSE', value: `http://localhost:${port}/sse` },
    ...(hasBuiltWidgets ? [{ label: 'Widgets', value: 'Bundled' }] : []),
  ]));

  log('Starting server...', 'info');
  spacer();

  trackEvent('cli_start_executed', {
    has_built_widgets: hasBuiltWidgets,
    port: Number(port),
    build_exists: true,
  });

  // Start the MCP server
  const serverProcess = spawn('node', [distIndexPath], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: port,
    },
  });

  // Handle process exit
  serverProcess.on('exit', (code) => {
    if (code !== 0) {
      console.log(createErrorBox('Server Crashed', `Exit code: ${code}`));
      process.exit(code || 1);
    }
  });

  // Handle graceful shutdown
  const shutdown = () => {
    spacer();
    console.log(createBox([chalk.yellow.bold('Shutting down...')]));

    serverProcess.kill('SIGTERM');
    setTimeout(() => {
      serverProcess.kill('SIGKILL');
      console.log(chalk.dim('\nGoodbye! 👋\n'));
      process.exit(0);
    }, 5000);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  showFooter();

  // Keep process alive
  await new Promise(() => { });
}
