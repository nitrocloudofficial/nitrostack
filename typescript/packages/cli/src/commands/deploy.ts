import path from 'path';
import chalk from 'chalk';
import { loadConfig } from '../auth/token-store.js';
import { loginCommand } from './login.js';
import { linkCommand } from './link.js';
import { loadProjectConfig, NitroProjectConfig } from '../project/project-config.js';
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
import { NitroSpinner, createSuccessBox, createErrorBox, log } from '../ui/branding.js';

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
}

export interface DeployExecutionResult {
  deploymentId: string;
  studioDeploymentId: string;
  appId: string;
  appName: string;
  organizationId: string;
  filesIncluded: number;
  zipSizeBytes: number;
}

/**
 * Executes the core nitrostack deploy command with automatic session & project linking guards.
 */
export async function deployCommand(
  options: DeployCommandOptions = {},
): Promise<DeployExecutionResult> {
  const cwd = path.resolve(options.cwd || process.cwd());

  console.log(chalk.bold('\nNitroStack Deploy ─ Deploy MCP Server to NitroCloud\n'));

  // 1. AUTO-PERMIT SESSION GUARD: Verify active authentication
  let config = await loadConfig(options.configPath);
  let effectiveToken = options.token || config.token;

  if (!effectiveToken) {
    log('No active NitroCloud session found.', 'warning');
    // Triggers interactive loopback OAuth and auto-permits the session
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
      // Headless link override
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

  // 8. RENDER DEPLOYMENT CONFIRMATION
  console.log(
    createSuccessBox('Deployment Initiated', [
      `Deployment ID: ${chalk.bold(finalDeploymentId)}`,
      `App:           ${chalk.bold(projectConfig.appName)}`,
      `Organization:  ${chalk.bold(projectConfig.orgName || projectConfig.organizationId)}`,
      `Archive Size:  ${(packResult.zipSizeBytes! / 1024).toFixed(1)} KB (${packResult.filesIncluded} files)`,
    ]),
  );

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
