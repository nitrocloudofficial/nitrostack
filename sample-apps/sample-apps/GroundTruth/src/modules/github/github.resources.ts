import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { store, today } from '../../store/store.js';
import { requireParams } from '../../lib/uri.js';
import {
  GitHubConfigError,
  fetchCommits,
  fetchPullRequests,
  readConfig,
} from './github.service.js';

const COMMITS_URI = 'github://commits/{employeeId}';
const PRS_URI = 'github://pull-requests/{employeeId}';

/**
 * Resource handlers return the payload tagged as JSON; NitroStack builds the
 * MCP `contents` envelope itself.
 */
function json(payload: unknown) {
  return { type: 'json' as const, data: payload };
}

export class GitHubResources {
  @Resource({
    uri: COMMITS_URI,
    name: "Employee's GitHub commits",
    description:
      "Today's commits for one employee, pulled live from the GitHub API. " +
      'Read-only ground-truth activity data. employeeId accepts an id, full name, or GitHub username.',
    mimeType: 'application/json',
  })
  async getCommits(uri: string, ctx: ExecutionContext) {
    const { employeeId } = requireParams(COMMITS_URI, uri);
    const employee = store.resolveEmployee(employeeId);

    if (!employee) {
      return json({
        error: `No employee matches "${employeeId}". Read team://employees for valid ids.`,
      });
    }

    const date = today();
    ctx.logger.info('Reading commits resource', {
      employee: employee.name,
      date,
    });

    try {
      const cfg = readConfig();
      const commits = await fetchCommits(
        cfg,
        { login: employee.githubUsername, email: employee.githubEmail, name: employee.name },
        date,
      );
      return json({
        employee: employee.name,
        githubUsername: employee.githubUsername,
        date,
        count: commits.length,
        commits,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      ctx.logger.error('Failed to read commits', { error: message });
      return json({
        employee: employee.name,
        date,
        error: message,
        hint:
          err instanceof GitHubConfigError
            ? 'Set GITHUB_TOKEN and GITHUB_ORG in .env, then re-run.'
            : undefined,
      });
    }
  }

  @Resource({
    uri: PRS_URI,
    name: "Employee's GitHub pull requests",
    description:
      "Today's pull requests opened, updated, or merged by one employee, pulled live from the GitHub API. " +
      'employeeId accepts an id, full name, or GitHub username.',
    mimeType: 'application/json',
  })
  async getPullRequests(uri: string, ctx: ExecutionContext) {
    const { employeeId } = requireParams(PRS_URI, uri);
    const employee = store.resolveEmployee(employeeId);

    if (!employee) {
      return json({
        error: `No employee matches "${employeeId}". Read team://employees for valid ids.`,
      });
    }

    const date = today();
    ctx.logger.info('Reading pull requests resource', {
      employee: employee.name,
      date,
    });

    try {
      const cfg = readConfig();
      const pullRequests = await fetchPullRequests(
        cfg,
        employee.githubUsername,
        date,
      );
      return json({
        employee: employee.name,
        githubUsername: employee.githubUsername,
        date,
        count: pullRequests.length,
        pullRequests,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      ctx.logger.error('Failed to read pull requests', { error: message });
      return json({
        employee: employee.name,
        date,
        error: message,
        hint:
          err instanceof GitHubConfigError
            ? 'Set GITHUB_TOKEN and GITHUB_ORG in .env, then re-run.'
            : undefined,
      });
    }
  }
}
