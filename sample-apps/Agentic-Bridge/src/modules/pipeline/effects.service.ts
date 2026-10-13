/**
 * Real execution for the side-effecting half of the pipeline.
 *
 * `run_tests`, `push`, `deploy`, `update_jira` and `send_slack_message` are the
 * stages that leave the process: they run a command, move a branch, trigger a
 * build, transition a ticket, post to a channel. Everything here performs those
 * actions for real — `git push` shells out to git, `update_jira` calls Jira REST
 * v3, `deploy` dispatches a GitHub Actions workflow or a Jenkins job.
 *
 * Two gates stand in front of every one of them, and both must be open:
 *
 *   1. The caller passes `execute_side_effects: true` on `run_pipeline`. The
 *      default is false, so the demo path and any exploratory run still produce
 *      the planned command without performing it.
 *   2. The relevant integration is configured. A `deploy` with no GITHUB_TOKEN
 *      and no JENKINS_URL has nothing to dispatch to, and says so, rather than
 *      pretending.
 *
 * When a gate is closed the stage reports exactly what it would have done and
 * which variable opens it. That is the same output the plan-only path produces,
 * which is deliberate: the plan is a dry run of this code, not a separate story
 * about it.
 */
import { Injectable } from '@nitrostack/core';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const run = promisify(execFile);

/** Nothing here is allowed to hang a tool call. */
const COMMAND_TIMEOUT_MS = Number(process.env.BRIDGE_COMMAND_TIMEOUT_MS ?? 10 * 60 * 1000);
const HTTP_TIMEOUT_MS = Number(process.env.BRIDGE_HTTP_TIMEOUT_MS ?? 20_000);
const MAX_OUTPUT_BYTES = 512 * 1024;
/** How much captured stdout/stderr survives into the tool result. */
const OUTPUT_EXCERPT_CHARS = 4000;

/** Branches this service refuses to push to without an explicit override. */
const PROTECTED_BRANCHES = new Set(['master', 'main', 'develop', 'release', 'production']);

export interface EffectOutcome {
  /** True only when the action actually happened. */
  executed: boolean;
  output: string;
  evidence: string[];
  /** Set when execution was attempted and failed, as opposed to not attempted. */
  error?: string;
}

export interface EffectContext {
  /** Absolute path to the repository the pipeline is acting on. */
  target: string;
  /** The feature request driving the run. */
  task: string;
  /** Per-node config from the pipeline graph. */
  config: Record<string, string>;
}

@Injectable()
export class EffectsService {
  /* ------------------------------------------------------------------ *
   * Configuration surface
   * ------------------------------------------------------------------ */

  /** Which integrations are wired, for the health check and the tool result. */
  describeConfiguration(): Record<string, boolean> {
    return {
      tests: true, // always available — worst case there is no test script to find
      git: true,
      githubActions: !!(process.env.GITHUB_TOKEN && process.env.GITHUB_REPOSITORY),
      jenkins: !!(process.env.JENKINS_URL && process.env.JENKINS_JOB),
      jira: !!(process.env.JIRA_BASE_URL && process.env.JIRA_EMAIL && process.env.JIRA_API_TOKEN),
      slack: !!process.env.SLACK_WEBHOOK_URL,
    };
  }

  /* ------------------------------------------------------------------ *
   * run_tests
   * ------------------------------------------------------------------ */

  /**
   * Run the project's own test command in the target repository.
   *
   * The command is discovered rather than assumed: an explicit
   * BRIDGE_TEST_COMMAND wins, then package.json's `test` script, then the
   * ecosystem markers the QA Analyst would have found anyway.
   */
  async runTests(ctx: EffectContext): Promise<EffectOutcome> {
    const command = this.resolveTestCommand(ctx);
    if (!command) {
      return {
        executed: false,
        output:
          'No test command could be discovered in the target repository — no package.json ' +
          '`test` script, no pytest layout, no Maven POM. Set BRIDGE_TEST_COMMAND to run ' +
          'something specific.',
        evidence: [],
      };
    }

    const started = Date.now();
    try {
      const { stdout, stderr } = await run(command.file, command.args, {
        cwd: ctx.target,
        timeout: COMMAND_TIMEOUT_MS,
        maxBuffer: MAX_OUTPUT_BYTES,
        // A test run must never inherit the bridge's own credentials.
        env: this.sanitizedEnv(),
      });
      return {
        executed: true,
        output:
          `PASSED — \`${command.display}\` in ${ctx.target} (${Date.now() - started}ms)\n\n` +
          this.excerpt(`${stdout}\n${stderr}`),
        evidence: [command.source],
      };
    } catch (error) {
      const failure = error as { stdout?: string; stderr?: string; code?: number; message?: string };
      return {
        // The command ran. A red test suite is a result, not a failure to act.
        executed: true,
        output:
          `FAILED — \`${command.display}\` exited ${failure.code ?? '?'} after ` +
          `${Date.now() - started}ms\n\n` +
          this.excerpt(`${failure.stdout ?? ''}\n${failure.stderr ?? failure.message ?? ''}`),
        evidence: [command.source],
        error: `Test command exited ${failure.code ?? 'non-zero'}`,
      };
    }
  }

  private resolveTestCommand(
    ctx: EffectContext
  ): { file: string; args: string[]; display: string; source: string } | null {
    const override = ctx.config.test_command ?? process.env.BRIDGE_TEST_COMMAND;
    if (override?.trim()) {
      const [file, ...args] = override.trim().split(/\s+/);
      return { file, args, display: override.trim(), source: 'BRIDGE_TEST_COMMAND' };
    }

    const packageJson = path.join(ctx.target, 'package.json');
    if (fs.existsSync(packageJson)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(packageJson, 'utf8')) as {
          scripts?: Record<string, string>;
        };
        if (parsed.scripts?.test) {
          return {
            file: 'npm',
            args: ['test', '--silent'],
            display: `npm test  (${parsed.scripts.test})`,
            source: 'package.json',
          };
        }
      } catch {
        // Unparseable package.json — fall through to the other ecosystems.
      }
    }

    if (
      fs.existsSync(path.join(ctx.target, 'pytest.ini')) ||
      fs.existsSync(path.join(ctx.target, 'requirements.txt'))
    ) {
      return { file: 'python3', args: ['-m', 'pytest', '-q'], display: 'pytest -q', source: 'requirements.txt' };
    }
    if (fs.existsSync(path.join(ctx.target, 'pom.xml'))) {
      return { file: 'mvn', args: ['-B', 'test'], display: 'mvn -B test', source: 'pom.xml' };
    }
    return null;
  }

  /* ------------------------------------------------------------------ *
   * push
   * ------------------------------------------------------------------ */

  /**
   * Stage, commit and push for real.
   *
   * Three refusals are built in, because this is the stage that can do damage
   * that is awkward to undo:
   *   - nothing staged means nothing is committed (no empty commits);
   *   - the commit message must satisfy the convention the DevOps Navigator
   *     recovered, since CI would reject it anyway;
   *   - protected branches require BRIDGE_GIT_ALLOW_PROTECTED=true.
   */
  async push(
    ctx: EffectContext,
    options: { commitMessage: string; commitPattern?: RegExp; requiresTicketRef?: boolean }
  ): Promise<EffectOutcome> {
    const git = async (...args: string[]) =>
      (await run('git', args, { cwd: ctx.target, timeout: COMMAND_TIMEOUT_MS, maxBuffer: MAX_OUTPUT_BYTES }))
        .stdout.trim();

    try {
      await git('rev-parse', '--git-dir');
    } catch {
      return {
        executed: false,
        output: `${ctx.target} is not a git repository, so there is nothing to push.`,
        evidence: [],
      };
    }

    const message = options.commitMessage.trim();
    if (options.requiresTicketRef && !/\[[A-Z][A-Z0-9]+-\d+\]/.test(message)) {
      return {
        executed: false,
        output:
          `Refusing to commit: the message "${message}" carries no ticket key in square ` +
          `brackets, and this repository's CI rejects commits without one. Pass ` +
          `config.commit_message on the push node with a compliant message.`,
        evidence: [],
        error: 'commit message fails the recovered convention',
      };
    }
    if (options.commitPattern && !options.commitPattern.test(message)) {
      return {
        executed: false,
        output:
          `Refusing to commit: the message "${message}" does not match the convention ` +
          `recovered from this repository (${options.commitPattern}).`,
        evidence: [],
        error: 'commit message fails the recovered convention',
      };
    }

    const branch = ctx.config.branch ?? process.env.BRIDGE_GIT_BRANCH ?? (await git('rev-parse', '--abbrev-ref', 'HEAD'));
    const remote = ctx.config.remote ?? process.env.BRIDGE_GIT_REMOTE ?? 'origin';

    if (PROTECTED_BRANCHES.has(branch) && process.env.BRIDGE_GIT_ALLOW_PROTECTED !== 'true') {
      return {
        executed: false,
        output:
          `Refusing to push to "${branch}": it is a protected branch. This repository's ` +
          `branch model expects feature branches. Set BRIDGE_GIT_ALLOW_PROTECTED=true to ` +
          `override, or check out a feature branch first.`,
        evidence: [],
        error: 'protected branch',
      };
    }

    try {
      const dirty = await git('status', '--porcelain');
      if (!dirty) {
        return {
          executed: false,
          output: `Working tree at ${ctx.target} is clean — nothing to stage, commit or push.`,
          evidence: [],
        };
      }

      await git('add', '-A');
      await git('commit', '-m', message);
      const sha = await git('rev-parse', '--short', 'HEAD');
      const pushOutput = await git('push', remote, `HEAD:${branch}`);

      return {
        executed: true,
        output:
          `Committed ${sha} and pushed to ${remote}/${branch}.\n` +
          `Message: ${message}\n${this.excerpt(pushOutput)}`,
        evidence: [sha, `${remote}/${branch}`],
      };
    } catch (error) {
      const failure = error as { stdout?: string; stderr?: string; message?: string };
      return {
        executed: false,
        output: `git failed:\n${this.excerpt(failure.stderr ?? failure.message ?? String(error))}`,
        evidence: [],
        error: 'git command failed',
      };
    }
  }

  /* ------------------------------------------------------------------ *
   * deploy
   * ------------------------------------------------------------------ */

  /**
   * Trigger the deployment the DevOps Navigator mapped. GitHub Actions is tried
   * first because that is what most repositories carry today; Jenkins is the
   * fallback and is what this project's own fixture actually uses.
   */
  async deploy(ctx: EffectContext): Promise<EffectOutcome> {
    if (process.env.GITHUB_TOKEN && process.env.GITHUB_REPOSITORY) {
      return this.dispatchGitHubWorkflow(ctx);
    }
    if (process.env.JENKINS_URL && process.env.JENKINS_JOB) {
      return this.triggerJenkinsJob(ctx);
    }
    return {
      executed: false,
      output:
        'No deployment target is configured. Set GITHUB_TOKEN + GITHUB_REPOSITORY ' +
        '(+ GITHUB_WORKFLOW) to dispatch a GitHub Actions workflow, or JENKINS_URL + ' +
        'JENKINS_JOB + JENKINS_USER + JENKINS_API_TOKEN to trigger a Jenkins build.',
      evidence: [],
    };
  }

  private async dispatchGitHubWorkflow(ctx: EffectContext): Promise<EffectOutcome> {
    const repository = process.env.GITHUB_REPOSITORY!;
    const workflow = ctx.config.workflow ?? process.env.GITHUB_WORKFLOW ?? 'pr-checks.yml';
    const ref = ctx.config.ref ?? process.env.GITHUB_REF ?? 'main';
    const url = `https://api.github.com/repos/${repository}/actions/workflows/${encodeURIComponent(workflow)}/dispatches`;

    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ ref, inputs: { reason: ctx.task.slice(0, 200) } }),
    });

    // The dispatch endpoint answers 204 with an empty body on success.
    if (response.status === 204) {
      return {
        executed: true,
        output: `Dispatched GitHub Actions workflow "${workflow}" on ${repository}@${ref}.`,
        evidence: [`${repository}/.github/workflows/${workflow}`],
      };
    }
    return {
      executed: false,
      output: `GitHub refused the dispatch (HTTP ${response.status}): ${this.excerpt(response.body)}`,
      evidence: [url],
      error: `github dispatch returned ${response.status}`,
    };
  }

  private async triggerJenkinsJob(ctx: EffectContext): Promise<EffectOutcome> {
    const base = process.env.JENKINS_URL!.replace(/\/+$/, '');
    const job = ctx.config.job ?? process.env.JENKINS_JOB!;
    const url = `${base}/job/${encodeURIComponent(job)}/buildWithParameters`;

    const user = process.env.JENKINS_USER;
    const token = process.env.JENKINS_API_TOKEN;
    if (!user || !token) {
      return {
        executed: false,
        output: 'JENKINS_URL and JENKINS_JOB are set, but JENKINS_USER / JENKINS_API_TOKEN are not.',
        evidence: [],
      };
    }

    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        authorization: `Basic ${Buffer.from(`${user}:${token}`).toString('base64')}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ cause: ctx.task.slice(0, 200) }).toString(),
    });

    // Jenkins answers 201 with a queue-item Location header.
    if (response.status === 200 || response.status === 201) {
      return {
        executed: true,
        output:
          `Queued Jenkins job "${job}".` +
          (response.location ? ` Queue item: ${response.location}` : ''),
        evidence: [url],
      };
    }
    return {
      executed: false,
      output: `Jenkins refused the build (HTTP ${response.status}): ${this.excerpt(response.body)}`,
      evidence: [url],
      error: `jenkins returned ${response.status}`,
    };
  }

  /* ------------------------------------------------------------------ *
   * update_jira
   * ------------------------------------------------------------------ */

  /**
   * Transition a ticket and append a development summary via Jira REST v3.
   *
   * The transition is looked up by name rather than hard-coded id, because
   * transition ids differ per workflow scheme and a hard-coded one works on
   * exactly the board it was written against.
   */
  async updateJira(ctx: EffectContext, summary: string): Promise<EffectOutcome> {
    const base = process.env.JIRA_BASE_URL?.replace(/\/+$/, '');
    const email = process.env.JIRA_EMAIL;
    const apiToken = process.env.JIRA_API_TOKEN;

    const issueKey = ctx.config.ticket ?? ctx.config.issue ?? this.inferTicketKey(ctx.task);
    if (!issueKey) {
      return {
        executed: false,
        output:
          'No ticket key to update. Put one in the update_jira node config as `ticket`, ' +
          'or mention it in the task (e.g. "AUR-4472").',
        evidence: [],
      };
    }
    if (!base || !email || !apiToken) {
      return {
        executed: false,
        output:
          `Would transition ${issueKey} and append a development summary, but Jira is not ` +
          `configured. Set JIRA_BASE_URL, JIRA_EMAIL and JIRA_API_TOKEN.`,
        evidence: [issueKey],
      };
    }

    const auth = `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`;
    const headers = { authorization: auth, accept: 'application/json', 'content-type': 'application/json' };
    const performed: string[] = [];

    const targetTransition = ctx.config.transition ?? process.env.BRIDGE_JIRA_TRANSITION ?? 'In Review';
    const transitions = await this.fetchWithTimeout(
      `${base}/rest/api/3/issue/${issueKey}/transitions`,
      { method: 'GET', headers }
    );
    if (transitions.status !== 200) {
      return {
        executed: false,
        output: `Jira rejected the transition lookup for ${issueKey} (HTTP ${transitions.status}): ${this.excerpt(transitions.body)}`,
        evidence: [issueKey],
        error: `jira returned ${transitions.status}`,
      };
    }

    const available = (JSON.parse(transitions.body) as { transitions?: { id: string; name: string }[] })
      .transitions ?? [];
    const match = available.find((t) => t.name.toLowerCase() === targetTransition.toLowerCase());
    if (!match) {
      return {
        executed: false,
        output:
          `${issueKey} has no transition named "${targetTransition}". Available: ` +
          `${available.map((t) => t.name).join(', ') || 'none'}.`,
        evidence: [issueKey],
        error: 'transition not available',
      };
    }

    const transitioned = await this.fetchWithTimeout(`${base}/rest/api/3/issue/${issueKey}/transitions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ transition: { id: match.id } }),
    });
    if (transitioned.status !== 204) {
      return {
        executed: false,
        output: `Jira refused the transition of ${issueKey} (HTTP ${transitioned.status}): ${this.excerpt(transitioned.body)}`,
        evidence: [issueKey],
        error: `jira returned ${transitioned.status}`,
      };
    }
    performed.push(`transitioned to "${match.name}"`);

    // Atlassian Document Format — Jira Cloud rejects a plain string body here.
    const commented = await this.fetchWithTimeout(`${base}/rest/api/3/issue/${issueKey}/comment`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        body: {
          type: 'doc',
          version: 1,
          content: [{ type: 'paragraph', content: [{ type: 'text', text: summary }] }],
        },
      }),
    });
    if (commented.status === 201) performed.push('appended a development summary');

    return {
      executed: true,
      output: `${issueKey}: ${performed.join(' and ')}.`,
      evidence: [issueKey, `${base}/browse/${issueKey}`],
    };
  }

  private inferTicketKey(text: string): string | null {
    return text.match(/\b[A-Z][A-Z0-9]+-\d+\b/)?.[0] ?? null;
  }

  /* ------------------------------------------------------------------ *
   * send_slack_message
   * ------------------------------------------------------------------ */

  /** Post to the configured incoming webhook. */
  async sendSlackMessage(ctx: EffectContext, text: string): Promise<EffectOutcome> {
    const webhook = process.env.SLACK_WEBHOOK_URL;
    if (!webhook) {
      return {
        executed: false,
        output:
          'Would post a summary to the team channel, but SLACK_WEBHOOK_URL is not set. ' +
          'The bridge does not send messages on your behalf without an explicit webhook.',
        evidence: [],
      };
    }

    const channel = ctx.config.channel;
    const response = await this.fetchWithTimeout(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text, ...(channel ? { channel } : {}) }),
    });

    if (response.status === 200) {
      return {
        executed: true,
        output: `Posted to Slack${channel ? ` (${channel})` : ''}:\n${text}`,
        evidence: ['SLACK_WEBHOOK_URL'],
      };
    }
    return {
      executed: false,
      output: `Slack rejected the message (HTTP ${response.status}): ${this.excerpt(response.body)}`,
      evidence: [],
      error: `slack returned ${response.status}`,
    };
  }

  /* ------------------------------------------------------------------ *
   * Shared helpers
   * ------------------------------------------------------------------ */

  private async fetchWithTimeout(
    url: string,
    init: { method: string; headers?: Record<string, string>; body?: string }
  ): Promise<{ status: number; body: string; location?: string }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      return {
        status: response.status,
        body: await response.text(),
        location: response.headers.get('location') ?? undefined,
      };
    } catch (error) {
      // Surfaced as a non-2xx rather than thrown: a stage that could not reach
      // its endpoint should report that, not abort the whole pipeline run.
      return {
        status: 0,
        body: error instanceof Error ? error.message : String(error),
      };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Strip this process's own secrets before handing an environment to a child.
   * A test suite in a legacy repository has no business inheriting the bridge's
   * Jira token.
   */
  private sanitizedEnv(): NodeJS.ProcessEnv {
    const clean = { ...process.env };
    for (const key of Object.keys(clean)) {
      if (/^(BRIDGE_ADMIN_API_KEY|BRIDGE_JWT_SECRET|JIRA_API_TOKEN|JENKINS_API_TOKEN|GITHUB_TOKEN|SLACK_WEBHOOK_URL|ANTHROPIC_API_KEY)$/.test(key)) {
        delete clean[key];
      }
    }
    return clean;
  }

  private excerpt(text: string): string {
    const trimmed = text.trim();
    return trimmed.length > OUTPUT_EXCERPT_CHARS
      ? `${trimmed.slice(0, OUTPUT_EXCERPT_CHARS)}\n… (${trimmed.length - OUTPUT_EXCERPT_CHARS} more characters)`
      : trimmed;
  }
}
