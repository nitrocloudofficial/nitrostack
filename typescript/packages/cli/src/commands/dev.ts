import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import { spawn, ChildProcess, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import chokidar from 'chokidar';
import ora, { Ora } from 'ora';
import {
  NITRO_BANNER_FULL,
  createHeader,
  createBox,
  createErrorBox,
  log,
  spacer,
  brand,
  nextSteps,
  showFooter
} from '../ui/branding.js';
import { trackEvent, shutdownAnalytics } from '../analytics/posthog.js';

// ═══════════════════════════════════════════════════════════════════════════
// BRANDING & UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface StageStatus {
  name: string;
  status: 'pending' | 'running' | 'done' | 'error' | 'skipped';
  message?: string;
}

class DevUI {
  private stages: StageStatus[] = [];
  private currentSpinner: Ora | null = null;
  private startTime: number = Date.now();

  constructor() {
    this.stages = [
      { name: 'Project', status: 'pending' },
      { name: 'TypeScript', status: 'pending' },
      { name: 'Widgets', status: 'pending' },
      { name: 'MCP Server', status: 'pending' },
    ];
  }

  showBanner(): void {
    console.clear();
    console.log(NITRO_BANNER_FULL);
    console.log(chalk.dim('  MCP Development Framework\n'));
  }

  updateStage(name: string, status: StageStatus['status'], message?: string): void {
    const stage = this.stages.find(s => s.name === name);
    if (stage) {
      stage.status = status;
      stage.message = message;
    }
  }

  startSpinner(text: string): Ora {
    if (this.currentSpinner) {
      this.currentSpinner.stop();
    }
    this.currentSpinner = ora({
      text,
      color: 'yellow',
      spinner: 'dots12'
    }).start();
    return this.currentSpinner;
  }

  stopSpinner(success: boolean = true, text?: string): void {
    if (this.currentSpinner) {
      if (success) {
        this.currentSpinner.succeed(text);
      } else {
        this.currentSpinner.fail(text);
      }
      this.currentSpinner = null;
    }
  }

  showReadyScreen(config: {
    widgetsPort?: number;
    hasWidgets: boolean;
    mcpServerPath: string;
    projectPath: string;
  }): void {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);

    const lines = [
      chalk.green.bold('✓ Development Server Ready'),
      '',
      `${chalk.white.bold('MCP Server')}  ${chalk.dim('Running (STDIO transport)')}`,
      ...(config.hasWidgets ? [`${chalk.white.bold('Widgets')}     ${chalk.cyan(`http://localhost:${config.widgetsPort}`)}`] : []),
      '',
      chalk.yellow.bold('To use NitroStack Studio:'),
      `${chalk.dim('1. Open NitroStack Studio')}`,
      `${chalk.dim('2. Project path:')} ${chalk.cyan(config.projectPath)}`,
      '',
      chalk.dim(`Started in ${elapsed}s (Ctrl+C to stop)`),
    ];

    console.log('\n' + createBox(lines, 'info') + '\n');
  }

  showShutdown(): void {
    console.log('\n' + createBox([chalk.yellow.bold('Shutting down...')]) + '\n');
  }

  showError(message: string): void {
    console.log('\n' + createErrorBox('Error', message) + '\n');
  }

  log(message: string, type: 'info' | 'success' | 'warn' | 'error' = 'info'): void {
    const prefix = {
      info: chalk.blue('ℹ'),
      success: chalk.green('✓'),
      warn: chalk.yellow('⚠'),
      error: chalk.red('✗'),
    }[type];
    console.log(`${prefix} ${message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function isNitrostackFromNpm(): boolean {
  try {
    const result = execSync('npm list -g nitrostack --json', {
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    const parsed = JSON.parse(result);
    if (parsed.dependencies && parsed.dependencies.nitrostack) {
      const nitrostackInfo = parsed.dependencies.nitrostack;
      return nitrostackInfo.version && !nitrostackInfo.resolved?.includes('file:');
    }
  } catch {
    return false;
  }
  return false;
}

function isLocalDevelopment(): boolean {
  return __dirname.includes('/src/cli/') || __dirname.includes('\\src\\cli\\');
}

function execSilent(command: string, options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}): boolean {
  try {
    execSync(command, {
      ...options,
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    return true;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN DEV COMMAND
// ═══════════════════════════════════════════════════════════════════════════

interface DevOptions {
  port: string;
  noOpen?: boolean;
}

export async function devCommand(options: DevOptions) {
  console.log(NITRO_BANNER_FULL);
  console.log(createHeader('Dev', 'Development mode'));
  const ui = new DevUI();
  let tscWatchProcess: ChildProcess | null = null;
  let widgetsDevProcess: ChildProcess | null = null;
  let isShuttingDown = false;
  const devStartTime = Date.now();

  trackEvent('cli_command_invoked', {
    command: 'dev',
    options: Object.keys(options).filter(k => options[k as keyof DevOptions] !== undefined),
  });

  const shutdown = async (code: number = 0) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    ui.showShutdown();

    trackEvent('cli_dev_stopped', {
      session_duration_ms: Date.now() - devStartTime,
      exit_reason: code === 0 ? 'sigint' : 'error',
    });
    await shutdownAnalytics();

    if (tscWatchProcess) {
      tscWatchProcess.kill();
      tscWatchProcess = null;
    }

    if (widgetsDevProcess) {
      widgetsDevProcess.kill();
      widgetsDevProcess = null;
    }

    setTimeout(() => {
      console.log(chalk.dim('\nGoodbye! 👋\n'));
      process.exit(code);
    }, 500);
  };

  process.on('SIGINT', () => shutdown(0));
  process.on('SIGTERM', () => shutdown(0));

  try {
    // Show banner
    ui.showBanner();

    const projectPath = process.cwd();

    // ─────────────────────────────────────────────────────────────────────
    // STAGE 1: Validate Project
    // ─────────────────────────────────────────────────────────────────────
    let spinner = ui.startSpinner('Validating project...');

    const packageJsonPath = path.join(projectPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      ui.stopSpinner(false, 'package.json not found');
      throw new Error('Not a NitroStack project');
    }

    const widgetsPath = path.join(projectPath, 'src', 'widgets');
    const widgetsPackageJsonPath = path.join(widgetsPath, 'package.json');
    const hasWidgets = fs.existsSync(widgetsPackageJsonPath);

    ui.stopSpinner(true, `Project validated ${hasWidgets ? chalk.dim('(with widgets)') : ''}`);

    // ─────────────────────────────────────────────────────────────────────
    // STAGE 2: Setup Widgets (if present)
    // ─────────────────────────────────────────────────────────────────────
    if (hasWidgets) {
      spinner = ui.startSpinner('Checking widget dependencies...');

      const fromNpm = isNitrostackFromNpm();
      const isLocalDev = isLocalDevelopment();
      const widgetsNodeModulesPath = path.join(widgetsPath, 'node_modules');
      const widgetsNitrostackPath = path.join(widgetsNodeModulesPath, '@nitrostack');

      if (!fs.existsSync(widgetsNodeModulesPath) || !fs.existsSync(widgetsNitrostackPath)) {
        // Link local packages if in dev mode
        if (isLocalDev && !fromNpm) {
          spinner.text = 'Linking local @nitrostack/widgets...';
          execSilent('npm link @nitrostack/widgets', { cwd: widgetsPath });
        }

        spinner.text = 'Installing widget dependencies...';
        const installSuccess = execSilent('npm install', { cwd: widgetsPath });
        if (!installSuccess) {
          ui.stopSpinner(false, 'Failed to install widget dependencies');
          throw new Error('Widget dependency installation failed');
        }
      }

      ui.stopSpinner(true, 'Widget dependencies ready');

      // Check if widgets need initial build
      const widgetsOutPath = path.join(widgetsPath, '.next');
      if (!fs.existsSync(widgetsOutPath)) {
        spinner = ui.startSpinner('Building widgets for first time...');
        const buildSuccess = execSilent('npm run build', {
          cwd: widgetsPath,
          env: { ...process.env, NODE_ENV: 'production' }
        });
        if (buildSuccess) {
          ui.stopSpinner(true, 'Widgets built');
        } else {
          ui.stopSpinner(false, 'Widget build failed (will try dev server)');
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // STAGE 3: Build TypeScript
    // ─────────────────────────────────────────────────────────────────────
    const distIndexPath = path.join(projectPath, 'dist', 'index.js');
    if (!fs.existsSync(distIndexPath)) {
      spinner = ui.startSpinner('Building MCP server...');
      const buildSuccess = execSilent('npx tsc', { cwd: projectPath });
      if (!buildSuccess) {
        ui.stopSpinner(false, 'TypeScript build failed');
        throw new Error('Build failed. Please fix errors and try again.');
      }
      ui.stopSpinner(true, 'MCP server built');
    }

    // ─────────────────────────────────────────────────────────────────────
    // STAGE 4: Start TypeScript Watch Mode
    // ─────────────────────────────────────────────────────────────────────
    spinner = ui.startSpinner('Starting TypeScript compiler...');

    tscWatchProcess = spawn('npx', ['tsc', '--watch', '--preserveWatchOutput'], {
      cwd: projectPath,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });

    // Only log compilation status, suppress verbose output
    let tscReady = false;
    if (tscWatchProcess.stdout) {
      tscWatchProcess.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Found 0 errors') || output.includes('Watching for file changes')) {
          if (!tscReady) {
            tscReady = true;
          } else {
            console.log(chalk.green('✓') + chalk.dim(' MCP server recompiled'));
          }
        } else if (output.includes('error TS')) {
          console.log(chalk.red('✗') + chalk.dim(' TypeScript error - check your code'));
        }
      });
    }

    ui.stopSpinner(true, 'TypeScript watch mode started');

    // ─────────────────────────────────────────────────────────────────────
    // STAGE 5: Start Widget Dev Server (if present)
    // ─────────────────────────────────────────────────────────────────────
    const widgetsPort = 3001;

    if (hasWidgets) {
      spinner = ui.startSpinner('Starting widget dev server...');

      widgetsDevProcess = spawn('npm', ['run', 'dev', '--', '--port', String(widgetsPort)], {
        cwd: widgetsPath,
        env: { ...process.env, NODE_ENV: 'development' },
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
      });

      // Wait for widgets to be ready
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, 8000);

        if (widgetsDevProcess?.stdout) {
          widgetsDevProcess.stdout.on('data', (data) => {
            const output = data.toString();
            if (output.includes('Ready') || output.includes('started') || output.includes(String(widgetsPort))) {
              clearTimeout(timeout);
              resolve();
            }
          });
        }
      });

      ui.stopSpinner(true, `Widget dev server running on :${widgetsPort}`);

      // Set up watcher for new widget pages
      const widgetPagesPath = path.join(widgetsPath, 'app');
      const widgetNextCachePath = path.join(widgetsPath, '.next');

      const watcher = chokidar.watch(widgetPagesPath, {
        ignored: /(^|[\/\\])\../,
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 100 }
      });

      let lastRestart = 0;
      const RESTART_COOLDOWN = 3000;

      watcher.on('add', (filepath) => {
        if (filepath.endsWith('page.tsx') || filepath.endsWith('page.jsx')) {
          const now = Date.now();
          if (now - lastRestart < RESTART_COOLDOWN) return;

          console.log(chalk.yellow('⚡') + chalk.dim(' New widget detected, restarting...'));

          lastRestart = Date.now();

          if (widgetsDevProcess) {
            widgetsDevProcess.kill();
          }

          if (fs.existsSync(widgetNextCachePath)) {
            fs.rmSync(widgetNextCachePath, { recursive: true, force: true });
          }

          widgetsDevProcess = spawn('npm', ['run', 'dev', '--', '--port', String(widgetsPort)], {
            cwd: widgetsPath,
            env: { ...process.env, NODE_ENV: 'development' },
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: true,
          });
        }
      });
    }

    // ─────────────────────────────────────────────────────────────────────
    // READY!
    // ─────────────────────────────────────────────────────────────────────
    ui.showReadyScreen({
      widgetsPort,
      hasWidgets,
      mcpServerPath: distIndexPath,
      projectPath,
    });

    trackEvent('cli_dev_started', {
      has_widgets: hasWidgets,
      port: widgetsPort,
      startup_duration_ms: Date.now() - devStartTime,
    });

    // Set up log forwarding for errors only
    widgetsDevProcess?.stderr?.on('data', (data) => {
      const output = data.toString();
      if (output.includes('error')) {
        console.log(chalk.red('✗') + chalk.dim(' Widgets: ') + output.trim());
      }
    });

    showFooter();

    // Keep process alive
    await new Promise(() => { });

  } catch (error: unknown) {
    ui.showError(error instanceof Error ? error.message : String(error));
    shutdown(1);
  }
}
