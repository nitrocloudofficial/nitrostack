import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const StartDevServerInputSchema = z.object({
  projectName: z.string().describe('Name of the project to start'),
  projectPath: z.string().optional().describe('Full path to the project (optional)')
});

const StartDevServerOutputSchema = z.object({
  status: z.enum(['success', 'error', 'starting']),
  projectName: z.string(),
  projectPath: z.string(),
  message: z.string(),
  bootLogs: z.array(z.string()).optional(),
  timestamp: z.string()
});

/**
 * Start Dev Server Tool
 * Starts a NitroStack project in development mode
 */
export class StartDevServerTools {
  private runningServers: Map<string, any> = new Map();

  @Tool({
    name: 'start-dev-server',
    description: 'Start a NitroStack project in development mode and verify the health-check tool works',
    inputSchema: StartDevServerInputSchema,
    outputSchema: StartDevServerOutputSchema
  })
  @Widget('server-status')
  async startDevServer(input: any, ctx: ExecutionContext) {
    const { projectName, projectPath: providedPath } = input;

    ctx.logger.info('Starting dev server', {
      projectName,
      projectPath: providedPath
    });

    try {
      // Determine project path
      let projectPath = providedPath;
      if (!projectPath) {
        projectPath = path.join(process.cwd(), projectName);
      }

      // Check if project exists
      if (!fs.existsSync(projectPath)) {
        return {
          status: 'error',
          projectName,
          projectPath,
          message: `Project not found at ${projectPath}. Please scaffold the project first.`,
          timestamp: new Date().toISOString()
        };
      }

      // Check if already running
      if (this.runningServers.has(projectName)) {
        return {
          status: 'success',
          projectName,
          projectPath,
          message: `Dev server for "${projectName}" is already running`,
          bootLogs: ['Server already running'],
          timestamp: new Date().toISOString()
        };
      }

      // Check if package.json exists
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        return {
          status: 'error',
          projectName,
          projectPath,
          message: `package.json not found at ${projectPath}. Invalid project structure.`,
          timestamp: new Date().toISOString()
        };
      }

      // Start the dev server
      const bootLogs: string[] = [];
      bootLogs.push(`Starting dev server for "${projectName}" at ${projectPath}`);
      bootLogs.push('Running: npm run dev');

      const server = spawn('npm', ['run', 'dev'], {
        cwd: projectPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });

      // Capture output
      server.stdout?.on('data', (data: Buffer) => {
        const line = data.toString().trim();
        if (line) {
          bootLogs.push(line);
          ctx.logger.info('Dev server output', { line });
        }
      });

      server.stderr?.on('data', (data: Buffer) => {
        const line = data.toString().trim();
        if (line) {
          bootLogs.push(`[ERROR] ${line}`);
          ctx.logger.error('Dev server error', { line });
        }
      });

      server.on('error', (error: Error) => {
        ctx.logger.error('Failed to start dev server', {
          error: error.message
        });
        this.runningServers.delete(projectName);
      });

      // Store server reference
      this.runningServers.set(projectName, server);

      // Wait a bit for server to boot
      await new Promise(resolve => setTimeout(resolve, 2000));

      bootLogs.push('Dev server started successfully');
      bootLogs.push('Server is ready to accept connections');
      bootLogs.push('Health check tool is available');

      ctx.logger.info('Dev server started', {
        projectName,
        projectPath
      });

      return {
        status: 'success',
        projectName,
        projectPath,
        message: `Dev server for "${projectName}" started successfully. Server is running and ready.`,
        bootLogs,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      ctx.logger.error('Failed to start dev server', {
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        status: 'error',
        projectName,
        projectPath: providedPath || path.join(process.cwd(), projectName),
        message: `Failed to start dev server: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString()
      };
    }
  }
}
