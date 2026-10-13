/**
 * Integration doctor.
 *
 *   npm run doctor
 *
 * Answers one question before you spend a swarm run finding out the hard way:
 * *are my live integrations actually wired up, and if not, exactly which part
 * is wrong?*
 *
 * It calls the real `JiraClient` and `SlackClient` the server uses — not a
 * parallel reimplementation — so a green result here means the same code path
 * the Product Synchronizer and Scrum Analyst take is working. Every failure is
 * reported with the specific variable or permission to fix.
 *
 * Exit code is 0 when everything *configured* works. An unconfigured
 * integration is reported and does not fail the run: fixture mode is a
 * legitimate way to operate. Use `--strict` to require live everything.
 */
import 'dotenv/config';
import { execFileSync } from 'child_process';
import { JiraClient } from '../src/modules/agile/jira.client.js';
import { SlackClient } from '../src/modules/agile/chat.client.js';
import { RepoSourceService } from '../src/shared/services/repo-source.service.js';

const STRICT = process.argv.includes('--strict');
const SKIP_NETWORK = process.argv.includes('--skip-network');

const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;

let failures = 0;
let warnings = 0;

function ok(label: string, detail = ''): void {
  console.log(`  ${green('✓')} ${label}${detail ? `  ${dim(detail)}` : ''}`);
}
function bad(label: string, fix: string): void {
  failures++;
  console.log(`  ${red('✗')} ${label}`);
  console.log(`      ${dim('fix:')} ${fix}`);
}
function warn(label: string, fix: string): void {
  warnings++;
  console.log(`  ${yellow('!')} ${label}`);
  console.log(`      ${dim('fix:')} ${fix}`);
}

async function main(): Promise<void> {
  console.log(`\n${bold('Enterprise Agentic Bridge — integration doctor')}`);
  console.log(dim('Calls the same clients the swarm uses. Green here means the swarm will work.\n'));

  const mode = process.env.BRIDGE_DATA_MODE?.trim().toLowerCase() || 'auto';
  console.log(`${bold('0. Mode')}`);
  if (['auto', 'live', 'fixture'].includes(mode)) {
    ok(`BRIDGE_DATA_MODE=${mode}`,
      mode === 'auto' ? 'live where configured, fixture otherwise'
      : mode === 'live' ? 'live only — unconfigured integrations will throw'
      : 'fixtures only — no network calls will be made');
  } else {
    bad(`BRIDGE_DATA_MODE="${mode}" is not a valid mode`, 'use auto, live or fixture');
  }

  /* ---------------------------------------------------------------- git */
  console.log(`\n${bold('1. Remote codebase ingestion')}`);
  let gitVersion = '';
  try {
    gitVersion = execFileSync('git', ['--version'], { encoding: 'utf8', timeout: 5000 }).trim();
    ok('git is on PATH', gitVersion);
  } catch {
    bad('git is not on PATH — GitHub URL targets cannot be cloned',
      'install git, or only use local absolute paths as `target`');
  }

  const hosts = process.env.BRIDGE_ALLOWED_REPO_HOSTS?.trim() || 'github.com';
  ok('clonable hosts', hosts);
  ok('private repos', process.env.GITHUB_TOKEN?.trim() ? 'GITHUB_TOKEN set' : 'public only (GITHUB_TOKEN unset)');

  if (gitVersion && !SKIP_NETWORK) {
    const repos = new RepoSourceService();
    try {
      const started = Date.now();
      const cloned = await repos.clone('https://github.com/octocat/Hello-World');
      await repos.release(cloned.root);
      ok('a real shallow clone succeeded and cleaned up',
        `${cloned.slug}@${cloned.commit?.slice(0, 8)} in ${Date.now() - started}ms`);
    } catch (error) {
      bad(`clone probe failed: ${(error as Error).message}`,
        'check outbound network access to github.com, or pass --skip-network');
    }
  }

  /* --------------------------------------------------------------- jira */
  console.log(`\n${bold('2. Jira — sprint state and backlog')}`);
  const jira = new JiraClient();
  if (!jira.configured) {
    const gaps = jira.missing().join(', ');
    if (STRICT || mode === 'live') {
      bad(`Jira is not configured (missing ${gaps})`, jira.configurationHint());
    } else {
      warn(`Jira is not configured (missing ${gaps}) — fetch_sprint_goals will return the fixture`,
        jira.configurationHint());
    }
  } else {
    const config = jira.config()!;
    ok('credentials present', `${config.baseUrl} as ${config.email}`);
    ok('board', config.boardId ? `JIRA_BOARD_ID=${config.boardId}` : 'auto-discover (first visible board)');

    const result = await jira.fetchActiveSprint();
    if (!result.ok) {
      bad(`live Jira call failed: ${result.reason}`,
        'the message above names the specific problem — credentials, board id, or no active sprint');
    } else {
      const { sprint, boardId, boardName } = result;
      ok('live sprint fetched', `board ${boardId} "${boardName}" → "${sprint.sprint.name}" (${sprint.sprint.state})`);
      ok('issues returned', `${sprint.issues.length}`);

      const done = sprint.issues.filter((i) => /done|closed|resolved/i.test(i.status)).length;
      const doing = sprint.issues.filter((i) => /progress|review|testing|qa|blocked/i.test(i.status)).length;
      const todo = sprint.issues.length - done - doing;
      ok('backlog splits cleanly', `${done} done · ${doing} in progress · ${todo} to do`);

      if (!sprint.issues.length) {
        warn('the sprint has no issues — the Product Synchronizer will contribute almost nothing',
          'add a few issues to the active sprint and spread them across statuses');
      }
      if (!sprint.sprint.goal) {
        warn('the sprint has no goal set', 'set a sprint goal in Jira — it lands in section 3 of the manifest');
      }
      const withPoints = sprint.issues.filter((i) => typeof i.storyPoints === 'number').length;
      if (sprint.issues.length && !withPoints) {
        warn('no story points found on any issue',
          'if your site uses a non-standard field, set JIRA_STORY_POINTS_FIELD (cosmetic only)');
      }
    }
  }

  /* -------------------------------------------------------------- slack */
  console.log(`\n${bold('3. Slack — spoken decisions')}`);
  const slack = new SlackClient();
  if (!slack.configured) {
    const gaps = slack.missing().join(', ');
    if (STRICT || mode === 'live') {
      bad(`Slack is not configured (missing ${gaps})`, slack.configurationHint());
    } else {
      warn(`Slack is not configured (missing ${gaps}) — fetch_meeting_transcripts will return the fixture`,
        slack.configurationHint());
    }
  } else {
    ok('credentials present', `channel ${slack.config()!.channelId}, limit ${slack.config()!.limit}`);

    const result = await slack.fetchTranscript();
    if (!result.ok) {
      bad(`live Slack call failed: ${result.reason}`,
        'the message above names the specific problem — token, channel id, membership or scope');
    } else {
      ok('channel read', `#${result.channelName} → ${result.messageCount} message(s)`);
      // Messages are not decisions. If none classify, the Scrum Analyst has
      // nothing to contribute and the conflict engine has nothing to compare.
      const utterances = (result.transcript.match(/^\[\d{1,2}:\d{2}\]/gm) ?? []).length;
      ok('utterances parsed from the channel', String(utterances));
      if (utterances === 0) {
        bad('no messages parsed into utterances — the Scrum Analyst will find nothing',
          'the channel needs real human messages; bot-only or empty channels yield nothing');
      }
    }
  }

  /* ------------------------------------------------------------- verdict */
  console.log('\n' + '─'.repeat(66));
  if (failures) {
    console.log(`${red(bold(`  ${failures} BLOCKING`))}${warnings ? `, ${warnings} warning(s)` : ''}\n`);
    console.log(dim('  Fix the ✗ items above, then re-run: npm run doctor\n'));
    process.exit(1);
  }
  if (warnings) {
    console.log(`${yellow(bold(`  ${warnings} warning(s)`))} — the bridge will run, using fixtures where noted.\n`);
    console.log(dim('  That is a valid mode. For a real-data test, wire up the warned integrations.\n'));
    process.exit(0);
  }
  console.log(`${green(bold('  ALL INTEGRATIONS LIVE'))} — the swarm will run on entirely real data.\n`);
}

main().catch((error) => {
  console.error(`\n${red('doctor crashed:')} ${error instanceof Error ? error.stack : String(error)}\n`);
  process.exit(1);
});
