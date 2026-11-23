import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { StudioApiClient, StudioOrganization, StudioApp } from '../api/client.js';
import {
  saveProjectConfig,
  ensureGitignoreContainsNitro,
  NitroProjectConfig,
} from '../project/project-config.js';
import { loadConfig } from '../auth/token-store.js';
import { NitroSpinner, createSuccessBox, createErrorBox, log } from '../ui/branding.js';

export interface LinkCommandOptions {
  org?: string;
  app?: string;
  cwd?: string;
  token?: string;
  apiUrl?: string;
  client?: StudioApiClient;
  promptFn?: (questions: any[]) => Promise<any>;
}

function resolveDefaultAppName(projectRoot: string): string {
  try {
    const pkgPath = path.join(projectRoot, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = fs.readJSONSync(pkgPath);
      if (pkg?.name) {
        // Strip scope if present (e.g., @myorg/server -> server)
        return pkg.name.replace(/^@[^/]+\//, '');
      }
    }
  } catch {}
  return path.basename(projectRoot);
}

/**
 * Links a local MCP server directory to a NitroCloud organization and application.
 */
export async function linkCommand(options: LinkCommandOptions = {}): Promise<NitroProjectConfig> {
  const cwd = path.resolve(options.cwd || process.cwd());
  const config = await loadConfig();
  const token = options.token || config.token;

  if (!token) {
    throw new Error('No active NitroCloud session found. Please run "nitrostack login" to authenticate.');
  }

  const client =
    options.client ||
    (await StudioApiClient.create({
      token,
      apiUrl: options.apiUrl || config.apiUrl,
    }));

  const prompt = options.promptFn || inquirer.prompt;
  const defaultAppName = resolveDefaultAppName(cwd);

  // 1. Headless / Direct ID linking
  if (options.org && options.app) {
    const projectConfig: NitroProjectConfig = {
      organizationId: options.org,
      appId: options.app,
      appName: defaultAppName,
      linkedAt: new Date().toISOString(),
    };

    await saveProjectConfig(projectConfig, cwd);
    await ensureGitignoreContainsNitro(cwd);

    console.log(
      createSuccessBox('Project Linked', [
        `App:            ${chalk.bold(defaultAppName)}`,
        `Organization:   ${chalk.bold(options.org)}`,
        `Status:         ${chalk.green.bold('Ready to Deploy')}`,
        '',
        `${chalk.dim('Next: Run')} ${chalk.cyan('nitrostack deploy')} ${chalk.dim('to push to NitroCloud')}`,
      ]),
    );

    return projectConfig;
  }

  // 2. Interactive Linking Flow
  console.log(chalk.bold('\nLinking local MCP server to NitroCloud...'));

  const spinner = new NitroSpinner('Fetching organizations from NitroCloud...').start();
  let orgs: StudioOrganization[] = [];
  try {
    orgs = await client.getOrganizations();
    spinner.stop();
  } catch (err) {
    spinner.fail('Failed to fetch organizations');
    throw err;
  }

  if (orgs.length === 0) {
    throw new Error('No organizations found for this account. Create an organization on NitroCloud first.');
  }

  // Select Organization
  let selectedOrg: StudioOrganization;
  if (options.org) {
    selectedOrg =
      orgs.find((o) => (o._id || o.id) === options.org || o.slug === options.org) || {
        _id: options.org,
        name: options.org,
      };
  } else {
    const { orgId } = await prompt([
      {
        type: 'list',
        name: 'orgId',
        message: 'Select NitroCloud Organization:',
        choices: orgs.map((o) => ({
          name: `${o.name} ${chalk.dim(`(${o.slug || o._id || o.id})`)}`,
          value: o._id || o.id,
        })),
      },
    ]);
    selectedOrg = orgs.find((o) => (o._id || o.id) === orgId) || orgs[0];
  }

  const targetOrgId = selectedOrg._id || selectedOrg.id || options.org!;

  // Fetch Apps in Organization
  const appSpinner = new NitroSpinner(`Fetching apps for "${selectedOrg.name}"...`).start();
  let apps: StudioApp[] = [];
  try {
    apps = await client.getOrganizationApps(targetOrgId);
    appSpinner.stop();
  } catch (err) {
    appSpinner.fail('Failed to fetch applications');
    throw err;
  }

  let finalAppId: string;
  let finalAppName: string;

  if (options.app) {
    const matchedApp = apps.find((a) => (a._id || a.id) === options.app || a.name === options.app);
    finalAppId = matchedApp ? matchedApp._id || matchedApp.id! : options.app;
    finalAppName = matchedApp ? matchedApp.name : defaultAppName;
  } else {
    const CREATE_NEW_VALUE = '__create_new_app__';
    const appChoices = apps.map((app) => ({
      name: `${app.name} ${chalk.dim(`(${app.subdomain || app._id || app.id})`)}`,
      value: app._id || app.id,
    }));

    appChoices.push({
      name: chalk.cyan('+ Create New App'),
      value: CREATE_NEW_VALUE,
    });

    const defaultIndex = apps.findIndex((a) => a.name === defaultAppName);

    const { appId } = await prompt([
      {
        type: 'list',
        name: 'appId',
        message: 'Select NitroStack App:',
        choices: appChoices,
        default: defaultIndex >= 0 ? defaultIndex : 0,
      },
    ]);

    if (appId === CREATE_NEW_VALUE) {
      const createAnswers = await prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Enter New App Name:',
          default: defaultAppName,
          validate: (input: string) => {
            const trimmed = input.trim();
            if (!trimmed) return 'App name cannot be empty.';
            if (!/^[a-z0-9-_]+$/i.test(trimmed)) {
              return 'App name must contain only alphanumeric characters, dashes, or underscores.';
            }
            return true;
          },
        },
        {
          type: 'input',
          name: 'description',
          message: 'Enter Description (optional):',
          default: '',
        },
      ]);

      const createSpinner = new NitroSpinner(`Creating NitroStack App "${createAnswers.name}" on NitroCloud...`).start();
      try {
        const createdApp = await client.createApp({
          name: createAnswers.name.trim(),
          organizationId: targetOrgId,
          description: createAnswers.description.trim() || undefined,
        });
        createSpinner.succeed(`App "${createdApp.name}" created successfully!`);
        finalAppId = createdApp._id || createdApp.id!;
        finalAppName = createdApp.name;
      } catch (err) {
        createSpinner.fail('Failed to create app');
        throw err;
      }
    } else {
      const matched = apps.find((a) => (a._id || a.id) === appId)!;
      finalAppId = matched._id || matched.id!;
      finalAppName = matched.name;
    }
  }

  // Save Project Configuration
  const projectConfig: NitroProjectConfig = {
    organizationId: targetOrgId,
    orgSlug: selectedOrg.slug,
    orgName: selectedOrg.name,
    appId: finalAppId,
    appName: finalAppName,
    linkedAt: new Date().toISOString(),
  };

  await saveProjectConfig(projectConfig, cwd);
  await ensureGitignoreContainsNitro(cwd);

  console.log(
    createSuccessBox('Project Linked', [
      `App:            ${chalk.bold(finalAppName)}`,
      `Organization:   ${chalk.bold(selectedOrg.name)}`,
      `Status:         ${chalk.green.bold('Ready to Deploy')}`,
      '',
      `${chalk.dim('Next: Run')} ${chalk.cyan('nitrostack deploy')} ${chalk.dim('to push to NitroCloud')}`,
    ]),
  );

  return projectConfig;
}
