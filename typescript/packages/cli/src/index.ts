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
    .option('--description <description>', 'Description of the project')
    .option('--author <author>', 'Author of the project')
    .option('--skip-install', 'Skip installing dependencies')
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
