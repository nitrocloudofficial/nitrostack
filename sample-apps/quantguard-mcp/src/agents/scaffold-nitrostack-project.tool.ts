import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const ScaffoldProjectInputSchema = z.object({
  projectName: z.string().describe('Name of the NitroStack project to scaffold'),
  description: z.string().optional().describe('Project description')
});

const ScaffoldProjectOutputSchema = z.object({
  status: z.enum(['success', 'error']),
  projectName: z.string(),
  projectPath: z.string(),
  message: z.string(),
  fileTree: z.array(z.string()).optional(),
  timestamp: z.string()
});

/**
 * Scaffold NitroStack Project Tool
 * Creates a new NitroStack project with modular structure
 */
export class ScaffoldNitrostackProjectTools {
  @Tool({
    name: 'scaffold-nitrostack-project',
    description: 'Scaffold a new NitroStack project with modular structure (market, orderbook, risk, news, agents, strategy, db modules), SQLite database, environment config, and health-check tool',
    inputSchema: ScaffoldProjectInputSchema,
    outputSchema: ScaffoldProjectOutputSchema
  })
  @Widget('project-scaffold')
  async scaffoldProject(input: any, ctx: ExecutionContext) {
    const { projectName, description } = input;
    const projectPath = path.join(process.cwd(), projectName);

    ctx.logger.info('Scaffolding NitroStack project', {
      projectName,
      projectPath,
      description
    });

    try {
      // Check if project already exists
      if (fs.existsSync(projectPath)) {
        return {
          status: 'error',
          projectName,
          projectPath,
          message: `Project directory already exists at ${projectPath}`,
          timestamp: new Date().toISOString()
        };
      }

      // Create project directory
      fs.mkdirSync(projectPath, { recursive: true });

      // Create package.json
      const packageJson = {
        name: projectName,
        version: '1.0.0',
        private: true,
        type: 'module',
        description: description || 'QuantGuard MCP - Multi-Agent Market Microstructure & Risk Intelligence Platform',
        scripts: {
          dev: 'nitrostack-cli dev',
          build: 'nitrostack-cli build',
          start: 'npm run build && nitrostack-cli start',
          'start:prod': 'nitrostack-cli start',
          upgrade: 'nitrostack-cli upgrade',
          'install:all': 'nitrostack-cli install',
          widget: 'npm --prefix src/widgets'
        },
        dependencies: {
          dotenv: '^16.3.1',
          '@nitrostack/core': '^1.0.13',
          zod: '^3.22.4',
          'better-sqlite3': '^9.0.0',
          '@modelcontextprotocol/ext-apps': '>=0.1.0'
        },
        devDependencies: {
          '@nitrostack/cli': '^1.0.14',
          '@types/node': '^22.10.0',
          '@types/better-sqlite3': '^7.6.8',
          typescript: '^5.3.3'
        },
        author: 'NitroStudio',
        nitrostack: {
          skillsVersion: '1.0.0'
        }
      };

      fs.writeFileSync(
        path.join(projectPath, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      // Create tsconfig.json
      const tsconfig = {
        compilerOptions: {
          target: 'ES2022',
          module: 'ES2022',
          lib: ['ES2022'],
          moduleResolution: 'node',
          rootDir: './src',
          outDir: './dist',
          esModuleInterop: true,
          forceConsistentCasingInFileNames: true,
          strict: true,
          skipLibCheck: true,
          resolveJsonModule: true,
          declaration: true,
          declarationMap: true,
          sourceMap: true,
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
          types: ['node']
        },
        include: ['src/**/*'],
        exclude: ['node_modules', 'dist', 'src/widgets']
      };

      fs.writeFileSync(
        path.join(projectPath, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
      );

      // Create .gitignore
      const gitignore = `# Dependencies
node_modules/

# Build output
dist/
build/
.next/

# Environment / secrets
.env
.env.local
.env.*.local

# Editor
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log
npm-debug.log*

# Nitrostack / Tauri
src-tauri/target/
nitrostack-out/
`;

      fs.writeFileSync(path.join(projectPath, '.gitignore'), gitignore);

      // Create .env.example
      const envExample = `# QuantGuard MCP Environment Configuration

# Server
NODE_ENV=development
PORT=3000

# Market Data Provider
MARKET_DATA_PROVIDER=yahoo
MARKET_DATA_API_KEY=your_market_data_api_key_here

# News API
NEWS_API_KEY=your_news_api_key_here

# Binance WebSocket (optional)
BINANCE_WS_URL=wss://stream.binance.com:9443/ws

# Database
DATABASE_PATH=./quantguard.db

# Logging
LOG_LEVEL=info
`;

      fs.writeFileSync(path.join(projectPath, '.env.example'), envExample);

      // Create src directory structure
      const srcDir = path.join(projectPath, 'src');
      const dirs = [
        'db',
        'market/providers',
        'orderbook',
        'risk',
        'news',
        'agents',
        'strategy',
        'health',
        'config',
        'modules/calculator',
        'widgets/app'
      ];

      dirs.forEach(dir => {
        fs.mkdirSync(path.join(srcDir, dir), { recursive: true });
      });

      // Create minimal module files (stubs)
      const modules = ['db', 'market', 'orderbook', 'risk', 'news', 'agents', 'strategy', 'health'];
      modules.forEach(mod => {
        const moduleContent = `import { Module } from '@nitrostack/core';

@Module({
  name: '${mod}',
  description: '${mod.charAt(0).toUpperCase() + mod.slice(1)} module'
})
export class ${mod.charAt(0).toUpperCase() + mod.slice(1)}Module {}
`;
        fs.writeFileSync(
          path.join(srcDir, mod, `${mod}.module.ts`),
          moduleContent
        );
      });

      // Create app.module.ts
      const appModuleContent = `import { McpApp, Module, ConfigModule } from '@nitrostack/core';

@McpApp({
  module: AppModule,
  server: {
    name: '${projectName}',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'Root application module',
  imports: [
    ConfigModule.forRoot()
  ]
})
export class AppModule {}
`;

      fs.writeFileSync(path.join(srcDir, 'app.module.ts'), appModuleContent);

      // Create index.ts
      const indexContent = `import { AppModule } from './app.module.js';

export default AppModule;
`;

      fs.writeFileSync(path.join(srcDir, 'index.ts'), indexContent);

      // Create README
      const readmeContent = `# ${projectName}

QuantGuard MCP - Multi-Agent Market Microstructure & Risk Intelligence Platform

## Setup

\`\`\`bash
npm install
npm run dev
\`\`\`

## Project Structure

- \`src/db/\` — SQLite database module
- \`src/market/\` — Market data providers
- \`src/orderbook/\` — Orderbook management
- \`src/risk/\` — Risk metrics
- \`src/news/\` — News aggregation
- \`src/agents/\` — Multi-agent orchestration
- \`src/strategy/\` — Trading strategies
- \`src/health/\` — Health checks

## Running

\`\`\`bash
npm run dev
\`\`\`

Open NitroStack Studio and connect to this project.
`;

      fs.writeFileSync(path.join(projectPath, 'README.md'), readmeContent);

      // Generate file tree
      const fileTree = this.generateFileTree(projectPath);

      ctx.logger.info('Project scaffolded successfully', {
        projectPath,
        fileCount: fileTree.length
      });

      return {
        status: 'success',
        projectName,
        projectPath,
        message: `Successfully scaffolded NitroStack project "${projectName}" at ${projectPath}`,
        fileTree,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      ctx.logger.error('Failed to scaffold project', {
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        status: 'error',
        projectName,
        projectPath,
        message: `Failed to scaffold project: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  private generateFileTree(dir: string, prefix = '', isLast = true): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(dir).sort();

    entries.forEach((entry, index) => {
      const fullPath = path.join(dir, entry);
      const isDirectory = fs.statSync(fullPath).isDirectory();
      const isLastEntry = index === entries.length - 1;
      const connector = isLastEntry ? '└── ' : '├── ';
      const nextPrefix = prefix + (isLastEntry ? '    ' : '│   ');

      files.push(prefix + connector + entry + (isDirectory ? '/' : ''));

      if (isDirectory && !entry.startsWith('.') && entry !== 'node_modules') {
        files.push(...this.generateFileTree(fullPath, nextPrefix, isLastEntry));
      }
    });

    return files;
  }
}
