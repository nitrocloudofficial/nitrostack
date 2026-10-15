import path from 'path';
import chalk from 'chalk';
import { loadConfig } from '../auth/token-store.js';
import { loadProjectConfig } from '../project/project-config.js';
import { StudioApiClient, StudioApiError } from '../api/client.js';
import {
  DeploymentLogStreamer,
  LogStreamType,
  colorizeLogLine,
} from '../deploy/log-streamer.js';
import { fetchDeploymentStatus, isTerminalStatus } from '../deploy/status-poller.js';
import { log } from '../ui/branding.js';

export interface LogsCommandOptions {
  deploymentId?: string;
  follow?: boolean;
  build?: boolean;
  runtime?: boolean;
  lines?: number | string;
  cwd?: string;
  token?: string;
  apiUrl?: string;
  client?: StudioApiClient;
  sleepFn?: (ms: number) => Promise<void>;
  pollIntervalMs?: number;
}

/**
 * CLI command to view and stream build or runtime logs for a deployment.
 */
export async function logsCommand(
  deploymentIdArg?: string,
  options: LogsCommandOptions = {},
): Promise<{ deploymentId: string; linesCount: number }> {
  const cwd = path.resolve(options.cwd || process.cwd());
  const requestedLines = options.lines ? parseInt(String(options.lines), 10) : 50;
  const pollIntervalMs = options.pollIntervalMs || 1500;
  const sleepFn = options.sleepFn || ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));

  // 1. Resolve Authentication
  const config = await loadConfig();
  const token = options.token || config.token;

  if (!token && !options.client) {
    throw new StudioApiError(
      'No active session found. Please run "nitrostack login" to authenticate.',
      401,
    );
  }

  const client =
    options.client ||
    (await StudioApiClient.create({
      token,
      apiUrl: options.apiUrl || config.apiUrl,
    }));

  // 2. Resolve Target Deployment ID
  let targetDeploymentId = deploymentIdArg || options.deploymentId;

  if (!targetDeploymentId) {
    const projectConfig = await loadProjectConfig(cwd);
    if (projectConfig?.latestDeploymentId) {
      targetDeploymentId = projectConfig.latestDeploymentId;
    }
  }

  if (!targetDeploymentId) {
    throw new Error(
      'No deployment ID provided and no active deployment recorded in .nitro/project.json.\n' +
        'Usage: nitrostack logs [deployment-id]',
    );
  }

  // 3. Determine Log Stream Target
  const logType: LogStreamType = options.runtime ? 'runtime' : 'build';

  console.log(
    chalk.bold(
      `\nNitroStack Logs ─ ${logType.toUpperCase()} stream for ${chalk.cyan(targetDeploymentId)}\n`,
    ),
  );

  const streamer = new DeploymentLogStreamer({
    client,
    deploymentId: targetDeploymentId,
    type: logType,
    limit: Math.max(requestedLines, 50),
  });

  // 4. Fetch Initial Log Chunk
  const initialLines = await streamer.fetchNextChunk();
  const displayLines = initialLines.slice(-requestedLines);

  if (displayLines.length === 0) {
    log(`No ${logType} logs available yet.`, 'info');
  } else {
    for (const line of displayLines) {
      console.log(colorizeLogLine(line));
    }
  }

  let totalLinesPrinted = displayLines.length;

  // 5. Follow Mode (Stream continuously)
  if (options.follow) {
    let running = true;
    const cleanup = () => {
      running = false;
    };
    process.once('SIGINT', cleanup);

    try {
      while (running) {
        await sleepFn(pollIntervalMs);

        const newLines = await streamer.fetchNextChunk();
        for (const line of newLines) {
          console.log(colorizeLogLine(line));
          totalLinesPrinted++;
        }

        if (streamer.eof) {
          break;
        }

        // Check if deployment has finalized
        try {
          const status = await fetchDeploymentStatus(client, targetDeploymentId);
          if (isTerminalStatus(status) && newLines.length === 0) {
            break;
          }
        } catch {
          // Status check failure shouldn't abort log streaming
        }
      }
    } finally {
      process.removeListener('SIGINT', cleanup);
    }
  }

  return {
    deploymentId: targetDeploymentId,
    linesCount: totalLinesPrinted,
  };
}
