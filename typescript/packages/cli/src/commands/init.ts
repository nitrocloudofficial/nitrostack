import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import {
  NITRO_BANNER_FULL,
  createHeader,
  createSuccessBox,
  createErrorBox,
  NitroSpinner,
  log,
  spacer,
  nextSteps,
  brand,
  showFooter
} from '../ui/branding.js';
import { trackEvent, shutdownAnalytics } from '../analytics/posthog.js';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Check if nitrostack is installed globally from npm registry
 */
function isNitrostackFromNpm(): boolean {
  try {
    const result = execSync('npm list -g @nitrostack/cli --json', {
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    const parsed = JSON.parse(result);

    if (parsed.dependencies && parsed.dependencies['@nitrostack/cli']) {
      const nitrostackInfo = parsed.dependencies['@nitrostack/cli'];
      return nitrostackInfo.version && !nitrostackInfo.resolved?.includes('file:');
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Check if we're running nitrostack from a local development environment
 */
function isLocalDevelopment(): boolean {
  return __dirname.includes('/src/cli/') || __dirname.includes('\\src\\cli\\');
}

interface InitOptions {
  template?: string;
  description?: string;
  author?: string;
  skipInstall?: boolean;
}

export async function initCommand(projectName: string | undefined, options: InitOptions) {
  let spinner: NitroSpinner | null = null;
  const startTime = Date.now();

  trackEvent('cli_command_invoked', {
    command: 'init',
    options: Object.keys(options).filter(k => options[k as keyof InitOptions] !== undefined),
  });

  try {
    // Show banner
    console.log(NITRO_BANNER_FULL);
    spacer();

    // Prompt for project name if not provided
    if (!projectName) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'projectName',
          message: chalk.white('Project name:'),
          default: 'my-mcp-server',
          validate: (input) => {
            if (input.trim().length === 0) {
              return 'Project name cannot be empty';
            }
            return true;
          },
        },
      ]);
      projectName = answers.projectName;
    }

    const finalProjectName: string = projectName!;
    const targetDir = path.join(process.cwd(), finalProjectName);

    // Check if directory exists
    if (fs.existsSync(targetDir)) {
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: chalk.yellow(`Directory ${finalProjectName} already exists. Overwrite?`),
          default: false,
        },
      ]);

      if (!overwrite) {
        log('Cancelled', 'warning');
        process.exit(0);
      }

      fs.removeSync(targetDir);
    }

    // Prompt for template and details if not provided via flags
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'template',
        message: chalk.white('Choose a template:'),
        choices: [
          {
            name: `${brand.signal('Starter')}     ${chalk.dim('Simple calculator for learning basics')}`,
            value: 'typescript-starter',
          },
          {
            name: `${brand.signal('Advanced')}    ${chalk.dim('Pizza shop finder with maps & widgets')}`,
            value: 'typescript-pizzaz',
          },
          {
            name: `${brand.signal('OAuth')}       ${chalk.dim('Flight booking with OAuth 2.1 auth')}`,
            value: 'typescript-oauth',
          },
        ],
        default: 'typescript-starter',
        when: !options.template,
      },
      {
        type: 'input',
        name: 'description',
        message: chalk.white('Description:'),
        default: 'My awesome MCP server',
        when: !options.description,
      },
      {
        type: 'input',
        name: 'author',
        message: chalk.white('Author:'),
        default: '',
        when: !options.author,
      },
    ]);

    // Merge flag values with prompt answers
    const finalTemplate = options.template || answers.template || 'typescript-starter';
    const finalDescription = options.description || answers.description || 'My awesome MCP server';
    const finalAuthor = options.author || answers.author || '';

    spacer();
    spinner = new NitroSpinner('Creating project structure...').start();

    // Create project directory
    fs.mkdirSync(targetDir, { recursive: true });

    // Get template path - templates are in the CLI package root
    const templateDir = path.join(__dirname, '../../templates', finalTemplate);

    // Copy template files
    if (fs.existsSync(templateDir)) {
      fs.copySync(templateDir, targetDir);
    } else {
      await createProjectFromScratch(targetDir, finalProjectName, {
        template: finalTemplate,
        description: finalDescription,
        author: finalAuthor,
      });
    }

    // Update package.json
    const packageJsonPath = path.join(targetDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = fs.readJSONSync(packageJsonPath);
      packageJson.name = finalProjectName;
      packageJson.description = finalDescription;
      packageJson.author = finalAuthor;
      fs.writeJSONSync(packageJsonPath, packageJson, { spaces: 2 });
    }

    spinner.succeed('Project created');

    // Install dependencies
    if (!options.skipInstall) {
      spinner = new NitroSpinner('Installing dependencies...').start();
      try {
        execSync('npm install', {
          cwd: targetDir,
          stdio: 'pipe',
        });
        spinner.succeed('Dependencies installed');
      } catch {
        spinner.warn('Dependencies installation failed - run npm install manually');
      }
    }

    // Handle widgets
    if (!options.skipInstall && ['typescript-starter', 'typescript-pizzaz', 'typescript-oauth'].includes(finalTemplate)) {
      const fromNpm = isNitrostackFromNpm();
      const isLocalDev = isLocalDevelopment();

      if (isLocalDev && !fromNpm) {
        // Local development - link @nitrostack/core
        spinner = new NitroSpinner('Linking local @nitrostack/core...').start();
        try {
          execSync('npm link @nitrostack/core', { cwd: targetDir, stdio: 'pipe' });
          spinner.succeed('Local @nitrostack/core linked');
        } catch {
          spinner.warn('Failed to link @nitrostack/core');
        }

        spinner = new NitroSpinner('Installing widget dependencies...').start();
        try {
          const widgetsDir = path.join(targetDir, 'src', 'widgets');
          execSync('npm link @nitrostack/core', { cwd: widgetsDir, stdio: 'pipe' });
          execSync('npm install', { cwd: widgetsDir, stdio: 'pipe' });
          spinner.succeed('Widget dependencies installed');
        } catch {
          spinner.warn('Widget dependencies will be installed on first run');
        }
      } else {
        // Published package
        spinner = new NitroSpinner('Installing widget dependencies...').start();
        try {
          const widgetsDir = path.join(targetDir, 'src', 'widgets');
          execSync('npm install', { cwd: widgetsDir, stdio: 'pipe' });
          execSync('npm install @nitrostack/core@latest', { cwd: widgetsDir, stdio: 'pipe' });
          spinner.succeed('Widget dependencies installed');
        } catch {
          spinner.warn('Widget dependencies will be installed on first run');
        }
      }
    }

    // Success summary
    spacer();
    console.log(createSuccessBox('Project Ready', [
      `Name: ${finalProjectName}`,
      `Template: ${finalTemplate}`,
      `Path: ${targetDir}`,
    ]));

    // Next steps
    const steps = [
      `cd ${finalProjectName}`,
    ];

    if (options.skipInstall) {
      steps.push('npm install');
    }

    if (finalTemplate === 'typescript-oauth') {
      steps.push('cp .env.example .env  # Configure OAuth');
    }

    steps.push('npm run dev');

    nextSteps(steps);

    // Template-specific tips
    if (finalTemplate === 'typescript-oauth') {
      console.log(chalk.dim('  OAuth Setup: See OAUTH_SETUP.md for provider guides\n'));
    } else if (finalTemplate === 'typescript-pizzaz') {
      console.log(chalk.dim('  Mapbox (optional): Get free key from mapbox.com\n'));
    }

    console.log(chalk.dim('  Happy coding! 🎉\n'));
    showFooter();

    trackEvent('cli_init_completed', {
      template: finalTemplate,
      skip_install: !!options.skipInstall,
      has_custom_description: finalDescription !== 'My awesome MCP server',
      duration_ms: Date.now() - startTime,
    });
    await shutdownAnalytics();

  } catch (error: unknown) {
    if (spinner) {
      spinner.fail('Failed to create project');
    }
    spacer();
    log(error instanceof Error ? error.message : String(error), 'error');

    trackEvent('cli_init_failed', {
      error: (error instanceof Error ? error.message : String(error)).slice(0, 200),
    });
    await shutdownAnalytics();
    process.exit(1);
  }
}

interface ProjectAnswers {
  template: string;
  description: string;
  author: string;
}

async function createProjectFromScratch(
  targetDir: string,
  projectName: string,
  answers: ProjectAnswers
) {
  const packageJson = {
    name: projectName,
    version: '1.0.0',
    description: answers.description,
    author: answers.author,
    main: 'dist/index.js',
    scripts: {
      dev: 'tsx watch src/index.ts',
      build: 'tsc',
      start: 'node dist/index.js',
    },
    dependencies: {
      '@nitrostack/core': '^1.0.0',
      dotenv: '^16.3.1',
    },
    devDependencies: {
      '@types/node': '^20.10.5',
      typescript: '^5.3.3',
      tsx: '^4.7.0',
    },
  };

  fs.writeJSONSync(path.join(targetDir, 'package.json'), packageJson, { spaces: 2 });

  const tsconfig = {
    compilerOptions: {
      target: 'ES2022',
      module: 'commonjs',
      outDir: './dist',
      rootDir: './src',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
    },
    include: ['src/**/*'],
    exclude: ['node_modules'],
  };

  fs.writeJSONSync(path.join(targetDir, 'tsconfig.json'), tsconfig, { spaces: 2 });
  fs.mkdirSync(path.join(targetDir, 'src'), { recursive: true });

  const indexTs = `import { createServer, Tool, z } from '@nitrostack/core';

const server = createServer({
  name: '${projectName}',
  version: '1.0.0',
  description: '${answers.description}',
});

server.tool(
  new Tool({
    name: 'hello',
    description: 'Say hello to someone',
    inputSchema: z.object({
      name: z.string().describe('The name to greet'),
    }),
    handler: async (input, context) => {
      context.logger.info(\`Greeting \${input.name}\`);
      return \`Hello, \${input.name}! 👋\`;
    },
  })
);

server.start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
`;

  fs.writeFileSync(path.join(targetDir, 'src', 'index.ts'), indexTs);
  fs.writeFileSync(path.join(targetDir, '.env'), '# Environment variables\n');

  const gitignore = `node_modules/
dist/
.env
.env.local
*.log
`;
  fs.writeFileSync(path.join(targetDir, '.gitignore'), gitignore);

  const readme = `# ${projectName}

${answers.description}

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Building for Production

\`\`\`bash
npm run build
npm start
\`\`\`

Built with [NitroStack](https://nitrostack.ai) ⚡
`;

  fs.writeFileSync(path.join(targetDir, 'README.md'), readme);
}
