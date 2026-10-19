import path from 'path';
import chalk from 'chalk';
import { loadConfig, DEFAULT_CLOUD_URL } from '../auth/token-store.js';
import { loginCommand } from './login.js';
import { linkCommand } from './link.js';
import { loadProjectConfig, saveProjectConfig, NitroProjectConfig } from '../project/project-config.js';
import { packProject } from '../pack/pack-project.js';
import { validateNitrostackProject } from '../pack/validate-project.js';
import { StudioApiClient } from '../api/client.js';
import {
  requestAppPresignedUpload,
  markUploadComplete,
  confirmDeployment,
  ConfirmDeploymentResult,
} from '../deploy/lifecycle.js';
import { uploadZipToS3 } from '../deploy/s3-uploader.js';
import {
  pollDeploymentStatus,
  isSuccessfulStatus,
  DeploymentStatusResponse,
} from '../deploy/status-poller.js';
import {
  DeploymentLogStreamer,
  colorizeLogLine,
} from '../deploy/log-streamer.js';
import {
  NitroSpinner,
  createSuccessBox,
  createErrorBox,
  log,
} from '../ui/branding.js';
import { registerCursorMcpServer } from '../integrations/cursor.js';

export interface DeployCommandOptions {
  prod?: boolean;
  token?: string;
  app?: string;
  org?: string;
  includeEnv?: boolean;
  cwd?: string;
  apiUrl?: string;
  cloudUrl?: string;
  configPath?: string;
  yes?: boolean;
  client?: StudioApiClient;
  fetchFn?: typeof fetch;
  noWait?: boolean;
  wait?: boolean;
  cursor?: boolean;
  cursorProject?: boolean;
  pollIntervalMs?: number;
  timeoutMs?: number;
  sleepFn?: (ms: number) => Promise<void>;
}

export interface DeployExecutionResult {
  deploymentId: string;
  studioDeploymentId: string;
  appId: string;
  appName: string;
  organizationId: string;
  filesIncluded: number;
  zipSizeBytes: number;
  status?: string;
  appUrl?: string;
  serviceUrl?: string;
  mcpUrl?: string;
}

/**
 * Executes the core nitrostack deploy command with automatic session & project linking guards,
 * real-time container build log streaming, and terminal status observability.
 */
export async function deployCommand(
  options: DeployCommandOptions = {},
): Promise<DeployExecutionResult> {
  const cwd = path.resolve(options.cwd || process.cwd());
  const isNoWait = options.noWait === true || options.wait === false;

  console.log(chalk.bold('\nNitroStack Deploy ─ Deploy MCP Server to NitroCloud\n'));

  // 1. AUTO-PERMIT SESSION GUARD: Verify active authentication
  let config = await loadConfig(options.configPath);
  let effectiveToken = options.token || config.token;

  if (!effectiveToken && !options.client) {
    log('No active NitroCloud session found.', 'warning');
    effectiveToken = await loginCommand({
      apiUrl: options.apiUrl,
      cloudUrl: options.cloudUrl,
      configPath: options.configPath,
    });
    config = await loadConfig(options.configPath);
  }

  // 2. AUTO-LINK GUARD: Verify local workspace linkage
  let projectConfig = await loadProjectConfig(cwd);

  if (!projectConfig) {
    if (options.app && options.org) {
      projectConfig = await linkCommand({
        cwd,
        org: options.org,
        app: options.app,
        token: effectiveToken,
        apiUrl: options.apiUrl || config.apiUrl,
      });
    } else {
      log('Local project is not linked to a NitroCloud App.', 'warning');
      projectConfig = await linkCommand({
        cwd,
        org: options.org,
        app: options.app,
        token: effectiveToken,
        apiUrl: options.apiUrl || config.apiUrl,
      });
    }
  }

  // 3. VALIDATE NITROSTACK PROJECT STRUCTURE
  const projectInfo = await validateNitrostackProject(cwd);

  // 4. IN-MEMORY PACKAGING (Zero-disk footprint)
  const packSpinner = new NitroSpinner(`Packaging ${chalk.bold(projectInfo.projectName)} in-memory...`).start();
  let packResult;
  try {
    packResult = await packProject({
      cwd,
      inMemory: true,
      includeEnv: options.includeEnv ?? false,
    });
    const sizeKb = (packResult.zipSizeBytes! / 1024).toFixed(1);
    packSpinner.succeed(`Created optimized in-memory archive (${packResult.filesIncluded} files, ${sizeKb} KB)`);
  } catch (err) {
    packSpinner.fail('Packaging failed');
    throw err;
  }

  if (!packResult.zipBuffer) {
    throw new Error('Packaging engine failed to yield a valid in-memory zip archive buffer.');
  }

  // 5. INITIALIZE STUDIO API CLIENT & REQUEST S3 PRESIGNED SLOT
  const client =
    options.client ||
    (await StudioApiClient.create({
      token: effectiveToken,
      apiUrl: options.apiUrl || config.apiUrl,
      fetchFn: options.fetchFn,
    }));

  const presignSpinner = new NitroSpinner('Requesting upload slot from NitroCloud...').start();
  let presignResult;
  try {
    presignResult = await requestAppPresignedUpload(client, {
      appId: projectConfig.appId,
      organizationId: projectConfig.organizationId,
    });
    presignSpinner.succeed('Presigned upload URL generated');
  } catch (err) {
    presignSpinner.fail('Failed to obtain presigned upload slot');
    throw err;
  }

  // 6. DIRECT S3 BINARY UPLOAD
  const uploadSpinner = new NitroSpinner('Uploading package to NitroCloud storage...').start();
  try {
    await uploadZipToS3(presignResult.presignedUrl, packResult.zipBuffer, {
      fetchFn: options.fetchFn,
    });
    uploadSpinner.succeed('Upload complete');
  } catch (err) {
    uploadSpinner.fail('Upload to storage failed');
    throw err;
  }

  // 7. CONFIRM DEPLOYMENT & TRIGGER REMOTE BUILD PIPELINE
  const triggerSpinner = new NitroSpinner('Triggering NitroCloud build & deploy pipeline...').start();
  let confirmResult: ConfirmDeploymentResult;
  try {
    await markUploadComplete(client, presignResult.studioDeploymentId);
    confirmResult = await confirmDeployment(client, presignResult.studioDeploymentId, {
      autoDeployChat: false,
    });
    const finalId = confirmResult.deploymentId || presignResult.studioDeploymentId;
    triggerSpinner.succeed(`Deployment triggered: ${chalk.bold(finalId)}`);
  } catch (err) {
    triggerSpinner.fail('Failed to trigger deployment pipeline');
    throw err;
  }

  const finalDeploymentId = confirmResult.deploymentId || presignResult.studioDeploymentId;
  const cloudUrl = (options.cloudUrl || config.cloudUrl || DEFAULT_CLOUD_URL).replace(/\/+$/, '');

  // 8. UPDATE LOCAL PROJECT LINKAGE WITH LATEST DEPLOYMENT
  try {
    if (projectConfig) {
      projectConfig.latestDeploymentId = finalDeploymentId;
      projectConfig.lastDeployedAt = new Date().toISOString();
      await saveProjectConfig(projectConfig, cwd);
    }
  } catch {}

  // 9. IF FIRE-AND-FORGET (--no-wait), RETURN IMMEDIATELY
  if (isNoWait) {
    console.log(
      createSuccessBox('Deployment Initiated', [
        `App:            ${chalk.bold(projectConfig.appName)}`,
        `Deployment ID:  ${chalk.bold(finalDeploymentId)}`,
        `Organization:   ${chalk.bold(projectConfig.orgName || projectConfig.organizationId)}`,
        `Archive Size:   ${(packResult.zipSizeBytes! / 1024).toFixed(1)} KB (${packResult.filesIncluded} files)`,
        `Status:         ${chalk.yellow.bold('BUILDING')} (Background)`,
        '',
        `${chalk.dim('To monitor logs:')} ${chalk.cyan(`nitrostack logs ${finalDeploymentId} --follow`)}`,
      ]),
    );

    if (options.cursor || options.cursorProject) {
      try {
        const defaultMcpUrl = `https://${projectConfig.appName}.nitrocloud.ai/mcp`;
        await registerCursorMcpServer({
          appName: projectConfig.appName,
          mcpUrl: defaultMcpUrl,
          scope: options.cursorProject ? 'project' : 'global',
          projectRoot: cwd,
        });
      } catch (cursorErr) {
        log(`Warning: Failed to auto-configure Cursor: ${(cursorErr as Error).message}`, 'warning');
      }
    }

    return {
      deploymentId: finalDeploymentId,
      studioDeploymentId: presignResult.studioDeploymentId,
      appId: projectConfig.appId,
      appName: projectConfig.appName,
      organizationId: projectConfig.organizationId,
      filesIncluded: packResult.filesIncluded,
      zipSizeBytes: packResult.zipSizeBytes!,
    };
  }

  // 10. REAL-TIME OBSERVABILITY & BUILD LOG STREAMING
  const streamer = new DeploymentLogStreamer({
    client,
    deploymentId: finalDeploymentId,
    type: 'build',
  });

  const pollSpinner = new NitroSpinner('Observing build & deployment progress...').start();

  const drainLogs = async () => {
    try {
      const newLines = await streamer.fetchNextChunk();
      if (newLines.length > 0) {
        pollSpinner.stop();
        for (const line of newLines) {
          console.log(colorizeLogLine(line));
        }
        pollSpinner.start();
      }
    } catch {
      // Non-fatal logging glitch
    }
  };

  let finalStatus: DeploymentStatusResponse;
  try {
    finalStatus = await pollDeploymentStatus({
      client,
      deploymentId: presignResult.studioDeploymentId,
      intervalMs: options.pollIntervalMs || 1500,
      timeoutMs: options.timeoutMs || 10 * 60 * 1000,
      sleepFn: options.sleepFn,
      onStatusChange: async (statusResp) => {
        const state = (statusResp.deploymentStatus || statusResp.status || '').toUpperCase();
        let label = `[${state}]`;
        if (state === 'QUEUED') {
          label = `${chalk.yellow('[QUEUED]')} Waiting for build worker...`;
        } else if (state === 'BUILDING') {
          label = `${chalk.cyan('[BUILD]')} Compiling container image...`;
        } else if (state === 'DEPLOYING') {
          label = `${chalk.blue('[DEPLOY]')} Starting containers & checking health...`;
        } else if (state === 'READY' || state === 'COMPLETED' || state === 'LIVE') {
          label = `${chalk.green('[SUCCESS]')} Deployment active!`;
        }
        pollSpinner.update(label);
        await drainLogs();
      },
    });

    await drainLogs();
  } catch (pollErr) {
    pollSpinner.fail('Deployment observation encountered an error');
    await drainLogs();
    throw pollErr;
  }

  // 11. HANDLE TERMINAL OUTCOME
  if (isSuccessfulStatus(finalStatus)) {
    pollSpinner.succeed('MCP Server deployment is LIVE');
    const appUrl =
      finalStatus.appUrl ||
      finalStatus.serviceUrl ||
      `https://${projectConfig.appName}.nitrocloud.ai`;
    const mcpUrl = finalStatus.mcpUrl || `${appUrl}/mcp`;

    console.log(
      createSuccessBox('Deployment Live', [
        `App:            ${chalk.bold(projectConfig.appName)}`,
        `Deployment ID:  ${chalk.bold(finalDeploymentId)}`,
        `Status:         ${chalk.green.bold('READY')}`,
        `MCP Endpoint:   ${chalk.cyan.bold(mcpUrl)}`,
        `App URL:        ${chalk.cyan(appUrl)}`,
        `Dashboard:      ${chalk.dim(`${cloudUrl}/deployments/${finalDeploymentId}`)}`,
      ]),
    );

    // 12. AUTO-CONFIGURE CURSOR IDE IF REQUESTED
    if (options.cursor || options.cursorProject) {
      try {
        await registerCursorMcpServer({
          appName: projectConfig.appName,
          mcpUrl,
          scope: options.cursorProject ? 'project' : 'global',
          projectRoot: cwd,
        });
      } catch (cursorErr) {
        log(`Warning: Failed to auto-configure Cursor: ${(cursorErr as Error).message}`, 'warning');
      }
    }

    return {
      deploymentId: finalDeploymentId,
      studioDeploymentId: presignResult.studioDeploymentId,
      appId: projectConfig.appId,
      appName: projectConfig.appName,
      organizationId: projectConfig.organizationId,
      filesIncluded: packResult.filesIncluded,
      zipSizeBytes: packResult.zipSizeBytes!,
      status: finalStatus.status,
      appUrl,
      serviceUrl: finalStatus.serviceUrl,
      mcpUrl,
    };
  } else {
    pollSpinner.fail(`Deployment failed with status: ${finalStatus.status}`);
    const errorTail = await streamer.fetchTail(20);

    console.error(
      createErrorBox(
        'Deployment Failed',
        finalStatus.errorMessage || 'Container build or deployment failed.',
      ),
    );

    if (errorTail.length > 0) {
      console.log(chalk.red.bold('\n── Build Log Excerpt ──────────────────────────────────────────'));
      for (const line of errorTail) {
        console.log(chalk.red(line));
      }
      console.log(chalk.red.bold('───────────────────────────────────────────────────────────────\n'));
    }

    console.log(chalk.dim(`View details at: ${cloudUrl}/deployments/${finalDeploymentId}\n`));
    throw new Error(
      `Deployment failed (${finalStatus.status}): ${finalStatus.errorMessage || 'Remote build error'}`,
    );
  }
}
